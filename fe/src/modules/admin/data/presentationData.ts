import type { Customer, Officer } from '../../../types'
import { makeAvatarPhoto } from '../../../utils/avatar'
import { areaUnits, findAreaByKampung, formatArea, type AreaUnit } from './regionData'

type CustomerSeed = {
  name: string
  kampung: string
  note?: string
}

export type BillingRow = {
  customerId: string
  customerName: string
  invoice: string
  meterEnd: number
  meterStart: number
  month: 'Juli 2026' | 'Agustus 2026'
  officer: string
  status: 'Belum Dicetak' | 'Sudah Dicetak'
  total: string
  usage: string
  wilayah: string
}

export type DepositRecord = {
  cash: string
  customerCount: string
  id: string
  officer: string
  period: 'Juli 2026' | 'Agustus 2026'
  qris: string
  status: 'Menunggu' | 'Diverifikasi' | 'Ditolak'
  total: string
  transactionAt: string
}

export type DepositCustomerRecord = {
  amount: string
  customerId: string
  method: 'Tunai' | 'QRIS'
  name: string
  status: 'Pending' | 'Lunas' | 'Ditolak'
}

const realDusun3Seeds: CustomerSeed[] = [
  { name: 'Kamaludin', kampung: 'Babakan Sari', note: 'No awal - no baru' },
  { name: 'Asep Sopian', kampung: 'Babakan Sari' },
  { name: 'Wiwin', kampung: 'Babakan Sari' },
  { name: 'Hasanah', kampung: 'Babakan Sari' },
  { name: 'Odah', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'Agus Suherman', kampung: 'Babakan Sari' },
  { name: 'Siti Aijah', kampung: 'Babakan Sari' },
  { name: 'Ajat Sudrajat', kampung: 'Babakan Sari' },
  { name: 'Yani Mulyana', kampung: 'Babakan Sari' },
  { name: 'Abdulah', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'Sariah', kampung: 'Babakan Sari' },
  { name: 'Devia Mars', kampung: 'Babakan Sari' },
  { name: 'Asep Hardiman', kampung: 'Babakan Sari' },
  { name: 'Uti', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'Uloh', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'Fauzi', kampung: 'Babakan Sari' },
  { name: 'Siti Sopiah', kampung: 'Babakan Sari' },
  { name: 'Ahmad Yani', kampung: 'Babakan Sari' },
  { name: 'Suherman', kampung: 'Babakan Sari' },
  { name: 'Angela', kampung: 'Babakan Sari' },
  { name: 'Saprudin', kampung: 'Babakan Sari' },
  { name: 'Rohimat', kampung: 'Babakan Sari' },
  { name: 'Solihin', kampung: 'Babakan Sari' },
  { name: 'Opi Novitasari', kampung: 'Babakan Sari' },
  { name: 'Ani', kampung: 'Babakan Sari' },
  { name: 'Susan', kampung: 'Babakan Sari' },
  { name: 'Anita', kampung: 'Babakan Sari' },
  { name: 'Ahmad', kampung: 'Babakan Sari' },
  { name: 'Nyai Nasad', kampung: 'Babakan Sari' },
  { name: 'Rezaldy', kampung: 'Babakan Sari' },
  { name: 'Anjar', kampung: 'Babakan Sari' },
  { name: 'Saepul', kampung: 'Babakan Sari' },
  { name: 'Sri Resida', kampung: 'Babakan Sari' },
  { name: 'Mulyani', kampung: 'Babakan Sari' },
  { name: 'Nunung N.', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'A. Sarkosyah', kampung: 'Babakan Sari' },
  { name: 'Dede Rodiah', kampung: 'Babakan Sari' },
  { name: 'Rohman S.', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'Irpan Yusuf', kampung: 'Babakan Sari', note: 'Kilo meter tunggak/tak jalan' },
  { name: 'Isop Nurhasan', kampung: 'Babakan Sari' },
  { name: 'Usep Solihin', kampung: 'Babakan Sari' },
  { name: 'U. Sambas', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'Siti Masitoh', kampung: 'Babakan Sari' },
  { name: 'Ade Rohiyah', kampung: 'Babakan Sari' },
  { name: 'Dede', kampung: 'Babakan Sari', note: 'Kilo meter tidak jalan' },
  { name: 'Lulu Budiarsih', kampung: 'Babakan Sari', note: 'Kilo meter rusak' },
  { name: 'Latina', kampung: 'Babakan Sari' },
  { name: 'Ajat Sudrajat II', kampung: 'Babakan Sari' },
  { name: 'Ahmad J.', kampung: 'Bobojong' },
  { name: 'Winda', kampung: 'Sukaasih' },
  { name: 'Eleng Susilawati', kampung: 'Sukaasih' },
  { name: 'Eneng', kampung: 'Sukaasih' },
  { name: 'Cahya', kampung: 'Sukaasih' },
  { name: 'Bos Dipan', kampung: 'Sukaasih' },
  { name: 'Kuraesih', kampung: 'Sukaasih' },
  { name: 'Mae Munah', kampung: 'Sukaasih', note: 'Kilo meter tidak jalan' },
  { name: 'Usup', kampung: 'Sukaasih' },
  { name: 'Usmas', kampung: 'Sukaasih' },
  { name: 'Hendrik', kampung: 'Sukaasih' },
  { name: 'Titi', kampung: 'Sukaasih', note: 'Kilo meter tidak jalan' },
  { name: 'Rijan', kampung: 'Sukaasih' },
  { name: 'Rendi', kampung: 'Sukaasih' },
  { name: 'Sani', kampung: 'Sukaasih' },
  { name: 'Pian', kampung: 'Sukaasih' },
  { name: 'Enyin', kampung: 'Sukaasih' },
  { name: 'Yoyom', kampung: 'Sukaasih' },
  { name: 'Mara', kampung: 'Sukaasih' },
  { name: 'Lilis R.', kampung: 'Sukaasih' },
  { name: 'Bos Endang', kampung: 'Sukaasih' },
  { name: 'Nur', kampung: 'Sukaasih' },
  { name: 'Euis', kampung: 'Sukaasih' },
  { name: 'Bahar', kampung: 'Sukaasih', note: 'Kilo meter tidak jalan' },
  { name: 'Yana', kampung: 'Sukaasih' },
  { name: 'Ayi', kampung: 'Sukaasih' },
  { name: 'Mira', kampung: 'Sukaasih' },
  { name: 'Agus', kampung: 'Sukaasih' },
  { name: 'Aji', kampung: 'Sukaasih' },
  { name: 'Imas', kampung: 'Sukaasih' },
  { name: 'Ayu', kampung: 'Sukaasih' },
  { name: 'Supriyanto', kampung: 'Sukaasih' },
  { name: 'Ajang A.', kampung: 'Sukaasih' },
  { name: 'Dede M.', kampung: 'Sukaasih' },
  { name: 'H. Saman', kampung: 'Pasir Peucang' },
  { name: 'H. Asep Ahmad', kampung: 'Pasir Peucang' },
  { name: 'Mardiyah', kampung: 'Pasir Peucang' },
  { name: 'Aep Komaludin', kampung: 'Pasir Peucang' },
  { name: 'Abidin', kampung: 'Pasir Peucang' },
  { name: 'Wa Jeje', kampung: 'Pasir Peucang', note: 'SR rusak' },
  { name: 'H. Aip', kampung: 'Pasir Peucang', note: 'SR rusak/tak jalan' },
  { name: 'Acep Somanti', kampung: 'Pasir Peucang', note: 'SR rusak' },
  { name: 'Abdul', kampung: 'Pasir Peucang' },
  { name: 'Suherman P.', kampung: 'Pasir Peucang' },
  { name: 'Uyun', kampung: 'Pasir Peucang' },
  { name: 'Usep Suganda', kampung: 'Pasir Peucang' },
  { name: 'Ateng Sumirat', kampung: 'Pasir Peucang' },
  { name: 'Sudarya', kampung: 'Pasir Peucang' },
  { name: 'Taufik H.', kampung: 'Pasir Peucang' },
  { name: 'Lamah', kampung: 'Banceuy' },
  { name: 'Iyoy', kampung: 'Banceuy' },
  { name: 'Nair', kampung: 'Banceuy' },
  { name: 'Wa Rizal', kampung: 'Banceuy' },
  { name: 'Agung', kampung: 'Banceuy' },
  { name: 'Pa Darul', kampung: 'Tanjungsari' },
  { name: 'Soni', kampung: 'Sukaasih', note: 'SR rusak' },
]

