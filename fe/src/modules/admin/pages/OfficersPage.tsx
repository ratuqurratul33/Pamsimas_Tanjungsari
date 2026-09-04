import { useEffect, useEffectEvent, useMemo, useState, type FormEvent } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { PhotoCropModal } from '../../../components/PhotoCropModal'
import { PhotoPicker } from '../../../components/PhotoPicker'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import type { Officer, SetPage } from '../../../types'
import { areaUnits } from '../data/regionData'
import {
  createAdminOfficer,
  getAdminOfficers,
  getAdminRegions,
  updateAdminOfficer,
  type ApiRegion,
} from '../services/adminApi'
import { buildPaginationSummary } from '../../../utils/pagination'

type OfficersPageProps = {
  onAddOfficer: (officer: Officer) => void
  officers: Officer[]
  onSelectOfficer: (officerId: string) => void
  setPage: SetPage
}

type OfficerForm = {
  backendId?: number
  id: string
  name: string
  phone: string
  photoUrl?: string
  regionIds: number[]
  status: Officer['status']
  username: string
}

const defaultOfficerForm: OfficerForm = {
  id: '',
  name: '',
  phone: '',
  regionIds: [],
  status: 'Aktif',
  username: '',
}

export function OfficersPage({ officers, onAddOfficer, onSelectOfficer, setPage }: OfficersPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOfficerId, setEditingOfficerId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultOfficerForm)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ dusun: '', status: '' })
  const [draftFilters, setDraftFilters] = useState(filters)
  const [regions, setRegions] = useState<ApiRegion[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [photoDraftUrl, setPhotoDraftUrl] = useState<string | null>(null)
  const [croppedPhoto, setCroppedPhoto] = useState<Blob | null>(null)
  const [selectedDusun, setSelectedDusun] = useState('')
  const [selectedRw, setSelectedRw] = useState('')
  const [selectedRtId, setSelectedRtId] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const pageSize = 15
  const regionSource = regions.length
    ? regions.filter((region) => region.households > 0 || form.regionIds.includes(region.id))
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
  const availableDusun = Array.from(new Set(regionSource.map((region) => region.dusun)))
  const selectedRegions = regionSource.filter((region) => form.regionIds.includes(region.id))
  const assignedCustomers = selectedRegions.reduce((total, region) => total + region.households, 0)
  const assignedRegionIds = useMemo(() => collectAssignedRegionIds(officers, editingOfficerId), [editingOfficerId, officers])

  const filteredOfficers = useMemo(() => {
    const loweredQuery = query.toLowerCase()

    return officers.filter((officer) => {
      const officerAreas = officer.areas?.length ? officer.areas : [officer.area]
      const queryMatches = [officer.name, officer.username, officer.phone, ...officerAreas].join(' ').toLowerCase().includes(loweredQuery)
      const dusunMatches = filters.dusun ? officerAreas.some((area) => area.includes(filters.dusun)) : true
      const statusMatches = filters.status ? officer.status === filters.status : true

      return queryMatches && dusunMatches && statusMatches
    })
  }, [filters, officers, query])
  const paginatedOfficers = filteredOfficers.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
  const selectedDusunRegions = regionSource.filter((region) => region.dusun === selectedDusun)
  const availableRw = Array.from(new Set(selectedDusunRegions.map((region) => region.rw)))
  const selectedRwRegions = selectedRw ? selectedDusunRegions.filter((region) => region.rw === selectedRw) : []

  const addLoadedOfficer = useEffectEvent(onAddOfficer)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOfficers() {
      try {
        const [apiRegions, apiOfficers] = await Promise.all([
          getAdminRegions(controller.signal),
          getAdminOfficers(controller.signal),
        ])

        setRegions(apiRegions)
        apiOfficers.forEach(addLoadedOfficer)
        setApiError(null)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setApiError(error instanceof Error ? error.message : 'Data petugas dari backend belum bisa dimuat.')
      }
    }

    void loadOfficers()

    return () => controller.abort()
  }, [])

  function openCreateModal() {
    setIsModalOpen(true)
    setEditingOfficerId(null)
    setCroppedPhoto(null)
    setPhotoDraftUrl(null)
    setForm({ ...defaultOfficerForm, regionIds: [] })
    setSelectedDusun('')
    setSelectedRw('')
    setSelectedRtId('')
  }

  function openEditModal(officer: Officer) {
    setIsModalOpen(true)
    setEditingOfficerId(officer.id)
    setCroppedPhoto(null)
    setPhotoDraftUrl(null)
    setForm({
      backendId: officer.backendId,
      id: officer.id,
      name: officer.name,
      phone: officer.phone,
      photoUrl: officer.photoUrl,
      regionIds: officer.regionIds ?? [],
      status: officer.status,
      username: officer.username,
    })
    setSelectedDusun('')
    setSelectedRw('')
    setSelectedRtId('')
  }

  function updateField<K extends keyof OfficerForm>(field: K, value: OfficerForm[K]) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function toggleRegion(region: ApiRegion) {
    if (assignedRegionIds.has(region.id) && !form.regionIds.includes(region.id)) {
      return
    }

    setForm((currentForm) => {
      const exists = currentForm.regionIds.includes(region.id)
      const nextRegionIds = exists
        ? currentForm.regionIds.filter((regionId) => regionId !== region.id)
        : [...currentForm.regionIds, region.id]

      return { ...currentForm, regionIds: nextRegionIds }
    })
  }

  function addSelectedRegion() {
    const region = regionSource.find((item) => item.id === Number(selectedRtId))

    if (!region) {
      return
    }

    toggleRegion(region)
    setSelectedRtId('')
  }

  async function submitOfficer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setApiError(null)

    const nextOfficer: Officer = {
      area: selectedRegions.map(formatRegionArea)[0] ?? '-',
      areas: selectedRegions.map(formatRegionArea),
      backendId: form.backendId,
      customers: assignedCustomers,
      dusun: Array.from(new Set(selectedRegions.map((region) => region.dusun))).join(', '),
      id: form.id,
      kampung: selectedRegions.map((region) => region.kampung).join(', '),
      name: form.name,
      phone: form.phone,
      photoUrl: form.photoUrl,
      regionIds: form.regionIds,
      rt: selectedRegions.map((region) => region.rt).join(', '),
      rw: Array.from(new Set(selectedRegions.map((region) => region.rw))).join(', '),
      status: form.status,
      username: form.username,
    }

    try {
      const savedOfficer = editingOfficerId
        ? await updateAdminOfficer(nextOfficer, croppedPhoto)
        : await createAdminOfficer(nextOfficer, croppedPhoto)

      onAddOfficer(savedOfficer)
      setEditingOfficerId(null)
      setIsModalOpen(false)
      setForm(defaultOfficerForm)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Data petugas belum berhasil disimpan ke backend.')
    } finally {
      setIsSaving(false)
    }
  }

  function handlePhotoSelected(file?: File) {
    if (!file) {
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setApiError('Ukuran foto petugas maksimal 2MB.')
      return
    }

    setPhotoDraftUrl(URL.createObjectURL(file))
  }

  return (
    <>
      <PageHeader
        action={<button className="primary" onClick={openCreateModal}><Icon name="plus" />Tambah Petugas</button>}
        subtitle="Kelola akun petugas, wilayah tugas, dan pelanggan yang otomatis masuk ke akun petugas."
        title="Data Petugas"
      />
      <section className="stat-grid three compact-summary-cards tiny-summary-cards">
        <StatCard stat={{ label: 'Total Petugas', value: String(officers.length), tone: 'blue' }} />
        <StatCard stat={{ label: 'Petugas Aktif', value: String(officers.filter((officer) => officer.status === 'Aktif').length), tone: 'green' }} />
        <StatCard stat={{ label: 'Wilayah Tugas', value: String(regionSource.length), tone: 'orange' }} />
      </section>
      {apiError && (
        <section className="error-panel compact-error">
          <strong>Backend petugas belum sinkron sempurna</strong>
          <p>{apiError}</p>
        </section>
      )}
      <section className="filter-bar compact-filter">
        <label className="search-field full-search">
          <Icon name="search" />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Cari petugas, username, no. HP, dusun, RT, atau kampung..." value={query} />
        </label>
        <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, dusun: event.target.value })} value={draftFilters.dusun}>
          <option value="">Semua Dusun</option>
          {availableDusun.map((dusun) => <option key={dusun}>{dusun}</option>)}
        </select>
        <select className="input-select compact-select" onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })} value={draftFilters.status}>
          <option value="">Semua Status</option>
          <option>Aktif</option>
          <option>Nonaktif</option>
        </select>
        <button className="primary small" onClick={() => { setFilters(draftFilters); setPageNumber(1) }}>Terapkan Filter</button>
      </section>
      <TableCard
        className="officers-table"
        footer={buildPaginationSummary(pageNumber, pageSize, filteredOfficers.length, 'petugas')}
        pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: filteredOfficers.length }}
      >
        <thead>
          <tr><th>Petugas</th><th>Akun</th><th>Dusun</th><th>RW/RT</th><th>Kampung</th><th>Pelanggan</th><th>Status</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          {paginatedOfficers.map((officer) => (
            <tr key={officer.id}>
              <td>
                <div className="officer-mini">
                  {officer.photoUrl ? <img alt={officer.name} className="tiny-avatar image-avatar" src={officer.photoUrl} /> : <span className="avatar tiny-avatar">{officer.name.slice(0, 2).toUpperCase()}</span>}
                  <span><strong>{officer.name}</strong><small>ID: {officer.id}</small></span>
                </div>
              </td>
              <td>{officer.username}<small>Pass: nomor HP</small></td>
              <td>{officer.dusun || '-'}</td>
              <td>{officer.rw || '-'} / {officer.rt || '-'}</td>
              <td>{officer.kampung || '-'}</td>
              <td>{officer.customers} rumah</td>
              <td><Badge status={officer.status} /></td>
              <td className="action-cell officer-actions">
                <button className="link" onClick={() => openEditModal(officer)}>Edit</button>
                <button className="link" onClick={() => { onSelectOfficer(officer.id); setPage('officer-detail') }}>Detail</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal customer-modal" onSubmit={submitOfficer}>
            <div className="modal-head">
              <div>
                <h2>{editingOfficerId ? 'Edit Wilayah Petugas' : 'Tambah Petugas'}</h2>
                <p>Nomor HP adalah password aktif Petugas. Jika nomor diubah, password login ikut berubah.</p>
              </div>
              <button className="icon-btn" onClick={() => { setIsModalOpen(false); setEditingOfficerId(null); setForm(defaultOfficerForm) }} type="button">
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-grid officer-modal-grid">
              <label>Nama<input required onChange={(event) => updateField('name', event.target.value)} value={form.name} /></label>
              <label>Username<input required onChange={(event) => updateField('username', event.target.value)} value={form.username} /></label>
              <label>No. HP / Password Login<input required onChange={(event) => updateField('phone', event.target.value)} value={form.phone} /></label>
              <label>
                Status
                <select className="input-select" onChange={(event) => updateField('status', event.target.value as Officer['status'])} value={form.status}>
                  <option>Aktif</option>
                  <option>Nonaktif</option>
                </select>
              </label>
              <PhotoPicker
                hint="JPG/PNG, maks 2MB"
                id="officer-photo"
                label="Foto Petugas"
                onSelect={(file) => void handlePhotoSelected(file)}
                placeholder={form.name.slice(0, 2).toUpperCase() || 'PT'}
                previewSrc={form.photoUrl}
              />
              <div className="assignment-preview assignment-checklist">
                <b>Wilayah Penugasan</b>
                <div className="assignment-picker">
                  <label>
                    Dusun
                    <select className="input-select" onChange={(event) => { setSelectedDusun(event.target.value); setSelectedRw(''); setSelectedRtId('') }} value={selectedDusun}>
                      <option value="">Pilih Dusun</option>
                      {availableDusun.map((dusun) => <option key={dusun}>{dusun}</option>)}
                    </select>
                  </label>
                  <label>
                    RW
                    <select className="input-select" disabled={!selectedDusun} onChange={(event) => { setSelectedRw(event.target.value); setSelectedRtId('') }} value={selectedRw}>
                      <option value="">Pilih RW</option>
                      {availableRw.map((rw) => <option key={rw}>{rw}</option>)}
                    </select>
                  </label>
                  <label>
                    RT / Kampung
                    <select className="input-select" disabled={!selectedRw} onChange={(event) => setSelectedRtId(event.target.value)} value={selectedRtId}>
                      <option value="">Pilih RT / Kampung</option>
                      {selectedRwRegions.map((region) => {
                        const isTaken = assignedRegionIds.has(region.id) && !form.regionIds.includes(region.id)

                        return (
                          <option disabled={isTaken} key={region.id} value={region.id}>
                            {region.rt} - {region.kampung} - {isTaken ? 'sudah ditugaskan' : `${region.households} rumah`}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                  <button className="ghost small" disabled={!selectedRtId} onClick={addSelectedRegion} type="button">
                    <Icon name="plus" />
                    Tambahkan
                  </button>
                </div>
                <div className="selected-area-list">
                  {selectedRegions.length === 0 && <small>Belum ada wilayah dipilih.</small>}
                  {selectedRegions.map((region) => (
                    <span className="area-chip selected-area-chip" key={region.id}>
                      {region.dusun} / {region.rw} / {region.rt} - {region.kampung}
                      <button onClick={() => toggleRegion(region)} type="button">x</button>
                    </span>
                  ))}
                </div>
                <strong>Total otomatis: {assignedCustomers} rumah</strong>
              </div>
            </div>
            <div className="modal-foot">
              <span className="helper">Wilayah berwarna abu tidak bisa dipilih karena sudah ditugaskan ke petugas aktif lain.</span>
              <button className="ghost" onClick={() => { setIsModalOpen(false); setEditingOfficerId(null); setForm(defaultOfficerForm) }} type="button">Batal</button>
              <button className="primary" disabled={isSaving || form.regionIds.length === 0} type="submit">{isSaving ? 'Menyimpan...' : 'Simpan Petugas'}</button>
            </div>
          </form>
        </div>
      )}
      {photoDraftUrl && (
        <PhotoCropModal
          description="Geser foto petugas untuk atur posisi, scroll untuk perbesar/perkecil."
          imageUrl={photoDraftUrl}
          onApply={({ blob, dataUrl }) => {
            setCroppedPhoto(blob)
            updateField('photoUrl', dataUrl)
            setPhotoDraftUrl(null)
          }}
          onCancel={() => setPhotoDraftUrl(null)}
          title="Crop Foto Petugas"
        />
      )}
    </>
  )
}

function collectAssignedRegionIds(officers: Officer[], editingOfficerId: string | null) {
  const regionIds = new Set<number>()

  officers
    .filter((officer) => officer.status === 'Aktif' && officer.id !== editingOfficerId)
    .forEach((officer) => officer.regionIds?.forEach((regionId) => regionIds.add(regionId)))

  return regionIds
}

function formatRegionArea(region: ApiRegion) {
  return `${region.dusun} / ${region.rw} / ${region.rt} - ${region.kampung}`
}
