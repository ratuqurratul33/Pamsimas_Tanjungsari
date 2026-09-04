import { appEnvironment } from '../config/environment'
import { getRegionMonthlyStats, type RegionMonthlyStat } from '../../utils/regionStats'
import { listExpenses } from './financeMockRepository'
import { readMockCustomers } from './mockApiService'
import { apiRequest } from './apiClient'

export type PublicExpenseRow = {
  amount: number
  category: string
  description: string
  expense_date: string
  id: string
}

export type PublicTransparencyData = {
  expenses: PublicExpenseRow[]
  rows: RegionMonthlyStat[]
}

type LaravelTransparency = {
  recent_expenses: Array<Omit<PublicExpenseRow, 'id'>>
  regions: Array<{
    bill_total: number
    name: string
    paid: number
    percentage: number
    rts: Array<{
      bill_total: number
      customers?: Array<{ address: string; bill_amount: number; customer_id: string; customer_name: string; paid: boolean }>
      kampung: string
      paid: number
      percentage: number
      rt: string
      rw: string
      total: number
    }>
    total: number
  }>
}

export async function getPublicTransparency(month: string, year: string): Promise<PublicTransparencyData> {
  if (appEnvironment.useMockApi) {
    return {
      expenses: listExpenses()
        .filter((expense) => expense.status === 'posted' && expense.is_public && expense.expense_date.startsWith(`${year}-${month}`))
        .sort((left, right) => right.expense_date.localeCompare(left.expense_date))
        .slice(0, 6)
        .map((expense) => ({ ...expense, id: String(expense.id) })),
      rows: getRegionMonthlyStats(readMockCustomers(), monthName(Number(month)), year),
    }
  }

  const response = await apiRequest<{ data: LaravelTransparency }>(`/publik/transparency?month=${Number(month)}&year=${year}`, { authenticated: false })
  return mapTransparency(response.data)
}

export async function getAdminTransparency(month: string, year: string): Promise<PublicTransparencyData> {
  if (appEnvironment.useMockApi) return getPublicTransparency(month, year)
  const response = await apiRequest<{ data: LaravelTransparency }>(`/admin/transparency?include_customers=1&month=${Number(month)}&year=${year}`)
  return mapTransparency(response.data)
}

function mapTransparency(data: LaravelTransparency): PublicTransparencyData {
  return {
    // Laravel's decimal:2 cast serializes amounts as strings (e.g. "27000.00")
    // to avoid float rounding — without Number(), formatRupiah/parseRupiah
    // downstream treat it as text and mangle both the display ("Rp27000.00")
    // and the summed total (the ".00" digits get concatenated in, inflating
    // it 100x).
    expenses: data.recent_expenses.map((expense, index) => ({ ...expense, amount: Number(expense.amount), id: `${expense.expense_date}-${index}` })),
    rows: data.regions.map((region) => ({
      billTotal: Number(region.bill_total),
      name: region.name,
      paid: region.paid,
      progress: region.percentage,
      rts: region.rts.map((rt) => ({
        billTotal: Number(rt.bill_total),
        customers: (rt.customers ?? []).map((customer) => ({
          billAmount: customer.bill_amount,
          customer: {
            address: customer.address,
            area: `${region.name} / ${rt.rw} / ${rt.rt} - ${rt.kampung}`,
            id: customer.customer_id,
            name: customer.customer_name,
            status: customer.paid ? 'Aktif' : 'Menunggak',
          },
          paid: customer.paid,
        })),
        kampung: rt.kampung,
        paid: rt.paid,
        progress: rt.percentage,
        rt: rt.rt,
        rw: rt.rw,
        total: rt.total,
      })),
      total: region.total,
    })),
  }
}

function monthName(month: number) {
  return ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][month - 1] ?? 'Januari'
}
