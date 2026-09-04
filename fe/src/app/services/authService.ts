import { appEnvironment } from '../config/environment'
import { fallbackData } from '../../modules/admin/data/mockData'
import type { Officer } from '../../types'

export type AppRole = 'admin' | 'petugas'
export type AuthSession = { token: string; role: AppRole; user?: { name?: string; email?: string } }

const SESSION_KEY = 'pamsimas.auth.session.v1'
const SESSION_TTL_MS = 60 * 60 * 1000

type StoredSession = AuthSession & { lastActivityAt?: number }

export async function login(email: string, password: string): Promise<AuthSession> {
  if (appEnvironment.useMockApi) {
    const normalizedLogin = email.trim().toLowerCase()
    const adminLogin = normalizedLogin === 'admin' || normalizedLogin === 'admin@pamsimas.local'
    const officer = adminLogin ? null : findMockOfficer(normalizedLogin)
    const isValidAdmin = adminLogin && password === 'password'
    const isValidOfficer = officer?.status === 'Aktif' && officer.phone === password

    if (!isValidAdmin && !isValidOfficer) throw new Error('Username/email atau password simulasi tidak sesuai.')

    const role: AppRole = isValidAdmin ? 'admin' : 'petugas'
    const session: StoredSession = {
      role,
      token: `mock-token-${role}`,
      user: { email, name: isValidAdmin ? 'Admin PAMSIMAS' : officer?.name },
      lastActivityAt: Date.now(),
    }
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  const response = await fetch(`${appEnvironment.apiBaseUrl}/auth/login`, { body: JSON.stringify({ login: email, password }), headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, method: 'POST' })
  if (!response.ok) throw new Error('Username/email atau password tidak sesuai.')
  const payload = await response.json() as { token: string; user?: { role?: string; name?: string; email?: string } }
  const role: AppRole = payload.user?.role === 'petugas' ? 'petugas' : 'admin'
  const session: StoredSession = { role, token: payload.token, user: payload.user, lastActivityAt: Date.now() }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  window.localStorage.setItem('pamsimas.admin.token', payload.token)
  return session
}

export async function requestOtp(email: string): Promise<string> {
  if (appEnvironment.useMockApi) {
    return 'Mode simulasi: gunakan kode 123456 untuk melanjutkan.'
  }

  const response = await fetch(`${appEnvironment.apiBaseUrl}/auth/otp/request`, {
    body: JSON.stringify({ email }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Gagal mengirim kode OTP.')
  return payload.message ?? 'Jika email terdaftar, kode OTP telah dikirim.'
}

export async function resetPasswordWithOtp(email: string, code: string, password: string, passwordConfirmation: string): Promise<string> {
  if (appEnvironment.useMockApi) {
    if (code !== '123456') throw new Error('Kode OTP tidak sesuai. (Mode simulasi: gunakan 123456)')
    if (password.length < 8) throw new Error('Password baru minimal 8 karakter.')
    if (password !== passwordConfirmation) throw new Error('Konfirmasi password baru tidak sesuai.')
    return 'Password berhasil diperbarui. Silakan login dengan password baru.'
  }

  const response = await fetch(`${appEnvironment.apiBaseUrl}/auth/otp/reset`, {
    body: JSON.stringify({ code, email, password, password_confirmation: passwordConfirmation }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Gagal memperbarui password.')
  return payload.message ?? 'Password berhasil diperbarui.'
}

function findMockOfficer(login: string): Officer | null {
  let officers = fallbackData.officers

  try {
    const stored = window.localStorage.getItem('pamsimas.mock.officers.v1')
    if (stored) officers = JSON.parse(stored) as Officer[]
  } catch {
    officers = fallbackData.officers
  }

  return officers.find((officer) => {
    const username = officer.username.toLowerCase()
    return login === username || login === `${username}@pamsimas.local`
  }) ?? null
}

export function getSession(): AuthSession | null {
  const stored = window.localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    const session = JSON.parse(stored) as StoredSession
    if (session.lastActivityAt && Date.now() - session.lastActivityAt >= SESSION_TTL_MS) {
      window.localStorage.removeItem(SESSION_KEY)
      window.localStorage.removeItem('pamsimas.admin.token')
      return null
    }
    return session
  } catch { return null }
}

export function touchSession() {
  const stored = window.localStorage.getItem(SESSION_KEY)
  if (!stored) return
  try {
    const session = JSON.parse(stored) as StoredSession
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, lastActivityAt: Date.now() }))
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
  }
}

export async function validateSession(): Promise<AuthSession> {
  const session = getSession()
  if (!session) throw new Error('Sesi login tidak tersedia.')
  if (appEnvironment.useMockApi) return session

  const response = await fetch(`${appEnvironment.apiBaseUrl}/auth/me`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${session.token}` },
  })
  if (!response.ok) throw new Error('Sesi login sudah berakhir.')
  const payload = await response.json() as { data: { email?: string; name?: string; role: AppRole; status?: string } }
  if (payload.data.status !== 'aktif') throw new Error('Akun sudah tidak aktif.')
  const validatedSession = { ...session, role: payload.data.role, user: payload.data, lastActivityAt: Date.now() }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(validatedSession))
  return validatedSession
}

export function logout() {
  const session = getSession()
  if (!appEnvironment.useMockApi && session?.token) {
    void fetch(`${appEnvironment.apiBaseUrl}/auth/logout`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${session.token}` },
      method: 'POST',
    }).catch(() => undefined)
  }
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem('pamsimas.admin.token')
}
