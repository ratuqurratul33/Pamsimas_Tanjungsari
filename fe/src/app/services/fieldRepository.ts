import { appEnvironment } from '../config/environment'
import { fieldCustomersSeed, fieldProfileSeed, getFieldBillSummary, getFieldBillingSettings, type FieldCustomer, type FieldDeposit, type FieldMeterHistory, type FieldProfile } from '../../modules/petugas/data/petugasData'
import type { Customer } from '../../types'
import { readMockCustomers, writeMockCustomers } from './mockApiService'
import { listDeposits as listFinanceDeposits, registerFieldDeposit, type FieldDepositInput } from './financeMockRepository'
import { mockOfficerRepository } from './adminMockRepository'
import { apiRequest, createIdempotencyKey } from './apiClient'

export type FieldRepository = {
  getDashboard(): Promise<FieldDashboardSummary>
  getProfile(): Promise<FieldProfile>
  listCustomers(): Promise<FieldCustomer[]>
  listDeposits(): Promise<FieldDeposit[]>
  saveMeter(customerId: string, previousMeter: number, currentMeter: number, billAmount: number, submittedAt: string, billingPeriod: string): Promise<FieldCustomer>
  payCustomer(customerId: string, method: 'Tunai' | 'QRIS', proof?: PaymentProof, billId?: number): Promise<FieldCustomer>
  updatePaymentProof(customerId: string, proof: PaymentProof, paymentId?: number): Promise<FieldCustomer>
  createDeposit(deposit: FieldDeposit, customers: FieldCustomer[]): Promise<FieldDeposit>
}

export type FieldDashboardSummary = {
  assignedCustomers: number
  monthlyBillTotal: number
  paidCustomers: number
  pendingDepositAmount: number
  pendingVerificationAmount: number
  period: string
  recordedMeters: number
  waterRate: number
  adminFee: number
  lateFee: number
  dueDay: number
}

export type PaymentProof = {
  file?: File
  name: string
  preview?: string
  qrisFile?: File
  qrisName?: string
  qrisPreview?: string
}
type LaravelDeposit = {
  id: number
  payment_summary: { cash: number; count: number; qris: number }
  period: string
  received_at?: string | null
  status: 'pending' | 'verified' | 'rejected'
  submitted_at?: string
}

const CUSTOMER_KEY = 'pamsimas.mock.field.customers.v1'

function read<T>(key: string, seed: T): T {
  const stored = window.localStorage.getItem(key)
  if (!stored) {
    window.localStorage.setItem(key, JSON.stringify(seed))
    return structuredClone(seed)
  }
  try { return JSON.parse(stored) as T } catch { window.localStorage.setItem(key, JSON.stringify(seed)); return structuredClone(seed) }
}

function write<T>(key: string, value: T) { window.localStorage.setItem(key, JSON.stringify(value)) }

function parseArea(area: string) {
  const [location = '', kampung = '-'] = area.split(' - ')
  const parts = location.split('/').map((part) => part.trim())
  return {
    kampung,
    rt: parts.find((part) => part.toUpperCase().startsWith('RT')) ?? 'RT 01',
    rw: parts.find((part) => part.toUpperCase().startsWith('RW')) ?? 'RW 06',
  }
}

