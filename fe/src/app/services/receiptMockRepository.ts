import { fieldCustomersSeed, type FieldCustomer } from '../../modules/petugas/data/petugasData'
import { mockOfficerRepository } from './adminMockRepository'
import { readMockCustomers } from './mockApiService'
import { writeMockCustomers } from './mockApiService'

export interface Receipt {
  id: string
  receipt_number: string
  customer_id: string
  customer_name: string
  address: string
  officer_name: string
  period: string
  period_label: string
  previous_meter: number
  current_meter: number
  usage: number
  water_rate: number
  admin_fee: number
  total_amount: number
  printed: boolean
  printed_at: string | null
  officer_id?: number
  meter_reading_id?: number
}

interface StoredReceiptStatus {
  receiptNumber: string
  printed: boolean
  printedAt: string | null
}

const RECEIPTS_KEY = 'pamsimas.mock.receipts.v1'
const FIELD_CUSTOMERS_KEY = 'pamsimas.mock.field.customers.v1'
const WATER_RATE = 3000
const ADMIN_FEE = 5000
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function read<T>(key: string, seed: T): T {
  const stored = window.localStorage.getItem(key)
  if (!stored) {
    window.localStorage.setItem(key, JSON.stringify(seed))
    return structuredClone(seed)
  }

  try {
    return JSON.parse(stored) as T
  } catch {
    window.localStorage.setItem(key, JSON.stringify(seed))
    return structuredClone(seed)
  }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function now() {
  return new Date().toISOString()
}

function statusKey(customerId: string, period: string) {
  return `${customerId}__${period}`
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-')
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`
}

function findOfficerName(area: string) {
  const officers = mockOfficerRepository.list()
  const assignedOfficer = officers.find((officer) => officer.areas?.some((assignedArea) => assignedArea === area))
  if (assignedOfficer) return assignedOfficer.name

  // Old browser caches may predate the `dusun` field on officers. Keep the
  // seeded regional assignment deterministic until those records are edited.
  if (area.startsWith('Dusun 3')) return officers.find((officer) => officer.name === 'Budi Santoso')?.name ?? 'Budi Santoso'
  if (area.startsWith('Dusun 1')) return officers.find((officer) => officer.name === 'Asep Rahmat')?.name ?? 'Asep Rahmat'
  return officers[0]?.name ?? '-'
}

function nextSequence(statuses: Record<string, StoredReceiptStatus>, period: string) {
  return Object.keys(statuses).filter((key) => key.endsWith(`__${period}`)).length + 1
}

function loadFieldCustomers(): FieldCustomer[] {
  const storedCustomers = read(FIELD_CUSTOMERS_KEY, fieldCustomersSeed)
  const storedById = new Map(storedCustomers.map((customer) => [customer.id, customer]))

  // Merge the current demo reading into a legacy cache only when that cache
  // has no reading. Manual input and payment data always take precedence.
  const mergedSeedCustomers = fieldCustomersSeed.map((seedCustomer) => {
    const storedCustomer = storedById.get(seedCustomer.id)
    if (!storedCustomer) return seedCustomer

    const hasSavedReading = storedCustomer.meterHistory?.length
      || (storedCustomer.meterStatus === 'Sudah Dicatat' && storedCustomer.billingPeriod)

    return hasSavedReading
      ? { ...seedCustomer, ...storedCustomer }
      : {
          ...storedCustomer,
          billAmount: seedCustomer.billAmount,
          billingPeriod: seedCustomer.billingPeriod,
          currentMeter: seedCustomer.currentMeter,
          lastMeter: seedCustomer.lastMeter,
          meterHistory: seedCustomer.meterHistory,
          meterStatus: seedCustomer.meterStatus,
          meterSubmittedAt: seedCustomer.meterSubmittedAt,
        }
  })
  const seedIds = new Set(fieldCustomersSeed.map((customer) => customer.id))
  const additionalCustomers = storedCustomers.filter((customer) => !seedIds.has(customer.id))
  const customers = [...mergedSeedCustomers, ...additionalCustomers]
  write(FIELD_CUSTOMERS_KEY, customers)
  return customers
}

/** Converts saved field meter readings into the rows that are ready for physical receipts. */
function getMeteredCustomers(period: string) {
  const fieldCustomers = loadFieldCustomers()
  const masterCustomers = new Map(readMockCustomers().map((customer) => [customer.id, customer]))

  // Petugas is the source of truth for a physical receipt: a row exists only
  // after the officer records a meter for the selected billing period.
  return fieldCustomers.flatMap((fieldCustomer) => {
    const customer = masterCustomers.get(fieldCustomer.id)
    const history = fieldCustomer.meterHistory?.find((reading) => reading.period === period)
    const currentMeter = history?.currentMeter ?? customer?.meterEnd ?? fieldCustomer.currentMeter
    const previousMeter = history?.previousMeter ?? customer?.meterStart ?? fieldCustomer.lastMeter
    const usage = history?.usage ?? customer?.meterUsage ?? (currentMeter - previousMeter)
    const billingPeriod = history?.period ?? customer?.meterPeriod ?? fieldCustomer.billingPeriod
    const hasSavedReading = fieldCustomer.meterStatus === 'Sudah Dicatat'
      && currentMeter !== undefined
      && previousMeter !== undefined
      && usage !== undefined

    if (!hasSavedReading || billingPeriod !== period) return []

    return [{
      address: customer?.address ?? fieldCustomer.address,
      currentMeter,
      customerId: fieldCustomer.id,
      customerName: fieldCustomer.name,
      officerName: findOfficerName(fieldCustomer.zone),
      previousMeter,
      totalAmount: history?.billAmount ?? customer?.billAmount ?? fieldCustomer.billAmount ?? (usage * WATER_RATE) + ADMIN_FEE,
      usage: Math.max(usage, 0),
    }]
  })
}

export function listReceipts(period: string, officerName?: string): Receipt[] {
  const statuses = read<Record<string, StoredReceiptStatus>>(RECEIPTS_KEY, {})
  const periodLabel = formatPeriodLabel(period)
  let hasNewEntry = false

  const receipts = getMeteredCustomers(period).map((customer) => {
    const key = statusKey(customer.customerId, period)
    let entry = statuses[key]

    if (!entry) {
      entry = {
        printed: false,
        printedAt: null,
        receiptNumber: `INV-${period.replace('-', '')}-${String(nextSequence(statuses, period)).padStart(3, '0')}`,
      }
      statuses[key] = entry
      hasNewEntry = true
    }

    return {
      address: customer.address,
      admin_fee: ADMIN_FEE,
      current_meter: customer.currentMeter,
      customer_id: customer.customerId,
      customer_name: customer.customerName,
      id: key,
      officer_name: customer.officerName,
      period,
      period_label: periodLabel,
      previous_meter: customer.previousMeter,
      printed: entry.printed,
      printed_at: entry.printedAt,
      receipt_number: entry.receiptNumber,
      total_amount: customer.totalAmount,
      usage: customer.usage,
      water_rate: WATER_RATE,
    }
  })

  if (hasNewEntry) write(RECEIPTS_KEY, statuses)

  return receipts
    .filter((receipt) => officerName ? receipt.officer_name === officerName : true)
    .sort((left, right) => left.customer_name.localeCompare(right.customer_name))
}

export function markPrinted(customerIds: string[], period: string): Receipt[] {
  const statuses = read<Record<string, StoredReceiptStatus>>(RECEIPTS_KEY, {})
  const printedAt = now()

  for (const customerId of customerIds) {
    const key = statusKey(customerId, period)
    const entry = statuses[key] ?? {
      printed: false,
      printedAt: null,
      receiptNumber: `INV-${period.replace('-', '')}-${String(nextSequence(statuses, period)).padStart(3, '0')}`,
    }
    statuses[key] = { ...entry, printed: true, printedAt }
  }

  write(RECEIPTS_KEY, statuses)

  const fieldCustomers = loadFieldCustomers()
  write(FIELD_CUSTOMERS_KEY, fieldCustomers.map((customer) =>
    customerIds.includes(customer.id) && (customer.billingPeriod === period || customer.meterHistory?.some((reading) => reading.period === period))
      ? { ...customer, receiptPrintedAt: printedAt }
      : customer,
  ))
  return listReceipts(period)
}

/** Admin correction: keeps the local meter history, bill, and physical receipt preview in sync. */
export function updateReceiptMeter(customerId: string, period: string, previousMeter: number, currentMeter: number): Receipt {
  if (currentMeter < previousMeter) throw new Error('Meter akhir tidak boleh lebih kecil dari meter awal.')

  const usage = currentMeter - previousMeter
  const totalAmount = (usage * WATER_RATE) + ADMIN_FEE
  const fieldCustomers = loadFieldCustomers()
  const fieldCustomer = fieldCustomers.find((customer) => customer.id === customerId)
  if (!fieldCustomer) throw new Error('Data pelanggan untuk kwitansi tidak ditemukan.')

  const nextFieldCustomer: FieldCustomer = {
    ...fieldCustomer,
    billAmount: totalAmount,
    billingPeriod: period,
    currentMeter,
    lastMeter: previousMeter,
    meterHistory: [
      ...(fieldCustomer.meterHistory ?? []).filter((reading) => reading.period !== period),
      { billAmount: totalAmount, currentMeter, period, previousMeter, submittedAt: new Date().toISOString(), usage },
    ].sort((left, right) => left.period.localeCompare(right.period)),
    receiptPrintedAt: undefined,
  }
  write(FIELD_CUSTOMERS_KEY, fieldCustomers.map((customer) => customer.id === customerId ? nextFieldCustomer : customer))
  writeMockCustomers(readMockCustomers().map((customer) => customer.id === customerId ? {
    ...customer,
    billAmount: totalAmount,
    meterEnd: currentMeter,
    meterPeriod: period,
    meterStart: previousMeter,
    meterUsage: usage,
  } : customer))

  const statuses = read<Record<string, StoredReceiptStatus>>(RECEIPTS_KEY, {})
  const receiptKey = statusKey(customerId, period)
  if (statuses[receiptKey]) {
    statuses[receiptKey] = { ...statuses[receiptKey], printed: false, printedAt: null }
    write(RECEIPTS_KEY, statuses)
  }

  const receipt = listReceipts(period).find((item) => item.customer_id === customerId)
  if (!receipt) throw new Error('Kwitansi tidak ditemukan setelah meter diperbarui.')
  return receipt
}

export function listOfficerNames(): string[] {
  return Array.from(new Set(mockOfficerRepository.list().map((officer) => officer.name)))
}

export function resetReceiptMockData() {
  window.localStorage.removeItem(RECEIPTS_KEY)
}
