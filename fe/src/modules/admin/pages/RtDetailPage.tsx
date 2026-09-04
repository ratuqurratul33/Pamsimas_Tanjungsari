import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { getAdminTransparency } from '../../../app/services/transparencyRepository'
import { getTransparencyPeriod, type RegionRtStat } from '../../../utils/regionStats'
import type { SetPage } from '../../../types'

type SelectedRt = { dusun: string; kampung: string; rt: string; rw: string }

export function RtDetailPage({ setPage }: { setPage: SetPage }) {
  const period = getTransparencyPeriod()
  const selected = readSelectedRt()
  const [stat, setStat] = useState<RegionRtStat>()
  useEffect(() => {
    const monthNumber = String(MONTHS.indexOf(period.month) + 1).padStart(2, '0')
    void getAdminTransparency(monthNumber, period.year)
      .then((data) => {
        const dusun = data.rows.find((item) => item.name === selected.dusun)
        setStat(dusun?.rts.find((item) => item.rt === selected.rt && item.rw === selected.rw))
      })
      .catch(() => setStat(undefined))
  }, [period.month, period.year, selected.dusun, selected.rt, selected.rw])
  const paid = stat?.paid ?? 0
  const total = stat?.total ?? 0

  return (
    <>
      <button className="back-link" onClick={() => setPage('dusun-detail')}><Icon name="back" />Transparansi Wilayah / {selected.dusun} / {selected.rt}</button>
      <PageHeader subtitle={`Daftar pelanggan berdasarkan status pembayaran di Kampung ${selected.kampung}.`} title={`Pembayaran ${selected.rt} - ${selected.kampung}`} />
      <p className="period-info">Periode transparansi otomatis: {period.month} {period.year}</p>
      <p className="transparency-live-note">Data periode berjalan belum final dan terus dihitung dari pembayaran pelanggan yang telah diverifikasi Admin.</p>
      <section className="stat-grid four">
        <StatCard stat={{ label: 'Total Pelanggan', value: String(total) }} />
        <StatCard stat={{ label: 'Sudah Bayar', value: String(paid), tone: 'blue' }} />
        <StatCard stat={{ label: 'Belum Bayar', value: String(total - paid), tone: 'red' }} />
        <StatCard stat={{ label: 'Persentase', value: `${stat?.progress ?? 0}%`, tone: 'blue' }} />
      </section>
      <TableCard title={`Daftar Pelanggan (${total})`}>
        <thead><tr><th>ID Pelanggan</th><th>Nama Pelanggan</th><th>Alamat</th><th>Tagihan</th><th>Status</th></tr></thead>
        <tbody>
          {(stat?.customers ?? []).map((row) => (
            <tr key={row.customer.id}>
              <td>{row.customer.id}</td><td>{row.customer.name}</td><td>{row.customer.address}</td><td>Rp{row.billAmount.toLocaleString('id-ID')}</td>
              <td><Badge status={row.paid ? 'Lunas' : 'Belum Bayar'} /></td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </>
  )
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function readSelectedRt(): SelectedRt {
  try {
    return JSON.parse(sessionStorage.getItem('pamsimas-transparency-rt') ?? '') as SelectedRt
  } catch {
    return { dusun: 'Dusun 3', kampung: 'Pasir Peucang', rt: 'RT 02', rw: 'RW 06' }
  }
}
import { useEffect, useState } from 'react'
