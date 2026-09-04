import type { Customer, DashboardSummary, Officer } from '../../../types'
import { apiService } from '../../../app/services/apiService'
import { appEnvironment } from '../../../app/config/environment'
import { mockPublicRepository } from '../../../app/services/publicRepository'
import { mockOfficerRepository } from '../../../app/services/adminMockRepository'
import { getCashBalance, listDeposits, listExpenses } from '../../../app/services/financeMockRepository'
import { getSession, logout } from '../../../app/services/authService'
import type { CustomerPageInput, CustomerPageResult } from '../../../app/services/customerRepository'
import {
  defaultPublicServiceCards,
  publicFaq,
  type PublicMapSettings,
  type PublicMember,
  type PublicProfileContent,
  type PublicServiceCard,
} from '../../publik/data/publicData'
import { areaUnits } from '../data/regionData'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
const TOKEN_KEY = 'pamsimas.admin.token'
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

type LaravelDashboardResponse = {
  data?: unknown
}

type LaravelPaginator<T> = {
  data: T[]
}

export type ApiRegion = {
  capacity_households?: number
  dusun: 'Dusun 1' | 'Dusun 3' | string
  dusun_id?: number
  dusunId?: number
  households: number
  id: number
  is_assigned: boolean
  kampung: string
  name: string
  rt: string
  rw: string
}

type LaravelOfficer = {
  id: number
  officer_code: string
  name: string
  username: string
  phone: string
  gender?: string | null
  photo_url?: string | null
  status: 'aktif' | 'nonaktif'
  customers_count: number
  regions: ApiRegion[]
}

type LaravelPublicMap = {
  contact_label?: string | null
  contact_whatsapp?: string | null
  coverage?: string | null
  description?: string | null
  guide_description?: string | null
  guide_steps?: string[] | null
  guide_title?: string | null
  map_image_url?: string | null
  map_note?: string | null
  status?: string | null
  title?: string | null
}

type LaravelProfileMember = {
  description?: string | null
  id?: number
  name?: string | null
  photo_url?: string | null
  position?: string | null
}

type LaravelProfile = {
  address?: string | null
  contact_whatsapp?: string | null
  description?: string | null
  established?: string | null
  footer_contact_label?: string | null
  members?: LaravelProfileMember[] | null
  name?: string | null
  office_hours_days?: string | null
  office_hours_time?: string | null
  service_cards?: Array<{ desc?: string | null; icon?: string | null; title?: string | null }> | null
  title?: string | null
}

export type PublicFaqItem = {
  answer: string
  category?: string
  id: string
  question: string
}

export type PublicSummary = {
  activeCustomers: number
  overduePercentage: number
  servedAreas: string[]
}

export type SystemSettings = {
  activeMonth: string
  activeYear: string
  adminFee: string
  dueDate: string
  lateFee: string
  signatoryName: string
  signatoryTitle: string
  waterRate: string
}

export type AdminAccount = {
  avatar: string
  email: string
  gender: string
  name: string
  photo: string
  username: string
}

export type CustomerBillDetail = {
  amount: number
  baseAmount: number
  depositId?: number | null
  invoiceNumber: string
  lateFee: number
  meterCurrent: number
  meterPrevious: number
  paidAt?: string | null
  paymentMethod?: string | null
  period: string
  printStatus: string
  status: string
  usage: number
}

export type AdminCustomerDetail = {
  currentBill?: CustomerBillDetail | null
  customer: Customer & { joinedAt?: string }
  history: CustomerBillDetail[]
}

export type OfficerDepositDetail = {
  cash: number
  customerCount: number
  date?: string | null
  id: number
  period: string
  qris: number
  status: 'pending' | 'verified' | 'rejected'
  total: number
}

export type AdminOfficerDetail = {
  deposits: OfficerDepositDetail[]
  officer: Officer
  summary: {
    customers: number
    pendingDeposit: number
    totalBill: number
    verifiedDeposit: number
  }
}

