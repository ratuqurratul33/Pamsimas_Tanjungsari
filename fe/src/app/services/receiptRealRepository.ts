import { apiRequest, apiRequestBlob, createIdempotencyKey, type LaravelPaginator } from './apiClient'
import type { Receipt } from './receiptMockRepository'

type LaravelOfficer = { id: number; name: string }
type LaravelReceipt = {
  admin_fee: number | null
  bill_amount: number | null
  customer_address: string
  customer_code: string | null
  customer_id: number
  customer_name: string
  id: number
  meter_end: number | null
  meter_reading_id: number | null
  meter_start: number | null
  meter_usage: number | null
  officer_id: number
  officer_name: string
  period: string
  printed_at: string | null
  receipt_number: string
  status: 'queued' | 'printed' | 'cancelled'
  water_rate: number | null
}

type ReceiptBatch = {
  empty_slots: number
  has_pdf: boolean
  id: number
  page_count: number
  receipt_count: number
  receipts: LaravelReceipt[]
  slots_per_page: number
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export const receiptRealRepository = {
  async listOfficerNames(): Promise<string[]> {
    const officers = (await apiRequest<LaravelPaginator<LaravelOfficer>>('/admin/officers?per_page=100')).data
    return officers.map((officer) => officer.name)
  },

  async listReceipts(period: string, officerName?: string): Promise<Receipt[]> {
    const officers = (await apiRequest<LaravelPaginator<LaravelOfficer>>('/admin/officers?per_page=100')).data
    const officer = officerName ? officers.find((item) => item.name === officerName) : undefined
    const params = new URLSearchParams({ per_page: '100', period })
    if (officer) params.set('officer_id', String(officer.id))
    const receipts = (await apiRequest<LaravelPaginator<LaravelReceipt>>(`/admin/receipts?${params}`)).data

    return receipts.map(mapReceipt)
  },

  async markPrinted(receipts: Receipt[], period: string): Promise<{ batchId: number | null; receipts: Receipt[] }> {
    if (receipts.length === 0) return { batchId: null, receipts: [] }
    const officerId = receipts[0]?.officer_id
    if (!officerId || receipts.some((receipt) => receipt.officer_id !== officerId)) {
      throw new Error('Satu batch cetak hanya boleh berisi kwitansi dari satu petugas.')
    }

    const response = await apiRequest<{ data: ReceiptBatch }>('/admin/receipts/batches', {
      body: JSON.stringify({
        include_empty_slots: true,
        officer_id: officerId,
        period,
        receipt_ids: receipts.map((receipt) => Number(receipt.id)),
        template: 'pamsimas-a4-3-up',
      }),
      idempotencyKey: createIdempotencyKey('receipt-batch'),
      method: 'POST',
    })

    return {
      batchId: response.data.has_pdf ? response.data.id : null,
      receipts: response.data.receipts.map(mapReceipt),
    }
  },

  // PDF is served through an authenticated endpoint, not a public storage
  // URL (see ReceiptController::downloadPdf) — it carries every receipt's
  // name, address and billing amount for the batch. The auth is a per-request
  // Bearer token, so this fetches the bytes with that header rather than
  // pointing the browser straight at the API URL.
  async downloadBatchPdf(batchId: number): Promise<Blob> {
    return apiRequestBlob(`/admin/receipts/batches/${batchId}/pdf`)
  },

  async updateReceiptMeter(customerId: string, period: string, previousMeter: number, currentMeter: number): Promise<Receipt> {
    const receipt = (await this.listReceipts(period)).find((item) => item.customer_id === customerId)
    if (!receipt?.meter_reading_id) throw new Error('Meter belum diinput petugas dan belum dapat dikoreksi admin.')
    await apiRequest(`/admin/meter-readings/${receipt.meter_reading_id}`, {
      body: JSON.stringify({ current_meter: currentMeter, previous_meter: previousMeter }),
      method: 'PATCH',
    })
    const updated = (await this.listReceipts(period)).find((item) => item.customer_id === customerId)
    if (!updated) throw new Error('Kwitansi tidak ditemukan setelah koreksi meter.')
    return updated
  },
}

function mapReceipt(receipt: LaravelReceipt): Receipt {
  const [year, month] = receipt.period.split('-').map(Number)
  return {
    address: receipt.customer_address,
    admin_fee: Number(receipt.admin_fee ?? 0),
    current_meter: Number(receipt.meter_end ?? 0),
    customer_id: receipt.customer_code ?? String(receipt.customer_id),
    customer_name: receipt.customer_name,
    id: String(receipt.id),
    meter_reading_id: receipt.meter_reading_id ?? undefined,
    officer_id: receipt.officer_id,
    officer_name: receipt.officer_name,
    period: receipt.period,
    period_label: `${MONTHS[(month || 1) - 1]} ${year}`,
    previous_meter: Number(receipt.meter_start ?? 0),
    printed: receipt.status === 'printed',
    printed_at: receipt.printed_at,
    receipt_number: receipt.receipt_number,
    total_amount: Number(receipt.bill_amount ?? 0),
    usage: Number(receipt.meter_usage ?? 0),
    water_rate: Number(receipt.water_rate ?? 2500),
  }
}
