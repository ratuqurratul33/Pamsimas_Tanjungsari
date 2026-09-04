# API Contract Modul Kompleks

Versi: `1.0`  
Status: Draft untuk review FE Adapter dan Laravel BE  
Format: REST JSON, nominal uang dalam Rupiah integer tanpa desimal

## 1. Konvensi Umum

Base URL:

```text
/api
```

Endpoint admin membutuhkan `Authorization: Bearer <token>`. Endpoint petugas membutuhkan token petugas. Endpoint publik tidak membutuhkan login.

### Format tanggal

- Timestamp: ISO-8601 UTC, contoh `2026-08-19T10:30:00Z`.
- Tanggal bisnis: `YYYY-MM-DD`.
- Periode bulanan: `YYYY-MM`, contoh `2026-08`.

### Format nominal

Semua nominal dikirim sebagai integer positif dalam Rupiah:

```json
{ "amount": 125000 }
```

Jangan mengirim format tampilan seperti `"Rp125.000"` dalam request atau response inti.

### Response berhasil

```json
{
  "data": {},
  "meta": {},
  "message": "OK"
}
```

`meta` bersifat opsional untuk response detail dan wajib ada pada response list berpaginasi.

### Response error

```json
{
  "message": "Data tidak valid.",
  "errors": {
    "amount": ["Nominal harus lebih besar dari 0."]
  },
  "code": "VALIDATION_ERROR"
}
```

Kode minimum: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_ERROR`.

## 2. Relasi Data Inti

```text
Customer
  └─ Payment history (dibuat petugas)
       └─ Deposit item
            └─ Officer deposit
                 └─ Cash transaction IN (hanya setelah verified)

Expense
  └─ Cash transaction OUT (hanya setelah posted)