type DashboardSummaryPayload = {
  activity_logs?: Array<{
    action?: string
    actor_name?: string
    description?: string
    id?: number | string
    logged_at?: string
  }>
  active_customers?: number
  activeCustomers?: number
  pending_deposits?: number
  pendingDeposits?: number
  monthly_expenses?: number
  monthlyExpenses?: number
  payment?: {
    paid_percentage?: number
    paidPercentage?: number
    unpaid_percentage?: number
    unpaidPercentage?: number
  }
  cash_accounts?: {
    cash?: number
    qris?: number
  }
  cashAccounts?: {
    cash?: number
    qris?: number
  }
  period_label?: string
  periodLabel?: string
  billing_window?: {
    due_day?: number
    is_overdue?: boolean
    late_fee?: number
    period_end?: string
    period_start?: string
  }
}

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  if (appEnvironment.useMockApi) {
    const customers = await apiService.customers.list(signal)
    const activeCustomers = customers.filter((customer) => customer.status !== 'Nonaktif')
    const paidCustomers = activeCustomers.filter((customer) => customer.status === 'Aktif').length
    const paidPercentage = activeCustomers.length > 0 ? Math.round((paidCustomers / activeCustomers.length) * 100) : 0
    const settings = await getSystemSettings()
    const month = MONTH_NAMES.indexOf(settings.activeMonth) + 1 || new Date().getMonth() + 1
    const year = Number(settings.activeYear) || new Date().getFullYear()
    const dueDay = Math.min(Math.max(Number(settings.dueDate) || 25, 1), new Date(year, month, 0).getDate())
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

    return {
      activities: [{ action: 'mock', actorName: 'Simulasi Lokal', description: 'Data tersimpan di localStorage dan dapat diubah melalui UI.', id: 'mock-dashboard-activity', loggedAt: new Date().toISOString() }],
      activeCustomers: activeCustomers.length,
      pendingDeposits: listDeposits().filter((deposit) => deposit.status === 'pending').length,
      monthlyExpenses: listExpenses().filter((expense) => expense.status === 'posted').reduce((total, expense) => total + expense.amount, 0),
      payment: { paidPercentage, unpaidPercentage: activeCustomers.length > 0 ? 100 - paidPercentage : 0 },
      cashAccounts: { cash: getCashBalance(1), qris: getCashBalance(2) },
      periodLabel: 'Mode simulasi lokal',
      billingWindow: {
        dueDay,
        isOverdue: new Date() > new Date(`${periodEnd}T23:59:59`),
        lateFee: Number(settings.lateFee) || 0,
        periodEnd,
        periodStart,
      },
    }
  }
  const payload = await apiRequest<LaravelDashboardResponse | DashboardSummaryPayload>('/admin/dashboard', { signal })
  const summary = ('data' in payload ? payload.data : payload) as DashboardSummaryPayload

  return normalizeDashboardSummary(summary)
}

export async function getAdminCustomers(signal?: AbortSignal): Promise<Customer[]> {
  return apiService.customers.list(signal)
}

export async function getAdminCustomerPage(input: CustomerPageInput, signal?: AbortSignal): Promise<CustomerPageResult> {
  return apiService.customers.listPage(input, signal)
}

export async function createAdminCustomer(customer: Customer): Promise<Customer> {
  return apiService.customers.create(customer)
}

export async function updateAdminCustomer(customer: Customer): Promise<Customer> {
  return apiService.customers.update(customer)
}

export async function deleteAdminCustomer(customerId: string): Promise<void> {
  await apiService.customers.remove(customerId)
}

export async function getAdminCustomerDetail(customerCode: string, signal?: AbortSignal): Promise<AdminCustomerDetail> {
  if (appEnvironment.useMockApi) {
    const customer = (await apiService.customers.list(signal)).find((item) => item.id === customerCode)
    if (!customer) throw new Error('Pelanggan tidak ditemukan.')
    const usage = customer.meterUsage ?? Math.max((customer.meterEnd ?? 0) - (customer.meterStart ?? 0), 0)
    const currentBill = customer.meterEnd === undefined ? null : {
      amount: customer.billAmount ?? usage * 3000 + 5000,
      baseAmount: customer.billAmount ?? usage * 3000 + 5000,
      invoiceNumber: `INV-${customer.id}`,
      lateFee: 0,
      meterCurrent: customer.meterEnd,
      meterPrevious: customer.meterStart ?? 0,
      period: customer.meterPeriod ?? '',
      printStatus: 'belum_dicetak',
      status: customer.paymentStatus === 'Lunas' ? 'lunas' : 'belum_lunas',
      usage,
    }
    return { currentBill, customer, history: currentBill ? [currentBill] : [] }
  }

  type LaravelBillDetail = {
    amount: number
    base_amount: number
    deposit_id?: number | null
    invoice_number: string
    late_fee: number
    meter_current: number
    meter_previous: number
    paid_at?: string | null
    payment_method?: string | null
    period: string
    print_status: string
    status: string
    usage: number
  }
  type LaravelCustomerDetail = {
    current_bill?: LaravelBillDetail | null
    customer: {
      address: string
      customer_code: string
      dusun?: string | null
      joined_at?: string | null
      kampung?: string | null
      name: string
      rt?: string | null
      rw?: string | null
      status: 'aktif' | 'menunggak' | 'nonaktif'
    }
    history: LaravelBillDetail[]
  }
  const response = await apiRequest<{ data: LaravelCustomerDetail }>(`/admin/customers/${encodeURIComponent(customerCode)}`, { signal })
  const payload = response.data
  const customer: Customer & { joinedAt?: string } = {
    address: payload.customer.address,
    area: `${payload.customer.dusun ?? '-'} / ${payload.customer.rw ?? '-'} / ${payload.customer.rt ?? '-'} - ${payload.customer.kampung ?? '-'}`,
    id: payload.customer.customer_code,
    joinedAt: payload.customer.joined_at ?? undefined,
    name: payload.customer.name,
    status: payload.customer.status === 'aktif' ? 'Aktif' : payload.customer.status === 'menunggak' ? 'Menunggak' : 'Nonaktif',
  }

  return {
    currentBill: payload.current_bill ? mapCustomerBillDetail(payload.current_bill) : null,
    customer,
    history: payload.history.map(mapCustomerBillDetail),
  }
}

