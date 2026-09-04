# Digitalisasi Sistem Pamsimas Tanjungsari

Aplikasi web untuk digitalisasi pengelolaan air bersih Pamsimas Desa Tanjungsari: pencatatan meter, tagihan/kwitansi, pembayaran, laporan, dan portal publik/warga. Terdiri dari **backend API (Laravel)** dan **frontend PWA (React + Vite)**.

> Baru gabung di project ini? Baca [Panduan Onboarding](#-panduan-onboarding-untuk-kontributor-baru) di bawah — itu urutan baca yang disarankan sebelum menyentuh kode.

---

## 🗂️ Struktur Repo

```
.
├── fe/     → Frontend: React 19 + TypeScript + Vite, PWA, mode Mock/Real API
├── be/     → Backend: Laravel 12 REST API + Sanctum + Reverb (realtime)
└── docs/   → Semua dokumentasi: requirement, status project, tutorial, template
```

| Folder | Isi | Mulai dari |
|---|---|---|
| [`fe/`](fe) | Kode React modul Publik, Admin, Petugas | [fe/README.md](fe/README.md) |
| [`be/`](be) | Kode Laravel API, migrations, seeders | [be/README.md](be/README.md) |
| [`docs/`](docs) | Requirement, status project, tutorial, template | [docs/README.md](docs/README.md) |

---

## 🚀 Quick Start (Lokal)

Butuh PHP 8.2+, Composer, Node.js, MySQL, dan npm berjalan di mesin lokal.

**1. Backend**

```bash
cd be
composer install
cp .env.example .env
php artisan key:generate
# sesuaikan DB_DATABASE, DB_USERNAME, DB_PASSWORD di .env
php artisan migrate --seed
php artisan serve
```

Backend jalan di `http://127.0.0.1:8000`.

**2. Frontend**

```bash
cd fe
npm install
npm run dev
```

Frontend jalan di `http://127.0.0.1:5173`, default `VITE_USE_MOCK_API=true` (pakai data mock, tidak perlu backend nyala). Ubah ke `false` di `.env` untuk konek ke backend asli — lihat [ARSITEKTUR-FE-MOCK-REAL-API.md](docs/requirement/ARSITEKTUR-FE-MOCK-REAL-API.md).

**3. (Opsional) Realtime**

Backend pakai Laravel Reverb untuk broadcast realtime. Jalankan bila fitur realtime dites:

```bash
cd be
php artisan reverb:start
```

---

## 📌 Status Project Saat Ini

Project ini **sedang berjalan aktif**, sebagian modul sudah selesai dan sebagian masih dalam pengembangan. Jangan asumsikan semua fitur di dokumen requirement sudah terimplementasi — cek dulu:

- [REPORT-PROGRESS-BACKEND.md](docs/keadaan-saat-ini/REPORT-PROGRESS-BACKEND.md) — fitur backend mana yang sudah/belum
- [PWA-FRONTEND.md](docs/keadaan-saat-ini/PWA-FRONTEND.md) — status PWA & frontend
- [RIWAYAT-PERUBAHAN.md](docs/keadaan-saat-ini/RIWAYAT-PERUBAHAN.md) — histori perubahan terbaru

---

## 📖 Panduan Onboarding untuk Kontributor Baru

Ikuti urutan ini supaya tidak nyasar — jangan langsung buka kode sebelum paham konteks bisnisnya.

### Tahap 1 — Paham dulu ini project apa

| # | Dokumen | Kenapa dibaca |
|---|---|---|
| 1 | [PRD-PAMSIMAS.md](docs/requirement/PRD-PAMSIMAS.md) | Apa yang dibangun & tujuannya |
| 2 | [MODEL BISNIS & FLOW SISTEM.txt](<docs/requirement/MODEL BISNIS & FLOW SISTEM.txt>) | Alur bisnis Pamsimas dari awal sampai akhir |
| 3 | [SRS-PAMSIMAS.md](docs/requirement/SRS-PAMSIMAS.md) | Kebutuhan fungsional detail per modul |

### Tahap 2 — Paham struktur data & kontrak FE-BE

| # | Dokumen | Kenapa dibaca |
|---|---|---|
| 4 | [ERD-PAMSIMAS.md](docs/requirement/ERD-PAMSIMAS.md) | Skema database & relasi antar tabel |
| 5 | [API-CONTRACT-MODUL-KOMPLEKS.md](docs/requirement/API-CONTRACT-MODUL-KOMPLEKS.md) | Format request/response API antara FE dan BE |

### Tahap 3 — Cek posisi project saat ini (baru boleh buka kode setelah ini)

| # | Dokumen | Kenapa dibaca |
|---|---|---|
| 6 | [STRUKTUR-FOLDER-PROYEK.md](docs/keadaan-saat-ini/STRUKTUR-FOLDER-PROYEK.md) | Peta folder project secara keseluruhan |
| 7 | [REPORT-PROGRESS-BACKEND.md](docs/keadaan-saat-ini/REPORT-PROGRESS-BACKEND.md) | Fitur mana yang sudah jadi, mana yang belum |
| 8 | [BE STRUKTURUT.md](<docs/keadaan-saat-ini/BE STRUKTURUT.md>) | Struktur kode backend saat ini |

### Tahap 4 — Masuk teknis (pilih sesuai fokus kerja)

**Kalau kerja di Backend:**
1. [be/ARCHITECTURE-BACKEND-DATABASE.md](be/ARCHITECTURE-BACKEND-DATABASE.md) — arsitektur & konvensi backend
2. [be/README.md](be/README.md) — cara install & jalankan
3. Baca `be/routes/api.php` untuk lihat endpoint yang benar-benar aktif

**Kalau kerja di Frontend:**
1. [ARSITEKTUR-FE-MOCK-REAL-API.md](docs/requirement/ARSITEKTUR-FE-MOCK-REAL-API.md) — **wajib dibaca**, karena FE punya dua mode (Mock/Real API) yang menentukan cara kerja seluruh data layer
2. [fe/README.md](fe/README.md) — cara install & jalankan
3. Explore `fe/src/modules` untuk lihat pembagian modul Publik/Admin/Petugas

### Tahap 5 — Operasional & Deployment

| # | Dokumen | Kenapa dibaca |
|---|---|---|
| 9 | [ALUR-PENGGUNAAN-APLIKASI.md](docs/tutorial/ALUR-PENGGUNAAN-APLIKASI.md) | Cara pakai aplikasi dari sisi user akhir |
| 10 | [DEPLOYMENT-FULLSTACK.md](docs/tutorial/DEPLOYMENT-FULLSTACK.md) | Panduan deploy FE + BE ke hosting/production |

---

## 🛠️ Perintah Penting

**Frontend** (`fe/`)

```bash
npm run dev         # dev server, mode Real API (sesuai .env)
npm run dev:mock    # dev server, paksa mode Mock API
npm run lint         # oxlint
npm run build        # build production (generate PWA/service worker)
npm run preview      # preview hasil build
```

**Backend** (`be/`)

```bash
php artisan serve           # jalankan API server
php artisan migrate         # jalankan migration
php artisan migrate:fresh --seed  # reset DB + seed ulang
php artisan test            # jalankan test suite
php artisan reverb:start    # jalankan server realtime broadcast
```

---

## 📚 Dokumentasi Lengkap

Semua dokumen ada di folder [`docs/`](docs) — lihat [docs/README.md](docs/README.md) untuk penjelasan tiap subfolder (`requirement`, `keadaan-saat-ini`, `template`, `tutorial`).

> Catatan: folder `docs/` hanya referensi, **tidak ikut di-deploy ke production**.
