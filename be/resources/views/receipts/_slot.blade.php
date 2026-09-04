@if ($receipt)
  @php
    $data = $receipt->template_snapshot ?? [];
    $usage = (int) ($data['usage'] ?? 0);
    $waterRate = (int) ($data['water_rate'] ?? 0);
    $totalAmount = (int) ($data['bill_amount'] ?? 0);
    $money = fn (int $value) => 'Rp'.number_format($value, 0, ',', '.');
  @endphp
  <table class="slip">
    <tr>
      <td class="slip-outer-cell">
        <table class="header-table">
          <tr>
            <td class="logo-cell"><img src="{{ $logoBase64 }}" alt="Logo"></td>
            <td>
              <div class="brand-name">TIRTA SARI</div>
              <div class="brand-sub">KELOMPOK PENGELOLA SARANA PENYEDIA AIR MINUM (KPSPAMS)</div>
              <div class="brand-sub">DESA TANJUNGSARI, KECAMATAN SUKALUYU</div>
            </td>
          </tr>
        </table>

        <table class="content-table">
          <tr>
            <td class="main-col">
              <div class="title-bar">Tagihan Rekening Air Minum</div>
              <table class="data-table">
                <colgroup>
                  <col class="col-nama"><col class="col-value">
                  <col class="col-meter"><col class="col-meter">
                  <col class="col-total-meter"><col class="col-admin">
                </colgroup>
                <tr>
                  <th colspan="2">Data Pelanggan</th>
                  <th colspan="4">Tagihan</th>
                </tr>
                <tr>
                  <td class="label">Nama Pengguna :</td>
                  <td class="value-left">{{ $data['customer_name'] ?? $receipt->customer_name_snapshot }}</td>
                  <td class="label">Meter Awal :</td>
                  <td class="label">Meter Akhir :</td>
                  <td class="label">Total Akhir Meter :</td>
                  <td class="label">Biaya Admin :</td>
                </tr>
                <tr>
                  <td class="label" rowspan="2">Alamat Pengguna :</td>
                  <td class="value-left" rowspan="2">{{ $data['address'] ?? $receipt->customer_address_snapshot }}</td>
                  <td>{{ $data['previous_meter'] ?? 0 }} m3</td>
                  <td>{{ $data['current_meter'] ?? 0 }} m3</td>
                  <td>{{ $usage }} m3</td>
                  <td>{{ $money((int) ($data['admin_fee'] ?? 0)) }}</td>
                </tr>
                <tr>
                  <td class="total-label" colspan="3">Jumlah Tagihan : ({{ $usage }} m3 x {{ $money($waterRate) }})</td>
                  <td class="total-value">{{ $money($totalAmount) }}</td>
                </tr>
              </table>
              <ol class="notes">
                <li>Dengan mengajukan keberatan tidak berarti bahwa kewajiban membayar jumlah tagihan tersebut dapat ditangguhkan.</li>
                <li>Apabila pembayaran lebih dari tanggal {{ $dueDay }} maka dikenakan <b>denda administrasi</b> {{ $money((int) $lateFee) }},-</li>
                <li>Pelanggan yang <b>menunggak</b> selama dua bulan (2 Bulan) akan diputus sementara sampai dilakukan pembayaran.</li>
              </ol>
            </td>
            <td class="aside-col">
              <div class="stamp-box"><span class="stamp-label">Bukti Cap</span></div>
              <div class="sign-block">
                <div class="sign-date">Tanjungsari, {{ $data['month_label'] ?? '' }}</div>
                <div class="sign-title">{{ $data['signatory_title'] ?? 'Ketua KPSPAMS TIRTA SARI' }}</div>
                <div class="sign-name">{{ $data['signatory_name'] ?? 'ADE SOPIAN' }}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
@else
  <table class="slip slip-empty"><tr><td class="slip-outer-cell">&nbsp;</td></tr></table>
@endif
