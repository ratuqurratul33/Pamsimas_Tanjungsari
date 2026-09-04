import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import type { CSSProperties } from 'react'
import type { FieldCustomer } from '../data/petugasData'
import { formatRupiah } from '../data/petugasData'
import type { SetPage } from '../../../types'
import type { FieldDashboardSummary } from '../../../app/services/fieldRepository'

type FieldDashboardPageProps = {
  customers: FieldCustomer[]
  setPage: SetPage
  summary?: FieldDashboardSummary | null
}

export function FieldDashboardPage({ customers, setPage, summary }: FieldDashboardPageProps) {
  const assignedCustomers = summary?.assignedCustomers ?? customers.length
  const paidCustomers = summary?.paidCustomers ?? customers.filter((customer) => customer.billStatus === 'Lunas').length
  const recordedMeters = summary?.recordedMeters ?? customers.filter((customer) => customer.meterStatus === 'Sudah Dicatat').length
  const pendingDepositAmount = summary?.pendingDepositAmount ?? customers
    .filter((customer) => customer.depositStatus === 'Belum Disetorkan')
    .reduce((total, customer) => total + customer.billAmount, 0)
  const monthlyBills = summary?.monthlyBillTotal ?? customers.reduce((total, customer) => total + customer.billAmount, 0)
  const progress = assignedCustomers > 0 ? Math.round((recordedMeters / assignedCustomers) * 100) : 0
  const paidProgress = assignedCustomers > 0 ? Math.round((paidCustomers / assignedCustomers) * 100) : 0

  return (
    <>
      <PageHeader subtitle="Ringkasan aktivitas penagihan Anda hari ini." title="Dashboard" />
      <div className="stat-grid three">
        <StatCard stat={{ label: 'Pelanggan Ditugaskan', value: String(assignedCustomers), tone: 'blue' }} />
        <StatCard stat={{ label: 'Tagihan Bulan Ini', value: formatRupiah(monthlyBills), tone: 'muted' }} />
        <StatCard stat={{ label: 'Setoran Belum Diserahkan', note: summary ? `${formatRupiah(summary.pendingVerificationAmount)} menunggu verifikasi` : undefined, value: formatRupiah(pendingDepositAmount), tone: 'orange' }} />
      </div>

      <div className="dashboard-grid">
        <section className="panel payment-panel">
          <div className="panel-title">
            <h3>Progress Pencatatan Meter</h3>
            <strong>{progress}%</strong>
          </div>
          <p>
            <b className="money-blue">{recordedMeters}</b> / {assignedCustomers}
          </p>
          <small>Meteran selesai dicatat</small>
          <div className="progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <button className="primary centered-action" onClick={() => setPage('field-meter')}>
            <Icon name="plus" />
            Input Meter Baru
          </button>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h3>Status Pembayaran Bulan Ini</h3>
          </div>
          <div className="donut-wrap">
            <div className="donut" style={{ '--paid': `${paidProgress}%` } as CSSProperties}>
              <strong>{paidCustomers}</strong>
              <span>Lunas</span>
            </div>
            <div className="legend-list">
              <span><i className="dot blue" />Sudah Membayar <b>{paidCustomers} Pelanggan</b></span>
              <span><i className="dot muted-dot" />Belum Membayar <b>{assignedCustomers - paidCustomers} Pelanggan</b></span>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
