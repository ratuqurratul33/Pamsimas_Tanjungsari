import { defaultPublicMapSettings, defaultPublicMembers, defaultPublicProfile, defaultPublicServiceCards, type PublicMapSettings, type PublicMember, type PublicProfileContent, type PublicServiceCard } from '../../modules/publik/data/publicData'

export type PublicContent = { members: PublicMember[]; profile: PublicProfileContent; serviceCards: PublicServiceCard[] }
const MAP_KEY = 'pamsimas.mock.public.map.v1'
const PROFILE_KEY = 'pamsimas.mock.public.profile.v1'

function read<T>(key: string, fallback: T): T {
  const stored = window.localStorage.getItem(key)
  if (!stored) { window.localStorage.setItem(key, JSON.stringify(fallback)); return structuredClone(fallback) }
  try { return JSON.parse(stored) as T } catch { window.localStorage.setItem(key, JSON.stringify(fallback)); return structuredClone(fallback) }
}

export const mockPublicRepository = {
  getMap() { return read(MAP_KEY, defaultPublicMapSettings) },
  saveMap(settings: PublicMapSettings) { window.localStorage.setItem(MAP_KEY, JSON.stringify(settings)); return settings },
  getProfile(): PublicContent { return read(PROFILE_KEY, { members: defaultPublicMembers, profile: defaultPublicProfile, serviceCards: defaultPublicServiceCards }) },
  saveProfile(content: PublicContent) { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(content)); return content },
}

