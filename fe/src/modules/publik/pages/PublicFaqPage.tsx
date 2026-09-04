import { useState } from 'react'
import { publicFaq } from '../data/publicData'

export function PublicFaqPage() {
  const [openQ, setOpenQ] = useState<string | null>(publicFaq[0].items[0].question)

  return (
    <div className="flex flex-col gap-12 animate-[pub-fade-up_0.5s_ease-out]">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1E2D3D] mb-3">Pusat Bantuan (FAQ)</h1>
        <p className="text-slate-600">Jawaban untuk pertanyaan umum seputar layanan PAMSIMAS.</p>
      </div>

      <div className="mx-auto w-full max-w-3xl flex flex-col gap-10">
        {publicFaq.map((group) => (
          <div key={group.category}>
            <h2 className="text-lg font-bold text-[#0070A8] mb-4">{group.category}</h2>
            <div className="public-faq-list">
              {group.items.map((item) => {
                const isOpen = openQ === item.question
                return (
                  <button
                    className={isOpen ? 'open' : ''}
                    key={item.question}
                    onClick={() => setOpenQ(isOpen ? null : item.question)}
                    type="button"
                  >
                    <b>{item.question}</b>
                    <strong>+</strong>
                    <i>{item.answer}</i>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
