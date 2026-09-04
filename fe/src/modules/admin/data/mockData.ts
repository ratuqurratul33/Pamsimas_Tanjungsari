import type { AppData, NavEntry } from '../../../types'
import {
  presentationBills,
  presentationDashboard,
  presentationExpenses,
  presentationCustomers,
  presentationOfficers,
} from './presentationData'

export const fallbackData: AppData = {
  dashboard: presentationDashboard,
  customers: presentationCustomers,
  officers: presentationOfficers,
}

export const navGroups: NavEntry[] = [
  { type: 'link', page: 'dashboard', label: 'Dashboard', icon: 'grid' },
  {
    type: 'group',
    id: 'data',
    label: 'Data',
    icon: 'team',
    items: [
      { page: 'customers', label: 'Data Pelanggan' },
      { page: 'officers', label: 'Data Petugas' },
    ],
  },
  {
    type: 'group',
    id: 'tagihan',
    label: 'Tagihan',
    icon: 'receipt',
    items: [
      { page: 'receipts', label: 'Cetak Kwitansi' },
      { page: 'verification', label: 'Verifikasi Setoran' },
    ],
  },
  {
    type: 'group',
    id: 'transparansi',
    label: 'Transparansi',
    icon: 'wallet',
    items: [
      { page: 'cash', label: 'Akun Kas' },
      { page: 'expenses', label: 'Pengeluaran' },
      { page: 'transparency', label: 'Transparansi Wilayah' },
    ],
  },
  {
    type: 'group',
    id: 'publik',
    label: 'Publik',
    icon: 'drop',
    items: [
      { page: 'pamsimas-profile', label: 'Profil Publik' },
      { page: 'map-settings', label: 'Peta Jaringan Air' },
    ],
  },
  { type: 'link', page: 'reports', label: 'Laporan Bulanan', icon: 'chart' },
]

export const billRows = presentationBills.map((row) => [
  row.invoice,
  row.customerId,
  row.customerName,
  row.wilayah,
  row.officer,
  row.usage,
  row.total,
  row.status,
])

export const customerBillHistory = [
  ['November 2023', '124', '140', '16', 'Rp 48.000', 'Belum Lunas'],
  ['Oktober 2023', '110', '124', '14', 'Rp 42.000', 'Lunas'],
  ['September 2023', '95', '110', '15', 'Rp 45.000', 'Lunas'],
  ['Agustus 2023', '82', '95', '13', 'Rp 39.000', 'Lunas'],
]

export const officerDepositHistory = [
  ['25 Jan 2026', 'Jan 2026', '5', 'Rp200.000', 'Rp50.000', 'Rp250.000', 'Menunggu Verifikasi', 'Lihat Detail'],
  ['20 Jan 2026', 'Jan 2026', '45', 'Rp1.500.000', 'Rp500.000', 'Rp2.000.000', 'Sudah Diverifikasi', 'Lihat Detail'],
  ['15 Jan 2026', 'Jan 2026', '40', 'Rp1.250.000', 'Rp500.000', 'Rp1.750.000', 'Sudah Diverifikasi', 'Lihat Detail'],
]

export const expenseRows = presentationExpenses

export { presentationBills }

export const regionRows = [
  ['Dusun 1', '90%', '135 / 150 KK telah membayar', 'blue'],
  ['Dusun 2', '85%', '102 / 120 KK telah membayar', 'blue'],
  ['Dusun 3', '82%', '139 / 170 KK telah membayar', 'orange'],
]

export const rtRows = [
  ['RT 01', '25', '23', '2', '92%'],
  ['RT 02', '30', '23', '7', '76%'],
  ['RT 03', '20', '18', '2', '90%'],
  ['RT 04', '25', '18', '7', '72%'],
]

export const unpaidCustomerRows = [
  ['PAM-2608-002', 'Budi Santoso', 'Jl. Mawar No. 12', 'Rp 45.000'],
  ['PAM-2608-006', 'Citra', 'Jl. Melati No. 5', 'Rp 32.500'],
  ['PAM-2608-009', 'Deni', 'Gg. Kenanga No. 2', 'Rp 50.000'],
  ['PAM-2608-013', 'Eka', 'Jl. Mawar No. 18', 'Rp 28.000'],
]

export const reportIncomeRows = [
  ['Tagihan Air Reguler', '142', '3.550.000'],
  ['Pasang Baru', '1', '500.000'],
  ['Denda Keterlambatan', '8', '200.000'],
]