export async function getAdminRegions(signal?: AbortSignal): Promise<ApiRegion[]> {
  if (appEnvironment.useMockApi) {
    return [
      ...areaUnits.map((region, index) => ({
        dusun: region.dusun,
        households: region.households,
        id: index + 1,
        is_assigned: false,
        kampung: region.kampung,
        name: `${region.rt} - ${region.kampung}`,
        rt: region.rt,
        rw: region.rw,
      })),
      ...readMockCustomRegions(),
    ]
  }
  const payload = await apiRequest<LaravelPaginator<ApiRegion>>('/admin/regions', { signal })

  return payload.data
}

type WilayahInput = { dusun: string; kampung: string; rt: string; rw: string }

/**
 * Creates a new Dusun/RW/RT/Kampung combination for the customer form's
 * region pickers. The backend models Dusun -> RW -> RT as a real parent
 * chain, so in real mode this resolves (or creates) each existing level
 * before creating the RT leaf that actually carries the Kampung name.
 */
export async function createWilayah(input: WilayahInput): Promise<void> {
  const dusun = input.dusun.trim()
  const rw = input.rw.trim()
  const rt = input.rt.trim()
  const kampung = input.kampung.trim()

  if (appEnvironment.useMockApi) {
    const customRegions = readMockCustomRegions()
    customRegions.push({
      dusun,
      households: 0,
      id: 100000 + customRegions.length + 1,
      is_assigned: false,
      kampung,
      name: `${rt} - ${kampung}`,
      rt,
      rw,
    })
    window.localStorage.setItem('pamsimas.mock.regions.custom.v1', JSON.stringify(customRegions))
    return
  }

  const parents = (await apiRequest<{ data: Array<{ dusun_name?: string | null; id: number; name: string; type: 'dusun' | 'rw' }> }>('/admin/regions/parents')).data

  let dusunEntry = parents.find((item) => item.type === 'dusun' && item.name.toLowerCase() === dusun.toLowerCase())
  if (!dusunEntry) {
    const created = await apiRequest<{ data: { id: number } }>('/admin/regions', {
      body: JSON.stringify({ name: dusun, type: 'dusun' }),
      method: 'POST',
    })
    dusunEntry = { id: created.data.id, name: dusun, type: 'dusun' }
  }

  let rwEntry = parents.find((item) => item.type === 'rw' && item.dusun_name?.toLowerCase() === dusun.toLowerCase() && item.name.toLowerCase() === rw.toLowerCase())
  if (!rwEntry) {
    const created = await apiRequest<{ data: { id: number } }>('/admin/regions', {
      body: JSON.stringify({ name: rw, parent_id: dusunEntry.id, type: 'rw' }),
      method: 'POST',
    })
    rwEntry = { dusun_name: dusun, id: created.data.id, name: rw, type: 'rw' }
  }

  await apiRequest('/admin/regions', {
    body: JSON.stringify({ code: rt, kampung, name: rt, parent_id: rwEntry.id, type: 'rt' }),
    method: 'POST',
  })
}

function readMockCustomRegions(): ApiRegion[] {
  try {
    const stored = window.localStorage.getItem('pamsimas.mock.regions.custom.v1')
    return stored ? JSON.parse(stored) as ApiRegion[] : []
  } catch {
    return []
  }
}

export async function getAdminOfficers(signal?: AbortSignal): Promise<Officer[]> {
  if (appEnvironment.useMockApi) return mockOfficerRepository.list()
  const payload = await apiRequest<LaravelPaginator<LaravelOfficer>>('/admin/officers', { signal })

  return payload.data.map(mapLaravelOfficer)
}

