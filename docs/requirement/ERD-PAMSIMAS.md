# ERD PAMSIMAS

## Entity Relationship Diagram
**Digitalisasi Sistem PAMSIMAS Tanjungsari**  
Versi 1.2  
Dokumen ini merangkum entitas, atribut utama, relasi, dan catatan implementasi berdasarkan backend yang sedang dipakai.

## 1. Tujuan ERD
ERD ini digunakan untuk:
- memahami struktur data utama sistem,
- menyelaraskan frontend, backend, dan database,
- mendukung pengembangan flow kwitansi, pembayaran, setoran, dan kas,
- mempermudah review perubahan schema.

## 2. Kelompok Entitas

### 2.1 Master Data
- `users`
- `regions`
- `customers`
- `officer_assignments`
- `tariffs`

### 2.2 Operasional Penagihan
- `meter_readings`
- `bills`
- `receipts`
- `payments`
- `officer_deposits`

### 2.3 Keuangan
- `cash_accounts`
- `cash_transactions`
- `cash_transfers`
- `expenses`

### 2.4 Pelaporan
- `monthly_reports`

## 3. Detail Entitas

### 3.1 `users`
Menyimpan akun admin dan petugas.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `name` | Nama pengguna |
| `username` | Username login |
| `email` | Email |
| `password` | Password hash |
| `role` | Role sistem |
| `status` | Aktif/nonaktif bila diterapkan di aplikasi |

Catatan:
- satu tabel dipakai untuk admin dan petugas,
- relasi ke wilayah, verifikasi, dan transaksi mengacu ke tabel ini.

### 3.2 `regions`
Menyimpan struktur dusun, RW, dan RT.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `parent_id` | FK ke `regions.id` |
| `type` | `dusun`, `rw`, `rt` |
| `code` | Kode wilayah |
| `name` | Nama wilayah |
| `kampung` | Nama kampung |
| `household_count` | Jumlah rumah tangga |

Catatan:
- dipakai untuk transparansi wilayah,
- dipakai untuk assignment petugas,
- dipakai pada pelanggan.

### 3.3 `customers`
Data pelanggan PAMSIMAS.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `customer_code` | Kode pelanggan unik |
| `dusun_id` | FK ke `regions.id` |
| `rt_id` | FK ke `regions.id` |
| `name` | Nama pelanggan |
| `address` | Alamat pelanggan |
| `status` | `aktif`, `menunggak`, `nonaktif` |
| `joined_at` | Tanggal bergabung |
| `deleted_at` | Soft delete |

### 3.4 `officer_assignments`
Relasi petugas ke wilayah penagihan.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `officer_id` | FK ke `users.id` |
| `region_id` | FK ke `regions.id` |

Catatan:
- satu petugas dapat memiliki banyak wilayah,
- satu wilayah dapat ditangani lebih dari satu petugas jika dibutuhkan.

### 3.5 `tariffs`
Tarif air aktif.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `water_rate_per_m3` | Tarif air |
| `admin_fee` | Biaya admin |
| `effective_from` | Berlaku mulai |
| `effective_until` | Berlaku sampai |
| `is_active` | Status tarif |
| `created_by` | FK ke `users.id` |

### 3.6 `meter_readings`
Pencatatan meter tiap periode.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `customer_id` | FK ke `customers.id` |
| `officer_id` | FK ke `users.id` |
| `period_month` | Bulan periode |
| `period_year` | Tahun periode |
| `previous_meter` | Meter sebelumnya |
| `current_meter` | Meter terbaru |
| `usage` | Pemakaian |
| `recorded_at` | Tanggal catat |

Catatan:
- `previous_meter` dan `current_meter` adalah inti flow petugas,
- satu pelanggan satu periode hanya memiliki satu catatan meter.

### 3.7 `bills`
Tagihan yang terbentuk dari meter reading dan tarif.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `invoice_number` | Nomor tagihan |
| `customer_id` | FK ke `customers.id` |
| `meter_reading_id` | FK ke `meter_readings.id` |
| `tariff_id` | FK ke `tariffs.id` |
| `period_month` | Bulan periode |
| `period_year` | Tahun periode |
| `water_rate` | Tarif air |
| `admin_fee` | Biaya admin |
| `usage` | Pemakaian |
| `total_amount` | Total tagihan |
| `print_status` | Status cetak |
| `payment_status` | Status bayar |
| `due_date` | Jatuh tempo |

