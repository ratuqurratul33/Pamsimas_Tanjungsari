import { organizationMembers } from '../data/publicData'
import { Icon } from '../../../components/Icon'

export function PublicAboutPage() {
  const features = ['Transparan & Akuntabel', 'Dikelola Swadaya', 'Air Bersih & Sehat', 'Respons Cepat']

  return (
    <div id="tentang-kami" className="mx-auto w-full max-w-5xl px-4 flex flex-col gap-12 animate-[pub-fade-up_0.4s_ease-out]">
      <div className="text-center max-w-2xl mx-auto pt-6">
        <span className="inline-block rounded-full bg-teal-50 border border-teal-100 px-3 py-1 text-xs font-bold text-teal-600 mb-3 uppercase tracking-wider shadow-sm">
          Profil PAMSIMAS
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">Mengenal Pengelola Air Desa</h1>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
          Penyediaan Air Minum dan Sanitasi Berbasis Masyarakat (PAMSIMAS) Desa Tanjungsari adalah program swadaya untuk memastikan akses air bersih rumah tangga yang terjangkau, aman, dan dikelola mandiri oleh warga untuk warga.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {features.map((title) => (
          <div 
            key={title} 
            className="flex items-center gap-4 p-5 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-cyan-50 text-teal-600 shadow-sm border border-white">
              <Icon name="drop" />
            </div>
            <span className="text-sm font-bold text-slate-800">{title}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center mt-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">Struktur Pengurus</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {organizationMembers.map(([name, role]) => (
            <div 
              key={name} 
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="h-16 w-16 mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-xl font-bold text-white shadow-md border-2 border-white">
                {name.substring(0, 2).toUpperCase()}
              </div>
              <strong className="text-sm font-bold text-slate-800">{name}</strong>
              <span className="text-xs font-medium text-slate-500 mt-1">{role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
