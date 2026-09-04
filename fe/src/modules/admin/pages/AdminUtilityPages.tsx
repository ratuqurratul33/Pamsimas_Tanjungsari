import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { PasswordInput } from '../../../components/PasswordInput'
import { PhotoCropModal } from '../../../components/PhotoCropModal'
import { PhotoPicker } from '../../../components/PhotoPicker'
import {
  type PublicMember,
  type PublicProfileContent,
  type PublicServiceCard,
} from '../../publik/data/publicData'
import {
  getAdminAccount,
  getSystemSettings,
  saveAdminAccount,
  saveSystemSettings,
  type PublicFaqItem,
  type SystemSettings,
} from '../services/adminApi'
import { requestOtp, resetPasswordWithOtp } from '../../../app/services/authService'

export function SystemSettingsPage({ notify }: { notify: (message: string) => void }) {
  const [settings, setSettings] = useState<SystemSettings>(() => getDefaultSystemSettings())
  const [isSaving, setIsSaving] = useState(false)
  const notifySettings = useEffectEvent(notify)
  const yearOptions = buildYearOptions(settings.activeYear)

  useEffect(() => {
    const controller = new AbortController()
    void getSystemSettings(controller.signal).then(setSettings).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      notifySettings(error instanceof Error ? error.message : 'Pengaturan gagal dimuat.')
    })
    return () => controller.abort()
  }, [])

  async function saveSettings(section: string) {
    setIsSaving(true)
    try {
      setSettings(await saveSystemSettings(settings))
      notify(`${section} berhasil disimpan.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : `${section} gagal disimpan.`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader subtitle="Konfigurasi periode tagihan, tarif air, biaya admin, dan denda keterlambatan." title="Pengaturan Sistem" />
      <section className="settings-grid admin-settings-grid">
        <article className="panel setting-card">
          <span className="stat-icon"><Icon name="receipt" /></span>
          <h3>Periode Tagihan</h3>
          <p className="setting-card-note">Default mengikuti bulan saat ini, tetapi Admin bisa memindahkan periode aktif jika siklus tagihan berubah.</p>
          <label>Bulan Aktif<select className="input-select" onChange={(event) => setSettings({ ...settings, activeMonth: event.target.value })} value={settings.activeMonth}>{MONTH_NAMES.map((month) => <option key={month}>{month}</option>)}</select></label>
          <label>Tahun<select className="input-select" onChange={(event) => setSettings({ ...settings, activeYear: event.target.value })} value={settings.activeYear}>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select></label>
          <label>Tanggal Jatuh Tempo<input onChange={(event) => setSettings({ ...settings, dueDate: event.target.value })} type="number" value={settings.dueDate} /></label>
          <button className="primary small" disabled={isSaving} onClick={() => void saveSettings('Periode tagihan')}>Simpan Periode</button>
        </article>
        <article className="panel setting-card">
          <span className="stat-icon"><Icon name="money" /></span>
          <h3>Tarif Air & Biaya</h3>
          <label>Tarif Air per m3<input onChange={(event) => setSettings({ ...settings, waterRate: event.target.value })} type="number" value={settings.waterRate} /></label>
          <label>Biaya Beban/Admin<input onChange={(event) => setSettings({ ...settings, adminFee: event.target.value })} type="number" value={settings.adminFee} /></label>
          <label>Denda Keterlambatan<input onChange={(event) => setSettings({ ...settings, lateFee: event.target.value })} type="number" value={settings.lateFee} /></label>
          <button className="primary small" disabled={isSaving} onClick={() => void saveSettings('Tarif air dan biaya admin')}>Simpan Tarif</button>
        </article>
        <article className="panel setting-card">
          <span className="stat-icon"><Icon name="receipt" /></span>
          <h3>Penandatangan Kwitansi</h3>
          <p className="setting-card-note">Nama dan jabatan ini tampil di blok tanda tangan pada kwitansi fisik yang dicetak. Kwitansi yang sudah dicetak sebelumnya tidak ikut berubah.</p>
          <label>Nama Penandatangan<input onChange={(event) => setSettings({ ...settings, signatoryName: event.target.value })} value={settings.signatoryName} /></label>
          <label>Jabatan<input onChange={(event) => setSettings({ ...settings, signatoryTitle: event.target.value })} value={settings.signatoryTitle} /></label>
          <button className="primary small" disabled={isSaving} onClick={() => void saveSettings('Penandatangan kwitansi')}>Simpan Penandatangan</button>
        </article>
      </section>
    </>
  )
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function getDefaultSystemSettings(): SystemSettings {
  const today = new Date()

  return {
    activeMonth: MONTH_NAMES[today.getMonth()] ?? 'Januari',
    activeYear: String(today.getFullYear()),
    adminFee: '5000',
    dueDate: '25',
    lateFee: '2000',
    signatoryName: 'ADE SOPIAN',
    signatoryTitle: 'Ketua KPSPAMS TIRTA SARI',
    waterRate: '3000',
  }
}

function buildYearOptions(activeYear: string) {
  const currentYear = new Date().getFullYear()
  const selectedYear = Number(activeYear)
  const years = new Set<number>()

  for (let year = currentYear - 1; year <= currentYear + 3; year += 1) {
    years.add(year)
  }
  if (Number.isFinite(selectedYear)) {
    years.add(selectedYear)
  }

  return Array.from(years).sort((left, right) => left - right).map(String)
}

function normalizeServiceCards(cards: PublicServiceCard[]) {
  const fallbackCards: PublicServiceCard[] = [
    { desc: 'Peta jalur, data pelanggan, dan catatan layanan ditampilkan agar warga mudah memahami kondisi PAMSIMAS.', icon: 'drop', title: 'Layanan air terbaca jelas' },
    { desc: 'Pencatatan tagihan, setoran, dan pengeluaran dibuat rapi supaya kas lebih mudah diawasi.', icon: 'money', title: 'Kas mudah diawasi' },
    { desc: 'Admin dan petugas memakai data yang sama sehingga proses lapangan lebih tertib.', icon: 'shield', title: 'Operasional lebih tertib' },
  ]

  return Array.from({ length: 3 }, (_, index) => cards[index] ?? fallbackCards[index])
}

export function PamsimasProfilePage({
  faqs: initialFaqs,
  members: initialMembers,
  notify,
  onSave,
  onSaveFaqs,
  profile: initialProfile,
  serviceCards: initialServiceCards,
}: {
  faqs: PublicFaqItem[]
  members: PublicMember[]
  notify: (message: string) => void
  onSave: (payload: { members: PublicMember[]; profile: PublicProfileContent; serviceCards: PublicServiceCard[] }) => Promise<void>
  onSaveFaqs: (faqs: PublicFaqItem[]) => Promise<void>
  profile: PublicProfileContent
  serviceCards: PublicServiceCard[]
}) {
  const [profile, setProfileState] = useState<PublicProfileContent>(initialProfile)
  const [whyCards, setWhyCardsState] = useState<PublicServiceCard[]>(() => normalizeServiceCards(initialServiceCards))
  const [members, setMembersState] = useState<PublicMember[]>(initialMembers)
  const [faqs, setFaqsState] = useState<PublicFaqItem[]>(initialFaqs)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [memberCrop, setMemberCrop] = useState<{ imageUrl: string; memberIndex: number } | null>(null)

  // Real API mode loads these props in asynchronously after mount (starting
  // from empty placeholders). The form should keep adopting fresh prop data
  // while the admin hasn't touched it yet (covering that placeholder -> real
  // data transition, and any refresh that happens before editing starts),
  // but must stop the moment the admin makes their first edit — otherwise an
  // unrelated realtime refresh handing the parent a new object reference
  // would wipe out unsaved changes mid-edit.
  const isEditing = useRef(false)
  const setProfile: typeof setProfileState = (value) => { isEditing.current = true; setProfileState(value) }
  const setWhyCards: typeof setWhyCardsState = (value) => { isEditing.current = true; setWhyCardsState(value) }
  const setMembers: typeof setMembersState = (value) => { isEditing.current = true; setMembersState(value) }
  const setFaqs: typeof setFaqsState = (value) => { isEditing.current = true; setFaqsState(value) }

  useEffect(() => {
    if (!isEditing.current) setProfileState(initialProfile)
  }, [initialProfile])

  useEffect(() => {
    if (!isEditing.current) setWhyCardsState(normalizeServiceCards(initialServiceCards))
  }, [initialServiceCards])

  useEffect(() => {
    if (!isEditing.current) setMembersState(initialMembers)
  }, [initialMembers])

  useEffect(() => {
    if (!isEditing.current) setFaqsState(initialFaqs)
  }, [initialFaqs])

  return (
    <>
      <PageHeader
        action={
          <button
            className="primary"
            onClick={async () => {
              setIsProfileSaving(true)
              try {
                await Promise.all([
                  onSave({ members, profile, serviceCards: normalizeServiceCards(whyCards) }),
                  onSaveFaqs(faqs),
                ])
                notify('Profil publik berhasil disimpan.')
              } catch (error) {
                notify(error instanceof Error ? error.message : 'Profil publik gagal disimpan.')
              } finally {
                setIsProfileSaving(false)
              }
            }}
            disabled={isProfileSaving}
            type="button"
          >
            {isProfileSaving ? 'Menyimpan...' : 'Simpan Profil Publik'}
          </button>
        }
        subtitle="Profil ini menjadi sumber informasi yang ditampilkan di website publik."
        title="Profile Publik"
      />
      <section className="profile-editor-layout profile-public-admin-layout profile-editor-single">
        <div className="profile-edit-panel profile-public-admin-form">
          <article className="panel">
            <div className="panel-title">
              <div>
                <h3>Section Profil Publik</h3>
                <p>Bagian ini mengatur teks utama yang tampil pada halaman profil publik dan footer.</p>
              </div>
            </div>
            <div className="form-grid two-columns profile-admin-form-grid">
              <label>
                Judul Halaman Publik
                <input onChange={(event) => setProfile({ ...profile, title: event.target.value })} value={profile.title} />
              </label>
              <label>
                Tahun Berdiri
                <input onChange={(event) => setProfile({ ...profile, established: event.target.value })} value={profile.established} />
              </label>
              <label className="profile-admin-span-full">
                Deskripsi Profil
                <textarea onChange={(event) => setProfile({ ...profile, description: event.target.value })} rows={5} value={profile.description} />
              </label>
              <label>
                Nama Lembaga
                <input onChange={(event) => setProfile({ ...profile, name: event.target.value })} value={profile.name} />
              </label>
              <label>
                Alamat Kantor
                <input onChange={(event) => setProfile({ ...profile, address: event.target.value })} value={profile.address} />
              </label>
              <label>
                Jam Operasional
                <input onChange={(event) => setProfile({ ...profile, officeHoursTime: event.target.value })} value={profile.officeHoursTime} />
              </label>
              <label>
                Hari Operasional
                <input onChange={(event) => setProfile({ ...profile, officeHoursDays: event.target.value })} value={profile.officeHoursDays} />
              </label>
              <label>
                Label Kontak Footer
                <input onChange={(event) => setProfile({ ...profile, contactLabel: event.target.value })} value={profile.contactLabel} />
              </label>
              <label>
                Nomor WhatsApp Footer
                <input onChange={(event) => setProfile({ ...profile, contactWhatsapp: event.target.value })} value={profile.contactWhatsapp} />
              </label>
            </div>
          </article>

          <article className="panel faq-admin-panel">
            <div className="panel-title">
              <div>
                <h3>FAQ Website Publik</h3>
                <p>Kelola pertanyaan dan jawaban yang ditampilkan kepada warga.</p>
              </div>
              <button className="ghost small" onClick={() => setFaqs((currentFaqs) => [...currentFaqs, { answer: '', id: `faq-${Date.now()}`, question: '' }])} type="button">
                <Icon name="plus" /> Tambah FAQ
              </button>
            </div>
            <div className="faq-admin-list">
              {faqs.map((faq, index) => (
                <article className="faq-admin-item" key={faq.id}>
                  <label>
                    Pertanyaan
                    <input onChange={(event) => setFaqs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item))} value={faq.question} />
                  </label>
                  <label>
                    Jawaban
                    <textarea onChange={(event) => setFaqs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item))} rows={4} value={faq.answer} />
                  </label>
                  <button className="danger-link" onClick={() => setFaqs((current) => current.filter((item) => item.id !== faq.id))} type="button">Hapus FAQ</button>
                </article>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-title">
              <div>
                <h3>Kenapa harus layanan kami?</h3>
                <p>Tetap tiga card agar struktur section publik tidak berubah.</p>
              </div>
            </div>
            <div className="profile-admin-card-list">
              {whyCards.map((card, index) => (
                <div className="faq-admin-item profile-admin-soft-field" key={`service-card-${index}`}>
                  <label>
                    Judul Card {index + 1}
                    <input
                      onChange={(event) => setWhyCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}
                      value={card.title}
                    />
                  </label>
                  <label>
                    Deskripsi Card {index + 1}
                    <textarea
                      onChange={(event) => setWhyCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, desc: event.target.value } : item))}
                      rows={4}
                      value={card.desc}
                    />
                  </label>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-title">
              <div>
                <h3>Pengurus Publik</h3>
                <p>Jumlah pengurus fleksibel, bisa dikurangi atau ditambah sesuai kebutuhan tampilan publik.</p>
              </div>
              <button className="ghost small" onClick={() => setMembers([...members, { description: '', id: `member-${Date.now()}`, name: '', role: '' }])} type="button">
                <Icon name="plus" />
                Tambah Pengurus
              </button>
            </div>
            <div className="profile-admin-member-list">
              {members.map((member, index) => (
                <div className="faq-admin-item profile-admin-soft-field" key={`${member.id}-${index}`}>
                  <div className="profile-admin-member-head">
                    <strong>Pengurus {index + 1}</strong>
                    <button className="danger-link" onClick={() => setMembers((currentMembers) => currentMembers.filter((_, memberIndex) => memberIndex !== index))} type="button">
                      Hapus
                    </button>
                  </div>
                  <label>
                    Foto Pengurus
                    {member.image && <img className="member-upload-preview" alt={`Preview ${member.name || `pengurus ${index + 1}`}`} src={member.image} />}
                    <input accept="image/*" onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (file.size > 2 * 1024 * 1024) {
                        notify('Ukuran foto pengurus maksimal 2MB.')
                        return
                      }
                      setMemberCrop({ imageUrl: URL.createObjectURL(file), memberIndex: index })
                    }} type="file" />
                  </label>
                  <label>
                    Nama Pengurus
                    <input onChange={(event) => setMembers((currentMembers) => currentMembers.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Nama pengurus" value={member.name} />
                  </label>
                  <label>
                    Jabatan
                    <input onChange={(event) => setMembers((currentMembers) => currentMembers.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item))} placeholder="Jabatan" value={member.role} />
                  </label>
                  <label>
                    Deskripsi Tugas
                    <textarea onChange={(event) => setMembers((currentMembers) => currentMembers.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder="Deskripsi singkat tugas pengurus" rows={4} value={member.description} />
                  </label>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
      {memberCrop && (
        <PhotoCropModal
          description="Geser foto pengurus untuk atur posisi, scroll untuk perbesar/perkecil."
          imageUrl={memberCrop.imageUrl}
          onApply={({ dataUrl }) => {
            setMembers((current) => current.map((item, index) => index === memberCrop.memberIndex ? { ...item, image: dataUrl } : item))
            setMemberCrop(null)
          }}
          onCancel={() => setMemberCrop(null)}
          title="Atur Foto Pengurus"
        />
      )}
    </>
  )
}

export function AdminAccountPage({ notify }: { notify: (message: string) => void }) {
  const storedAccount = { avatar: 'AU', email: 'admin@pamsimas.local', gender: 'Perempuan', name: 'Admin Utama', photo: '', username: 'admin' }
  const [name, setName] = useState(storedAccount.name)
  const [username, setUsername] = useState(storedAccount.username)
  const [email, setEmail] = useState(storedAccount.email)
  const [gender, setGender] = useState(storedAccount.gender)
  const [avatar, setAvatar] = useState(storedAccount.avatar)
  const [photo, setPhoto] = useState(storedAccount.photo)
  const [isPasswordPanelOpen, setIsPasswordPanelOpen] = useState(false)
  const [otpStep, setOtpStep] = useState<'request' | 'reset'>('request')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isOtpBusy, setIsOtpBusy] = useState(false)
  const [otpInfo, setOtpInfo] = useState('')
  const [photoDraftUrl, setPhotoDraftUrl] = useState<string | null>(null)
  const avatarOptions = ['AU', 'ADM', 'OPS', 'AIR']
  const notifyAccount = useEffectEvent(notify)

  useEffect(() => {
    const controller = new AbortController()
    void getAdminAccount(controller.signal).then((account) => {
      setAvatar(account.avatar)
      setEmail(account.email)
      setGender(account.gender)
      setName(account.name)
      setPhoto(account.photo)
      setUsername(account.username)
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      notifyAccount(error instanceof Error ? error.message : 'Akun admin gagal dimuat.')
    })
    return () => controller.abort()
  }, [])

  async function saveAccount() {
    try {
      const savedAccount = await saveAdminAccount({ avatar, email, gender, name, photo, username })
      setAvatar(savedAccount.avatar)
      setEmail(savedAccount.email)
      setGender(savedAccount.gender)
      setName(savedAccount.name)
      setPhoto(savedAccount.photo)
      setUsername(savedAccount.username)
      notify('Akun admin berhasil diperbarui.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Akun admin gagal diperbarui.')
    }
  }

  function openPasswordPanel() {
    setIsPasswordPanelOpen(true)
    setOtpStep('request')
    setOtpCode('')
    setNewPassword('')
    setPasswordConfirmation('')
    setOtpInfo('')
  }

  async function sendPasswordOtp() {
    if (!email.trim()) {
      notify('Lengkapi email akun terlebih dahulu sebelum mengganti password.')
      return
    }
    setIsOtpBusy(true)
    try {
      const message = await requestOtp(email.trim())
      setOtpInfo(message)
      setOtpStep('reset')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Kode OTP gagal dikirim.')
    } finally {
      setIsOtpBusy(false)
    }
  }

  async function submitPasswordOtp() {
    if (newPassword.length < 8) {
      notify('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== passwordConfirmation) {
      notify('Konfirmasi password baru tidak sesuai.')
      return
    }
    setIsOtpBusy(true)
    try {
      const message = await resetPasswordWithOtp(email.trim(), otpCode.trim(), newPassword, passwordConfirmation)
      notify(message)
      setIsPasswordPanelOpen(false)
      setOtpCode('')
      setNewPassword('')
      setPasswordConfirmation('')
      setOtpInfo('')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Password gagal diperbarui.')
    } finally {
      setIsOtpBusy(false)
    }
  }

  return (
    <>
      <PageHeader subtitle="Kelola identitas akun yang sedang login." title="Akun Admin" />
      <section className="field-profile-clean">
        <article className="panel field-profile-summary">
          <PhotoPicker
            hint="JPG/PNG, maks 2MB"
            id="admin-account-photo"
            label="Foto Admin"
            onSelect={(file) => {
              if (file.size > 2 * 1024 * 1024) {
                notify('Ukuran foto maksimal 2MB.')
                return
              }

              setPhotoDraftUrl(URL.createObjectURL(file))
            }}
            placeholder={avatar}
            previewSrc={photo || undefined}
          />
          <div>
            <h2>{name}</h2>
            <p>Administrator PAMSIMAS</p>
            <div className="profile-chip-row">
              <span>Aktif</span>
              <span>{gender}</span>
              <span>Pengelola Sistem</span>
            </div>
          </div>
        </article>
        <article className="panel account-edit-form">
          <label>Nama Lengkap<input onChange={(event) => setName(event.target.value)} value={name} /></label>
          <label>Username<input onChange={(event) => setUsername(event.target.value)} value={username} /></label>
          <label>Email<input onChange={(event) => setEmail(event.target.value)} value={email} /></label>
          <label>
            Jenis Kelamin
            <select className="input-select" onChange={(event) => setGender(event.target.value)} value={gender}>
              <option>Perempuan</option>
              <option>Laki-laki</option>
            </select>
          </label>
          <div className="avatar-picker">
            <span>Avatar Bawaan</span>
            <div>
              {avatarOptions.map((option) => (
                <button className={avatar === option ? 'avatar-option active' : 'avatar-option'} key={option} onClick={() => setAvatar(option)} type="button">
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button className="primary" onClick={() => void saveAccount()} type="button">Simpan Akun</button>
          {!isPasswordPanelOpen ? (
            <button className="ghost" onClick={openPasswordPanel} type="button">Ganti Password via OTP Email</button>
          ) : (
            <>
              <p className="muted">Kode OTP akan dikirim ke <strong>{email || 'email akun ini'}</strong>.</p>
              {otpStep === 'request' ? (
                <button className="primary" disabled={isOtpBusy} onClick={() => void sendPasswordOtp()} type="button">
                  {isOtpBusy ? 'Mengirim...' : 'Kirim Kode OTP'}
                </button>
              ) : (
                <>
                  {otpInfo && <p className="muted">{otpInfo}</p>}
                  <label>Kode OTP<input maxLength={6} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" value={otpCode} /></label>
                  <label>Password Baru<PasswordInput onChange={setNewPassword} placeholder="Minimal 8 karakter" value={newPassword} /></label>
                  <label>Konfirmasi Password<PasswordInput onChange={setPasswordConfirmation} placeholder="Ulangi password baru" value={passwordConfirmation} /></label>
                  <button className="ghost" disabled={isOtpBusy} onClick={() => void sendPasswordOtp()} type="button">Kirim Ulang Kode</button>
                  <button className="primary" disabled={isOtpBusy} onClick={() => void submitPasswordOtp()} type="button">
                    {isOtpBusy ? 'Menyimpan...' : 'Simpan Password Baru'}
                  </button>
                </>
              )}
              <button className="ghost" onClick={() => setIsPasswordPanelOpen(false)} type="button">Batal</button>
            </>
          )}
        </article>
      </section>
      {photoDraftUrl && (
        <PhotoCropModal
          description="Geser foto untuk atur posisi, scroll untuk perbesar/perkecil."
          imageUrl={photoDraftUrl}
          onApply={({ dataUrl }) => {
            setPhoto(dataUrl)
            setPhotoDraftUrl(null)
          }}
          onCancel={() => setPhotoDraftUrl(null)}
          title="Crop Avatar Admin"
        />
      )}
    </>
  )
}

export function AdminHelpPage() {
  const adminGuides = [
    ['Dashboard', ['Pantau metrik utama dan aktivitas login.', 'Periksa setoran yang menunggu tindak lanjut.', 'Gunakan tombol akun kas untuk membuka transaksi.'], 'Metrik mengikuti data tersimpan dan berubah setelah transaksi diposting atau diverifikasi.'],
    ['Data Pelanggan', ['Cari pelanggan berdasarkan ID, nama, atau wilayah.', 'Gunakan Tambah/Edit untuk memperbarui identitas dan wilayah.', 'Buka Detail untuk melihat meter dan riwayat tagihan.'], 'Hapus hanya data yang salah input karena pelanggan berhubungan dengan meter, kwitansi, dan pembayaran.'],
    ['Data Petugas', ['Tambah petugas untuk membuat akun lapangan.', 'Pilih dusun, RW, dan RT yang masih tersedia.', 'Gunakan Detail/Edit untuk memindahkan wilayah tugas.'], 'Wilayah berwarna abu-abu berarti sudah ditugaskan kepada petugas lain.'],
    ['Cetak Kwitansi', ['Pilih petugas dan periode.', 'Centang kwitansi yang belum dicetak.', 'Periksa preview lalu cetak maksimal empat kwitansi per halaman.'], 'Jika angka meter diedit, kwitansi harus dicetak ulang.'],
    ['Verifikasi Setoran', ['Pilih periode dan buka Detail setoran.', 'Cocokkan uang fisik, QRIS, dan bukti tiap pelanggan.', 'Verifikasi, pending, atau tolak per pelanggan lalu selesaikan setoran.'], 'Jika ada pelanggan ditolak, setoran tetap pending sampai seluruh baris aman.'],
    ['Akun Kas & Pengeluaran', ['Tambah pemasukan atau pindahkan dana antar-akun.', 'Catat pengeluaran beserta nota internal.', 'Posting transaksi agar saldo dan ringkasan berubah.'], 'Nota hanya untuk Admin dan tidak pernah ditampilkan di website publik.'],
    ['Laporan Bulanan', ['Pilih periode bulanan, triwulan, atau tahunan.', 'Pilih pemasukan, pengeluaran, atau mutasi campur.', 'Unduh laporan sesuai tabel yang sedang ditampilkan.'], 'Pastikan transaksi sudah diposting sebelum laporan final dibuat.'],
  ]

  return (
    <>
      <PageHeader subtitle="Pusat panduan internal untuk admin dan petugas." title="Panduan Admin" />
      <section className="help-hero panel">
        <div>
          <span className="stat-icon"><Icon name="help" /></span>
          <h2>Pusat Panduan Operasional</h2>
          <p>Gunakan halaman ini saat admin perlu bantuan teknis, panduan penggunaan fitur, atau ingin mencatat perubahan sebelum backend Laravel diaktifkan.</p>
        </div>
        <div className="developer-card">
          <small>Developer</small>
          <strong>Ratu Qurratul Aini</strong>
          <span>WhatsApp: 0857-2389-1658</span>
          <span>Email: ratuquratul@gmail.com</span>
          <span>Jam: Senin-Jumat, 09.00-17.00 WIB</span>
        </div>
      </section>
      <section className="help-guide-list">
        {adminGuides.map(([title, points, note]) => (
          <article className="panel help-guide-card" key={title as string}>
            <span className="stat-icon"><Icon name="receipt" /></span>
            <div>
              <h3>{title as string}</h3>
              <ol>
                {(points as string[]).map((point) => <li key={point}>{point}</li>)}
              </ol>
              <p className="help-note"><strong>Catatan:</strong> {note as string}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