export async function createAdminOfficer(input: Officer, photo?: Blob | null): Promise<Officer> {
  if (appEnvironment.useMockApi) return mockOfficerRepository.save(input)
  const payload = await apiRequest<LaravelOfficer>('/admin/officers', {
    body: toOfficerFormData(input, photo),
    method: 'POST',
  }, false)

  return mapLaravelOfficer(payload)
}

export async function updateAdminOfficer(input: Officer, photo?: Blob | null): Promise<Officer> {
  if (appEnvironment.useMockApi) return mockOfficerRepository.save(input)
  const backendId = input.backendId ?? Number(input.id.replace(/\D/g, ''))
  const payload = await apiRequest<LaravelOfficer>(`/admin/officers/${backendId}`, {
    body: toOfficerFormData(input, photo, true),
    method: 'POST',
  }, false)

  return mapLaravelOfficer(payload)
}

export async function getAdminOfficerDetail(officer: Officer, signal?: AbortSignal): Promise<AdminOfficerDetail> {
  if (appEnvironment.useMockApi) {
    const totalBill = officer.customers * 45000
    return {
      deposits: [],
      officer,
      summary: { customers: officer.customers, pendingDeposit: totalBill, totalBill, verifiedDeposit: 0 },
    }
  }

  type LaravelOfficerDetail = LaravelOfficer & {
    deposits?: Array<{
      cash: number
      customer_count: number
      date?: string | null
      id: number
      period: string
      qris: number
      status: 'pending' | 'verified' | 'rejected'
      total: number
    }>
    summary?: {
      customers: number
      pending_deposit: number
      total_bill: number
      verified_deposit: number
    }
  }
  const backendId = officer.backendId ?? Number(officer.id.replace(/\D/g, ''))
  const response = await apiRequest<{ data: LaravelOfficerDetail }>(`/admin/officers/${backendId}`, { signal })
  const payload = response.data

  return {
    deposits: (payload.deposits ?? []).map((deposit) => ({
      cash: Number(deposit.cash),
      customerCount: deposit.customer_count,
      date: deposit.date,
      id: deposit.id,
      period: deposit.period,
      qris: Number(deposit.qris),
      status: deposit.status,
      total: Number(deposit.total),
    })),
    officer: mapLaravelOfficer(payload),
    summary: {
      customers: payload.summary?.customers ?? payload.customers_count,
      pendingDeposit: Number(payload.summary?.pending_deposit ?? 0),
      totalBill: Number(payload.summary?.total_bill ?? 0),
      verifiedDeposit: Number(payload.summary?.verified_deposit ?? 0),
    },
  }
}

export async function getPublicMapSettings(signal?: AbortSignal): Promise<PublicMapSettings> {
  if (appEnvironment.useMockApi) return mockPublicRepository.getMap()
  const payload = await publicRequest<LaravelDashboardResponse | LaravelPublicMap>('/publik/map', { signal })
  const mapData = ('data' in payload ? payload.data : payload) as LaravelPublicMap

  return mapLaravelPublicMap(mapData)
}

export async function getPublicSummary(signal?: AbortSignal): Promise<PublicSummary> {
  if (appEnvironment.useMockApi) {
    const customers = await apiService.customers.list(signal)
    const activeCustomers = customers.filter((customer) => customer.status !== 'Nonaktif')
    const servedAreas = Array.from(new Set(activeCustomers.map((customer) => customer.area.split('/')[0]?.trim()).filter(Boolean))).sort()
    const overdue = activeCustomers.filter((customer) => customer.status === 'Menunggak').length

    return {
      activeCustomers: activeCustomers.length,
      overduePercentage: activeCustomers.length > 0 ? Math.round((overdue / activeCustomers.length) * 100) : 0,
      servedAreas,
    }
  }

  const response = await publicRequest<{ data: { active_customers: number; overdue_percentage: number; served_areas: string[] } }>('/publik/summary', { signal })
  return {
    activeCustomers: response.data.active_customers,
    overduePercentage: response.data.overdue_percentage,
    servedAreas: response.data.served_areas,
  }
}

export async function getPublicFaqs(signal?: AbortSignal): Promise<PublicFaqItem[]> {
  if (appEnvironment.useMockApi) {
    try {
      const stored = window.localStorage.getItem('pamsimas.mock.system.faqs.v1')
      if (stored) return JSON.parse(stored) as PublicFaqItem[]
      const seed = publicFaq.flatMap((group) => group.items).map((faq, index) => ({ ...faq, id: `mock-${index + 1}` }))
      window.localStorage.setItem('pamsimas.mock.system.faqs.v1', JSON.stringify(seed))
      return seed
    } catch {
      return publicFaq.flatMap((group) => group.items).map((faq, index) => ({ ...faq, id: `mock-${index + 1}` }))
    }
  }

  const response = await publicRequest<{ data: Array<{ answer: string; category?: string; id: number; question: string }> }>('/publik/faqs', { signal })
  return response.data.map((faq) => ({ ...faq, id: String(faq.id) }))
}