const dusun1Names = [
  'Neng Fitri',
  'Yanto Saputra',
  'Ibu Rukmini',
  'Dadan Ramdani',
  'Tatang Surya',
  'Euis Kartini',
  'Nanang Hidayat',
  'Maman Suparman',
  'Eni Nuraeni',
  'Rudi Hermawan',
  'Heni Marlina',
  'Asep Mulyadi',
  'Dewi Kurnia',
  'Iwan Setiawan',
  'Kokom Komariah',
  'Tati Rohayati',
  'Deni Firmansyah',
  'Lilis Suryani',
  'Ujang Wawan',
  'Titin Kartika',
  'Agus Rahmat',
  'Yayah Rokayah',
  'Solehudin',
  'Mimin Aminah',
  'Hendra Wijaya',
  'Nia Kurniasih',
  'Dede Saputra',
  'Rina Herlina',
  'Jajang Nurjaman',
  'Susi Susanti',
  'Aang Kusnadi',
  'Oom Rohmah',
  'Imam Fauzi',
  'Tuti Alawiyah',
  'Dadang Koswara',
  'Maya Sari',
  'Cecep Hidayat',
  'Rohayati',
  'Wawan Gunawan',
  'Neneng Hasanah',
  'Aep Saepudin',
  'Cucu Cahyati',
  'Eman Sulaeman',
  'Lina Marlina',
  'Asep Sukmana',
  'Nining Yuningsih',
  'Pipit Fitriani',
  'Samsudin',
  'Iis Aisyah',
  'Tedi Permana',
  'Oman Suhendar',
  'Yanti Sulastri',
  'Heru Maulana',
  'Rini Astuti',
  'Rahmat Hidayat',
  'Diah Anggraeni',
  'Uus Rusmana',
  'Dedeh Hamidah',
  'Ade Gunawan',
  'Rohimah',
  'Sopyan',
  'Mira Lestari',
  'Apipudin',
  'Sari Nurlaila',
]

