import type { Customer } from '../../types'

export type CustomerRepository = {
  list(signal?: AbortSignal): Promise<Customer[]>
  listPage(input: CustomerPageInput, signal?: AbortSignal): Promise<CustomerPageResult>
  create(customer: Customer): Promise<Customer>
  update(customer: Customer): Promise<Customer>
  remove(customerId: string): Promise<void>
}

export type CustomerPageInput = {
  dusunId?: number
  page: number
  perPage: number
  search?: string
  status?: Customer['status'] | ''
}

export type CustomerPageResult = {
  data: Customer[]
  page: number
  perPage: number
  summary: { active: number; attention: number; total: number }
  total: number
}
