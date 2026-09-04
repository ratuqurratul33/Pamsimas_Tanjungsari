import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { financeRepository, type MonthlyReport } from '../../../app/services/financeRepository'
import { downloadPdfReport, downloadWordReport, type ReportRow } from '../services/reportExport'
import { writePrintReport } from '../services/reportPrintState'
import type { SetPage } from '../../../types'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function toPeriod(year: string, monthName: string) {
  const monthIndex = MONTHS.indexOf(monthName)
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

async function aggregateReports(periods: string[]) {
  const reports = await Promise.all(periods.map((period) => financeRepository.getMonthlyReport(period)))
  return {
    closing_balance: reports.at(-1)?.closing_balance ?? 0,
    discrepancy_total: reports.reduce((total, report) => total + report.discrepancy_total, 0),
    expense_rows: reports.flatMap((report) => report.expense_rows),
    expense_total: reports.reduce((total, report) => total + report.expense_total, 0),
    income_rows: reports.flatMap((report) => report.income_rows),
    income_total: reports.reduce((total, report) => total + report.income_total, 0),
    opening_balance: reports[0]?.opening_balance ?? 0,
    verified_deposit_count: reports.reduce((total, report) => total + report.verified_deposit_count, 0),
  }
}

const EMPTY_REPORT: Omit<MonthlyReport, 'period'> = {
  closing_balance: 0,
  discrepancy_total: 0,
  expense_rows: [],
  expense_total: 0,
  income_rows: [],
  income_total: 0,
  opening_balance: 0,
  verified_deposit_count: 0,
}

export function ReportsPage({ notify, setPage }: { notify: (message: string) => void; setPage: SetPage }) {
  const [month, setMonth] = useState('Agustus')
  const [year, setYear] = useState('2026')
  const [report, setReport] = useState(EMPTY_REPORT)

  const periodLabel = `${month} ${year}`
  const requestedPeriods = useMemo(() => [toPeriod(year, month)], [month, year])

  useEffect(() => {
    let active = true
    void aggregateReports(requestedPeriods)
      .then((nextReport) => { if (active) setReport(nextReport) })
      .catch((error) => { if (active) notify(error instanceof Error ? error.message : 'Laporan gagal dimuat.') })

    return () => { active = false }
  }, [notify, requestedPeriods])

  const hasReportRows = report.income_rows.length > 0 || report.expense_rows.length > 0

  const combinedRows = useMemo(() => {
    const isClosingNegative = report.closing_balance < 0

    return [
      ...report.income_rows.map((row) => ({ date: formatDate(row.date), description: row.description, expense: '-', income: formatMoney(row.amount), kind: 'transaction' as const, type: 'Pemasukan' })),
      ...report.expense_rows.map((row) => ({ date: formatDate(row.date), description: row.description, expense: formatMoney(row.amount), income: '-', kind: 'transaction' as const, type: 'Pengeluaran' })),
      {
        expense: report.expense_total > 0 ? formatMoney(report.expense_total) : '-',
        income: report.income_total > 0 ? formatMoney(report.income_total) : '-',
        kind: 'total' as const,
        label: 'TOTAL MUTASI',
      },
      {
        expense: isClosingNegative ? formatMoney(Math.abs(report.closing_balance)) : '-',
        income: isClosingNegative ? '-' : formatMoney(report.closing_balance),
        kind: 'total' as const,
        label: 'Nominal Total Akhir',
      },
    ]
  }, [report])
  const exportRows: ReportRow[] = [
    ['Tanggal', 'Jenis Mutasi', 'Uraian Keterangan', 'Debit/Pemasukan (Rp)', 'Kredit/Pengeluaran (Rp)'],
    ...combinedRows.map((row) => row.kind === 'total'
      ? [{ colSpan: 3, content: row.label }, row.income, row.expense]
      : [row.date, row.type, row.description, row.income, row.expense]),
  ]

  function downloadReport(kind: 'pdf' | 'word') {
    if (!hasReportRows) {
      notify(`Belum ada transaksi untuk ${periodLabel}, tidak ada yang bisa diunduh.`)
      return
    }

    const payload = { fileName: `laporan-pamsimas-${month}-${year}.${kind === 'pdf' ? 'pdf' : 'doc'}`, meta: ['PAMSIMAS Desa Tanjungsari', `Periode: ${periodLabel}`, 'Template: Template_Laporan_Formal_PAMSIMAS_Desa', 'Mode tabel: Mutasi campur'], rows: exportRows, title: 'Laporan Formal PAMSIMAS Desa' }

    if (kind === 'pdf') {
      void downloadPdfReport(payload).then(() => notify('Laporan PDF formal berhasil dibuat.'))
    } else {
      downloadWordReport(payload)
      notify('Laporan Word berhasil dibuat.')
    }
  }

  function printFormalReport() {
    writePrintReport({
      closingBalance: report.closing_balance,
      discrepancyTotal: report.discrepancy_total,
      openingBalance: report.opening_balance,
      periodLabel,
      printedDateLabel: `Tanjungsari, ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date())}`,
      rows: [
        ...report.income_rows.map((row) => ({ credit: row.amount, date: formatDate(row.date), debit: 0, description: row.description, type: 'Kredit' as const })),
        ...report.expense_rows.map((row) => ({ credit: 0, date: formatDate(row.date), debit: row.amount, description: row.description, type: 'Debit' as const })),
      ],
      verifiedDepositCount: report.verified_deposit_count,
    })
    setPage('report-print')
  }

  return (
    <>
      <PageHeader
        action={(
          <div className="button-group">
            <button className="ghost" onClick={printFormalReport}><Icon name="print" />Cetak Laporan Formal</button>
            <button className="ghost" onClick={() => downloadReport('pdf')}><Icon name="download" />PDF</button>
            <button className="primary" onClick={() => downloadReport('word')}><Icon name="download" />Word</button>
          </div>
        )}
        title="Laporan Bulanan"
      />
      <section className="filter-bar compact-filter">
        <select className="input-select compact-select" onChange={(event) => setMonth(event.target.value)} value={month}>
          {MONTHS.map((monthName) => <option key={monthName}>{monthName}</option>)}
        </select>
        <select className="input-select compact-select" onChange={(event) => setYear(event.target.value)} value={year}><option>2026</option><option>2025</option></select>
        <button className="primary small" onClick={() => notify(`Filter laporan ${periodLabel} diterapkan.`)}>Terapkan Filter</button>
      </section>
      <section className="stat-grid four compact-summary-cards">
        <StatCard stat={{ label: 'Saldo Awal', value: formatMoney(report.opening_balance) }} />
        <StatCard stat={{ label: 'Total Pemasukan', value: formatMoney(report.income_total), tone: 'green' }} />
        <StatCard stat={{ label: 'Total Pengeluaran', value: formatMoney(report.expense_total), tone: 'red' }} />
        <StatCard stat={{ label: 'Saldo Akhir', value: formatMoney(report.closing_balance), tone: 'blue' }} />
      </section>
      {report.discrepancy_total !== 0 && (
        <section className="error-panel compact-error">
          <strong>Perhatian</strong>
          <p>Total selisih setoran terverifikasi periode ini: {formatMoney(report.discrepancy_total)} dari {report.verified_deposit_count} setoran.</p>
        </section>
      )}
      {!hasReportRows ? (
        <section className="panel empty-state period-empty-state">
          <h3>Tidak Ada Data Laporan</h3>
          <p>Belum ada transaksi untuk {periodLabel}.</p>
        </section>
      ) : (
        <TableCard title="Mutasi Pemasukan & Pengeluaran">
          <thead><tr><th>Tanggal</th><th>Jenis Mutasi</th><th>Keterangan</th><th>Pemasukan</th><th>Pengeluaran</th></tr></thead>
          <tbody>
            {combinedRows.map((row, index) => row.kind === 'total' ? (
              <tr className="mutation-total-row" key={`total-${row.label}-${index}`}>
                <td colSpan={3}>{row.label}</td>
                <td className={row.income !== '-' ? 'text-credit' : undefined}>{row.income}</td>
                <td className={row.expense !== '-' ? 'text-debit' : undefined}>{row.expense}</td>
              </tr>
            ) : (
              <tr key={`${row.date}-${row.description}-${index}`}>
                <td>{row.date}</td>
                <td>{row.type}</td>
                <td>{row.description}</td>
                <td className={row.income !== '-' ? 'text-credit' : undefined}>{row.income}</td>
                <td className={row.expense !== '-' ? 'text-debit' : undefined}>{row.expense}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  )
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(iso))
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
