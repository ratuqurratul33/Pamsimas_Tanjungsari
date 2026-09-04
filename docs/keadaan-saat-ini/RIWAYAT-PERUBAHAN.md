# Riwayat Perubahan (Sesi Perbaikan Terkini)

Dokumen ini mendaftar **persis file mana saja yang berubah**, dikelompokkan per topik perbaikan, dalam urutan pengerjaan. Setiap baris menyebut path file dan jenis perubahannya (baru/diedit/dihapus) beserta alasan singkat.

## 1. Verifikasi Lazy Loading & Duplicate Key Dashboard

| File | Jenis | Perubahan |
|---|---|---|
| `fe/src/modules/admin/pages/DusunDetailPage.tsx` | Diedit | Memindahkan `import { useEffect, useState } from 'react'` yang tadinya nyasar di bawah komponen ke bagian atas file bersama import lain (kosmetik, tidak mengubah perilaku). |

Tidak ada bug duplicate-key atau lazy-loading yang hilang — sudah diverifikasi `React.lazy()`/`Suspense` di `fe/src/App.tsx` dan `key={activity.id ?? ...}` di `DashboardPage.tsx` sudah benar sejak awal.

## 2. Redesain Fitur Pengeluaran (hapus alur posting/void, tambah Edit)

| File | Jenis | Perubahan |
|---|---|---|
| `be/app/Http/Controllers/Api/Admin/ExpenseController.php` | Diedit | Tambah method `update()`. |
| `be/app/Services/ExpenseService.php` | Diedit | Tambah method `update()` — menyesuaikan saldo kas sebesar delta nominal, menolak kalau saldo jadi negatif. |
| `be/app/Http/Requests/Api/Admin/UpdateExpenseRequest.php` | **Baru** | Validasi request edit pengeluaran. |
| `be/routes/api.php` | Diedit | `apiResource('/expenses', ...)` menambahkan `update` ke daftar action yang diizinkan. |
| `be/app/Http/Controllers/Api/Publik/TransparencyController.php` | Diedit | Cast `amount` ke `(int) round((float) ...)` — memperbaiki bug tampilan/total pengeluaran publik akibat `decimal:2` yang diserialize sebagai string oleh Eloquent. |
| `be/tests/Feature/ExpenseEditTest.php` | **Baru** | 2 test: edit nominal menyesuaikan saldo kas, edit yang melebihi saldo ditolak. |
| `fe/src/modules/admin/pages/ExpensesPage.tsx` | Diedit (besar) | Hapus tombol Posting/Batalkan/Posting Ulang dan kolom Status; tambah modal `EditExpenseModal` + tombol Edit per baris. |
| `fe/src/app/services/financeMockRepository.ts` | Diedit | Tambah `updateExpense()` untuk mode simulasi. |
| `fe/src/app/services/financeRepository.ts` | Diedit | Daftarkan `updateExpense` di dispatcher mock/real. |
| `fe/src/app/services/financeRealRepository.ts` | Diedit | Tambah `updateExpense()` (PATCH via FormData). |
| `fe/src/app/services/transparencyRepository.ts` | Diedit | `mapTransparency()` membungkus `amount` dengan `Number(...)` — perbaikan sisi FE untuk bug yang sama seperti di atas. |

**Perbaikan data langsung di database** (bukan perubahan file, dengan otorisasi eksplisit): 2 pengeluaran yang nyangkut status `voided` dari pengujian sebelumnya dikembalikan ke `posted`, saldo `cash_accounts` dikoreksi sebesar Rp125.000.

## 3. Perbaikan Sesi Login, Rate Limit, dan N+1 Query

| File | Jenis | Perubahan |
|---|---|---|
| `be/app/Providers/RouteServiceProvider.php` | Diedit | Rate limiter `api`: dari default 60/menit → dipisah **500/menit** untuk user login (per user ID), **120/menit** untuk publik (per IP). |
| `be/app/Http/Middleware/EnsureTokenNotIdle.php` | **Baru** | Menegakkan batas idle 60 menit di sisi backend (sliding, bukan hard cutoff) — mencabut token Sanctum yang menganggur >60 menit. |
| `be/app/Http/Kernel.php` | Diedit | Mendaftarkan `EnsureTokenNotIdle::class` di awal grup middleware `api`, sebelum `auth:sanctum` route-level. |
| `fe/src/app/services/apiClient.ts` | Diedit | Penanganan `401` disamakan dengan `403` yang sudah ada — sesi langsung dibersihkan & redirect ke login. |
| `be/app/Support/FieldCustomerPresenter.php` | Diedit | Menghapus 2 query per pelanggan (bill + meterReadings) yang tadinya jalan di dalam loop; sekarang memakai data yang sudah di-eager-load, plus parameter `$period` opsional agar `Setting::billing_period` tidak di-query ulang per baris. |
| `be/app/Http/Controllers/Api/Petugas/CustomerController.php` | Diedit | Eager-load `meterReadings.bill.payments.deposit` sekali per halaman; resolve `billing_period` sekali lalu dioper ke presenter. |
| `be/tests/Feature/EnsureTokenNotIdleTest.php` | **Baru** | 3 test: token idle >60 menit ditolak & dihapus, idle <60 menit masih jalan, token baru tidak dianggap idle. |
| `be/tests/Feature/PetugasCustomerListQueryCountTest.php` | **Baru** | Regresi N+1: jumlah query untuk daftar 100 pelanggan harus flat (<20), bukan ikut membesar. |

