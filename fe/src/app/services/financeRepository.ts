import { appEnvironment } from '../config/environment'
import * as mock from './financeMockRepository'
import { financeRealRepository, type FinanceCashAccount } from './financeRealRepository'

export type {
  CashTransaction,
  CreateCashIncomePayload,
  CreateExpensePayload,
  Deposit,
  DepositPayment,
  Expense,
  MonthlyReport,
  PostExpenseResult,
  UpdateExpensePayload,
  VerifyDepositPayload,
  VerifyDepositResult,
  VoidExpenseResult,
} from './financeMockRepository'
export type { FinanceCashAccount }

export const financeRepository = appEnvironment.useMockApi ? {
  async createCashIncome(payload: mock.CreateCashIncomePayload) { return mock.createCashIncome(payload) },
  async createCashTransfer(fromAccountId: number, toAccountId: number, amount: number, description: string) { return mock.createCashTransfer(fromAccountId, toAccountId, amount, description) },
  async createExpense(payload: mock.CreateExpensePayload) { return mock.createExpense(payload) },
  async getDepositById(id: number) { return mock.getDepositById(id) },
  async getMonthlyReport(period: string) { return mock.getMonthlyReport(period) },
  async listCashAccounts(): Promise<FinanceCashAccount[]> {
    return mock.listCashAccounts().map((account) => ({
      balance: mock.getCashBalance(account.id),
      id: account.id,
      name: account.name,
      opening_balance: mock.listCashTransactions()
        .filter((transaction) => transaction.account_id === account.id && transaction.type === 'adjustment')
        .reduce((total, transaction) => total + transaction.amount, 0),
    }))
  },
  async listCashTransactions() { return mock.listCashTransactions() },
  async listDeposits() { return mock.listDeposits() },
  async listExpenses() { return mock.listExpenses() },
  async postExpense(id: number) { return mock.postExpense(id) },
  async updateExpense(id: number, payload: mock.UpdateExpensePayload) { return mock.updateExpense(id, payload) },
  async updateDepositPaymentStatus(depositId: number, paymentId: string, status: mock.DepositPayment['status']) { return mock.updateDepositPaymentStatus(depositId, paymentId, status) },
  async verifyDeposit(id: number, payload: mock.VerifyDepositPayload) { return mock.verifyDeposit(id, payload) },
  async voidExpense(id: number) { return mock.voidExpense(id) },
} : financeRealRepository
