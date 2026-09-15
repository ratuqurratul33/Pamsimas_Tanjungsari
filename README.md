# Digitalisasi Sistem Pamsimas Tanjungsari

A web-based platform for digitalizing the clean water management of Pamsimas Tanjungsari Village — covering meter recording, billing/receipts, payments, reporting, and a public/citizen portal.

---

## Features

- Water meter recording and usage tracking per customer
- Automated billing and digital receipt generation
- Payment recording and tracking
- Administrative reporting and analytics dashboard
- Public portal for citizens to check bills and usage
- Role-based modules: Public, Admin, and Petugas (field officer)
- Real-time notifications via WebSocket broadcasting
- Installable Progressive Web App (PWA) with offline-ready support
- Switchable Mock API / Real API mode for independent frontend development

---

## Tech Stack

**Backend**
- Laravel 12 (REST API)
- Laravel Sanctum (authentication)
- Laravel Reverb (realtime broadcasting)
- MySQL

**Frontend**
- React 19 + TypeScript
- Vite
- PWA (Progressive Web App)

**Documentation**
- Markdown-based docs (requirements, current status, tutorials, templates)

---

## Project Purpose

This project digitalizes the manual water-management workflow of Pamsimas Tanjungsari into a connected web system, replacing paper-based meter recording, billing, and reporting.

**Architecture concept:**
- Decoupled frontend and backend, communicating through a documented REST API contract
- Backend (`be/`) exposes the API, handles auth, business logic, and realtime events
- Frontend (`fe/`) consumes the API and can run in **Mock API mode** (using local mock data, no backend required) or **Real API mode** (connected to the live backend) — see [ARSITEKTUR-FE-MOCK-REAL-API.md](docs/requirement/ARSITEKTUR-FE-MOCK-REAL-API.md)
- Frontend modules are separated by user role: **Public**, **Admin**, and **Petugas**

**Repository structure:**

- `fe/` → Frontend: React 19 + TypeScript + Vite, PWA, Mock/Real API mode
- `be/` → Backend: Laravel 12 REST API + Sanctum + Reverb (realtime)
- `docs/` → All documentation: requirements, project status, tutorials, templates

| Folder | Contents | Start here |
|---|---|---|
| [`fe/`](fe) | React code for Public, Admin, Petugas modules | [fe/README.md](fe/README.md) |
| [`be/`](be) | Laravel API code, migrations, seeders | [be/README.md](be/README.md) |
| [`docs/`](docs) | Requirements, project status, tutorials, templates | [docs/README.md](docs/README.md) |

---

## Notes

- This project is **actively under development** — some modules are complete, others are still in progress. Don't assume everything in the requirement docs is already implemented; check the current status first:
  - [REPORT-PROGRESS-BACKEND.md](docs/keadaan-saat-ini/REPORT-PROGRESS-BACKEND.md) — which backend features are done/pending
  - [PWA-FRONTEND.md](docs/keadaan-saat-ini/PWA-FRONTEND.md) — frontend/PWA status
  - [RIWAYAT-PERUBAHAN.md](docs/keadaan-saat-ini/RIWAYAT-PERUBAHAN.md) — recent change history
- The `docs/` folder is reference material only — it is **not deployed to production**.
- New contributors should read the docs in this order before touching the code: [PRD-PAMSIMAS.md](docs/requirement/PRD-PAMSIMAS.md) → [MODEL BISNIS & FLOW SISTEM.txt](<docs/requirement/MODEL BISNIS & FLOW SISTEM.txt>) → [SRS-PAMSIMAS.md](docs/requirement/SRS-PAMSIMAS.md) → [ERD-PAMSIMAS.md](docs/requirement/ERD-PAMSIMAS.md) → [API-CONTRACT-MODUL-KOMPLEKS.md](docs/requirement/API-CONTRACT-MODUL-KOMPLEKS.md) → [STRUKTUR-FOLDER-PROYEK.md](docs/keadaan-saat-ini/STRUKTUR-FOLDER-PROYEK.md)

---

## Preview

<!-- Add screenshots or a demo GIF of the app here -->

---

## How to Build

Requires PHP 8.2+, Composer, Node.js, MySQL, and npm installed locally.

**1. Backend**

```bash
cd be
composer install
cp .env.example .env
php artisan key:generate
# adjust DB_DATABASE, DB_USERNAME, DB_PASSWORD in .env
php artisan migrate --seed
php artisan serve
```

Backend runs at `http://127.0.0.1:8000`.

**2. Frontend**

```bash
cd fe
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`. Defaults to `VITE_USE_MOCK_API=true` (mock data, no backend required). Set it to `false` in `.env` to connect to the real backend — see [ARSITEKTUR-FE-MOCK-REAL-API.md](docs/requirement/ARSITEKTUR-FE-MOCK-REAL-API.md).

**3. Realtime (optional)**

The backend uses Laravel Reverb for realtime broadcasting. Run it when testing realtime features:

```bash
cd be
php artisan reverb:start
```

**Other useful commands**

```bash
# Frontend (fe/)
npm run dev:mock    # dev server, force Mock API mode
npm run lint        # run oxlint
npm run build       # production build (generates PWA/service worker)
npm run preview     # preview the production build

# Backend (be/)
php artisan migrate:fresh --seed  # reset DB and reseed
php artisan test                  # run test suite
```

---

## Developer

**Ratu Qurratul Aini**
Informatics Engineering Student

- Email: ratuquratul@gmail.com
- LinkedIn: [linkedin.com/in/ratu-qurratul-aini-885b7a2a6](https://www.linkedin.com/in/ratu-qurratul-aini-885b7a2a6/)
