import { useEffect, useState } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { buildPaginationSummary } from '../../../utils/pagination'
import type { Officer, SetPage } from '../../../types'
import { getAdminOfficerDetail, type AdminOfficerDetail } from '../services/adminApi'

export function OfficerDetailPage({ officer: selectedOfficer, setPage }: { officer?: Officer; setPage: SetPage }) {
  const [detail, setDetail] = useState<AdminOfficerDetail | null>(null)
  const [error, setError] = useState('')
  const [pageNumber, setPageNumber] = useState(1)

  useEffect(() => {
    if (!selectedOfficer) return
    const controller = new AbortController()
    void getAdminOfficerDetail(selectedOfficer, controller.signal)
      .then(setDetail)
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(fetchError instanceof Error ? fetchError.message : 'Detail petugas gagal dimuat.')
      })
    return () => controller.abort()
  }, [selectedOfficer])

  if (!selectedOfficer) {
    return (
      <>
        <button className="back-link" onClick={() => setPage('officers')}><Icon name="back" />Kembali ke Data Petugas</button>
        <section className="error-panel"><strong>Petugas belum dipilih</strong><p>Pilih petugas dari tabel untuk melihat detailnya.</p></section>
      </>
    )
  }

  const officer = detail?.officer ?? selectedOfficer
  const summary = detail?.summary ?? { customers: officer.customers, pendingDeposit: 0, totalBill: 0, verifiedDeposit: 0 }
  const areas = officer.areas?.length ? officer.areas : [officer.area]
  const deposits = detail?.deposits ?? []
  const pageSize = 15
  const paginatedHistory = deposits.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)

  return (
    <>
      <button className="back-link" onClick={() => setPage('officers')}><Icon name="back" />Data Petugas / Detail Petugas</button>
      <PageHeader subtitle={`Detail akun, wilayah, dan setoran ${officer.name} dari database.`} title="Detail Petugas" />
      {error && <section className="error-panel"><strong>Detail gagal dimuat</strong><p>{error}</p></section>}
      <section className="officer-detail-layout refined-detail">
        <article className="profile-card compact-profile-card officer-identity-card">
          {officer.photoUrl ? <img alt={officer.name} className="photo-avatar image-avatar large-image-avatar" src={officer.photoUrl} /> : <div className="photo-avatar">{officer.name.slice(0, 2).toUpperCase()}</div>}
          <h2>{officer.name}</h2>
          <Badge status={officer.status} />
          <dl>
            <dt>ID Petugas</dt><dd>{officer.id}</dd>
            <dt>Username</dt><dd>{officer.username}</dd>
            <dt>No HP</dt><dd>{officer.phone}</dd>
            <dt>Dusun</dt><dd>{officer.dusun || '-'}</dd>
            <dt>RT Ditangani</dt><dd>{officer.rt || '-'}</dd>
            <dt>Kampung</dt><dd>{officer.kampung || '-'}</dd>
          </dl>
          <button className="primary block" onClick={() => setPage('officers')}>Edit Data</button>
        </article>
        <div className="detail-main">
          <section className="stat-grid two compact-summary-cards">
            <StatCard stat={{ label: 'Pelanggan Ditangani', value: String(summary.customers), tone: 'blue' }} />
            <StatCard stat={{ label: 'Total Tagihan Bulan Ini', value: formatCurrency(summary.totalBill), tone: 'blue' }} />
            <StatCard stat={{ label: 'Setoran Terverifikasi', value: formatCurrency(summary.verifiedDeposit), tone: 'green' }} />
            <StatCard stat={{ label: 'Menunggu Verifikasi', value: formatCurrency(summary.pendingDeposit), tone: 'orange' }} />
          </section>
          <article className="panel officer-area-panel compact-area-card">
            <div className="panel-title"><h3>Wilayah Tugas</h3></div>
            <div className="area-chip-grid">{areas.map((area) => <span className="area-chip" key={area}>{area}</span>)}</div>
          </article>
        </div>
      </section>
      <TableCard footer={buildPaginationSummary(pageNumber, pageSize, deposits.length, 'setoran')} pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: deposits.length }} title="Riwayat Setoran">
        <thead><tr><th>Tanggal</th><th>Periode</th><th>Jml Pelanggan</th><th>Tunai</th><th>QRIS</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {paginatedHistory.length === 0 && <tr><td colSpan={8}>Belum ada riwayat setoran petugas.</td></tr>}
          {paginatedHistory.map((deposit) => (
            <tr key={deposit.id}>
              <td>{formatDate(deposit.date)}</td>
              <td>{formatPeriod(deposit.period)}</td>
              <td>{deposit.customerCount}</td>
              <td>{formatCurrency(deposit.cash)}</td>
              <td>{formatCurrency(deposit.qris)}</td>
              <td>{formatCurrency(deposit.total)}</td>
              <td><Badge status={deposit.status === 'verified' ? 'Terverifikasi' : deposit.status === 'pending' ? 'Menunggu Verifikasi' : 'Ditolak'} /></td>
              <td><button className="link" onClick={() => {
                sessionStorage.setItem('pamsimas-selected-deposit-id', String(deposit.id))
                setPage('deposit-detail')
              }}>Lihat Detail</button></td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { currency: 'IDR', maximumFractionDigits: 0, style: 'currency' }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatPeriod(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}