export const presentationCustomers: Customer[] = [
  ...buildCustomers(realDusun3Seeds, 1),
  ...buildDusun1Customers(),
]

export const presentationOfficers: Officer[] = [
  {
    area: 'Dusun 1 / RW 05 / Semua RT',
    areas: areaUnits.filter((area) => area.dusun === 'Dusun 1').map(formatArea),
    customers: 64,
    dusun: 'Dusun 1',
    id: 'PTG-001',
    kampung: 'Tanjungsari, Pasir Jati, Cikawung',
    name: 'Asep Rahmat',
    phone: '0812-6405-0101',
    photoUrl: makeAvatarPhoto('Asep Rahmat'),
    regionIds: [1, 2, 3],
    rt: 'RT 01, RT 02, RT 03',
    rw: 'RW 05',
    status: 'Aktif',
    username: 'asep.rahmat',
  },
  {
    area: 'Dusun 3 / RW 06 / Semua RT',
    areas: areaUnits.filter((area) => area.dusun === 'Dusun 3').map(formatArea),
    customers: 104,
    dusun: 'Dusun 3',
    id: 'PTG-002',
    kampung: 'Banceuy, Pasir Peucang, Babakan Sari, Sukaasih',
    name: 'Budi Santoso',
    phone: '0877-6543-2109',
    photoUrl: makeAvatarPhoto('Budi Santoso'),
    regionIds: [4, 5, 6, 7],
    rt: 'RT 01, RT 02, RT 04, RT 05',
    rw: 'RW 06',
    status: 'Aktif',
    username: 'budi.santoso',
  },
]

export const presentationBills: BillingRow[] = presentationCustomers.slice(0, 42).map((customer, index) => {
  const meterStart = 74 + (index % 38)
  const usage = 10 + (index % 18)
  const amount = usage * 3000 + 5000
  const month = index % 5 === 0 ? 'Juli 2026' : 'Agustus 2026'
  const officer = customer.area.includes('Dusun 1') ? 'Asep Rahmat' : 'Budi Santoso'

  return {
    customerId: customer.id,
    customerName: customer.name,
    invoice: `INV-${month === 'Agustus 2026' ? '2608' : '2607'}-${String(index + 1).padStart(3, '0')}`,
    meterEnd: meterStart + usage,
    meterStart,
    month,
    officer,
    status: index % 3 === 0 ? 'Sudah Dicetak' : 'Belum Dicetak',
    total: formatRupiah(amount),
    usage: `${usage} m3`,
    wilayah: customer.area,
  }
})

export const presentationDeposits: DepositRecord[] = [
  createDeposit('SET-2608-001', '12 Agustus 2026, 13:40', 'Budi Santoso', 'Agustus 2026', 28, 925000, 410000, 'Menunggu'),
  createDeposit('SET-2608-002', '10 Agustus 2026, 15:15', 'Asep Rahmat', 'Agustus 2026', 18, 610000, 180000, 'Diverifikasi'),
  createDeposit('SET-2607-001', '29 Juli 2026, 16:05', 'Budi Santoso', 'Juli 2026', 24, 820000, 260000, 'Diverifikasi'),
  createDeposit('SET-2607-002', '27 Juli 2026, 10:20', 'Asep Rahmat', 'Juli 2026', 12, 410000, 0, 'Ditolak'),
]

export const presentationDepositCustomers: Record<string, DepositCustomerRecord[]> = {
  'SET-2608-001': presentationBills.slice(0, 8).map((bill, index) => ({
    amount: bill.total,
    customerId: bill.customerId,
    method: index % 3 === 0 ? 'QRIS' : 'Tunai',
    name: bill.customerName,
    status: 'Pending',
  })),
  'SET-2608-002': presentationBills.filter((bill) => bill.officer === 'Asep Rahmat').slice(0, 6).map((bill, index) => ({
    amount: bill.total,
    customerId: bill.customerId,
    method: index % 2 === 0 ? 'Tunai' : 'QRIS',
    name: bill.customerName,
    status: 'Lunas',
  })),
}

