import { Icon } from '../../../components/Icon'
import type { PublicProfileContent } from '../data/publicData'

export function PublicFooterSection({
  profile,
  onMapClick,
  onTransparencyClick,
}: {
  onMapClick?: () => void
  onTransparencyClick?: () => void
  profile: PublicProfileContent
}) {
  const whatsappNumber = normalizeWhatsappNumber(profile.contactWhatsapp)
  const footerWhatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

  return (
    <footer className="public-footer-main relative overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="public-footer-grid relative mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
        <div className="public-footer-col">
          <h3 className="text-2xl font-black">{profile.name || 'PAMSIMAS Tanjungsari'}</h3>
          <p className="mt-4 max-w-sm text-sm font-semibold leading-relaxed text-slate-400">
            Informasi publik untuk layanan air bersih, peta jaringan, dan transparansi operasional desa.
          </p>
          {profile.address && <p className="mt-4 text-sm font-bold text-slate-300">{profile.address}</p>}
        </div>
        <div className="public-footer-col">
          <h4 className="text-sm font-black uppercase tracking-[0.16em] text-cyan-200">Jam Operasional</h4>
          <p className="mt-5 text-3xl font-black">{profile.officeHoursTime}</p>
          <p className="mt-2 text-sm font-semibold text-slate-400">{profile.officeHoursDays}</p>
        </div>
        <div className="public-footer-col">
          <h4 className="text-sm font-black uppercase tracking-[0.16em] text-cyan-200">Kontak & Tautan</h4>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{profile.contactLabel}</p>
          {footerWhatsappUrl && (
            <a aria-label="Hubungi PAMSIMAS lewat WhatsApp" className="mt-3 inline-flex w-max items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-black text-white transition-all duration-300 hover:-translate-y-1 hover:bg-white/16 hover:text-cyan-100" href={footerWhatsappUrl} rel="noreferrer" target="_blank">
              <Icon name="whatsapp" />
            </a>
          )}
          <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-400">
            <button className="w-max text-left transition-colors hover:text-cyan-200" onClick={onMapClick} type="button">Peta Jaringan Air</button>
            <button className="w-max text-left transition-colors hover:text-cyan-200" onClick={onTransparencyClick} type="button">Transparansi Publik</button>
          </div>
        </div>
      </div>
    </footer>
  )
}

function normalizeWhatsappNumber(value: string) {
  const digits = value.replace(/[^\d]/g, '')

  if (digits.startsWith('62')) {
    return digits
  }

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`
  }

  return digits
}
