import { useEffect, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { getAdminTransparency } from '../../../app/services/transparencyRepository'
import type { RegionMonthlyStat } from '../../../utils/regionStats'
import type { SetPage } from '../../../types'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function TransparencyPage({ setPage }: { setPage: SetPage }) {
  const [month, setMonth] = useState('Agustus')
  const [year, setYear] = useState('2026')
  const [appliedMonth, setAppliedMonth] = useState('Agustus')
  const [appliedYear, setAppliedYear] = useState('2026')
  const [dusunStats, setDusunStats] = useState<RegionMonthlyStat[]>([])

  useEffect(() => {
    const monthNumber = String(MONTHS.indexOf(appliedMonth) + 1).padStart(2, '0')
    void getAdminTransparency(monthNumber, appliedYear).then((data) => setDusunStats(data.rows)).catch(() => setDusunStats([]))
  }, [appliedMonth, appliedYear])

  return (
    <>
      <PageHeader
        subtitle="Monitoring tingkat pembayaran per wilayah, dihitung langsung dari data pelanggan aktif."
        title="Transparansi Wilayah"
      />
      <section className="filter-bar compact-filter">
        <label>
          Bulan
          <select className="input-select compact-select" onChange={(event) => setMonth(event.target.value)} value={month}>
            {MONTHS.map((monthName) => <option key={monthName}>{monthName}</option>)}
          </select>
        </label>
        <label>
          Tahun
          <select className="input-select compact-select" onChange={(event) => setYear(event.target.value)} value={year}>
            <option>2026</option>
            <option>2025</option>
          </select>
        </label>
        <button className="primary small" onClick={() => { setAppliedMonth(month); setAppliedYear(year) }}>Terapkan Filter</button>
      </section>
      <p className="period-info">Periode transparansi: {appliedMonth} {appliedYear}</p>
      <p className="period-info subtle-period">Data dusun di bawah ini dihitung langsung dari data pelanggan aktif, sama dengan yang tampil di halaman Publik.</p>
      {appliedMonth === MONTHS[new Date().getMonth()] && appliedYear === String(new Date().getFullYear()) && (
        <p className="transparency-live-note">Periode ini masih berjalan. Persentase belum final dan terus dihitung sampai akhir bulan dari pembayaran pelanggan yang telah diverifikasi.</p>
      )}
      {dusunStats.length === 0 && <section className="panel empty-state">Belum ada informasi transparansi untuk periode yang dipilih.</section>}
      <section className="stat-grid three">
        {dusunStats.map((stat) => (
          <article className={`region-card ${stat.progress >= 80 ? 'blue' : stat.progress >= 50 ? 'orange' : 'red'}`} key={stat.name} onClick={() => {
            sessionStorage.setItem('pamsimas-transparency-period', JSON.stringify({ month: appliedMonth, year: appliedYear }))
            sessionStorage.setItem('pamsimas-transparency-dusun', stat.name)
            setPage('dusun-detail')
          }}>
            <h3>{stat.name}</h3>
            <p>Total Tagihan: {formatMoney(stat.billTotal)}</p>
            <strong>{stat.progress}%<span> Lunas</span></strong>
            <small>{stat.paid} / {stat.total} KK telah membayar</small>
            <div className="progress"><span style={{ width: `${stat.progress}%` }} /></div>
          </article>
        ))}
      </section>
    </>
  )
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
