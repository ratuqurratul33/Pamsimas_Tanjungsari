# Report Progress Backend dan Database PAMSIMAS

Tanggal audit: 21 Agustus 2026  
Backend: Laravel 12.67.0, PHP 8.4.20, MySQL 8.0.30  
Frontend: React 19, TypeScript 6, Vite 8, PWA  
Status: seluruh modul utama sudah mempunyai endpoint dan sudah terhubung ke FE Real API. Database Real API menggunakan baseline bersih, sedangkan data presentasi tetap lengkap hanya pada FE Mock.
Update terakhir: adapter Mock dan Real API sudah diselaraskan untuk alur operasional utama. Realtime production memakai Laravel Reverb + Laravel Echo berbasis WebSocket, sedangkan Mock tetap memakai dummy/localStorage tanpa perlu backend aktif.

## 1. Keputusan Arsitektur Data

Sistem mempunyai dua mode yang sengaja dipisahkan.

### 1.1 Real API / production-like

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=/api
```

- FE membaca dan menulis data melalui Laravel dan MySQL.
- Tidak ada fallback diam-diam ke data dummy ketika API gagal.
- Data kosong menghasilkan empty state, angka `0`, atau daftar kosong, bukan data presentasi.
- Login memakai akun database dan token Laravel Sanctum.
- Perubahan Admin, Petugas, dan Publik memakai sumber data MySQL yang sama.

### 1.2 Mock / presentasi lokal

```env
VITE_USE_MOCK_API=true
VITE_API_BASE_URL=/api
```

- Laravel boleh dimatikan.
- FE memakai data dummy lengkap lintas role yang tersimpan di `localStorage`.
- CRUD pelanggan, petugas, meter, pembayaran, setoran, kas, pengeluaran, profil, peta, dan FAQ tetap dapat disimulasikan.
- Perubahan tetap ada setelah refresh browser.
- Perubahan Mock tidak masuk ke MySQL dan tidak mencemari data Real API.
- Mode presentasi dapat dijalankan langsung dengan `npm.cmd run dev:mock`; mode tersebut membaca `fe/.env.mock` tanpa mengubah `.env` Real API.

## 2. Seeder dan Kondisi Database Real

`DatabaseSeeder` memilih seeder berdasarkan `SEED_DEMO_DATA`:

```env
SEED_DEMO_DATA=false
```

Dengan nilai `false`, Laravel menjalankan `PamsimasCoreSeeder`. Baseline Real API setelah `php artisan migrate:fresh --seed --force`:

| Tabel / data | Jumlah |
|---|---:|
| Pengguna inti | 2 |
| Wilayah master | 13 |
| Pelanggan | 0 |
| Input meter | 0 |
| Tagihan | 0 |
| Pembayaran | 0 |
| Setoran | 0 |
| Transaksi kas | 0 |
| Pengeluaran | 0 |
| FAQ publik | 0 |
| Pengurus publik | 0 |

Data inti yang tetap dibuat:

- akun Admin dan satu akun Petugas awal,
- master wilayah dengan jumlah pelanggan aktual `0`,
- tarif aktif,
- akun Kas Tunai dan Kas QRIS dengan saldo `Rp0`,
- konfigurasi profil, peta gambar, panduan, periode tagihan, dan template dokumen yang dapat diedit Admin.

`PamsimasSeeder` tetap tersedia khusus demo/test dengan data lengkap. Seeder demo tidak dijalankan pada Real API jika `SEED_DEMO_DATA=false`.

## 3. Status Modul

| Modul | Endpoint BE | Database | FE Real API | FE Mock |
|---|---:|---:|---:|---:|
| Auth dan role | Selesai | Selesai | Selesai | Selesai |
| Pelanggan dan wilayah | Selesai | Selesai | Selesai | Selesai |
| Petugas dan penugasan wilayah | Selesai | Selesai | Selesai | Selesai |
| Input meter | Selesai | Selesai | Selesai | Selesai |
| Tagihan dan antrean kwitansi | Selesai | Selesai | Selesai | Selesai |
| Batch kwitansi 3/A4 | Selesai | Selesai | Selesai | Selesai |
| Pembayaran dan upload bukti | Selesai | Selesai | Selesai | Selesai |
| Setoran Petugas | Selesai | Selesai | Selesai | Selesai |
| Verifikasi Admin dan discrepancy | Selesai | Selesai | Selesai | Selesai |
| Kas utama dan mutasi | Selesai | Selesai | Selesai | Selesai |
| Pengeluaran | Selesai | Selesai | Selesai | Selesai |
| Laporan bulanan | Selesai | Selesai | Selesai | Selesai |
| Profil, peta, panduan, dan FAQ publik | Selesai | Selesai | Selesai | Selesai |
| Transparansi publik | Selesai | Selesai | Selesai | Selesai |
| Log aktivitas Admin | Selesai | Selesai | Selesai | Tidak berlaku |

## 4. Alur Bisnis yang Aktif

1. Petugas melihat pelanggan yang berada pada wilayah tugasnya.
2. Petugas menginput meter awal dan meter terbaru.
3. Sistem menghitung pemakaian, biaya, total tagihan, dan membuat antrean kwitansi dalam satu transaksi database.
4. Admin hanya melihat tagihan yang sudah mempunyai input meter.
5. Admin mencetak kwitansi per petugas, `3` kwitansi pada setiap halaman A4.
6. Kwitansi yang sudah dicetak diserahkan kepada Petugas.
7. Petugas menagih pelanggan, memberi cap setelah pelanggan membayar, lalu mengunggah bukti.
8. Pembayaran masuk sebagai data digital menunggu setoran; pembayaran belum menambah Kas Utama.
9. Petugas membuat setoran dari pembayaran yang belum diserahkan.
10. Admin menerima uang fisik dan memverifikasi `physical_total` terhadap `digital_total`.
11. Sistem menghitung `discrepancy = physical_total - digital_total`.
12. Setoran verified membuat transaksi pemasukan kas secara atomik dan mengubah tagihan menjadi lunas.
13. Pengeluaran posted mengurangi akun kas dan otomatis masuk laporan bulanan.

## 5. Keselarasan Admin, Petugas, dan Publik

- Jumlah pelanggan Publik berasal dari pelanggan aktif pada database Admin.
- Wilayah terlayani berasal dari wilayah pelanggan aktual, bukan kapasitas wilayah atau angka dummy.
- Persentase tunggakan berasal dari tagihan periode aktif yang belum lunas; tanpa tagihan hasilnya `0%`.
- Wilayah dan jumlah pelanggan Petugas berasal dari assignment dan pelanggan aktual; tanpa assignment tampil `Belum ada wilayah tugas` dan semua kartu bernilai `0`.
- Input Meter, Pelanggan Bayar, dan Setoran Petugas menampilkan empty state jika belum ada data.
- Halaman Pelanggan Bayar FE mengikuti periode aktif dari dashboard/Setting BE, bukan periode hardcode, sehingga hasil input meter langsung muncul pada periode yang sama.
- Presenter pelanggan Petugas BE hanya mengambil bill periode aktif; histori bulan lama tetap tersedia sebagai histori dan tidak dianggap sebagai tagihan berjalan.
- Peta, panduan, profil, layanan, pengurus, FAQ, alamat, jam operasional, dan WhatsApp Publik berasal dari pengaturan Admin.
- Pengeluaran hanya tampil di Publik jika berstatus `posted` dan `is_public=true`.
- Setoran terverifikasi memperbarui kas, tagihan, status pembayaran, laporan, dan ringkasan publik dari transaksi yang sama.
- FE Real API menerima sinyal WebSocket dari Laravel Reverb untuk perubahan publik, dashboard, kwitansi, setoran, kas, pengeluaran, dan input lapangan.
- Event WebSocket tidak membawa data sensitif. Event hanya membawa `scopes`, `source`, dan `occurred_at`, lalu FE melakukan refetch ke endpoint resmi sesuai halaman aktif.
- FE Mock tidak membuka koneksi WebSocket agar tetap bisa berjalan penuh ketika Laravel/MySQL/Reverb mati.
- Mock tetap melakukan refresh lokal 5 detik dan merespons perubahan `localStorage` lintas tab untuk kebutuhan presentasi.
- FE Real API menggunakan `VITE_USE_MOCK_API=false`, token Sanctum, database Laravel, dan endpoint yang sama dengan kontrak Mock. Tidak ada fallback diam-diam ke dummy ketika endpoint Real gagal.
- FE Mock menggunakan `VITE_USE_MOCK_API=true`, repository localStorage, dan dummy lintas role yang sama secara bisnis: pelanggan -> meter -> kwitansi -> pembayaran -> setoran -> kas/laporan.
- Jika Reverb server belum aktif pada production-like mode, aksi database tetap berhasil karena broadcast dibuat best-effort dan error socket hanya dilaporkan ke log.

## 5.1 Update Terbaru 21 Agustus 2026

### Pengaturan Sistem

- Periode Tagihan default mengikuti bulan dan tahun berjalan dari komputer/server.
- Admin tetap dapat mengubah bulan aktif, tahun aktif, tanggal jatuh tempo, tarif air per m3, biaya admin, dan denda keterlambatan.
- FE Mock menyimpan pengaturan ke `localStorage` dan langsung dipakai ulang setelah refresh.
- FE Real API menyimpan pengaturan ke tabel `settings` dan membuat/menutup record `tariffs` jika tarif air atau biaya admin berubah.
- Input meter Petugas pada Real API tidak lagi mengirim total tagihan dari UI. Backend Laravel menjadi sumber hitung final berdasarkan `Tariff` aktif.
- Input meter Petugas pada Mock menghitung total dari Pengaturan Sistem lokal agar hasil presentasi mengikuti angka yang diatur Admin.

### Profil Publik dan Pengurus

- Form Profil Publik Admin sekarang tetap menampilkan 3 card layanan default jika database lama belum memiliki `service_cards`.
- Section publik `Kenapa harus layanan kami?` tidak hilang saat data production masih kosong sebagian.
- Tambah Pengurus tidak lagi gagal karena baris kosong. Baris pengurus kosong difilter sebelum dikirim ke backend.
- Backend `ProfileController` juga memfilter baris pengurus kosong sebelum validasi agar draft form tidak langsung ditolak.
- Tombol Simpan Profil Publik memiliki state `Menyimpan...` dan error disampaikan melalui notifikasi.
- Foto profil Admin, foto Petugas, input upload file, chip wilayah, dan teks panjang sudah dirapikan agar tidak terpotong pada layar kecil.

### Realtime WebSocket Production

- Backend memakai Laravel Reverb dan `pusher/pusher-php-server`.
- Frontend memakai `laravel-echo` dan `pusher-js`.
- Channel realtime publik: `pamsimas.updates`.
- Event realtime: `.pamsimas.updated`.
- Scope event yang aktif: `public-content`, `public-summary`, `public-transparency`, `dashboard`, `field`, `receipts`, `deposits`, `finance`, dan `settings`.
- Aksi yang sudah menembak event: update Profil Publik, update Peta Publik, update FAQ, update Pengaturan Sistem, input meter Petugas, pembayaran Petugas, setoran Petugas, verifikasi/tolak setoran Admin, ubah status pembayaran setoran, post/void pengeluaran, cetak batch kwitansi, dan koreksi meter Admin.
- Frontend hanya mengaktifkan WebSocket saat `VITE_USE_MOCK_API=false` dan `VITE_REVERB_APP_KEY` terisi.
- Saat `VITE_USE_MOCK_API=true`, aplikasi tetap memakai data simulasi lengkap dari `localStorage`; ini mode yang dipakai jika `http://localhost:5173/` harus tampil walaupun BE mati.

