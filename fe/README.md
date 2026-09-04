# Frontend PAMSIMAS Tanjungsari

Frontend React, TypeScript, dan Vite untuk modul Publik, Admin, serta Petugas. Aplikasi mendukung repository Mock/Real API, lazy-loaded pages, dan Progressive Web App.

## Menjalankan Development

```powershell
npm.cmd install
npm.cmd run dev
```

## Verifikasi

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

PWA dan service worker dihasilkan saat `npm.cmd run build`. Gunakan server preview atau hosting HTTPS untuk menguji instalasi dan mode offline.

Konfigurasi API berada pada `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK_API=true
```

Dokumentasi kebijakan cache dan pengujian tersedia di `docs/PWA-FRONTEND.md`.
