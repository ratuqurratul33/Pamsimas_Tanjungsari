# Struktur Dokumen PAMSIMAS

Folder `docs` hanya untuk dokumentasi dan bahan referensi. Folder ini tidak perlu diunggah ke hosting production.

## 1. `requirement`

Berisi dokumen kebutuhan dan rancangan sistem:

- SRS,
- PRD,
- ERD,
- user flow,
- business flow,
- API contract,
- arsitektur FE Mock/Real API.

## 2. `keadaan-saat-ini`

Berisi status implementasi dan kondisi proyek saat ini:

- report progress backend,
- struktur backend,
- struktur folder proyek,
- status PWA/frontend.

## 3. `template`

Berisi bahan template dan aset referensi desain:

- template kwitansi,
- template laporan,
- logo,
- gambar peta jalur air,
- contoh PDF/XLSX.

Catatan penting: aplikasi production tidak boleh mengambil file langsung dari folder ini. Jika ada desain/aset yang dipakai aplikasi, salin/konversi ke folder runtime yang sesuai di `fe` atau `be/storage`.

## 4. `tutorial`

Berisi panduan operasional:

- deployment fullstack,
- production setup,
- langkah menjalankan server lokal/hosting.
