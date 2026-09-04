import { presentationCustomers } from '../../admin/data/presentationData'

export type FieldCustomer = {
  id: string
  backendId?: number
  billId?: number
  paymentId?: number
  name: string
  address: string
  dusun: 'Dusun 1' | 'Dusun 3'
  rw: string
  rt: string
  kampung: string
  zone: string
  lastMeter: number
  currentMeter: number
  meterStatus: 'Sudah Dicatat' | 'Belum Dicatat'
  meterSubmittedAt?: string
  receiptPrintedAt?: string
  billingPeriod?: string
  billStatus: 'Lunas' | 'Menunggak' | 'Sudah Membayar' | 'Belum Ada Tagihan'
  billAmount: number
  baseBillAmount?: number
  lateFeeAmount?: number
  paymentMethod?: 'Tunai' | 'QRIS' | 'Transfer'
  paymentPaidAt?: string
  paymentProofName?: string
  paymentProofPreview?: string
  qrisProofName?: string
  qrisProofPreview?: string
  depositStatus?: 'Belum Disetorkan' | 'Menunggu Verifikasi' | 'Terverifikasi'
  meterHistory?: FieldMeterHistory[]
}

export type FieldMeterHistory = {
  period: string
  previousMeter: number
  currentMeter: number
  usage: number
  billAmount: number
  submittedAt: string
  status?: string
  billId?: number
  lateFeeAmount?: number
  paymentId?: number
  paymentMethod?: 'Tunai' | 'QRIS' | 'Transfer'
  paymentProofPreview?: string
  qrisProofPreview?: string
}

export type FieldPaymentStatus = 'Belum Input Meter' | 'Terinput Meter' | 'Belum Membayar' | 'Sudah Membayar' | 'Lunas'

export type FieldBillSummary = {
  baseAmount: number
  lateFee: number
  totalAmount: number
  lateFeeEligibleAt: string | null
  lateFeeApplied: boolean
}

const SYSTEM_SETTINGS_KEY = 'pamsimas.mock.system.settings.v1'
const LATE_FEE_DAYS = 5
const DEFAULT_WATER_RATE = 3000
const DEFAULT_ADMIN_FEE = 5000
const DEFAULT_LATE_FEE = 2000
const DEFAULT_DUE_DAY = 25
const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
}

export type FieldDeposit = {
  id: string
  date: string
  period: string
  customerCount: number
  cash: number
  qris: number
  status: 'Belum Diserahkan' | 'Menunggu Verifikasi' | 'Terverifikasi'
}

export type FieldProfile = {
  name: string
  username: string
  phone: string
  role: string
  area: string
  gender: 'Laki-laki' | 'Perempuan'
  avatar: string
  photo?: string
  status: 'Aktif' | 'Nonaktif'
}

export const fieldCustomersSeed: FieldCustomer[] = presentationCustomers
  .filter((customer) => customer.area.includes('Dusun 3'))
  .slice(0, 48)
  .map((customer, index) => {
    const area = parseArea(customer.area)
    const lastMeter = 72 + (index % 55)
    const usage = 8 + (index % 21)
    const hasMeter = index % 4 !== 0
    const isPaid = hasMeter && index % 5 === 0

    return {
      address: customer.address,
      billAmount: hasMeter ? usage * 3000 + 5000 : 0,
      billStatus: isPaid ? 'Sudah Membayar' : 'Menunggak',
      currentMeter: hasMeter ? lastMeter + usage : lastMeter,
      dusun: 'Dusun 3',
      id: customer.id,
      kampung: area.kampung,
      lastMeter,
      meterStatus: hasMeter ? 'Sudah Dicatat' : 'Belum Dicatat',
      meterSubmittedAt: hasMeter ? `${9 + (index % 4)} Agustus 2026, ${String(8 + (index % 7)).padStart(2, '0')}:${index % 2 === 0 ? '15' : '40'}` : undefined,
      billingPeriod: hasMeter ? '2026-08' : undefined,
      name: customer.name,
      paymentMethod: isPaid ? (index % 2 === 0 ? 'Tunai' : 'QRIS') : undefined,
      rt: area.rt,
      rw: area.rw,
      zone: customer.area,
    }
  })

export const fieldProfileSeed: FieldProfile = {
  name: 'Budi Santoso',
  username: 'budi.santoso',
  phone: '0877-6543-2109',
  role: 'Petugas Penagih',
  area: 'Dusun 3: Banceuy, Pasir Peucang, Babakan Sari, Sukaasih',
  gender: 'Laki-laki',
  avatar: 'BS',
  status: 'Aktif',
}

