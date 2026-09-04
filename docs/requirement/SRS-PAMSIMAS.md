# SRS PAMSIMAS

## Software Requirements Specification
**Digitalisasi Sistem PAMSIMAS Tanjungsari**  
Versi 1.3  
Dokumen ini disusun untuk menyelaraskan kebutuhan sistem dengan flow operasional terbaru pada aplikasi admin, petugas, dan publik.

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjadi acuan utama untuk:

- memahami ruang lingkup sistem secara menyeluruh,
- menyelaraskan kebutuhan bisnis dengan implementasi aplikasi,
- memandu pengembangan frontend, backend, dan database,
- menjadi dasar validasi fitur saat proses review dan testing.

### 1.2 Ruang Lingkup Sistem
Sistem Digitalisasi PAMSIMAS Tanjungsari terdiri dari tiga area utama:

- area publik tanpa login,
- area petugas penagih dengan login,
- area admin dengan login.

Sistem mendukung siklus bulanan penuh mulai dari:

- pengelolaan data pelanggan dan wilayah,
- pencatatan meter,
- pembentukan tagihan,
- cetak kwitansi fisik resmi,
- pembayaran lapangan,
- setoran petugas,
- verifikasi admin,
- pencatatan kas,
- pengeluaran dan mutasi kas,
- transparansi wilayah,
- publikasi peta air dan profil,
- laporan bulanan.

### 1.3 Prinsip Utama Sistem
- Kwitansi fisik tetap menjadi dokumen utama yang dibawa petugas ke lapangan.
- Sistem digital berfungsi sebagai alat kontrol, history, rekap, dan verifikasi.
- Petugas wajib menginput meter awal dan meter terbaru terlebih dahulu untuk membentuk tagihan periode berjalan.
- Sistem baru membuat antrean kwitansi setelah input meter dan hasil perhitungan tagihan berhasil disimpan.
- Admin hanya mencetak kwitansi dari tagihan yang sudah memiliki input meter.
- Petugas menggunakan kwitansi fisik yang sudah dicetak admin saat melakukan penagihan kepada pelanggan.
- Bukti pembayaran pelanggan diunggah dari hasil kwitansi yang sudah dicap atau bukti lapangan lain yang sah.
- Setoran baru dianggap sah setelah uang fisik diterima admin dan diverifikasi di sistem.
- Uang baru masuk ke kas resmi setelah status setoran atau transaksi dinyatakan berhasil atau lunas oleh admin.
- Template kwitansi resmi tidak digenerate ulang oleh sistem; sistem hanya menempelkan data digital ke area yang sudah tersedia di template.

### 1.4 Istilah Penting
- `Publik`: pengunjung umum tanpa login.
- `Petugas`: petugas lapangan yang mencatat meter, menerima pembayaran, dan menyerahkan setoran.
- `Admin`: pengelola sistem dengan akses penuh.
- `Tagihan`: kewajiban bayar pelanggan untuk satu periode.
- `Kwitansi Fisik`: lembar kwitansi resmi yang dicetak admin dan dibawa petugas.
- `Membayar`: aksi pada aplikasi petugas untuk mencatat bahwa pelanggan membayar ke petugas.
- `Setoran`: kumpulan uang dan transaksi yang diajukan petugas ke admin.
- `Discrepancy`: selisih antara uang fisik yang diterima admin dan data digital pada sistem.

## 2. Aktor dan Hak Akses

### 2.1 Publik
Publik tidak perlu login dan hanya memiliki akses baca.

Hak akses publik:
- melihat beranda umum PAMSIMAS,
- melihat profil organisasi,
- melihat peta air publik,
- melihat panduan dan FAQ publik,
- melihat transparansi pembayaran per wilayah,
- melihat pengeluaran yang dipublikasikan.

Batasan publik:
- tidak dapat melihat data pelanggan detail,
- tidak dapat melihat transaksi internal,
- tidak dapat melihat kas internal,
- tidak dapat mengubah data apa pun.

### 2.2 Petugas Penagih
Petugas adalah pengguna lapangan yang fokus pada wilayah penagihan yang ditetapkan admin.

