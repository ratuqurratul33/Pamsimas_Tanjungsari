import type { PublicMapSettings } from '../data/publicData'
import { Icon } from '../../../components/Icon'
import { useState } from 'react'

export function PublicContactPage({ mapSettings }: { mapSettings: PublicMapSettings }) {
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const whatsappNumber = normalizeWhatsappNumber(mapSettings.contactWhatsapp)

  const contacts = [
    { label: 'Kantor PAMSIMAS', value: 'Balai Desa Tanjungsari', icon: 'map' },
    { label: 'WhatsApp', value: `+${whatsappNumber}`, icon: 'phone' },
    { label: 'Email', value: 'layanan@pamsimas.desa.id', icon: 'money' },
  ]

  return (
    <div className="flex flex-col gap-12 animate-[pub-fade-up_0.5s_ease-out]">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1E2D3D] mb-3">Hubungi PAMSIMAS</h1>
        <p className="text-slate-600">Kami siap membantu menjawab pertanyaan Anda atau menangani kendala layanan air bersih di wilayah Anda.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {contacts.map((c) => (
          <div key={c.label} className="glass-card p-6 flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E0F2FE] text-[#0070A8] mb-4 text-xl">
              <Icon name={c.icon as any} />
            </span>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{c.label}</h2>
            <p className="mt-2 font-semibold text-[#1E2D3D]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card grid lg:grid-cols-2 overflow-hidden rounded-3xl mt-4">
        <div className="p-8 md:p-12">
          <h2 className="text-2xl font-bold text-[#1E2D3D] mb-6">Kirim Pesan</h2>
          {sent ? (
            <div className="bg-green-50 text-green-700 p-6 rounded-2xl flex flex-col items-center text-center gap-2">
              <span className="text-3xl">✓</span>
              <strong>Pesan Terkirim</strong>
              <p className="text-sm">Terima kasih, tim kami akan segera menghubungi Anda kembali.</p>
              <button className="mt-4 text-sm font-bold underline" onClick={() => setSent(false)}>Kirim pesan lain</button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-600">Nama Lengkap</label>
                <input type="text" className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 outline-none transition-colors focus:border-[#0070A8]" placeholder="Nama Anda" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-600">Pesan / Pertanyaan</label>
                <textarea 
                  rows={4} 
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white/50 px-4 py-3 outline-none transition-colors focus:border-[#0070A8]" 
                  placeholder="Ketik pesan Anda di sini..."
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                />
              </div>
              <button 
                className="rounded-xl bg-[#0070A8] py-3.5 font-bold text-white transition-transform hover:scale-[0.98] active:scale-95"
                onClick={() => { if(msg) setSent(true); setMsg('') }}
              >
                Kirim Pesan
              </button>
            </div>
          )}
        </div>
        
        <div className="relative min-h-[300px] bg-slate-100">
          <img src={mapSettings.image} alt={mapSettings.title} className="absolute inset-0 h-full w-full object-cover opacity-80" />
        </div>
      </div>
    </div>
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

  return digits || '6281234567890'
}