export async function savePublicFaqs(faqs: PublicFaqItem[]): Promise<PublicFaqItem[]> {
  if (appEnvironment.useMockApi) {
    window.localStorage.setItem('pamsimas.mock.system.faqs.v1', JSON.stringify(faqs))
    return faqs
  }

  const response = await apiRequest<{ data: Array<{ answer: string; category?: string; id: number; question: string }> }>('/admin/settings/faqs', {
    body: JSON.stringify({
      faqs: faqs.map((faq) => ({
        answer: faq.answer,
        category: faq.category ?? 'Umum',
        id: /^\d+$/.test(faq.id) ? Number(faq.id) : undefined,
        question: faq.question,
      })),
    }),
    method: 'PUT',
  })

  return response.data.map((faq) => ({ ...faq, id: String(faq.id) }))
}

export async function savePublicMapSettings(input: PublicMapSettings, imageFile?: File | null): Promise<PublicMapSettings> {
  if (appEnvironment.useMockApi) {
    const nextSettings = imageFile ? { ...input, image: URL.createObjectURL(imageFile) } : input
    return mockPublicRepository.saveMap(nextSettings)
  }
  const formData = new FormData()
  formData.append('_method', 'PATCH')
  formData.append('title', input.title)
  formData.append('description', input.description)
  formData.append('map_note', input.mapNote)
  formData.append('coverage', input.coverage)
  formData.append('status', input.status === 'Perlu Perhatian' ? 'perhatian' : 'normal')
  formData.append('contact_label', input.contactLabel)
  formData.append('contact_whatsapp', input.contactWhatsapp)
  formData.append('guide_title', input.guideTitle)
  formData.append('guide_description', input.guideDescription)
  input.guideSteps.forEach((step, index) => formData.append(`guide_steps[${index}]`, step))

  if (imageFile) {
    formData.append('map_image', imageFile, imageFile.name)
  }

  const payload = await apiRequest<LaravelDashboardResponse | LaravelPublicMap>('/admin/public-map', {
    body: formData,
    method: 'POST',
  }, false)
  const mapData = ('data' in payload ? payload.data : payload) as LaravelPublicMap

  return mapLaravelPublicMap(mapData)
}

export async function getPublicProfileContent(signal?: AbortSignal): Promise<{
  members: PublicMember[]
  profile: PublicProfileContent
  serviceCards: PublicServiceCard[]
}> {
  if (appEnvironment.useMockApi) return mockPublicRepository.getProfile()
  const payload = await publicRequest<LaravelDashboardResponse | LaravelProfile>('/publik/profile', { signal })
  const profileData = ('data' in payload ? payload.data : payload) as LaravelProfile

  return mapLaravelPublicProfile(profileData)
}

export async function savePublicProfileContent(input: {
  members: PublicMember[]
  profile: PublicProfileContent
  serviceCards: PublicServiceCard[]
}): Promise<{
  members: PublicMember[]
  profile: PublicProfileContent
  serviceCards: PublicServiceCard[]
}> {
  if (appEnvironment.useMockApi) return mockPublicRepository.saveProfile(input)
  const formData = new FormData()
  formData.append('_method', 'PATCH')
  formData.append('address', input.profile.address)
  formData.append('contact_whatsapp', input.profile.contactWhatsapp)
  formData.append('description', input.profile.description)
  formData.append('established', input.profile.established)
  formData.append('footer_contact_label', input.profile.contactLabel)
  formData.append('name', input.profile.name)
  formData.append('office_hours_days', input.profile.officeHoursDays)
  formData.append('office_hours_time', input.profile.officeHoursTime)
  formData.append('title', input.profile.title)
  input.serviceCards.forEach((card, index) => {
    formData.append(`service_cards[${index}][desc]`, card.desc)
    formData.append(`service_cards[${index}][icon]`, card.icon)
    formData.append(`service_cards[${index}][title]`, card.title)
  })
  const filledMembers = input.members.filter((member) =>
    Boolean(member.name.trim() || member.role.trim() || member.description.trim() || member.image),
  )

  await Promise.all(filledMembers.map(async (member, index) => {
    formData.append(`members[${index}][description]`, member.description)
    formData.append(`members[${index}][name]`, member.name)
    formData.append(`members[${index}][position]`, member.role)
    formData.append(`members[${index}][sort_order]`, String(index + 1))
    if (/^\d+$/.test(member.id)) formData.append(`members[${index}][id]`, member.id)
    if (member.image?.startsWith('data:')) {
      formData.append(`members[${index}][photo]`, await dataUrlToBlob(member.image), `pengurus-${index + 1}.png`)
    }
  }))

  const payload = await apiRequest<LaravelDashboardResponse | LaravelProfile>('/admin/profile', {
    body: formData,
    method: 'POST',
  }, false)
  const profileData = ('data' in payload ? payload.data : payload) as LaravelProfile

  return mapLaravelPublicProfile(profileData)
}

