import { appEnvironment } from '../config/environment'
import { getSession, logout } from './authService'

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean
  idempotencyKey?: string
}

export type LaravelPaginator<T> = {
  current_page?: number
  data: T[]
  last_page?: number
  per_page?: number
  total?: number
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    authenticated = true,
    idempotencyKey,
    headers: suppliedHeaders,
    ...init
  } = options
  const headers = new Headers(suppliedHeaders)
  headers.set('Accept', 'application/json')

  if (!(init.body instanceof FormData) && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (authenticated) {
    const token = getSession()?.token ?? window.localStorage.getItem('pamsimas.admin.token')
    if (!token || token.startsWith('mock-token-')) {
      throw new Error('Sesi login backend tidak tersedia. Silakan login kembali.')
    }
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

  let response: Response
  try {
    response = await fetch(`${appEnvironment.apiBaseUrl}${path}`, { ...init, headers })
  } catch {
    throw new Error('Backend tidak dapat dihubungi. Pastikan Laravel aktif atau gunakan VITE_USE_MOCK_API=true.')
  }

  if (response.status === 401 || response.status === 403) {
    // 401: the backend rejected the token itself — expired, revoked, or
    // (via EnsureTokenNotIdle) idle for 60+ minutes. 403: a stale/cross-tab
    // token authenticates fine but fails the backend's role check. Either
    // way the token is dead, so clear it once here instead of leaving every
    // call site to notice and repeat the same failure on its own.
    logout()
    const message = response.status === 401
      ? 'Sesi Anda telah berakhir. Silakan login kembali.'
      : 'Sesi login ini tidak memiliki akses ke fitur ini atau sudah tidak berlaku. Silakan login ulang.'
    window.dispatchEvent(new CustomEvent('pamsimas:session-invalid', { detail: message }))
    throw new Error(message)
  }

  if (!response.ok) throw new Error(await readApiError(response))
  if (response.status === 204) return undefined as T

  return await response.json() as T
}

/**
 * Fetches a binary file (e.g. a generated PDF) from an authenticated
 * endpoint. Kept separate from apiRequest() because that always parses the
 * response as JSON — a PDF response would fail there. Auth is a Bearer
 * token attached per-request (not a cookie session), so a plain <a href> or
 * window.open() straight at the API can't carry it; the caller must fetch
 * the bytes here first and open/print the resulting blob URL instead.
 */
export async function apiRequestBlob(path: string): Promise<Blob> {
  const token = getSession()?.token ?? window.localStorage.getItem('pamsimas.admin.token')
  if (!token || token.startsWith('mock-token-')) {
    throw new Error('Sesi login backend tidak tersedia. Silakan login kembali.')
  }

  let response: Response
  try {
    response = await fetch(`${appEnvironment.apiBaseUrl}${path}`, {
      headers: { Accept: 'application/pdf', Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('Backend tidak dapat dihubungi. Pastikan Laravel aktif atau gunakan VITE_USE_MOCK_API=true.')
  }

  if (response.status === 401 || response.status === 403) {
    logout()
    const message = response.status === 401
      ? 'Sesi Anda telah berakhir. Silakan login kembali.'
      : 'Sesi login ini tidak memiliki akses ke fitur ini atau sudah tidak berlaku. Silakan login ulang.'
    window.dispatchEvent(new CustomEvent('pamsimas:session-invalid', { detail: message }))
    throw new Error(message)
  }

  if (!response.ok) throw new Error(await readApiError(response))

  return await response.blob()
}

export function createIdempotencyKey(scope: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `fe-${scope}-${suffix}`
}

async function readApiError(response: Response) {
  try {
    const payload = await response.json() as {
      error?: { message?: string }
      errors?: Record<string, string[]>
      message?: string
    }
    const validationMessage = payload.errors ? Object.values(payload.errors).flat()[0] : undefined

    return validationMessage ?? payload.error?.message ?? payload.message ?? `API gagal (${response.status}).`
  } catch {
    return `API gagal (${response.status}).`
  }
}
