import { Suspense } from 'react'
import { Icon } from '../../../components/Icon'
import type { PublicMapSettings } from '../data/publicData'
import { WaterNetworkMap } from './WaterNetworkMap'

export function PublicMapGuideSection({
  mapSettings,
  previewMode = false,
}: {
  mapSettings: PublicMapSettings
  previewMode?: boolean
}) {
  const whatsappNumber = normalizeWhatsappNumber(mapSettings.contactWhatsapp)
  const fieldOfficerWhatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''
  const hasGuideDescription = mapSettings.guideDescription.trim().length > 0
  const sectionClassName = previewMode
    ? 'public-section-flow public-section-map relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 py-4 lg:grid-cols-12'
    : 'public-section-flow public-section-map relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-24 sm:px-6 lg:grid-cols-12 lg:px-8'
  const revealClassName = previewMode ? '' : 'public-reveal'

  return (
    <section className={sectionClassName} id={previewMode ? undefined : 'peta-air'}>
      <div className={revealClassName ? `${revealClassName} lg:col-span-12` : 'lg:col-span-12'}>
        <h2 className="public-gradient-heading max-w-5xl text-4xl font-black tracking-tight md:text-6xl">{mapSettings.title}</h2>
        <p className="mt-5 max-w-4xl text-base font-medium leading-relaxed text-slate-600 md:text-lg">
          {mapSettings.description}
        </p>
      </div>
      <div className={revealClassName ? `${revealClassName} lg:col-span-7` : 'lg:col-span-7'}>
        <div className="elevated-card public-map-card public-map-card-equal">
          <div className="public-map-shell relative overflow-hidden rounded-t-[1.35rem] bg-white shadow-[inset_0_0_30px_rgba(15,23,42,0.08)]">
            <Suspense fallback={<div className="flex aspect-video items-center justify-center text-sm font-black text-slate-400">Memuat peta air...</div>}>
              <WaterNetworkMap settings={mapSettings} />
            </Suspense>
          </div>
          <p className="public-map-note">
            <span>Catatan:</span> {mapSettings.mapNote}
          </p>
        </div>
      </div>

      <aside className={`${revealClassName ? `${revealClassName} ` : ''}glass-panel guide-motion-card public-guide-card-equal relative flex overflow-hidden rounded-[2.5rem] p-5 shadow-card-elevated transition-all duration-500 sm:p-6 lg:col-span-5`}>
        <span className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-sky-200/35 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-cyan-200/28 blur-3xl" />
        <div className="relative flex h-full w-full flex-col overflow-hidden">
          <h3 className="public-gradient-heading text-3xl font-black tracking-tight md:text-4xl">{mapSettings.guideTitle}</h3>
          {hasGuideDescription && (
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-600">
              {mapSettings.guideDescription}
            </p>
          )}
          <div className="public-guide-scroll mt-6 flex-1 overflow-y-auto pr-1">
            <ol className="relative py-2 pl-2 pr-3">
            {mapSettings.guideSteps.map((step, index) => (
              <li className="guide-step group relative grid grid-cols-[52px_1fr] gap-4 pb-6 last:pb-0" key={`${index + 1}-${step}`}>
                {index < mapSettings.guideSteps.length - 1 && <span className="absolute left-[25px] top-12 h-[calc(100%-3rem)] w-px bg-gradient-to-b from-sky-200 to-cyan-100" />}
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-[#0070A8] ring-4 ring-white transition-all duration-300 group-hover:scale-110 group-hover:bg-[#0A9CA8] group-hover:text-white">
                  {index + 1}
                </span>
                <p className="rounded-2xl px-3 py-2 text-sm font-medium leading-relaxed text-slate-600 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-sky-50 group-hover:text-slate-800 group-hover:shadow-sm">{step}</p>
              </li>
            ))}
            </ol>
          </div>
          <div className="mt-auto grid gap-3">
            {fieldOfficerWhatsappUrl && (
              <a className="map-contact-cta inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-pamsimas-blue px-6 py-4 text-sm font-black text-white shadow-lg shadow-sky-700/20 transition-all duration-300 hover:-translate-y-1 hover:bg-pamsimas-teal hover:shadow-2xl hover:shadow-sky-700/25" href={fieldOfficerWhatsappUrl} rel="noreferrer" target="_blank">
                <Icon name="phone" />
                {mapSettings.contactLabel}
              </a>
            )}
          </div>
        </div>
      </aside>
    </section>
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