Hak akses petugas:
- login ke aplikasi petugas,
- melihat dashboard petugas,
- melihat daftar pelanggan sesuai wilayah,
- mencari pelanggan berdasarkan nama, ID, atau alamat,
- membuka detail pelanggan,
- melihat meter terakhir atau periode sebelumnya,
- menginput meter sebelumnya jika penugasan pertama membutuhkan baseline,
- menginput meter terbaru atau meter periode berjalan,
- melihat hasil hitung pemakaian dan nominal tagihan,
- menunggu kwitansi fisik dicetak dan diserahkan admin sebelum melakukan penagihan,
- membuka fitur `Membayar` untuk tiap pelanggan,
- memilih metode pembayaran tunai atau QRIS,
- mengunggah bukti pembayaran pelanggan,
- melihat riwayat transaksi sendiri,
- membuka fitur `Setoran`,
- melihat nominal ringkasan setoran pada card di atas halaman setoran,
- mengajukan setoran ke admin,
- mengelola profil sendiri,
- logout.

Batasan petugas:
- tidak dapat mengelola data master pelanggan,
- tidak dapat mengelola data petugas lain,
- tidak dapat memverifikasi setoran,
- tidak dapat mengubah saldo kas,
- tidak dapat mengubah pengaturan sistem,
- tidak dapat mencatat pembayaran sebelum kwitansi fisik untuk tagihan tersebut dicetak admin.

### 2.3 Admin
Admin adalah satu peran tunggal dengan akses penuh ke seluruh modul pengelolaan.

Hak akses admin:
- login ke dashboard admin,
- melihat dashboard dan ringkasan operasional,
- mengelola data pelanggan,
- mengelola data petugas,
- mengatur wilayah penagihan,
- mencetak kwitansi fisik massal,
- melihat riwayat kwitansi yang sudah dicetak,
- membuka menu verifikasi transaksi atau setoran,
- memverifikasi atau menolak setoran,
- mengelola kas tunai dan kas QRIS,
- melakukan mutasi antar kas,
- mencatat pengeluaran,
- melihat transparansi wilayah,
- membuat dan mengekspor laporan bulanan,
- mengelola profil organisasi publik,
- mengelola gambar peta jalur air publik,
- mengelola panduan publik,
- mengelola pengaturan sistem,
- logout.

## 3. Alur Bisnis Terbaru

### 3.1 Fase Input Meter dan Pembentukan Tagihan
1. Petugas membuka pelanggan yang berada pada wilayah tugasnya.
2. Petugas melihat meter terakhir dari periode sebelumnya. Untuk pelanggan yang belum mempunyai riwayat digital, petugas wajib mengisi meter awal sebagai baseline.
3. Petugas menginput meter terbaru untuk periode berjalan.
4. Sistem memvalidasi bahwa meter terbaru tidak lebih kecil dari meter awal.
5. Sistem menghitung pemakaian dengan rumus `meter terbaru - meter awal`.
6. Sistem menghitung total tagihan berdasarkan pemakaian, tarif aktif, dan biaya admin.
7. Petugas menekan simpan atau kirim.
8. Sistem menyimpan `meter_reading` dan `bill` dalam satu transaksi database.
9. Setelah keduanya berhasil disimpan, sistem otomatis membuat `receipt` berstatus `queued` atau siap dicetak.
10. Jika penyimpanan meter atau tagihan gagal, kwitansi tidak boleh masuk antrean cetak.

### 3.2 Fase Cetak Kwitansi Massal
1. Admin membuka modul cetak kwitansi dan memilih periode serta petugas penagih.
2. Sistem hanya menampilkan tagihan yang sudah memiliki input meter dan hasil perhitungan tagihan tersimpan.
3. Admin memilih kwitansi berstatus `queued`, kemudian mencetaknya secara massal.
4. Hasil cetak dikelompokkan dan diurutkan berdasarkan petugas serta nama pelanggan.
5. Satu halaman A4 wajib memuat 3 kwitansi.
6. Jika jumlah kwitansi lebih dari 3, sistem membuat halaman A4 tambahan dalam hasil print atau PDF yang sama.
7. Jika jumlah pada halaman terakhir kurang dari 3, slot yang tersisa dipertahankan sebagai ruang kosong agar komposisi halaman konsisten.
8. Setelah admin mengonfirmasi hasil cetak, receipt dan tagihan ditandai sudah dicetak.
9. Admin menyerahkan seluruh kwitansi yang sudah dicetak kepada petugas terkait.