function parseArea(area: string) {
  const [location = '', kampung = '-'] = area.split(' - ')
  const parts = location.split('/').map((part) => part.trim())

  return {
    kampung,
    rt: parts.find((part) => part.startsWith('RT')) ?? 'RT 01',
    rw: parts.find((part) => part.startsWith('RW')) ?? 'RW 06',
  }
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 0,
    style: 'currency',
  })
    .format(value)
    .replace(/\s/g, '')
}

let liveBillingSettings: { adminFee: number; lateFee: number; waterRate: number; dueDay: number } | null = null

export function setLiveFieldBillingSettings(settings: { adminFee: number; lateFee: number; waterRate: number; dueDay: number } | null) {
  liveBillingSettings = settings
}

export function getFieldBillingSettings() {
  if (liveBillingSettings) return liveBillingSettings

  try {
    const stored = window.localStorage.getItem(SYSTEM_SETTINGS_KEY)
    const settings = stored ? JSON.parse(stored) as { adminFee?: string | number; lateFee?: string | number; waterRate?: string | number } : {}
    const waterRate = Number(settings.waterRate ?? DEFAULT_WATER_RATE)
    const adminFee = Number(settings.adminFee ?? DEFAULT_ADMIN_FEE)
    const lateFee = Number(settings.lateFee ?? DEFAULT_LATE_FEE)

    return {
      adminFee: Number.isFinite(adminFee) && adminFee >= 0 ? adminFee : DEFAULT_ADMIN_FEE,
      dueDay: DEFAULT_DUE_DAY,
      lateFee: Number.isFinite(lateFee) && lateFee >= 0 ? lateFee : DEFAULT_LATE_FEE,
      waterRate: Number.isFinite(waterRate) && waterRate >= 0 ? waterRate : DEFAULT_WATER_RATE,
    }
  } catch {
    return {
      adminFee: DEFAULT_ADMIN_FEE,
      dueDay: DEFAULT_DUE_DAY,
      lateFee: DEFAULT_LATE_FEE,
      waterRate: DEFAULT_WATER_RATE,
    }
  }
}

function parseDate(value?: string) {
  if (!value) return null
  const nativeDate = new Date(value)
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate

  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,\s*(\d{1,2}):(\d{2}))?$/)
  if (!match) return null
  const month = INDONESIAN_MONTHS[match[2].toLowerCase()]
  if (month === undefined) return null
  return new Date(Number(match[3]), month, Number(match[1]), Number(match[4] ?? 0), Number(match[5] ?? 0))
}

function getLateFeeSetting() {
  return getFieldBillingSettings().lateFee
}

export function getFieldBillSummary(customer: FieldCustomer, now = new Date()): FieldBillSummary {
  const baseAmount = Math.max(Number(customer.baseBillAmount ?? customer.billAmount) || 0, 0)
  const sourceDates = [parseDate(customer.meterSubmittedAt), parseDate(customer.receiptPrintedAt)].filter((date): date is Date => Boolean(date))
  const startDate = sourceDates.sort((left, right) => left.getTime() - right.getTime())[0]
  const eligibleAt = startDate ? new Date(startDate.getTime() + LATE_FEE_DAYS * 24 * 60 * 60 * 1000) : null
  const eligibleForLateFee = baseAmount > 0 && Boolean(eligibleAt && now.getTime() >= eligibleAt.getTime())
  const lateFeeApplied = customer.lateFeeAmount !== undefined
    ? customer.lateFeeAmount > 0
    : customer.billStatus !== 'Lunas' && eligibleForLateFee
  const lateFee = lateFeeApplied ? (customer.lateFeeAmount ?? getLateFeeSetting()) : 0

  return {
    baseAmount,
    lateFee,
    totalAmount: baseAmount + lateFee,
    lateFeeEligibleAt: eligibleAt?.toISOString() ?? null,
    lateFeeApplied,
  }
}

export function getFieldPaymentStatus(customer: FieldCustomer): FieldPaymentStatus {
  if (customer.billStatus === 'Lunas') return 'Lunas'
  if (customer.billStatus === 'Sudah Membayar' || customer.paymentMethod) return 'Sudah Membayar'
  if (customer.meterStatus === 'Belum Dicatat') return 'Belum Input Meter'
  if (customer.billAmount > 0) return 'Belum Membayar'

  return 'Terinput Meter'
}
