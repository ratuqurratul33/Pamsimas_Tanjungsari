# Deployment Fullstack PAMSIMAS

Panduan ini berlaku untuk FE React/PWA pada `fe/`, BE Laravel 12 pada `be/`, dan MySQL 8.0.

## 1. Mode Data yang Tidak Boleh Tertukar

### Real API

```env
VITE_USE_MOCK_API=false
```

Semua data berasal dari Laravel dan MySQL. Gunakan mode ini untuk development backend, staging, dan production.

### Mock presentasi

```env
VITE_USE_MOCK_API=true
```

Semua data berasal dari `localStorage` browser. Mode ini hanya untuk presentasi FE dan tetap berfungsi ketika Laravel/MySQL mati. Jangan build production publik dengan nilai ini.

Untuk lokal gunakan `npm.cmd run dev:mock`. Untuk memeriksa build Mock gunakan `npm.cmd run build:mock`. Perintah `npm.cmd run dev` dan `npm.cmd run build` mengikuti isi `.env`/`.env.production`; pastikan `VITE_USE_MOCK_API=false` saat build production.

Catatan lokal saat ini: `fe/.env` sengaja diset `VITE_USE_MOCK_API=true` agar `http://localhost:5173/` tetap menampilkan data simulasi ketika Laravel/MySQL mati. Untuk menembak database sungguhan, ubah menjadi `false`, isi variabel Reverb, lalu restart Vite.

## 2. Arsitektur Hosting yang Direkomendasikan

Pilihan paling sederhana adalah satu domain:

- aplikasi: `https://pamsimas-domain.id`
- API: `https://pamsimas-domain.id/api`
- upload: `https://pamsimas-domain.id/storage`
- `VITE_API_BASE_URL=/api`

FE dapat diletakkan pada document root domain dan Laravel diarahkan melalui reverse proxy untuk `/api` serta `/storage`. **Skema ini mengasumsikan VPS/dedicated dengan akses root** (lihat Section 10). Untuk shared hosting cPanel, lihat Section 3 — di cPanel strategi yang disarankan berbeda (subdomain, bukan reverse proxy path).

Jika hosting memakai domain terpisah:

- FE: `https://pamsimas-domain.id`
- API: `https://api.pamsimas-domain.id`
- `VITE_API_BASE_URL=https://api.pamsimas-domain.id/api`
- `FRONTEND_URLS=https://pamsimas-domain.id,https://www.pamsimas-domain.id`

Document root API wajib menunjuk ke `be/public/`, bukan `be/`. HTTPS wajib untuk keamanan token, upload, dan instalasi PWA.

## 3. Panduan Khusus cPanel (Shared Hosting)

Bagian ini untuk hosting berbasis cPanel biasa (shared/reseller hosting tanpa akses root ke server), yang umum dipakai instansi kecil/desa. Kalau hosting Anda adalah VPS dengan WHM/root, lewati bagian ini dan langsung ke Section 4, 9, dan 10.

### 3.1 Keterbatasan Penting cPanel yang Harus Dipahami Dulu

- cPanel shared hosting **tidak menjalankan `php artisan serve` atau proses PHP yang hidup terus**. Laravel di-serve oleh Apache + PHP-FPM seperti situs PHP biasa, langsung dari folder `be/public/`. Tidak ada "port 8000" untuk di-proxy seperti pada contoh VPS di Section 9.
- Reverse proxy gaya Nginx (`proxy_pass http://127.0.0.1:8000`) pada Section 9 dokumen ini **hanya berlaku untuk VPS/dedicated dengan akses root**, bukan cPanel shared hosting biasa.
- **`php artisan reverb:start` (realtime WebSocket) pada umumnya tidak bisa jalan permanen di shared hosting cPanel** karena proses background yang hidup terus akan dimatikan otomatis oleh hosting (tidak ada Supervisor/systemd untuk user biasa di paket shared). Kalau realtime WebSocket produksi memang dibutuhkan, gunakan VPS (Section 9-10). Tanpa Reverb, aplikasi tetap berfungsi penuh — hanya saja perubahan dari user lain baru terlihat setelah refresh manual, bukan otomatis (memang didesain begitu sebagai fallback, lihat Section 11).
- Karena dua batasan di atas, strategi yang **paling disarankan di cPanel adalah subdomain terpisah untuk API**, bukan reverse-proxy path `/api` pada satu domain. Subdomain di cPanel cukup diarahkan langsung ke folder `be/public/` — tidak perlu proxy sama sekali, karena Apache cPanel yang men-serve folder itu otomatis sudah "menjadi" backend-nya.