Catatan:
- `print_status` penting untuk alur cetak kwitansi,
- `payment_status` penting untuk status operasional dan pelaporan.

### 3.8 `receipts`
Riwayat kwitansi fisik yang dicetak admin.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `bill_id` | FK ke `bills.id` |
| `printed_by` | FK ke `users.id` |
| `receipt_number` | Nomor kwitansi |
| `printed_at` | Tanggal/waktu cetak |
| `template_snapshot` | Snapshot data tempel template |

Catatan:
- desain resmi tidak disimpan di database,
- `template_snapshot` menyimpan data digital yang ditempel ke template.

### 3.9 `payments`
Transaksi pembayaran pelanggan yang dicatat petugas.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `bill_id` | FK ke `bills.id` |
| `officer_id` | FK ke `users.id` |
| `officer_deposit_id` | FK ke `officer_deposits.id` |
| `method` | `tunai`, `qris` |
| `amount` | Nominal |
| `proof_path` | Bukti pembayaran |
| `note` | Catatan |
| `status` | `pending`, `verified`, `rejected` |
| `paid_at` | Tanggal/waktu bayar |
| `verified_at` | Tanggal/waktu verifikasi |
| `verified_by` | FK ke `users.id` |

Catatan:
- data ini menjadi history digital utama,
- transaksi belum otomatis menjadi kas resmi sebelum verifikasi.

### 3.10 `officer_deposits`
Setoran petugas ke admin.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `deposit_number` | Nomor setoran |
| `officer_id` | FK ke `users.id` |
| `verified_by` | FK ke `users.id` |
| `period_month` | Bulan periode |
| `period_year` | Tahun periode |
| `cash_total` | Total tunai digital |
| `qris_total` | Total qris digital |
| `total_amount` | Total setoran digital |
| `received_amount` | Uang fisik diterima admin |
| `discrepancy_amount` | Selisih |
| `proof_path` | Bukti setor |
| `status` | `draft`, `pending`, `verified`, `rejected` |
| `rejection_reason` | Alasan penolakan |
| `submitted_at` | Tanggal/waktu setor |
| `verified_at` | Tanggal/waktu verifikasi |

Catatan:
- entitas ini menjadi jembatan antara uang fisik dan history digital,
- verifikasi hanya sah jika uang fisik sudah diterima admin.

### 3.11 `cash_accounts`
Akun kas utama sistem.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `type` | `tunai`, `qris` |
| `name` | Nama akun |
| `opening_balance` | Saldo awal |
| `current_balance` | Saldo berjalan |
| `opening_balance_period` | Periode saldo awal |
| `opening_balance_locked_at` | Lock saldo awal |
| `opening_balance_locked_by` | FK ke `users.id` |

### 3.12 `cash_transactions`
Riwayat seluruh pergerakan kas.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `cash_account_id` | FK ke `cash_accounts.id` |
| `reference_type` | Morph source |
| `reference_id` | Morph id |
| `type` | `income`, `expense`, `transfer_in`, `transfer_out`, `adjustment` |
| `amount` | Nilai transaksi |
| `balance_after` | Saldo setelah transaksi |
| `description` | Deskripsi |
| `transaction_at` | Timestamp transaksi |

Catatan:
- ini adalah audit trail utama kas.

### 3.13 `cash_transfers`
Mutasi antar akun kas.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `from_cash_account_id` | FK ke `cash_accounts.id` |
| `to_cash_account_id` | FK ke `cash_accounts.id` |
| `created_by` | FK ke `users.id` |
| `amount` | Nominal transfer |
| `note` | Catatan |
| `transfer_date` | Tanggal transfer |

