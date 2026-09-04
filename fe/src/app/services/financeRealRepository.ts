import {
  type CashTransaction,
  type CreateCashIncomePayload,
  type CreateExpensePayload,
  type Deposit,
  type DepositPayment,
  type Expense,
  type MonthlyReport,
  type PostExpenseResult,
  type UpdateExpensePayload,
  type VerifyDepositPayload,
  type VerifyDepositResult,
  type VoidExpenseResult,
} from './financeMockRepository'
import { apiRequest, createIdempotencyKey, type LaravelPaginator } from './apiClient'

export type FinanceCashAccount = {
  balance: number
  currency?: string
  id: number
  name: string
  opening_balance: number
  type?: string
}

type DataResponse<T> = { data: T }
type LaravelMonthlyReport = {
  cash: {
    closing_balance: number
    expense_amount: number
    income_from_verified_deposits: number
    opening_balance: number
  }
  deposits: { discrepancy_amount: number; verified_count: number }
  expense_rows: MonthlyReport['expense_rows']
  income_rows: MonthlyReport['income_rows']
  period: string
}

export const financeRealRepository = {
  async listDeposits(): Promise<Deposit[]> {
    return (await apiRequest<LaravelPaginator<Deposit>>('/admin/deposits?per_page=100')).data
  },

  async getDepositById(id: number): Promise<Deposit | undefined> {
    try {
      return (await apiRequest<DataResponse<Deposit>>(`/admin/deposits/${id}`)).data
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) return undefined
      throw error
    }
  },

  async updateDepositPaymentStatus(depositId: number, paymentId: string, status: DepositPayment['status']): Promise<Deposit> {
    return (await apiRequest<DataResponse<Deposit>>(`/admin/deposits/${depositId}/payments/${paymentId}`, {
      body: JSON.stringify({ status }),
      idempotencyKey: createIdempotencyKey('deposit-payment-status'),
      method: 'PATCH',
    })).data
  },

  async verifyDeposit(id: number, payload: VerifyDepositPayload): Promise<VerifyDepositResult> {
    const response = await apiRequest<DataResponse<{ cash_transactions: CashTransaction[]; deposit: Deposit }>>(`/admin/deposits/${id}/verify`, {
      body: JSON.stringify({ ...payload, decision: payload.decision ?? 'verified' }),
      idempotencyKey: createIdempotencyKey('verify-deposit'),
      method: 'POST',
    })

    return response.data
  },

  async listCashAccounts(): Promise<FinanceCashAccount[]> {
    return (await apiRequest<DataResponse<FinanceCashAccount[]>>('/admin/cash-accounts')).data
  },

  async listCashTransactions(): Promise<CashTransaction[]> {
    return (await apiRequest<LaravelPaginator<CashTransaction>>('/admin/cash-transactions?per_page=100')).data
  },

  async createCashTransfer(fromAccountId: number, toAccountId: number, amount: number, description: string): Promise<CashTransaction[]> {
    const response = await apiRequest<DataResponse<CashTransaction[]>>('/admin/cash-transactions/transfer', {
      body: JSON.stringify({ amount, description, from_account_id: fromAccountId, occurred_at: new Date().toISOString(), to_account_id: toAccountId }),
      idempotencyKey: createIdempotencyKey('cash-transfer'),
      method: 'POST',
    })

    return response.data
  },

  async createCashIncome(payload: CreateCashIncomePayload): Promise<CashTransaction> {
    return (await apiRequest<DataResponse<CashTransaction>>('/admin/cash-transactions/income', {
      body: JSON.stringify(payload),
      idempotencyKey: createIdempotencyKey('cash-income'),
      method: 'POST',
    })).data
  },

  async listExpenses(): Promise<Expense[]> {
    return (await apiRequest<LaravelPaginator<Expense>>('/admin/expenses?per_page=100')).data
  },

  async createExpense(payload: CreateExpensePayload): Promise<Expense> {
    const form = new FormData()
    form.append('amount', String(payload.amount))
    form.append('cash_account_id', String(payload.cash_account_id))
    form.append('category', payload.category)
    form.append('description', payload.description)
    form.append('expense_date', payload.expense_date)
    form.append('payment_method', payload.payment_method)
    form.append('is_public', payload.is_public ? '1' : '0')
    if (payload.vendor) form.append('vendor', payload.vendor)
    if (payload.reference_number) form.append('reference_number', payload.reference_number)
    if (payload.proof_file) form.append('proof', payload.proof_file, payload.proof_file.name)

    return (await apiRequest<DataResponse<Expense>>('/admin/expenses', { body: form, method: 'POST' })).data
  },

  async updateExpense(id: number, payload: UpdateExpensePayload): Promise<Expense> {
    const form = new FormData()
    form.append('_method', 'PATCH')
    if (payload.amount !== undefined) form.append('amount', String(payload.amount))
    if (payload.category !== undefined) form.append('category', payload.category)
    if (payload.description !== undefined) form.append('description', payload.description)
    if (payload.expense_date !== undefined) form.append('expense_date', payload.expense_date)
    if (payload.is_public !== undefined) form.append('is_public', payload.is_public ? '1' : '0')
    if (payload.vendor !== undefined) form.append('vendor', payload.vendor ?? '')
    if (payload.reference_number !== undefined) form.append('reference_number', payload.reference_number ?? '')
    if (payload.proof_file) form.append('proof', payload.proof_file, payload.proof_file.name)

    return (await apiRequest<DataResponse<Expense>>(`/admin/expenses/${id}`, { body: form, method: 'POST' })).data
  },

  async postExpense(id: number): Promise<PostExpenseResult> {
    const response = await apiRequest<DataResponse<{ cash_transaction: CashTransaction; expense: Expense }>>(`/admin/expenses/${id}/post`, {
      body: JSON.stringify({}),
      idempotencyKey: createIdempotencyKey('post-expense'),
      method: 'POST',
    })

    return response.data
  },

  async voidExpense(id: number): Promise<VoidExpenseResult> {
    const response = await apiRequest<DataResponse<{ cash_transaction: CashTransaction; expense: Expense }>>(`/admin/expenses/${id}/void`, {
      body: JSON.stringify({ reason: 'Dibatalkan melalui dashboard admin.' }),
      idempotencyKey: createIdempotencyKey('void-expense'),
      method: 'POST',
    })

    return response.data
  },

  async getMonthlyReport(period: string): Promise<MonthlyReport> {
    const report = (await apiRequest<DataResponse<LaravelMonthlyReport>>(`/admin/reports/monthly?period=${encodeURIComponent(period)}`)).data

    return {
      closing_balance: report.cash.closing_balance,
      discrepancy_total: report.deposits.discrepancy_amount,
      expense_rows: report.expense_rows,
      expense_total: report.cash.expense_amount,
      income_rows: report.income_rows,
      income_total: report.cash.income_from_verified_deposits,
      opening_balance: report.cash.opening_balance,
      period: report.period,
      verified_deposit_count: report.deposits.verified_count,
    }
  },
}