### 3.2 Rencana Domain di cPanel

Contoh nama domain: `pamsimas-tanjungsari.id`.

| Bagian | Domain/Subdomain | Document Root cPanel |
| --- | --- | --- |
| Frontend (FE) | `pamsimas-tanjungsari.id` | `public_html` |
| Backend API | `api.pamsimas-tanjungsari.id` | diarahkan ke `.../be/public` (lihat 3.4) |

`fe/.env.production`: `VITE_API_BASE_URL=https://api.pamsimas-tanjungsari.id/api`

`be/.env`: `FRONTEND_URLS=https://pamsimas-tanjungsari.id,https://www.pamsimas-tanjungsari.id`

### 3.3 Langkah 1 — Buat Database MySQL di cPanel

1. Buka cPanel > **MySQL Databases**.
2. Buat database baru, misal `pamsimas` (cPanel otomatis menambah prefix akun, hasil akhirnya semacam `namauser_pamsimas`).
3. Buat user database baru dengan password kuat, misal `pamdb` (hasil akhir `namauser_pamdb`).
4. Di bagian **Add User to Database**, tambahkan user tersebut ke database dengan privilese **ALL PRIVILEGES**.
5. Catat nama database lengkap, nama user lengkap, dan password — dipakai untuk `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` di `be/.env`. `DB_HOST` di cPanel biasanya tetap `127.0.0.1` atau `localhost`.

### 3.4 Langkah 2 — Buat Subdomain untuk API

1. Buka cPanel > **Subdomains** (atau **Domains** pada cPanel versi baru).
2. Buat subdomain `api` untuk domain utama sehingga hasilnya `api.pamsimas-tanjungsari.id`.
3. Saat pembuatan, cPanel akan meminta **Document Root**. Jangan biarkan default `public_html/api`. Setelah folder backend selesai diupload (Langkah 3), kembali ke menu ini dan ubah Document Root menjadi folder `be/public` (lihat 3.5).

### 3.5 Langkah 3 — Susun Folder Upload

Letakkan kode backend **di luar `public_html`**, supaya file sensitif seperti `.env` dan folder `app/` tidak bisa diakses langsung lewat URL. Struktur yang disarankan di home directory cPanel:

```text
/home/namauser/
├── public_html/                 <- Document Root domain utama, isi hasil build FE
├── pamsimas_backend/
│   └── be/
│       ├── app/
│       ├── bootstrap/
│       ├── config/
│       ├── public/              <- INI yang jadi Document Root subdomain api.*
│       ├── routes/
│       ├── storage/
│       ├── vendor/
│       ├── .env
│       └── artisan
```

Setelah folder `pamsimas_backend/be/` ada di server, kembali ke **Subdomains**, edit Document Root subdomain `api` menjadi `pamsimas_backend/be/public`.

### 3.6 Langkah 4 — Build FE di Komputer Lokal, lalu Upload

FE **tidak boleh di-build langsung di server cPanel** — Node.js umumnya tidak tersedia atau sangat terbatas di shared hosting. Build di komputer lokal seperti Section 8, lalu upload hasilnya saja.