function toFieldCustomer(customer: Customer, legacy?: FieldCustomer): FieldCustomer {
  const area = parseArea(customer.area)
  const meterStart = customer.meterStart ?? legacy?.lastMeter ?? 0
  const meterEnd = customer.meterEnd ?? legacy?.currentMeter ?? meterStart
  const hasMeter = customer.meterEnd !== undefined || legacy?.meterStatus === 'Sudah Dicatat'
  const paymentMethod = customer.paymentMethod === 'Tunai' || customer.paymentMethod === 'QRIS' ? customer.paymentMethod : legacy?.paymentMethod
  const billingPeriod = customer.meterPeriod ?? legacy?.billingPeriod
  const meterHistory = legacy?.meterHistory ?? (billingPeriod && hasMeter ? [{
    billAmount: customer.billAmount ?? legacy?.billAmount ?? (Math.max(meterEnd - meterStart, 0) * 3000 + 5000),
    currentMeter: meterEnd,
    period: billingPeriod,
    previousMeter: meterStart,
    submittedAt: legacy?.meterSubmittedAt ?? customer.meterRecordedAt ?? '',
    usage: Math.max(meterEnd - meterStart, 0),
  }] : [])

  return {
    address: customer.address,
    backendId: legacy?.backendId,
    billId: legacy?.billId,
    billAmount: customer.billAmount ?? legacy?.billAmount ?? (hasMeter ? Math.max(meterEnd - meterStart, 0) * 3000 + 5000 : 0),
    billingPeriod,
    billStatus: customer.paymentStatus === 'Lunas'
      ? 'Lunas'
      : legacy?.billStatus === 'Sudah Membayar' || (paymentMethod && legacy?.depositStatus !== 'Terverifikasi')
        ? 'Sudah Membayar'
        : legacy?.billStatus === 'Lunas'
          ? 'Lunas'
          : 'Menunggak',
    currentMeter: meterEnd,
    depositStatus: legacy?.depositStatus,
    dusun: customer.area.startsWith('Dusun 1') ? 'Dusun 1' : 'Dusun 3',
    id: customer.id,
    kampung: area.kampung,
    lastMeter: meterStart,
    meterStatus: hasMeter ? 'Sudah Dicatat' : 'Belum Dicatat',
    meterSubmittedAt: legacy?.meterSubmittedAt,
    receiptPrintedAt: legacy?.receiptPrintedAt,
    meterHistory,
    name: customer.name,
    paymentMethod,
    paymentPaidAt: legacy?.paymentPaidAt,
    paymentProofName: legacy?.paymentProofName,
    paymentProofPreview: legacy?.paymentProofPreview,
    qrisProofName: legacy?.qrisProofName,
    qrisProofPreview: legacy?.qrisProofPreview,
    rt: area.rt,
    rw: area.rw,
    zone: customer.area,
  }
}

function readSharedFieldCustomers() {
  const officer = mockOfficerRepository.list().find((item) => item.username.toLowerCase().includes('budi') || item.name === 'Budi Santoso')
  const assignedAreas = new Set(officer?.areas ?? [])
  const masterCustomers = readMockCustomers().filter((customer) => assignedAreas.has(customer.area))
  const legacyCustomers = read<FieldCustomer[]>(CUSTOMER_KEY, fieldCustomersSeed)
  const seededCustomerIds = new Set(fieldCustomersSeed.map((customer) => customer.id))
  return masterCustomers.map((customer) => {
    // A newly created master customer starts with no history. Legacy field
    // state is only allowed for the original demo customers.
    const legacy = seededCustomerIds.has(customer.id)
      ? legacyCustomers.find((item) => item.id === customer.id)
      : undefined
    return toFieldCustomer(customer, legacy)
  })
}

function writeSharedFieldCustomers(customers: FieldCustomer[]) {
  write(CUSTOMER_KEY, customers)
}

function toFieldDeposit(deposit: ReturnType<typeof listFinanceDeposits>[number]): FieldDeposit {
  return {
    id: `SET-${String(deposit.id).padStart(3, '0')}`,
    date: deposit.received_at ?? deposit.submitted_at,
    period: deposit.period,
    customerCount: deposit.payment_summary.count,
    cash: deposit.payment_summary.cash,
    qris: deposit.payment_summary.qris,
    status: deposit.status === 'verified' ? 'Terverifikasi' : deposit.status === 'pending' ? 'Menunggu Verifikasi' : 'Belum Diserahkan',
  }
}

