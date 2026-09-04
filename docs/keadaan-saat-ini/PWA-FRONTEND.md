# Implementasi PWA Frontend PAMSIMAS

## Tujuan

Frontend PAMSIMAS dibangun sebagai Progressive Web App agar dapat dipasang pada desktop atau perangkat mobile, memiliki kerangka aplikasi yang dapat dibuka kembali saat offline, dan tetap memprioritaskan data terbaru ketika jaringan tersedia.

## Komponen

- `vite-plugin-pwa` menghasilkan Web App Manifest dan service worker pada build produksi.
- `manifest.webmanifest` memakai nama `PAMSIMAS Tanjungsari` dan logo resmi KPSPAMS Tirta Sari dari template kwitansi.
- `sw.js` melakukan precache terhadap HTML, CSS, JavaScript, ikon, dan aset inti aplikasi.
- `registerSW.js` mendaftarkan service worker secara otomatis.
- versi service worker diperbarui otomatis ketika deployment baru tersedia.

## Kebijakan Cache

| Sumber | Strategi | Batas | Tujuan |
| --- | --- | --- | --- |
| Aset build inti | Precache | Berdasarkan revisi build | Kerangka aplikasi tersedia offline |
| `GET /api/publik/*` | Network First | 40 respons, 24 jam | Utamakan data terbaru, gunakan cache ketika API gagal |
| Gambar | Cache First | 30 gambar, 30 hari | Mengurangi unduhan ulang peta dan gambar publik |
| Google Fonts CSS | Stale While Revalidate | Cache terpisah | Teks tetap tampil cepat |
| Google Fonts file | Cache First | 10 file, 1 tahun | Font tersedia setelah kunjungan pertama |

Endpoint login, admin, petugas, pembayaran, setoran, kas, pengeluaran, laporan internal, serta request `POST`, `PUT`, `PATCH`, dan `DELETE` tidak dicache. Pembatasan ini mencegah data transaksi lama tampil sebagai data resmi.

Gambar peta yang besar tidak masuk precache instalasi. Gambar tersebut baru disimpan setelah pengguna membuka halaman terkait sehingga instalasi awal tetap ringan dan sesuai pola lazy loading.

## File Sumber

- konfigurasi manifest dan Workbox: `fe/vite.config.ts`
- metadata browser dan Apple PWA: `fe/index.html`
- logo sumber kwitansi: `fe/src/assets/logo-pamsimas.png`
- ikon aplikasi: `fe/public/pwa-icon-192.png`
- ikon aplikasi resolusi besar: `fe/public/pwa-icon-512.png`
- ikon maskable Android: `fe/public/pwa-maskable-512.png`
- ikon perangkat Apple: `fe/public/apple-touch-icon.png`

File `fe/dist/sw.js` dan `fe/dist/manifest.webmanifest` adalah hasil build dan tidak diedit manual.

## Menjalankan dan Menguji Lokal

Service worker diuji melalui build produksi, bukan hanya server development.

```powershell
cd fe
npm.cmd run build
npm.cmd run preview
```

Buka alamat preview yang tampil di terminal, lalu periksa DevTools browser:

1. buka tab `Application`,
2. periksa `Manifest` dan pastikan ikon serta tombol install tersedia,
3. periksa `Service Workers` dan pastikan status `activated and is running`,
4. buka halaman publik yang memuat data API,
5. pada tab `Network`, aktifkan `Offline`,
6. muat ulang halaman dan pastikan kerangka aplikasi serta data publik yang pernah dimuat masih tersedia.

Service worker hanya bekerja pada HTTPS atau `localhost`. Hosting produksi harus menggunakan HTTPS dan server harus meneruskan seluruh route frontend non-file ke `index.html` agar routing SPA tetap berjalan.

## Hasil Build yang Diharapkan

```text
dist/manifest.webmanifest
dist/registerSW.js
dist/sw.js
dist/workbox-*.js
```

Setiap deployment frontend wajib menjalankan `npm.cmd run build` agar daftar revisi precache dan service worker ikut diperbarui.
