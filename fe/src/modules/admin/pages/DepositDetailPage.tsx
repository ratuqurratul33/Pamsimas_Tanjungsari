import { useEffect, useState } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { StatCard } from '../../../components/StatCard'
import { financeRepository, type Deposit, type DepositPayment } from '../../../app/services/financeRepository'
import type { SetPage } from '../../../types'

export function DepositDetailPage({ notify, setPage }: { notify: (message: string) => void; setPage: SetPage }) {
  const depositId = readSelectedDepositId()
  const [deposit, setDeposit] = useState<Deposit>()
  const [physicalTotal, setPhysicalTotal] = useState(0)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!depositId) return
    void financeRepository.getDepositById(depositId)
      .then((nextDeposit) => {
        setDeposit(nextDeposit)
        setPhysicalTotal(nextDeposit?.physical_total ?? nextDeposit?.digital_total ?? 0)
      })
      .catch((error) => notify(error instanceof Error ? error.message : 'Setoran gagal dimuat.'))
  }, [depositId, notify])

  if (!deposit) {
    return (
      <div className="full-detail">
        <button className="back-link" onClick={() => setPage('verification')}><Icon name="back" />Kembali ke Verifikasi Setoran</button>
        <article className="panel">
          <p>Setoran tidak ditemukan. Silakan pilih setoran dari halaman Verifikasi Setoran.</p>
        </article>
      </div>
    )
  }

  const discrepancy = physicalTotal - deposit.digital_total
  const canVerify = deposit.status === 'pending'

  async function refetch() {
    if (!depositId) return
    setDeposit(await financeRepository.getDepositById(depositId))
  }

  async function handleVerify() {
    try {
      const result = await financeRepository.verifyDeposit(deposit!.id, { decision: 'verified', note: note || undefined, physical_total: physicalTotal })
      setDeposit(result.deposit)
      notify(result.deposit.status === 'pending'
        ? 'Pelanggan aman sudah ditandai terverifikasi. Setoran tetap pending karena masih ada pelanggan yang ditolak.'
        : 'Setoran berhasil diverifikasi. Kas resmi telah diperbarui.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gagal memverifikasi setoran.')
    }
  }

  async function handleReject() {
    try {
      await financeRepository.verifyDeposit(deposit!.id, { decision: 'rejected', note: note || undefined, physical_total: physicalTotal })
      notify('Setoran ditolak.')
      await refetch()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gagal menolak setoran.')
    }
  }

  async function updatePayment(payment: DepositPayment, status: DepositPayment['status']) {
    try {
      const updatedDeposit = await financeRepository.updateDepositPaymentStatus(deposit!.id, payment.id, status)
      setDeposit(updatedDeposit)
      notify(`Status pembayaran ${payment.customer_name} diperbarui menjadi ${paymentStatusLabel(status)}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gagal memperbarui status pelanggan.')
    }
  }

  return (
    <div className="full-detail">
      <button className="back-link" onClick={() => setPage('verification')}><Icon name="back" />Kembali ke Verifikasi / Detail Setoran</button>
      <article className="panel deposit-head compact-deposit-head">
        <h1>Setoran {deposit.officer.name} <Badge status={depositStatusLabel(deposit.status)} /></h1>
        <div className="meta-grid">
          <span>Nomor Setoran <b>{deposit.deposit_number}</b></span>
          <span>Petugas <b>{deposit.officer.name}</b></span>
          <span>Periode <b>{deposit.period}</b></span>
          <span>Tanggal Setoran <b>{formatDateTime(deposit.submitted_at)}</b></span>
          <span>Jumlah Pelanggan Ditagih <b>{deposit.payment_summary.count} Pelanggan</b></span>
        </div>
      </article>
      <section className="stat-grid three compact-summary-cards">
        <StatCard stat={{ label: 'Tunai', value: formatMoney(deposit.payment_summary.cash) }} />
        <StatCard stat={{ label: 'QRIS', value: formatMoney(deposit.payment_summary.qris) }} />
        <StatCard stat={{ label: 'Total Digital', tone: 'blue', value: formatMoney(deposit.digital_total) }} />
      </section>
      <section className="panel deposit-discrepancy-panel">
        <div className="panel-title">
          <h3>Verifikasi Fisik</h3>
        </div>
        <div className="meta-grid">
          <label className="grid gap-1">
            Nominal Fisik Diterima
            <input
              disabled={deposit.status !== 'pending'}
              onChange={(event) => setPhysicalTotal(Number(event.target.value) || 0)}
              type="number"
              value={physicalTotal}
            />
          </label>
          <span>Nominal Digital <b>{formatMoney(deposit.digital_total)}</b></span>
          <span>Selisih <b>{formatMoney(deposit.status === 'pending' ? discrepancy : (deposit.discrepancy ?? 0))}</b></span>
          <span>Status Selisih <b>{(deposit.status === 'pending' ? discrepancy : (deposit.discrepancy ?? 0)) === 0 ? 'Aman' : 'Perlu Perhatian'}</b></span>
        </div>
        {deposit.status === 'pending' && (
          <label className="grid gap-1">
            Catatan (opsional)
            <input onChange={(event) => setNote(event.target.value)} value={note} />
          </label>
        )}
      </section>
      <section className="panel deposit-payment-panel">
        <div className="panel-title">
          <div>
            <h3>Daftar Pelanggan yang Disetorkan</h3>
            <p>Setiap baris mewakili uang pelanggan dalam satu transaksi setoran petugas.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID Pembayaran</th>
                <th>ID Pelanggan</th>
                <th>Nama</th>
                <th>Wilayah</th>
                <th>Pemakaian</th>
                <th>Total Tagihan</th>
                <th>Metode</th>
                <th>Bukti Kwitansi</th>
                <th>Bukti QRIS</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(deposit.payments ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>{payment.customer_id}</td>
                  <td>{payment.customer_name}</td>
                  <td>{payment.customer_area ?? '-'}</td>
                  <td>{payment.total_usage} m3</td>
                  <td><strong>{formatMoney(payment.bill_amount)}</strong></td>
                  <td>{payment.method}</td>
                  <td>
                    {payment.proof_preview ? (
                      <a className="table-link" href={payment.proof_preview} rel="noreferrer" target="_blank">Lihat Foto</a>
                    ) : payment.proof_name ? (
                      <span>{payment.proof_name}</span>
                    ) : (
                      <span className="muted">Belum ada</span>
                    )}
                  </td>
                  <td>
                    {payment.method !== 'QRIS' ? (
                      <span className="muted">Tidak diperlukan</span>
                    ) : payment.qris_proof_preview ? (
                      <a className="table-link" href={payment.qris_proof_preview} rel="noreferrer" target="_blank">Lihat QRIS</a>
                    ) : payment.qris_proof_name ? (
                      <span>{payment.qris_proof_name}</span>
                    ) : (
                      <span className="muted">Belum ada</span>
                    )}
                  </td>
                  <td><Badge status={paymentStatusLabel(payment.status)} /></td>
                  <td className="action-cell-center deposit-payment-actions">
                    <button className="ghost small" disabled={deposit.status !== 'pending'} onClick={() => updatePayment(payment, 'pending')} type="button">Pending</button>
                    <button className="primary small" disabled={deposit.status !== 'pending'} onClick={() => updatePayment(payment, 'verified')} type="button">Verif</button>
                    <button className="danger-btn small" disabled={deposit.status !== 'pending'} onClick={() => updatePayment(payment, 'rejected')} type="button">Tolak</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="bottom-action">
        <span>Total tunai: {formatMoney(deposit.payment_summary.cash)} | Total QRIS: {formatMoney(deposit.payment_summary.qris)} | <b>Total: {formatMoney(deposit.digital_total)}</b></span>
        {deposit.status === 'pending' && (
          <>
            <button className="danger-btn" onClick={handleReject}>Tolak Setoran</button>
            <button className="primary" disabled={!canVerify} onClick={handleVerify}>Verifikasi Setoran</button>
          </>
        )}
      </div>
    </div>
  )
}

function paymentStatusLabel(status: DepositPayment['status']) {
  if (status === 'verified') return 'Terverifikasi'
  if (status === 'rejected') return 'Ditolak'
  return 'Pending'
}

function depositStatusLabel(status: Deposit['status']) {
  if (status === 'verified') return 'Terverifikasi'
  if (status === 'rejected') return 'Ditolak'
  return 'Menunggu'
}

function readSelectedDepositId(): number | undefined {
  const raw = sessionStorage.getItem('pamsimas-selected-deposit-id')
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function formatMoney(value: number) {
  return `Rp${value.toLocaleString('id-ID')}`
}
