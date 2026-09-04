import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'

const guideCards = [
  {
    icon: 'chart',
    title: 'Input Meter',
    points: ['Buka menu Input Meter.', 'Cari pelanggan dari nama atau ID.', 'Masukkan angka meter saat ini.', 'Klik Simpan & Buat Tagihan, tanggal input otomatis tercatat.'],
    note: 'Angka meter tidak boleh lebih kecil dari pembacaan periode sebelumnya.',
  },
  {
    icon: 'wallet',
    title: 'Pelanggan Bayar',
    points: ['Buka menu Pelanggan Bayar.', 'Filter RT/status bila data terlalu banyak.', 'Klik Membayar hanya pada status Belum Membayar.', 'Pilih Tunai atau QRIS lalu simpan bukti transaksi.'],
    note: 'Foto kwitansi fisik tercap wajib. Untuk QRIS, unggah juga bukti transaksi QRIS maksimal 2 MB.',
  },
  {
    icon: 'receipt',
    title: 'Setoran',
    points: ['Pastikan pembayaran tunai dan QRIS sudah tercatat.', 'Buka menu Setoran.', 'Periksa nominal tunai dan QRIS pada card ringkasan.', 'Klik Setorkan untuk menyerahkan data ke admin.'],
    note: 'Pembayaran yang sudah masuk setoran tidak boleh dimasukkan kembali ke setoran berikutnya.',
  },
]

export function FieldHelpPage() {
  return (
    <>
      <PageHeader
        subtitle="Panduan singkat petugas lapangan dan kontak bantuan developer."
        title="Panduan Petugas"
      />
      <section className="help-hero panel">
        <div>
          <span className="stat-icon"><Icon name="help" /></span>
          <h2>Butuh Panduan Saat Bertugas?</h2>
          <p>Catat kendala layar, nama pelanggan, dan langkah terakhir yang dilakukan agar tim developer bisa menelusuri masalah lebih cepat.</p>
        </div>
        <div className="developer-card">
          <small>Developer Support</small>
          <strong>Ratu Qurratul Aini</strong>
          <span>WhatsApp: 0857-2389-1658</span>
          <span>Email: ratuquratul@gmail.com</span>
        </div>
      </section>
      <section className="help-card-grid">
        {guideCards.map((card) => (
          <article className="panel help-card" key={card.title}>
            <span className="stat-icon"><Icon name={card.icon} /></span>
            <h3>{card.title}</h3>
            <ol>{card.points.map((point) => <li key={point}>{point}</li>)}</ol>
            <p className="help-note"><strong>Catatan:</strong> {card.note}</p>
          </article>
        ))}
      </section>
    </>
  )
}