### 3.3 Fase Penagihan dan Pembayaran Pelanggan
1. Petugas menerima kwitansi fisik yang sudah dicetak admin.
2. Petugas mendatangi pelanggan dan melakukan penagihan menggunakan kwitansi tersebut.
3. Sistem hanya mengizinkan fitur `Membayar` untuk tagihan yang kwitansinya sudah berstatus `printed`.
4. Setelah pelanggan membayar, petugas memilih metode pembayaran tunai atau QRIS.
5. Petugas memberi cap pada kwitansi fisik sebagai bukti pembayaran.
6. Petugas mengunggah foto kwitansi bercap atau bukti lapangan lain yang sah.
7. Sistem menyimpan pembayaran dengan status awal `pending` atau menunggu setoran dan verifikasi.
8. Data digital berfungsi sebagai history, kontrol, dan rekap; sistem tidak membuat kwitansi digital pengganti dari transaksi pembayaran tersebut.

### 3.4 Fase Setoran dan Verifikasi
1. Petugas mengumpulkan uang hasil penagihan.
2. Petugas membuka halaman `Setoran`.
3. Petugas menekan tombol setor untuk mengajukan setoran ke admin.
4. Setelah diajukan, nominal berpindah dari card `Setoran Belum Diserahkan` ke status `Menunggu Verifikasi Admin`.
5. Petugas menyerahkan uang fisik ke admin ini berbarengan dengan setoran.
6. Admin membuka menu verifikasi transaksi atau setoran.
7. Admin baru boleh memverifikasi setelah uang fisik benar-benar diterima.
8. Admin membandingkan uang fisik dengan total digital.
9. Jika ada selisih, sistem mencatat discrepancy.
10. Jika cocok, admin mengubah status menjadi berhasil atau lunas.
11. Setelah berhasil atau lunas, uang masuk ke kas resmi sistem.

### 3.5 Fase Sinkronisasi Riwayat, Pelaporan, dan Transparansi
1. Semua input meter, tagihan, status cetak, pembayaran, setoran, dan verifikasi tersimpan sebagai riwayat yang dapat ditelusuri.
2. Admin dapat melihat rekap pembayaran final setelah setoran terkait diverifikasi.
3. Data transaksi terverifikasi masuk ke rekap kas.
4. Pengeluaran dan mutasi memengaruhi saldo sesuai aturan.
5. Admin dapat melihat tingkat pembayaran per wilayah.
6. Publik dapat melihat ringkasan transparansi yang diizinkan.
7. Admin dapat menyusun laporan bulanan berdasarkan data terverifikasi.

## 4. Kebutuhan Fungsional

### 4.1 Kebutuhan Publik
**FR-PUB-01** Sistem menampilkan halaman beranda umum PAMSIMAS.  
**FR-PUB-02** Sistem menampilkan profil organisasi publik.  
**FR-PUB-03** Sistem menampilkan transparansi pembayaran berdasarkan wilayah diambil dari data admin transparasni wilayah .  
**FR-PUB-04** Sistem menampilkan daftar pengeluaran yang ditandai publik.  
**FR-PUB-05** Sistem menampilkan peta air publik dalam bentuk gambar statis dan disamb=pingnya ada panduan pemasangan dan link direct ke admin whatsapps.  
**FR-PUB-06** Sistem menampilkan  FAQ publik.  
**FR-PUB-07** Publik dapat mengakses seluruh halaman publik tanpa login.  
**FR-PUB-08** Publik tidak dapat melihat data internal pelanggan, transaksi, kas, atau pengaturan sistem.