export async function getSystemSettings(signal?: AbortSignal): Promise<SystemSettings> {
  const fallback = getDefaultSystemSettings()
  if (appEnvironment.useMockApi) {
    try {
      const stored = window.localStorage.getItem('pamsimas.mock.system.settings.v1')
      return stored ? { ...fallback, ...JSON.parse(stored) as Partial<SystemSettings> } : fallback
    } catch {
      return fallback
    }
  }

  const response = await apiRequest<{ data: { active_tariff?: { admin_fee?: number | string; water_rate_per_m3?: number | string }; settings?: Record<string, unknown> } }>('/admin/settings', { signal })
  const settings = response.data.settings ?? {}
  const billing = (settings.billing_period ?? {}) as { due_day?: number; month?: number; year?: number }
  const baseTariff = (settings.base_tariff ?? {}) as { admin_fee?: number; water_rate_per_m3?: number }
  const signatory = (settings.receipt_signatory ?? {}) as { name?: string; title?: string }
  const tariff = response.data.active_tariff ?? {}

  return {
    activeMonth: MONTH_NAMES[(billing.month ?? 8) - 1] ?? 'Agustus',
    activeYear: String(billing.year ?? 2026),
    adminFee: String(tariff.admin_fee ?? baseTariff.admin_fee ?? 5000),
    dueDate: String(billing.due_day ?? 25),
    lateFee: String(settings.late_fee ?? 2000),
    signatoryName: signatory.name ?? 'ADE SOPIAN',
    signatoryTitle: signatory.title ?? 'Ketua KPSPAMS TIRTA SARI',
    waterRate: String(tariff.water_rate_per_m3 ?? baseTariff.water_rate_per_m3 ?? 3000),
  }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
  if (appEnvironment.useMockApi) {
    window.localStorage.setItem('pamsimas.mock.system.settings.v1', JSON.stringify(settings))
    return settings
  }

  const month = MONTH_NAMES.indexOf(settings.activeMonth) + 1
  await apiRequest('/admin/settings', {
    body: JSON.stringify({
      settings: {
        base_tariff: { admin_fee: Number(settings.adminFee), water_rate_per_m3: Number(settings.waterRate) },
        billing_period: { due_day: Number(settings.dueDate), month: month > 0 ? month : 1, year: Number(settings.activeYear) },
        late_fee: Number(settings.lateFee),
        receipt_signatory: { name: settings.signatoryName, title: settings.signatoryTitle },
      },
    }),
    method: 'PATCH',
  })

  return getSystemSettings()
}

export async function getAdminAccount(signal?: AbortSignal): Promise<AdminAccount> {
  const fallback: AdminAccount = { avatar: 'AU', email: 'admin@pamsimas.local', gender: 'Perempuan', name: 'Admin Utama', photo: '', username: 'admin' }
  if (appEnvironment.useMockApi) {
    try {
      const stored = window.localStorage.getItem('pamsimas.mock.admin.account.v1')
      return stored ? { ...fallback, ...JSON.parse(stored) as Partial<AdminAccount> } : fallback
    } catch {
      return fallback
    }
  }

  const response = await apiRequest<{ data: { avatar?: string | null; email: string; gender?: string | null; name: string; photo_url?: string | null; username: string } }>('/admin/account', { signal })
  return {
    avatar: response.data.avatar ?? makeInitials(response.data.name),
    email: response.data.email,
    gender: response.data.gender === 'laki-laki' ? 'Laki-laki' : 'Perempuan',
    name: response.data.name,
    photo: response.data.photo_url ?? '',
    username: response.data.username,
  }
}

