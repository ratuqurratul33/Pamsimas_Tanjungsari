export type ReportCell = string | number | { colSpan?: number; content: string | number }
export type ReportRow = ReportCell[]

function cellHtml(cell: ReportCell) {
  if (typeof cell === 'object') {
    return `<td${cell.colSpan ? ` colspan="${cell.colSpan}"` : ''}>${cell.content}</td>`
  }

  return `<td>${cell}</td>`
}

export function downloadWordReport({
  fileName,
  meta,
  rows,
  title,
}: {
  fileName: string
  meta: string[]
  rows: ReportRow[]
  title: string
}) {
  const tableRows = rows
    .map((row) => `<tr>${row.map(cellHtml).join('')}</tr>`)
    .join('')
  const metaRows = meta.map((item) => `<p>${item}</p>`).join('')
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
          h1 { font-size: 20px; margin-bottom: 6px; }
          p { margin: 2px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border: 1px solid #9ca3af; padding: 8px; text-align: left; }
          th { background: #eaf4fb; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${metaRows}
        <table>${tableRows}</table>
      </body>
    </html>
  `
  const blob = new Blob([html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function printPdfReport() {
  window.print()
}

export async function downloadPdfReport({
  fileName,
  meta,
  rows,
  title,
}: {
  fileName: string
  meta: string[]
  rows: ReportRow[]
  title: string
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const [head = [], ...body] = rows
  const periodMeta = meta.find((item) => item.toLowerCase().startsWith('periode'))?.replace(/^Periode:\s*/i, '') ?? 'BULAN / TRIWULAN / TAHUN'

  document.setFont('times', 'bold')
  document.setFontSize(12)
  document.text('PEMERINTAH KABUPATEN CIANJUR KECAMATAN', 105, 12, { align: 'center' })
  document.text('SUKALUYU', 105, 18, { align: 'center' })
  document.text('KANTOR KEPALA DESA TANJUNGSARI', 105, 25, { align: 'center' })
  document.text('BADAN PENGELOLA PAMSIMAS "TIRTA SARI"', 105, 32, { align: 'center' })
  document.setFontSize(9)
  document.setFont('times', 'normal')
  document.text('Sekretariat: Kantor Desa Tanjungsari, Jawa Barat', 105, 40, { align: 'center' })
  document.setLineWidth(0.5)
  document.line(18, 47, 192, 47)
  document.setLineWidth(0.15)
  document.line(18, 49, 192, 49)

  document.setFont('times', 'bold')
  document.setFontSize(11)
  document.text(title.toUpperCase(), 105, 62, { align: 'center' })
  document.text('PERIODE', 92, 68, { align: 'right' })
  document.text(periodMeta.toUpperCase(), 95, 68)
  document.setTextColor(17, 24, 39)
  document.setFont('times', 'normal')
  document.setFontSize(11)
  document.text('Berdasarkan rekapitulasi data administrasi dan keuangan Badan Pengelola PAMSIMAS Desa', 18, 82)
  document.text('Tanjungsari, berikut adalah rincian laporan:', 18, 89)

  autoTable(document, {
    body,
    head: [head],
    margin: { left: 18, right: 18 },
    startY: 104,
    styles: {
      cellPadding: 2.3,
      font: 'times',
      fontSize: 11,
      lineColor: [150, 163, 180],
      lineWidth: 0.1,
      textColor: [17, 24, 39],
    },
    headStyles: {
      fillColor: [245, 245, 245],
      fontStyle: 'bold',
      fontSize: 11,
      textColor: [17, 24, 39],
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didDrawPage: () => {
      const pageHeight = document.internal.pageSize.height
      document.setFont('times', 'normal')
      document.setTextColor(17, 24, 39)
      document.setFontSize(11)
      document.text('Demikian laporan ini disusun untuk diketahui dan dipergunakan sebagaimana mestinya.', 18, pageHeight - 16)
      document.setTextColor(17, 24, 39)
      document.setFontSize(9)
      document.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 192, pageHeight - 8, { align: 'right' })
    },
  })

  document.save(fileName)
}