```powershell
Set-Location fe
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Upload **isi** folder `fe/dist/` (bukan folder `dist` itu sendiri) ke `public_html/`, dengan salah satu cara:

- **File Manager cPanel**: kompres isi `fe/dist/` jadi satu file `dist.zip` di komputer lokal, upload satu file zip itu saja, lalu gunakan tombol **Extract** di File Manager. Jauh lebih cepat dan lebih jarang gagal dibanding upload ratusan file satu per satu.
- **FTP/SFTP** (mis. FileZilla) memakai kredensial dari cPanel > **FTP Accounts**.

### 3.7 Langkah 5 — Upload Backend Laravel

Backend tidak boleh diupload dengan `vendor/` yang belum lengkap atau yang di-build untuk OS lain.

1. Di komputer lokal, jalankan `composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader` di dalam `be/` supaya folder `vendor/` sudah lengkap dan siap pakai.
2. Kompres seluruh folder `be/` (termasuk `vendor/`, tanpa file `.env` produksi asli — isi `.env` production langsung di server saja, lihat 3.9) menjadi `be.zip`.
3. Upload `be.zip` ke `pamsimas_backend/` lewat File Manager, lalu **Extract**.
4. Hapus `be.zip` setelah ekstrak selesai untuk menghemat kuota disk.

Kalau paket hosting punya SSH, cara yang lebih bersih adalah `git clone`/`git pull` langsung di server lalu `composer install` di server (lihat Langkah 6).

### 3.8 Langkah 6 — Jalankan Artisan (via SSH atau Terminal cPanel)

Banyak paket cPanel modern menyediakan menu **Terminal** (cPanel > Advanced > Terminal) atau akses SSH biasa. Kalau tersedia:

```bash
cd ~/pamsimas_backend/be
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
cp .env.example .env   # lalu edit isinya lewat File Manager, lihat 3.9
php artisan key:generate
php artisan migrate --seed --force
php artisan storage:link
php artisan optimize
```

Kalau `APP_KEY` sudah pernah dibuat sebelumnya (server yang sudah punya data), jangan jalankan `key:generate` ulang karena bisa merusak data terenkripsi yang sudah tersimpan.

**Jika hosting tidak menyediakan SSH/Terminal** (umum di paket termurah):

- Cek menu **Setup PHP App** atau **MultiPHP Manager** — beberapa panel modern (cPanel + CloudLinux) menyediakan tombol untuk menjalankan Composer langsung dari UI.
- Kalau benar-benar tidak ada jalan lain, hubungi dukungan hosting untuk minta dijalankan sekali (`composer install`, `artisan migrate --seed`, `artisan storage:link`), atau pertimbangkan naik ke paket yang menyediakan SSH — Laravel pada dasarnya butuh akses command line untuk proses deploy yang benar dan aman.
- Hindari trik "jalankan artisan lewat file PHP yang bisa diakses publik" (mis. `https://domain/run.php` berisi `Artisan::call(...)`) sebagai solusi permanen. Ini lubang keamanan serius kalau file tersebut lupa dihapus setelah dipakai.

### 3.9 Langkah 7 — Set PHP Version dan Environment

1. cPanel > **MultiPHP Manager**: pilih PHP 8.2 atau lebih baru (idealnya 8.4) untuk domain utama maupun subdomain `api`.
2. cPanel > **Select PHP Version** (atau **PHP Extensions**): aktifkan `bcmath`, `ctype`, `curl`, `fileinfo`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`.
3. Buat/edit `be/.env` langsung di server (File Manager > Edit, atau `nano .env` lewat Terminal) mengikuti isi Section 5, dengan penyesuaian khusus cPanel berikut:

```env
APP_URL=https://api.pamsimas-tanjungsari.id
FRONTEND_URL=https://pamsimas-tanjungsari.id
FRONTEND_URLS=https://pamsimas-tanjungsari.id,https://www.pamsimas-tanjungsari.id

DB_HOST=127.0.0.1
DB_DATABASE=namauser_pamsimas
DB_USERNAME=namauser_pamdb
DB_PASSWORD=isi-password-database-cpanel
```

### 3.10 Langkah 8 — Permission Folder

Upload lewat File Manager/FTP milik akun cPanel itu sendiri biasanya sudah otomatis memakai ownership yang benar, jadi permission umumnya tidak perlu diutak-atik manual. Kalau muncul error "permission denied" saat Laravel menulis log/cache:

```bash
chmod -R 755 storage bootstrap/cache
```

Jangan pernah memakai `chmod -R 777` sebagai solusi — itu bukan perbaikan, itu lubang keamanan.

### 3.11 Langkah 9 — Reverse Proxy `/api` dan `/storage`: Kapan Perlu, Kapan Tidak

**Kalau memakai strategi subdomain (Section 3.2, disarankan): tidak perlu reverse proxy sama sekali.** `api.pamsimas-tanjungsari.id` otomatis men-serve Laravel langsung karena Document Root subdomain itu memang folder `be/public/`. Yang perlu dipastikan hanya:

- `fe/.env.production` memakai `VITE_API_BASE_URL=https://api.pamsimas-tanjungsari.id/api` — domain penuh, bukan path relatif `/api`.
- CORS di backend (`FRONTEND_URLS`) mengizinkan domain FE, karena FE dan API sekarang berada di origin berbeda.
- File upload otomatis bisa diakses lewat `https://api.pamsimas-tanjungsari.id/storage/...`, karena `php artisan storage:link` membuat symlink `public/storage` di dalam folder `be/public/` yang sama — tidak perlu proxy tambahan untuk ini.

