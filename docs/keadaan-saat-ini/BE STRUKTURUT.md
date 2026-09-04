# Struktur dan Aktivasi Backend PAMSIMAS

Dokumen ini menjelaskan struktur Laravel, pemisahan seed Real/Mock, dan cara menjalankan FE serta BE lokal.

## 1. Stack Lokal

- Laragon: `C:\laragon`
- PHP: `8.4.20`
- MySQL: `8.0.30`
- Laravel: `12.67.0`
- Database: `sistem_pamsimas`
- Backend: `be/`
- Frontend: `fe/`
- Dokumentasi: `docs/`

## 2. Struktur Backend

```text
be/
|-- app/
|   |-- Http/
|   |   |-- Controllers/Api/
|   |   |   |-- Admin/
|   |   |   |-- Petugas/
|   |   |   `-- Publik/
|   |   |-- Middleware/
|   |   |-- Requests/
|   |   `-- Resources/
|   |-- Models/
|   `-- Services/
|       |-- AuditLogger.php
|       |-- CashLedgerService.php
|       |-- DepositService.php
|       |-- ExpenseService.php
|       |-- MonthlyReportService.php
|       `-- ReceiptBatchService.php
|-- config/
|-- database/
|   |-- migrations/
|   `-- seeders/
|       |-- DatabaseSeeder.php
|       |-- PamsimasCoreSeeder.php
|       `-- PamsimasSeeder.php
|-- routes/
|   `-- api.php
|-- storage/
|   `-- app/public/
|-- tests/
|   `-- Feature/
|-- .env
`-- artisan
```

## 3. Pembagian Controller

### Auth dan health

- `AuthController`: login, user aktif, logout.
- `HealthController`: status aplikasi dan koneksi database.

### Admin

- dashboard dan activity log,
- pelanggan, Petugas, wilayah, dan assignment,
- antrean serta batch kwitansi,
- setoran dan verifikasi,
- kas, transfer, dan transaksi manual,
- pengeluaran dan laporan,
- profil publik, peta, FAQ, serta pengaturan sistem.

### Petugas

- dashboard dan profil,
- pelanggan wilayah tugas,
- input meter,
- pembayaran dan upload bukti,
- pembuatan serta riwayat setoran.

### Publik

- ringkasan pelanggan, wilayah, dan tunggakan,
- profil, pengurus, layanan, peta, panduan, dan FAQ,
- transparansi pemasukan per wilayah dan pengeluaran publik.

## 4. Service Transaksi

- `CashLedgerService`: menghitung saldo dan membuat ledger kas.
- `DepositService`: verifikasi setoran serta pemasukan kas atomik.
- `ExpenseService`: posting, pembatalan, dan pengurangan kas.
- `MonthlyReportService`: menyusun laporan dari ledger terverifikasi.
- `ReceiptBatchService`: mengelompokkan kwitansi per Petugas dan 3 slot per A4.
- `AuditLogger`: mencatat login dan aktivitas penting.

Logic keuangan diletakkan pada service agar controller tetap tipis dan transaksi dapat diuji secara terisolasi.

## 5. Pemisahan Seeder

### Baseline Real API

```env
SEED_DEMO_DATA=false
```

Menjalankan `PamsimasCoreSeeder`:

- membuat dua akun inti,
- membuat master wilayah,
- membuat tarif dan akun kas kosong,
- membuat konfigurasi publik dasar,
- tidak membuat pelanggan, meter, tagihan, pembayaran, setoran, atau pengeluaran dummy.

### Demo backend/test

```env
SEED_DEMO_DATA=true
```

Menjalankan `PamsimasSeeder` dengan data lengkap. Hanya untuk staging disposable dan test, bukan database nyata.

### Mock FE

Mock FE tidak memakai kedua tabel seed di atas. Data lengkapnya berada pada repository FE dan disimpan di `localStorage` saat:

```env
VITE_USE_MOCK_API=true
```

Karena sumbernya berbeda, database Real dapat kosong sementara presentasi Mock tetap penuh dan dapat diubah.

## 6. Nyalakan Laragon

1. Buka Laragon.
2. Pilih `Menu > PHP > Version > php-8.4.20-Win32-vs17-x64`.
3. Pilih `Menu > MySQL > Version > mysql-8.0.30-winx64`.
4. Klik `Start All`.
5. Pastikan Apache dan MySQL berstatus `started`.
6. Buka PowerShell baru setelah mengubah versi.

Verifikasi:

```powershell
php -v
composer -V
mysql --version
```