## 6. Kwitansi Fisik

- Tagihan tidak dapat dicetak sebelum input meter tersimpan.
- Snapshot kwitansi menyimpan nomor, periode, pelanggan, alamat, meter, tarif, biaya admin, total, dan penandatangan.
- Batch dikelompokkan berdasarkan Petugas.
- Satu halaman A4 berisi `3` slot kwitansi.
- Jumlah halaman adalah `ceil(jumlah_kwitansi / 3)`.
- Slot yang kurang pada halaman terakhir dipertahankan kosong agar tata letak tidak bergeser.
- Pembuatan batch memakai `Idempotency-Key` agar klik ulang tidak membuat batch ganda.

## 7. Keamanan dan Integritas

- Token autentikasi memakai Laravel Sanctum.
- Middleware role memisahkan Admin dan Petugas.
- Petugas tidak dapat membaca pelanggan di luar wilayah tugas.
- Endpoint keuangan penting memakai transaksi database, row lock, dan idempotency.
- Pembayaran pending tidak langsung menambah kas.
- Pengeluaran posted menolak saldo negatif.
- Pembatalan keuangan dibuat sebagai reversal, bukan menghapus ledger lama.
- Endpoint publik tidak mengirim identitas pelanggan.
- Produksi membatasi CORS melalui `FRONTEND_URLS`.
- FE lokal memakai proxy Vite `/api` sehingga login tidak bergantung pada origin/port Vite.