```

Aturan penting:

1. Pembayaran lapangan adalah history penerimaan petugas, bukan pemasukan kas utama.
2. Setoran baru memengaruhi kas utama setelah admin melakukan verifikasi dan status menjadi `verified`.
3. Verifikasi harus idempotent. Setoran yang sudah `verified` tidak boleh diverifikasi ulang.
4. Setoran `rejected` tidak membuat transaksi kas masuk.
5. Pengeluaran `posted` membuat transaksi kas keluar satu kali.
6. Kwitansi fisik dicetak dari snapshot data pelanggan dan periode. Sistem tidak mencetak ulang kwitansi digital dari history pembayaran.

## 3. Modul Kwitansi

Kwitansi mewakili dokumen fisik yang dicetak Admin pada awal siklus. Satu batch dikelompokkan berdasarkan petugas dan menghasilkan PDF A4 dengan empat slot per halaman. Slot kosong tetap dipertahankan.

### 3.1 Enum

```text
receipt_batch.status: draft | printed | cancelled
receipt.status: queued | printed | cancelled
```

Kwitansi tidak memiliki status `paid`; status pembayaran berada pada payment history.

### 3.2 GET `/admin/receipts`

Daftar snapshot kwitansi yang siap dicetak atau sudah dicetak.

Query:

```text
period=2026-08
officer_id=12
status=queued
page=1
per_page=25
```

Response:

```json
{
  "data": [
    {
      "id": 901,
      "receipt_number": "KWT-202608-000044",
      "period": "2026-08",
      "customer_id": 44,
      "customer_code": "PAM-044",
      "customer_name": "Asep Sopian",
      "customer_address": "Dusun 3 / RW 06 / RT 04 - Babakan Sari",
      "officer_id": 12,
      "officer_name": "Budi Santoso",
      "meter_start": 120,
      "meter_end": 135,
      "meter_usage": 15,
      "admin_fee": 5000,
      "bill_amount": 50000,
      "status": "queued",
      "printed_at": null
    }
  ],
  "meta": { "current_page": 1, "per_page": 25, "total": 1, "last_page": 1 }
}
```

Receipt baru masuk antrean setelah petugas menyimpan meter dan sistem berhasil membentuk tagihan. Karena itu `meter_start`, `meter_end`, `meter_usage`, `admin_fee`, dan `bill_amount` wajib tersedia pada receipt berstatus `queued`.

### 3.3 POST `/admin/receipts/batches`

Membuat batch cetak dan menandai snapshot yang dipilih sebagai tercetak. Endpoint mengembalikan file PDF atau URL file yang sudah dibuat.

Request:

```json
{
  "period": "2026-08",
  "officer_id": 12,
  "receipt_ids": [901, 902, 903],
  "template": "pamsimas-a4-3-up",
  "include_empty_slots": true
}
```

Response:

```json
{
  "data": {
    "id": 77,
    "batch_number": "BATCH-2026-08-000077",
    "period": "2026-08",
    "officer_id": 12,
    "officer_name": "Budi Santoso",
    "receipt_count": 3,
    "page_count": 1,
    "slots_per_page": 3,
    "empty_slots": 0,
    "status": "printed",
    "file_url": "/storage/receipts/BATCH-2026-08-000077.pdf",
    "printed_at": "2026-08-19T03:30:00Z",
    "printed_by": { "id": 1, "name": "Admin" }
  },
  "message": "Batch kwitansi berhasil dibuat."
}
```

Konflik jika salah satu `receipt_id` belum mempunyai meter/tagihan, sudah `printed`, period tidak sesuai, atau receipt bukan milik petugas yang dipilih.

### 3.4 GET `/admin/receipts/batches/{batch}`

Mengambil detail batch, daftar kwitansi di dalamnya, jumlah halaman, dan URL PDF. Endpoint ini untuk history dan audit, bukan membuat cetakan baru.

## 4. Modul Verifikasi Setoran Admin

### 4.1 Enum

```text
payment.status: recorded | included_in_deposit | rejected
deposit.status: pending | verified | rejected
cash_transaction.status: posted | voided
```

`pending` berarti uang fisik sudah diserahkan petugas ke Admin dan menunggu pencocokan. Sebelum diserahkan, record setoran berada pada `draft` atau belum dibuat.

### 4.2 GET `/admin/deposits`

Query:

```text
status=pending
officer_id=12
period=2026-08
page=1
per_page=25
```

Response:

```json
{
  "data": [
    {
      "id": 501,
      "deposit_number": "SET-2026-08-000501",
      "officer": { "id": 12, "code": "PTG-002", "name": "Budi Santoso" },
      "period": "2026-08",
      "submitted_at": "2026-08-19T09:00:00Z",
      "received_at": "2026-08-19T09:15:00Z",
      "digital_total": 148000,
      "physical_total": null,
      "discrepancy": null,
      "status": "pending",
      "payment_summary": { "count": 5, "cash": 120000, "qris": 28000 }
    }
  ],
  "meta": { "current_page": 1, "per_page": 25, "total": 1, "last_page": 1 }
}
```

`received_at` wajib terisi sebelum status menjadi `pending`; ini menegaskan uang fisik sudah berada di Admin.

### 4.3 GET `/admin/deposits/{deposit}`

Response detail:

```json
{
  "data": {
    "id": 501,
    "deposit_number": "SET-2026-08-000501",
    "status": "pending",
    "period": "2026-08",
    "officer": { "id": 12, "name": "Budi Santoso" },
    "digital_total": 148000,
    "physical_total": null,
    "discrepancy": null,
    "items": [
      {
        "payment_id": 8001,
        "customer_id": 44,
        "customer_name": "Asep Sopian",
        "receipt_number": "KWT-2026-08-000901",
        "method": "cash",
        "amount": 30000,
        "recorded_at": "2026-08-18T07:30:00Z"
      }
    ]
  }
}
```

### 4.4 POST `/petugas/deposits`

Petugas mengirim setoran setelah uang fisik diserahkan kepada Admin. Server mencatat `received_at` dari waktu server dan membuat status `pending`.

Request:

```json
{
  "period": "2026-08",
  "payment_ids": [8001, 8002, 8003],
  "handed_over_note": "Diserahkan langsung ke Admin"
}
```

Response mengembalikan `digital_total`, daftar item, dan status `pending`.

### 4.5 POST `/admin/deposits/{deposit}/verify`

Admin wajib mengisi nominal uang fisik yang benar-benar dihitung.

Request berhasil sesuai:

```json
{
  "decision": "verified",
  "physical_total": 148000,
  "cash_counted": 120000,
  "qris_confirmed": 28000,
  "note": "Sesuai dengan rekap digital"
}
```

Request dengan selisih:

```json
{
  "decision": "verified",
  "physical_total": 145000,
  "cash_counted": 117000,
  "qris_confirmed": 28000,
  "note": "Kurang Rp3.000, disepakati sebagai selisih"
}
```

Request penolakan:

```json
{
  "decision": "rejected",
  "physical_total": 0,
  "note": "Uang fisik belum diterima lengkap"
}
```

Response verifikasi:

```json
{
  "data": {
    "deposit_id": 501,
    "status": "verified",
    "digital_total": 148000,
    "physical_total": 145000,
    "discrepancy": -3000,
    "cash_transaction": {
      "id": 3001,
      "type": "income",
      "amount": 145000,
      "source_type": "officer_deposit",
      "source_id": 501,
      "status": "posted",
      "posted_at": "2026-08-19T09:20:00Z"
    }
  },
  "message": "Setoran terverifikasi dan sudah masuk kas utama."
}
```

Jika `decision=verified`, backend membuat tepat satu cash transaction berdasarkan `physical_total`, bukan `digital_total`. Jika `decision=rejected`, `cash_transaction` bernilai `null`.

## 5. Modul Kas / Treasury

### 5.1 Enum

```text
cash_account.type: main_cash | bank | qris
cash_transaction.type: income | expense | transfer | adjustment
cash_transaction.status: posted | voided
source_type: officer_deposit | expense | manual_adjustment | transfer
```

### 5.2 GET `/admin/cash-accounts`

Response:

```json
{
  "data": [
    { "id": 1, "code": "KAS-UTAMA", "name": "Kas Utama", "type": "main_cash", "balance": 4250000, "currency": "IDR" },
    { "id": 2, "code": "BANK-BRI", "name": "Bank BRI Desa", "type": "bank", "balance": 1800000, "currency": "IDR" }
  ]
}
```

### 5.3 GET `/admin/cash-transactions`

Query: `account_id`, `type`, `from`, `to`, `source_type`, `page`, `per_page`.

Response:

```json
{
  "data": [
    {
      "id": 3001,
      "account_id": 1,
      "type": "income",
      "amount": 145000,
      "description": "Setoran petugas Budi Santoso periode 2026-08",
      "source_type": "officer_deposit",
      "source_id": 501,
      "status": "posted",
      "occurred_at": "2026-08-19T09:20:00Z",
      "created_by": { "id": 1, "name": "Admin" }
    }
  ],
  "meta": { "current_page": 1, "per_page": 25, "total": 1, "last_page": 1 },
  "summary": { "opening_balance": 4105000, "income": 145000, "expense": 0, "closing_balance": 4250000 }
}
```

Cash transaction hasil verifikasi setoran dan pengeluaran harus memiliki `source_type` serta `source_id` agar dapat diaudit dan tidak dibuat dua kali.

### 5.4 POST `/admin/cash-transactions/transfer`

Request:

```json
{
  "from_account_id": 1,
  "to_account_id": 2,
  "amount": 500000,
  "description": "Setor tunai ke rekening bank",
  "occurred_at": "2026-08-19T10:00:00Z"
}
```

Server membuat dua transaksi berpasangan dengan `transfer_id` yang sama. Saldo sumber berkurang dan saldo tujuan bertambah dalam satu database transaction.

## 6. Modul Pengeluaran

### 6.1 Enum

```text
expense.status: draft | posted | rejected | voided
expense.payment_method: cash | bank | qris
```

### 6.2 GET `/admin/expenses`

Query: `status`, `category`, `from`, `to`, `page`, `per_page`.

### 6.3 POST `/admin/expenses`

Request draft:

```json
{
  "expense_date": "2026-08-19",
  "category": "Pemeliharaan",
  "description": "Pembelian pipa PVC 2 inch",
  "vendor": "Toko Bangunan Maju",
  "amount": 350000,
  "payment_method": "cash",
  "cash_account_id": 1,
  "reference_number": "NOTA-0891"
}
```

Response:

```json
{
  "data": {
    "id": 7001,
    "expense_date": "2026-08-19",
    "category": "Pemeliharaan",
    "description": "Pembelian pipa PVC 2 inch",
    "vendor": "Toko Bangunan Maju",
    "amount": 350000,
    "payment_method": "cash",
    "cash_account_id": 1,
    "status": "draft",
    "cash_transaction_id": null,
    "created_by": { "id": 1, "name": "Admin" }
  }
}
```

### 6.4 POST `/admin/expenses/{expense}/post`

Request:

```json
{ "note": "Bukti nota sudah diperiksa" }
```

Response:

```json
{
  "data": {
    "expense_id": 7001,
    "status": "posted",
    "cash_transaction": {
      "id": 3002,
      "account_id": 1,
      "type": "expense",
      "amount": 350000,
      "source_type": "expense",
      "source_id": 7001,
      "status": "posted",
      "posted_at": "2026-08-19T10:15:00Z"
    }
  }
}
```

Posting ditolak jika saldo tidak cukup, expense sudah `posted`, atau bukti wajib belum lengkap. `cash_transaction` harus dibuat atomik bersama perubahan status expense.

### 6.5 POST `/admin/expenses/{expense}/void`

Hanya boleh untuk expense `posted` dan harus membuat transaksi pembalik, bukan menghapus transaksi lama.

## 7. Modul Laporan

Laporan bersifat read-only dan dihitung dari data terverifikasi serta cash transaction `posted`.

### 7.1 GET `/admin/reports/monthly`

Query:

```text
period=2026-08
officer_id=12
dusun_id=3
format=json
```

Response:

```json
{
  "data": {
    "period": "2026-08",
    "generated_at": "2026-08-31T17:00:00Z",
    "scope": { "officer_id": 12, "dusun_id": 3 },
    "collection": {
      "billed_customers": 104,
      "payments_recorded": 96,
      "payments_amount": 2850000,
      "collection_percentage": 92.31
    },
    "deposits": {
      "pending_count": 1,
      "verified_count": 7,
      "verified_amount": 2785000,
      "rejected_count": 0,
      "discrepancy_amount": -65000
    },
    "cash": {
      "opening_balance": 3200000,
      "income_from_verified_deposits": 2785000,
      "expense_amount": 850000,
      "transfer_amount": 500000,
      "closing_balance": 4635000
    },
    "expenses_by_category": [
      { "category": "Pemeliharaan", "count": 2, "amount": 650000 },
      { "category": "Operasional", "count": 1, "amount": 200000 }
    ],
    "officers": [
      { "officer_id": 12, "officer_name": "Budi Santoso", "payments": 96, "verified_deposits": 2785000, "discrepancy": -65000 }
    ]
  }
}
```

`collection_percentage` dihitung dari jumlah pelanggan yang memiliki payment history valid, sedangkan saldo kas hanya memakai cash transaction `posted`.

### 7.2 GET `/admin/reports/monthly/export`

Query sama dengan laporan bulanan ditambah `format=pdf|xlsx|csv`.

Response:

```json
{
  "data": {
    "file_url": "/storage/reports/laporan-2026-08.pdf",
    "file_name": "laporan-pamsimas-2026-08.pdf",
    "mime_type": "application/pdf",
    "expires_at": "2026-09-01T17:00:00Z"
  }
}
```

## 8. Aturan Idempotensi dan Audit

Request yang membuat transaksi keuangan wajib menerima header:

```text
Idempotency-Key: <uuid-request>
```

Wajib untuk:

- verifikasi setoran,
- posting pengeluaran,
- transfer kas,
- pembuatan batch kwitansi.

Server menyimpan `created_by`, `created_at`, `updated_at`, dan audit log untuk perubahan status. FE harus menonaktifkan tombol selama request berjalan dan menampilkan status terakhir dari response server.

## 9. Mapping Adapter FE

Adapter FE cukup mengandalkan kontrak domain berikut:

```text
receipts.list(filters)
receipts.createBatch(payload)
deposits.list(filters)
deposits.detail(id)
deposits.verify(id, payload)
cash.accounts()
cash.transactions(filters)
cash.transfer(payload)
expenses.list(filters)
expenses.create(payload)
expenses.post(id, payload)
reports.monthly(filters)
reports.export(filters)
```

Mock adapter harus meniru status transition dan efek kas yang sama, bukan sekadar mengembalikan `success: true`.
