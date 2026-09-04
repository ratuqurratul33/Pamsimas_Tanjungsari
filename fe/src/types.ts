export type Page =
  | 'login'
  | 'public-home'
  | 'public-map'
  | 'public-transparency'
  | 'public-issues'
  | 'public-complaint'
  | 'public-faq'
  | 'public-about'
  | 'public-contact'
  | 'dashboard'
  | 'customers'
  | 'customer-detail'
  | 'officers'
  | 'officer-detail'
  | 'receipts'
  | 'receipt-bulk'
  | 'verification'
  | 'deposit-detail'
  | 'cash'
  | 'expenses'
  | 'map-settings'
  | 'transparency'
  | 'dusun-detail'
  | 'rt-detail'
  | 'reports'
  | 'report-print'
  | 'system-settings'
  | 'pamsimas-profile'
  | 'admin-account'
  | 'admin-help'
  | 'field-dashboard'
  | 'field-customers'
  | 'field-customer-detail'
  | 'field-meter'
  | 'field-payments'
  | 'field-deposits'
  | 'field-profile'
  | 'field-help'

export type SetPage = (page: Page) => void

export type StatTone = 'blue' | 'green' | 'red' | 'orange' | 'muted'

export type Stat = {
  label: string
  value: string
  note?: string
  tone?: StatTone
}

export type Customer = {
  id: string
  dusunId?: number
  name: string
  address: string
  area: string
  rtId?: number
  status: 'Aktif' | 'Menunggak' | 'Nonaktif'
  meterStart?: number
  meterEnd?: number
  meterUsage?: number
  meterPeriod?: string
  meterRecordedAt?: string
  billAmount?: number
  paymentStatus?: 'Belum Membayar' | 'Lunas' | 'Sudah Membayar'
  paymentMethod?: 'Tunai' | 'QRIS' | 'Transfer'
}

export type Officer = {
  id: string
  backendId?: number
  name: string
  username: string
  area: string
  areas?: string[]
  dusun?: string
  rw?: string
  rt?: string
  kampung?: string
  photoName?: string
  phone: string
  photoUrl?: string
  regionIds?: number[]
  customers: number
  status: 'Aktif' | 'Nonaktif'
}

export type DashboardData = {
  stats: Stat[]
  cash: { label: string; value: string }[]
}

export type DashboardSummary = {
  activities: Array<{
    action: string
    actorName: string
    description: string
    id?: number | string
    loggedAt: string
  }>
  activeCustomers: number
  pendingDeposits: number
  monthlyExpenses: number
  payment: {
    paidPercentage: number
    unpaidPercentage: number
  }
  cashAccounts: {
    cash: number
    qris: number
  }
  periodLabel: string
  billingWindow: {
    dueDay: number
    isOverdue: boolean
    lateFee: number
    periodEnd: string
    periodStart: string
  }
}

export type AppData = {
  dashboard: DashboardData
  customers: Customer[]
  officers: Officer[]
}

export type NavLink = {
  type: 'link'
  page: Page
  label: string
  icon: string
}

export type NavGroup = {
  type: 'group'
  id: string
  label: string
  icon: string
  items: { page: Page; label: string }[]
}

export type NavEntry = NavLink | NavGroup
