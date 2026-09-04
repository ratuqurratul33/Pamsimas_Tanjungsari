import type { Officer } from '../../types'
import { fallbackData } from '../../modules/admin/data/mockData'

const OFFICER_KEY = 'pamsimas.mock.officers.v1'

function readOfficers(): Officer[] {
  const stored = window.localStorage.getItem(OFFICER_KEY)
  if (!stored) { window.localStorage.setItem(OFFICER_KEY, JSON.stringify(fallbackData.officers)); return structuredClone(fallbackData.officers) }
  try { return JSON.parse(stored) as Officer[] } catch { window.localStorage.setItem(OFFICER_KEY, JSON.stringify(fallbackData.officers)); return structuredClone(fallbackData.officers) }
}

function writeOfficers(officers: Officer[]) { window.localStorage.setItem(OFFICER_KEY, JSON.stringify(officers)) }

export const mockOfficerRepository = {
  list() { return readOfficers() },
  save(officer: Officer) {
    const officers = readOfficers()
    const nextOfficer = { ...officer, backendId: officer.backendId ?? Date.now() }
    writeOfficers(officers.some((item) => item.id === officer.id) ? officers.map((item) => item.id === officer.id ? nextOfficer : item) : [nextOfficer, ...officers])
    return nextOfficer
  },
}

