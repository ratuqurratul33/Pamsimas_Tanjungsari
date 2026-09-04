# PRD PAMSIMAS

## Product Requirements Document
**Digitalisasi Sistem PAMSIMAS Tanjungsari**  
Versi 1.3  
Dokumen ini merangkum tujuan produk, masalah utama, ruang lingkup, dan prioritas fitur berdasarkan flow terbaru sistem.

## 1. Ringkasan Eksekutif
Produk ini dibuat untuk mendigitalisasi operasional PAMSIMAS tanpa mengubah kebiasaan inti di lapangan. Petugas tetap membawa kwitansi fisik dan menerima pembayaran langsung dari pelanggan, sementara sistem digital dipakai untuk mencatat meter, pembayaran, setoran, verifikasi, kas, transparansi, dan laporan.

Perubahan terpenting pada flow terbaru:
- petugas menyimpan input meter sebelum kwitansi masuk antrean cetak,
- sistem menghitung tagihan dan membuat antrean kwitansi secara otomatis,
- tidak ada preview cetak terpisah,
- 1 halaman A4 memuat 3 kwitansi,
- data digital hanya menjadi history dan dasar verifikasi,
- setoran baru menjadi kas resmi setelah uang fisik diterima admin dan diverifikasi.

## 2. Masalah yang Diselesaikan

### 2.1 Masalah Operasional
- pencatatan meter dan tagihan masih rawan salah hitung,
- kwitansi fisik sulit dipersiapkan massal dengan rapi,
- pembayaran lapangan sulit diaudit jika hanya manual,
- setoran petugas sulit dicocokkan dengan uang fisik,
- transparansi publik masih terbatas,
- pembuatan laporan bulanan memakan waktu lama.

### 2.2 Masalah Produk yang Diprioritaskan
- bagaimana menjaga alur fisik tetap berjalan tapi tercatat digital,
- bagaimana memastikan uang yang diterima petugas benar-benar masuk ke kas resmi,
- bagaimana mencetak kwitansi resmi dengan format stabil,
- bagaimana membuat dashboard publik tetap informatif tanpa membocorkan data internal.

## 3. Tujuan Produk
- mendigitalisasi proses meter, tagihan, pembayaran, dan setoran,
- menjaga akuntabilitas antara uang fisik dan data digital,
- mempercepat kerja admin saat cetak, verifikasi, dan pelaporan,
- memberi transparansi publik atas wilayah, pengeluaran, dan profil organisasi,
- mempertahankan template kwitansi resmi sebagai standar operasional.

## 4. Persona dan Kebutuhan Utama

### 4.1 Publik
Kebutuhan utama:
- melihat profil dan informasi umum,
- melihat peta air publik,
- melihat panduan atau FAQ,
- melihat transparansi pembayaran dan pengeluaran.

### 4.2 Petugas Penagih
Kebutuhan utama:
- melihat pelanggan sesuai wilayah,
- mencatat meter terakhir dan meter terbaru,
- mencatat pelanggan yang membayar melalui fitur `Membayar`,
- mengunggah bukti pembayaran,
- melihat nominal setoran,
- menyerahkan setoran ke admin.

### 4.3 Admin
Kebutuhan utama:
- mengelola pelanggan dan petugas,
- mencetak kwitansi massal,
- memverifikasi setoran setelah uang fisik diterima,
- mengelola kas, pengeluaran, dan mutasi,
- mengelola peta air, profil, dan panduan publik,
- membuat laporan bulanan.

## 5. Ruang Lingkup Produk

### 5.1 In Scope
- portal publik,
- dashboard petugas,
- dashboard admin,
- input meter,
- pembayaran lapangan,
- setoran petugas,
- verifikasi setoran,
- cetak kwitansi fisik massal,
- kas dan mutasi,
- pengeluaran,
- transparansi wilayah,
- peta air publik,
- panduan publik,
- laporan bulanan.

### 5.2 Out of Scope
- pembayaran self-service langsung oleh pelanggan,
- payment gateway otomatis,
- aplikasi mobile native terpisah,
- pembuatan desain kwitansi baru yang menggantikan template resmi.

## 6. Alur Produk

### 6.1 Alur Cetak Kwitansi
- petugas menginput meter awal dan meter terbaru,
- sistem menghitung pemakaian dan total tagihan,
- sistem membuat antrean kwitansi hanya setelah meter dan tagihan tersimpan,
- admin memilih petugas,
- sistem menampilkan tagihan yang sudah memiliki input meter,
- admin print langsung,
- hasil cetak disusun 3 kwitansi per A4,
- jika lebih dari 3, sistem membuat halaman tambahan,
- jika kurang dari 3 di halaman terakhir, slot kosong tetap ada,
- admin menyerahkan kwitansi yang sudah dicetak kepada petugas.

### 6.2 Alur Lapangan Petugas
- petugas menerima kwitansi yang sudah dicetak admin,
- petugas datang ke pelanggan untuk melakukan penagihan,
- jika pelanggan membayar, petugas gunakan fitur `Membayar`,
- petugas memberi cap dan mengunggah bukti kwitansi bercap,
- transaksi masuk sebagai history pending verifikasi.

### 6.3 Alur Setoran dan Verifikasi
- petugas tekan tombol setor,
- setoran pindah ke status menunggu verifikasi,
- uang fisik diserahkan ke admin,
- admin cocokkan uang fisik dan data digital,
- jika cocok, setoran menjadi verified dan uang masuk kas resmi,
- jika selisih, discrepancy dicatat.

### 6.4 Alur Publik
- publik membuka beranda,
- publik melihat profil, peta air, panduan, dan transparansi,
- publik tidak membutuhkan login.

## 7. Kebutuhan Produk Prioritas Tinggi
- cetak kwitansi massal stabil dan cepat,
- fitur `Membayar` petugas mudah dipakai,
- fitur `Setoran` petugas jelas menunjukkan nominal,
- verifikasi admin hanya terjadi setelah uang fisik diterima,
- laporan kas dan status wilayah mudah dipantau.

## 8. KPI Keberhasilan
- waktu persiapan kwitansi massal berkurang,
- jumlah selisih setoran menurun,
- waktu verifikasi admin lebih cepat,
- laporan bulanan tersusun lebih cepat,
- tingkat keterbacaan history transaksi meningkat,
- halaman publik lebih informatif tanpa menampilkan data sensitif.

## 9. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Template cetak melenceng dari desain resmi | Tinggi | Gunakan template tetap dan hanya tempel data digital |
| Petugas terlambat input pembayaran | Sedang | Terapkan tenggat 5 hari dan tampilkan status yang jelas |
| Setoran tidak cocok dengan uang fisik | Tinggi | Simpan `received_amount` dan `discrepancy_amount` |
| Admin memverifikasi terlalu cepat | Tinggi | Hanya izinkan verifikasi setelah uang fisik diterima |
| Data publik terlalu terbuka | Tinggi | Batasi publik ke data agregat dan konten yang dipilih admin |

## 10. Roadmap Produk

### Fase 1
- data pelanggan dan petugas,
- input meter,
- cetak kwitansi fisik,
- fitur membayar,
- fitur setoran,
- verifikasi dasar.

### Fase 2
- kas, pengeluaran, mutasi,
- transparansi wilayah,
- laporan bulanan.

### Fase 3
- penyempurnaan mode print template,
- penyempurnaan publik,
- penguatan audit trail dan monitoring.