### 3.14 `expenses`
Pengeluaran operasional.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `cash_account_id` | FK ke `cash_accounts.id` |
| `created_by` | FK ke `users.id` |
| `category` | Kategori |
| `quantity` | Jumlah |
| `unit` | Satuan |
| `unit_price` | Harga satuan |
| `amount` | Total |
| `description` | Keterangan |
| `proof_path` | Bukti nota |
| `is_public` | Tampil publik |
| `expense_date` | Tanggal pengeluaran |

### 3.15 `monthly_reports`
Laporan agregat per periode.

| Field | Tipe / Peran |
| --- | --- |
| `id` | PK |
| `period_month` | Bulan periode |
| `period_year` | Tahun periode |
| `scope` | `monthly`, `quarterly`, `yearly` |
| `period_start` | Awal periode |
| `period_end` | Akhir periode |
| `opening_balance` | Saldo awal |
| `verified_income_total` | Total pemasukan terverifikasi |
| `expense_total` | Total pengeluaran |
| `transfer_total` | Total mutasi |
| `ending_balance` | Saldo akhir |
| `snapshot` | Snapshot laporan |
| `generated_by` | FK ke `users.id` |
| `generated_at` | Timestamp generate |

## 4. Relasi Utama

| Relasi | Kardinalitas | Makna |
| --- | --- | --- |
| `regions` -> `regions` | 1 : N | Hierarki dusun, RW, RT |
| `regions` -> `customers` | 1 : N | RT memiliki banyak pelanggan |
| `users` -> `officer_assignments` | 1 : N | Petugas punya banyak assignment wilayah |
| `regions` -> `officer_assignments` | 1 : N | Wilayah bisa di-assign ke petugas |
| `customers` -> `meter_readings` | 1 : N | Pelanggan punya banyak catatan meter |
| `users` -> `meter_readings` | 1 : N | Petugas membuat catatan meter |
| `meter_readings` -> `bills` | 1 : 1 | Satu catatan meter membentuk satu tagihan |
| `tariffs` -> `bills` | 1 : N | Satu tarif bisa dipakai banyak tagihan |
| `bills` -> `receipts` | 1 : N | Satu tagihan bisa punya beberapa riwayat cetak |
| `bills` -> `payments` | 1 : N | Satu tagihan bisa punya beberapa percobaan pembayaran |
| `users` -> `payments` | 1 : N | Petugas input banyak transaksi |
| `officer_deposits` -> `payments` | 1 : N | Satu setoran memuat banyak transaksi |
| `users` -> `officer_deposits` | 1 : N | Petugas membuat banyak setoran |
| `users` -> `officer_deposits` verifier | 1 : N | Admin memverifikasi banyak setoran |
| `cash_accounts` -> `cash_transactions` | 1 : N | Satu akun punya banyak riwayat kas |
| `cash_accounts` -> `cash_transfers` | 1 : N | Akun kas bisa jadi asal/tujuan transfer |
| `cash_accounts` -> `expenses` | 1 : N | Satu akun kas mendanai banyak pengeluaran |
| `users` -> `expenses` | 1 : N | Admin mencatat banyak pengeluaran |
| `users` -> `monthly_reports` | 1 : N | Admin membuat banyak laporan |

## 5. Catatan Desain Data
- `bills.print_status` mendukung flow cetak kwitansi massal.
- `receipts.template_snapshot` menyimpan data tempel template, bukan desain template.
- `payments.status` dan `officer_deposits.status` harus dibaca bersama pada flow verifikasi.
- `officer_deposits.received_amount` dan `officer_deposits.discrepancy_amount` sangat penting untuk audit setoran.
- `cash_transactions` adalah sumber utama jejak saldo kas.
- fitur publik seperti peta air statis, profil, dan panduan saat ini lebih cocok disimpan melalui konfigurasi atau settings layer, meski belum dimodelkan sebagai tabel terpisah pada dokumen ini.

## 6. Rekomendasi Pengembangan Data Lanjutan
- tambahkan tabel khusus `public_contents` atau `system_settings` terstruktur bila pengelolaan profil, panduan, dan peta air makin kompleks,
- tambahkan audit log terpisah bila diperlukan pelacakan perubahan per field,
- pertimbangkan snapshot template cetak yang lebih eksplisit bila nomor versi template perlu dilacak.