## 4. Perbaikan Preview & Cetak Kwitansi (kesalahan margin A4)

| File | Jenis | Perubahan |
|---|---|---|
| `fe/src/App.css` | Diedit | Aturan layar (non-print) `.receipt-print-page` (baris ±957) disamakan persis dengan aturan `@media print`-nya (190mm×277mm, padding 0) — sebelumnya versi layar masih pakai ukuran lama (210mm×297mm) sehingga preview tidak sama dengan hasil cetak. |

`@media print` itu sendiri (hide sidebar, `@page { size: A4; margin: 1cm }`) **sudah ada sebelumnya** — bukan bagian dari perbaikan ini.

## 5. Dokumentasi Deployment cPanel

| File | Jenis | Perubahan |
|---|---|---|
| `docs/tutorial/DEPLOYMENT-FULLSTACK.md` | Diedit (besar) | Tambah Section 3 "Panduan Khusus cPanel (Shared Hosting)" — strategi subdomain vs reverse proxy, langkah database/subdomain/upload/artisan/SSL. Section 3-15 lama di-renumber jadi 4-16. |

## 6. Konsistensi Cetak Kwitansi (SLOTS_PER_PAGE) & Penandatangan Dinamis

| File | Jenis | Perubahan |
|---|---|---|
| `fe/src/modules/admin/pages/ReceiptBulkPage.tsx` | Diedit | `RECEIPTS_PER_PAGE` diubah dari `4` → `3` (menyamakan dengan `ReceiptBatchService::SLOTS_PER_PAGE` di backend). Tambah state `signatoryName`/`signatoryTitle` yang diambil dari `getSystemSettings()`, dioper sebagai props ke `ReceiptSlip` menggantikan teks hardcode `"ADE SOPIAN"` / `"Ketua KPSPAMS TIRTA SARI"` di JSX. |
| `fe/src/App.css` | Diedit | `grid-template-rows: repeat(4, 1fr)` → `repeat(3, 1fr)` pada `.receipt-print-page`, di versi layar (±965) **dan** versi `@media print` (±1429). |
| `be/app/Services/ReceiptBatchService.php` | Diedit | `snapshot()` membaca `signatory_name`/`signatory_title` dari `Setting::receipt_signatory` (dengan fallback nilai lama) alih-alih hardcode. |
| `be/app/Http/Controllers/Api/Admin/SettingController.php` | Diedit | Tambah validasi `settings.receipt_signatory.name`/`.title` (required). |
| `be/database/seeders/PamsimasSeeder.php` | Diedit | Tambah baris seed `receipt_signatory` (nilai default sama seperti sebelumnya) supaya instalasi baru punya nilai awal. |
| `fe/src/modules/admin/services/adminApi.ts` | Diedit | `SystemSettings` type tambah `signatoryName`/`signatoryTitle`; `getSystemSettings()`/`saveSystemSettings()`/`getDefaultSystemSettings()` menyesuaikan. |
| `fe/src/modules/admin/pages/AdminUtilityPages.tsx` | Diedit | Card baru **"Penandatangan Kwitansi"** di halaman Pengaturan Sistem (input nama + jabatan, tombol Simpan tersendiri); default lokal disesuaikan. |
| `be/tests/Feature/ReceiptWorkflowTest.php` | Diedit | Tambah assertion signatory pada test cetak batch yang sudah ada; tambah test baru `test_printed_receipt_uses_the_signatory_configured_in_settings` (ganti setting → cetak → snapshot berisi nilai baru). |
| `be/tests/Feature/FullstackApiContractTest.php` | Diedit | Payload PATCH `/admin/settings` di test ditambah `receipt_signatory` supaya lolos validasi baru. |
| `docs/archive/` | **Dihapus** | Seluruh folder (backup Laravel 10 lama, file kerja sementara, dsb.) dihapus sesuai konfirmasi. |
| `docs/README.md` | Diedit | Menghapus seksi `archive` dari daftar isi `docs/`, renumbering seksi lain. |
| `docs/keadaan-saat-ini/STRUKTUR-FOLDER-PROYEK.md` | Diedit | Menghapus 3 referensi basi ke `docs/archive/` (tabel struktur folder, catatan Laravel 10 lama, daftar "tidak boleh diunggah"). |

## 7. Dokumentasi Alur Penggunaan

| File | Jenis | Perubahan |
|---|---|---|
| `docs/tutorial/ALUR-PENGGUNAAN-APLIKASI.md` | **Baru** | Skema penggunaan aplikasi berurutan: setup Admin → input meter Petugas → cetak kwitansi → pembayaran → setoran → verifikasi → kas/pengeluaran → laporan → transparansi publik. |
| `docs/keadaan-saat-ini/RIWAYAT-PERUBAHAN.md` | **Baru** | Dokumen ini. |

## Status Pengujian Setelah Seluruh Perubahan di Atas

- Backend: `php artisan test` → **26/26 lolos**.
- Frontend: `npx tsc -b` (type-check) → **lolos tanpa error**; `npm run build` → **berhasil**.