export const presentationExpenses = [
  ['02 Ags 2026', 'Listrik', 'Kas QRIS', 'Token listrik pompa utama Dusun 3', '1', 'Bulan', 'Rp850.000', 'Rp850.000', 'Lihat', 'YA', '...'],
  ['05 Ags 2026', 'Perbaikan Pipa', 'Kas Tunai', 'Sambungan pipa PVC 2 inch RT 02 Pasir Peucang', '6', 'Pcs', 'Rp85.000', 'Rp510.000', 'Lihat', 'YA', '...'],
  ['08 Ags 2026', 'Transport', 'Kas Tunai', 'Transport pengecekan jalur air Banceuy dan Sukaasih', '2', 'Trip', 'Rp75.000', 'Rp150.000', 'Lihat', 'TIDAK', '...'],
  ['11 Ags 2026', 'Perawatan', 'Kas QRIS', 'Service ringan pompa dan pengecekan tekanan air', '1', 'Paket', 'Rp475.000', 'Rp475.000', 'Lihat', 'YA', '...'],
  ['15 Jul 2026', 'Honor', 'Kas Tunai', 'Honor petugas catat meter bulan Juli', '2', 'Orang', 'Rp500.000', 'Rp1.000.000', 'Lihat', 'TIDAK', '...'],
  ['22 Jul 2026', 'Operasional', 'Kas Tunai', 'ATK administrasi dan tinta kwitansi', '1', 'Paket', 'Rp185.000', 'Rp185.000', 'Lihat', 'TIDAK', '...'],
]

export const presentationDashboard = {
  cash: [
    { label: 'Kas Tunai', value: 'Rp7.850.000' },
    { label: 'Kas QRIS', value: 'Rp4.240.000' },
  ],
  stats: [
    { label: 'Total Pelanggan Aktif', note: 'Dusun 1 dan Dusun 3', tone: 'blue' as const, value: String(presentationCustomers.filter((customer) => customer.status !== 'Nonaktif').length) },
    { label: 'Setoran Menunggu Verifikasi', note: 'Perlu diperiksa admin', tone: 'orange' as const, value: String(presentationDeposits.filter((deposit) => deposit.status === 'Menunggu').length) },
    { label: 'Total Pengeluaran Bulan Ini', tone: 'muted' as const, value: 'Rp1.985.000' },
  ],
}

function buildCustomers(seeds: CustomerSeed[], startIndex: number) {
  return seeds.map((seed, index) => {
    const area = resolveArea(seed.kampung)
    const isBrokenMeter = seed.note?.toLowerCase().includes('tidak jalan') || seed.note?.toLowerCase().includes('rusak')
    const isOverdue = isBrokenMeter || index % 6 === 0

    return {
      address: `Kp. ${area.kampung} No. ${String(index + 1).padStart(2, '0')}`,
      area: formatArea(area),
      id: `PAM-2608-${String(startIndex + index).padStart(3, '0')}`,
      name: seed.name,
      status: isOverdue ? 'Menunggak' : 'Aktif',
    } satisfies Customer
  })
}

function buildDusun1Customers() {
  const dusun1Areas = areaUnits.filter((area) => area.dusun === 'Dusun 1')
  return dusun1Names.map((name, index) => {
    const area = dusun1Areas[index % dusun1Areas.length]

    return {
      address: `Kp. ${area.kampung} No. ${String(index + 1).padStart(2, '0')}`,
      area: formatArea(area),
      id: `PAM-2608-${String(105 + index).padStart(3, '0')}`,
      name,
      status: index % 9 === 0 ? 'Menunggak' : 'Aktif',
    } satisfies Customer
  })
}

function resolveArea(kampung: string): AreaUnit {
  if (kampung === 'Bobojong') {
    return { dusun: 'Dusun 3', households: 1, kampung: 'Bobojong', rt: 'RT 03', rw: 'RW 06' }
  }

  return findAreaByKampung(kampung) ?? areaUnits[0]
}

function createDeposit(
  id: string,
  transactionAt: string,
  officer: string,
  period: 'Juli 2026' | 'Agustus 2026',
  customerCount: number,
  cash: number,
  qris: number,
  status: DepositRecord['status'],
): DepositRecord {
  return {
    cash: cash.toLocaleString('id-ID'),
    customerCount: String(customerCount),
    id,
    officer,
    period,
    qris: qris.toLocaleString('id-ID'),
    status,
    total: (cash + qris).toLocaleString('id-ID'),
    transactionAt,
  }
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
