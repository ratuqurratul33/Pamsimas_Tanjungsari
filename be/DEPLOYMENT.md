# Deployment Backend PAMSIMAS

Panduan fullstack yang mencakup SPA rewrite, build PWA, backup upload, smoke test, dan rollback berada di `docs/tutorial/DEPLOYMENT-FULLSTACK.md`. Dokumen ini tetap menjadi ringkasan operasional khusus backend.

## 1. Kebutuhan Server

- PHP `8.2` atau lebih baru; versi lokal proyek: PHP `8.4`.
- MySQL `8.0` atau lebih baru.
- Ekstensi PHP: `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `gd`, `json`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`.
- Composer 2.
- Tidak ada dependensi binary eksternal untuk cetak kwitansi — PDF dirender langsung di PHP lewat `barryvdh/laravel-dompdf` (`ReceiptPdfService`), jadi jalan di shared hosting/cPanel biasa tanpa perlu memasang LibreOffice atau proses tambahan apa pun.
- Document root domain API wajib diarahkan ke folder `be/public`, bukan folder `be`.

## 2. Konfigurasi Backend

```powershell
Copy-Item .env.production.example .env
php artisan key:generate
```

Isi nilai berikut pada `.env` produksi:

- `APP_URL=https://api.domain-anda.id`
- `FRONTEND_URLS=https://domain-anda.id,https://www.domain-anda.id`
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, dan `DB_PASSWORD`
- `BROADCAST_CONNECTION=reverb`
- `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT`, dan `REVERB_SCHEME`
- `APP_DEBUG=false`

Jangan memakai akun database `root` di hosting. Berikan user database hanya hak akses untuk database PAMSIMAS.

## 3. Instalasi dan Database

```powershell
composer install --no-dev --prefer-dist --no-interaction
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

Jalankan WebSocket Reverb sebagai proses terpisah:

```powershell
php artisan reverb:start --host=0.0.0.0 --port=8080
```

Pada hosting/VPS gunakan Supervisor, systemd, atau process manager. Jika Reverb belum aktif, transaksi API tetap berhasil, tetapi update realtime tidak dikirim sampai service dinyalakan.

Seeder hanya digunakan untuk instalasi awal atau staging:

```powershell
php artisan db:seed --force
```

Jangan menjalankan `migrate:fresh` pada hosting karena perintah tersebut menghapus seluruh data.

## 4. Build Frontend Real API

Buat `fe/.env.production` berdasarkan `fe/.env.production.example`:

```env
VITE_API_BASE_URL=https://api.domain-anda.id/api
VITE_USE_MOCK_API=false
VITE_REVERB_APP_KEY=isi-sama-dengan-REVERB_APP_KEY-backend
VITE_REVERB_HOST=api.domain-anda.id
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Lalu build:

```powershell
npm.cmd install
npm.cmd run build
```

Unggah isi `fe/dist` ke document root domain frontend. Jika frontend dijalankan sendiri tanpa backend, gunakan `VITE_USE_MOCK_API=true` sebelum build agar repository memakai `localStorage`.

## 5. Pemeriksaan Setelah Deploy

1. Buka `https://api.domain-anda.id/api/health`; respons harus memiliki `status: ok` dan `database: ok`.
2. Buka `https://api.domain-anda.id/api/publik/map`; pastikan URL gambar dapat dibuka.
3. Login Admin dan Petugas menggunakan akun yang dibuat di database.
4. Uji satu transaksi staging: Petugas mencatat pembayaran dan setoran, Admin memverifikasi, lalu saldo kas serta laporan harus berubah.
5. Login Admin lalu pastikan action `auth.login` tampil sebagai aktivitas terbaru di dashboard.
6. Buka dua browser berbeda, ubah peta/profil/FAQ atau verifikasi setoran, lalu pastikan tab lain update lewat WebSocket.
7. Jalankan `php artisan test`; baseline release 21 Agustus 2026 adalah `10` test dan `132` assertion lulus.

## 6. Izin Folder

Folder berikut harus dapat ditulis oleh proses PHP:

- `storage`
- `bootstrap/cache`

Pastikan folder upload `storage/app/public` disimpan secara persisten ketika hosting memakai container atau deployment release-based.

## 7. Backup

Sebelum migration produksi:

```powershell
mysqldump -u pamsimas_user -p sistem_pamsimas > sistem_pamsimas-before-migrate.sql
```

Simpan juga folder `storage/app/public` karena bukti pembayaran, nota, foto petugas, dan peta publik berada di sana.
