import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { TableCard } from '../../../components/TableCard'
import type { SetPage } from '../../../types'
import type { FieldCustomer } from '../data/petugasData'
import { formatRupiah, getFieldPaymentStatus } from '../data/petugasData'

type FieldCustomerDetailPageProps = {
  customer: FieldCustomer
  onPay: (customer: FieldCustomer) => void
  setPage: SetPage
}

export function FieldCustomerDetailPage({ customer, onPay, setPage }: FieldCustomerDetailPageProps) {
  const usage = customer.currentMeter - customer.lastMeter
  const paymentStatus = getFieldPaymentStatus(customer)
  const history = [...(customer.meterHistory ?? [])].sort((left, right) => right.period.localeCompare(left.period))

  return (
    <>
      <button className="back-link" onClick={() => setPage('field-customers')}>
        <Icon name="back" />
        Kembali
      </button>
      <PageTitle title="Detail Pelanggan" />
      <div className="detail-grid field-detail-clean field-customer-detail-grid">
        <section className="profile-card">
          <div className="big-avatar">
            <Icon name="user" />
          </div>
          <h2>{customer.name}</h2>
          <Badge status="Aktif" />
          <dl>
            <dt>Zona Wilayah</dt>
            <dd>{customer.zone}</dd>
            <dt>Kampung</dt>
            <dd>{customer.kampung}</dd>
            <dt>Alamat</dt>
            <dd>{customer.address}</dd>
            <dt>Input Meter Terakhir</dt>
            <dd>{customer.meterSubmittedAt ?? 'Belum ada input bulan ini'}</dd>
            <dt>Status Tagihan</dt>
            <dd>{paymentStatus}</dd>
          </dl>
        </section>

        <section className="panel bill-highlight field-bill-card">
          <div className="panel-title">
            <h3><Icon name="receipt" />Tagihan Bulan Ini</h3>
            <span className="pill-soft">{formatPeriodLabel(customer.billingPeriod)}</span>
          </div>
          <div className="stat-grid three compact-stats">
            <div>
              <small>Pemakaian</small>
              <strong>{usage} m3</strong>
            </div>
            <div>
              <small>Total Tagihan</small>
              <strong className={customer.billStatus === 'Lunas' ? 'money-blue' : 'money-red'}>{formatRupiah(customer.billAmount)}</strong>
            </div>
            <div>
              <small>Status</small>
              <span className="field-status-inline"><Badge status={paymentStatus} /></span>
            </div>
          </div>
          {paymentStatus === 'Belum Input Meter' ? (
            <button className="ghost block" onClick={() => setPage('field-meter')}>
              <Icon name="chart" />
              Input Meter Dulu
            </button>
          ) : (
            <button className="primary block" disabled={paymentStatus !== 'Belum Membayar'} onClick={() => onPay(customer)}>
              <Icon name="money" />
              {paymentStatus === 'Belum Membayar' ? 'Membayar' : 'Selesai Membayar'}
            </button>
          )}
        </section>
      </div>

      <div className="field-history-separated">
        <TableCard title="Riwayat Pemakaian & Transaksi">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Meter Lalu</th>
              <th>Meter Ini</th>
              <th>Pemakaian</th>
              <th>Tagihan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={6}>Belum ada riwayat pemakaian untuk pelanggan ini.</td></tr>
            ) : history.map((reading) => (
              <tr key={reading.period}>
                <td><strong>{formatPeriodLabel(reading.period)}</strong></td>
                <td>{reading.previousMeter}</td>
                <td>{reading.currentMeter}</td>
                <td><strong>{reading.usage} m3</strong></td>
                <td><strong>{formatRupiah(reading.billAmount)}</strong></td>
                <td><Badge status={reading.status ?? 'Menunggak'} /></td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
    </>
  )
}

function formatPeriodLabel(period?: string | null) {
  const value = period && /^\d{4}-\d{2}$/.test(period) ? period : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [year, month] = value.split('-').map(Number)

  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function PageTitle({ title }: { title: string }) {
  return (
    <div className="page-header simple-header">
      <div>
        <h1>{title}</h1>
      </div>
    </div>
  )
}
