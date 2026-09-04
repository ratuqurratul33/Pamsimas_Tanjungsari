import { appEnvironment } from '../config/environment'
import * as mock from './receiptMockRepository'
import { receiptRealRepository } from './receiptRealRepository'

export type { Receipt } from './receiptMockRepository'

export const receiptRepository = appEnvironment.useMockApi ? {
  async listOfficerNames() { return mock.listOfficerNames() },
  async listReceipts(period: string, officerName?: string) { return mock.listReceipts(period, officerName) },
  async markPrinted(receipts: mock.Receipt[], period: string) {
    // No backend in mock mode to render a server-side PDF, so there is
    // nothing to hand back here — ReceiptBulkPage falls back to
    // window.print() when batchId is null.
    return { batchId: null, receipts: mock.markPrinted(receipts.map((receipt) => receipt.customer_id), period) }
  },
  async downloadBatchPdf(): Promise<Blob> {
    throw new Error('PDF kwitansi server tidak tersedia di mode mock.')
  },
  async updateReceiptMeter(customerId: string, period: string, previousMeter: number, currentMeter: number) { return mock.updateReceiptMeter(customerId, period, previousMeter, currentMeter) },
} : receiptRealRepository