### 4.2 Kebutuhan Petugas
**FR-PTG-01** Petugas dapat login menggunakan akun yang diberikan admin.  
**FR-PTG-02** Sistem menampilkan dashboard petugas berisi ringkasan tugas, jumlah pelanggan, dan ringkasan pembayaran.  
**FR-PTG-03** Petugas hanya dapat melihat pelanggan pada wilayah penagihan yang ditugaskan.  
**FR-PTG-04** Petugas dapat mencari pelanggan berdasarkan nama, ID pelanggan, dan alamat.  
**FR-PTG-05** Petugas dapat membuka detail pelanggan dan melihat meter terakhir atau periode sebelumnya.  
**FR-PTG-06** Petugas dapat menginput meter sebelumnya bila dibutuhkan sebagai data awal penugasan.  
**FR-PTG-07** Petugas dapat menginput meter terbaru untuk periode berjalan.  
**FR-PTG-08** Sistem menghitung pemakaian air secara otomatis dari meter terbaru dikurangi meter sebelumnya.  
**FR-PTG-09** Sistem menghitung nominal tagihan berdasarkan tarif aktif dan biaya admin.  
**FR-PTG-10** Setelah input meter dan tagihan berhasil disimpan, sistem otomatis memasukkan tagihan ke antrean kwitansi admin.  
**FR-PTG-11** Petugas hanya dapat mencatat pembayaran melalui fitur `Membayar` setelah kwitansi fisik tagihan tersebut dicetak admin.  
**FR-PTG-12** Petugas dapat memilih metode pembayaran tunai atau QRIS.  
**FR-PTG-13** Petugas wajib mengunggah bukti pembayaran berupa foto kwitansi bercap atau bukti lapangan lain yang sah.  
**FR-PTG-14** Sistem menyimpan transaksi baru dengan status awal menunggu setoran dan verifikasi.  
**FR-PTG-15** Petugas dapat melihat riwayat transaksi miliknya sendiri.  
**FR-PTG-16** Petugas dapat membuka halaman `Setoran`.  
**FR-PTG-17** Petugas dapat melihat card ringkasan setoran seperti belum diserahkan, menunggu verifikasi, dan total nominal terkait.  
**FR-PTG-18** Petugas dapat mengajukan setoran ke admin melalui tombol setor.  
**FR-PTG-19** Petugas dapat memperbarui profil, tetapi tidak tersedia fitur ubah password pada aplikasi petugas.  
**FR-PTG-20** Petugas dapat logout dari aplikasi.

### 4.3 Kebutuhan Admin Umum
**FR-ADM-01** Admin dapat login menggunakan username dan password yang di setting dari awal lalu bisa diubah di profile akun  .  
**FR-ADM-02** Sistem menampilkan dashboard admin berisi ringkasan operasional dan keuangan.  
**FR-ADM-03** Admin dapat menambah, mengubah, menonaktifkan, dan mencari pelanggan.  
**FR-ADM-04** Admin dapat melihat detail pelanggan beserta histori tagihan dan pembayaran.  
**FR-ADM-05** Admin dapat menambah, mengubah, menonaktifkan, dan mengatur wilayah petugas dan membuat akun petugas .  
**FR-ADM-06** Admin dapat mengelola profil organisasi yang ditampilkan di publik.  
**FR-ADM-07** Admin dapat mengelola peta jalur air publik sekaligus panduan, tapi gambar peta jalur sattis upload .  
**FR-ADM-08** Admin dapat mengganti gambar peta air statis yang ditampilkan di publik.  
**FR-ADM-09** Admin dapat mengelola konten panduan atau FAQ publik.

### 4.4 Kebutuhan Kwitansi Fisik
**FR-ADM-10** Admin dapat memfilter data kwitansi berdasarkan petugas penagih.  
**FR-ADM-11** Sistem hanya menampilkan kwitansi dari tagihan yang sudah memiliki input meter dan total tagihan tersimpan.  
**FR-ADM-12** Admin dapat mencetak kwitansi fisik massal tanpa preview terpisah.  
**FR-ADM-13** Sistem mengurutkan hasil cetak berdasarkan nama petugas dan nama pelanggan.  
**FR-ADM-14** Satu halaman A4 wajib memuat 3 kwitansi.  
**FR-ADM-15** Jika jumlah kwitansi lebih dari 3, sistem membuat halaman A4 tambahan dalam satu hasil cetak atau PDF.  
**FR-ADM-16** Jika jumlah kwitansi pada halaman terakhir kurang dari 3, slot kosong tetap dipertahankan agar tata letak konsisten.  
**FR-ADM-17** Sistem tidak membuat style baru untuk kwitansi resmi.  
**FR-ADM-18** Sistem hanya menempelkan data digital hasil input meter dan perhitungan tagihan ke area yang tersedia pada template resmi.  
**FR-ADM-19** Sistem menyimpan nomor, batch, waktu cetak, admin pencetak, dan status setiap kwitansi; data pembayaran tidak membuat kwitansi digital pengganti.

