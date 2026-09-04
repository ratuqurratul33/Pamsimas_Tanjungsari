import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '../../../components/Icon'
import heroImage from '../../../assets/pamsimas-water-forest.jpg'
import type { Customer } from '../../../types'
import { getPublicTransparency } from '../../../app/services/transparencyRepository'
import { appEnvironment } from '../../../app/config/environment'
import { subscribeToRealtimeUpdates } from '../../../app/services/realtimeService'
import type { RegionMonthlyStat } from '../../../utils/regionStats'
import {
  defaultPublicMapSettings,
  defaultPublicMembers,
  defaultPublicProfile,
  defaultPublicServiceCards,
  publicFaq,
  type PublicMember,
  type PublicMapSettings,
  type PublicProfileContent,
  type PublicServiceCard,
} from '../data/publicData'
import '../styles/public.css'
import { PublicMapGuideSection } from '../components/PublicMapGuideSection'
import { PublicProfileSection } from '../components/PublicProfileSection'
import { PublicFooterSection } from '../components/PublicFooterSection'

type PublicLandingPageProps = {
  customers?: Customer[]
  expenses?: string[][]
  faqs?: Array<{ answer: string; id: string; question: string }>
  mapSettings?: PublicMapSettings
  members?: PublicMember[]
  profile?: PublicProfileContent
  serviceCards?: PublicServiceCard[]
  summary?: { activeCustomers: number; overduePercentage: number; servedAreas: string[] }
}

const navItems = [
  { id: 'beranda', label: 'Beranda' },
  { id: 'peta-air', label: 'Jalur Air' },
  { id: 'pemasukan', label: 'Pemasukan' },
  { id: 'pengeluaran', label: 'Pengeluaran' },
  { id: 'tentang-kami', label: 'Profil' },
  { id: 'faq', label: 'FAQ' },
]