export const mockFieldRepository: FieldRepository = {
  async getDashboard() {
    const customers = readSharedFieldCustomers()
    const billingSettings = getFieldBillingSettings()
    return {
      assignedCustomers: customers.length,
      monthlyBillTotal: customers.reduce((total, customer) => total + customer.billAmount, 0),
      paidCustomers: customers.filter((customer) => customer.billStatus === 'Lunas').length,
      pendingDepositAmount: customers.filter((customer) => customer.depositStatus === 'Belum Disetorkan').reduce((total, customer) => total + customer.billAmount, 0),
      pendingVerificationAmount: customers.filter((customer) => customer.depositStatus === 'Menunggu Verifikasi').reduce((total, customer) => total + customer.billAmount, 0),
      period: customers.find((customer) => customer.billingPeriod)?.billingPeriod ?? '',
      recordedMeters: customers.filter((customer) => customer.meterStatus === 'Sudah Dicatat').length,
      waterRate: billingSettings.waterRate,
      adminFee: billingSettings.adminFee,
      lateFee: billingSettings.lateFee,
      dueDay: billingSettings.dueDay,
    }
  },
  async getProfile() {
    const officer = mockOfficerRepository.list().find((item) => item.username.toLowerCase().includes('budi') || item.name === 'Budi Santoso')
    if (!officer) return structuredClone(fieldProfileSeed)

    return {
      ...fieldProfileSeed,
      area: officer.areas?.join(', ') || 'Belum ada wilayah tugas',
      avatar: officer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      name: officer.name,
      phone: officer.phone,
      photo: officer.photoUrl,
      status: officer.status,
      username: officer.username,
    }
  },
  async listCustomers() {
    const customers = readSharedFieldCustomers()
    writeSharedFieldCustomers(customers)
    return customers
  },
  async listDeposits() { return listFinanceDeposits().map(toFieldDeposit) },
  async saveMeter(customerId, previousMeter, currentMeter, billAmount, submittedAt, billingPeriod) {
    const customers = readSharedFieldCustomers()
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) throw new Error('Pelanggan tidak ditemukan.')
    const history: FieldMeterHistory[] = [
      ...(customer.meterHistory ?? []).filter((reading) => reading.period !== billingPeriod),
      { billAmount, currentMeter, period: billingPeriod, previousMeter, submittedAt, usage: currentMeter - previousMeter },
    ].sort((left, right) => left.period.localeCompare(right.period))
    const next = { ...customer, baseBillAmount: billAmount, billAmount, billStatus: 'Menunggak' as const, currentMeter, lastMeter: previousMeter, lateFeeAmount: undefined, meterHistory: history, meterStatus: 'Sudah Dicatat' as const, meterSubmittedAt: submittedAt, receiptPrintedAt: undefined, billingPeriod }
    write(CUSTOMER_KEY, customers.map((item) => item.id === customerId ? next : item))
    const masterCustomers = readMockCustomers()
    writeMockCustomers(masterCustomers.map((item) => item.id === customerId ? { ...item, billAmount, meterEnd: currentMeter, meterPeriod: billingPeriod, meterRecordedAt: submittedAt, meterStart: previousMeter, meterUsage: currentMeter - previousMeter, paymentStatus: 'Belum Membayar' as const, status: 'Menunggak' as const } : item))
    return next
  },
  async payCustomer(customerId, method, proof, _billId) {
    const customers = readSharedFieldCustomers()
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) throw new Error('Pelanggan tidak ditemukan.')
    const appliedLateFee = getFieldBillSummary(customer).lateFee
    const next = {
      ...customer,
      baseBillAmount: customer.baseBillAmount ?? customer.billAmount,
      billStatus: 'Sudah Membayar' as const,
      lateFeeAmount: appliedLateFee,
      depositStatus: 'Belum Disetorkan' as const,
      paymentMethod: method,
      paymentPaidAt: new Date().toISOString(),
      paymentProofName: proof?.name,
      paymentProofPreview: proof?.preview,
      qrisProofName: method === 'QRIS' ? proof?.qrisName : undefined,
      qrisProofPreview: method === 'QRIS' ? proof?.qrisPreview : undefined,
    }
    write(CUSTOMER_KEY, customers.map((item) => item.id === customerId ? next : item))
    const masterCustomers = readMockCustomers()
    writeMockCustomers(masterCustomers.map((item) => item.id === customerId ? { ...item, paymentMethod: method, paymentStatus: 'Sudah Membayar' as const } : item))
    return next
  },
  async updatePaymentProof(customerId, proof, _paymentId) {
    const customers = readSharedFieldCustomers()
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) throw new Error('Pelanggan tidak ditemukan.')
    const next = {
      ...customer,
      paymentProofName: proof.name ?? customer.paymentProofName,
      paymentProofPreview: proof.preview ?? customer.paymentProofPreview,
      qrisProofName: proof.qrisName ?? customer.qrisProofName,
      qrisProofPreview: proof.qrisPreview ?? customer.qrisProofPreview,
    }
    write(CUSTOMER_KEY, customers.map((item) => item.id === customerId ? next : item))
    return next
  },
  async createDeposit(deposit, customers) {
    const input: FieldDepositInput = {
      ...deposit,
      payments: customers.map((customer) => ({
        bill_amount: getFieldBillSummary(customer).totalAmount,
        customer_area: `${customer.dusun} / ${customer.rw} / ${customer.rt} / ${customer.kampung}`,
        customer_id: customer.id,
        customer_name: customer.name,
        method: customer.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai',
        payment_date: customer.paymentPaidAt,
        proof_name: customer.paymentProofName,
        proof_preview: customer.paymentProofPreview,
        qris_proof_name: customer.qrisProofName,
        qris_proof_preview: customer.qrisProofPreview,
        receipt_number: `INV-${(customer.billingPeriod ?? '2026-08').replace('-', '')}-${customer.id.replace(/\D/g, '').slice(-4)}`,
        total_usage: Math.max(customer.currentMeter - customer.lastMeter, 0),
      })),
    }
    return toFieldDeposit(registerFieldDeposit(input))
  },
}

