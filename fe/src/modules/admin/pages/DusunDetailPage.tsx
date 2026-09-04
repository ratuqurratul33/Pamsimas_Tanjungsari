import { useEffect, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { getAdminTransparency } from '../../../app/services/transparencyRepository'
import { getTransparencyPeriod, type RegionMonthlyStat } from '../../../utils/regionStats'
import type { SetPage } from '../../../types'

export function DusunDetailPage({ setPage }: { setPage: SetPage }) {
  const period = getTransparencyPeriod()
  const selectedDusun = sessionStorage.getItem('pamsimas-transparency-dusun') ?? 'Dusun 3'
  const [stat, setStat] = useState<RegionMonthlyStat>()
  useEffect(() => {
    const monthNumber = String(MONTHS.indexOf(period.month) + 1).padStart(2, '0')
    void getAdminTransparency(monthNumber, period.year)
      .then((data) => setStat(data.rows.find((item) => item.name === selectedDusun)))
      .catch(() => setStat(undefined))
  }, [period.month, period.year, selectedDusun])
  const paid = stat?.paid ?? 0
  const total = stat?.total ?? 0
  const progress = stat?.progress ?? 0

  return (
    <>
      <button className="back-link" onClick={() => setPage('transparency')}><Icon name="back" />Kembali / Transparansi Wilayah / {selectedDusun}</button>
      <PageHeader subtitle="Pantau tingkat pembayaran pelanggan berdasarkan RT dan kampung." title={`Pembayaran ${selectedDusun}`} />
      <p className="period-info">Periode transparansi otomatis: {period.month} {period.year}</p>
      <p className="transparency-live-note">Data periode berjalan belum final dan terus dihitung dari pembayaran pelanggan yang telah diverifikasi Admin.</p>
      {!stat ? <section className="panel empty-state">Belum ada informasi transparansi pada periode ini.</section> : (
        <>
          <section className="stat-grid four">
            <StatCard stat={{ label: 'Total Pelanggan', value: String(total) }} />
            <StatCard stat={{ label: 'Sudah Bayar', value: String(paid), tone: 'green' }} />
            <StatCard stat={{ label: 'Belum Bayar', value: String(total - paid), tone: 'red' }} />
            <StatCard stat={{ label: 'Persentase', value: `${progress}%`, tone: 'blue' }} />
          </section>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          <TableCard>
            <thead><tr><th>RT</th><th>RW</th><th>Kampung</th><th>Total Pelanggan</th><th>Sudah Bayar</th><th>Belum Bayar</th><th>Pembayaran</th><th>Aksi</th></tr></thead>
            <tbody>
              {stat.rts.map((row) => (
                <tr key={`${row.rw}-${row.rt}`}>
                  <td>{row.rt}</td><td>{row.rw}</td><td>{row.kampung}</td><td>{row.total}</td><td>{row.paid}</td><td>{row.total - row.paid}</td><td>{row.progress}%</td>
                  <td><button className="ghost small" onClick={() => {
                    sessionStorage.setItem('pamsimas-transparency-rt', JSON.stringify({ dusun: selectedDusun, kampung: row.kampung, rt: row.rt, rw: row.rw }))
                    setPage('rt-detail')
                  }}>Lihat Detail</button></td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </>
      )}
    </>
  )
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