## 7. Siapkan Database

Buat database melalui HeidiSQL atau terminal MySQL:

```sql
CREATE DATABASE IF NOT EXISTS sistem_pamsimas
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Konfigurasi `be/.env`:

```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

FRONTEND_URL=http://127.0.0.1:5173
FRONTEND_URLS=http://127.0.0.1:5173,http://localhost:5173

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sistem_pamsimas
DB_USERNAME=root
DB_PASSWORD=

FILESYSTEM_DISK=public
SEED_DEMO_DATA=false
INITIAL_ADMIN_PASSWORD=password
```

Pada `APP_ENV=local`, CORS menerima port localhost development. FE juga memakai proxy `/api`, sehingga port Vite tidak perlu ditambahkan satu per satu.

## 8. Instal dan Migrasi Backend

```powershell
Set-Location "C:\Users\ratuq\Documents\DIGITALISASI SISTEM PAMSIMAS TANJUNGSARI\be"
composer install
```

Jika `.env` belum ada:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Untuk database baru:

```powershell
php artisan migrate --seed
php artisan storage:link
php artisan optimize:clear
```

Untuk development yang memang boleh dihapus total:

```powershell
php artisan migrate:fresh --seed
```

Jangan menjalankan `migrate:fresh` pada production atau database yang harus dipertahankan.

## 9. Jalankan Real API

Buka Terminal 1:

```powershell
Set-Location "C:\Users\ratuq\Documents\DIGITALISASI SISTEM PAMSIMAS TANJUNGSARI\be"
php artisan serve --host=127.0.0.1 --port=8000
```

Cek:

```text
http://127.0.0.1:8000/api/health
```

Respons harus mempunyai `status=ok` dan `database=ok`.

Konfigurasi `fe/.env`:

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK_API=false
```

Buka Terminal 2:

```powershell
Set-Location "C:\Users\ratuq\Documents\DIGITALISASI SISTEM PAMSIMAS TANJUNGSARI\fe"
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Vite meneruskan request `/api` dan `/storage` ke Laravel port `8000`. Restart Vite setiap kali `.env` atau `vite.config.ts` berubah.

## 10. Jalankan Mock Tanpa Backend

Konfigurasi Mock sudah dipisahkan pada `fe/.env.mock`:

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK_API=true
```

Laravel dan MySQL boleh dimatikan. Jalankan:

```powershell
Set-Location "C:\Users\ratuq\Documents\DIGITALISASI SISTEM PAMSIMAS TANJUNGSARI\fe"
npm.cmd run dev:mock -- --host 127.0.0.1
```

Mock menyimpan perubahan ke `localStorage`. Untuk kembali ke data dummy awal, hapus key yang diawali `pamsimas.mock.` hanya jika reset presentasi memang diinginkan.

## 11. Akun Development

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `password` |
| Petugas Real API | `budisantoso` | `0812-3456-7890` |
| Petugas Mock | `budi.santoso` | `0877-6543-2109` |

Password Petugas selalu sama dengan nomor HP pada Data Petugas. Ketika Admin mengubah nomor HP, backend dan Mock memperbarui password login ke nomor baru. Ganti nomor contoh dan password Admin sebelum staging publik atau production.

## 12. Pemeriksaan Cepat

Backend:

```powershell
php artisan about
php artisan migrate:status
php artisan route:list --path=api --except-vendor
php artisan test
```

Frontend:

```powershell
npm.cmd run lint
npm.cmd run build
```

Smoke test Real API:

1. Login Admin dan cek semua kartu bernilai nol pada baseline baru.
2. Login Petugas dan cek `Belum ada wilayah tugas`.
3. Buka Input Meter dan cek empty state pelanggan.
4. Buka Publik dan cek peta/profil berasal dari database, sedangkan pengurus/FAQ kosong.
5. Tambahkan pelanggan dan assignment dari Admin.
6. Uji input meter -> kwitansi -> pembayaran -> setoran -> verifikasi -> kas -> laporan pada staging.

## 13. Aturan Production

- `SEED_DEMO_DATA=false`.
- `VITE_USE_MOCK_API=false`.
- `APP_DEBUG=false`.
- jangan memakai `migrate:fresh`.
- backup database dan `storage/app/public` sebelum migrate.
- gunakan HTTPS dan password kuat.
- isi `FRONTEND_URLS` dengan domain resmi saja.
- document root backend harus `be/public`.

Panduan hosting lengkap berada di `docs/tutorial/DEPLOYMENT-FULLSTACK.md`.