export async function saveAdminAccount(account: AdminAccount): Promise<AdminAccount> {
  if (appEnvironment.useMockApi) {
    window.localStorage.setItem('pamsimas.mock.admin.account.v1', JSON.stringify(account))
    return account
  }

  const formData = new FormData()
  formData.append('_method', 'PATCH')
  formData.append('avatar', account.avatar)
  formData.append('email', account.email)
  formData.append('gender', account.gender.toLowerCase())
  formData.append('name', account.name)
  formData.append('username', account.username)
  if (account.photo.startsWith('data:')) {
    formData.append('photo', await dataUrlToBlob(account.photo), 'admin-profile.png')
  }

  const response = await apiRequest<{ data: { avatar?: string | null; email: string; gender?: string | null; name: string; photo_url?: string | null; username: string } }>('/admin/account', {
    body: formData,
    method: 'POST',
  }, false)
  return {
    avatar: response.data.avatar ?? makeInitials(response.data.name),
    email: response.data.email,
    gender: response.data.gender === 'laki-laki' ? 'Laki-laki' : 'Perempuan',
    name: response.data.name,
    photo: response.data.photo_url ?? '',
    username: response.data.username,
  }
}

async function apiRequest<T = unknown>(path: string, init: RequestInit = {}, isJson = true): Promise<T> {
  const token = await getAdminToken()
  let response = await requestWithToken(path, token, init, isJson)

  if (response.status === 401) {
    window.localStorage.removeItem(TOKEN_KEY)
    response = await requestWithToken(path, await getAdminToken(), init, isJson)
  }

  if (response.status === 403) {
    // A stale/cross-tab session token (e.g. a petugas token left over in
    // shared localStorage) authenticates fine but fails the admin role
    // check. Clear it so the app falls back to the login screen instead of
    // repeating the same 403 on every admin request.
    logout()
    const message = 'Sesi login ini bukan admin atau sudah tidak berlaku. Silakan login ulang sebagai admin.'
    window.dispatchEvent(new CustomEvent('pamsimas:session-invalid', { detail: message }))
    throw new Error(message)
  }

  if (!response.ok) {
    const message = await parseApiError(response)
    throw new Error(message)
  }

  return await response.json() as T
}

async function requestWithToken(path: string, token: string, init: RequestInit = {}, isJson = true) {
  return await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
}

async function publicRequest<T = unknown>(path: string, init: RequestInit = {}, isJson = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) {
    const message = await parseApiError(response)
    throw new Error(message)
  }

  return await response.json() as T
}

async function getAdminToken(): Promise<string> {
  const existingToken = getSession()?.token ?? window.localStorage.getItem(TOKEN_KEY)

  if (existingToken) {
    return existingToken
  }

  throw new Error('Sesi backend tidak ditemukan. Silakan login kembali.')
}

function normalizeDashboardSummary(summary: DashboardSummaryPayload): DashboardSummary {
  const payment = summary.payment ?? {}
  const cashAccounts = summary.cash_accounts ?? summary.cashAccounts ?? {}

  return {
    activities: (summary.activity_logs ?? []).map((activity) => ({
      action: activity.action ?? 'activity',
      actorName: activity.actor_name ?? 'System',
      description: activity.description ?? '-',
      id: activity.id,
      loggedAt: activity.logged_at ?? '',
    })),
    activeCustomers: summary.active_customers ?? summary.activeCustomers ?? 0,
    pendingDeposits: summary.pending_deposits ?? summary.pendingDeposits ?? 0,
    monthlyExpenses: summary.monthly_expenses ?? summary.monthlyExpenses ?? 0,
    payment: {
      paidPercentage: payment.paid_percentage ?? payment.paidPercentage ?? 0,
      unpaidPercentage: payment.unpaid_percentage ?? payment.unpaidPercentage ?? 0,
    },
    cashAccounts: {
      cash: cashAccounts.cash ?? 0,
      qris: cashAccounts.qris ?? 0,
    },
    periodLabel: summary.period_label ?? summary.periodLabel ?? 'Periode berjalan',
    billingWindow: {
      dueDay: summary.billing_window?.due_day ?? 25,
      isOverdue: summary.billing_window?.is_overdue ?? false,
      lateFee: summary.billing_window?.late_fee ?? 0,
      periodEnd: summary.billing_window?.period_end ?? '',
      periodStart: summary.billing_window?.period_start ?? '',
    },
  }
}

function mapLaravelOfficer(officer: LaravelOfficer): Officer {
  const areas = officer.regions.map((region) => formatRegionArea(region))

  return {
    area: areas[0] ?? '-',
    areas,
    backendId: officer.id,
    customers: officer.customers_count,
    dusun: Array.from(new Set(officer.regions.map((region) => region.dusun))).join(', '),
    id: officer.officer_code,
    kampung: officer.regions.map((region) => region.kampung).join(', '),
    name: officer.name,
    phone: officer.phone,
    photoUrl: officer.photo_url ?? undefined,
    regionIds: officer.regions.map((region) => region.id),
    rt: officer.regions.map((region) => region.rt).join(', '),
    rw: Array.from(new Set(officer.regions.map((region) => region.rw))).join(', '),
    status: officer.status === 'aktif' ? 'Aktif' : 'Nonaktif',
    username: officer.username,
  }
}

