import { useDeferredValue, useEffect, useState, type FormEvent } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import type { Customer, SetPage } from '../../../types'
import { areaUnits } from '../data/regionData'
import { createAdminCustomer, createWilayah, deleteAdminCustomer, getAdminCustomerPage, getAdminRegions, updateAdminCustomer, type ApiRegion } from '../services/adminApi'

type CustomersPageProps = {
  customers: Customer[]
  notify: (message: string) => void
  onAddCustomer: (customer: Customer) => void
  onDeleteCustomer: (customerId: string) => void
  onUpdateCustomer: (customer: Customer) => void
  setPage: SetPage
}

type CustomerForm = {
  id: string
  name: string
  address: string
  area: string
  dusunId?: number
  rtId?: number
  status: Customer['status']
}

const defaultForm: CustomerForm = {
  id: '',
  name: '',
  address: '',
  area: '',
  dusunId: undefined,
  rtId: undefined,
  status: 'Aktif' as Customer['status'],
}

export function CustomersPage({ notify, onAddCustomer, onDeleteCustomer, onUpdateCustomer, setPage }: CustomersPageProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ dusun: '', status: '' })
  const [draftFilters, setDraftFilters] = useState(filters)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [regions, setRegions] = useState<ApiRegion[]>([])
  const [pageNumber, setPageNumber] = useState(1)
  const [pageCustomers, setPageCustomers] = useState<Customer[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [summary, setSummary] = useState({ active: 0, attention: 0, total: 0 })
  const [reloadNonce, setReloadNonce] = useState(0)
  const [isWilayahModalOpen, setIsWilayahModalOpen] = useState(false)
  const [wilayahForm, setWilayahForm] = useState({ dusun: '', kampung: '', rt: '', rw: '' })
  const [isSavingWilayah, setIsSavingWilayah] = useState(false)
  const pageSize = 15
  const deferredQuery = useDeferredValue(query)
  const regionSource = regions.length
    ? regions
    : areaUnits.map((unit, index) => ({
      dusun: unit.dusun,
      households: unit.households,
      id: index + 1,
      is_assigned: false,
      kampung: unit.kampung,
      name: unit.rt,
      rt: unit.rt,
      rw: unit.rw,
    } satisfies ApiRegion))
  const paginatedCustomers = pageCustomers
  const selectedDusun = form.area && !form.area.includes('/') ? form.area : parseCustomerArea(form.area).dusun
  const selectedRw = form.address.match(/^\[rw:([^\]]+)\]/)?.[1] ?? ''
  const selectedDusunRegions = regionSource.filter((region) => region.dusun === selectedDusun)
  const selectedRwOptions = Array.from(new Set(selectedDusunRegions.map((region) => region.rw)))
  const selectedRtRegions = selectedRw ? selectedDusunRegions.filter((region) => region.rw === selectedRw) : selectedDusunRegions

  useEffect(() => {
    const controller = new AbortController()

    async function loadRegions() {
      try {
        setRegions(await getAdminRegions(controller.signal))
        setApiError(null)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setApiError(error instanceof Error ? error.message : 'Data pelanggan dari backend belum bisa dimuat.')
      }
    }

    void loadRegions()

    return () => controller.abort()
  }, [reloadNonce])

  useEffect(() => {
    const controller = new AbortController()
    const selectedRegion = regions.find((region) => region.dusun === filters.dusun)
    void getAdminCustomerPage({
      dusunId: selectedRegion?.dusunId ?? selectedRegion?.dusun_id,
      page: pageNumber,
      perPage: pageSize,
      search: deferredQuery,
      status: filters.status as Customer['status'] | '',
    }, controller.signal).then((result) => {
      setPageCustomers(result.data)
      setTotalCustomers(result.total)
      setSummary(result.summary)
      setApiError(null)
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setApiError(error instanceof Error ? error.message : 'Data pelanggan gagal dimuat.')
    })

    return () => controller.abort()
  }, [deferredQuery, filters, pageNumber, regions, reloadNonce])

  function updateField<K extends keyof CustomerForm>(field: K, value: CustomerForm[K]) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.dusunId || !selectedRw || !form.rtId) {
      notify('Pilih Dusun, RW, dan RT/Kampung terlebih dahulu sebelum menyimpan data pelanggan.')
      return
    }

    setIsSaving(true)
    setApiError(null)

    const nextCustomer = {
      id: form.id.trim() || `PAM-${String(summary.total + 1).padStart(3, '0')}`,
      name: form.name.trim(),
      address: form.address.replace(/^\[rw:[^\]]+\]\s*/, '').trim(),
      area: formatCustomerAreaFromForm(form, regionSource),
      dusunId: form.dusunId,
      rtId: form.rtId,
      status: form.status,
    }

    try {
      const savedCustomer = editingCustomerId
        ? await updateAdminCustomer(nextCustomer)
        : await createAdminCustomer(nextCustomer)

      if (editingCustomerId) {
        onUpdateCustomer(savedCustomer)
      } else {
        onAddCustomer(savedCustomer)
      }

      setForm(defaultForm)
      setEditingCustomerId(null)
      setIsAddModalOpen(false)
      setReloadNonce((value) => value + 1)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Pelanggan belum berhasil disimpan ke backend.')
    } finally {
      setIsSaving(false)
    }
  }

  async function submitWilayah(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!wilayahForm.dusun.trim() || !wilayahForm.rw.trim() || !wilayahForm.rt.trim() || !wilayahForm.kampung.trim()) {
      notify('Lengkapi Dusun, RW, RT, dan Kampung terlebih dahulu.')
      return
    }

    setIsSavingWilayah(true)
    try {
      await createWilayah(wilayahForm)
      notify('Data wilayah berhasil ditambahkan.')
      setWilayahForm({ dusun: '', kampung: '', rt: '', rw: '' })
      setIsWilayahModalOpen(false)
      setReloadNonce((value) => value + 1)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Data wilayah gagal disimpan.')
    } finally {
      setIsSavingWilayah(false)
    }
  }

  async function removeCustomer(customer: Customer) {
    setApiError(null)

    try {
      await deleteAdminCustomer(customer.id)
      onDeleteCustomer(customer.id)
      setReloadNonce((value) => value + 1)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Pelanggan belum berhasil dihapus dari backend.')
    }
  }

  function openEditCustomer(customer: Customer) {
    const area = parseCustomerArea(customer.area)
    setEditingCustomerId(customer.id)
    setForm({
      ...customer,
      address: `[rw:${area.rw}] ${customer.address.replace(/^\[rw:[^\]]+\]\s*/, '')}`,
      dusunId: customer.dusunId,
      rtId: customer.rtId,
    })
    setIsAddModalOpen(true)
  }

  return (
    <>
      <PageHeader
        action={
          <div className="button-group">
            <button className="ghost" onClick={() => setIsWilayahModalOpen(true)} type="button">
              <Icon name="map" />
              Pengaturan Wilayah
            </button>
            <button className="primary" onClick={() => { setEditingCustomerId(null); setForm(defaultForm); setIsAddModalOpen(true) }}>
              <Icon name="plus" />
              Tambah Pelanggan
            </button>
          </div>
        }
        subtitle="Kelola data pelanggan PAMSIMAS"
        title="Data Pelanggan"
      />
      <section className="stat-grid three compact-summary-cards">
        <StatCard stat={{ label: 'Total Pelanggan', value: String(summary.total), tone: 'blue' }} />
        <StatCard stat={{ label: 'Pelanggan Aktif', value: String(summary.active), tone: 'green' }} />
        <StatCard stat={{ label: 'Perlu Perhatian', value: String(summary.attention), tone: 'orange' }} />
      </section>
      {apiError && (
        <section className="error-panel compact-error">
          <strong>Backend belum sinkron sempurna</strong>
          <p>{apiError}</p>
        </section>
      )}
      <section className="filter-bar compact-filter">
        <label className="search-field full-search">
          <Icon name="search" />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Cari ID, nama, alamat, atau wilayah..." value={query} />
        </label>
        <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, dusun: event.target.value })} value={draftFilters.dusun}>
          <option value="">Semua Dusun</option>
          {Array.from(new Set((regions.length ? regions : areaUnits).map((unit) => unit.dusun))).map((dusun) => <option key={dusun}>{dusun}</option>)}
        </select>
        <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })} value={draftFilters.status}>
          <option value="">Semua Status</option>
          <option>Aktif</option>
          <option>Menunggak</option>
          <option>Nonaktif</option>
        </select>
        <button className="primary small" onClick={() => { setFilters(draftFilters); setPageNumber(1) }}>Terapkan Filter</button>
      </section>
      <TableCard
        footer={`Menampilkan ${paginatedCustomers.length} dari ${totalCustomers} pelanggan`}
        pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: totalCustomers }}
      >
        <thead>
          <tr>
            <th>ID Pelanggan</th>
            <th>Nama</th>
            <th>Dusun</th>
            <th>RT</th>
            <th>Kampung</th>
            <th>Status</th>
            <th>Aksi</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {paginatedCustomers.map((customer) => {
            const area = parseCustomerArea(customer.area)

            return (
              <tr key={customer.id}>
                <td><strong>{customer.id}</strong></td>
                <td>{customer.name}</td>
                <td>{area.dusun}</td>
                <td>{area.rt}</td>
                <td>{area.kampung}</td>
                <td><Badge status={customer.status} /></td>
                <td className="icon-action-cell">
                  <button aria-label={`Edit ${customer.name}`} className="icon-btn table-icon-action" onClick={() => openEditCustomer(customer)} type="button">
                    <Icon name="edit" />
                  </button>
                  <button aria-label={`Hapus ${customer.name}`} className="icon-btn table-icon-action danger-icon-action" onClick={() => void removeCustomer(customer)} type="button">
                    <Icon name="trash" />
                  </button>
                </td>
                <td>
                  <button
                    className="link detail-link"
                    onClick={() => {
                      sessionStorage.setItem('pamsimas-selected-customer', JSON.stringify(customer))
                      setPage('customer-detail')
                    }}
                  >
                    Lihat Detail
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableCard>
      {isAddModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal customer-modal" onSubmit={submitCustomer}>
            <div className="modal-head">
              <div>
                <h2>{editingCustomerId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h2>
                <p>{editingCustomerId ? 'Masukkan data pelanggan PAMSIMAS.' : 'ID pelanggan dibuat otomatis secara berurutan setelah disimpan.'}</p>
              </div>
              <button className="icon-btn" onClick={() => { setIsAddModalOpen(false); setEditingCustomerId(null); setForm(defaultForm) }} type="button">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-grid">
              {editingCustomerId && (
                <label>
                  ID Pelanggan
                  <input disabled value={form.id} />
                </label>
              )}
              <label>
                Nama
                <input
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Nama lengkap pelanggan"
                  required
                  value={form.name}
                />
              </label>
              <label>
                Alamat Detail
                <input
                  onChange={(event) => updateField('address', `${selectedRw ? `[rw:${selectedRw}] ` : ''}${event.target.value}`)}
                  placeholder="Nomor rumah / patokan alamat"
                  required
                  value={form.address.replace(/^\[rw:[^\]]+\]\s*/, '')}
                />
              </label>
              <label>
                Dusun
                <select
                  className="input-select"
                  onChange={(event) => {
                    setForm((currentForm) => ({
                      ...currentForm,
                      address: currentForm.address.replace(/^\[rw:[^\]]+\]\s*/, ''),
                      area: event.target.value,
                      dusunId: undefined,
                      rtId: undefined,
                    }))
                  }}
                  required
                  value={selectedDusun === '-' ? '' : selectedDusun}
                >
                  <option value="">Pilih Dusun</option>
                  {Array.from(new Set(regionSource.map((region) => region.dusun))).map((dusun) => <option key={dusun}>{dusun}</option>)}
                </select>
              </label>
              <label>
                RW
                <select
                  className="input-select"
                  disabled={!selectedDusun || selectedDusun === '-'}
                  onChange={(event) => {
                    setForm((currentForm) => ({
                      ...currentForm,
                      address: `[rw:${event.target.value}] ${currentForm.address.replace(/^\[rw:[^\]]+\]\s*/, '')}`,
                      rtId: undefined,
                    }))
                  }}
                  required
                  value={selectedRw}
                >
                  <option value="">Pilih RW</option>
                  {selectedRwOptions.map((rw) => <option key={rw}>{rw}</option>)}
                </select>
              </label>
              <label>
                RT / Kampung
                <select
                  className="input-select"
                  disabled={!selectedRw}
                  onChange={(event) => {
                    const region = regionSource.find((item) => item.id === Number(event.target.value))
                    updateField('rtId', region?.id)
                    updateField('dusunId', region ? getDusunIdForRegion(region, regionSource) : undefined)
                    updateField('area', region ? formatRegionLabel(region) : selectedDusun)
                  }}
                  required
                  value={form.rtId ?? ''}
                >
                  <option value="">Pilih RT / Kampung</option>
                  {selectedRtRegions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.rt} - {region.kampung} - {region.households} rumah
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  className="input-select"
                  onChange={(event) => updateField('status', event.target.value as Customer['status'])}
                  value={form.status}
                >
                  <option>Aktif</option>
                  <option>Menunggak</option>
                  <option>Nonaktif</option>
                </select>
              </label>
            </div>
            <div className="modal-foot">
              <span className="helper">Data pelanggan akan disimpan ke Laravel API. Jika API mati, pesan error akan muncul di halaman.</span>
              <button className="ghost" onClick={() => { setIsAddModalOpen(false); setEditingCustomerId(null); setForm(defaultForm) }} type="button">
                Batal
              </button>
              <button className="primary" disabled={isSaving} type="submit">
                {isSaving ? 'Menyimpan...' : 'Simpan Pelanggan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isWilayahModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal" onSubmit={submitWilayah}>
            <div className="modal-head">
              <div>
                <h2>Pengaturan Wilayah</h2>
                <p>Tambahkan Dusun, RW, RT, dan Kampung baru untuk dipakai pada form Data Pelanggan.</p>
              </div>
              <button className="icon-btn" onClick={() => setIsWilayahModalOpen(false)} type="button">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-grid">
              <label>
                Dusun
                <input
                  list="wilayah-dusun-options"
                  onChange={(event) => setWilayahForm((current) => ({ ...current, dusun: event.target.value }))}
                  placeholder="Contoh: Dusun 1"
                  required
                  value={wilayahForm.dusun}
                />
                <datalist id="wilayah-dusun-options">
                  {Array.from(new Set(regionSource.map((region) => region.dusun))).map((dusun) => <option key={dusun} value={dusun} />)}
                </datalist>
              </label>
              <label>
                RW
                <input
                  onChange={(event) => setWilayahForm((current) => ({ ...current, rw: event.target.value }))}
                  placeholder="Contoh: RW 06"
                  required
                  value={wilayahForm.rw}
                />
              </label>
              <label>
                RT
                <input
                  onChange={(event) => setWilayahForm((current) => ({ ...current, rt: event.target.value }))}
                  placeholder="Contoh: RT 01"
                  required
                  value={wilayahForm.rt}
                />
              </label>
              <label>
                Kampung
                <input
                  onChange={(event) => setWilayahForm((current) => ({ ...current, kampung: event.target.value }))}
                  placeholder="Nama kampung"
                  required
                  value={wilayahForm.kampung}
                />
              </label>
            </div>
            <div className="modal-foot">
              <span className="helper">Jika Dusun atau RW sudah ada, cukup ketik nama yang sama persis agar tidak membuat data ganda.</span>
              <button className="ghost" onClick={() => setIsWilayahModalOpen(false)} type="button">
                Batal
              </button>
              <button className="primary" disabled={isSavingWilayah} type="submit">
                {isSavingWilayah ? 'Menyimpan...' : 'Simpan Wilayah'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function parseCustomerArea(area: string) {
  const [location = '', kampung = '-'] = area.split(' - ')
  const parts = location.split('/').map((part) => part.trim())

  return {
    dusun: parts[0] || '-',
    kampung: kampung || '-',
    rt: parts.find((part) => part.toUpperCase().startsWith('RT')) ?? '-',
    rw: parts.find((part) => part.toUpperCase().startsWith('RW')) ?? '',
  }
}

function formatRegionLabel(region: ApiRegion) {
  return `${region.dusun} / ${region.rw} / ${region.rt} - ${region.kampung}`
}

function formatCustomerAreaFromForm(form: CustomerForm, regions: ApiRegion[]) {
  const region = regions.find((item) => item.id === form.rtId)

  if (!region) {
    return form.area.trim()
  }

  return formatRegionLabel(region)
}

function getDusunIdForRegion(region: ApiRegion, regions: ApiRegion[]) {
  const sameDusun = regions.find((item) => item.dusun === region.dusun)

  return sameDusun?.dusunId ?? sameDusun?.dusun_id ?? region.dusunId ?? region.dusun_id ?? undefined
}
