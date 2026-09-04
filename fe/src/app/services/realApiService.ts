import type { Customer } from '../../types'
import { appEnvironment } from '../config/environment'
import { getSession } from './authService'
import type { CustomerPageInput, CustomerRepository } from './customerRepository'

type LaravelRegion = { id?: number; code?: string | null; kampung?: string | null; name?: string | null; parent?: LaravelRegion | null }
type LaravelCustomer = { address: string; customer_code: string; dusun?: LaravelRegion | null; dusun_id?: number | null; name: string; rt?: LaravelRegion | null; rt_id?: number | null; status: 'aktif' | 'menunggak' | 'nonaktif' }
type LaravelPaginator<T> = {
  current_page?: number
  data: T[]
  per_page?: number
  summary?: { active: number; attention: number; total: number }
  total?: number
}

const TOKEN_KEY = 'pamsimas.admin.token'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken()
  let response = await requestWithToken(path, token, init)
  if (response.status === 401) {
    window.localStorage.removeItem(TOKEN_KEY)
    response = await requestWithToken(path, await getToken(), init)
  }
  if (!response.ok) throw new Error(await readError(response))
  return await response.json() as T
}

async function requestWithToken(path: string, token: string, init: RequestInit) {
  return fetch(`${appEnvironment.apiBaseUrl}${path}`, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } })
}

async function getToken() {
  const existingToken = getSession()?.token ?? window.localStorage.getItem(TOKEN_KEY)
  if (existingToken) return existingToken
  throw new Error('Sesi backend tidak ditemukan. Silakan login kembali.')
}

async function readError(response: Response) {
  try {
    const payload = await response.json() as { message?: string; errors?: Record<string, string[]> }
    return payload.errors ? Object.values(payload.errors).flat()[0] ?? payload.message ?? `API gagal (${response.status})` : payload.message ?? `API gagal (${response.status})`
  } catch {
    return `API gagal (${response.status})`
  }
}

function mapCustomer(customer: LaravelCustomer): Customer {
  const dusun = customer.dusun?.name ?? 'Dusun belum dipilih'
  const rt = customer.rt?.code ?? customer.rt?.name ?? 'RT belum dipilih'
  const kampung = customer.rt?.kampung ?? '-'
  const rw = customer.rt?.parent?.code ?? customer.rt?.parent?.name
  return { address: customer.address, area: rw ? `${dusun} / ${rw} / ${rt} - ${kampung}` : `${dusun} / ${rt} - ${kampung}`, dusunId: customer.dusun_id ?? customer.dusun?.id, id: customer.customer_code, name: customer.name, rtId: customer.rt_id ?? customer.rt?.id, status: customer.status === 'aktif' ? 'Aktif' : customer.status === 'menunggak' ? 'Menunggak' : 'Nonaktif' }
}

function toPayload(customer: Customer) {
  return { address: customer.address, customer_code: customer.id, dusun_id: customer.dusunId, name: customer.name, rt_id: customer.rtId, status: customer.status === 'Aktif' ? 'aktif' : customer.status === 'Menunggak' ? 'menunggak' : 'nonaktif' }
}

export const realCustomerRepository: CustomerRepository = {
  async list(signal) { return (await request<LaravelPaginator<LaravelCustomer>>('/admin/customers?per_page=100', { signal })).data.map(mapCustomer) },
  async listPage(input, signal) {
    const params = customerPageParams(input)
    const response = await request<LaravelPaginator<LaravelCustomer>>(`/admin/customers?${params}`, { signal })
    return {
      data: response.data.map(mapCustomer),
      page: response.current_page ?? input.page,
      perPage: response.per_page ?? input.perPage,
      summary: response.summary ?? { active: 0, attention: 0, total: response.total ?? 0 },
      total: response.total ?? response.data.length,
    }
  },
  async create(customer) { return mapCustomer(await request<LaravelCustomer>('/admin/customers', { body: JSON.stringify(toPayload(customer)), method: 'POST' })) },
  async update(customer) { return mapCustomer(await request<LaravelCustomer>(`/admin/customers/${encodeURIComponent(customer.id)}`, { body: JSON.stringify(toPayload(customer)), method: 'PATCH' })) },
  async remove(customerId) { await request(`/admin/customers/${encodeURIComponent(customerId)}`, { method: 'DELETE' }) },
}

function customerPageParams(input: CustomerPageInput) {
  const params = new URLSearchParams({ page: String(input.page), per_page: String(input.perPage) })
  if (input.dusunId) params.set('dusun_id', String(input.dusunId))
  if (input.search) params.set('search', input.search)
  if (input.status) params.set('status', input.status === 'Aktif' ? 'aktif' : input.status === 'Menunggak' ? 'menunggak' : 'nonaktif')
  return params
}
