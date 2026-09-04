<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; color: #111111; }

  .page { width: 190mm; }
  .page-break { page-break-after: always; }

  .slot-wrap { width: 100%; margin-bottom: 2.5mm; }

  .slip {
    width: 100%;
    border: 1.4px solid #111111;
    border-collapse: collapse;
  }

  .slip-outer-cell { padding: 3mm 4mm 2.5mm; vertical-align: top; }

  .slip-empty { border: 0; }

  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5mm; }
  .header-table td { border: 0; padding: 0; vertical-align: middle; }
  .logo-cell { width: 20mm; }
  .logo-cell img { width: 17mm; height: 17mm; }
  .brand-name { font-size: 15pt; font-weight: bold; letter-spacing: 6px; }
  .brand-sub { font-size: 6.5pt; font-weight: bold; line-height: 1.25; }

  .content-table { width: 100%; border-collapse: collapse; }
  .content-table > tr > td { border: 0; padding: 0; vertical-align: top; }
  .main-col { width: 158mm; }
  .aside-col { width: 32mm; padding-left: 3mm !important; }

  /* Column widths mirror docs/template/KWITANSI PAM SIMAS versi excel.xlsx
     (Nama/Alamat=B+C, Meter Awal/Akhir=D+E, Total Akhir Meter=F, Biaya
     Admin=G — measured from that sheet's actual column widths), not the
     on-screen React preview's own independently-tuned proportions. */
  .col-nama { width: 13%; }
  .col-value { width: 26%; }
  .col-meter { width: 13.5%; }
  .col-total-meter { width: 14%; }
  .col-admin { width: 20.5%; }

  .title-bar {
    border: 1.75pt solid #111111;
    background: #27a9f1;
    text-align: center;
    font-size: 11.5pt;
    font-weight: bold;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    padding: 2.2mm 8px;
    margin-bottom: 0;
  }

  .data-table { width: 100%; border-collapse: collapse; border: 1.75pt solid #111111; table-layout: fixed; }
  .data-table td, .data-table th { border: 0.9pt solid #111111; padding: 1mm 1.2mm; vertical-align: middle; text-align: center; font-size: 7.5pt; }
  .data-table th { font-weight: bold; }
  .data-table .label { font-weight: bold; text-align: center; }
  .data-table .value-left { text-align: left; font-weight: normal; }
  .data-table .total-label { font-weight: bold; }
  .data-table .total-value { font-weight: bold; }

  .notes { margin: 1.5mm 0 0; padding-left: 4.5mm; font-size: 6.3pt; line-height: 1.3; }
  .notes li { margin-bottom: 0.6mm; }

  .stamp-box {
    border: 1.75pt solid #111111;
    border-radius: 5px;
    min-height: 14mm;
    padding: 1.5mm 2mm 1mm;
    text-align: center;
    vertical-align: bottom;
  }
  .stamp-box .stamp-label {
    display: block;
    border-top: 0.9pt solid #111111;
    padding-top: 1mm;
    font-size: 8pt;
    font-weight: normal;
  }

  .sign-block { text-align: center; padding-top: 1.5mm; }
  .sign-date, .sign-title { font-size: 6.5pt; line-height: 1.25; }
  .sign-name { margin-top: 1mm; padding-top: 1mm; border-top: 0.9pt solid #111111; font-size: 8pt; font-weight: bold; }
</style>
</head>
<body>
@foreach ($pages as $pageReceipts)
  <div class="page @if (!$loop->last) page-break @endif">
    @for ($slot = 0; $slot < 3; $slot++)
      <div class="slot-wrap">
        @include('receipts._slot', ['receipt' => $pageReceipts[$slot] ?? null, 'dueDay' => $dueDay, 'lateFee' => $lateFee, 'logoBase64' => $logoBase64])
      </div>
    @endfor
  </div>
@endforeach
</body>
</html>
