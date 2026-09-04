import { appEnvironment } from '../config/environment'
import type { CustomerRepository } from './customerRepository'
import { mockCustomerRepository } from './mockApiService'
import { realCustomerRepository } from './realApiService'
import { fieldRepository } from './fieldRepository'

export const apiService: { customers: CustomerRepository; field: typeof fieldRepository } = { customers: appEnvironment.useMockApi ? mockCustomerRepository : realCustomerRepository, field: fieldRepository }
export const apiModeLabel = appEnvironment.useMockApi ? 'Simulasi lokal' : 'Backend Laravel'
