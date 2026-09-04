import { Icon } from './Icon'

export function FilterBar({ labels }: { labels: string[] }) {
  return (
    <section className="filter-bar compact-filter">
      {labels.map((label) => (
        <button className="select" key={label}>
          {label}
        </button>
      ))}
      <button className="ghost">
        <Icon name="filter" />
        Terapkan Filter
      </button>
    </section>
  )
}