### 4.5 Kebutuhan Verifikasi Setoran
**FR-ADM-20** Admin dapat melihat daftar setoran yang menunggu verifikasi setelah petugas mengajukan setor.  
**FR-ADM-21** Admin dapat membuka detail setoran per petugas dan periode.  
**FR-ADM-22** Admin hanya dapat memverifikasi setoran jika uang fisik sudah diterima oleh admin.  
**FR-ADM-23** Admin dapat mencocokkan uang fisik terhadap total digital pada setoran.  
**FR-ADM-24** Admin dapat mencatat `received_amount`.  
**FR-ADM-25** Admin dapat mencatat `discrepancy_amount` jika terdapat selisih.  
**FR-ADM-26** Admin dapat mengubah status setoran menjadi verified, rejected, atau status lain yang tersedia sesuai aturan sistem.  
**FR-ADM-27** Jika setoran dinyatakan berhasil atau lunas dan nominal sesuai, sistem memasukkan nilai tersebut ke kas resmi dan data pelanngan dan data di petugas terupdate riwayatnya .  
**FR-ADM-28** Admin dapat menolak setoran atau transaksi tertentu dengan alasan penolakan.

### 4.6 Kebutuhan Kas, Pengeluaran, dan Mutasi
**FR-ADM-29** Admin dapat melihat saldo kas tunai dan kas QRIS.  
**FR-ADM-30** Admin dapat melihat riwayat transaksi kas.  
**FR-ADM-31** Admin dapat melakukan mutasi antar kas juga menambhkan pemasukann jika sangat perlu.  
**FR-ADM-32** Admin dapat mencatat pengeluaran operasional.  
**FR-ADM-33** Admin dapat menentukan apakah pengeluaran tampil di publik atau tidak.  
**FR-ADM-34** Sistem hanya mengubah saldo kas dari transaksi yang valid, mutasi resmi, atau pengeluaran resmi.

### 4.7 Kebutuhan Transparansi dan Laporan
**FR-ADM-35** Admin dapat membuka modul transparansi wilayah dengan filter periode.  
**FR-ADM-36** Sistem menampilkan ringkasan pembayaran per dusun.  
**FR-ADM-37** Sistem mendukung drill-down dari dusun ke RT.  
**FR-ADM-38** Sistem mendukung drill-down dari RT ke pelanggan.  
**FR-ADM-39** Admin dapat melihat laporan bulanan.  
**FR-ADM-40** Admin dapat mengekspor laporan bulanan ke PDF dari template laporan yang tersedia di docs/template/Template_Laporan_Formal_PAMSIMAS_Desa.docx.  
**FR-ADM-41** Admin dapat mengatur tarif, periode tagihan, data QRIS, dan konfigurasi dasar sistem.

## 5. Kebutuhan Template Kwitansi

### 5.1 Prinsip Penggunaan Template
Template kwitansi resmi sudah berupa desain tetap. Sistem tidak diperbolehkan membuat desain baru atau mengenerate ulang layout utama kwitansi.

### 5.2 Komponen Template Tetap
Komponen visual yang harus tetap mengikuti template resmi:
1. logo dan header organisasi,
2. nomor kwitansi,
3. bulan cetak,
4. judul `TAGIHAN REKENING AIR MINUM`,
5. blok `Data Pelanggan`,
6. blok `Tagihan`,
7. catatan bawah,
8. kotak `BUKTI CAP`,
9. jabatan dan nama penandatangan.

### 5.3 Data Digital yang Ditempel ke Template
Data digital yang boleh ditempel atau ditimpa pada area template:
- nama pelanggan,
- alamat pelanggan,
- nomor kwitansi,
- bulan cetak,
- meter awal,
- meter terbaru,
- total pemakaian meter,
- tarif air per meter kubik,
- biaya admin,
- jumlah tagihan,
- jabatan penandatangan,
- nama penandatangan.

Seluruh nilai meter dan nominal berasal dari data digital yang telah disimpan sebelum proses cetak. Sistem hanya menempatkan nilai tersebut di atas kolom template yang tersedia dan tidak boleh mengubah bentuk desain resmi.

### 5.4 Data yang Tidak Digenerate Ulang
Data berikut tidak boleh digenerate sebagai style baru oleh sistem:
- bentuk kotak,
- garis tabel,
- komposisi layout,
- catatan bawah template,
- judul utama,
- struktur cap dan tanda tangan.

Seluruh elemen desain template tidak digenerate ulang. Sistem hanya menimpa data digital secara rapi pada area yang tersedia dan teks tidak boleh keluar dari batas kolom.

