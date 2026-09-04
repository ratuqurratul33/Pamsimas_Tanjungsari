import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { TableCard } from '../../../components/TableCard'
import type { SetPage } from '../../../types'
import type { FieldCustomer, FieldPaymentStatus } from '../data/petugasData'
import { formatRupiah, getFieldBillingSettings } from '../data/petugasData'
import { buildPaginationSummary } from '../../../utils/pagination'
import type { PaymentProof } from '../../../app/services/fieldRepository'

type FieldPaymentsPageProps = {
  activePeriod?: string
  billing?: { dueDay: number; lateFee: number } | null
  customers: FieldCustomer[]
  onEditPaymentProof: (customerId: string, proof: PaymentProof, paymentId?: number) => Promise<void>
  onPayCustomer: (customerId: string, method: 'Tunai' | 'QRIS', proof: PaymentProof, billId?: number) => Promise<void>
  setPage: SetPage
  onSelectMeterCustomer: (customerId: string) => void
}

/**
 * The petugas can browse any month in "Pelanggan Bayar", but a FieldCustomer
 * only carries its CURRENT bill at the top level — everything else lives in
 * meterHistory. This resolves what should actually be shown/acted on for the
 * period currently selected in the dropdown, instead of always falling back
 * to the customer's latest bill (which was the root cause of both "changing
 * the month doesn't change the data" and "petugas can't record a payment
 * even though admin printed the kwitansi" — that second one happened because
 * payments were always posted against the latest bill_id, not the one whose
 * receipt was actually printed).
 */
type PeriodView = {
  baseAmount: number
  billId?: number
  currentMeter: number
  lateFee: number
  meterRecorded: boolean
  paymentId?: number
  paymentMethod?: 'Tunai' | 'QRIS' | 'Transfer'
  paymentProofPreview?: string
  previousMeter: number
  qrisProofPreview?: string
  status: FieldPaymentStatus
  totalAmount: number
  usage: number
}

function resolvePeriodView(customer: FieldCustomer, period: string): PeriodView {
  if (customer.billingPeriod === period) {
    return {
      baseAmount: customer.baseBillAmount ?? customer.billAmount,
      billId: customer.billId,
      currentMeter: customer.currentMeter,
      lateFee: customer.lateFeeAmount ?? 0,
      meterRecorded: customer.meterStatus === 'Sudah Dicatat',
      paymentId: customer.paymentId,
      paymentMethod: customer.paymentMethod,
      paymentProofPreview: customer.paymentProofPreview,
      previousMeter: customer.lastMeter,
      qrisProofPreview: customer.qrisProofPreview,
      status: deriveStatus(customer.billStatus, customer.meterStatus === 'Sudah Dicatat', customer.billAmount, Boolean(customer.paymentMethod)),
      totalAmount: customer.billAmount,
      usage: Math.max(customer.currentMeter - customer.lastMeter, 0),
    }
  }

  const entry = customer.meterHistory?.find((reading) => reading.period === period)
  if (!entry) {
    return {
      baseAmount: 0, currentMeter: 0, lateFee: 0, meterRecorded: false, previousMeter: 0,
      status: 'Belum Input Meter', totalAmount: 0, usage: 0,
    }
  }

  return {
    baseAmount: entry.billAmount - (entry.lateFeeAmount ?? 0),
    billId: entry.billId,
    currentMeter: entry.currentMeter,
    lateFee: entry.lateFeeAmount ?? 0,
    meterRecorded: true,
    paymentId: entry.paymentId,
    paymentMethod: entry.paymentMethod,
    paymentProofPreview: entry.paymentProofPreview,
    previousMeter: entry.previousMeter,
    qrisProofPreview: entry.qrisProofPreview,
    status: deriveStatus(entry.status, true, entry.billAmount, Boolean(entry.paymentMethod)),
    totalAmount: entry.billAmount,
    usage: entry.usage,
  }
}

