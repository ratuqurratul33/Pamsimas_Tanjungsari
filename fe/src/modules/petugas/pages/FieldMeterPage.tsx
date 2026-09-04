import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import type { SetPage } from '../../../types'
import type { FieldCustomer } from '../data/petugasData'
import { formatRupiah, getFieldBillingSettings } from '../data/petugasData'

type FieldMeterPageProps = {
  activePeriod?: string
  billing?: { adminFee: number; waterRate: number } | null
  customers: FieldCustomer[]
  isLoading?: boolean
  onSaveMeter: (customerId: string, previousMeter: number, currentMeter: number, billAmount: number, submittedAt: string, billingPeriod: string) => Promise<void>
  selectedCustomerId: string
  setPage: SetPage
}

export function FieldMeterPage({ activePeriod, billing, customers, isLoading = false, onSaveMeter, selectedCustomerId, setPage }: FieldMeterPageProps) {
  if (customers.length === 0) {
    return (
      <>
        <PageHeader
          subtitle="Catat pemakaian air pelanggan untuk membuat tagihan bulan berjalan."
          title="Input Meter"
        />
        <section className="panel stacked-panel meter-search-panel" aria-live="polite">
          <strong>{isLoading ? 'Memuat data pelanggan...' : 'Belum ada pelanggan di wilayah tugas'}</strong>
          <p className="helper">
            {isLoading
              ? 'Data wilayah tugas sedang diambil dari server.'
              : 'Minta Admin menambahkan pelanggan dan menetapkan wilayah sebelum melakukan input meter.'}
          </p>
          {!isLoading && <button className="ghost" onClick={() => setPage('field-dashboard')} type="button">Kembali ke Dashboard</button>}
        </section>
      </>
    )
  }

  return (
    <FieldMeterForm
      customers={customers}
      activePeriod={activePeriod}
      billing={billing}
      onSaveMeter={onSaveMeter}
      selectedCustomerId={selectedCustomerId}
      setPage={setPage}
    />
  )
}

