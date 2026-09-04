import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { getPublicTransparency, type PublicExpenseRow } from '../../../app/services/transparencyRepository'
import type { RegionMonthlyStat } from '../../../utils/regionStats'
import type { PublicMapSettings } from '../data/publicData'
import { organizationMembers, publicFaq, publicStats } from '../data/publicData'
import { scrollToPublicSection } from '../hooks/usePublicScrollSpy'
import { WaterNetworkMap } from '../components/WaterNetworkMap'

type PublicHomePageProps = {
  mapSettings: PublicMapSettings
}

const profilePoints = [
  { icon: 'drop', title: 'Air Bersih Terjaga', text: 'Layanan air dikelola berbasis warga agar distribusi lebih dekat dengan kebutuhan desa.' },
  { icon: 'money', title: 'Iuran Lebih Transparan', text: 'Ringkasan pembayaran dan pengeluaran dapat dipantau warga pada periode berjalan.' },
  { icon: 'shield', title: 'Operasional Tercatat', text: 'Petugas mencatat meter, pembayaran, dan setoran agar riwayat layanan tetap rapi.' },
]

export function PublicHomePage({ mapSettings }: PublicHomePageProps) {
  const faqs = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('pamsimas.mock.system.faqs.v1')
      return stored ? JSON.parse(stored) as Array<{ answer: string; question: string }> : publicFaq.flatMap((group) => group.items)
    } catch {
      return publicFaq.flatMap((group) => group.items)
    }
  }, [])
  const [openFaq, setOpenFaq] = useState(faqs[0]?.question ?? '')
  const now = new Date()
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const currentMonth = monthNames[now.getMonth()]
  const currentMonthNumber = now.getMonth() + 1
  const currentYear = String(now.getFullYear())
  const [transparencyRows, setTransparencyRows] = useState<RegionMonthlyStat[]>([])
  const [recentExpenses, setRecentExpenses] = useState<PublicExpenseRow[]>([])

  useEffect(() => {
    const month = String(currentMonthNumber).padStart(2, '0')
    void getPublicTransparency(month, currentYear).then((data) => {
      setTransparencyRows(data.rows)
      setRecentExpenses(data.expenses)
    }).catch(() => {
      setTransparencyRows([])
      setRecentExpenses([])
    })
  }, [currentMonthNumber, currentYear])

  useEffect(() => {
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('.pub-reveal'))

    if (revealNodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('pub-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.16 },
    )

    revealNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="public-spa">
      <section className="public-hero-spa public-section" id="home">
        <div className="public-hero-media" />
        <div className="public-hero-overlay" />
        <div className="public-hero-content">
          <h1>Air Bersih untuk Setiap Rumah Tangga</h1>
          <p>Sistem informasi PAMSIMAS Desa Tanjungsari untuk peta jaringan, transparansi kas, dan layanan warga yang lebih mudah dipantau.</p>
          <div className="public-hero-actions">
            <button className="public-primary-button" onClick={() => scrollToPublicSection('map')} type="button">
              <Icon name="map" />
              Lihat Peta Air
            </button>
            <button className="public-secondary-button" onClick={() => scrollToPublicSection('transparency')} type="button">
              <Icon name="chart" />
              Cek Transparansi
            </button>
          </div>
        </div>
        <div className="public-wave" aria-hidden="true" />
      </section>

      <section className="public-section public-stats-band">
        <div className="public-section-inner public-stat-grid-spa">
          {publicStats.map((stat, index) => (
            <article className="public-card elevated-card pub-reveal stagger-item" key={stat.label} style={{ transitionDelay: `${index * 90}ms` }}>
              <span className="public-card-icon"><Icon name={stat.icon} /></span>
              <small>{stat.label}</small>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section public-map-section" id="map">
        <div className="public-section-inner public-map-grid">
          <div className="public-section-copy pub-reveal">
            <h2>{mapSettings.title}</h2>
            <p>{mapSettings.description}</p>
            <div className="public-map-meta">
              <span><Icon name="map" />{mapSettings.coverage}</span>
            </div>
          </div>
          <div className="public-map-card elevated-card pub-reveal">
            <WaterNetworkMap settings={mapSettings} />
          </div>
        </div>
      </section>

      <section className="public-section public-transparency-section" id="transparency">
        <div className="public-section-inner">
          <div className="public-section-title pub-reveal">
            <h2>Transparansi Publik</h2>
            <p>Ringkasan pembayaran dan pengeluaran operasional PAMSIMAS periode {currentMonth} {currentYear}.</p>
            <p className="transparency-live-note">Data bulan berjalan belum final dan terus dihitung otomatis sampai akhir bulan berdasarkan pembayaran yang telah diverifikasi Admin.</p>
          </div>
          <div className="public-transparency-grid">
            <article className="elevated-card public-card pub-reveal">
              <h3><Icon name="chart" />Pembayaran Per Dusun</h3>
              <div className="public-progress-list">
                {transparencyRows.map((row) => (
                  <div className="public-progress-row" key={row.name}>
                    <div>
                      <b>{row.name}</b>
                      <span>{row.paid} / {row.total} KK telah membayar</span>
                    </div>
                    <strong>{row.progress}%</strong>
                    <div className="public-progress-track">
                      <i className={row.progress < 50 ? 'danger' : row.progress < 80 ? 'warning' : 'good'} style={{ width: `${row.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
            <article className="elevated-card public-card pub-reveal">
              <h3><Icon name="money" />Pengeluaran Terakhir</h3>
              <div className="public-expense-list">
                {recentExpenses.length === 0 && <p className="muted">Belum ada pengeluaran diposting pada periode ini.</p>}
                {recentExpenses.map((expense) => (
                  <div key={expense.id}>
                    <span>{expense.description}</span>
                    <b>Rp{expense.amount.toLocaleString('id-ID')}</b>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="public-section public-about-section" id="about">
        <div className="public-section-inner">
          <div className="public-section-title pub-reveal">
            <h2>Tentang Kami & Pengurus</h2>
            <p>PAMSIMAS Desa Tanjungsari dikelola untuk menjaga layanan air bersih tetap terjangkau, terpantau, dan bertanggung jawab.</p>
          </div>
          <div className="public-profile-grid">
            {profilePoints.map((point, index) => (
              <article className="elevated-card public-card pub-reveal stagger-item" key={point.title} style={{ transitionDelay: `${index * 90}ms` }}>
                <span className="public-card-icon"><Icon name={point.icon} /></span>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
          <div className="public-team-grid">
            {organizationMembers.map(([name, role], index) => (
              <article className="elevated-card public-team-card pub-reveal stagger-item" key={name} style={{ transitionDelay: `${index * 80}ms` }}>
                <span>{name.slice(0, 2).toUpperCase()}</span>
                <strong>{name}</strong>
                <small>{role}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section public-faq-section" id="faq">
        <div className="public-section-inner public-faq-inner">
          <div className="public-section-title pub-reveal">
            <h2>FAQ</h2>
            <p>Pertanyaan umum seputar pembayaran, gangguan air, dan layanan warga.</p>
          </div>
          <div className="public-faq-list pub-reveal">
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.question

              return (
                <button className={isOpen ? 'open' : ''} key={faq.question} onClick={() => setOpenFaq(isOpen ? '' : faq.question)} type="button">
                  <span>
                    <b>{faq.question}</b>
                    <i>{faq.answer}</i>
                  </span>
                  <strong>+</strong>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
