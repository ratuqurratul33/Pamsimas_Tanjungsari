import { Badge } from '../../../components/Badge'
import { PageHeader } from '../../../components/PageHeader'
import type { FieldProfile } from '../data/petugasData'

type FieldProfilePageProps = {
  profile: FieldProfile
}

export function FieldProfilePage({ profile }: FieldProfilePageProps) {
  return (
    <>
      <PageHeader subtitle="Informasi akun dibuat dan dikelola oleh Admin PAMSIMAS." title="Profil Petugas" />
      <div className="field-profile-clean read-only-profile">
        <section className="panel field-profile-summary">
          <div className="field-profile-photo">
            {profile.photo ? <img alt={profile.name} src={profile.photo} /> : <span>{profile.avatar}</span>}
          </div>
          <div>
            <h2>{profile.name}</h2>
            <p>{profile.role}</p>
            <div className="profile-chip-row">
              <Badge status={profile.status} />
              <span>{profile.gender}</span>
              <span>{profile.area}</span>
            </div>
          </div>
        </section>

        <section className="panel account-panel">
          <div className="panel-title">
            <div>
              <h3>Informasi Akun</h3>
              <p>Hubungi Admin jika nama, nomor HP, wilayah tugas, atau kredensial perlu diperbarui.</p>
            </div>
          </div>
          <dl className="profile-readonly-list">
            <div><dt>Nama Lengkap</dt><dd>{profile.name}</dd></div>
            <div><dt>Username</dt><dd>{profile.username}</dd></div>
            <div><dt>Nomor HP</dt><dd>{profile.phone}</dd></div>
            <div><dt>Wilayah Tugas</dt><dd>{profile.area}</dd></div>
            <div><dt>Jenis Kelamin</dt><dd>{profile.gender}</dd></div>
          </dl>
          <p className="inline-note">Catatan: nomor HP adalah password login Petugas. Perubahan nomor dan akses akun hanya dapat dilakukan Admin melalui menu Data Petugas.</p>
        </section>
      </div>
    </>
  )
}