function toOfficerFormData(input: Officer, photo?: Blob | null, isUpdate = false) {
  const formData = new FormData()
  const regionIds = input.regionIds ?? []

  if (isUpdate) {
    formData.append('_method', 'PATCH')
  }

  formData.append('name', input.name)
  formData.append('username', input.username)
  formData.append('phone', input.phone)
  formData.append('status', input.status === 'Aktif' ? 'aktif' : 'nonaktif')
  regionIds.forEach((regionId) => formData.append('region_ids[]', String(regionId)))

  if (photo) {
    formData.append('photo', photo, 'petugas-cropped.png')
  }

  return formData
}

function formatRegionArea(region: ApiRegion) {
  return `${region.dusun} / ${region.rw} / ${region.rt} - ${region.kampung}`
}

function mapLaravelPublicMap(mapData: LaravelPublicMap): PublicMapSettings {
  return {
    contactLabel: mapData.contact_label ?? '',
    contactWhatsapp: mapData.contact_whatsapp ?? '',
    coverage: mapData.coverage ?? '',
    description: mapData.description ?? '',
    guideDescription: mapData.guide_description ?? '',
    guideSteps: mapData.guide_steps ?? [],
    guideTitle: mapData.guide_title ?? '',
    image: mapData.map_image_url ?? '',
    mapNote: mapData.map_note ?? '',
    status: mapData.status === 'perhatian' ? 'Perlu Perhatian' : 'Sistem Normal',
    title: mapData.title ?? '',
  }
}

function mapLaravelPublicProfile(profileData: LaravelProfile) {
  const serviceCardsSource = profileData.service_cards?.length ? profileData.service_cards : defaultPublicServiceCards
  const serviceCards = serviceCardsSource.slice(0, 3).map((card, index) => ({
    desc: card.desc ?? '',
    icon: card.icon ?? 'drop',
    title: card.title ?? `Layanan ${index + 1}`,
  }))
  const members: PublicMember[] = Array.isArray(profileData.members)
    ? profileData.members.map((member, index) => ({
      description: member.description ?? '',
      id: String(member.id ?? `member-${index + 1}`),
      image: member.photo_url ?? undefined,
      name: member.name ?? `Pengurus ${index + 1}`,
      role: member.position ?? 'Jabatan',
    }))
    : []

  return {
    members,
    profile: {
      address: profileData.address ?? '',
      contactLabel: profileData.footer_contact_label ?? '',
      contactWhatsapp: profileData.contact_whatsapp ?? '',
      description: profileData.description ?? '',
      established: profileData.established ?? '',
      name: profileData.name ?? '',
      officeHoursDays: profileData.office_hours_days ?? '',
      officeHoursTime: profileData.office_hours_time ?? '',
      title: profileData.title ?? '',
    },
    serviceCards,
  }
}

function getDefaultSystemSettings(): SystemSettings {
  const today = new Date()

  return {
    activeMonth: MONTH_NAMES[today.getMonth()] ?? 'Januari',
    activeYear: String(today.getFullYear()),
    adminFee: '5000',
    dueDate: '25',
    lateFee: '2000',
    signatoryName: 'ADE SOPIAN',
    signatoryTitle: 'Ketua KPSPAMS TIRTA SARI',
    waterRate: '3000',
  }
}

function mapCustomerBillDetail(bill: {
  amount: number
  base_amount: number
  deposit_id?: number | null
  invoice_number: string
  late_fee: number
  meter_current: number
  meter_previous: number
  paid_at?: string | null
  payment_method?: string | null
  period: string
  print_status: string
  status: string
  usage: number
}): CustomerBillDetail {
  return {
    amount: Number(bill.amount),
    baseAmount: Number(bill.base_amount),
    depositId: bill.deposit_id,
    invoiceNumber: bill.invoice_number,
    lateFee: Number(bill.late_fee),
    meterCurrent: bill.meter_current,
    meterPrevious: bill.meter_previous,
    paidAt: bill.paid_at,
    paymentMethod: bill.payment_method,
    period: bill.period,
    printStatus: bill.print_status,
    status: bill.status,
    usage: bill.usage,
  }
}

async function dataUrlToBlob(dataUrl: string) {
  return await (await fetch(dataUrl)).blob()
}

function makeInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

async function parseApiError(response: Response) {
  try {
    const payload = await response.json() as { message?: string; errors?: Record<string, string[]> }
    const firstError = payload.errors ? Object.values(payload.errors).flat()[0] : undefined

    return firstError ?? payload.message ?? `API gagal dimuat (${response.status})`
  } catch {
    return `API gagal dimuat (${response.status})`
  }
}
