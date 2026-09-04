<?php

namespace App\Services;

use App\Models\ReceiptBatch;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Renders kwitansi batches to PDF from a Blade view (resources/views/receipts)
 * via dompdf — pure PHP, no external process or binary. Replaces the earlier
 * Excel-template + LibreOffice-headless pipeline, which could never run on
 * shared/cPanel hosting (no persistent process, no way to install LibreOffice
 * there) and, before that, the client-side window.print() flow, which
 * rasterized the DOM in-browser and produced blank pages / wrong paper size
 * on some print pipelines because the capture raced page layout. Rendering
 * a real PDF from the same Blade view on every request is deterministic
 * regardless of the officer's device, browser, or hosting environment.
 */
class ReceiptPdfService
{
    private const SLOTS_PER_PAGE = 3;

    public function generateForBatch(ReceiptBatch $batch): string
    {
        $batch->loadMissing(['receipts.customer', 'receipts.bill.meterReading']);

        $dueDay = (int) (data_get(Setting::query()->where('key', 'billing_period')->value('value'), 'due_day') ?? 25);
        $lateFee = (float) (Setting::query()->where('key', 'late_fee')->value('value') ?? 2000);

        $pages = $batch->receipts->values()
            ->chunk(self::SLOTS_PER_PAGE)
            ->map(fn ($chunk) => $chunk->values()->all())
            ->all();

        $pdfContent = Pdf::loadView('receipts.batch-pdf', [
            'dueDay' => $dueDay,
            'lateFee' => $lateFee,
            'logoBase64' => $this->logoBase64(),
            'pages' => $pages,
        ])->setPaper('a4', 'portrait')->output();

        $relativePath = "receipts/{$batch->batch_number}.pdf";
        // Deliberately the "local" disk, not "public": these PDFs carry
        // every printed customer's name, address and billing amount for the
        // batch. "public" is symlinked straight into the webserver's
        // document root, so anything stored there is served with zero auth
        // to anyone who requests the URL — and batch_number is a sequential,
        // guessable id (BATCH-YYYY-MM-000123), not a secret token.
        // ReceiptController::downloadPdf() is the only path back to this
        // file, gated by the same auth:sanctum + role:admin middleware as
        // the rest of /admin.
        Storage::disk('local')->put($relativePath, $pdfContent);

        return $relativePath;
    }

    private function logoBase64(): string
    {
        $path = resource_path('images/logo-pamsimas.png');

        return 'data:image/png;base64,'.base64_encode(file_get_contents($path));
    }
}
