import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Badge } from '../../../components/Badge'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { buildPaginationSummary } from '../../../utils/pagination'
import { financeRepository, type Deposit } from '../../../app/services/financeRepository'
import type { SetPage } from '../../../types'

export function VerificationPage({ notify, setPage }: { notify: (message: string) => void; setPage: SetPage }) {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const currentPeriod = getCurrentPeriod()
  const [filters, setFilters] = useState({ officer: '', period: currentPeriod, status: '' })
  const [draftFilters, setDraftFilters] = useState(filters)
  const [pageNumber, setPageNumber] = useState(1)
  const pageSize = 15

  const officers = useMemo(() => Array.from(new Set(deposits.map((deposit) => deposit.officer.name))), [deposits])

  const visibleDeposits = deposits.filter((deposit) => {
    const officerMatches = filters.officer ? deposit.officer.name === filters.officer : true
    const statusMatches = filters.status ? deposit.status === filters.status : true
    const periodMatches = filters.period ? deposit.period === filters.period : true
    return officerMatches && statusMatches && periodMatches
  })
  const paginatedDeposits = visibleDeposits.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)

  const pendingAmount = visibleDeposits.filter((deposit) => deposit.status === 'pending').reduce((total, deposit) => total + deposit.digital_total, 0)
  const verifiedAmount = visibleDeposits.filter((deposit) => deposit.status === 'verified').reduce((total, deposit) => total + (deposit.physical_total ?? 0), 0)
  const discrepancyAmount = visibleDeposits.filter((deposit) => deposit.status === 'verified').reduce((total, deposit) => total + Math.abs(deposit.discrepancy ?? 0), 0)
  const pendingOfficerCount = new Set(visibleDeposits.filter((deposit) => deposit.status === 'pending').map((deposit) => deposit.officer.name)).size
  const collectionProgress = pendingAmount + verifiedAmount > 0 ? Math.round((verifiedAmount / (pendingAmount + verifiedAmount)) * 100) : 0

  const loadInitialDeposits = useEffectEvent(refetch)
  useEffect(() => { void loadInitialDeposits() }, [])

  async function refetch() {
    try {
      setDeposits(await financeRepository.listDeposits())
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Data setoran gagal dimuat.')
    }
  }

  async function verifyAllPending() {
    const pendingDeposits = visibleDeposits.filter((deposit) => deposit.status === 'pending')
    if (pendingDeposits.length === 0) {
      notify('Tidak ada setoran pending pada periode yang dipilih.')
      return
    }

    let successCount = 0
    for (const deposit of pendingDeposits) {
      try {
        await financeRepository.verifyDeposit(deposit.id, { decision: 'verified', physical_total: deposit.digital_total })
        successCount += 1
      } catch {
        // Lewati setoran yang gagal (mis. sudah punya transaksi kas) dan lanjut ke berikutnya.
      }
    }
    await refetch()
    notify(`${successCount} setoran berhasil diverifikasi (nominal fisik dianggap sama dengan digital).`)
  }

  function openDepositDetail(deposit: Deposit) {
    sessionStorage.setItem('pamsimas-selected-deposit-id', String(deposit.id))
    setPage('deposit-detail')
  }

  return (
    <>
      <PageHeader
        action={<button className="primary" onClick={verifyAllPending}>Verifikasi Massal</button>}
        subtitle="Kelola dan verifikasi setoran dari petugas lapangan."
        title="Verifikasi Setoran"
      />
      <section className="stat-grid three compact-summary-cards">
        <StatCard stat={{ label: 'Total Setoran Tertunda', note: `${pendingOfficerCount} petugas belum diverifikasi`, tone: 'orange', value: formatMoney(pendingAmount) }} />
        <StatCard stat={{ label: 'Setoran Terverifikasi', note: `${collectionProgress}% pencapaian penagihan`, tone: 'green', value: formatMoney(verifiedAmount) }} />
        <StatCard stat={{ label: 'Selisih / Kas Menggantung', note: discrepancyAmount === 0 ? 'Aman' : 'Peringatan', tone: discrepancyAmount === 0 ? 'blue' : 'red', value: formatMoney(discrepancyAmount) }} />
      </section>
      <section className="filter-bar compact-filter">
        <label>
          Periode Setoran
          <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, period: event.target.value })} value={draftFilters.period}>
            {listPeriodOptions(deposits, currentPeriod).map((period) => <option key={period} value={period}>{formatPeriod(period)}</option>)}
          </select>
        </label>
        <label>
          Petugas
          <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, officer: event.target.value })} value={draftFilters.officer}>
            <option value="">Semua Petugas</option>
            {officers.map((officer) => <option key={officer}>{officer}</option>)}
          </select>
        </label>
        <label>
          Status
          <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })} value={draftFilters.status}>
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="verified">Terverifikasi</option>
            <option value="rejected">Ditolak</option>
          </select>
        </label>
        <button className="primary small" onClick={() => { setFilters(draftFilters); setPageNumber(1) }}>Terapkan Filter</button>
      </section>
      <TableCard footer={buildPaginationSummary(pageNumber, pageSize, visibleDeposits.length, 'setoran')} pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: visibleDeposits.length }}>
        <thead>
          <tr><th>Tanggal Setor</th><th>Petugas</th><th className="narrow-col">Pelanggan</th><th>Jumlah</th><th>Status</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          {paginatedDeposits.map((deposit) => (
            <tr key={deposit.id}>
              <td>{formatDateTime(deposit.submitted_at)}</td>
              <td>{deposit.officer.name}</td>
              <td>{deposit.payment_summary.count}</td>
              <td><strong className="money-blue">{formatMoney(deposit.digital_total)}</strong></td>
              <td><Badge status={depositStatusLabel(deposit.status)} /></td>
              <td><button className="primary small" onClick={() => openDepositDetail(deposit)}>Lihat Detail</button></td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </>
  )
}

function depositStatusLabel(status: Deposit['status']) {
  if (status === 'verified') return 'Terverifikasi'
  if (status === 'rejected') return 'Ditolak'
  return 'Menunggu'
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function formatMoney(value: number) {
  return `Rp${value.toLocaleString('id-ID')}`
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function getCurrentPeriod() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function listPeriodOptions(deposits: Deposit[], currentPeriod: string) {
  return Array.from(new Set([currentPeriod, ...deposits.map((deposit) => deposit.period)]))
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return `${MONTH_NAMES[(month || 1) - 1]} ${year}`
}
