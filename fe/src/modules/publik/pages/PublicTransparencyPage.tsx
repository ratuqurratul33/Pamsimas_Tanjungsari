import { PublicStatCard } from '../components/PublicStatCard'
import { Icon } from '../../../components/Icon'
import { useScrollReveal } from '../hooks/useScrollReveal'

export function PublicTransparencyPage() {
  const ref = useScrollReveal<HTMLDivElement>()
  const dusunData = [
    { name: 'Dusun 1', progress: 90 },
    { name: 'Dusun 2', progress: 85 },
    { name: 'Dusun 3', progress: 82 },
  ]

  return (
    <div className="flex flex-col gap-12 animate-[pub-fade-up_0.5s_ease-out]">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1E2D3D] mb-3">Transparansi Wilayah</h1>
        <p className="text-slate-600">Ringkasan kas PAMSIMAS dan persentase pembayaran iuran per dusun bulan ini.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PublicStatCard icon={<Icon name="team" />} label="Pembayaran Aktif" value="82%" accent />
        <PublicStatCard icon={<Icon name="money" />} label="Kas Tunai" value="Rp 8.5M" />
        <PublicStatCard icon={<Icon name="money" />} label="Kas QRIS" value="Rp 9.9M" />
        <PublicStatCard icon={<Icon name="shield" />} label="Tunggakan" value="18%" />
      </section>

      <div ref={ref} className="pub-reveal glass-card p-8">
        <h2 className="text-xl font-bold text-[#1E2D3D] mb-6">Pembayaran Iuran Per Dusun</h2>
        <div className="flex flex-col gap-6">
          {dusunData.map((dusun) => (
            <div key={dusun.name} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm font-bold text-[#1E2D3D]">
                <span>{dusun.name}</span>
                <span>{dusun.progress}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full rounded-full bg-[#0070A8] transition-all duration-1000 ease-out"
                  style={{ width: `${dusun.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-slate-400 text-center uppercase tracking-wider">Data diperbarui otomatis dari sistem setiap hari</p>
      </div>
    </div>
  )
}