## 8. Pagination dan Loading Data

- Halaman React utama memakai dynamic import.
- Pelanggan Admin memakai filter dan pagination server dengan 15 baris per halaman.
- Endpoint pelanggan Petugas, kwitansi, setoran, kas, dan pengeluaran menerima `page` serta `per_page`.
- Data privat hanya dimuat setelah role aktif.
- Dashboard, profil, dan daftar operasional dimuat sesuai kebutuhan halaman.
- Halaman publik dirender tanpa lazy load halaman agar konten langsung tersedia saat UAT/presentasi.
- Endpoint privat tetap memakai pagination/server filtering; daftar Petugas mengambil beberapa halaman API untuk menyatukan data wilayah tugas pada state halaman.

Sisa optimasi: daftar pelanggan Petugas masih mengumpulkan chunk endpoint ke state FE untuk kebutuhan beberapa halaman. Endpoint sudah paginated, tetapi UI daftar Petugas masih dapat ditingkatkan menjadi pagination server penuh ketika volume data desa tumbuh besar.

## 9. Hasil Verifikasi 21 Agustus 2026

- `php artisan migrate:fresh --seed --force`: berhasil dengan `PamsimasCoreSeeder`.
- PHPUnit: `10` test lulus, `132` assertion.
- FE lint: lulus tanpa error.
- FE build Real API: lulus.
- FE build Mock: lulus.
- FE build terakhir setelah perubahan WebSocket Reverb/Echo: lulus.
- Backend test setelah broadcast best-effort: `10` test lulus, `132` assertion.
- PWA menghasilkan manifest, service worker, Workbox, dan precache.
- Health API: `status=ok`, `database=ok`.
- Preflight CORS localhost: berhasil.
- Login UI Admin: berhasil.
- Login UI Petugas: berhasil.
- Kontrak password Petugas: nomor HP awal diterima, password lama ditolak setelah Admin mengganti nomor, dan nomor HP baru langsung diterima sebagai password.
- Dashboard Admin Real API: pelanggan `0`, setoran `0`, pengeluaran `Rp0`, kas `Rp0`.
- Dashboard Petugas Real API: pelanggan `0`, tagihan `Rp0`, setoran `Rp0`.
- Profil Petugas: `Belum ada wilayah tugas`.
- Input Meter tanpa pelanggan: empty state tampil dan tidak crash.
- Publik Real API: pelanggan `0`, wilayah kosong, tunggakan `0%`, peta/profil dari database, pengurus dan FAQ kosong.
- Proxy Vite `/api`: login dan request publik berhasil tanpa error CORS.
- Pengujian workflow terisolasi membuktikan meter -> tagihan -> kwitansi -> pembayaran -> setoran -> verifikasi -> kas -> laporan.
- Pengujian terbaru membuktikan WebSocket tidak merusak alur database jika Reverb belum aktif; transaksi tetap berhasil dan event dicatat sebagai log error non-blocking.
- Test workflow Real API terisolasi membuktikan data tidak berhenti di UI: input meter tersimpan ke database, kwitansi mengambil petugas dari meter reading, pembayaran terikat ke bill, setoran diverifikasi, transaksi kas terbentuk, dan laporan membaca ledger yang sama.
- Migrasi `ensure_default_cash_accounts` sudah diterapkan pada database lokal untuk memastikan kartu Kas Tunai, Kas QRIS, sumber dana pengeluaran, dan pilihan akun pemasukan tidak kosong pada database lama.