### 5.5 Aturan Cetak
- tidak ada preview terpisah,
- print langsung dari batch pilihan,
- 3 kwitansi per halaman A4 portrait,
- jika lebih dari 3, sistem membuat halaman tambahan dalam satu hasil cetak atau PDF,
- jika kurang dari 3 pada halaman terakhir, slot kosong tetap dipertahankan,
- data digital hanya ditempel di area template,
- sistem tidak boleh merombak desain resmi template.

## 6. Kebutuhan Non-Fungsional

### 6.1 Keamanan
- login wajib untuk petugas dan admin,
- hak akses dibatasi berdasarkan peran,
- password disimpan dalam bentuk hash,
- data internal tidak boleh tampil di area publik.

### 6.2 Auditabilitas
- setiap transaksi memiliki status dan timestamp,
- perubahan status verifikasi tercatat,
- kwitansi cetak memiliki nomor unik,
- setoran memiliki nomor unik,
- perubahan saldo kas dapat ditelusuri dari riwayat transaksi.

### 6.3 Keandalan
- transaksi yang disubmit petugas tidak boleh hilang,
- kwitansi cetak harus tetap konsisten walau jumlah batch tidak genap 3,
- sistem harus tetap menjaga history kwitansi yang sudah dicetak,
- target penyelesaian penagihan adalah maksimal 5 hari sejak kwitansi fisik diserahkan admin kepada petugas.

### 6.4 Kegunaan
- antarmuka petugas harus sederhana untuk penggunaan mobile,
- fitur `Membayar` harus jelas per pelanggan,
- fitur `Setoran` harus menampilkan nominal secara mudah dipahami,
- alur cetak admin harus sesederhana mungkin karena digunakan berulang.

### 6.5 Kinerja
- halaman daftar pelanggan harus tetap responsif pada jumlah pelanggan yang besar,
- halaman cetak harus mampu memproses batch multi-halaman,
- rekap verifikasi setoran harus bisa dihitung tanpa jeda yang mengganggu operasional.

### 6.6 Konsistensi Data
- kas resmi hanya berubah setelah verifikasi berhasil,
- mutasi antar kas tidak boleh dihitung sebagai pemasukan baru,
- transaksi petugas yang belum diverifikasi belum boleh menjadi saldo kas resmi.

### 6.7 Progressive Web App dan Mode Offline
- frontend wajib menyediakan Web App Manifest agar aplikasi dapat dipasang pada perangkat desktop dan mobile,
- manifest wajib memakai logo resmi KPSPAMS Tirta Sari yang sama dengan logo pada template kwitansi,
- service worker wajib dibuat pada build produksi dan memperbarui versi aplikasi secara otomatis,
- aset inti aplikasi wajib tersedia melalui precache agar kerangka halaman tetap dapat dibuka saat koneksi terputus,
- gambar berukuran besar, termasuk peta jaringan, tidak boleh dipaksa dimuat saat instalasi dan baru dicache setelah pengguna membukanya,
- hanya respons `GET` endpoint publik `/api/publik/*` yang boleh disimpan pada cache API,
- endpoint login, admin, petugas, pembayaran, setoran, kas, pengeluaran, dan seluruh request mutasi tidak boleh dilayani dari cache API,
- cache API publik memakai strategi network-first agar data terbaru tetap menjadi prioritas dan data cache hanya menjadi fallback ketika jaringan gagal,
- mode Mock tetap memakai localStorage sebagai sumber data simulasi dan dapat berjalan bersama service worker,
- pemasangan PWA pada hosting produksi wajib memakai HTTPS.

## 7. Data, Status, dan Aturan Validasi

### 7.1 Status Cetak Tagihan
- `belum_dicetak`
- `sudah_dicetak`

### 7.2 Status Pembayaran pada Tagihan
- `belum_lunas`
- `menunggu_verifikasi`
- `lunas`
- `ditolak`

Sebelum meter tersimpan, belum ada record tagihan untuk periode tersebut. Enum `belum_input_meter` dan `sudah_input_meter` hanya dipertahankan sebagai kompatibilitas data lama dan tidak dipakai pada alur baru.

### 7.3 Status Setoran
- `draft`
- `pending`
- `verified`
- `rejected`

### 7.4 Status Transaksi Pembayaran
- `pending`
- `verified`
- `rejected`

