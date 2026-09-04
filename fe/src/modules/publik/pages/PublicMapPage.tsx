import type { PublicMapSettings } from '../data/publicData'
import { WaterNetworkMap } from '../components/WaterNetworkMap'

export function PublicMapPage({ mapSettings }: { mapSettings: PublicMapSettings }) {
  return (
    <div id="peta-air" className="flex flex-col gap-8 animate-[pub-fade-up_0.5s_ease-out]">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1E2D3D] mb-3">{mapSettings.title}</h1>
        <p className="text-slate-600">{mapSettings.description}</p>
      </div>

      <div className="elevated-card grid gap-6 overflow-hidden p-6">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${mapSettings.status === 'Sistem Normal' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {mapSettings.status}
          </span>
          <p className="mt-2 text-sm text-slate-500">{mapSettings.coverage}</p>
        </div>
        <WaterNetworkMap settings={mapSettings} />
      </div>
    </div>
  )
}
