# Struktur Folder Proyek PAMSIMAS

Dokumen ini mencatat struktur aktif proyek setelah pembersihan pada 21 Agustus 2026.

## 1. Folder Utama

Root proyek hanya memiliki tiga folder utama:

```text
DIGITALISASI SISTEM PAMSIMAS TANJUNGSARI/
|-- be/
|-- docs/
`-- fe/
```

| Folder | Status | Isi |
|---|---|---|
| `be/` | Aktif | Laravel 12, REST API, autentikasi Sanctum, migration, seeder, service bisnis, dan test. |
| `fe/` | Aktif | React, TypeScript, Vite, PWA, UI Publik/Admin/Petugas, Mock API, dan Real API adapter. |
| `docs/` | Aktif | SRS, PRD, ERD, API contract, panduan deployment, template, dan aset referensi. |

## 2. Backend Aktif

```text
be/
|-- app/
|   |-- Http/Controllers/Api/
|   |-- Http/Middleware/
|   |-- Http/Requests/
|   |-- Http/Resources/
|   |-- Models/
|   `-- Services/
|-- bootstrap/
|-- config/
|-- database/
|   |-- migrations/
|   `-- seeders/
|-- public/
|-- routes/api.php
|-- storage/
|-- tests/
|-- .env
|-- .env.example
|-- .env.production.example
|-- artisan
|-- composer.json
`-- composer.lock
```

### Bagian penting backend

| Path | Fungsi |
|---|---|
| `be/routes/api.php` | Seluruh endpoint Publik, Admin, Petugas, auth, dan health check. |
| `be/app/Http/Controllers/Api/Admin/` | CRUD master, kwitansi, setoran, kas, pengeluaran, laporan, profil, peta, dan pengaturan. |
| `be/app/Http/Controllers/Api/Petugas/` | Dashboard, profil, pelanggan wilayah, input meter, pembayaran, dan setoran. |
| `be/app/Http/Controllers/Api/Publik/` | Ringkasan publik, FAQ, dan transparansi. |
| `be/app/Services/` | Transaksi atomik ledger kas, verifikasi setoran, pengeluaran, laporan, dan batch kwitansi. |
| `be/database/migrations/` | Struktur database MySQL aktif. |
| `be/database/seeders/PamsimasSeeder.php` | Data awal lokal/staging, bukan untuk menimpa produksi. |
| `be/tests/Feature/` | Test kontrak API dan alur bisnis lintas modul. |
| `be/storage/app/public/` | Bukti pembayaran, peta publik, foto akun/pengurus, dan upload lain. |

`be/vendor/`, cache di `be/storage/framework/`, serta `be/storage/logs/` adalah hasil runtime dan bukan source yang diedit manual.

## 3. Frontend Aktif

```text
fe/
|-- public/
|-- src/
|   |-- app/
|   |   |-- config/
|   |   |-- router/
|   |   `-- services/
|   |-- assets/
|   |-- components/
|   |-- modules/
|   |   |-- admin/
|   |   |-- petugas/
|   |   `-- publik/
|   |-- App.tsx
|   `-- types.ts
|-- .env
|-- .env.example
|-- .env.production.example
|-- package.json
|-- vite.config.ts
`-- dist/
```

### Pemisahan data frontend

| Path | Fungsi |
|---|---|
| `fe/src/app/config/environment.ts` | Sakelar `VITE_USE_MOCK_API`. |
| `fe/src/app/services/*MockRepository.ts` | Mini backend lokal berbasis `localStorage`. |
| `fe/src/app/services/*RealRepository.ts` | Adapter REST API Laravel. |
| `fe/src/modules/admin/services/adminApi.ts` | Kontrak real API untuk modul Admin dan konten publik. |
| `fe/src/app/services/authService.ts` | Login, validasi sesi, logout, dan role. |
| `fe/src/app/router/routeConfig.ts` | Pemetaan URL Publik, Admin, dan Petugas. |
| `fe/src/modules/*/pages/` | UI tiap role; komponen tidak menentukan sumber data. |

Mode lokal terintegrasi saat ini:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK_API=false
```

Untuk demo FE tanpa Laravel, ubah hanya `VITE_USE_MOCK_API=true` lalu jalankan ulang Vite.

`fe/dist/` adalah hasil build produksi dan dapat dibuat ulang dengan `npm.cmd run build`.

## 4. Dokumentasi Aktif

| Path | Isi |
|---|---|
| `docs/requirement/SRS-PAMSIMAS.md` | Kebutuhan sistem paling rinci. |
| `docs/requirement/PRD-PAMSIMAS.md` | Tujuan produk dan prioritas. |
| `docs/requirement/ERD-PAMSIMAS.md` | Relasi entitas database. |
| `docs/requirement/API-CONTRACT-MODUL-KOMPLEKS.md` | Kontrak endpoint modul transaksi. |
| `docs/requirement/ARSITEKTUR-FE-MOCK-REAL-API.md` | Repository pattern Mock/Real API. |
| `docs/tutorial/DEPLOYMENT-FULLSTACK.md` | Deployment FE, BE, database, storage, dan PWA. |
| `docs/keadaan-saat-ini/REPORT-PROGRESS-BACKEND.md` | Status implementasi dan hasil pengujian terbaru. |
| `docs/keadaan-saat-ini/PWA-FRONTEND.md` | Manifest, service worker, dan strategi cache. |

## 5. Yang Tidak Boleh Diunggah sebagai Source Utama

- `fe/node_modules/`
- `be/vendor/` jika hosting menjalankan Composer sendiri
- `be/.env` dan `fe/.env`
- `be/storage/logs/*`
- `be/storage/framework/cache/*`
- backup database lokal

File `.env.production.example` boleh diunggah karena tidak berisi rahasia.