### 7.5 Status Kwitansi
- `queued`: meter dan tagihan sudah tersimpan serta kwitansi siap dipilih admin,
- `printed`: admin sudah mengonfirmasi kwitansi selesai dicetak,
- `cancelled`: kwitansi dibatalkan dan tidak dapat dipakai untuk pembayaran.

### 7.6 Validasi Operasional Penting
- petugas hanya dapat melihat pelanggan sesuai wilayah,
- meter terbaru tidak boleh lebih kecil dari meter awal,
- satu pelanggan hanya boleh memiliki satu input meter, satu tagihan, dan satu kwitansi untuk satu periode,
- sistem tidak boleh membuat antrean kwitansi sebelum meter dan tagihan tersimpan,
- petugas wajib menyimpan meter sebelum tagihan dapat dibentuk,
- admin hanya dapat mencetak kwitansi dengan status `queued` dan relasi meter/tagihan yang valid,
- satu batch cetak hanya boleh memuat kwitansi dari satu petugas dan satu periode,
- petugas hanya dapat memproses pembayaran setelah kwitansi berstatus `printed`,
- pembayaran pelanggan harus memiliki metode pembayaran,
- bukti pembayaran wajib tersedia untuk transaksi yang diajukan,
- admin tidak boleh memverifikasi setoran sebelum uang fisik diterima,
- saldo kas tidak boleh berubah pada transaksi yang masih pending.

## 8. Matriks Modul

| Modul | Peran | Catatan |
| --- | --- | --- |
| Beranda publik | Publik | Informasi umum PAMSIMAS |
| Profil publik | Publik, Admin | Admin mengelola konten profil |
| Peta air publik | Publik, Admin | Publik melihat gambar statis, admin mengganti gambar |
| Panduan publik | Publik, Admin | Publik membaca, admin mengelola isi |
| Data pelanggan | Admin, Petugas | Petugas hanya melihat wilayahnya |
| Data petugas | Admin | Admin kelola penuh |
| Input meter | Petugas | Input meter terakhir dan meter terbaru |
| Membayar | Petugas | Catat pembayaran setelah kwitansi dicetak admin |
| Setoran | Petugas | Ajukan setoran dan lihat ringkasan nominal |
| Cetak kwitansi | Admin | Hanya setelah input meter, 3 per A4, tempel data ke template resmi |
| Verifikasi setoran | Admin | Hanya setelah uang fisik diterima |
| Kas dan mutasi | Admin | Kelola saldo dan mutasi akun kas |
| Pengeluaran | Admin, Publik | Publik hanya melihat yang ditandai publik |
| Transparansi wilayah | Admin, Publik | Ringkasan dan drill-down |
| Laporan bulanan | Admin | Siap ekspor PDF |
| Pengaturan sistem | Admin | Tarif, QRIS, periode, konfigurasi dasar |

## 9. Acceptance Criteria
Sistem dianggap memenuhi kebutuhan bila:

- penyimpanan meter berhasil membentuk tagihan dan antrean kwitansi dalam satu alur transaksi,
- pelanggan yang belum memiliki input meter tidak tampil dalam antrean cetak admin,
- admin dapat mencetak kwitansi fisik massal berdasarkan petugas dan periode,
- satu halaman A4 konsisten memuat 3 kwitansi,
- hasil cetak multi-batch menghasilkan lebih dari satu halaman bila perlu,
- halaman terakhir tetap rapi walau jumlah kwitansi kurang dari 3,
- sistem tidak membuat desain kwitansi baru di luar template resmi,
- nilai meter dan jumlah tagihan yang sudah dihitung tampil pada kolom template resmi,
- petugas tidak dapat mencatat pembayaran sebelum kwitansi dicetak admin,
- petugas dapat mencatat pembayaran dan mengunggah foto kwitansi bercap setelah proses cetak,
- petugas dapat mengajukan setoran dari fitur setoran,
- admin hanya dapat memverifikasi setelah uang fisik diterima,
- dana masuk ke kas resmi hanya setelah verifikasi berhasil,
- publik dapat melihat profil, peta air, panduan, dan transparansi tanpa login,
- aplikasi dapat dipasang sebagai PWA dengan logo resmi dan membuka kembali kerangka aplikasi ketika offline,
- data publik yang pernah berhasil dimuat dapat ditampilkan sebagai fallback saat API tidak dapat dijangkau,
- respons API internal dan transaksi tidak tersimpan pada cache service worker.
