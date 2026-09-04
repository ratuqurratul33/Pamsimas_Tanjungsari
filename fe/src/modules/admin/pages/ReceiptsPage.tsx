import { useEffect, useEffectEvent, useState } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { buildPaginationSummary } from '../../../utils/pagination'
import { receiptRepository, type Receipt } from '../../../app/services/receiptRepository'
import type { SetPage } from '../../../types'

type ReceiptsPageProps = {
  notify: (message: string) => void
  setPage: SetPage
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const PRINT_STORAGE_KEY = 'pamsimas-print-receipts'

function toPeriod(year: string, monthName: string) {
  const monthIndex = MONTHS.indexOf(monthName)
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function currentMonthYear() {
  const now = new Date()
  return { month: MONTHS[now.getMonth()], year: String(now.getFullYear()) }
}

export function ReceiptsPage({ notify, setPage }: ReceiptsPageProps) {
  const initialMonthYear = currentMonthYear()
  const [month, setMonth] = useState(initialMonthYear.month)
  const [year, setYear] = useState(initialMonthYear.year)
  const period = toPeriod(year, month)
  const [officerOptions, setOfficerOptions] = useState<string[]>([])
  const [officerFilter, setOfficerFilter] = useState('')
  const [appliedOfficer, setAppliedOfficer] = useState('')
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pageNumber, setPageNumber] = useState(1)
  const [editingRow, setEditingRow] = useState<Receipt | null>(null)
  const [meterDraft, setMeterDraft] = useState({ current: '', previous: '' })
  const pageSize = 15

  const paginatedRows = receipts.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
  const selectedRows = receipts.filter((row) => selectedIds.includes(row.customer_id))
  const summaryOfficerLabel = appliedOfficer || 'Semua Petugas'
  const summaryMonthLabel = receipts[0]?.period_label ?? '-'
  const selectableRows = paginatedRows.filter((row) => !row.printed)
  const isAllSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.includes(row.customer_id))

  const loadInitialReceipts = useEffectEvent(() => {
    let active = true
    void receiptRepository.listOfficerNames()
      .then(async (names) => {
        if (!active) return
        setOfficerOptions(names)
        const selectedOfficer = names.includes('Budi Santoso') ? 'Budi Santoso' : names[0] ?? ''
        setOfficerFilter(selectedOfficer)
        setAppliedOfficer(selectedOfficer)
        if (selectedOfficer) setReceipts(await receiptRepository.listReceipts(period, selectedOfficer))
      })
      .catch((error) => notify(error instanceof Error ? error.message : 'Data petugas kwitansi gagal dimuat.'))

    return () => { active = false }
  })
  useEffect(() => loadInitialReceipts(), [])

  async function applyFilter() {
    if (!officerFilter) {
      notify('Pilih petugas terlebih dahulu sebelum menerapkan filter kwitansi fisik.')
      return
    }

    setAppliedOfficer(officerFilter)
    try {
      setReceipts(await receiptRepository.listReceipts(period, officerFilter))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Kwitansi gagal dimuat.')
      return
    }
    setSelectedIds([])
    setPageNumber(1)
  }

  function toggleCustomer(customerId: string) {
    const row = receipts.find((item) => item.customer_id === customerId)

    if (row?.printed) {
      notify('Kwitansi yang sudah dicetak tidak bisa dipilih ulang.')
      return
    }

    setSelectedIds((currentIds) =>
      currentIds.includes(customerId) ? currentIds.filter((item) => item !== customerId) : [...currentIds, customerId],
    )
  }

  function openPrintPreview() {
    if (selectedRows.length === 0) {
      notify('Pilih minimal satu kwitansi fisik terlebih dahulu.')
      return
    }

    sessionStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(selectedRows.map((row) => ({
      address: row.address,
      customerId: row.customer_id,
      customerName: row.customer_name,
      currentMeter: row.current_meter,
      adminFee: row.admin_fee,
      invoice: row.receipt_number,
      month: row.period_label,
      officer: row.officer_name,
      previousMeter: row.previous_meter,
      period: row.period,
      totalAmount: row.total_amount,
      usage: row.usage,
      waterRate: row.water_rate,
      source: row,
    }))))

    notify(`${selectedIds.length} tagihan siap dimasukkan ke template kwitansi.`)
    setPage('receipt-bulk')
  }

  function openMeterEditor(row: Receipt) {
    setEditingRow(row)
    setMeterDraft({ current: String(row.current_meter), previous: String(row.previous_meter) })
  }

  async function saveMeterCorrection() {
    if (!editingRow) return
    try {
      const updated = await receiptRepository.updateReceiptMeter(editingRow.customer_id, editingRow.period, Number(meterDraft.previous), Number(meterDraft.current))
      setReceipts((current) => current.map((row) => row.customer_id === updated.customer_id ? updated : row))
      setEditingRow(null)
      notify('Meter diperbarui. Kwitansi ditandai belum dicetak dan wajib dicetak ulang.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Perubahan meter gagal disimpan.')
    }
  }

  return (
    <>
      <PageHeader
        action={(
          <div className="button-group">
            <button className="primary" disabled={selectedRows.length === 0} onClick={openPrintPreview}>
              <Icon name="print" />
              Siapkan Cetak
            </button>
          </div>
        )}
        subtitle="Hanya tagihan dengan meter tersimpan yang tampil. Pilih petugas, lalu cetak 4 kwitansi per halaman A4."
        title="Cetak Kwitansi Fisik"
      />

      <section className="filter-bar compact-filter">
        <label>
          Bulan
          <select className="input-select compact-select" onChange={(event) => setMonth(event.target.value)} value={month}>
            {MONTHS.map((monthName) => <option key={monthName}>{monthName}</option>)}
          </select>
        </label>
        <label>
          Tahun
          <select className="input-select compact-select" onChange={(event) => setYear(event.target.value)} value={year}>
            <option>{initialMonthYear.year}</option>
            <option>{String(Number(initialMonthYear.year) - 1)}</option>
          </select>
        </label>
        <label>
          Petugas
          <select className="input-select compact-select" onChange={(event) => setOfficerFilter(event.target.value)} value={officerFilter}>
            <option value="">Pilih Petugas</option>
            {officerOptions.map((officer) => <option key={officer}>{officer}</option>)}
          </select>
        </label>
        <button className="primary small" onClick={applyFilter}>Terapkan Filter</button>
      </section>

      <section className="stat-grid three compact-summary-cards">
        <StatCard stat={{ label: 'Total Kwitansi Fisik', value: String(receipts.length) }} />
        <StatCard stat={{ label: 'Bulan Cetak', value: summaryMonthLabel }} />
        <StatCard stat={{ label: 'Nama Petugas', value: summaryOfficerLabel }} />
      </section>

      {receipts.length === 0 ? (
        <section className="panel empty-state period-empty-state">
          <span className="stat-icon"><Icon name="receipt" /></span>
          <h3>Tidak Ada Data Kwitansi</h3>
          <p>Belum ada kwitansi siap cetak untuk {month} {year} dan petugas yang dipilih.</p>
        </section>
      ) : (
      <TableCard
        footer={buildPaginationSummary(pageNumber, pageSize, receipts.length, 'kwitansi fisik')}
        pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: receipts.length }}
      >
        <thead>
          <tr>
            <th>
              <input
                checked={isAllSelected}
                onChange={() => setSelectedIds((currentIds) => {
                  const pageIds = new Set(selectableRows.map((row) => row.customer_id))
                  if (isAllSelected) return currentIds.filter((id) => !pageIds.has(id))
                  return Array.from(new Set([...currentIds, ...pageIds]))
                })}
                type="checkbox"
              />
            </th>
            <th>No Kwitansi</th>
            <th>Pelanggan</th>
            <th>Meter Awal</th>
            <th>Meter Akhir</th>
            <th>Pemakaian</th>
            <th>Biaya Admin</th>
            <th>Total Tagihan</th>
            <th>Status Cetak</th>
            <th>Edit Meter</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRows.map((row) => (
            <tr key={row.customer_id}>
              <td>
                <input
                  checked={selectedIds.includes(row.customer_id)}
                  disabled={row.printed}
                  onChange={() => toggleCustomer(row.customer_id)}
                  type="checkbox"
                />
              </td>
              <td>{row.receipt_number}</td>
              <td>
                {row.customer_name}
                <small>{row.customer_id}</small>
              </td>
              <td>{row.previous_meter} m3</td>
              <td>{row.current_meter} m3</td>
              <td>{row.usage} m3</td>
              <td>{formatMoney(row.admin_fee)}</td>
              <td><strong>{formatMoney(row.total_amount)}</strong></td>
              <td><Badge status={row.printed ? 'Sudah Dicetak' : 'Belum Dicetak'} /></td>
              <td><button className="ghost small" onClick={() => openMeterEditor(row)}><Icon name="edit" /> Edit Meter</button></td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      )}

      {selectedIds.length > 0 && (
        <div className="selection-bar">
          <strong>{selectedIds.length} tagihan dipilih</strong>
          <span>Siap dimasukkan ke susunan cetak A4</span>
          <button className="primary" onClick={openPrintPreview}>Siapkan {selectedIds.length} Kwitansi</button>
        </div>
      )}

      {editingRow && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal meter-correction-modal">
            <div className="modal-head"><div><h2>Koreksi Meter oleh Admin</h2><p>{editingRow.customer_name} - {editingRow.receipt_number}</p></div><button className="icon-btn" onClick={() => setEditingRow(null)}><Icon name="close" /></button></div>
            <div className="modal-grid">
              <label>Meter Awal<input min="0" onChange={(event) => setMeterDraft((current) => ({ ...current, previous: event.target.value }))} type="number" value={meterDraft.previous} /></label>
              <label>Meter Akhir<input min="0" onChange={(event) => setMeterDraft((current) => ({ ...current, current: event.target.value }))} type="number" value={meterDraft.current} /></label>
            </div>
            <p className="helper">Masukkan meter terakhir yang benar. Pemakaian serta total tagihan dihitung ulang, lalu kwitansi wajib dicetak ulang.</p>
            <div className="modal-foot"><button className="ghost" onClick={() => setEditingRow(null)}>Batal</button><button className="primary" onClick={saveMeterCorrection}>Simpan Koreksi</button></div>
          </section>
        </div>
      )}
    </>
  )
}

function formatMoney(value: number) {
  return `Rp${value.toLocaleString('id-ID')}`
}
