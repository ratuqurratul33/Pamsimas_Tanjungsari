import { Suspense, lazy, useEffect, useEffectEvent, useState, type Dispatch, type SetStateAction } from 'react'
import './App.css'
import { useAppRouter } from './app/hooks/useAppRouter'
import { getSession, logout, touchSession, validateSession, type AppRole } from './app/services/authService'
import { apiService } from './app/services/apiService'
import { appEnvironment } from './app/config/environment'
import { readMockCustomers } from './app/services/mockApiService'
import { subscribeToRealtimeUpdates } from './app/services/realtimeService'
import { expenseRows as initialExpenseRows, fallbackData } from './modules/admin/data/mockData'
import { AdminLayout } from './modules/admin/layout/AdminLayout'
import {
  getPublicMapSettings,
  getPublicFaqs,
  getPublicProfileContent,
  getPublicSummary,
  savePublicFaqs,
  savePublicMapSettings,
  savePublicProfileContent,
  type PublicFaqItem,
  type PublicSummary,
} from './modules/admin/services/adminApi'
import { ExpensesPage } from './modules/admin/pages/ExpensesPage'
import { fieldCustomersSeed, fieldProfileSeed, setLiveFieldBillingSettings, type FieldCustomer, type FieldDeposit } from './modules/petugas/data/petugasData'
import type { FieldDashboardSummary } from './app/services/fieldRepository'
import { PetugasLayout } from './modules/petugas/layout/PetugasLayout'
import { FieldPaymentsPage, PaymentModal } from './modules/petugas/pages/FieldPaymentsPage'
import { PublicLandingPage } from './modules/publik/pages/PublicLandingPage'
import {
  defaultPublicMapSettings,
  defaultPublicMembers,
  defaultPublicProfile,
  defaultPublicServiceCards,
  publicFaq,
  type PublicMapSettings,
  type PublicMember,
  type PublicProfileContent,
  type PublicServiceCard,
} from './modules/publik/data/publicData'
import type { Customer, Officer, Page } from './types'