function FieldMeterForm({ activePeriod, billing, customers, onSaveMeter, selectedCustomerId, setPage }: FieldMeterPageProps) {
  const periodOptions = buildPeriodOptions(activePeriod)
  const defaultPeriod = activePeriod && /^\d{4}-\d{2}$/.test(activePeriod) ? activePeriod : formatPeriodValue(new Date())
  const [billingPeriod, setBillingPeriod] = useState(defaultPeriod)
  const billingMonth = formatPeriodLabel(billingPeriod)
  const firstAvailableCustomer = customers.find((customer) =>
    !customer.meterHistory?.some((reading) => reading.period === billingPeriod),
  ) ?? customers[0]
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? firstAvailableCustomer
  const [customerId, setCustomerId] = useState(selectedCustomer.id)
  const customer = customers.find((item) => item.id === customerId) ?? selectedCustomer
  const readingForPeriod = customer.meterHistory?.find((reading) => reading.period === billingPeriod)
  const latestPreviousReading = customer.meterHistory
    ?.filter((reading) => reading.period < billingPeriod)
    .sort((left, right) => right.period.localeCompare(left.period))[0]
  const isFirstReading = !latestPreviousReading
  const defaultPreviousMeter = readingForPeriod?.previousMeter ?? latestPreviousReading?.currentMeter ?? (isFirstReading ? 0 : undefined)
  const [currentMeter, setCurrentMeter] = useState('')
  const [previousMeter, setPreviousMeter] = useState(defaultPreviousMeter === undefined ? '' : String(defaultPreviousMeter))
  const [meterNote, setMeterNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const submittedAt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())
  const numericPreviousMeter = Number(previousMeter) || 0
  const numericMeter = currentMeter ? Number(currentMeter) : null
  const usage = numericMeter !== null ? Math.max(numericMeter - numericPreviousMeter, 0) : 0
  const billingSettings = billing ?? getFieldBillingSettings()
  const total = numericMeter !== null ? usage * billingSettings.waterRate + billingSettings.adminFee : 0
  const hasRecordedThisMonth = Boolean(readingForPeriod)

  // Adopt the active billing period once it arrives from the dashboard
  // summary (which loads asynchronously), but only before the petugas has
  // picked a month themselves — otherwise this would snap their selection
  // back to the current period on every change, locking the dropdown.
  const hasSyncedInitialPeriod = useRef(Boolean(activePeriod))
  useEffect(() => {
    if (activePeriod && !hasSyncedInitialPeriod.current) {
      hasSyncedInitialPeriod.current = true
      setBillingPeriod(activePeriod)
    }
  }, [activePeriod])

  useEffect(() => {
    setPreviousMeter(defaultPreviousMeter === undefined ? '' : String(defaultPreviousMeter))
    setCurrentMeter('')
  }, [billingPeriod, customer.id, defaultPreviousMeter])

  function changeCustomer(nextCustomerId: string) {
    const nextCustomer = customers.find((item) => item.id === nextCustomerId)
    setCustomerId(nextCustomerId)
    const nextLatestReading = nextCustomer?.meterHistory
      ?.filter((reading) => reading.period < billingPeriod)
      .sort((left, right) => right.period.localeCompare(left.period))[0]
    setPreviousMeter(String(nextLatestReading?.currentMeter ?? 0))
    setCurrentMeter('')
    setMeterNote('')
  }

  async function saveMeter() {
    if (!previousMeter || numericMeter === null || numericMeter <= numericPreviousMeter) {
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSaveMeter(customer.id, numericPreviousMeter, numericMeter, total, submittedAt, billingPeriod)
      setPage('field-payments')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Meter gagal disimpan, silakan coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        subtitle="Catat pemakaian air pelanggan untuk membuat tagihan bulan berjalan."
        title="Input Meter"
      />

      <section className="panel stacked-panel meter-search-panel">
        <label>
          Cari Pelanggan
          <select className={hasRecordedThisMonth ? 'input-select recorded-select' : 'input-select'} onChange={(event) => changeCustomer(event.target.value)} value={customer.id}>
            {customers.map((item) => (
              <option disabled={item.meterHistory?.some((reading) => reading.period === billingPeriod)} key={item.id} value={item.id}>
                {item.name} - {item.kampung}{item.meterHistory?.some((reading) => reading.period === billingPeriod) ? ' (sudah input)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bulan Tagihan
          <select className="input-select" onChange={(event) => setBillingPeriod(event.target.value)} value={billingPeriod}>
            {periodOptions.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
          </select>
        </label>
        {hasRecordedThisMonth && <p className="helper danger-helper">Pelanggan ini sudah diinput bulan ini, pilih pelanggan lain yang belum dicatat.</p>}
      </section>

      <section className="panel customer-strip field-meter-strip">
        <div className="avatar bright-avatar field-meter-avatar">{customer.name.slice(0, 2).toUpperCase()}</div>
        <div className="field-meter-main-info">
          <small>Informasi Pelanggan</small>
          <h2>{customer.name}</h2>
          <p><span>{customer.id}</span><span>{customer.address}</span><Badge status="Aktif" /></p>
        </div>
          <div className="meter-info-grid">
            <span><small>Wilayah</small><b>{customer.rt} / {customer.kampung}</b></span>
            <span><small>Meter Terakhir</small><b>{numericPreviousMeter} m3</b></span>
            <span><small>Tanggal Input Otomatis</small><b>{submittedAt}</b></span>
          </div>
        </section>

      <div className="field-meter-grid">
        <section className="panel meter-input-panel">
          <h3>Catatan Meter Air</h3>
          <label>
            Meter Bulan Lalu (m3)
            <input
              disabled={!isFirstReading}
              min={0}
              onChange={(event) => setPreviousMeter(event.target.value)}
              type="number"
              placeholder={isFirstReading ? 'Masukkan meter awal pelanggan' : undefined}
              value={previousMeter}
            />
            <small>{isFirstReading ? 'Input pertama: default 0, ubah jika meter awal pelanggan berbeda.' : 'Diambil otomatis dari meter akhir periode sebelumnya.'}</small>
          </label>
          <label>
            Meter Saat Ini (m3)
            <input
              min={numericPreviousMeter}
              onChange={(event) => setCurrentMeter(event.target.value)}
              type="number"
              placeholder="Masukkan angka meter saat ini"
              value={currentMeter}
            />
          </label>
          <label>
            Catatan Meter Bulan Lalu
            <textarea onChange={(event) => setMeterNote(event.target.value)} placeholder="Tambahkan catatan jika meter bulan lalu ada catatan khusus." value={meterNote} />
          </label>
          <p className="helper">Pemakaian: <strong>{usage} m3</strong></p>
        </section>

        <section className="panel invoice-summary-panel">
          <h3><Icon name="receipt" />Ringkasan Tagihan</h3>
          <div className="invoice-summary-grid">
            <span><small>Meter Lalu</small><b>{numericPreviousMeter} m3</b></span>
            <span><small>Meter Ini</small><b>{numericMeter === null ? '-' : `${numericMeter} m3`}</b></span>
            <span><small>Total Pemakaian</small><b>{usage} m3</b></span>
            <span><small>Bulan Tagihan</small><b>{billingMonth}</b></span>
            <span><small>Tarif Air</small><b>{formatRupiah(billingSettings.waterRate)} / m3</b></span>
            <span><small>Biaya Admin</small><b>{formatRupiah(billingSettings.adminFee)}</b></span>
          </div>
          <div className="total-box">
            <span>Total Tagihan</span>
            <strong>{formatRupiah(total)}</strong>
          </div>
          <div className="button-group align-right">
            <button className="ghost small" onClick={() => setPage('field-dashboard')}>Batal</button>
            <button className="primary small" disabled={isSaving || hasRecordedThisMonth || numericMeter === null || numericMeter <= numericPreviousMeter} onClick={() => void saveMeter()}>
              <Icon name="wallet" />
              {isSaving ? 'Menyimpan...' : 'Simpan & Buat Tagihan'}
            </button>
          </div>
          {saveError && <p className="error-panel">{saveError}</p>}
        </section>
      </div>
    </>
  )
}

function buildPeriodOptions(activePeriod?: string) {
  const baseDate = activePeriod && /^\d{4}-\d{2}$/.test(activePeriod)
    ? new Date(`${activePeriod}-01T00:00:00`)
    : new Date()

  // Allow catching up on missed months (e.g. a new customer's backlog) as
  // well as pre-billing the next period, instead of locking petugas to the
  // single active month.
  const monthsBack = 24
  const monthsForward = 1

  return Array.from({ length: monthsBack + monthsForward + 1 }, (_, index) => index - monthsBack).map((offset) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1)
    const value = formatPeriodValue(date)

    return { label: formatPeriodLabel(value), value }
  })
}

function formatPeriodValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, (month || 1) - 1, 1)

  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date)
}
