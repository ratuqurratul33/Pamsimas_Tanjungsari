import waterMapImage from '../../../assets/jalur-air-dusun-2-dan-3.png'
import { makeAvatarPhoto } from '../../../utils/avatar'

export type PublicServiceCard = {
  desc: string
  icon: string
  title: string
}

export type PublicMember = {
  description: string
  id: string
  image?: string
  name: string
  role: string
}

export type PublicProfileContent = {
  address: string
  contactLabel: string
  contactWhatsapp: string
  description: string
  established: string
  name: string
  officeHoursDays: string
  officeHoursTime: string
  title: string
}

export type PublicMapSettings = {
  title: string
  description: string
  mapNote: string
  coverage: string
  contactLabel: string
  contactWhatsapp: string
  image: string
  status: 'Sistem Normal' | 'Perlu Perhatian'
  guideTitle: string
  guideDescription: string
  guideSteps: string[]
}

export type PublicComplaint = {
  id: string
  name: string
  phone: string
  area: string
  category: string
  description: string
  status: 'Baru' | 'Diproses' | 'Selesai'
  createdAt: string
}

export const defaultPublicMapSettings: PublicMapSettings = {
  title: 'Jalur air dan Panduan Pemasangan',
  description:
    'Peta jaringan ditampilkan sebagai gambar resmi yang diunggah admin, sementara panduan pemasangan tampil langsung agar warga mudah memahaminya.',
  mapNote: 'Gambar peta publik ini dikelola admin dan diperbarui mengikuti kondisi jaringan lapangan terbaru.',
  coverage: 'Dusun 1 dan Dusun 3',
  contactLabel: 'Hubungi petugas untuk pendaftaran sambungan baru',
  contactWhatsapp: '6281234567890',
  image: waterMapImage,
  status: 'Sistem Normal',
  guideTitle: 'Panduan pemasangan instalasi air',
  guideDescription:
    'Panduan ditampilkan langsung di website publik agar warga bisa membaca alur pendaftaran tanpa harus membuka dokumen lain.',
  guideSteps: [
    'Hubungi petugas atau pengurus wilayah melalui WhatsApp untuk menyampaikan nama dan alamat rumah.',
    'Petugas mengecek lokasi rumah terhadap jalur pipa pada peta jaringan resmi PAMSIMAS.',
    'Admin dan petugas menyiapkan jadwal survey atau pemasangan sesuai kebutuhan lapangan.',
    'Warga menunggu konfirmasi lanjutan dari petugas sampai sambungan siap dikerjakan.',
  ],
}

export const defaultPublicProfile: PublicProfileContent = {
  address: 'Balai Desa Tanjungsari, Dusun 3',
  contactLabel: 'Nomor WA Narahubung',
  contactWhatsapp: '6281234567890',
  description:
    'PAMSIMAS Desa Tanjung Sari adalah layanan air bersih berbasis masyarakat yang mengelola distribusi air rumah tangga, pencatatan pelanggan, pemeliharaan jalur pipa, dan iuran operasional desa secara gotong royong.',
  established: 'Berdiri sejak 2018',
  name: 'PAMSIMAS Tanjungsari',
  officeHoursDays: 'Senin sampai Jumat',
  officeHoursTime: '08:00 - 16:00',
  title: 'Dikelola warga, dibaca warga.',
}

export const defaultPublicServiceCards: PublicServiceCard[] = [
  {
    desc: 'Peta jalur, data pelanggan, dan setoran iuran saling terhubung agar warga bisa melihat kondisi layanan dengan tenang.',
    icon: 'drop',
    title: 'Layanan air yang terbaca jelas',
  },
  {
    desc: 'Ringkasan pemasukan dan pengeluaran dibuat sederhana, bukan sekadar angka mentah.',
    icon: 'money',
    title: 'Kas lebih mudah diawasi',
  },
  {
    desc: 'Petugas lapangan dan admin bekerja dari catatan yang sama untuk mengurangi selisih data.',
    icon: 'shield',
    title: 'Operasional lebih tertib',
  },
]

export const defaultPublicMembers: PublicMember[] = [
  {
    description: 'Mengawasi arah layanan, keputusan operasional, dan koordinasi warga.',
    id: 'member-1',
    image: makeAvatarPhoto('Budi Santoso'),
    name: 'Budi Santoso',
    role: 'Ketua PAMSIMAS',
  },
  {
    description: 'Merapikan pencatatan kas, dokumen, laporan, dan arsip pembayaran.',
    id: 'member-2',
    image: makeAvatarPhoto('Siti Aminah'),
    name: 'Siti Aminah',
    role: 'Sekretaris & Bendahara',
  },
  {
    description: 'Memantau jalur pipa, pompa, dan penanganan gangguan lapangan.',
    id: 'member-3',
    image: makeAvatarPhoto('Joko Rianto'),
    name: 'Joko Rianto',
    role: 'Koordinator Teknis',
  },
  {
    description: 'Menerima pertanyaan warga dan membantu proses pemasangan baru.',
    id: 'member-4',
    image: makeAvatarPhoto('Ahmad Fauzi'),
    name: 'Ahmad Fauzi',
    role: 'Layanan Pelanggan',
  },
]

export const publicStats = [
  { label: 'Total Pelanggan', value: '1,245', icon: 'team' },
  { label: 'Wilayah Terlayani', value: 'Dusun 3+', icon: 'map' },
  { label: 'Pembayaran Aktif', value: '82%', icon: 'money' },
  { label: 'Pengaduan Aktif', value: '3', icon: 'shield' },
]

export const publicIssues = [
  ['11 Agu 2026', 'RT 02 Dusun 3', 'Tekanan air menurun', 'Diproses'],
  ['09 Agu 2026', 'RT 04 Dusun 3', 'Kebocoran pipa sekunder', 'Selesai'],
  ['04 Agu 2026', 'Dusun 1 RW 05', 'Pembersihan jalur pipa', 'Selesai'],
]

export const publicFaq = [
  {
    category: 'Pembayaran',
    items: [
      {
        question: 'Bagaimana cara bayar tagihan air?',
        answer: 'Pembayaran dapat dilakukan melalui petugas penagih wilayah atau QRIS resmi PAMSIMAS saat tersedia.',
      },
      {
        question: 'Kapan jatuh tempo pembayaran setiap bulannya?',
        answer: 'Pembayaran dianjurkan dilakukan sebelum tanggal 25 agar status pelanggan tetap tercatat lunas.',
      },
    ],
  },
  {
    category: 'Pengaduan',
    items: [
      {
        question: 'Bagaimana cara melaporkan pipa bocor?',
        answer: 'Gunakan menu Pengaduan, isi lokasi detail, kategori kebocoran pipa, dan unggah foto bila ada.',
      },
    ],
  },
]

export const publicProfile = defaultPublicProfile
export const publicServiceCards = defaultPublicServiceCards
export const organizationMembers = defaultPublicMembers.map((member) => [member.name, member.role] as const)
export const organizationMemberNotes: Record<string, string> = Object.fromEntries(
  defaultPublicMembers.map((member) => [member.role, member.description]),
)