const CashPage = lazy(() => import('./modules/admin/pages/CashPage').then((module) => ({ default: module.CashPage })))
const CustomerDetailPage = lazy(() => import('./modules/admin/pages/CustomerDetailPage').then((module) => ({ default: module.CustomerDetailPage })))
const CustomersPage = lazy(() => import('./modules/admin/pages/CustomersPage').then((module) => ({ default: module.CustomersPage })))
const DashboardPage = lazy(() => import('./modules/admin/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const DepositDetailPage = lazy(() => import('./modules/admin/pages/DepositDetailPage').then((module) => ({ default: module.DepositDetailPage })))
const DusunDetailPage = lazy(() => import('./modules/admin/pages/DusunDetailPage').then((module) => ({ default: module.DusunDetailPage })))
const LoginPage = lazy(() => import('./modules/admin/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const OfficerDetailPage = lazy(() => import('./modules/admin/pages/OfficerDetailPage').then((module) => ({ default: module.OfficerDetailPage })))
const OfficersPage = lazy(() => import('./modules/admin/pages/OfficersPage').then((module) => ({ default: module.OfficersPage })))
const ReceiptBulkPage = lazy(() => import('./modules/admin/pages/ReceiptBulkPage').then((module) => ({ default: module.ReceiptBulkPage })))
const ReceiptsPage = lazy(() => import('./modules/admin/pages/ReceiptsPage').then((module) => ({ default: module.ReceiptsPage })))
const ReportsPage = lazy(() => import('./modules/admin/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const ReportPrintPage = lazy(() => import('./modules/admin/pages/ReportPrintPage').then((module) => ({ default: module.ReportPrintPage })))
const RtDetailPage = lazy(() => import('./modules/admin/pages/RtDetailPage').then((module) => ({ default: module.RtDetailPage })))
const TransparencyPage = lazy(() => import('./modules/admin/pages/TransparencyPage').then((module) => ({ default: module.TransparencyPage })))
const VerificationPage = lazy(() => import('./modules/admin/pages/VerificationPage').then((module) => ({ default: module.VerificationPage })))
const PublicMapSettingsPage = lazy(() => import('./modules/admin/pages/PublicMapSettingsPage').then((module) => ({ default: module.PublicMapSettingsPage })))
const AdminAccountPage = lazy(() => import('./modules/admin/pages/AdminUtilityPages').then((module) => ({ default: module.AdminAccountPage })))
const AdminHelpPage = lazy(() => import('./modules/admin/pages/AdminUtilityPages').then((module) => ({ default: module.AdminHelpPage })))
const PamsimasProfilePage = lazy(() => import('./modules/admin/pages/AdminUtilityPages').then((module) => ({ default: module.PamsimasProfilePage })))
const SystemSettingsPage = lazy(() => import('./modules/admin/pages/AdminUtilityPages').then((module) => ({ default: module.SystemSettingsPage })))
const FieldCustomerDetailPage = lazy(() => import('./modules/petugas/pages/FieldCustomerDetailPage').then((module) => ({ default: module.FieldCustomerDetailPage })))
const FieldCustomersPage = lazy(() => import('./modules/petugas/pages/FieldCustomersPage').then((module) => ({ default: module.FieldCustomersPage })))
const FieldDashboardPage = lazy(() => import('./modules/petugas/pages/FieldDashboardPage').then((module) => ({ default: module.FieldDashboardPage })))
const FieldDepositsPage = lazy(() => import('./modules/petugas/pages/FieldDepositsPage').then((module) => ({ default: module.FieldDepositsPage })))
const FieldHelpPage = lazy(() => import('./modules/petugas/pages/FieldHelpPage').then((module) => ({ default: module.FieldHelpPage })))
const FieldMeterPage = lazy(() => import('./modules/petugas/pages/FieldMeterPage').then((module) => ({ default: module.FieldMeterPage })))
const FieldProfilePage = lazy(() => import('./modules/petugas/pages/FieldProfilePage').then((module) => ({ default: module.FieldProfilePage })))
const emptyRealPublicMap: PublicMapSettings = {
  contactLabel: 'Kontak petugas belum tersedia',
  contactWhatsapp: '',
  coverage: '',
  description: 'Informasi peta jaringan belum dipublikasikan.',
  guideDescription: '',
  guideSteps: [],
  guideTitle: 'Panduan belum dipublikasikan',
  image: '',
  mapNote: 'Belum ada catatan peta.',
  status: 'Sistem Normal',
  title: 'Peta jaringan air',
}

const emptyRealPublicProfile: PublicProfileContent = {
  address: '',
  contactLabel: 'Kontak belum tersedia',
  contactWhatsapp: '',
  description: 'Informasi profil publik belum dipublikasikan.',
  established: '',
  name: 'PAMSIMAS Tanjungsari',
  officeHoursDays: '',
  officeHoursTime: '',
  title: 'Profil PAMSIMAS Tanjungsari',
}

function App() {
  const { navigate, page } = useAppRouter()
  const [role, setRole] = useState<AppRole | null>(() => getSession()?.role ?? null)
  const [customers, setCustomers] = useState<Customer[]>(() => appEnvironment.useMockApi ? readMockCustomers() : [])
  const [officers, setOfficers] = useState<Officer[]>(() => appEnvironment.useMockApi ? fallbackData.officers : [])
  const [expenses] = useState<string[][]>(initialExpenseRows)
  const [fieldCustomers, setFieldCustomers] = useState<FieldCustomer[]>(() => appEnvironment.useMockApi ? loadStoredFieldCustomers() : [])
  const [fieldCustomersLoaded, setFieldCustomersLoaded] = useState(appEnvironment.useMockApi)
  const [fieldDeposits, setFieldDeposits] = useState<FieldDeposit[]>(() => appEnvironment.useMockApi ? loadStoredFieldDeposits() : [])
  const [fieldProfile, setFieldProfile] = useState(fieldProfileSeed)
  const [fieldDashboardSummary, setFieldDashboardSummary] = useState<FieldDashboardSummary | null>(null)
  const [publicMapSettings, setPublicMapSettings] = useState<PublicMapSettings>(() => appEnvironment.useMockApi ? defaultPublicMapSettings : emptyRealPublicMap)
  const [publicProfileContent, setPublicProfileContent] = useState<PublicProfileContent>(() => appEnvironment.useMockApi ? defaultPublicProfile : emptyRealPublicProfile)
  const [publicServiceCardsState, setPublicServiceCardsState] = useState<PublicServiceCard[]>(() => appEnvironment.useMockApi ? defaultPublicServiceCards : [])
  const [publicMembersState, setPublicMembersState] = useState<PublicMember[]>(() => appEnvironment.useMockApi ? defaultPublicMembers : [])
  const [publicFaqsState, setPublicFaqsState] = useState<PublicFaqItem[]>(() => appEnvironment.useMockApi
    ? publicFaq.flatMap((group) => group.items).map((faq, index) => ({ ...faq, id: `default-${index + 1}` }))
    : [])
  const [publicSummaryState, setPublicSummaryState] = useState<PublicSummary>({ activeCustomers: 0, overduePercentage: 0, servedAreas: [] })
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(fallbackData.officers[0]?.id ?? null)
  const [selectedFieldCustomerId, setSelectedFieldCustomerId] = useState(() => appEnvironment.useMockApi ? fieldCustomersSeed[0].id : '')
  const [paymentCustomerId, setPaymentCustomerId] = useState<string | null>(null)
  const [flashMessage, setFlashMessage] = useState('')
  const needsPublicContent = isPublicPage(page) || page === 'map-settings' || page === 'pamsimas-profile'
  const navigateToLogin = useEffectEvent(() => navigate('login'))

  function reportFieldLoadError(error: unknown) {
    setFlashMessage(error instanceof Error ? error.message : 'Data petugas gagal dimuat dari server.')
    window.setTimeout(() => setFlashMessage(''), 4000)
  }

  useEffect(() => {
    if (!needsPublicContent) return
    const abortController = new AbortController()

    async function loadPublicContent() {
      const [mapResult, profileResult, faqResult, summaryResult] = await Promise.allSettled([
        getPublicMapSettings(abortController.signal),
        getPublicProfileContent(abortController.signal),
        getPublicFaqs(abortController.signal),
        getPublicSummary(abortController.signal),
      ])

      if (abortController.signal.aborted) return
      if (mapResult.status === 'fulfilled') setPublicMapSettings(mapResult.value)
      if (profileResult.status === 'fulfilled') {
        setPublicProfileContent(profileResult.value.profile)
        setPublicServiceCardsState(profileResult.value.serviceCards)
        setPublicMembersState(profileResult.value.members)
      }
      if (faqResult.status === 'fulfilled') setPublicFaqsState(faqResult.value)
      if (summaryResult.status === 'fulfilled') setPublicSummaryState(summaryResult.value)
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadPublicContent()
    }

    void loadPublicContent()
    const refreshTimer = appEnvironment.useMockApi ? window.setInterval(() => void loadPublicContent(), 5000) : undefined
    const unsubscribeRealtime = subscribeToRealtimeUpdates(
      ['dashboard', 'finance', 'public-content', 'public-summary', 'public-transparency'],
      () => void loadPublicContent(),
    )
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      abortController.abort()
      if (refreshTimer) window.clearInterval(refreshTimer)
      unsubscribeRealtime()
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [needsPublicContent])

  useEffect(() => {
    if (!role || appEnvironment.useMockApi) return
    let active = true

    void validateSession().then((session) => {
      if (active) setRole(session.role)
    }).catch((error: unknown) => {
      if (!active) return
      // Network/API errors must not log the user out. Only an expired session
      // should return to login; this prevents logout during brief backend drops.
      if (error instanceof Error && error.message.includes('Sesi')) {
        logout()
        setRole(null)
        navigateToLogin()
      }
    })

    return () => { active = false }
  }, [role])

  useEffect(() => {
    if (!role) return
    const refreshSession = () => touchSession()
    const events = ['click', 'keydown', 'pointerdown', 'scroll'] as const
    events.forEach((event) => window.addEventListener(event, refreshSession, { passive: true }))
    return () => events.forEach((event) => window.removeEventListener(event, refreshSession))
  }, [role])

  useEffect(() => {
    if (role !== 'petugas') return
    let active = true
    const load = <T,>(request: Promise<T>, apply: (data: T) => void) => {
      void request.then((data) => {
        if (active) apply(data)
      }).catch((error: unknown) => {
        if (active) reportFieldLoadError(error)
      })
    }
    const loadDashboard = () => load(apiService.field.getDashboard(), (data) => {
      setFieldDashboardSummary(data)
      setLiveFieldBillingSettings({ adminFee: data.adminFee, dueDay: data.dueDay, lateFee: data.lateFee, waterRate: data.waterRate })
    })

    // Dashboard dan profil tidak perlu menunggu seluruh halaman pelanggan selesai.
    loadDashboard()
    load(apiService.field.getProfile(), setFieldProfile)
    load(apiService.field.listDeposits(), setFieldDeposits)
    setFieldCustomersLoaded(false)
    void apiService.field.listCustomers().then((data) => {
      if (active) setFieldCustomers(data)
    }).catch((error: unknown) => {
      if (active) reportFieldLoadError(error)
    }).finally(() => {
      if (active) setFieldCustomersLoaded(true)
    })

    const unsubscribeRealtime = subscribeToRealtimeUpdates(['field', 'settings'], loadDashboard)

    return () => { active = false; unsubscribeRealtime() }
  }, [role])

  useEffect(() => {
    if (!appEnvironment.useMockApi || role !== 'petugas') return

    const refreshSharedMockData = () => {
      void Promise.all([
        apiService.field.listCustomers(),
        apiService.field.listDeposits(),
        apiService.field.getDashboard(),
        apiService.field.getProfile(),
      ]).then(([nextCustomers, nextDeposits, nextDashboard, nextProfile]) => {
        setFieldCustomers(nextCustomers)
        setFieldDeposits(nextDeposits)
        setFieldDashboardSummary(nextDashboard)
        setFieldProfile(nextProfile)
      })
    }

    window.addEventListener('storage', refreshSharedMockData)
    return () => window.removeEventListener('storage', refreshSharedMockData)
  }, [role])

  function notify(message: string) {
    setFlashMessage(message)
    window.setTimeout(() => setFlashMessage(''), 2400)
  }

  function goToLogin() {
    logout()
    setRole(null)
    navigate('login')
  }

  const handleSessionInvalid = useEffectEvent((event: Event) => {
    const message = event instanceof CustomEvent && typeof event.detail === 'string' ? event.detail : 'Sesi berakhir. Silakan login kembali.'
    goToLogin()
    notify(message)
  })

  useEffect(() => {
    window.addEventListener('pamsimas:session-invalid', handleSessionInvalid)
    return () => window.removeEventListener('pamsimas:session-invalid', handleSessionInvalid)
  }, [])

  function syncAdminCustomerFromField(fieldCustomer: FieldCustomer) {
    setCustomers((currentCustomers) => currentCustomers.map((customer) => customer.id === fieldCustomer.id ? {
      ...customer,
      billAmount: fieldCustomer.billAmount,
      meterEnd: fieldCustomer.currentMeter,
      meterStart: fieldCustomer.lastMeter,
      meterUsage: Math.max(fieldCustomer.currentMeter - fieldCustomer.lastMeter, 0),
      paymentMethod: fieldCustomer.paymentMethod,
      paymentStatus: fieldCustomer.billStatus === 'Lunas' ? 'Lunas' : fieldCustomer.billStatus === 'Sudah Membayar' ? 'Sudah Membayar' : 'Belum Membayar',
      status: fieldCustomer.billStatus === 'Lunas' ? 'Aktif' : 'Menunggak',
    } : customer))
  }

  if (page === 'login' || (!role && !isPublicPage(page))) {
    return (
      <Suspense fallback={<AppPageFallback />}>
        <LoginPage onLogin={(nextRole) => {
          setRole(nextRole)
          if (appEnvironment.useMockApi) setCustomers(readMockCustomers())
          navigate(nextRole === 'petugas' ? 'field-dashboard' : 'dashboard')
        }} />
      </Suspense>
    )
  }

  if (isPublicPage(page)) {
    return (
      <Suspense fallback={<AppPageFallback />}>
        <PublicLandingPage
          customers={customers}
          expenses={expenses}
          mapSettings={publicMapSettings}
          members={publicMembersState}
          profile={publicProfileContent}
          faqs={publicFaqsState}
          serviceCards={publicServiceCardsState}
          summary={publicSummaryState}
        />
        {flashMessage && <div className="toast-message">{flashMessage}</div>}
      </Suspense>
    )
  }

  if (isFieldPage(page)) {
    if (role === 'admin') return <AccessDeniedPage onGoToLogin={goToLogin} />
    const selectedPaymentCustomer = fieldCustomers.find((customer) => customer.id === paymentCustomerId) ?? null

    return (
      <PetugasLayout page={page} profile={fieldProfile} setPage={navigate}>
        <Suspense fallback={<AppPageFallback compact />}>
          {renderFieldPage({
            customers: fieldCustomers,
            customersLoaded: fieldCustomersLoaded,
            dashboardSummary: fieldDashboardSummary,
            deposits: fieldDeposits,
            onError: reportFieldLoadError,
            page,
            profile: fieldProfile,
            selectedCustomerId: selectedFieldCustomerId,
            setPage: navigate,
            setPaymentCustomerId,
            setSelectedCustomerId: setSelectedFieldCustomerId,
            syncAdminCustomerFromField,
            updateCustomers: (updater) => setFieldCustomers((current) => { const next = typeof updater === 'function' ? updater(current) : updater; persistFieldCustomers(next); return next }),
            updateDeposits: (updater) => setFieldDeposits((current) => { const next = typeof updater === 'function' ? updater(current) : updater; persistFieldDeposits(next); return next }),
          })}
        </Suspense>
        {flashMessage && <div className="toast-message">{flashMessage}</div>}
        {selectedPaymentCustomer && (
          <PaymentModal
            customer={selectedPaymentCustomer}
            onClose={() => setPaymentCustomerId(null)}
            onSubmit={(method, proof) => apiService.field.payCustomer(selectedPaymentCustomer.id, method, proof).then((savedCustomer) => {
              setFieldCustomers((current) => { const next = current.map((customer) => customer.id === savedCustomer.id ? savedCustomer : customer); persistFieldCustomers(next); return next })
              syncAdminCustomerFromField(savedCustomer)
            }).catch((error: unknown) => {
              reportFieldLoadError(error)
              throw error
            })}
          />
        )}
      </PetugasLayout>
    )
  }

  if (role === 'petugas') return <AccessDeniedPage onGoToLogin={goToLogin} />

  return (
    <AdminLayout page={page} setPage={navigate}>
      <Suspense fallback={<AppPageFallback compact />}>
        {renderPage({
          addCustomer: (customer) => {
            setCustomers((currentCustomers) => [customer, ...currentCustomers])
            notify('Pelanggan baru berhasil ditambahkan.')
          },
          addOfficer: (officer) => {
            setOfficers((currentOfficers) => {
              const isExistingOfficer = currentOfficers.some((currentOfficer) => currentOfficer.id === officer.id)

              return isExistingOfficer
                ? currentOfficers.map((currentOfficer) => (currentOfficer.id === officer.id ? officer : currentOfficer))
                : [officer, ...currentOfficers]
            })
            notify('Data petugas berhasil disimpan.')
          },
          customers,
          deleteCustomer: (customerId) => {
            setCustomers((currentCustomers) => currentCustomers.filter((customer) => customer.id !== customerId))
            notify('Pelanggan berhasil dihapus sementara.')
          },
          notify,
          officers,
          page,
          publicMapSettings,
          publicFaqs: publicFaqsState,
          publicMembers: publicMembersState,
          publicProfile: publicProfileContent,
          publicServiceCards: publicServiceCardsState,
          setPage: navigate,
          updatePublicMapSettings: async (settings, imageFile) => {
            const savedSettings = await savePublicMapSettings(settings, imageFile)
            setPublicMapSettings(savedSettings)
          },
          updatePublicProfileContent: async (payload) => {
            const savedProfile = await savePublicProfileContent(payload)
            setPublicProfileContent(savedProfile.profile)
            setPublicServiceCardsState(savedProfile.serviceCards)
            setPublicMembersState(savedProfile.members)
          },
          updatePublicFaqs: async (faqs) => {
            const savedFaqs = await savePublicFaqs(faqs)
            setPublicFaqsState(savedFaqs)
          },
          updateCustomer: (customer) => {
            setCustomers((currentCustomers) => currentCustomers.map((currentCustomer) => currentCustomer.id === customer.id ? customer : currentCustomer))
            notify('Data pelanggan berhasil diperbarui sementara.')
          },
          selectedOfficerId,
          setSelectedOfficerId,
        })}
      </Suspense>
      {flashMessage && <div className="toast-message">{flashMessage}</div>}
    </AdminLayout>
  )
}

function AppPageFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'panel' : 'min-h-[40vh] px-4 py-10 sm:px-6 lg:px-8'}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-[1.75rem] border border-sky-100/90 bg-white/88 px-6 py-10 text-center shadow-[0_20px_48px_rgba(14,165,233,0.08)] backdrop-blur">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-600">Memuat Halaman</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-800">Modul sedang disiapkan</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Kami hanya memuat bagian yang sedang dibuka agar aplikasi tetap ringan saat pertama masuk.</p>
        </div>
      </div>
    </div>
  )
}

function AccessDeniedPage({ onGoToLogin }: { onGoToLogin: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center">
      <section className="rounded-3xl bg-white p-10 shadow-xl">
        <h1 className="text-2xl font-black text-slate-800">Akses tidak tersedia</h1>
        <p className="mt-3 text-slate-500">Akun ini tidak memiliki hak akses untuk modul tersebut.</p>
        <button
          className="mt-6 rounded-xl bg-[#0070A8] px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[0.98] active:scale-95"
          onClick={onGoToLogin}
          type="button"
        >
          Kembali ke Halaman Login
        </button>
      </section>
    </main>
  )
}

function isFieldPage(page: Page) {
  return page.startsWith('field-')
}

function isPublicPage(page: Page) {
  return page.startsWith('public-')
}

function renderPage({
  addCustomer,
  addOfficer,
  customers,
  deleteCustomer,
  notify,
  officers,
  page,
  publicFaqs,
  publicMapSettings,
  publicMembers,
  publicProfile,
  publicServiceCards,
  setPage,
  updatePublicMapSettings,
  updatePublicFaqs,
  updatePublicProfileContent,
  updateCustomer,
  selectedOfficerId,
  setSelectedOfficerId,
}: {
  addCustomer: (customer: Customer) => void
  addOfficer: (officer: Officer) => void
  customers: Customer[]
  deleteCustomer: (customerId: string) => void
  notify: (message: string) => void
  officers: Officer[]
  page: Page
  publicFaqs: PublicFaqItem[]
  publicMapSettings: PublicMapSettings
  publicMembers: PublicMember[]
  publicProfile: PublicProfileContent
  publicServiceCards: PublicServiceCard[]
  setPage: (page: Page) => void
  updatePublicMapSettings: (settings: PublicMapSettings, imageFile?: File | null) => Promise<void>
  updatePublicFaqs: (faqs: PublicFaqItem[]) => Promise<void>
  updatePublicProfileContent: (payload: {
    members: PublicMember[]
    profile: PublicProfileContent
    serviceCards: PublicServiceCard[]
  }) => Promise<void>
  updateCustomer: (customer: Customer) => void
  selectedOfficerId: string | null
  setSelectedOfficerId: (officerId: string) => void
}) {
  switch (page) {
    case 'dashboard':
      return <DashboardPage setPage={setPage} />
    case 'customers':
      return <CustomersPage customers={customers} notify={notify} onAddCustomer={addCustomer} onDeleteCustomer={deleteCustomer} onUpdateCustomer={updateCustomer} setPage={setPage} />
    case 'customer-detail':
      return <CustomerDetailPage setPage={setPage} />
    case 'officers':
      return <OfficersPage officers={officers} onAddOfficer={addOfficer} onSelectOfficer={setSelectedOfficerId} setPage={setPage} />
    case 'officer-detail':
      return <OfficerDetailPage officer={officers.find((officer) => officer.id === selectedOfficerId) ?? officers[0]} setPage={setPage} />
    case 'receipts':
      return <ReceiptsPage notify={notify} setPage={setPage} />
    case 'receipt-bulk':
      return <ReceiptBulkPage notify={notify} setPage={setPage} />
    case 'verification':
      return <VerificationPage notify={notify} setPage={setPage} />
    case 'deposit-detail':
      return <DepositDetailPage notify={notify} setPage={setPage} />
    case 'cash':
      return <CashPage notify={notify} />
    case 'expenses':
      return <ExpensesPage notify={notify} />
    case 'map-settings':
      return <PublicMapSettingsPage mapSettings={publicMapSettings} notify={notify} onSave={updatePublicMapSettings} setPage={setPage} />
    case 'transparency':
      return <TransparencyPage setPage={setPage} />
    case 'dusun-detail':
      return <DusunDetailPage setPage={setPage} />
    case 'rt-detail':
      return <RtDetailPage setPage={setPage} />
    case 'reports':
      return <ReportsPage notify={notify} setPage={setPage} />
    case 'report-print':
      return <ReportPrintPage notify={notify} setPage={setPage} />
    case 'system-settings':
      return <SystemSettingsPage notify={notify} />
    case 'pamsimas-profile':
      return (
        <PamsimasProfilePage
          faqs={publicFaqs}
          members={publicMembers}
          notify={notify}
          onSaveFaqs={updatePublicFaqs}
          onSave={updatePublicProfileContent}
          profile={publicProfile}
          serviceCards={publicServiceCards}
        />
      )
    case 'admin-account':
      return <AdminAccountPage notify={notify} />
    case 'admin-help':
      return <AdminHelpPage />
    default:
      return <DashboardPage setPage={setPage} />
  }
}

function renderFieldPage({
  customers,
  customersLoaded,
  dashboardSummary,
  deposits,
  onError,
  page,
  profile,
  selectedCustomerId,
  setPage,
  setPaymentCustomerId,
  setSelectedCustomerId,
  syncAdminCustomerFromField,
  updateCustomers,
  updateDeposits,
}: {
  customers: FieldCustomer[]
  customersLoaded: boolean
  dashboardSummary: FieldDashboardSummary | null
  deposits: FieldDeposit[]
  onError: (error: unknown) => void
  page: Page
  profile: typeof fieldProfileSeed
  selectedCustomerId: string
  setPage: (page: Page) => void
  setPaymentCustomerId: (customerId: string | null) => void
  setSelectedCustomerId: (customerId: string) => void
  syncAdminCustomerFromField: (customer: FieldCustomer) => void
  updateCustomers: Dispatch<SetStateAction<FieldCustomer[]>>
  updateDeposits: Dispatch<SetStateAction<FieldDeposit[]>>
}) {
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0]

  switch (page) {
    case 'field-dashboard':
      return <FieldDashboardPage customers={customers} setPage={setPage} summary={dashboardSummary} />
    case 'field-customers':
      return <FieldCustomersPage customers={customers} onSelectCustomer={setSelectedCustomerId} setPage={setPage} />
    case 'field-customer-detail':
      return selectedCustomer
        ? <FieldCustomerDetailPage customer={selectedCustomer} onPay={(customer) => setPaymentCustomerId(customer.id)} setPage={setPage} />
        : <FieldCustomersPage customers={customers} onSelectCustomer={setSelectedCustomerId} setPage={setPage} />
    case 'field-meter':
      return (
        <FieldMeterPage
          activePeriod={dashboardSummary?.period}
          billing={dashboardSummary ? { adminFee: dashboardSummary.adminFee, waterRate: dashboardSummary.waterRate } : null}
          customers={customers}
          isLoading={!customersLoaded}
          onSaveMeter={(customerId, previousMeter, currentMeter, billAmount, meterSubmittedAt, billingPeriod) =>
            apiService.field.saveMeter(customerId, previousMeter, currentMeter, billAmount, meterSubmittedAt, billingPeriod).then((savedCustomer) => {
              updateCustomers((currentCustomers) => currentCustomers.map((customer) => customer.id === savedCustomer.id ? savedCustomer : customer))
              syncAdminCustomerFromField(savedCustomer)
            }).catch((error: unknown) => {
              onError(error)
              throw error
            })
          }
          selectedCustomerId={selectedCustomerId}
          setPage={setPage}
        />
      )
    case 'field-payments':
      return <FieldPaymentsPage
        activePeriod={dashboardSummary?.period}
        billing={dashboardSummary ? { dueDay: dashboardSummary.dueDay, lateFee: dashboardSummary.lateFee } : null}
        customers={customers}
        onEditPaymentProof={(customerId, proof, paymentId) => apiService.field.updatePaymentProof(customerId, proof, paymentId).then((savedCustomer) => {
          updateCustomers((current) => current.map((customer) => customer.id === savedCustomer.id ? savedCustomer : customer))
          syncAdminCustomerFromField(savedCustomer)
        }).catch((error: unknown) => { onError(error); throw error })}
        onPayCustomer={(customerId, method, proof, billId) => apiService.field.payCustomer(customerId, method, proof, billId).then((savedCustomer) => {
          updateCustomers((current) => current.map((customer) => customer.id === savedCustomer.id ? savedCustomer : customer))
          syncAdminCustomerFromField(savedCustomer)
        }).catch((error: unknown) => { onError(error); throw error })}
        onSelectMeterCustomer={setSelectedCustomerId}
        setPage={setPage}
      />
    case 'field-deposits':
      return <FieldDepositsPage
        customers={customers}
        deposits={deposits}
        onCreateDeposit={(deposit, customerIds) => {
          const depositedCustomers = customers.filter((customer) => customerIds.includes(customer.id))
          return apiService.field.createDeposit(deposit, depositedCustomers).then((savedDeposit) => {
            updateDeposits((current) => [savedDeposit, ...current])
            updateCustomers((current) => current.map((customer) => customerIds.includes(customer.id) ? { ...customer, depositStatus: 'Menunggu Verifikasi' } : customer))
          }).catch((error: unknown) => { onError(error); throw error })
        }}
      />
    case 'field-profile':
      return <FieldProfilePage profile={profile} />
    case 'field-help':
      return <FieldHelpPage />
    default:
      return <FieldDashboardPage customers={customers} setPage={setPage} summary={dashboardSummary} />
  }
}

function loadStoredFieldCustomers() {
  try {
    const stored = window.localStorage.getItem('pamsimas.mock.field.customers.v1')
    return stored ? JSON.parse(stored) as FieldCustomer[] : fieldCustomersSeed
  } catch {
    return fieldCustomersSeed
  }
}

function persistFieldCustomers(customers: FieldCustomer[]) {
  window.localStorage.setItem('pamsimas.mock.field.customers.v1', JSON.stringify(customers))
}

function loadStoredFieldDeposits() {
  try {
    const stored = window.localStorage.getItem('pamsimas.mock.field.deposits.v1')
    return stored ? JSON.parse(stored) as FieldDeposit[] : []
  } catch {
    return []
  }
}

function persistFieldDeposits(deposits: FieldDeposit[]) {
  window.localStorage.setItem('pamsimas.mock.field.deposits.v1', JSON.stringify(deposits))
}

export default App
