import { Icon } from '../../../components/Icon'
import { makeAvatarPhoto } from '../../../utils/avatar'
import type { PublicMember, PublicProfileContent, PublicServiceCard } from '../data/publicData'

export function PublicProfileSection({
  profile,
  serviceCards,
  members,
  previewMode = false,
}: {
  profile: PublicProfileContent
  serviceCards: PublicServiceCard[]
  members: PublicMember[]
  previewMode?: boolean
}) {
  const sectionClassName = previewMode
    ? 'public-section-flow public-section-profile relative mx-auto w-full max-w-7xl py-4'
    : 'public-section-flow public-section-profile relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8'
  const revealClassName = previewMode ? '' : 'public-reveal'

  return (
    <section className={sectionClassName} id={previewMode ? undefined : 'tentang-kami'}>
      <div className={revealClassName ? `${revealClassName} max-w-4xl` : 'max-w-4xl'}>
        <h2 className="public-gradient-heading text-4xl font-black tracking-tight md:text-6xl">{profile.title}</h2>
        {profile.established && <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-[#0A7FA8]">{profile.established}</p>}
        <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
          {profile.description}
        </p>
      </div>

      {serviceCards.length > 0 && (
        <>
          <div className={revealClassName ? `${revealClassName} mt-14 flex flex-col justify-between gap-3 md:flex-row md:items-end` : 'mt-14 flex flex-col justify-between gap-3 md:flex-row md:items-end'}>
            <div>
              <h3 className="public-gradient-heading text-3xl font-black tracking-tight md:text-4xl">Kenapa harus layanan kami?</h3>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                Tiga alasan dasar kenapa layanan PAMSIMAS membantu rumah tangga desa mengakses air bersih dengan lebih tertib.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {serviceCards.map((card, index) => (
              <article
                className={`elevated-card public-card ${revealClassName} service-slide`.trim()}
                key={card.title}
                style={previewMode ? undefined : { transitionDelay: `${index * 80}ms` }}
              >
                <div className="public-card-icon">
                  <Icon name={card.icon} />
                </div>
                <h3 className="text-2xl font-black text-[#0070A8]">{card.title}</h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 md:text-base">{card.desc}</p>
              </article>
            ))}
          </div>
        </>
      )}

      {members.length > 0 && (
        <div className={revealClassName ? `${revealClassName} mt-16` : 'mt-16'}>
          <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h3 className="public-gradient-heading text-3xl font-black tracking-tight md:text-4xl">Profil pengurus</h3>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                Pengurus ditampilkan ringkas dulu, lalu detail tugasnya muncul saat kartu disentuh atau diarahkan kursor.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {members.map((member, index) => (
              <article
                className={`elevated-card ${revealClassName} group flex gap-4 p-4`.trim()}
                key={member.id}
                style={previewMode ? undefined : { transitionDelay: `${index * 70}ms` }}
              >
                <div className="public-member-photo-frame">
                  <img alt={member.name} className="public-member-photo" src={member.image || makeAvatarPhoto(member.name)} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800">{member.name}</h3>
                  <p className="text-sm font-semibold text-[#0A7FA8]">{member.role}</p>
                  <p className="max-h-0 overflow-hidden text-sm font-medium leading-relaxed text-slate-500 opacity-0 transition-all duration-300 group-hover:mt-2 group-hover:max-h-24 group-hover:opacity-100">
                    {member.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
