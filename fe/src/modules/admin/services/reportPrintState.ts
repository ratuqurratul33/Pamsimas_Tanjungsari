const PRINT_STORAGE_KEY = 'pamsimas-print-report'

type ReportMutationRow = {
  credit: number
  date: string
  debit: number
  description: string
  type: 'Kredit' | 'Debit'
}

export type PrintReportPayload = {
  closingBalance: number
  discrepancyTotal: number
  openingBalance: number
  periodLabel: string
  printedDateLabel: string
  rows: ReportMutationRow[]
  verifiedDepositCount: number
}

export function writePrintReport(payload: PrintReportPayload) {
  sessionStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(payload))
}

export function readPrintReport(): PrintReportPayload | null {
  try {
    const raw = sessionStorage.getItem(PRINT_STORAGE_KEY)
    return raw ? JSON.parse(raw) as PrintReportPayload : null
  } catch {
    return null
  }
}
