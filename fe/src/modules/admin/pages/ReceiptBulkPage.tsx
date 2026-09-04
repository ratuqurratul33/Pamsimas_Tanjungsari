import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { appEnvironment } from '../../../app/config/environment'
import { receiptRepository, type Receipt } from '../../../app/services/receiptRepository'
import { getSystemSettings } from '../services/adminApi'
import type { SetPage } from '../../../types'
import pamsimasLogo from '../../../assets/logo-pamsimas.png'

// Must match ReceiptBatchService::SLOTS_PER_PAGE on the backend — the batch's
// page_count/slots_per_page are computed there, so a mismatch here means the
// physical printed sheets don't match what the batch record says was printed.
const RECEIPTS_PER_PAGE = 3
const PRINT_STORAGE_KEY = 'pamsimas-print-receipts'

type PrintReceipt = {
  address: string
  customerId: string
  customerName: string
  invoice: string
  month: string
  officer: string
  previousMeter: number
  currentMeter: number
  usage: number
  waterRate: number
  adminFee: number
  totalAmount: number
  period: string
  source: Receipt
}

export function ReceiptBulkPage({ notify, setPage }: { notify: (message: string) => void; setPage: SetPage }) {
  const receipts = useMemo(() => readPrintReceipts(), [])
  const pages = useMemo(() => chunkReceipts(receipts, RECEIPTS_PER_PAGE), [receipts])
  const officerLabel = receipts[0]?.officer ?? '-'
  const monthLabel = getMonthLabel(receipts)
  const [isPrinted, setIsPrinted] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [dueDay, setDueDay] = useState(25)
  const [lateFee, setLateFee] = useState(2000)
  const [signatoryName, setSignatoryName] = useState('ADE SOPIAN')
  const [signatoryTitle, setSignatoryTitle] = useState('Ketua KPSPAMS TIRTA SARI')

  useEffect(() => {
    void getSystemSettings().then((settings) => {
      setDueDay(Number(settings.dueDate) || 25)
      setLateFee(Number(settings.lateFee) || 2000)
      setSignatoryName(settings.signatoryName || 'ADE SOPIAN')
      setSignatoryTitle(settings.signatoryTitle || 'Ketua KPSPAMS TIRTA SARI')
    }).catch(() => undefined)
  }, [])

  // Kwitansi is rendered server-side straight from a Blade view via dompdf
  // (pure PHP, no external process — see ReceiptPdfService on the backend)
  // and handed back as a real PDF file, so it renders identically regardless
  // of the officer's browser, OS, or printer. The preview below stays on
  // screen only as a reference — it's not what gets printed. Mock mode has
  // no backend to render that PDF at all, so it intentionally falls back to
  // window.print() of this preview; in real mode, a missing PDF means
  // generation genuinely failed and must be surfaced, not silently
  // downgraded to that same fallback (which is known to be unreliable —
  // blank pages / wrong paper size on some print pipelines).
  async function handlePrint() {
    if (receipts.length === 0) {
      notify('Tidak ada kwitansi fisik yang siap dicetak.')
      return
    }

    const period = receipts[0]?.period
    if (!period) return

    setIsPrinting(true)
    try {
      const { batchId } = await receiptRepository.markPrinted(receipts.map((receipt) => receipt.source), period)
      setIsPrinted(true)

      if (batchId) {
        // The PDF endpoint requires the same Bearer-token auth as every
        // other API call, so it's fetched as a blob (not window.open'd
        // directly at the API URL, which can't carry that header) and
        // opened from an in-memory object URL instead.
        const blob = await receiptRepository.downloadBatchPdf(batchId)
        const objectUrl = URL.createObjectURL(blob)
        window.open(objectUrl, '_blank', 'noopener')
        notify(`${receipts.length} kwitansi dicetak. PDF dibuka di tab baru untuk dicetak.`)
      } else if (appEnvironment.useMockApi) {
        window.print()
        notify(`${receipts.length} kwitansi ditandai sudah dicetak.`)
      } else {
        notify('Kwitansi tercatat sudah dicetak, tapi PDF gagal dibuat di server. Coba cetak ulang dari daftar kwitansi, atau hubungi teknis jika terus gagal.')
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Kwitansi gagal dicetak.')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <>
      <PageHeader
        action={(
          <div className="button-group">
            <button className="ghost" onClick={() => setPage('receipts')}>
              <Icon name="back" />
              Kembali
            </button>
            <button className="primary" disabled={receipts.length === 0 || isPrinting || isPrinted} onClick={handlePrint}>
              <Icon name="print" />
              {isPrinting ? 'Membuat PDF...' : isPrinted ? 'Sudah Dicetak' : 'Cetak Sekarang'}
            </button>
          </div>
        )}
        subtitle="Periksa data meter dan nominal pada template. PDF kwitansi dibuat di server dari template Excel asli, lalu dibuka di tab baru untuk dicetak."
        title="Cetak Kwitansi Fisik"
      />

      {receipts.length === 0 ? (
        <section className="panel empty-state">
          <span className="stat-icon"><Icon name="receipt" /></span>
          <h3>Belum Ada Data Cetak</h3>
          <p>Silakan kembali ke daftar kwitansi, pilih tagihan dari petugas yang sama, lalu cetak langsung.</p>
          <button className="primary small" onClick={() => setPage('receipts')}>Kembali ke Daftar</button>
        </section>
      ) : (
        <>
          <section className="receipt-batch-summary panel">
            <div className="receipt-batch-summary__item">
              <span>Total Kwitansi</span>
              <strong>{receipts.length}</strong>
            </div>
            <div className="receipt-batch-summary__item">
              <span>Petugas</span>
              <strong>{officerLabel}</strong>
            </div>
            <div className="receipt-batch-summary__item">
              <span>Bulan Cetak</span>
              <strong>{monthLabel}</strong>
            </div>
            <div className="receipt-batch-summary__item">
              <span>Halaman Cetak</span>
              <strong>{pages.length}</strong>
            </div>
          </section>

          <section className="receipt-print-pages" aria-label="Kwitansi siap cetak">
            {pages.map((pageReceipts, pageIndex) => (
              <article className="receipt-print-page" key={`page-${pageIndex}`}>
                {padToPage(pageReceipts).map((receipt, slotIndex) => (
                  receipt ? (
                    <ReceiptSlip
                      address={receipt.address}
                      adminFee={receipt.adminFee}
                      currentMeter={receipt.currentMeter}
                      customerName={receipt.customerName}
                      dueDay={dueDay}
                      key={receipt.invoice}
                      lateFee={lateFee}
                      month={receipt.month}
                      previousMeter={receipt.previousMeter}
                      signatoryName={signatoryName}
                      signatoryTitle={signatoryTitle}
                      totalAmount={receipt.totalAmount}
                      usage={receipt.usage}
                      waterRate={receipt.waterRate}
                    />
                  ) : (
                    <div className="receipt-slip receipt-slip--empty" aria-hidden="true" key={`empty-${pageIndex}-${slotIndex}`} />
                  )
                ))}
              </article>
            ))}
          </section>

        </>
      )}
    </>
  )
}

function ReceiptSlip({
  address,
  adminFee,
  currentMeter,
  customerName,
  dueDay,
  lateFee,
  month,
  previousMeter,
  signatoryName,
  signatoryTitle,
  totalAmount,
  usage,
  waterRate,
}: {
  address: string
  adminFee: number
  currentMeter: number
  customerName: string
  dueDay: number
  lateFee: number
  month: string
  previousMeter: number
  signatoryName: string
  signatoryTitle: string
  totalAmount: number
  usage: number
  waterRate: number
}) {
  return (
    <article className="receipt-slip">
      <header className="receipt-slip__header">
        <img alt="Logo KPSPAMS Tirta Sari" className="receipt-slip__logo" src={pamsimasLogo} />
        <div className="receipt-slip__brand-copy">
          <strong>TIRTA SARI</strong>
          <span>KELOMPOK PENGELOLA SARANA PENYEDIA AIR MINUM (KPSPAMS)</span>
          <span>DESA TANJUNGSARI, KECAMATAN SUKALUYU</span>
        </div>
      </header>

      <div className="receipt-slip__content">
        <section className="receipt-slip__main">
          <div className="receipt-slip__title">TAGIHAN REKENING AIR MINUM</div>

          <table className="receipt-slip__table">
            {/* Mirrors docs/template/KWITANSI PAM SIMAS versi excel.xlsx's own
                column widths (and be/resources/views/receipts/_slot.blade.php,
                the server PDF template) rather than an independent guess, so
                this preview and the printed PDF stay proportioned alike. */}
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '13.5%' }} />
              <col style={{ width: '13.5%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <tbody>
              <tr>
                <th colSpan={2}>Data Pelanggan</th>
                <th colSpan={4}>Tagihan</th>
              </tr>
              <tr>
                <td className="cell-label">Nama Pengguna :</td>
                <td className="cell-value">{customerName}</td>
                <td className="cell-label">Meter Awal :</td>
                <td className="cell-label">Meter Akhir :</td>
                <td className="cell-label">Total Akhir Meter :</td>
                <td className="cell-label">Biaya Admin :</td>
              </tr>
              <tr>
                <td className="cell-label cell-label--tall" rowSpan={2}>Alamat Pengguna :</td>
                <td className="cell-value cell-value--tall" rowSpan={2}>{address}</td>
                <td className="cell-value">{previousMeter} m3</td>
                <td className="cell-value">{currentMeter} m3</td>
                <td className="cell-value">{usage} m3</td>
                <td className="cell-value">{formatMoney(adminFee)}</td>
              </tr>
              <tr>
                <td className="cell-total" colSpan={3}>
                  <strong>Jumlah Tagihan :</strong>
                  <span>({usage} m3 x {formatMoney(waterRate)})</span>
                </td>
                <td className="cell-total-value">{formatMoney(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          <ol className="receipt-slip__notes">
            <li>Dengan mengajukan keberatan tidak berarti bahwa kewajiban membayar jumlah tagihan tersebut dapat ditangguhkan.</li>
            <li>Apabila pembayaran lebih dari tanggal {dueDay} maka dikenakan <strong>denda administrasi</strong> {formatMoney(lateFee)},-</li>
            <li>Pelanggan yang <strong>menunggak</strong> selama dua bulan (2 Bulan) akan diputus sementara sampai dilakukan pembayaran.</li>
          </ol>
        </section>

        <aside className="receipt-slip__side">
          <div className="receipt-slip__stamp-box">
            <span>Bukti Cap</span>
          </div>
          <div className="receipt-slip__sign-block">
            <div className="receipt-slip__sign-date">Tanjungsari, {month}</div>
            <div className="receipt-slip__sign-title">{signatoryTitle}</div>
            <div className="receipt-slip__sign-name">{signatoryName}</div>
          </div>
        </aside>
      </div>
    </article>
  )
}

function formatMoney(value: number) {
  return `Rp${value.toLocaleString('id-ID')}`
}

function readPrintReceipts() {
  try {
    const raw = sessionStorage.getItem(PRINT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PrintReceipt[]) : []
  } catch {
    return []
  }
}

function chunkReceipts(receipts: PrintReceipt[], size: number) {
  const chunks: PrintReceipt[][] = []

  for (let index = 0; index < receipts.length; index += size) {
    chunks.push(receipts.slice(index, index + size))
  }

  return chunks
}

function padToPage(receipts: PrintReceipt[]) {
  return Array.from({ length: RECEIPTS_PER_PAGE }, (_, index) => receipts[index] ?? null)
}

function getMonthLabel(receipts: PrintReceipt[]) {
  if (receipts.length === 0) {
    return '-'
  }

  const uniqueMonths = Array.from(new Set(receipts.map((receipt) => receipt.month)))
  return uniqueMonths.length === 1 ? uniqueMonths[0] ?? '-' : 'Campuran'
}
