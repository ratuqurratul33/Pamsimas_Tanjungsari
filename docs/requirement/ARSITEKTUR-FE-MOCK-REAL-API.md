# Arsitektur FE Mock API dan Real API

## Tujuan

Front-end memiliki satu kontrak data untuk setiap fitur. Komponen UI tidak mengetahui apakah data berasal dari `localStorage` atau Laravel API. Pergantian mode cukup dilakukan pada satu variable Vite:

```env
VITE_USE_MOCK_API=true
```

Gunakan `true` saat BE/MySQL belum aktif. Gunakan `false` saat Laravel API sudah berjalan.

## Struktur yang dipakai

```text
fe/src/
  app/
    config/environment.ts       # satu sumber keputusan mode
    services/
      customerRepository.ts     # kontrak yang dikenal UI
      mockApiService.ts          # CRUD + localStorage
      realApiService.ts          # CRUD + Laravel REST API
      apiService.ts              # factory pemilih adapter
  modules/
    admin/services/adminApi.ts   # facade kompatibel dengan halaman lama
    admin/pages/CustomersPage.tsx
```

## Alur CRUD pelanggan

```text
CustomersPage
    -> adminApi.ts
    -> apiService.customers
       -> mockCustomerRepository  (VITE_USE_MOCK_API=true)
       -> realCustomerRepository  (VITE_USE_MOCK_API=false)
```

`CustomersPage` tetap menggunakan `getAdminCustomers`, `createAdminCustomer`, `updateAdminCustomer`, dan `deleteAdminCustomer`. Karena facade tersebut meneruskan ke factory, tidak ada perubahan UI saat BE diganti.

## Mode simulasi

Seed awal diambil dari `modules/admin/data/mockData.ts`. Setelah itu data disimpan di key:

```text
pamsimas.mock.customers.v1
```

Tambah, edit, dan hapus langsung memperbarui key tersebut. Refresh browser tidak menghilangkan perubahan. Jika ingin mengulang dari data awal, jalankan di DevTools:

```js
localStorage.removeItem('pamsimas.mock.customers.v1')
location.reload()
```

## Mode Laravel

Adapter real memanggil endpoint berikut:

```text
GET    /api/admin/customers?per_page=100
POST   /api/admin/customers
PATCH  /api/admin/customers/{customer}
DELETE /api/admin/customers/{customer}
POST   /api/auth/login
```

Token disimpan di `localStorage` pada key `pamsimas.admin.token`. Jika token kedaluwarsa, adapter menghapus token lalu mencoba login ulang satu kali. Jika database kosong, response `data: []` menjadi tabel kosong, bukan error.

## Role dan otorisasi

Login mock yang tersedia untuk pengujian FE:

```text
admin@pamsimas.local / password
budi.santoso / 0877-6543-2109
```

Kontrak role yang perlu dipertahankan pada service berikutnya:

| Role | Akses |
|---|---|
| Publik | Guest, read-only pada data yang memang dipublikasikan |
| Admin | CRUD pelanggan, petugas, profil publik, peta, setoran, kas, laporan |
| Petugas | Read pelanggan wilayah sendiri, input meter, pembayaran lapangan, setoran sendiri |

Otorisasi final tetap wajib dilakukan Laravel melalui middleware dan policy. Mock mode hanya mensimulasikan aturan UI; ia bukan pengganti keamanan BE.

## Modul yang sudah memakai pola adapter

Saat ini factory dan repository sudah digunakan pada:

- autentikasi admin/petugas,
- CRUD pelanggan admin,
- CRUD petugas admin pada mode simulasi,
- input meter petugas,
- pembayaran lapangan petugas,
- pembuatan dan daftar setoran petugas,
- peta publik dan profil publik admin pada mode simulasi,
- dashboard admin pada mode simulasi,
- lazy loading setiap halaman.

Data operasional pelanggan petugas dibaca dari master pelanggan. Record setoran bersama dibaca dari key `pamsimas.mock.finance.deposits.v1`.

## Satu Sumber Dummy Data

Mulai versi ini, data dummy lintas role memakai prinsip shared mock database:

```text
pamsimas.mock.customers.v1
  ├─ Admin: master pelanggan dan pengelolaan data
  ├─ Petugas: pelanggan wilayah tugas + meter + pembayaran
  └─ Publik: hanya ringkasan yang memang dipublikasikan

pamsimas.mock.finance.deposits.v1
  ├─ Petugas: membuat dan melihat setoran sendiri
  └─ Admin: melihat, memverifikasi, atau menolak setoran
```

Field operasional meter dan pembayaran disimpan sebagai bagian dari entitas pelanggan yang sama, sehingga tidak ada pelanggan bayangan yang berbeda antara Admin dan Petugas. Petugas tetap hanya menerima subset wilayah dan field yang dibutuhkan untuk bekerja; pembatasan ini adalah pembatasan tampilan/role, bukan duplikasi data.

## Pola untuk fitur berikutnya

Setiap domain mengikuti empat langkah:

1. Buat interface repository, misalnya `DepositRepository`.
2. Buat `mockDepositRepository` dengan key `pamsimas.mock.deposits.v1`.
3. Buat `realDepositRepository` yang memetakan response Laravel ke tipe UI.
4. Tambahkan repository itu ke `apiService`, lalu panggil hanya dari facade/service fitur.

Jangan memanggil `fetch` langsung dari komponen halaman. Modul kwitansi, verifikasi setoran, kas, pengeluaran, dan laporan masih memiliki beberapa tabel presentasi lama yang perlu dipindahkan ke repository domain yang sama ketika endpoint BE finalnya sudah disepakati. UI-nya tidak perlu dirombak; cukup ganti sumber data pada service.

## Menjalankan

Mode mock:

```powershell
cd fe
npm.cmd run dev
```

Mode real:

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:8000/api
```

Setelah mengubah `.env`, restart Vite karena environment variable dibaca saat proses build/dev server dimulai.