**Kalau tetap memaksakan satu domain dengan path `/api` (skema Section 2), baru reverse proxy jadi relevan** — dan di cPanel shared hosting ini jauh lebih rumit dan rapuh dibanding subdomain, karena:

- Modul `mod_proxy` / `mod_proxy_http` Apache **hampir selalu dimatikan** di shared hosting cPanel demi keamanan multi-tenant. User biasa tidak bisa mengaktifkannya sendiri — itu butuh akses WHM root dan rebuild EasyApache4.
- Alternatif lewat `.htaccess` dengan flag proxy `[P]` pada `mod_rewrite` **hanya berfungsi kalau `mod_proxy` sudah aktif di server**. Coba dulu; kalau muncul error 500, artinya modul tidak tersedia dan harus pindah ke strategi subdomain (3.2):

```apache
# public_html/.htaccess — HANYA berfungsi jika mod_proxy aktif di server (tanyakan ke hosting)
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/api/(.*)$
RewriteRule ^api/(.*)$ https://api.pamsimas-tanjungsari.id/$1 [P,L]

RewriteCond %{REQUEST_URI} ^/storage/(.*)$
RewriteRule ^storage/(.*)$ https://api.pamsimas-tanjungsari.id/storage/$1 [P,L]
```

- Kalau hosting adalah VPS terkelola dengan WHM dan punya **Nginx Manager** (plugin EA4 + CloudLinux) atau akses **Apache Include Editor**, reverse proxy path bisa dipasang di level virtual host. Tapi ini setara dengan skenario VPS pada Section 9, bukan lagi "cPanel shared hosting biasa".
- **Kesimpulan praktis:** pakai strategi subdomain di cPanel shared hosting. Reverse proxy path-based (`proxy_pass`, `[P]` di `.htaccess`) realistis dipakai hanya di VPS/WHM dengan akses root, sesuai contoh Nginx pada Section 9.

### 3.12 Langkah 10 — Aktifkan SSL

1. Buka cPanel > **SSL/TLS Status** atau **AutoSSL**, aktifkan untuk domain utama **dan** subdomain `api`.
2. Tunggu beberapa menit sampai sertifikat terbit, pastikan kedua domain sudah bisa diakses lewat `https://` sebelum mengetes login. Token Sanctum, penyimpanan sesi di localStorage, dan instalasi PWA semuanya membutuhkan HTTPS untuk aman/berfungsi.

### 3.13 Langkah 11 — Cron Job (kalau scheduler Laravel dipakai nanti)

Buka cPanel > **Cron Jobs**, tambahkan:

```text
* * * * * php /home/namauser/pamsimas_backend/be/artisan schedule:run >> /dev/null 2>&1
```

### 3.14 Ringkasan Urutan cPanel

1. Buat database dan user MySQL (3.3).
2. Buat subdomain `api.*`, Document Root sementara biarkan default dulu (3.4).
3. Build FE di lokal, upload isi `fe/dist/` ke `public_html/` (3.6).
4. `composer install --no-dev` di lokal, lalu upload folder `be/` (dengan `vendor/` lengkap) ke luar `public_html` (3.7).
5. Kembali ke Subdomains, arahkan Document Root `api.*` ke `.../be/public` (3.4-3.5).
6. Isi `be/.env`, jalankan `key:generate`, `migrate --seed --force`, `storage:link`, `optimize` lewat SSH/Terminal (3.8-3.9).
7. Set PHP version dan ekstensi lewat MultiPHP Manager (3.9).
8. Aktifkan SSL/AutoSSL di domain utama dan subdomain `api` (3.12).
9. Uji pakai checklist Section 13 dokumen ini.

## 4. Prasyarat Server

- PHP 8.2 atau lebih baru; PHP 8.4 direkomendasikan.
- MySQL 8.0 atau lebih baru.
- Composer 2.
- Node.js hanya dibutuhkan pada mesin build FE.
- Ekstensi PHP: `bcmath`, `ctype`, `curl`, `fileinfo`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, dan `xml`.

## 5. Environment Backend Production

Buat `be/.env` dari contoh, lalu isi minimal:

