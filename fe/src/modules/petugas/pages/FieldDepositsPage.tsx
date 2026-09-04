import { useState } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { TableCard } from '../../../components/TableCard'
import type { FieldCustomer, FieldDeposit } from '../data/petugasData'
import { formatRupiah, getFieldBillSummary } from '../data/petugasData'

type FieldDepositsPageProps = {
  customers: FieldCustomer[]
  deposits: FieldDeposit[]
  onCreateDeposit: (deposit: FieldDeposit, customerIds: string[]) => Promise<void>
}

export function FieldDepositsPage({ customers, deposits, onCreateDeposit }: FieldDepositsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const payableCustomers = customers.filter((customer) => customer.billStatus === 'Sudah Membayar' && customer.paymentMethod && customer.depositStatus !== 'Menunggu Verifikasi' && customer.depositStatus !== 'Terverifikasi')
  const cashTotal = payableCustomers
    .filter((customer) => customer.paymentMethod === 'Tunai')
    .reduce((total, customer) => total + getFieldBillSummary(customer).totalAmount, 0)
  const qrisTotal = payableCustomers
    .filter((customer) => customer.paymentMethod === 'QRIS')
    .reduce((total, customer) => total + getFieldBillSummary(customer).totalAmount, 0)
  const pendingTotal = deposits
    .filter((deposit) => deposit.status === 'Menunggu Verifikasi')
    .reduce((total, deposit) => total + deposit.cash + deposit.qris, 0)
  const verifiedTotal = deposits
    .filter((deposit) => deposit.status === 'Terverifikasi')
    .reduce((total, deposit) => total + deposit.cash + deposit.qris, 0)

  async function createDeposit() {
    if (payableCustomers.length === 0) {
      setIsModalOpen(false)
      return
    }

    const now = new Date()
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await onCreateDeposit({
        id: `SET-${String(deposits.length + 1).padStart(3, '0')}`,
        cash: cashTotal,
        customerCount: payableCustomers.length,
        date: 'Hari ini',
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        qris: qrisTotal,
        status: 'Menunggu Verifikasi',
      }, payableCustomers.map((customer) => customer.id))
      setIsModalOpen(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Setoran gagal disimpan, silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader subtitle="Riwayat pembayaran pelanggan yang telah dikumpulkan dan diserahkan kepada Admin." title="Setoran" />
      <section className="panel deposit-primary-card">
        <div>
          <p className="eyebrow">Setoran Belum Diserahkan</p>
          <h2>{formatRupiah(cashTotal + qrisTotal)}</h2>
          <p>Tunai {formatRupiah(cashTotal)} <span aria-hidden="true">|</span> QRIS {formatRupiah(qrisTotal)}</p>
        </div>
        <div className="deposit-checklist">
          <span><Icon name="check" /> {payableCustomers.length} pembayaran siap disetorkan</span>
          <button className="primary" disabled={payableCustomers.length === 0} onClick={() => setIsModalOpen(true)} type="button">
            <Icon name="check" />
            Ceklis & Setorkan
          </button>
        </div>
      </section>

      <div className="deposit-status-grid">
        <section className="panel deposit-status-card"><span>Menunggu Verifikasi</span><strong>{formatRupiah(pendingTotal)}</strong><small>oleh admin</small></section>
        <section className="panel deposit-status-card"><span>Sudah Diverifikasi</span><strong>{formatRupiah(verifiedTotal)}</strong><small>oleh sistem</small></section>
      </div>

      <TableCard title="Daftar Setoran">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Periode</th>
            <th>Jml Pelanggan</th>
            <th>Tunai</th>
            <th>QRIS</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((deposit) => (
            <tr key={deposit.id}>
              <td>{formatDepositDate(deposit.date)}</td>
              <td>{deposit.period}</td>
              <td>{deposit.customerCount}</td>
              <td>{formatRupiah(deposit.cash)}</td>
              <td>{formatRupiah(deposit.qris)}</td>
              <td><strong>{formatRupiah(deposit.cash + deposit.qris)}</strong></td>
              <td>
                <Badge
                  status={
                    deposit.status === 'Terverifikasi'
                      ? 'Sudah Diverifikasi'
                      : deposit.status === 'Menunggu Verifikasi'
                        ? 'Menunggu Verifikasi'
                        : 'Belum Diserahkan'
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal payment-modal">
            <div className="modal-head">
              <div>
                <h2>Buat Setoran Baru</h2>
                <p>Setoran akan masuk status menunggu verifikasi admin.</p>
              </div>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} type="button">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-grid one-column">
              <section className="mini-summary wide-summary">
                <span>Total Tunai <b>{formatRupiah(cashTotal)}</b></span>
                <span>Total QRIS <b>{formatRupiah(qrisTotal)}</b></span>
                <span>Total Setoran <b className="money-blue">{formatRupiah(cashTotal + qrisTotal)}</b></span>
              </section>
              {submitError && <p className="error-panel">{submitError}</p>}
            </div>
            <div className="modal-foot">
              <button className="ghost" onClick={() => setIsModalOpen(false)} type="button">Batal</button>
              <button className="primary" disabled={isSubmitting || payableCustomers.length === 0} onClick={() => void createDeposit()} type="button">
                {isSubmitting ? 'Mengirim...' : 'Kirim Setoran'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function formatDepositDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(parsed)
}
