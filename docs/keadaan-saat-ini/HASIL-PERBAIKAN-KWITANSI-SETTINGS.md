# Hasil Perbaikan: Konsistensi Kwitansi, Penandatangan Dinamis, dan Pembersihan Dokumentasi

Laporan hasil untuk 6 poin yang dikonfirmasi dari audit "Print/Cetak Performance" dan "Asset/Docs cleanup". Setiap poin berisi: apa yang ditemukan, apa yang diperbaiki, dan bagaimana diverifikasi.

## 1. Inkonsistensi `SLOTS_PER_PAGE` (3 vs 4) — Diperbaiki

**Temuan:** Backend (`ReceiptBatchService::SLOTS_PER_PAGE = 3`) dan frontend (`ReceiptBulkPage.tsx` — `RECEIPTS_PER_PAGE = 4`) memakai jumlah kwitansi per halaman yang berbeda.

**Keputusan nilai yang benar:** 3, bukan 4. Alasannya bukan tebakan — ada 3 bukti yang mengarah ke sana:
- Test yang sudah ada (`ReceiptWorkflowTest`) memakai literal `'template' => 'pamsimas-a4-3-up'` dan mengasersi `slots_per_page === 3`.
- Seeder (`PamsimasSeeder`) menyimpan setting `receipt_format.slots_per_page = 3`.
- Template kwitansi cukup padat kontennya (header logo, tabel data pelanggan+tagihan, catatan, kotak tanda tangan) — lebih cocok di slot ~90mm (3-up) daripada ~67mm (4-up).

**Perbaikan:**
- `fe/src/modules/admin/pages/ReceiptBulkPage.tsx`: `RECEIPTS_PER_PAGE` diubah dari `4` → `3`.
- `fe/src/App.css`: `.receipt-print-page` di versi layar dan versi `@media print` sama-sama diubah dari `grid-template-rows: repeat(4, 1fr)` → `repeat(3, 1fr)`.

## 2. CSS Print (`@media print`) — Klaim di laporan audit tidak akurat

**Temuan:** Laporan audit menyatakan pencarian `@media print` di `fe/src/` menghasilkan "0 hasil". Ini **salah** — aturan `@media print` (termasuk `@page { size: A4; margin: 1cm }` dan penyembunyian sidebar/topbar/filter-bar saat cetak) sudah ada di `fe/src/App.css`, ditambahkan dan diverifikasi lebih awal di sesi kerja ini, termasuk perbaikan agar ukuran preview di layar cocok 100% dengan hasil cetak (sudah dicek langsung lewat pengukuran piksel di browser: 190mm×277mm, padding 0, sama persis dengan aturan print-nya).

**Tindakan:** Tidak ada perubahan tambahan yang diperlukan untuk poin ini.

## 3. Signatory Hardcode → Dipindah ke Pengaturan Sistem — Diperbaiki

**Temuan:** Nama dan jabatan penandatangan kwitansi (`ADE SOPIAN`, `Ketua KPSPAMS TIRTA SARI`) ternyata hardcode di **dua tempat**, bukan cuma satu seperti disebut laporan audit:
1. Backend — `ReceiptBatchService::snapshot()`.
2. Frontend — komponen `ReceiptSlip` di `ReceiptBulkPage.tsx`, yang justru inilah yang benar-benar tampil di preview dan hasil cetak.

**Perbaikan (kedua sisi):**
- Setting baru `receipt_signatory` (pola key-value yang sama seperti `billing_period`/`late_fee` yang sudah ada), dengan default seed di `PamsimasSeeder`.
- Card baru **"Penandatangan Kwitansi"** di halaman Pengaturan Sistem (`AdminUtilityPages.tsx`) — Admin bisa ganti nama & jabatan kapan saja, dengan validasi di `SettingController`.
- `ReceiptBatchService::snapshot()` membaca nilai ini dari `Setting` saat kwitansi **benar-benar dicetak**, lalu membekukannya ke `template_snapshot` — pola yang sama dipakai untuk membekukan nominal tagihan. Artinya kwitansi yang sudah dicetak sebelumnya **tidak berubah retroaktif** kalau nama penandatangan diganti kemudian.
- `ReceiptBulkPage.tsx` mengambil nilai yang sama dari `getSystemSettings()` untuk dipakai di preview/cetak, menggantikan string hardcode di JSX.

**Verifikasi:** Test baru `test_printed_receipt_uses_the_signatory_configured_in_settings` — ganti setting, cetak kwitansi, pastikan `template_snapshot` berisi nama/jabatan yang baru, bukan yang lama. Lolos.

## 4. `docs/archive/` — Dihapus

**Tindakan:** Folder `docs/archive/` (backup Laravel 10 lama, file kerja sementara, config editor lama) dihapus sepenuhnya.

**Pembersihan referensi basi:** 3 tempat yang masih menyebut `docs/archive/` ikut dibersihkan supaya dokumentasi tidak menunjuk ke folder yang sudah tidak ada:
- `docs/README.md` — seksi "1. `archive`" dihapus dari daftar isi, seksi lain di-renumber.
- `docs/keadaan-saat-ini/STRUKTUR-FOLDER-PROYEK.md` — 3 baris referensi (tabel struktur folder, catatan Laravel 10 lama, daftar "tidak boleh diunggah") dihapus/disesuaikan.

## 5. Optimasi Aset (`hero-bg.jpg` → WebP) — Dilewati

Sesuai instruksi eksplisit ("tidak usah dioptimalkan"), poin ini **tidak dikerjakan**. Tidak ada perubahan file.

## 6. Reverb (WebSocket) di cPanel — Klarifikasi, bukan perbaikan kode

**Pertanyaan:** Apakah tanpa Reverb permanen di cPanel, load data harus manual refresh terus?

**Jawaban:** Tidak. Reverb hanya menangani satu hal spesifik: supaya perubahan yang dibuat **user lain** langsung muncul di layar Anda tanpa Anda melakukan apa pun. Semua pemuatan data normal — buka halaman, submit form, lihat tagihan, dan seterusnya — selalu berjalan lewat HTTP API biasa dan **sama sekali tidak bergantung pada Reverb**. Yang hilang tanpa Reverb permanen hanyalah: kalau admin lain mengubah data sementara Anda sedang membuka layar yang sama, Anda perlu refresh sekali untuk melihat perubahan itu — bukan refresh terus-menerus untuk pemakaian sehari-hari.

## Verifikasi Akhir

- `npx tsc -b` (type-check frontend): **lolos, tanpa error**.
- `npm run build` (frontend): **berhasil**.
- `php artisan test` (backend): **26/26 lolos** — 25 test dari batch perbaikan sebelumnya, ditambah 1 test baru (`test_printed_receipt_uses_the_signatory_configured_in_settings`). 1 test lama (`FullstackApiContractTest`) diperbarui payload-nya supaya sesuai validasi `receipt_signatory` yang baru wajib diisi.

## Belum Dikerjakan — Menunggu Konfirmasi

Tiga item di checklist audit yang **tidak** termasuk dalam 6 poin yang dikonfirmasi di atas:

1. Review/kompres isi `docs/template/` (file besar seperti gambar peta 11MB, xlsx 11MB).
2. Konversi `.docx` → `.md` untuk dokumen di `docs/requirement/`.
3. Validasi deployment cPanel sesuai checklist Section 13 `DEPLOYMENT-FULLSTACK.md` — ini butuh server cPanel sungguhan untuk benar-benar dites, tidak bisa disimulasikan dari sini.