```env
APP_NAME=PAMSIMAS
APP_ENV=production
APP_DEBUG=false
APP_URL=https://pamsimas-domain.id

FRONTEND_URL=https://pamsimas-domain.id
FRONTEND_URLS=https://pamsimas-domain.id,https://www.pamsimas-domain.id

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sistem_pamsimas
DB_USERNAME=pamsimas_user
DB_PASSWORD=password-database-yang-kuat

FILESYSTEM_DISK=public
SEED_DEMO_DATA=false
INITIAL_ADMIN_PASSWORD=ganti-dengan-password-kuat

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=isi-id-reverb
REVERB_APP_KEY=isi-key-reverb
REVERB_APP_SECRET=isi-secret-reverb
REVERB_HOST=pamsimas-domain.id
REVERB_PORT=443
REVERB_SCHEME=https
```

Jangan memakai user database `root`. Jangan commit `.env`.

Password Petugas tidak memakai environment terpisah. Password Petugas mengikuti nomor HP yang dikelola Admin dan otomatis berubah ketika nomor tersebut diperbarui.

Instal backend:

```powershell
Set-Location be
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
php artisan key:generate
```

Jika `APP_KEY` sudah ada dari server sebelumnya, jangan generate ulang karena dapat merusak data terenkripsi yang sudah tersimpan.

## 6. Migrasi dan Seed Aman

### Database production yang sudah berisi data

```powershell
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

Jangan menjalankan `migrate:fresh` dan jangan menjalankan seeder demo.

### Database production baru dan kosong

Pastikan `SEED_DEMO_DATA=false`, lalu:

```powershell
php artisan migrate --seed --force
php artisan storage:link
php artisan optimize
```

Perintah tersebut membuat akun inti, master wilayah, tarif, akun kas kosong, dan konfigurasi publik dasar. Perintah tersebut tidak membuat pelanggan atau transaksi dummy.

### Staging demo yang boleh dihapus

Hanya pada database staging disposable:

```env
SEED_DEMO_DATA=true
```

```powershell
php artisan migrate:fresh --seed --force
```

`PamsimasSeeder` tidak boleh dipakai pada database production nyata.

## 7. Backup Sebelum Release

```powershell
mysqldump -u pamsimas_user -p sistem_pamsimas > sistem_pamsimas-before-deploy.sql
```

Backup juga folder `be/storage/app/public/` karena berisi:

- gambar peta,
- bukti pembayaran dan QRIS,
- nota pengeluaran,
- foto akun dan pengurus.

Database dan storage harus dibackup sebagai satu pasangan agar referensi file tetap konsisten.

## 8. Build Frontend Production

Buat `fe/.env.production`.

Untuk satu domain/reverse proxy:

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK_API=false
VITE_REVERB_APP_KEY=isi-sama-dengan-REVERB_APP_KEY-backend
VITE_REVERB_HOST=pamsimas-domain.id
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Untuk API domain terpisah (termasuk skema subdomain cPanel pada Section 3):

```env
VITE_API_BASE_URL=https://api.pamsimas-domain.id/api
VITE_USE_MOCK_API=false
VITE_REVERB_APP_KEY=isi-sama-dengan-REVERB_APP_KEY-backend
VITE_REVERB_HOST=api.pamsimas-domain.id
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Build:

```powershell
Set-Location fe
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Unggah isi `fe/dist/` ke document root FE.

## 9. Konfigurasi Lokal Vite

`fe/vite.config.ts` meneruskan `/api` dan `/storage` ke `http://127.0.0.1:8000`. Karena itu konfigurasi lokal yang direkomendasikan adalah:

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK_API=false
VITE_REVERB_APP_KEY=isi-sama-dengan-REVERB_APP_KEY-backend
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

Jalankan Laravel pada port `8000`, lalu restart Vite setelah mengubah `.env`. Proxy ini menghindari kegagalan login akibat perbedaan port `5173`, `5174`, atau port Vite lain.

Jalankan Reverb pada terminal backend kedua:

```powershell
Set-Location be
php artisan reverb:start --host=127.0.0.1 --port=8080
```

Jika hanya ingin presentasi dummy, cukup pakai `VITE_USE_MOCK_API=true` atau `npm.cmd run dev:mock`; Reverb tidak perlu dinyalakan.

## 10. SPA Rewrite dan Reverse Proxy (VPS/Akses Root)

Bagian ini berlaku untuk VPS/dedicated dengan akses root ke konfigurasi Apache/Nginx dan kemampuan menjalankan proses PHP yang hidup terus (`php artisan serve`, `reverb:start`, dikelola Supervisor/systemd). **Untuk shared hosting cPanel biasa, pakai strategi subdomain pada Section 3 — bagian ini tidak berlaku di sana** karena `mod_proxy` umumnya tidak tersedia dan tidak ada proses backend permanen untuk di-proxy.

