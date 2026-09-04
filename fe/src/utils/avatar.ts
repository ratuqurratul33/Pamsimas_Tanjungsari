const AVATAR_PALETTE: Array<[string, string]> = [
  ['#0070A8', '#0A9CA8'],
  ['#0A9CA8', '#38BDF8'],
  ['#075985', '#22C55E'],
  ['#0F766E', '#0EA5E9'],
  ['#7C3AED', '#38BDF8'],
  ['#DB2777', '#F97316'],
]

function hashName(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

/** Generates a deterministic head-and-shoulders placeholder avatar (data URI) for a given name — no real photo is fetched. */
export function makeAvatarPhoto(name: string) {
  const [from, to] = AVATAR_PALETTE[hashName(name) % AVATAR_PALETTE.length]
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="48" fill="url(#bg)"/>
      <circle cx="120" cy="92" r="40" fill="rgba(255,255,255,0.92)"/>
      <path d="M50 210c8-48 40-76 70-76s62 28 70 76" fill="rgba(255,255,255,0.86)"/>
      <text x="120" y="224" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="rgba(15,39,66,0.55)">${initials}</text>
    </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
