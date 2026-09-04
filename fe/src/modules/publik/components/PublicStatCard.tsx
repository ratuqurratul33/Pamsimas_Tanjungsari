import type { ReactNode } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'

type Props = {
  icon: ReactNode
  label: string
  value: string
  accent?: boolean
  delay?: number
}

export function PublicStatCard({ icon, label, value, accent = false, delay = 0 }: Props) {
  const ref = useScrollReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="pub-reveal glass-card flex items-center gap-4 p-5"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${accent ? 'bg-[#0070A8] text-white' : 'bg-[#E0F2FE] text-[#0070A8]'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-[#1E2D3D]">{value}</p>
      </div>
    </div>
  )
}