function deriveStatus(billStatus: string | undefined, meterRecorded: boolean, billAmount: number, hasPaymentMethod: boolean): FieldPaymentStatus {
  if (billStatus === 'Lunas') return 'Lunas'
  if (billStatus === 'Sudah Membayar' || hasPaymentMethod) return 'Sudah Membayar'
  if (!meterRecorded) return 'Belum Input Meter'
  if (billAmount > 0) return 'Belum Membayar'

  return 'Terinput Meter'
}

export function FieldPaymentsPage({ activePeriod, billing, customers, onEditPaymentProof, onPayCustomer, onSelectMeterCustomer, setPage }: FieldPaymentsPageProps) {
  const [query, setQuery] = useState('')
  const [billingPeriod, setBillingPeriod] = useState(activePeriod ?? formatCurrentPeriod())
  const [filters, setFilters] = useState({ rt: '', status: '' })
  const [draftFilters, setDraftFilters] = useState(filters)
  const [selectedCustomer, setSelectedCustomer] = useState<FieldCustomer | null>(null)
  const [selectedPeriodView, setSelectedPeriodView] = useState<PeriodView | null>(null)
  const [isEditingProof, setIsEditingProof] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const pageSize = 15
  // Adopt the active period once it arrives asynchronously, but only before
  // the petugas has picked a month themselves — otherwise this would snap
  // their selection back to the current period on every change, locking the
  // dropdown to "today" (the periode dropdown below now genuinely offers a
  // range of months, so this must not fight that).
  const hasSyncedInitialPeriod = useRef(Boolean(activePeriod))
  useEffect(() => {
    if (activePeriod && !hasSyncedInitialPeriod.current) {
      hasSyncedInitialPeriod.current = true
      setBillingPeriod(activePeriod)
    }
  }, [activePeriod])
  // Keep the selected period authoritative. If no reading exists for it,
  // show an empty table instead of silently reusing another period's data.
  const hasPeriodData = customers.some((customer) =>
    customer.billingPeriod === billingPeriod || customer.meterHistory?.some((reading) => reading.period === billingPeriod),
  )
  const periodCustomers = hasPeriodData ? customers : []
  const uniqueRt = Array.from(new Set(periodCustomers.map((customer) => customer.rt)))
  const filteredCustomers = periodCustomers.filter((customer) => {
    const paymentStatus = resolvePeriodView(customer, billingPeriod).status
    const queryMatches = `${customer.id} ${customer.name} ${customer.kampung}`.toLowerCase().includes(query.toLowerCase())
    const rtMatches = filters.rt ? customer.rt === filters.rt : true
    const statusMatches = filters.status ? paymentStatus === filters.status : true

    return queryMatches && rtMatches && statusMatches
  })
  const paginatedCustomers = filteredCustomers.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
  const dueDateRange = getDueDateRangeFor(billingPeriod, billing)

  return (
    <>
      <PageHeader subtitle="Pantau pembayaran pelanggan kepada petugas di wilayah tugas Anda." title="Pelanggan Bayar" />
      <p className="period-info">Aksi Pelanggan Bayar digunakan untuk mencatat uang yang diterima petugas secara langsung di lapangan.</p>
      <section className={dueDateRange.isOverdue ? 'panel billing-window-banner is-overdue' : 'panel billing-window-banner'}>
        <div className="billing-window-banner__head">
          <span>Batas Waktu Bayar Tanpa Denda &ndash; {formatPeriodLabel(billingPeriod)}</span>
          {dueDateRange.isOverdue && <span className="badge danger">Lewat Jatuh Tempo</span>}
        </div>
        <strong className="billing-window-banner__range">
          Tanggal 1 &ndash; {dueDateRange.dueDay} {formatPeriodLabel(billingPeriod)}
        </strong>
        <p>
          {dueDateRange.isOverdue
            ? `Sudah lewat batas waktu. Sampaikan ke pelanggan yang belum bayar bahwa tagihan otomatis bertambah denda ${formatRupiah(dueDateRange.lateFee)}.`
            : `Ingatkan pelanggan untuk membayar sebelum tanggal ${dueDateRange.dueDay} agar tidak terkena denda keterlambatan ${formatRupiah(dueDateRange.lateFee)}.`}
        </p>
      </section>
      <section className="filter-bar compact-filter split-filter">
        <select className="input-select compact-select" onChange={(event) => { setBillingPeriod(event.target.value); setPageNumber(1) }} value={billingPeriod}>
          {buildPeriodOptions().map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
        </select>
        <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, rt: event.target.value })} value={draftFilters.rt}>
          <option value="">Semua RT</option>
          {uniqueRt.map((rt) => <option key={rt}>{rt}</option>)}
        </select>
        <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })} value={draftFilters.status}>
          <option value="">Semua Status</option>
          <option>Belum Input Meter</option>
          <option>Terinput Meter</option>
          <option>Belum Membayar</option>
          <option>Sudah Membayar</option>
          <option>Lunas</option>
        </select>
        <button className="primary small" onClick={() => { setFilters(draftFilters); setPageNumber(1) }}>Terapkan Filter</button>
        <label className="search-field push-right">
          <Icon name="search" />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama/ID..." value={query} />
        </label>
      </section>

      <TableCard
        footer={buildPaginationSummary(pageNumber, pageSize, filteredCustomers.length, 'data')}
        pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: filteredCustomers.length }}
      >
        <thead>
          <tr>
            <th>ID PGN</th>
            <th>Nama Pelanggan</th>
            <th>RT</th>
            <th>Kampung</th>
            <th>Meter Awal</th>
            <th>Meter Akhir</th>
            <th>Total Meter</th>
            <th>Biaya Admin</th>
            <th>Total Tagihan</th>
            <th>Metode</th>
            <th>Status</th>
            <th>Bukti Bayar</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {paginatedCustomers.map((customer) => (
            <PaymentRow
              customer={customer}
              key={customer.id}
              onEditProof={(nextCustomer, view) => { setSelectedCustomer(nextCustomer); setSelectedPeriodView(view); setIsEditingProof(true) }}
              onInputMeter={(nextCustomer) => {
                onSelectMeterCustomer(nextCustomer.id)
                setPage('field-meter')
              }}
              onPay={(nextCustomer, view) => { setSelectedCustomer(nextCustomer); setSelectedPeriodView(view); setIsEditingProof(false) }}
              view={resolvePeriodView(customer, billingPeriod)}
            />
          ))}
        </tbody>
      </TableCard>

      {selectedCustomer && selectedPeriodView && (
        <PaymentModal
          customer={selectedCustomer}
          isEditingProof={isEditingProof}
          onClose={() => { setSelectedCustomer(null); setSelectedPeriodView(null) }}
          onSubmit={(method, proof) => isEditingProof
            ? onEditPaymentProof(selectedCustomer.id, proof, selectedPeriodView.paymentId)
            : onPayCustomer(selectedCustomer.id, method, proof, selectedPeriodView.billId)}
          view={selectedPeriodView}
        />
      )}
    </>
  )
}

function formatCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function buildPeriodOptions() {
  const now = new Date()
  const monthsBack = 24
  const monthsForward = 1

  return Array.from({ length: monthsBack + monthsForward + 1 }, (_, index) => index - monthsBack).map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    return { label: formatPeriodLabel(value), value }
  })
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-').map(Number)
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${months[(month || 1) - 1] ?? 'Bulan'} ${year}`
}

function getDueDateRangeFor(period: string, billing?: { dueDay: number; lateFee: number } | null) {
  const [year, month] = period.split('-').map(Number)
  const settings = billing ?? getFieldBillingSettings()
  const daysInMonth = new Date(year, month, 0).getDate()
  const dueDay = Math.min(Math.max(settings.dueDay, 1), daysInMonth)
  const dueDate = new Date(year, (month || 1) - 1, dueDay, 23, 59, 59)

  return { dueDay, isOverdue: new Date() > dueDate, lateFee: settings.lateFee }
}

function PaymentRow({ customer, onEditProof, onInputMeter, onPay, view }: {
  customer: FieldCustomer
  onEditProof: (customer: FieldCustomer, view: PeriodView) => void
  onInputMeter: (customer: FieldCustomer) => void
  onPay: (customer: FieldCustomer, view: PeriodView) => void
  view: PeriodView
}) {
  const canPay = view.status === 'Belum Membayar'

  return (
    <tr>
      <td>{customer.id}</td>
      <td><strong>{customer.name}</strong></td>
      <td>{customer.rt}</td>
      <td>{customer.kampung}</td>
      <td>{view.meterRecorded ? `${view.previousMeter} m3` : '-'}</td>
      <td>{view.meterRecorded ? `${view.currentMeter} m3` : '-'}</td>
      <td>{view.meterRecorded ? `${view.usage} m3` : '-'}</td>
      <td>{view.meterRecorded ? formatRupiah(5000) : '-'}</td>
      <td>
        <strong>{formatRupiah(view.totalAmount)}</strong>
        {view.lateFee > 0 && <small className="table-subtext">Termasuk denda {formatRupiah(view.lateFee)}</small>}
      </td>
      <td>{view.paymentMethod ?? '-'}</td>
      <td><Badge status={view.status} /></td>
      <td>
        {view.status === 'Lunas' || view.status === 'Sudah Membayar' ? (
          <div className="payment-proof-cell">
            <div className="payment-proof-thumbnails">
              {view.paymentProofPreview && (
                <a href={view.paymentProofPreview} rel="noreferrer" target="_blank">
                  <img alt={`Bukti kwitansi ${customer.name}`} src={view.paymentProofPreview} />
                  <span>Kwitansi</span>
                </a>
              )}
              {view.qrisProofPreview && (
                <a href={view.qrisProofPreview} rel="noreferrer" target="_blank">
                  <img alt={`Bukti QRIS ${customer.name}`} src={view.qrisProofPreview} />
                  <span>QRIS</span>
                </a>
              )}
              {!view.paymentProofPreview && !view.qrisProofPreview && <span className="muted">Belum ada foto</span>}
            </div>
            {view.paymentId && <button className="link proof-edit-link" onClick={() => onEditProof(customer, view)} type="button">Edit bukti</button>}
          </div>
        ) : <span className="muted">-</span>}
      </td>
      <td>
          {view.status === 'Belum Input Meter' ? (
            <button className="ghost small" onClick={() => onInputMeter(customer)}>
              <Icon name="chart" />
              Input Meter
            </button>
          ) : canPay ? (
            <button className="primary small" onClick={() => onPay(customer, view)}>
              <Icon name="money" />
              Membayar
            </button>
          ) : view.status === 'Lunas' || view.status === 'Sudah Membayar' ? (
            <button className="ghost small" disabled>Selesai Membayar</button>
          ) : (
            <button className="ghost small" disabled>{view.status}</button>
          )}
        </td>
    </tr>
  )
}

export function PaymentModal({
  customer,
  isEditingProof = false,
  onClose,
  onSubmit,
  view = resolvePeriodView(customer, customer.billingPeriod ?? ''),
}: {
  customer: FieldCustomer
  isEditingProof?: boolean
  onClose: () => void
  onSubmit: (method: 'Tunai' | 'QRIS', proof: PaymentProof) => Promise<void>
  view?: PeriodView
}) {
  const [method, setMethod] = useState<'Tunai' | 'QRIS'>(view.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai')
  const [proof, setProof] = useState<PaymentProof | null>(view.paymentProofPreview ? {
    name: customer.paymentProofName ?? 'bukti-bayar',
    preview: view.paymentProofPreview,
    qrisName: customer.qrisProofName,
    qrisPreview: view.qrisProofPreview,
  } : null)
  const [proofError, setProofError] = useState('')
  const [qrisProofError, setQrisProofError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!proof) {
      setProofError('Foto kwitansi tercap wajib diunggah.')
      return
    }
    if (method === 'QRIS' && !proof.qrisName) {
      setQrisProofError('Bukti transaksi QRIS wajib diunggah.')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit(method, proof)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Pembayaran gagal disimpan, silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeProof(file?: File) {
    setProofError('')
    if (!file) {
      setProof(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setProof(null)
      setProofError('Bukti harus berupa foto JPG, JPEG, atau PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setProof(null)
      setProofError('Ukuran foto kwitansi maksimal 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProof((current) => ({
      ...current,
      file,
      name: file.name,
      preview: typeof reader.result === 'string' ? reader.result : undefined,
    }))
    reader.readAsDataURL(file)
  }

  function changeQrisProof(file?: File) {
    setQrisProofError('')
    if (!file) {
      setProof((current) => current ? { ...current, qrisFile: undefined, qrisName: undefined, qrisPreview: undefined } : current)
      return
    }
    if (!file.type.startsWith('image/')) {
      setQrisProofError('Bukti QRIS harus berupa foto JPG, JPEG, atau PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setQrisProofError('Ukuran bukti QRIS maksimal 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProof((current) => ({
      file: current?.file,
      name: current?.name ?? customer.paymentProofName ?? '',
      preview: current?.preview,
      qrisFile: file,
      qrisName: file.name,
      qrisPreview: typeof reader.result === 'string' ? reader.result : undefined,
    }))
    reader.readAsDataURL(file)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal payment-modal" onSubmit={submitPayment}>
        <div className="modal-head">
          <div>
            <h2>{isEditingProof ? 'Perbarui Bukti Bayar' : 'Membayar Pelanggan'}</h2>
            <p>INV-202608-{customer.id}</p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-grid one-column">
          <section className="mini-summary wide-summary">
            <span>Pelanggan <b>{customer.name}</b></span>
            <span>Tagihan pokok <b>{formatRupiah(view.baseAmount)}</b></span>
            {view.lateFee > 0 && <span>Denda keterlambatan <b className="money-red">{formatRupiah(view.lateFee)}</b></span>}
            <span>Total yang harus dibayar <b className="money-blue">{formatRupiah(view.totalAmount)}</b></span>
          </section>
          {!isEditingProof && (
            <>
              <label>Metode Pembayaran Langsung</label>
              <div className="payment-methods">
                {(['Tunai', 'QRIS'] as const).map((item) => (
                  <button
                    className={method === item ? 'method-card active' : 'method-card'}
                    key={item}
                    onClick={() => setMethod(item)}
                    type="button"
                  >
                    <Icon name={item === 'Tunai' ? 'money' : 'grid'} />
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}
          <label>
            Foto Kwitansi Fisik Tercap
            <input accept="image/png,image/jpeg" onChange={(event) => changeProof(event.target.files?.[0])} type="file" />
            <small>Maksimal 2 MB, format JPG/JPEG/PNG.</small>
            {proof && <span className="file-status">{proof.name}</span>}
            {proofError && <span className="field-error">{proofError}</span>}
          </label>
          {method === 'QRIS' && (
            <label>
              Bukti Transaksi QRIS
              <input accept="image/png,image/jpeg" onChange={(event) => changeQrisProof(event.target.files?.[0])} type="file" />
              <small>Wajib untuk QRIS. Maksimal 2 MB, format JPG/JPEG/PNG.</small>
              {proof?.qrisName && <span className="file-status">{proof.qrisName}</span>}
              {qrisProofError && <span className="field-error">{qrisProofError}</span>}
            </label>
          )}
          <label>
            Catatan
            <textarea placeholder="Tambahkan catatan jika diperlukan..." />
          </label>
          {submitError && <p className="error-panel">{submitError}</p>}
        </div>
        <div className="modal-foot">
          <button className="ghost" onClick={onClose} type="button">Batal</button>
          <button className="primary" disabled={isSubmitting} type="submit">
            <Icon name="wallet" />
            {isSubmitting ? 'Menyimpan...' : isEditingProof ? 'Simpan Bukti' : 'Simpan Pembayaran'}
          </button>
        </div>
      </form>
    </div>
  )
}