Semua route FE harus kembali ke `index.html`.

Apache FE:

```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_URI} !^/storage/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Nginx satu domain:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /storage/ {
    proxy_pass http://127.0.0.1:8000/storage/;
    proxy_set_header Host $host;
}

location /app/ {
    proxy_http_version 1.1;
    proxy_pass http://127.0.0.1:8080/app/;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /apps/ {
    proxy_http_version 1.1;
    proxy_pass http://127.0.0.1:8080/apps/;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Jika API memakai virtual host sendiri, gunakan rewrite Laravel bawaan pada `be/public/.htaccess` atau `try_files $uri $uri/ /index.php?$query_string`.

## 11. Queue, Scheduler, dan Logging

Fitur saat ini dapat berjalan tanpa queue worker khusus untuk alur utama. Tetap siapkan log rotation untuk `be/storage/logs/laravel.log`.

Realtime production membutuhkan proses Reverb yang hidup terus:

```powershell
php artisan reverb:start --host=0.0.0.0 --port=8080
```

Pada VPS, jalankan melalui Supervisor/systemd/Process Manager hosting. Jika Reverb mati, transaksi database tetap berhasil, tetapi halaman lain baru update setelah refresh manual. Pada shared hosting cPanel, proses permanen seperti ini umumnya tidak didukung — lihat catatan di Section 3.1.

Jika scheduler Laravel ditambah kemudian, pasang cron:

```text
* * * * * php /path/to/be/artisan schedule:run
```

## 12. PWA dan Cache

Build FE menghasilkan:

- `manifest.webmanifest`,
- `sw.js`,
- `workbox-*.js`,
- ikon PWA 192 dan 512 piksel.

Aturan deployment:

- `sw.js` dan `manifest.webmanifest` jangan diberi browser cache jangka panjang.
- aset bernama hash boleh diberi cache panjang.
- API publik memakai strategi `NetworkFirst`.
- gambar memakai `CacheFirst`.
- setelah release besar, tutup tab lama, refresh, dan pastikan service worker baru berstatus activated.

## 13. Pemeriksaan Pascadeploy

1. Buka `/api/health`; `status` dan `database` harus `ok`.
2. Buka `/api/publik/map`, `/api/publik/profile`, `/api/publik/faqs`, dan `/api/publik/summary`.
3. Login Admin dan pastikan log `auth.login` tampil di dashboard.
4. Login Petugas dan pastikan pelanggan hanya berasal dari wilayah tugas.
5. Pastikan database baru menampilkan angka nol, bukan dummy.
6. Uji staging: input meter -> tagihan -> cetak kwitansi -> pembayaran -> setoran -> verifikasi -> kas -> laporan.
7. Simpan perubahan peta/profil/FAQ dari Admin dan cek Publik/Admin lain terupdate lewat WebSocket tanpa refresh manual (di cPanel tanpa Reverb, ini wajar hanya update setelah refresh manual — lihat Section 3.1 dan 11).
8. Pastikan `/storage/...` dapat dibuka.
9. Uji direct refresh pada `/website/admin/dashboard` dan route dalam lain.
10. Periksa manifest dan service worker melalui DevTools Application.

## 14. Verifikasi Release

Backend:

```powershell
php artisan test
php artisan migrate:status
php artisan route:list --path=api --except-vendor
php artisan config:show cors
php artisan config:show broadcasting
```

Frontend:

```powershell
npm.cmd run lint
npm.cmd run build
```

## 15. Rollback

1. Aktifkan maintenance mode: `php artisan down`.
2. Kembalikan source release sebelumnya.
3. Jalankan `php artisan optimize:clear`.
4. Pulihkan database hanya jika migration release tidak backward-compatible.
5. Pulihkan storage jika file upload ikut berubah.
6. Build dan unggah ulang FE versi sebelumnya.
7. Jalankan `php artisan up`.

## 16. Checklist Keamanan

- `APP_DEBUG=false`.
- `SEED_DEMO_DATA=false`.
- password akun awal sudah diganti.
- password database kuat dan user database terbatas.
- HTTPS aktif.
- `FRONTEND_URLS` hanya berisi domain resmi.
- backup database dan storage berjalan harian.
- `.env`, dump SQL, dan log tidak dapat diakses publik.
- folder backend (`app/`, `.env`, `vendor/`) berada di luar `public_html` pada hosting cPanel, hanya `be/public/` yang menjadi document root publik.
