import { useEffect, useState } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { TableCard } from '../../../components/TableCard'
import { getAdminCustomerDetail, type AdminCustomerDetail } from '../services/adminApi'
import type { Customer, SetPage } from '../../../types'

export function CustomerDetailPage({ setPage }: { setPage: SetPage }) {
  const selectedCustomer = readSelectedCustomer()
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [error, setError] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const pageSize = 15

  useEffect(() => {
    if (!selectedCustomer.id) {
      setError('Pilih pelanggan dari halaman Data Pelanggan terlebih dahulu.')
      return
    }
    const controller = new AbortController()
    void getAdminCustomerDetail(selectedCustomer.id, controller.signal)
      .then(setDetail)
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(fetchError instanceof Error ? fetchError.message : 'Detail pelanggan gagal dimuat.')
      })
    return () => controller.abort()
  }, [selectedCustomer.id])

  const customer = detail?.customer ?? selectedCustomer
  const area = parseCustomerArea(customer.area)
  const initials = customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const currentBill = detail?.currentBill
  const isPaid = currentBill?.status === 'lunas'
  const history = detail?.history ?? []
  const averageUsage = history.length > 0 ? Math.round(history.reduce((total, bill) => total + bill.usage, 0) / history.length) : 0
  const paginatedHistory = history.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)

  return (
    <>
      <PageHeader
        action={<button className="ghost" onClick={() => setPage('customers')}><Icon name="back" />Kembali</button>}
        subtitle="Informasi pelanggan, status tagihan, dan riwayat transaksi dari database."
        title="Detail Pelanggan"
      />
      {error && <section className="error-panel"><strong>Detail gagal dimuat</strong><p>{error}</p></section>}
      <section className="field-customer-detail admin-customer-detail">
        <article className="profile-card customer-identity-card compact-identity-card">
          <div className="photo-avatar text-avatar">{initials}</div>
          <h2>{customer.name}</h2>
          <Badge status={customer.status} />
          <div className="plain-detail-list">
            <span><small>ID Pelanggan</small><b>{customer.id}</b></span>
            <span><small>Alamat</small><b>{customer.address}</b></span>
            <span><small>Wilayah</small><b>{area.dusun} / {area.rw} / {area.rt}</b></span>
            <span><small>Kampung</small><b>{area.kampung}</b></span>
            <span><small>Bergabung</small><b>{formatDate(detail?.customer.joinedAt)}</b></span>
          </div>
        </article>

        <article className="panel current-bill-card">
          <div className="panel-title">
            <h3><Icon name="receipt" />Tagihan Terbaru</h3>
            <Badge status={!currentBill ? 'Belum Ada Tagihan' : isPaid ? 'Lunas' : 'Menunggak'} />
          </div>
          <div className="bill-summary-grid compact-bill-grid">
            <span><small>Periode</small><b>{formatPeriod(currentBill?.period)}</b></span>
            <span><small>Pemakaian</small><b>{currentBill?.usage ?? 0} m3</b></span>
            <span><small>Total Tagihan</small><b className={!isPaid && currentBill ? 'money-red' : ''}>{formatCurrency(currentBill?.amount ?? 0)}</b></span>
            <span><small>Rata-rata Pemakaian</small><b>{averageUsage} m3/bulan</b></span>
            <span><small>Status Cetak</small><b>{currentBill?.printStatus === 'sudah_dicetak' ? 'Sudah Dicetak' : 'Belum Dicetak'}</b></span>
            <span><small>Denda</small><b>{formatCurrency(currentBill?.lateFee ?? 0)}</b></span>
          </div>
          {currentBill?.depositId && (
            <div className="button-group align-right">
              <button className="primary small" onClick={() => {
                sessionStorage.setItem('pamsimas-selected-deposit-id', String(currentBill.depositId))
                setPage('deposit-detail')
              }} type="button"><Icon name="wallet" />Lihat Setoran</button>
            </div>
          )}
        </article>
      </section>

      <TableCard
        footer={`Menampilkan ${history.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1}-${Math.min(pageNumber * pageSize, history.length)} dari ${history.length} data`}
        pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: history.length }}
        title="Riwayat Pemakaian & Tagihan"
      >
        <thead><tr><th>Periode</th><th>Meter Lalu</th><th>Meter Ini</th><th>Pemakaian</th><th>Tagihan</th><th>Status</th></tr></thead>
        <tbody>
          {paginatedHistory.length === 0 && <tr><td colSpan={6}>Belum ada riwayat meter dan tagihan.</td></tr>}
          {paginatedHistory.map((bill) => (
            <tr key={bill.invoiceNumber}>
              <td><strong>{formatPeriod(bill.period)}</strong></td>
              <td>{bill.meterPrevious}</td>
              <td>{bill.meterCurrent}</td>
              <td>{bill.usage} m3</td>
              <td><strong>{formatCurrency(bill.amount)}</strong></td>
              <td><Badge status={bill.status === 'lunas' ? 'Lunas' : 'Menunggak'} /></td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </>
  )
}

function readSelectedCustomer(): Customer {
  try {
    const rawCustomer = sessionStorage.getItem('pamsimas-selected-customer')
    if (rawCustomer) return JSON.parse(rawCustomer) as Customer
  } catch {
    // Direct URL access uses a safe placeholder until a customer is selected.
  }
  return { address: '-', area: '-', id: '', name: 'Pelanggan belum dipilih', status: 'Nonaktif' }
}

function parseCustomerArea(area: string) {
  const [location = '', kampung = '-'] = area.split(' - ')
  const parts = location.split('/').map((part) => part.trim())
  return {
    dusun: parts.find((part) => part.startsWith('Dusun')) ?? '-',
    kampung,
    rt: parts.find((part) => part.startsWith('RT')) ?? '-',
    rw: parts.find((part) => part.startsWith('RW')) ?? '-',
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { currency: 'IDR', maximumFractionDigits: 0, style: 'currency' }).format(value)
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value))
}

function formatPeriod(value?: string) {
  if (!value) return '-'
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}
