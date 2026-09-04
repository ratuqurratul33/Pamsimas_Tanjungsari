import type { Page } from '../../types'

export const pageRoutes: Record<Page, string> = {
  login: '/login',
  'public-home': '/website/public',
  'public-map': '/website/public/peta-air',
  'public-transparency': '/website/public/transparansi',
  'public-issues': '/website/public/riwayat-gangguan',
  'public-complaint': '/website/public/pengaduan',
  'public-faq': '/website/public/faq',
  'public-about': '/website/public/tentang',
  'public-contact': '/website/public/kontak',
  dashboard: '/website/admin/dashboard',
  customers: '/website/admin/pelanggan',
  'customer-detail': '/website/admin/pelanggan/detail',
  officers: '/website/admin/petugas',
  'officer-detail': '/website/admin/petugas/detail',
  receipts: '/website/admin/kwitansi',
  'receipt-bulk': '/website/admin/kwitansi/cetak-massal',
  verification: '/website/admin/verifikasi-setoran',
  'deposit-detail': '/website/admin/verifikasi-setoran/detail-setoran',
  cash: '/website/admin/akun-kas',
  expenses: '/website/admin/pengeluaran',
  'map-settings': '/website/admin/peta-air-publik',
  transparency: '/website/admin/transparansi-wilayah',
  'dusun-detail': '/website/admin/transparansi-wilayah/dusun',
  'rt-detail': '/website/admin/transparansi-wilayah/rt',
  reports: '/website/admin/laporan-bulanan',
  'report-print': '/website/admin/laporan-bulanan/cetak-formal',
  'system-settings': '/website/admin/pengaturan-sistem',
  'pamsimas-profile': '/website/admin/profil-pamsimas',
  'admin-account': '/website/admin/akun-saya',
  'admin-help': '/website/admin/bantuan',
  'field-dashboard': '/website/petugas/dashboard',
  'field-customers': '/website/petugas/pelanggan',
  'field-customer-detail': '/website/petugas/pelanggan/detail',
  'field-meter': '/website/petugas/input-meter',
  'field-payments': '/website/petugas/pembayaran',
  'field-deposits': '/website/petugas/riwayat-setoran',
  'field-profile': '/website/petugas/profil',
  'field-help': '/website/petugas/bantuan',
}

const routePages = Object.entries(pageRoutes).reduce<Record<string, Page>>((routes, [page, path]) => {
  routes[path] = page as Page
  return routes
}, {})

export function resolvePage(pathname: string): Page {
  if (pathname === '/petugas') {
    return 'field-dashboard'
  }

  if (pathname === '/' || pathname === '/website') {
    return 'public-home'
  }

  return routePages[pathname] ?? 'dashboard'
}

export function resolvePath(page: Page) {
  return pageRoutes[page]
}
