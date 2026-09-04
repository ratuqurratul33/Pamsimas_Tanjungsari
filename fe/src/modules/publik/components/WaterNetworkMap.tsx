import type { PublicMapSettings } from '../data/publicData'

type WaterNetworkMapProps = {
  settings: PublicMapSettings
}

export function WaterNetworkMap({ settings }: WaterNetworkMapProps) {
  return (
    <div className="leaflet-card">
      <div className="leaflet-map aspect-[4/3] overflow-hidden bg-white md:aspect-[16/11]">
        {settings.image ? (
          <img alt={settings.title} className="h-full w-full object-contain" decoding="sync" loading="eager" src={settings.image} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-bold text-slate-400">
            Gambar peta belum dipublikasikan.
          </div>
        )}
      </div>
    </div>
  )
}