const realCustomerCache = new Map<string, FieldCustomer>()

async function findRealCustomer(customerId: string) {
  const cached = realCustomerCache.get(customerId)
  if (cached) return cached
  const response = await apiRequest<{ data: FieldCustomer[] }>(`/petugas/customers?per_page=5&search=${encodeURIComponent(customerId)}`)
  const customer = response.data.find((item) => item.id === customerId)
  if (customer) realCustomerCache.set(customer.id, customer)
  return customer
}

export const realFieldRepository: FieldRepository = {
  async getDashboard() {
    const response = await apiRequest<{ data: { assigned_customers: number; monthly_bill_total: number; paid_customers: number; pending_deposit_amount: number; pending_verification_amount: number; period: string; recorded_meters: number; water_rate_per_m3: number; admin_fee: number; late_fee: number; due_day: number } }>('/petugas/dashboard')
    const waterRate = Number(response.data.water_rate_per_m3)
    const adminFee = Number(response.data.admin_fee)
    const lateFee = Number(response.data.late_fee)
    const dueDay = Number(response.data.due_day)

    return {
      assignedCustomers: response.data.assigned_customers,
      monthlyBillTotal: Number(response.data.monthly_bill_total),
      paidCustomers: response.data.paid_customers,
      pendingDepositAmount: Number(response.data.pending_deposit_amount),
      pendingVerificationAmount: Number(response.data.pending_verification_amount),
      period: response.data.period,
      recordedMeters: response.data.recorded_meters,
      waterRate,
      adminFee,
      lateFee,
      dueDay,
    }
  },
  async getProfile() {
    const response = await apiRequest<{ data: { area: string; avatar?: string | null; gender?: string | null; name: string; phone?: string | null; photo_url?: string | null; role: string; status: 'aktif' | 'nonaktif'; username: string } }>('/petugas/account')
    return {
      area: response.data.area,
      avatar: response.data.avatar ?? response.data.name.slice(0, 2).toUpperCase(),
      gender: response.data.gender === 'perempuan' ? 'Perempuan' : 'Laki-laki',
      name: response.data.name,
      phone: response.data.phone ?? '-',
      photo: response.data.photo_url ?? undefined,
      role: response.data.role,
      status: response.data.status === 'aktif' ? 'Aktif' : 'Nonaktif',
      username: response.data.username,
    }
  },
  async listCustomers() {
    const first = await apiRequest<{ data: FieldCustomer[]; meta: { current_page: number; last_page: number } }>('/petugas/customers?per_page=100&page=1')
    const pages = await Promise.all(Array.from({ length: Math.max(first.meta.last_page - 1, 0) }, (_, index) =>
      apiRequest<{ data: FieldCustomer[] }>(`/petugas/customers?per_page=100&page=${index + 2}`),
    ))
    const customers = [...first.data, ...pages.flatMap((page) => page.data)]
    customers.forEach((customer) => realCustomerCache.set(customer.id, customer))
    return customers
  },
  async listDeposits() {
    const deposits = (await apiRequest<{ data: LaravelDeposit[] }>('/petugas/deposits?per_page=50')).data
    return deposits.map((deposit) => ({
      cash: Number(deposit.payment_summary.cash),
      customerCount: deposit.payment_summary.count,
      date: deposit.received_at ?? deposit.submitted_at ?? '-',
      id: `SET-${String(deposit.id).padStart(3, '0')}`,
      period: deposit.period,
      qris: Number(deposit.payment_summary.qris),
      status: deposit.status === 'verified' ? 'Terverifikasi' : deposit.status === 'pending' ? 'Menunggu Verifikasi' : 'Belum Diserahkan',
    }))
  },
  async saveMeter(customerId, previousMeter, currentMeter, _billAmount, _submittedAt, billingPeriod) {
    const [year, month] = billingPeriod.split('-').map(Number)
    const customer = await findRealCustomer(customerId)
    if (!customer?.backendId) throw new Error('ID database pelanggan tidak ditemukan.')
    const response = await apiRequest<{ data: FieldCustomer }>('/petugas/meter-readings', {
      body: JSON.stringify({ customer_id: customer.backendId, previous_meter: previousMeter, current_meter: currentMeter, period_month: month, period_year: year }),
      method: 'POST',
    })
    realCustomerCache.set(customerId, response.data)
    return response.data
  },
  async payCustomer(customerId, method, proof, billId) {
    if (!proof?.file) throw new Error('Foto kwitansi tercap wajib dipilih.')
    const form = new FormData()
    const customer = await findRealCustomer(customerId)
    if (!customer?.backendId) throw new Error('ID database pelanggan tidak ditemukan.')
    form.append('customer_id', String(customer.backendId))
    form.append('method', method.toLowerCase())
    form.append('proof', proof.file)
    // Pin the exact bill being paid — without this the backend falls back to
    // "the customer's latest bill", which silently pays the wrong period's
    // bill (or rejects with "kwitansi belum dicetak" for a newer unprinted
    // bill) whenever the petugas is looking at a month that isn't the
    // customer's most recent one.
    if (billId) form.append('bill_id', String(billId))
    if (method === 'QRIS') {
      if (!proof.qrisFile) throw new Error('Bukti transaksi QRIS wajib dipilih.')
      form.append('qris_proof', proof.qrisFile)
    }
    const response = await apiRequest<{ data: FieldCustomer }>('/petugas/payments', { body: form, method: 'POST' })
    const refreshedCustomer = { ...response.data, billStatus: 'Sudah Membayar' as const, paymentMethod: method }
    realCustomerCache.set(customerId, refreshedCustomer)
    return refreshedCustomer
  },
  async updatePaymentProof(customerId, proof, paymentId) {
    const customer = await findRealCustomer(customerId)
    const targetPaymentId = paymentId ?? customer?.paymentId
    if (!targetPaymentId) throw new Error('Data pembayaran pelanggan ini belum ditemukan.')
    const form = new FormData()
    if (proof.file) form.append('proof', proof.file)
    if (proof.qrisFile) form.append('qris_proof', proof.qrisFile)
    const response = await apiRequest<{ data: FieldCustomer }>(`/petugas/payments/${targetPaymentId}/proof`, { body: form, method: 'POST' })
    realCustomerCache.set(customerId, response.data)
    return response.data
  },
  async createDeposit(deposit) {
    const period = normalizeFieldPeriod(deposit.period)
    const response = await apiRequest<{ data: LaravelDeposit }>('/petugas/deposits', {
      body: JSON.stringify({ period }),
      idempotencyKey: createIdempotencyKey('field-deposit'),
      method: 'POST',
    })
    return {
      cash: response.data.payment_summary.cash,
      customerCount: response.data.payment_summary.count,
      date: response.data.received_at ?? response.data.submitted_at ?? new Date().toISOString(),
      id: `SET-${String(response.data.id).padStart(3, '0')}`,
      period: response.data.period,
      qris: response.data.payment_summary.qris,
      status: 'Menunggu Verifikasi',
    }
  },
}

function normalizeFieldPeriod(period: string) {
  if (/^\d{4}-\d{2}$/.test(period)) return period
  const year = period.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear())
  const monthNames = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember']
  const month = monthNames.findIndex((name) => period.toLowerCase().includes(name)) + 1

  return `${year}-${String(month > 0 ? month : new Date().getMonth() + 1).padStart(2, '0')}`
}

export const fieldRepository: FieldRepository = appEnvironment.useMockApi ? mockFieldRepository : realFieldRepository
