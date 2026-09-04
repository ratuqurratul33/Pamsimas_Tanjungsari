import type { Customer } from '../types'
import { listDeposits } from '../app/services/financeMockRepository'

export type RegionCustomerStat = { billAmount: number; customer: Customer; paid: boolean }
export type RegionRtStat = { billTotal: number; customers: RegionCustomerStat[]; kampung: string; paid: number; progress: number; rt: string; rw: string; total: number }
export type RegionMonthlyStat = { billTotal: number; name: string; paid: number; progress: number; rts: RegionRtStat[]; total: number }

const MONTH_ORDER = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function parseArea(area: string) {
  const [location = '', kampung = '-'] = area.split(' - ')
  const parts = location.split('/').map((part) => part.trim())
  return {
    dusun: parts.find((part) => part.startsWith('Dusun')) ?? 'Wilayah Lain',
    kampung,
    rt: parts.find((part) => part.startsWith('RT')) ?? 'RT -',
    rw: parts.find((part) => part.startsWith('RW')) ?? 'RW -',
  }
}

function resolvePaymentState(period: string) {
  const deposits = listDeposits().filter((deposit) => deposit.period === period)
  const paymentStates = new Map<string, 'pending' | 'verified' | 'rejected'>()
  const paymentAmounts = new Map<string, number>()

  deposits.flatMap((deposit) => deposit.payments ?? []).forEach((payment) => {
    const current = paymentStates.get(payment.customer_id)
    if (current !== 'verified' || payment.status === 'verified') {
      paymentStates.set(payment.customer_id, payment.status)
      paymentAmounts.set(payment.customer_id, payment.bill_amount)
    }
  })
  return { deposits, paymentAmounts, paymentStates }
}

/** Shared Admin/Public calculation. Only deposit payments verified by Admin count as paid. */
export function getRegionMonthlyStats(customers: Customer[], month: string, year: string): RegionMonthlyStat[] {
  const monthNumber = MONTH_ORDER.indexOf(month) + 1
  if (monthNumber < 1) return []

  const period = `${year}-${String(monthNumber).padStart(2, '0')}`
  const { deposits, paymentAmounts, paymentStates } = resolvePaymentState(period)
  const hasMeterInput = customers.some((customer) => customer.meterPeriod === period)
  if (!hasMeterInput && deposits.length === 0) return []

  const dusunGroups = new Map<string, Map<string, RegionCustomerStat[]>>()
  customers.filter((customer) => customer.status !== 'Nonaktif').forEach((customer) => {
    const area = parseArea(customer.area)
    const rtKey = `${area.rw}|${area.rt}|${area.kampung}`
    const rtGroups = dusunGroups.get(area.dusun) ?? new Map<string, RegionCustomerStat[]>()
    const rtCustomers = rtGroups.get(rtKey) ?? []
    rtCustomers.push({
      billAmount: paymentAmounts.get(customer.id) ?? (customer.meterPeriod === period ? customer.billAmount ?? 0 : 0),
      customer,
      paid: paymentStates.get(customer.id) === 'verified',
    })
    rtGroups.set(rtKey, rtCustomers)
    dusunGroups.set(area.dusun, rtGroups)
  })

  return Array.from(dusunGroups.entries()).map(([name, rtGroups]) => {
    const rts = Array.from(rtGroups.entries()).map(([key, regionCustomers]) => {
      const [rw, rt, kampung] = key.split('|')
      const paid = regionCustomers.filter((item) => item.paid).length
      const total = regionCustomers.length
      return {
        billTotal: regionCustomers.reduce((sum, item) => sum + item.billAmount, 0),
        customers: regionCustomers,
        kampung,
        paid,
        progress: total > 0 ? Math.round((paid / total) * 100) : 0,
        rt,
        rw,
        total,
      }
    }).sort((left, right) => `${left.rw}-${left.rt}`.localeCompare(`${right.rw}-${right.rt}`))
    const paid = rts.reduce((sum, item) => sum + item.paid, 0)
    const total = rts.reduce((sum, item) => sum + item.total, 0)
    return {
      billTotal: rts.reduce((sum, item) => sum + item.billTotal, 0),
      name,
      paid,
      progress: total > 0 ? Math.round((paid / total) * 100) : 0,
      rts,
      total,
    }
  }).sort((left, right) => left.name.localeCompare(right.name))
}

export function getTransparencyPeriod() {
  try {
    return JSON.parse(sessionStorage.getItem('pamsimas-transparency-period') ?? '') as { month: string; year: string }
  } catch {
    return { month: MONTH_ORDER[new Date().getMonth()], year: String(new Date().getFullYear()) }
  }
}
