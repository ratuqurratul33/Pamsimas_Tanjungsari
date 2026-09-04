import type { Stat } from '../types'
import { Icon } from './Icon'

export function StatCard({ stat }: { stat: Stat }) {
  const iconName = stat.tone === 'red' ? 'shield' : stat.tone === 'orange' ? 'receipt' : 'team'

  return (
    <article className={`stat-card ${stat.tone ?? ''}`}>
      <div className="stat-icon">
        <Icon name={iconName} />
      </div>
      <span>{stat.label}</span>
      <strong>{stat.value}</strong>
      {stat.note && <small>{stat.note}</small>}
    </article>
  )
}