type PublicNavSection = typeof navItems[number]['id']

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export function PublicLandingPage({
  customers = [],
  faqs = publicFaq.flatMap((group) => group.items).map((faq, index) => ({ ...faq, id: `default-${index + 1}` })),
  mapSettings = defaultPublicMapSettings,
  members = defaultPublicMembers,
  profile = defaultPublicProfile,
  serviceCards = defaultPublicServiceCards,
  summary,
}: PublicLandingPageProps) {
  const today = new Date()
  const defaultMonth = monthNames[today.getMonth()]
  const defaultYear = String(today.getFullYear())
  const [activeSection, setActiveSection] = useState('beranda')
  const [isAtTop, setIsAtTop] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [incomeMonth, setIncomeMonth] = useState(defaultMonth)
  const [incomeYear, setIncomeYear] = useState(defaultYear)
  const [expenseMonth, setExpenseMonth] = useState(defaultMonth)
  const [expenseYear, setExpenseYear] = useState(defaultYear)
  const [incomeRows, setIncomeRows] = useState<RegionMonthlyStat[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<string[][]>([])
  const [openFaq, setOpenFaq] = useState<string | null>(faqs[0]?.question ?? null)
  const [refreshRevision, setRefreshRevision] = useState(0)
  const isClickScrollingRef = useRef(false)
  const clickScrollTimeoutRef = useRef<number | undefined>(undefined)

  const activeCustomers = useMemo(() => customers.filter((customer) => customer.status !== 'Nonaktif'), [customers])
  const overdueCustomers = useMemo(() => activeCustomers.filter((customer) => customer.status === 'Menunggak'), [activeCustomers])
  const fallbackServedAreas = useMemo(() => {
    const dusunNames = Array.from(new Set(activeCustomers.map((customer) => extractDusun(customer.area)).filter(Boolean))).sort()

    return dusunNames.length > 0 ? dusunNames.join(', ') : mapSettings.coverage
  }, [activeCustomers, mapSettings.coverage])
  const activeCustomerCount = summary?.activeCustomers ?? activeCustomers.length
  const servedAreas = summary
    ? (summary.servedAreas.length ? summary.servedAreas.join(', ') : 'Belum ada wilayah terlayani')
    : fallbackServedAreas
  const overduePercentage = summary?.overduePercentage ?? (activeCustomers.length > 0 ? Math.round((overdueCustomers.length / activeCustomers.length) * 100) : 0)
  const statCards = [
    { icon: 'team', label: 'Total Pelanggan', note: 'Pelanggan aktif dari data admin', value: String(activeCustomerCount) },
    { icon: 'map', label: 'Wilayah Terlayani', note: 'Wilayah aktif layanan air', value: servedAreas },
    { icon: 'money', label: 'Persentase Tunggakan', note: 'Tingkat tunggakan iuran', value: `${overduePercentage}%` },
  ]
  const isCurrentIncomePeriod = incomeMonth === defaultMonth && incomeYear === defaultYear
  const expenseTotal = useMemo(() => filteredExpenses.reduce((total, expense) => total + parseRupiah(expense[7] ?? expense[6] ?? ''), 0), [filteredExpenses])
  const activeNavId = activeSection
  const isTransparentNav = isAtTop && !isMenuOpen
  const whatsappNumber = normalizeWhatsappNumber(mapSettings.contactWhatsapp)
  const fieldOfficerWhatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

  useEffect(() => {
    const month = String(monthNames.indexOf(incomeMonth) + 1).padStart(2, '0')
    void getPublicTransparency(month, incomeYear).then((data) => setIncomeRows(data.rows)).catch(() => setIncomeRows([]))
  }, [incomeMonth, incomeYear, refreshRevision])

  useEffect(() => {
    const month = String(monthNames.indexOf(expenseMonth) + 1).padStart(2, '0')
    void getPublicTransparency(month, expenseYear).then((data) => {
      setFilteredExpenses(data.expenses.map((expense) => [
        formatPublicExpenseDate(expense.expense_date),
        expense.category,
        'Kas PAMSIMAS',
        expense.description,
        '1',
        'transaksi',
        formatRupiah(expense.amount),
        formatRupiah(expense.amount),
      ]))
    }).catch(() => setFilteredExpenses([]))
  }, [expenseMonth, expenseYear, refreshRevision])

  useEffect(() => {
    const requestRefresh = () => setRefreshRevision((revision) => revision + 1)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') requestRefresh()
    }
    const refreshTimer = appEnvironment.useMockApi ? window.setInterval(requestRefresh, 5000) : undefined
    const unsubscribeRealtime = subscribeToRealtimeUpdates(
      ['finance', 'public-content', 'public-summary', 'public-transparency'],
      requestRefresh,
    )

    window.addEventListener('focus', refreshWhenVisible)
    window.addEventListener('storage', requestRefresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      if (refreshTimer) window.clearInterval(refreshTimer)
      unsubscribeRealtime()
      window.removeEventListener('focus', refreshWhenVisible)
      window.removeEventListener('storage', requestRefresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsAtTop(window.scrollY <= 4)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const sectionIds = navItems.map((item) => item.id)
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)

    const latestRatios = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          latestRatios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        })

        if (isClickScrollingRef.current) {
          return
        }

        let winnerId: string | undefined
        let winnerRatio = 0

        sectionIds.forEach((id) => {
          const ratio = latestRatios.get(id) ?? 0
          if (ratio > winnerRatio) {
            winnerRatio = ratio
            winnerId = id
          }
        })

        if (winnerId) {
          setActiveSection(winnerId)
        }
      },
      { rootMargin: '-22% 0px -58% 0px', threshold: [0, 0.12, 0.28, 0.46] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const routeSectionMap: Record<string, string> = {
      '/website/public/faq': 'faq',
      '/website/public/peta-air': 'peta-air',
      '/website/public/tentang': 'tentang-kami',
      '/website/public/transparansi': 'pemasukan',
    }
    const requestedSection = window.location.hash.replace(/^#/, '') || routeSectionMap[window.location.pathname]
    const sectionId = navItems.some((item) => item.id === requestedSection)
      ? requestedSection as PublicNavSection
      : undefined

    if (sectionId) {
      // Set the active menu immediately so a direct URL such as /website/public#faq
      // does not briefly show Beranda as selected while the smooth scroll runs.
      setActiveSection(sectionId)
      window.setTimeout(() => scrollTo(sectionId), 180)
    }
  }, [])

  useEffect(() => {
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('.public-reveal'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('public-reveal-visible')
          } else {
            entry.target.classList.remove('public-reveal-visible')
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.16 },
    )

    revealNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  function scrollTo(id: string) {
    setIsMenuOpen(false)
    const element = document.getElementById(id)

    if (element) {
      setActiveSection(id)
      isClickScrollingRef.current = true
      window.clearTimeout(clickScrollTimeoutRef.current)
      clickScrollTimeoutRef.current = window.setTimeout(() => {
        isClickScrollingRef.current = false
      }, 900)

      const targetTop = element.getBoundingClientRect().top + window.scrollY - 86
      window.scrollTo({ behavior: 'smooth', top: targetTop })
      window.history.replaceState(null, '', id === 'beranda' ? '/website/public' : `/website/public#${id}`)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(0,112,168,0.10),transparent_30rem),radial-gradient(circle_at_88%_20%,rgba(10,156,168,0.075),transparent_32rem),radial-gradient(circle_at_16%_56%,rgba(14,165,233,0.08),transparent_34rem),radial-gradient(circle_at_86%_78%,rgba(10,156,168,0.055),transparent_34rem),linear-gradient(180deg,#f7fcff_0%,#eef8ff_15%,#ffffff_32%,#f5fbff_50%,#edf8ff_68%,#ffffff_86%,#f8fcff_100%)] font-sans text-slate-700 selection:bg-sky-200">
      <nav
        className={`fixed left-0 right-0 top-0 z-50 rounded-b-2xl transition-all duration-500 ${isTransparentNav
          ? 'border-b border-white/10 bg-gradient-to-r from-[#003f66]/34 via-[#0070A8]/28 to-[#0A9CA8]/18 text-white shadow-none backdrop-blur-xl'
          : 'border-b border-sky-100/80 bg-white/92 text-[#0070A8] shadow-[0_14px_36px_rgba(0,112,168,0.12)] backdrop-blur-xl'
          }`}
      >
        <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button className="flex items-center gap-3 text-left" onClick={() => scrollTo('beranda')} type="button">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm transition-all duration-500 ${isTransparentNav ? 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur' : 'bg-gradient-to-br from-[#0070A8] to-[#0A9CA8] text-white ring-1 ring-sky-100'}`}>
              <Icon name="drop" />
            </span>
            <span className="leading-none">
              <span className={`block text-lg font-black tracking-tight transition-colors duration-500 sm:text-xl ${isTransparentNav ? 'text-white' : 'text-[#0070A8]'}`}>PAMSIMAS</span>
              <span className={`block text-[11px] font-bold uppercase tracking-[0.16em] transition-colors duration-500 ${isTransparentNav ? 'text-white/75' : 'text-sky-700/70'}`}>Tanjungsari</span>
            </span>
          </button>

          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all duration-300 hover:-translate-y-0.5 ${activeNavId === item.id
                  ? isTransparentNav
                    ? 'bg-white/90 text-[#0070A8] shadow-sm shadow-white/20'
                    : 'bg-[#0070A8] text-white shadow-sm shadow-sky-700/18'
                  : isTransparentNav
                    ? 'text-white/72 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] hover:bg-white/12 hover:text-white'
                    : 'text-sky-800/70 hover:bg-sky-50 hover:text-[#0070A8]'
                  }`}
                key={item.id}
                onClick={() => scrollTo(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 md:hidden ${isTransparentNav ? 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur' : 'bg-[#0070A8] text-white ring-1 ring-sky-100'}`}
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>

        {isMenuOpen && (
          <div className="mx-4 mb-4 grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg md:hidden">
            {navItems.map((item) => (
              <button
                className={`rounded-xl px-4 py-3 text-left text-sm font-extrabold ${activeNavId === item.id ? 'bg-[#0070A8] text-white' : 'text-slate-600 hover:bg-sky-50'
                  }`}
                key={item.id}
                onClick={() => scrollTo(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <main className="w-full max-w-full overflow-x-hidden">
        <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 pb-56 pt-28 text-center sm:px-6 sm:pt-32 lg:px-8" id="beranda">
          <img alt="Sungai jernih di hutan hijau" className="public-hero-zoom absolute inset-0 h-full w-full object-cover" src={heroImage} />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/18 via-sky-950/10 to-slate-950/52" />
          <div className="absolute inset-0 bg-white/12" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(255,255,255,0.16),rgba(14,165,233,0.08)_34%,rgba(10,156,168,0.035)_62%,transparent_78%)]" />
          <div className="pointer-events-none absolute -left-40 -top-40 z-[1] h-[500px] w-[500px] rounded-full bg-[#0070A8]/15 blur-[100px]" />
          <div className="pointer-events-none absolute -right-20 top-10 z-[1] h-[400px] w-[400px] rounded-full bg-teal-400/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 z-[1] h-[300px] w-[300px] rounded-full bg-sky-300/20 blur-[100px]" />

          <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-6">
            <h1 className="hero-copy hero-copy-1 max-w-5xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_26px_56px_rgba(0,0,0,0.68)]">
              {/* Tambahkan text-3xl sm:text-5xl md:text-6xl di span ini */}
              <span className="hero-title-ink block text-3xl sm:text-5xl md:text-6xl">
                Layanan Air Bersih Rumah Tangga
              </span>

              {/* Baris PAMSIMAS menggunakan ukuran sedang */}
              <span className="hero-title-brand block text-2xl sm:text-4xl md:text-5xl bg-gradient-to-r from-white via-sky-100 to-sky-300 bg-clip-text text-transparent mt-1">
                PAMSIMAS Desa Tanjung Sari
              </span>
            </h1>
            <p className="hero-copy hero-copy-2 max-w-3xl text-base font-semibold leading-relaxed text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.45)] md:text-xl">
              Lihatlah jaringan air, status iuran, pengeluaran operasional, dan informasi pengurus dalam satu ruang publik yang tenang dan mudah dibaca.
            </p>
            <div className="hero-copy hero-copy-3 mt-2 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              {fieldOfficerWhatsappUrl && (
                <a className="rounded-full bg-[#0070A8] px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-sky-700/25 transition-all duration-300 hover:-translate-y-1.5 hover:bg-[#0A9CA8] hover:shadow-2xl hover:shadow-sky-700/25" href={fieldOfficerWhatsappUrl} rel="noreferrer" target="_blank">
                  Daftar Layanan Sekarang
                </a>
              )}
              <button className="rounded-full border border-white/30 bg-white/15 px-7 py-3.5 text-sm font-black text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/25" onClick={() => scrollTo('peta-air')} type="button">
                Lihat Peta Air
              </button>
            </div>
          </div>

          <div className="hero-wave-ellipse" aria-hidden="true" />
        </section>

        <section className="relative z-20 -mt-36 bg-transparent pb-16">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {statCards.map((stat, index) => (
                <article
                  className="glass-card stat-load group cursor-pointer rounded-[1.25rem] p-3 shadow-glass-glow transition-all duration-500 hover:-translate-y-1.5 hover:shadow-card-elevated active:scale-95 sm:p-3.5"
                  key={stat.label}
                  tabIndex={0}
                  style={{ animationDelay: `${1280 + index * 220}ms` }}
                >
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm text-[#0070A8] transition-transform duration-300 group-hover:scale-110 group-hover:bg-cyan-50 group-hover:text-[#0A9CA8]">
                      <Icon name={stat.icon} />
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[0.11em] text-slate-400">{stat.label}</p>
                  </div>
                  <strong className={`block min-h-6 font-black leading-tight text-[#0070A8] ${stat.label === 'Persentase Tunggakan' ? 'text-base sm:text-lg' : 'text-base sm:text-lg md:text-xl'}`}>{stat.value}</strong>
                  <span className="mt-1.5 block text-[11px] font-semibold leading-relaxed text-slate-500 sm:text-xs">{stat.note}</span>
                  {stat.label === 'Persentase Tunggakan' && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="animated-progress h-full rounded-full bg-gradient-to-r from-[#0070A8] to-[#0A9CA8]" style={{ '--target-width': `${overduePercentage}%` } as CSSProperties} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="relative overflow-hidden border-t border-sky-100/80 bg-[radial-gradient(circle_at_8%_18%,rgba(10,156,168,0.12),transparent_28rem),radial-gradient(circle_at_92%_34%,rgba(0,112,168,0.13),transparent_32rem),radial-gradient(circle_at_16%_72%,rgba(45,212,191,0.10),transparent_30rem),linear-gradient(180deg,#ffffff_0%,rgba(240,253,250,0.58)_30%,rgba(240,249,255,0.72)_62%,rgba(255,255,255,0.92)_100%)] pt-6">
          <div className="pointer-events-none relative z-10 mx-auto h-px w-4/5 max-w-4xl bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" aria-hidden="true" />
          <div className="pointer-events-none absolute left-[-10rem] top-20 h-[38rem] w-[38rem] animate-ambient-drift rounded-full bg-[#0070A8]/25 blur-[130px]" />
          <div className="pointer-events-none absolute right-[-8rem] top-[28rem] h-[35rem] w-[35rem] animate-ambient-drift rounded-full bg-teal-400/30 blur-[130px] [animation-delay:1.8s]" />
          <div className="pointer-events-none absolute left-[15%] top-[60rem] h-[30rem] w-[30rem] animate-ambient-drift rounded-full bg-sky-400/28 blur-[120px] [animation-delay:3.2s]" />
          <div className="pointer-events-none absolute right-[8%] bottom-24 h-[34rem] w-[34rem] animate-ambient-drift rounded-full bg-[#0070A8]/18 blur-[140px] [animation-delay:4.4s]" />
          <PublicMapGuideSection mapSettings={mapSettings} />

          <section className="public-section-flow public-section-income relative mx-auto w-full max-w-7xl overflow-hidden px-4 py-24 sm:px-6 lg:px-8" id="pemasukan">
            <SectionHeader
              title={`Pemasukan PAMSIMAS Bulan ${incomeMonth} ${incomeYear}`}
              text="Ringkasan ini membantu warga melihat partisipasi pembayaran per dusun tanpa perlu membaca tabel panjang."
            />
            <div className="glass-panel public-reveal mt-8 rounded-[2rem] p-5 shadow-card-elevated sm:p-7">
              <p className="mb-2 text-xs font-semibold text-slate-400">Statistik dusun mengikuti data pelanggan aktif terkini (sama dengan data Admin).</p>
              <PeriodFilter month={incomeMonth} onMonthChange={setIncomeMonth} onYearChange={setIncomeYear} year={incomeYear} />
              {isCurrentIncomePeriod && (
                <p className="transparency-live-note public-transparency-period-note">
                  Data {incomeMonth} {incomeYear} belum final. Persentase terus dihitung otomatis sampai akhir bulan dari status pembayaran pelanggan yang telah diverifikasi Admin.
                </p>
              )}
              <div className="mt-8 grid gap-7">
                {incomeRows.length === 0 && (
                  <div className="public-empty-period">
                    Belum ada informasi transparansi untuk periode {incomeMonth} {incomeYear}.
                  </div>
                )}
                {incomeRows.map((row, index) => (
                  <div className="glass-card public-reveal rounded-2xl p-5 transition-all duration-300 hover:scale-[1.015] hover:bg-white/60 hover:shadow-card-elevated" key={row.name} style={{ transitionDelay: `${index * 80}ms` }}>
                    <div className="mb-4 flex items-end justify-between gap-5">
                      <div>
                        <h3 className="text-xl font-black text-[#0070A8]">{row.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{row.paid} dari {row.total} pelanggan sudah membayar</p>
                      </div>
                      <strong className="text-3xl font-black text-[#0070A8]">{row.progress}%</strong>
                    </div>
                    <div className="h-5 overflow-hidden rounded-full bg-white shadow-inner">
                      <div
                        className="animated-progress h-full rounded-full shadow-[0_0_26px_rgba(14,165,233,0.20)]"
                        style={{ '--target-width': `${row.progress}%`, ...getProgressSpectrumStyle(row.progress) } as CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="public-section-flow public-section-expense relative overflow-hidden">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_3fr] lg:px-8" id="pengeluaran">
              <aside className="public-reveal lg:sticky lg:top-28 lg:self-start">
                <div className="glass-panel public-expense-summary-card rounded-[2rem] p-6 shadow-card-elevated transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-glow sm:p-7">
                  <h2 className="public-gradient-heading text-3xl font-black leading-tight tracking-tight md:text-4xl">Pengeluaran PAMSIMAS Bulan {expenseMonth} {expenseYear}</h2>
                  <p className="mt-4 text-base font-semibold leading-relaxed text-slate-500">Filter periode dan lihat total pengeluaran operasional bulan aktif.</p>
                  <PeriodFilter month={expenseMonth} onMonthChange={setExpenseMonth} onYearChange={setExpenseYear} year={expenseYear} />
                  <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#0070A8] via-sky-700 to-[#0A9CA8] p-6 text-white shadow-lg shadow-sky-700/20 transition-all duration-300 hover:scale-[1.025] hover:shadow-2xl hover:shadow-sky-700/25">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/70">Total Pengeluaran</p>
                    <strong className="mt-2 block text-3xl font-black sm:text-4xl">{formatRupiah(expenseTotal)}</strong>
                    <span className="mt-3 block text-sm font-semibold text-white/78">{filteredExpenses.length} transaksi pada periode aktif</span>
                  </div>
                </div>
              </aside>

              <div className="glass-panel public-reveal public-expense-card overflow-hidden rounded-[2rem] shadow-card-elevated">
                <div className="flex flex-col gap-2 border-b border-sky-50 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Data Pengeluaran</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Catatan operasional yang tampil di publik.</p>
                  </div>
                  <span className="w-max rounded-full bg-sky-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#0070A8]">Scroll vertikal</span>
                </div>
                <div className="public-expense-table-wrap">
                  <table className="expense-clean-table w-full">
                    <thead>
                      <tr>
                        <th className="w-[140px]">Tanggal</th>
                        <th className="min-w-[300px]">Keterangan</th>
                        <th className="w-[150px]">Kategori</th>
                        <th className="w-[160px] text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length > 0 ? (
                        filteredExpenses.map((expense, index) => (
                          <tr className="transition-all duration-200 hover:scale-[1.006] hover:bg-sky-50/70 hover:shadow-[0_12px_30px_rgba(0,112,168,0.10)]" key={`${expense[0]}-${expense[3]}-${index}`}>
                            <td className="font-bold text-slate-500">{expense[0]}</td>
                            <td>
                              <p className="font-black text-slate-800">{expense[3] ?? expense[1]}</p>
                            </td>
                            <td>
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">{expense[1] ?? 'Operasional'}</span>
                            </td>
                            <td className="text-right font-black text-rose-500">{expense[7] ?? expense[6]}</td>
                          </tr>
                        ))
                       ) : (
                         <tr>
                           <td className="text-center font-semibold text-slate-500" colSpan={4}>Belum ada data pengeluaran untuk periode {expenseMonth} {expenseYear}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-500">
                    Menampilkan {filteredExpenses.length} data pengeluaran pada periode aktif
                  </p>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Scroll tabel</span>
                </div>
              </div>
            </div>
          </section>

          <PublicProfileSection members={members} profile={profile} serviceCards={serviceCards} />

          <section className="public-section-flow public-section-faq relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-24 sm:px-6 lg:px-8" id="faq">
            <div className="public-reveal max-w-4xl">
              <h2 className="public-gradient-heading text-4xl font-black tracking-tight md:text-6xl">FAQ</h2>
              <p className="mt-5 text-base font-semibold leading-relaxed text-slate-600 md:text-lg">
                Pertanyaan umum seputar layanan air, pembayaran, pemasangan baru, dan pelaporan gangguan PAMSIMAS Desa Tanjung Sari.
              </p>
            </div>
            <div className="public-faq-list public-reveal mt-10">
              {faqs.length === 0 && (
                <p className="rounded-3xl border border-sky-100 bg-white/80 px-6 py-8 text-sm font-semibold text-slate-500">
                  Belum ada FAQ yang dipublikasikan oleh admin.
                </p>
              )}
              {faqs.map((faq, index) => {
                const isOpen = openFaq === faq.question

                return (
                  <button
                    className={isOpen ? 'open' : ''}
                    key={faq.question}
                    onClick={() => setOpenFaq(isOpen ? null : faq.question)}
                    style={{ transitionDelay: `${index * 70}ms` }}
                    type="button"
                  >
                    <b>{faq.question}</b>
                    <strong>+</strong>
                    <i>{faq.answer}</i>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      <PublicFooterSection onMapClick={() => scrollTo('peta-air')} onTransparencyClick={() => scrollTo('pemasukan')} profile={profile} />
      {fieldOfficerWhatsappUrl && (
        <a className="public-wa-float" href={fieldOfficerWhatsappUrl} rel="noreferrer" target="_blank" aria-label="Hubungi PAMSIMAS lewat WhatsApp">
          <Icon name="whatsapp" />
        </a>
      )}
    </div>
  )
}

function SectionHeader({ text, title }: { text: string; title: string }) {
  return (
    <div className="public-reveal max-w-4xl">
      <h2 className="public-gradient-heading text-4xl font-black tracking-tight md:text-6xl">{title}</h2>
      <p className="mt-5 text-base font-semibold leading-relaxed text-slate-600 md:text-lg">{text}</p>
    </div>
  )
}

function PeriodFilter({
  month,
  onMonthChange,
  onYearChange,
  year,
}: {
  month: string
  onMonthChange: (month: string) => void
  onYearChange: (year: string) => void
  year: string
}) {
  const years = ['2026', '2025', '2024']

  return (
    <div className="public-period-filter glass-panel public-reveal mt-6">
      <label className="public-period-field">
        <span>Bulan</span>
        <select onChange={(event) => onMonthChange(event.target.value)} value={month}>
          {monthNames.map((monthName) => <option key={monthName}>{monthName}</option>)}
        </select>
      </label>
      <label className="public-period-field">
        <span>Tahun</span>
        <select onChange={(event) => onYearChange(event.target.value)} value={year}>
          {years.map((yearValue) => <option key={yearValue}>{yearValue}</option>)}
        </select>
      </label>
    </div>
  )
}


function extractDusun(area: string) {
  return area.split('/')[0]?.trim() ?? ''
}

function parseRupiah(value: string) {
  return Number(value.replace(/[^\d]/g, '')) || 0
}

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString('id-ID')}`
}

function formatPublicExpenseDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(value))
}

const PROGRESS_SPECTRUM = 'linear-gradient(90deg, #ef4444 0%, #eab308 33%, #f97316 66%, #0070A8 100%)'

function getProgressSpectrumStyle(progress: number): CSSProperties {
  const clamped = Math.min(Math.max(progress, 1), 100)

  return {
    backgroundImage: PROGRESS_SPECTRUM,
    backgroundPosition: '0 0',
    backgroundSize: `${(100 / clamped) * 100}% 100%`,
  }
}

function normalizeWhatsappNumber(value: string) {
  const digits = value.replace(/[^\d]/g, '')

  if (digits.startsWith('62')) {
    return digits
  }

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`
  }

  return digits
}
