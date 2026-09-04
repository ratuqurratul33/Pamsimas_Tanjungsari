# Arsitektur Backend dan Database PAMSIMAS

Dokumen ini menjadi patokan backend Laravel dan database MySQL Sistem Digitalisasi PAMSIMAS Tanjungsari. Skema disusun dari dokumen PRD, SRS, dan ERD PAMSIMAS.

## Status

- Folder `be` adalah root project Laravel.
- Frontend belum disambungkan penuh ke semua fitur backend.
- Database utama memakai MySQL Laragon sesuai `.env`.
- Migration inti ada di `database/migrations/2026_08_12_000001_create_pamsimas_core_tables.php`.
- Seeder dummy terpadu ada di `database/seeders/PamsimasSeeder.php`.

## Peran Sistem

- `admin`: akses penuh, tanpa sub-peran ketua/bendahara/perangkat desa.
- `petugas`: input meter, catat pembayaran, unggah bukti, dan melihat riwayat transaksi/setoran sesuai wilayah tugas.
- `publik`: tanpa login, hanya melihat informasi umum, transparansi, peta, FAQ, dan pengaduan.

## Alur Bisnis Final

```txt
Admin atur tarif dan periode
  -> Petugas input meter
  -> Sistem membuat tagihan
  -> Admin cetak kwitansi
  -> Petugas catat pembayaran tunai/QRIS
  -> Pembayaran masuk setoran petugas
  -> Admin verifikasi per transaksi atau lunaskan semua
  -> Pembayaran terverifikasi menambah Kas Tunai/Kas QRIS
  -> Pengeluaran dan mutasi dicatat
  -> Laporan bulanan/triulan/tahunan dibuat
  -> Ringkasan tertentu tampil ke publik
```

## Tabel Inti

- `users`: akun admin dan petugas.
- `regions`: struktur wilayah Dusun/RW/RT/kampung.
- `customers`: data pelanggan PAMSIMAS.
- `officer_assignments`: wilayah RT/kampung yang ditugaskan ke petugas.
- `tariffs`: tarif air per m3 dan biaya admin yang berlaku.
- `meter_readings`: pencatatan meter per pelanggan per periode.
- `bills`: tagihan hasil meter dan tarif.
- `receipts`: riwayat cetak kwitansi fisik dari tagihan.
- `payments`: transaksi pembayaran lapangan, status pending/verified/rejected.
- `officer_deposits`: kelompok pembayaran yang disetorkan petugas.
- `cash_accounts`: Kas Tunai dan Kas QRIS.
- `cash_transactions`: riwayat kas masuk/keluar/mutasi/adjustment dengan saldo berjalan.
- `cash_transfers`: mutasi antar Kas Tunai dan Kas QRIS, bukan pemasukan baru.
- `expenses`: pengeluaran operasional, bisa ditandai tampil publik.
- `monthly_reports`: snapshot laporan periode bulanan/triwulan/tahunan.
- `settings`: konfigurasi sistem seperti periode tagihan, QRIS, dan lainnya.
- `document_templates`: template Word kwitansi, Word laporan, PDF panduan pemasangan.
- `faqs`: FAQ publik yang dikelola admin.
- `organization_profiles`: profil PAMSIMAS untuk publik.
- `organization_members`: pengurus PAMSIMAS.
- `public_map_settings`: setting peta publik dan radius estimasi pemasangan.
- `public_map_layers`: layer peta/jalur air.
- `complaints`: pengaduan publik.
- `activity_logs`: audit aktivitas pengguna.

## Relasi Utama

```txt
users (petugas) 1..N meter_readings
users (petugas) 1..N payments
users (petugas) 1..N officer_deposits
users N..N regions melalui officer_assignments

regions 1..N customers
customers 1..N meter_readings
meter_readings 1..1 bills
tariffs 1..N bills
bills 1..N receipts
bills 1..N payments

officer_deposits 1..N payments
payments verified -> cash_transactions income

cash_accounts 1..N cash_transactions
cash_accounts 1..N expenses
cash_accounts 1..N cash_transfers sebagai asal/tujuan

monthly_reports menyimpan snapshot agregat cash_transactions, payments verified, expenses, dan transfers
```

## Aturan Keuangan

- Pembayaran yang diinput petugas selalu berstatus awal `pending`.
- Tagihan baru menjadi `lunas` setelah transaksi diverifikasi admin.
- Saldo kas hanya berubah karena:
  - pembayaran terverifikasi,
  - pengeluaran tervalidasi,
  - mutasi resmi,
  - adjustment admin.
- Mutasi antar kas tidak dihitung sebagai pemasukan laporan.
- Pengeluaran publik hanya yang `is_public = true`.

## Wilayah Awal

- Dusun 1: 62 KK.
- Dusun 1 dummy: RT 01 Cikadu, RT 02 Pasir Jati, RT 03 Sukamaju.
- Dusun 3: 104 KK.
- Dusun 3 RT 01: Banceuy.
- Dusun 3 RT 02: Pasir Peucang.
- Dusun 3 RT 03: Bobojong.
- Dusun 3 RT 04: Babakan Sari.
- Dusun 3 RT 05: Sukaasih.
- Dusun 3 RT 06: Banceuy Kulon.

## Endpoint Yang Sudah Ada

```txt
GET    /api/health
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/admin/dashboard
GET    /api/admin/regions
GET    /api/admin/customers
POST   /api/admin/customers
GET    /api/admin/customers/{customer}
PATCH  /api/admin/customers/{customer}
DELETE /api/admin/customers/{customer}
GET    /api/admin/officers
POST   /api/admin/officers
GET    /api/admin/officers/{officer}
PATCH  /api/admin/officers/{officer}
DELETE /api/admin/officers/{officer}

POST   /api/petugas/meter-readings
POST   /api/petugas/payments

GET    /api/publik/transparency
```

## Perintah Setup

```powershell
cd "C:\Users\ratuq\Documents\DIGITALISASI SISTEM PAMSIMAS TANJUNGSARI\be"
composer dump-autoload --no-scripts --no-plugins
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

Jika `php artisan migrate:fresh --seed` gagal dengan `SQLSTATE[HY000] [2002]`, aktifkan MySQL di Laragon dan pastikan port MySQL sesuai `.env`.
