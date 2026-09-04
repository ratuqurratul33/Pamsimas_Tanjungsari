import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import type { SetPage } from '../../../types'
import type { PublicMapSettings } from '../../publik/data/publicData'
import { PublicMapGuideSection } from '../../publik/components/PublicMapGuideSection'

export function PublicMapSettingsPage({
  mapSettings,
  notify,
  onSave,
  setPage,
}: {
  mapSettings: PublicMapSettings
  notify: (message: string) => void
  onSave: (settings: PublicMapSettings, imageFile?: File | null) => Promise<void>
  setPage: SetPage
}) {
  const [draft, setDraftState] = useState(mapSettings)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // Same rationale as PamsimasProfilePage: keep adopting fresh prop data
  // until the admin edits, then stop so a background refresh can't wipe out
  // unsaved changes.
  const isEditing = useRef(false)
  const setDraft: typeof setDraftState = (value) => { isEditing.current = true; setDraftState(value) }

  useEffect(() => {
    if (!isEditing.current) setDraftState(mapSettings)
  }, [mapSettings])

  return (
    <>
      <button className="back-link" onClick={() => setPage('public-home')} type="button">
        <Icon name="back" />
        Kembali ke Halaman Publik
      </button>
      <PageHeader
        action={
          <div className="button-group">
            <button
              className="ghost"
              onClick={() => {
                isEditing.current = false
                setDraftState(mapSettings)
                setPendingImageFile(null)
                notify('Perubahan yang belum disimpan berhasil dihapus.')
              }}
              type="button"
            >
              Hapus Perubahan
            </button>
            <button
              className="primary"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true)
                try {
                  await onSave(draft, pendingImageFile)
                  setPendingImageFile(null)
                  notify('Pengaturan publik berhasil disimpan.')
                } catch (error) {
                  notify(error instanceof Error ? error.message : 'Pengaturan publik gagal disimpan.')
                } finally {
                  setIsSaving(false)
                }
              }}
              type="button"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        }
        subtitle="Kelola gambar peta publik serta panduan dan kontak WhatsApp yang digunakan warga."
        title="Pengaturan Peta Jaringan Publik"
      />

      <div className="public-map-admin-page">
        <section className="panel map-preview-admin">
          <div className="map-preview-admin__header">
            <h3>Tampilan Publik versi Admin</h3>
            <p>Bagian ini menampilkan hasil sebelum disimpan dan dipublikasikan.</p>
          </div>
          <PublicMapGuideSection mapSettings={draft} previewMode />
        </section>

        <div className="detail-grid public-map-admin-grid">
          <section className="panel">
            <div className="panel-title">
              <h3 className="strong-section-title">Gambar Peta Publik</h3>
              <Icon name="map" />
            </div>
            <div className="form-grid settings-form public-map-settings-form">
              <label>
                Judul Section
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label>
                Deskripsi Section
                <textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
              <label>
                Deskripsi Cakupan Layanan
                <textarea rows={3} value={draft.coverage} onChange={(event) => setDraft({ ...draft, coverage: event.target.value })} />
              </label>
              <label>
                Upload Gambar Peta
                <input
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  setPendingImageFile(file)

                  const reader = new FileReader()
                    reader.onload = () => {
                      const uploadedImage = reader.result

                      if (typeof uploadedImage === 'string') {
                        setDraft((current) => ({ ...current, image: uploadedImage }))
                      }
                    }
                    reader.readAsDataURL(file)
                  }}
                  type="file"
                />
              </label>
              <label>
                Catatan Bawah Peta
                <textarea rows={3} value={draft.mapNote} onChange={(event) => setDraft({ ...draft, mapNote: event.target.value })} />
              </label>
            </div>
            <div className="button-group">
              <button
                className="ghost"
                onClick={() => {
                  setDraft((current) => ({ ...current, image: mapSettings.image }))
                  setPendingImageFile(null)
                }}
                type="button"
              >
                Hapus Perubahan Gambar
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h3>Panduan & Kontak Publik</h3>
              <Icon name="phone" />
            </div>
            <div className="form-grid settings-form public-map-settings-form">
              <label>
                Judul Panduan
                <input value={draft.guideTitle} onChange={(event) => setDraft({ ...draft, guideTitle: event.target.value })} />
              </label>
              <label>
                Deskripsi Panduan
                <textarea rows={3} value={draft.guideDescription} onChange={(event) => setDraft({ ...draft, guideDescription: event.target.value })} />
              </label>
              <label>
                Teks Kontak
                <input value={draft.contactLabel} onChange={(event) => setDraft({ ...draft, contactLabel: event.target.value })} />
              </label>
              <label>
                Nomor / Link WhatsApp
                <input value={draft.contactWhatsapp} onChange={(event) => setDraft({ ...draft, contactWhatsapp: event.target.value })} />
              </label>
            </div>
            <div className="public-map-guide-editor">
              <div className="public-map-guide-editor__head">
                <div>
                  <h4>Langkah Panduan Bernomor</h4>
                  <p>Setiap langkah akan tampil berurutan pada halaman publik.</p>
                </div>
                <button
                  className="ghost small"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      guideSteps: [...current.guideSteps, ''],
                    }))
                  }
                  type="button"
                >
                  Tambah Langkah
                </button>
              </div>
              <div className="public-map-guide-editor__list">
                {draft.guideSteps.map((step, index) => (
                  <div className="public-map-guide-editor__item" key={`guide-step-${index + 1}`}>
                    <span className="public-map-guide-editor__number">{index + 1}</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          guideSteps: current.guideSteps.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                        }))
                      }
                      placeholder={`Langkah ${index + 1}`}
                      value={step}
                    />
                    <button
                      className="icon-btn"
                      disabled={draft.guideSteps.length <= 1}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          guideSteps: current.guideSteps.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      type="button"
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
