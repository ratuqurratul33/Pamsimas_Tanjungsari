import { useEffect, useMemo } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import type { SetPage } from '../../../types'
import { readPrintReport } from '../services/reportPrintState'

export function ReportPrintPage({ notify, setPage }: { notify: (message: string) => void; setPage: SetPage }) {
  const report = useMemo(() => readPrintReport(), [])

  useEffect(() => {
    if (!report) return
    const timer = window.setTimeout(() => window.print(), 120)
    return () => window.clearTimeout(timer)
  }, [report])

  function handlePrint() {
    if (!report) {
      notify('Tidak ada data laporan yang siap dicetak.')
      return
    }
    window.print()
  }

  if (!report) {
    return (
      <>
        <PageHeader title="Cetak Laporan Formal" />
        <section className="panel empty-state">
          <span className="stat-icon"><Icon name="receipt" /></span>
          <h3>Belum Ada Laporan untuk Dicetak</h3>
          <p>Silakan kembali ke halaman Laporan Bulanan, atur periode, lalu klik "Cetak Laporan Formal".</p>
          <button className="primary small" onClick={() => setPage('reports')}>Kembali ke Laporan</button>
        </section>
      </>
    )
  }

  const totalDebit = report.rows.reduce((total, row) => total + row.debit, 0)
  const totalCredit = report.rows.reduce((total, row) => total + row.credit, 0)

  return (
    <>
      <PageHeader
        action={(
          <div className="button-group">
            <button className="ghost" onClick={() => setPage('reports')}>
              <Icon name="back" />
              Kembali
            </button>
            <button className="primary" onClick={handlePrint}>
              <Icon name="print" />
              Cetak Sekarang
            </button>
          </div>
        )}
        subtitle="Tampilan mengikuti Template_Laporan_Formal_PAMSIMAS_Desa, ukuran kertas A4."
        title="Cetak Laporan Formal"
      />

      <section className="report-print-pages">
        <article className="report-print-page">
          <header className="report-print-header">
            <p>PEMERINTAH KABUPATEN BANDUNG KECAMATAN SUKALUYU</p>
            <h1>KANTOR KEPALA DESA TANJUNGSARI</h1>
            <p>BADAN PENGELOLA PAMSIMAS &quot;TIRTA SARI&quot;</p>
            <p>Sekretariat: Kantor Desa Tanjungsari, Jawa Barat</p>
          </header>

          <div className="report-print-title">
            <h2>LAPORAN KEUANGAN DAN OPERASIONAL PAMSIMAS</h2>
            <h2>PERIODE {report.periodLabel.toUpperCase()}</h2>
          </div>

          <p className="report-print-intro">
            Berdasarkan rekapitulasi data administrasi dan keuangan Badan Pengelola PAMSIMAS Desa Tanjungsari, berikut adalah rincian laporan:
          </p>

          <table className="report-print-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Jenis Mutasi</th>
                <th>Uraian Keterangan</th>
                <th>Debit (Rp)</th>
                <th>Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, index) => (
                <tr key={`${row.date}-${row.description}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{row.date}</td>
                  <td>{row.type}</td>
                  <td className="report-print-table__desc">{row.description}</td>
                  <td>{row.debit > 0 ? formatMoney(row.debit) : '-'}</td>
                  <td>{row.credit > 0 ? formatMoney(row.credit) : '-'}</td>
                </tr>
              ))}
              <tr className="report-print-table__total">
                <td colSpan={4}>TOTAL</td>
                <td>{formatMoney(totalDebit)}</td>
                <td>{formatMoney(totalCredit)}</td>
              </tr>
            </tbody>
          </table>

          <p className="report-print-balance">
            <strong>Sisa Uang (Saldo Akhir):</strong> {formatMoney(report.closingBalance)}
            <span> — Saldo Awal Periode: {formatMoney(report.openingBalance)}</span>
          </p>

          {report.discrepancyTotal !== 0 && (
            <p className="report-print-balance">
              <strong>Catatan Selisih Setoran:</strong> {formatMoney(report.discrepancyTotal)} dari {report.verifiedDepositCount} setoran terverifikasi pada periode ini.
            </p>
          )}

          <p className="report-print-closing">
            Demikian laporan ini disusun untuk diketahui dan dipergunakan sebagaimana mestinya.
          </p>

          <div className="report-print-signatures">
            <div className="report-print-signature">
              <p>Mengetahui,</p>
              <p>Kepala Desa Tanjungsari</p>
              <div className="report-print-signature__space" />
              <p>( ........................................ )</p>
            </div>
            <div className="report-print-signature">
              <p>{report.printedDateLabel}</p>
              <p>Ketua Pengurus PAMSIMAS</p>
              <div className="report-print-signature__space" />
              <p>( ........................................ )</p>
            </div>
          </div>
        </article>
      </section>
    </>
  )
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
