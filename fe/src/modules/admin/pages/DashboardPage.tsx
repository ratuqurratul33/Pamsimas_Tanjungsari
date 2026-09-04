import { useEffect, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { appEnvironment } from '../../../app/config/environment'
import { resolvePath } from '../../../app/router/routeConfig'
import { subscribeToRealtimeUpdates } from '../../../app/services/realtimeService'
import { getDashboardSummary } from '../services/adminApi'
import type { DashboardSummary, SetPage, Stat } from '../../../types'

type DashboardPageProps = {
  setPage: SetPage
}

export function DashboardPage({ setPage }: DashboardPageProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    void loadDashboard(controller.signal)
    const refreshTimer = appEnvironment.useMockApi ? window.setInterval(() => {
      void getDashboardSummary().then(setSummary).catch(() => undefined)
    }, 5_000) : undefined
    const unsubscribeRealtime = subscribeToRealtimeUpdates(['dashboard', 'finance', 'deposits', 'field', 'receipts'], () => {
      void getDashboardSummary().then(setSummary).catch(() => undefined)
    })

    return () => {
      controller.abort()
      if (refreshTimer) window.clearInterval(refreshTimer)
      unsubscribeRealtime()
    }
  }, [])

  async function loadDashboard(signal?: AbortSignal) {
    setError(null)
    setIsLoading(true)

    try {
      const dashboardSummary = await getDashboardSummary(signal)
      setSummary(dashboardSummary)
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return
      }

      setError(fetchError instanceof Error ? fetchError.message : 'Dashboard gagal dimuat')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        action={<button className="ghost">{summary?.periodLabel ?? 'Memuat periode...'}</button>}
        subtitle="Ringkasan pengelolaan PAMSIMAS"
        title="Dashboard"
      />

      {error && <DashboardError message={error} onRetry={() => void loadDashboard()} />}
      {isLoading && <DashboardSkeleton />}
      {!isLoading && summary && <DashboardContent setPage={setPage} summary={summary} />}
    </>
  )
}

function DashboardContent({ setPage, summary }: { setPage: SetPage; summary: DashboardSummary }) {
  const stats: Stat[] = [
    {
      label: 'Total Pelanggan Aktif',
      note: 'Pelanggan aktif',
      tone: 'blue',
      value: formatNumber(summary.activeCustomers),
    },
    {
      label: 'Setoran Menunggu Verifikasi',
      note: 'Setoran perlu diperiksa',
      tone: 'orange',
      value: formatNumber(summary.pendingDeposits),
    },
    {
      label: 'Total Pengeluaran Bulan Ini',
      tone: 'muted',
      value: formatCurrency(summary.monthlyExpenses),
    },
  ]

  return (
    <>
      <BillingWindowBanner billingWindow={summary.billingWindow} />
      <section className="stat-grid three">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel payment-panel">
          <div className="panel-title">
            <h3>Persentase Pembayaran Bulan Ini</h3>
            <button className="icon-btn">...</button>
          </div>
          <div className="progress split">
            <span style={{ width: `${summary.payment.paidPercentage}%` }} />
          </div>
          <div className="payment-legend">
            <div>
              <i className="dot blue" /> <small>SUDAH BAYAR</small>
              <strong>{summary.payment.paidPercentage}%</strong>
            </div>
            <div>
              <i className="dot red" /> <small>BELUM BAYAR</small>
              <strong>{summary.payment.unpaidPercentage}%</strong>
            </div>
          </div>
        </article>
        <article className="panel cash-summary">
          <div className="panel-title">
            <h3>Ringkasan Kas</h3>
          </div>
          <div className="row-item">
            <span>Kas Tunai</span>
            <strong>{formatCurrency(summary.cashAccounts.cash)}</strong>
          </div>
          <div className="row-item">
            <span>Kas QRIS</span>
            <strong>{formatCurrency(summary.cashAccounts.qris)}</strong>
          </div>
          <a
            className="primary"
            href={resolvePath('cash')}
            onClick={(event) => {
              event.preventDefault()
              setPage('cash')
            }}
          >
            {'Lihat Akun Kas ->'}
          </a>
        </article>
      </section>
      <section className="panel activity-log-panel">
        <div className="panel-title">
          <h3>Log Aktivitas Admin</h3>
        </div>
        <div className="activity-log-list">
          {summary.activities.length === 0 && <p className="empty-state">Belum ada aktivitas admin yang tercatat.</p>}
          {summary.activities.map((activity, index) => (
            <div className="activity-log-row" key={activity.id ?? `${activity.action}-${activity.loggedAt}-${activity.actorName}-${index}`}>
              <span className="avatar tiny-avatar">{activity.actorName.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{activity.actorName}</strong>
                <p>{activity.description}</p>
              </div>
              <small>{formatDateTime(activity.loggedAt)}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function BillingWindowBanner({ billingWindow }: { billingWindow: DashboardSummary['billingWindow'] }) {
  if (!billingWindow.periodStart || !billingWindow.periodEnd) {
    return null
  }

  return (
    <section className={billingWindow.isOverdue ? 'panel billing-window-banner is-overdue' : 'panel billing-window-banner'}>
      <div className="billing-window-banner__head">
        <span>Rentang Waktu Tagihan Bulan Ini</span>
        {billingWindow.isOverdue && <span className="badge danger">Lewat Jatuh Tempo</span>}
      </div>
      <strong className="billing-window-banner__range">
        {formatDateLong(billingWindow.periodStart)} &ndash; {formatDateLong(billingWindow.periodEnd)}
      </strong>
      <p>
        {billingWindow.isOverdue
          ? `Tagihan yang belum dibayar melewati batas waktu ini otomatis dikenakan denda keterlambatan ${formatCurrency(billingWindow.lateFee)}.`
          : `Bayar sebelum tanggal ${billingWindow.dueDay} agar terhindar dari denda keterlambatan ${formatCurrency(billingWindow.lateFee)}.`}
      </p>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <section className="stat-grid three">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </section>
      <section className="dashboard-grid">
        <div className="skeleton-panel" />
        <div className="skeleton-panel" />
      </section>
    </>
  )
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="error-panel">
      <div>
        <strong>Data dashboard belum berhasil dimuat</strong>
        <p>{message}. Pastikan Laravel API berjalan dan endpoint dashboard tersedia.</p>
      </div>
      <button className="ghost" onClick={onRetry}>Coba Lagi</button>
    </section>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatDateLong(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}
