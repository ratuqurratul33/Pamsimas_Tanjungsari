import type { Customer } from '../../types'
import { fallbackData } from '../../modules/admin/data/mockData'
import type { CustomerRepository } from './customerRepository'

const CUSTOMER_STORAGE_KEY = 'pamsimas.mock.customers.v1'

export function readMockCustomers(): Customer[] {
  const stored = window.localStorage.getItem(CUSTOMER_STORAGE_KEY)

  if (!stored) {
    const seed = structuredClone(fallbackData.customers)
    window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(seed))
    return seed
  }

  try {
    return JSON.parse(stored) as Customer[]
  } catch {
    window.localStorage.removeItem(CUSTOMER_STORAGE_KEY)
    return readMockCustomers()
  }
}

export function writeMockCustomers(customers: Customer[]) {
  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers))
}

export const mockCustomerRepository: CustomerRepository = {
  async list() {
    return readMockCustomers().map((customer) => ({ ...customer }))
  },
  async create(customer) {
    const customers = readMockCustomers()
    if (customers.some((item) => item.id === customer.id)) throw new Error(`ID pelanggan ${customer.id} sudah digunakan.`)
    const nextCustomer = { ...customer }
    writeMockCustomers([nextCustomer, ...customers])
    return nextCustomer
  },
  async listPage(input) {
    const query = input.search?.toLowerCase() ?? ''
    const customers = readMockCustomers()
    const filtered = customers.filter((customer) => {
      const matchesSearch = !query || [customer.id, customer.name, customer.address, customer.area].join(' ').toLowerCase().includes(query)
      const matchesDusun = !input.dusunId || customer.dusunId === input.dusunId
      const matchesStatus = !input.status || customer.status === input.status
      return matchesSearch && matchesDusun && matchesStatus
    })
    const offset = (input.page - 1) * input.perPage
    return {
      data: filtered.slice(offset, offset + input.perPage),
      page: input.page,
      perPage: input.perPage,
      summary: {
        active: customers.filter((customer) => customer.status === 'Aktif').length,
        attention: customers.filter((customer) => customer.status !== 'Aktif').length,
        total: customers.length,
      },
      total: filtered.length,
    }
  },
  async update(customer) {
    const customers = readMockCustomers()
    if (!customers.some((item) => item.id === customer.id)) throw new Error('Pelanggan yang akan diubah tidak ditemukan.')
    const nextCustomer = { ...customer }
    writeMockCustomers(customers.map((item) => item.id === nextCustomer.id ? nextCustomer : item))
    return nextCustomer
  },
  async remove(customerId) {
    writeMockCustomers(readMockCustomers().filter((item) => item.id !== customerId))
  },
}

export function resetMockCustomers() {
  window.localStorage.removeItem(CUSTOMER_STORAGE_KEY)
}