### 9.1 Smoke Test Laravel Lokal

Pengujian langsung ke `http://127.0.0.1:8000` setelah Laravel dan MySQL aktif:

| Pemeriksaan | Hasil |
|---|---|
| `GET /api/health` | `status=ok`, `database=ok` |
| Login Admin | Berhasil dengan token Sanctum |
| `GET /api/admin/officers` | Berhasil, data petugas terbaca |
| `GET /api/admin/cash-accounts` | Berhasil, 2 akun kas terbaca |
| `GET /api/admin/receipts` | Berhasil, kosong jika belum ada input meter |
| `GET /api/publik/map` | Berhasil, data peta dari database |
| `GET /api/publik/summary` | Berhasil, ringkasan dari pelanggan database |
| FE Real build | Lulus |
| FE Mock build | Lulus |

Kesimpulan: mode Mock dan Real API dapat dijalankan sebagai dua mode terpisah dengan alur bisnis yang sama. Perbedaan data hanya berasal dari sumber penyimpanan: Mock memakai `localStorage`, Real memakai MySQL. Data lama pada database tidak dihapus hanya karena `.env` diubah; gunakan reset database lokal secara sadar jika membutuhkan UAT kosong.

## 10. Akun Inti Lokal

| Role | Login | Password development |
|---|---|---|
| Admin | `admin` | `password` |
| Petugas Real API | `budisantoso` | `0812-3456-7890` |
| Petugas Mock | `budi.santoso` | `0877-6543-2109` |

Password awal Admin dibaca dari `INITIAL_ADMIN_PASSWORD`. Password Petugas selalu sama dengan nomor HP yang tampil pada Data Petugas. Jika Admin mengubah nomor HP, backend langsung mengganti hash password Petugas ke nomor baru; aturan yang sama berlaku pada repository Mock.

## 11. Kesiapan dan Batasan

Backend, database, dan adapter FE siap untuk staging/UAT. Kesiapan hosting tetap membutuhkan domain, database, storage persisten, HTTPS, password aman, backup, dan proses Reverb yang berjalan sebagai service.

Hal yang masih memerlukan keputusan/operasi pemilik sistem:

- isi data pelanggan dan assignment Petugas nyata,
- lengkapi nomor WhatsApp publik yang saat ini hanya baseline `62`,
- isi pengurus dan FAQ publik dari Admin,
- kompres gambar peta besar ke WebP/AVIF sebelum trafik produksi,
- lakukan UAT transaksi dengan uang uji pada staging,
- jalankan service Reverb sebagai proses terpisah di hosting production agar update lintas tab/user masuk instan.

Jangan menjalankan `migrate:fresh` pada produksi. Panduan deployment berada di `docs/tutorial/DEPLOYMENT-FULLSTACK.md`.
