export type DepositStatus = 'pending' | 'verified' | 'rejected'
export type CashTransactionType = 'income' | 'expense' | 'transfer' | 'adjustment'
export type CashTransactionStatus = 'posted' | 'voided'
export type ExpenseStatus = 'draft' | 'posted' | 'rejected' | 'voided'
export type ExpensePaymentMethod = 'cash' | 'bank' | 'qris'

export interface Deposit {
  id: number
  deposit_number: string
  officer: { id: number; code?: string; name: string }
  period: string
  submitted_at: string
  received_at: string | null
  digital_total: number
  physical_total: number | null
  discrepancy: number | null
  status: DepositStatus
  payment_summary: { count: number; cash: number; qris: number }
  payments?: DepositPayment[]
  note?: string | null
  verified_at?: string | null
}

export interface DepositPayment {
  id: string
  customer_id: string
  customer_name: string
  total_usage: number
  bill_amount: number
  method: 'Tunai' | 'QRIS'
  status: 'pending' | 'verified' | 'rejected'
  customer_area?: string
  payment_date?: string
  proof_name?: string
  proof_preview?: string
  qris_proof_name?: string
  qris_proof_preview?: string
  receipt_number?: string
}

export interface CashTransaction {
  id: number
  account_id: number
  type: CashTransactionType
  amount: number
  description: string
  source_type: 'officer_deposit' | 'expense' | 'manual_adjustment' | 'transfer'
  source_id: number
  status: CashTransactionStatus
  occurred_at: string
  created_by: { id: number; name: string }
}

export interface Expense {
  id: number
  expense_date: string
  category: string
  description: string
  vendor?: string | null
  amount: number
  payment_method: ExpensePaymentMethod
  cash_account_id: number
  reference_number?: string | null
  proof_name?: string | null
  proof_preview?: string | null
  status: ExpenseStatus
  is_public: boolean
  cash_transaction_id: number | null
  created_by: { id: number; name: string }
  posted_at?: string | null
}

export interface VerifyDepositPayload {
  decision?: 'verified' | 'rejected'
  physical_total: number
  cash_counted?: number
  qris_confirmed?: number
  note?: string
}

export interface PostExpensePayload {
  note?: string
}

export interface VerifyDepositResult {
  deposit: Deposit
  cash_transactions: CashTransaction[]
}

export interface PostExpenseResult {
  expense: Expense
  cash_transaction: CashTransaction
}

export interface CashAccount {
  id: number
  name: string
}

export interface CreateExpensePayload {
  expense_date: string
  category: string
  description: string
  vendor?: string | null
  amount: number
  payment_method: ExpensePaymentMethod
  cash_account_id: number
  reference_number?: string | null
  proof_name?: string | null
  proof_preview?: string | null
  proof_file?: File | null
  is_public?: boolean
}

export interface UpdateExpensePayload {
  amount?: number
  category?: string
  description?: string
  expense_date?: string
  is_public?: boolean
  proof_file?: File | null
  proof_name?: string | null
  proof_preview?: string | null
  reference_number?: string | null
  vendor?: string | null
}

export interface CreateCashIncomePayload {
  account_id: number
  amount: number
  description: string
  occurred_at: string
  source_label?: string
  is_opening_balance?: boolean
}

export interface VoidExpenseResult {
  expense: Expense
  cash_transaction: CashTransaction
}

export interface MonthlyReport {
  period: string
  opening_balance: number
  income_total: number
  expense_total: number
  closing_balance: number
  discrepancy_total: number
  verified_deposit_count: number
  income_rows: Array<{ date: string; description: string; amount: number }>
  expense_rows: Array<{ date: string; description: string; category: string; amount: number }>
}

export interface FieldDepositInput {
  id: string
  date: string
  period: string
  customerCount: number
  cash: number
  qris: number
  status: 'Belum Diserahkan' | 'Menunggu Verifikasi' | 'Terverifikasi'
  payments?: Array<Omit<DepositPayment, 'id' | 'status'>>
}

const DEPOSITS_KEY = 'pamsimas.mock.finance.deposits.v2'
const CASH_TRANSACTIONS_KEY = 'pamsimas.mock.finance.cash_transactions.v2'
const EXPENSES_KEY = 'pamsimas.mock.finance.expenses.v1'
const SHARED_CUSTOMERS_KEY = 'pamsimas.mock.customers.v1'
const FIELD_CUSTOMERS_KEY = 'pamsimas.mock.field.customers.v1'
const MAIN_CASH_ACCOUNT_ID = 1
const QRIS_CASH_ACCOUNT_ID = 2
const MOCK_ADMIN = { id: 1, name: 'Admin PAMSIMAS' }

const CASH_ACCOUNTS: CashAccount[] = [
  { id: MAIN_CASH_ACCOUNT_ID, name: 'Kas Tunai' },
  { id: QRIS_CASH_ACCOUNT_ID, name: 'Kas QRIS' },
]

const seedDeposits: Deposit[] = [
  {
    id: 501,
    deposit_number: 'SET-2026-08-000501',
    officer: { id: 12, code: 'PTG-002', name: 'Budi Santoso' },
    period: '2026-08',
    submitted_at: '2026-08-19T09:00:00Z',
    received_at: '2026-08-19T09:15:00Z',
    digital_total: 148000,
    physical_total: null,
    discrepancy: null,
    status: 'pending',
    payment_summary: { count: 5, cash: 120000, qris: 28000 },
    payments: [
      { id: 'PAY-202608-001', bill_amount: 30000, customer_id: 'PEL-2023-001', customer_name: 'Kamaludin', method: 'Tunai', status: 'pending', total_usage: 10 },
      { id: 'PAY-202608-002', bill_amount: 25000, customer_id: 'PEL-2023-002', customer_name: 'Asep Soprian', method: 'Tunai', status: 'pending', total_usage: 8 },
      { id: 'PAY-202608-003', bill_amount: 28000, customer_id: 'PEL-2023-003', customer_name: 'Wiwin', method: 'QRIS', status: 'pending', total_usage: 9 },
      { id: 'PAY-202608-004', bill_amount: 35000, customer_id: 'PEL-2023-004', customer_name: 'Hasanah', method: 'Tunai', status: 'pending', total_usage: 12 },
      { id: 'PAY-202608-005', bill_amount: 30000, customer_id: 'PEL-2023-005', customer_name: 'Dadan', method: 'QRIS', status: 'pending', total_usage: 10 },
    ],
  },
  {
    id: 502,
    deposit_number: 'SET-2026-08-000502',
    officer: { id: 11, code: 'PTG-001', name: 'Asep Rahmat' },
    period: '2026-08',
    submitted_at: '2026-08-20T06:30:00Z',
    received_at: null,
    digital_total: 246000,
    physical_total: null,
    discrepancy: null,
    status: 'pending',
    payment_summary: { count: 4, cash: 163000, qris: 83000 },
    payments: [
      { id: 'PAY-202608-011', bill_amount: 83000, customer_id: 'PAM-2608-001', customer_name: 'Kamaludin', method: 'QRIS', status: 'pending', total_usage: 26, proof_name: 'kwitansi-kamaludin.jpg', qris_proof_name: 'qris-kamaludin.jpg' },
      { id: 'PAY-202608-012', bill_amount: 32000, customer_id: 'PAM-2608-002', customer_name: 'Asep Sopian', method: 'Tunai', status: 'pending', total_usage: 9, proof_name: 'kwitansi-asep.jpg' },
      { id: 'PAY-202608-013', bill_amount: 80000, customer_id: 'PAM-2608-003', customer_name: 'Wiwin', method: 'Tunai', status: 'pending', total_usage: 25, proof_name: 'kwitansi-wiwin.jpg' },
      { id: 'PAY-202608-014', bill_amount: 51000, customer_id: 'PAM-2608-006', customer_name: 'Agus Suherman', method: 'Tunai', status: 'pending', total_usage: 16, proof_name: 'kwitansi-agus.jpg' },
    ],
  },
]

const seedCashTransactions: CashTransaction[] = []
const seedExpenses: Expense[] = [
  {
    id: 7001,
    expense_date: '2026-08-19',
    category: 'Pemeliharaan',
    description: 'Pembelian pipa PVC 2 inch',
    vendor: 'Toko Bangunan Maju',
    amount: 350000,
    payment_method: 'cash',
    cash_account_id: MAIN_CASH_ACCOUNT_ID,
    reference_number: 'NOTA-0891',
    status: 'draft',
    is_public: false,
    cash_transaction_id: null,
    created_by: { ...MOCK_ADMIN },
    posted_at: null,
  },
]

function read<T>(key: string, seed: T): T {
  const stored = window.localStorage.getItem(key)

  if (!stored) {
    window.localStorage.setItem(key, JSON.stringify(seed))
    return structuredClone(seed)
  }

  try {
    return JSON.parse(stored) as T
  } catch {
    window.localStorage.setItem(key, JSON.stringify(seed))
    return structuredClone(seed)
  }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function now() {
  return new Date().toISOString()
}

function nextId(records: Array<{ id: number }>) {
  return records.reduce((largest, record) => Math.max(largest, record.id), 0) + 1
}

function assertPositiveAmount(amount: number, field: string) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${field} harus berupa nominal Rupiah integer dan tidak boleh negatif.`)
  }
}

export function listDeposits(): Deposit[] {
  return read(DEPOSITS_KEY, seedDeposits).map((deposit) => ({
    ...deposit,
    officer: { ...deposit.officer },
    payment_summary: { ...deposit.payment_summary },
    payments: deposit.payments?.map((payment) => ({ ...payment })) ?? buildFallbackPayments(deposit),
  }))
}

export function registerFieldDeposit(input: FieldDepositInput): Deposit {
  const deposits = read(DEPOSITS_KEY, seedDeposits)
  const numericId = Number(input.id.replace(/\D/g, '')) || nextId(deposits)
  const existing = deposits.find((deposit) => deposit.id === numericId)
  if (existing) return existing

  const submittedAt = now()
  const deposit: Deposit = {
    id: numericId,
    deposit_number: `SET-${input.period.replace('-', '')}-${String(numericId).padStart(6, '0')}`,
    officer: { id: 12, code: 'PTG-002', name: 'Budi Santoso' },
    period: input.period,
    submitted_at: submittedAt,
    received_at: input.status === 'Belum Diserahkan' ? null : submittedAt,
    digital_total: input.cash + input.qris,
    physical_total: input.status === 'Terverifikasi' ? input.cash + input.qris : null,
    discrepancy: input.status === 'Terverifikasi' ? 0 : null,
    status: input.status === 'Terverifikasi' ? 'verified' : 'pending',
    payment_summary: { count: input.customerCount, cash: input.cash, qris: input.qris },
    payments: input.payments?.map((payment, index) => ({
      ...payment,
      id: `PAY-${numericId}-${String(index + 1).padStart(3, '0')}`,
      status: 'pending' as const,
    })) ?? buildSyntheticPayments(numericId, input.customerCount, input.cash, input.qris),
  }

  write(DEPOSITS_KEY, [deposit, ...deposits])
  return deposit
}

export function listCashTransactions(): CashTransaction[] {
  return read(CASH_TRANSACTIONS_KEY, seedCashTransactions).map((transaction) => ({ ...transaction, created_by: { ...transaction.created_by } }))
}

export function listExpenses(): Expense[] {
  return read(EXPENSES_KEY, seedExpenses).map((expense) => ({ ...expense, created_by: { ...expense.created_by } }))
}

export function listCashAccounts(): CashAccount[] {
  return CASH_ACCOUNTS.map((account) => ({ ...account }))
}

function applyBalance(balance: number, transaction: CashTransaction) {
  if (transaction.status !== 'posted') return balance
  if (transaction.type === 'income' || transaction.type === 'adjustment' || transaction.type === 'transfer') return balance + transaction.amount
  if (transaction.type === 'expense') return balance - transaction.amount
  return balance
}

export function getCashBalance(accountId: number): number {
  return listCashTransactions().reduce((balance, transaction) => transaction.account_id === accountId ? applyBalance(balance, transaction) : balance, 0)
}

export function getMainCashBalance(): number {
  return CASH_ACCOUNTS.reduce((total, account) => total + getCashBalance(account.id), 0)
}

export function createCashTransfer(fromAccountId: number, toAccountId: number, amount: number, description: string): CashTransaction[] {
  assertPositiveAmount(amount, 'amount')
  if (fromAccountId === toAccountId) throw new Error('Akun asal dan tujuan transfer tidak boleh sama.')
  if (amount > getCashBalance(fromAccountId)) throw new Error('Saldo akun asal tidak mencukupi untuk transfer ini.')

  const transactions = read(CASH_TRANSACTIONS_KEY, seedCashTransactions)
  const occurredAt = now()
  let nextTransactionId = nextId(transactions)
  const sourceId = nextTransactionId

  const outgoing: CashTransaction = {
    id: nextTransactionId++,
    account_id: fromAccountId,
    type: 'expense',
    amount,
    description: `Transfer keluar: ${description}`,
    source_type: 'transfer',
    source_id: sourceId,
    status: 'posted',
    occurred_at: occurredAt,
    created_by: { ...MOCK_ADMIN },
  }
  const incoming: CashTransaction = {
    id: nextTransactionId++,
    account_id: toAccountId,
    type: 'income',
    amount,
    description: `Transfer masuk: ${description}`,
    source_type: 'transfer',
    source_id: sourceId,
    status: 'posted',
    occurred_at: occurredAt,
    created_by: { ...MOCK_ADMIN },
  }

  write(CASH_TRANSACTIONS_KEY, [...transactions, outgoing, incoming])
  return [outgoing, incoming]
}

export function createCashIncome(payload: CreateCashIncomePayload): CashTransaction {
  assertPositiveAmount(payload.amount, 'amount')

  const transactions = read(CASH_TRANSACTIONS_KEY, seedCashTransactions)
  if (payload.is_opening_balance && transactions.some((item) => item.account_id === payload.account_id && item.type === 'adjustment' && item.status === 'posted')) {
    throw new Error('Saldo awal akun ini sudah pernah ditetapkan dan tidak dapat diinput ulang.')
  }
  const transaction: CashTransaction = {
    id: nextId(transactions),
    account_id: payload.account_id,
    amount: payload.amount,
    created_by: { ...MOCK_ADMIN },
    description: payload.description,
    occurred_at: payload.occurred_at ? new Date(payload.occurred_at).toISOString() : now(),
    source_id: 0,
    source_type: 'manual_adjustment',
    status: 'posted',
    type: payload.is_opening_balance ? 'adjustment' : 'income',
  }

  write(CASH_TRANSACTIONS_KEY, [...transactions, transaction])
  return transaction
}

export function updateDepositPaymentStatus(depositId: number, paymentId: string, status: DepositPayment['status']): Deposit {
  const deposits = read(DEPOSITS_KEY, seedDeposits)
  const deposit = deposits.find((item) => item.id === depositId)
  if (!deposit) throw new Error(`Setoran ${depositId} tidak ditemukan.`)

  const payments = (deposit.payments ?? buildFallbackPayments(deposit)).map((payment) => payment.id === paymentId ? { ...payment, status } : payment)
  const updatedDeposit = { ...deposit, payments }
  write(DEPOSITS_KEY, deposits.map((item) => item.id === depositId ? updatedDeposit : item))
  return updatedDeposit
}

export function verifyDeposit(id: number, payload: VerifyDepositPayload): VerifyDepositResult {
  assertPositiveAmount(payload.physical_total, 'physical_total')

  const deposits = read(DEPOSITS_KEY, seedDeposits)
  const transactions = read(CASH_TRANSACTIONS_KEY, seedCashTransactions)
  const deposit = deposits.find((item) => item.id === id)

  if (!deposit) throw new Error(`Setoran ${id} tidak ditemukan.`)
  if (deposit.status !== 'pending') throw new Error('Setoran hanya dapat diverifikasi dari status pending.')
  const decision = payload.decision ?? 'verified'
  const discrepancy = payload.physical_total - deposit.digital_total
  const verifiedAt = now()
  const reviewedPayments = (deposit.payments ?? buildFallbackPayments(deposit)).map((payment) => {
    if (decision === 'rejected') return { ...payment, status: 'rejected' as const }
    return payment.status === 'rejected' ? payment : { ...payment, status: 'verified' as const }
  })
  const hasRejectedPayment = reviewedPayments.some((payment) => payment.status === 'rejected')
  const finalStatus: DepositStatus = decision === 'rejected' ? 'rejected' : hasRejectedPayment ? 'pending' : 'verified'
  const updatedDeposit: Deposit = {
    ...deposit,
    discrepancy,
    note: payload.note ?? null,
    payments: reviewedPayments,
    physical_total: payload.physical_total,
    status: finalStatus,
    verified_at: verifiedAt,
  }

  if (decision === 'rejected') {
    write(DEPOSITS_KEY, deposits.map((item) => item.id === id ? updatedDeposit : item))
    return { deposit: updatedDeposit, cash_transactions: [] }
  }

  if (hasRejectedPayment) {
    write(DEPOSITS_KEY, deposits.map((item) => item.id === id ? updatedDeposit : item))
    return { deposit: updatedDeposit, cash_transactions: [] }
  }

  const duplicateTransaction = transactions.find((transaction) => transaction.source_type === 'officer_deposit' && transaction.source_id === id && transaction.status === 'posted')
  if (duplicateTransaction) throw new Error('Setoran ini sudah memiliki transaksi kas yang tercatat.')

  const cashRatio = deposit.digital_total > 0 ? deposit.payment_summary.cash / deposit.digital_total : 1
  const cashAmount = Math.round(payload.physical_total * cashRatio)
  const qrisAmount = payload.physical_total - cashAmount

  let nextTransactionId = nextId(transactions)
  const newTransactions: CashTransaction[] = []

  if (cashAmount > 0) {
    newTransactions.push({
      id: nextTransactionId++,
      account_id: MAIN_CASH_ACCOUNT_ID,
      type: 'income',
      amount: cashAmount,
      description: `Setoran tunai petugas ${deposit.officer.name} periode ${deposit.period}`,
      source_type: 'officer_deposit',
      source_id: id,
      status: 'posted',
      occurred_at: verifiedAt,
      created_by: { ...MOCK_ADMIN },
    })
  }

  if (qrisAmount > 0) {
    newTransactions.push({
      id: nextTransactionId++,
      account_id: QRIS_CASH_ACCOUNT_ID,
      type: 'income',
      amount: qrisAmount,
      description: `Setoran QRIS petugas ${deposit.officer.name} periode ${deposit.period}`,
      source_type: 'officer_deposit',
      source_id: id,
      status: 'posted',
      occurred_at: verifiedAt,
      created_by: { ...MOCK_ADMIN },
    })
  }

  write(DEPOSITS_KEY, deposits.map((item) => item.id === id ? updatedDeposit : item))
  write(CASH_TRANSACTIONS_KEY, [...transactions, ...newTransactions])
  markCustomersVerified(reviewedPayments)
  return { deposit: updatedDeposit, cash_transactions: newTransactions }
}

function markCustomersVerified(payments: DepositPayment[]) {
  const customerIds = new Set(payments.filter((payment) => payment.status === 'verified').map((payment) => payment.customer_id))
  if (customerIds.size === 0) return

  try {
    const customers = JSON.parse(window.localStorage.getItem(SHARED_CUSTOMERS_KEY) ?? '[]') as Array<Record<string, unknown>>
    write(SHARED_CUSTOMERS_KEY, customers.map((customer) => customerIds.has(String(customer.id))
      ? { ...customer, paymentStatus: 'Lunas', status: 'Aktif' }
      : customer))
  } catch {
    // Repository pelanggan akan memulihkan seed bila data lokal tidak valid.
  }

  try {
    const fieldCustomers = JSON.parse(window.localStorage.getItem(FIELD_CUSTOMERS_KEY) ?? '[]') as Array<Record<string, unknown>>
    write(FIELD_CUSTOMERS_KEY, fieldCustomers.map((customer) => customerIds.has(String(customer.id))
      ? { ...customer, billStatus: 'Lunas', depositStatus: 'Terverifikasi' }
      : customer))
  } catch {
    // Repository petugas akan memulihkan seed bila data lokal tidak valid.
  }
}

export function postExpense(id: number, _payload: PostExpensePayload = {}): PostExpenseResult {
  const expenses = read(EXPENSES_KEY, seedExpenses)
  const transactions = read(CASH_TRANSACTIONS_KEY, seedCashTransactions)
  const expense = expenses.find((item) => item.id === id)

  if (!expense) throw new Error(`Pengeluaran ${id} tidak ditemukan.`)
  if (expense.status !== 'draft' && expense.status !== 'voided' && expense.status !== 'rejected') throw new Error('Pengeluaran hanya dapat diposting dari status draft, ditolak, atau dibatalkan.')
  assertPositiveAmount(expense.amount, 'amount')
  if (expense.amount > getCashBalance(expense.cash_account_id)) throw new Error('Saldo kas akun ini tidak mencukupi untuk pengeluaran ini.')

  const duplicateTransaction = transactions.find((transaction) => transaction.source_type === 'expense' && transaction.source_id === id && transaction.status === 'posted')
  if (duplicateTransaction && expense.status === 'draft') throw new Error('Pengeluaran ini sudah memiliki transaksi kas yang tercatat.')

  const postedAt = now()
  const transaction: CashTransaction = {
    id: nextId(transactions),
    account_id: expense.cash_account_id,
    type: 'expense',
    amount: expense.amount,
    description: expense.description,
    source_type: 'expense',
    source_id: id,
    status: 'posted',
    occurred_at: postedAt,
    created_by: { ...MOCK_ADMIN },
  }
  const updatedExpense: Expense = { ...expense, cash_transaction_id: transaction.id, posted_at: postedAt, status: 'posted' }

  write(EXPENSES_KEY, expenses.map((item) => item.id === id ? updatedExpense : item))
  write(CASH_TRANSACTIONS_KEY, [...transactions, transaction])
  return { expense: updatedExpense, cash_transaction: transaction }
}

export function getDepositById(id: number): Deposit | undefined {
  return listDeposits().find((deposit) => deposit.id === id)
}

export function createExpense(payload: CreateExpensePayload): Expense {
  const expenses = read(EXPENSES_KEY, seedExpenses)
  assertPositiveAmount(payload.amount, 'amount')

  const expense: Expense = {
    id: nextId(expenses),
    expense_date: payload.expense_date,
    category: payload.category,
    description: payload.description,
    vendor: payload.vendor ?? null,
    amount: payload.amount,
    payment_method: payload.payment_method,
    cash_account_id: payload.cash_account_id,
    reference_number: payload.reference_number ?? null,
    proof_name: payload.proof_name ?? null,
    proof_preview: payload.proof_preview ?? null,
    status: 'draft',
    is_public: payload.is_public ?? false,
    cash_transaction_id: null,
    created_by: { ...MOCK_ADMIN },
    posted_at: null,
  }

  write(EXPENSES_KEY, [expense, ...expenses])
  return expense
}

export function updateExpense(id: number, payload: UpdateExpensePayload): Expense {
  const expenses = read(EXPENSES_KEY, seedExpenses)
  const transactions = read(CASH_TRANSACTIONS_KEY, seedCashTransactions)
  const expense = expenses.find((item) => item.id === id)
  if (!expense) throw new Error(`Pengeluaran ${id} tidak ditemukan.`)

  const newAmount = payload.amount ?? expense.amount
  assertPositiveAmount(newAmount, 'amount')
  const delta = newAmount - expense.amount

  let nextTransactions = transactions
  if (delta !== 0 && expense.cash_transaction_id) {
    if (delta > 0 && delta > getCashBalance(expense.cash_account_id)) {
      throw new Error('Saldo kas akun ini tidak mencukupi untuk perubahan nominal ini.')
    }
    nextTransactions = transactions.map((transaction) =>
      transaction.id === expense.cash_transaction_id ? { ...transaction, amount: newAmount } : transaction,
    )
  }

  const updatedExpense: Expense = {
    ...expense,
    amount: newAmount,
    category: payload.category ?? expense.category,
    description: payload.description ?? expense.description,
    expense_date: payload.expense_date ?? expense.expense_date,
    is_public: payload.is_public ?? expense.is_public,
    proof_name: payload.proof_name ?? expense.proof_name,
    proof_preview: payload.proof_preview ?? expense.proof_preview,
    reference_number: payload.reference_number ?? expense.reference_number,
    vendor: payload.vendor ?? expense.vendor,
  }

  write(EXPENSES_KEY, expenses.map((item) => item.id === id ? updatedExpense : item))
  if (nextTransactions !== transactions) write(CASH_TRANSACTIONS_KEY, nextTransactions)

  return updatedExpense
}

export function voidExpense(id: number): VoidExpenseResult {
  const expenses = read(EXPENSES_KEY, seedExpenses)
  const transactions = read(CASH_TRANSACTIONS_KEY, seedCashTransactions)
  const expense = expenses.find((item) => item.id === id)

  if (!expense) throw new Error(`Pengeluaran ${id} tidak ditemukan.`)
  if (expense.status !== 'posted') throw new Error('Pengeluaran hanya dapat dibatalkan dari status posted.')

  const reversal: CashTransaction = {
    id: nextId(transactions),
    account_id: expense.cash_account_id,
    type: 'income',
    amount: expense.amount,
    description: `Pembalikan pengeluaran: ${expense.description}`,
    source_type: 'expense',
    source_id: id,
    status: 'posted',
    occurred_at: now(),
    created_by: { ...MOCK_ADMIN },
  }
  const updatedExpense: Expense = { ...expense, status: 'voided' }

  write(EXPENSES_KEY, expenses.map((item) => item.id === id ? updatedExpense : item))
  write(CASH_TRANSACTIONS_KEY, [...transactions, reversal])
  return { expense: updatedExpense, cash_transaction: reversal }
}

function buildFallbackPayments(deposit: Deposit): DepositPayment[] {
  return buildSyntheticPayments(deposit.id, deposit.payment_summary.count, deposit.payment_summary.cash, deposit.payment_summary.qris, deposit.status)
}

function buildSyntheticPayments(depositId: number, count: number, cash: number, qris: number, depositStatus: DepositStatus = 'pending'): DepositPayment[] {
  const total = cash + qris
  const safeCount = Math.max(count, 1)
  const names = ['Kamaludin', 'Asep Soprian', 'Wiwin', 'Hasanah', 'Dadan', 'Siti Aliyah', 'Abdullah', 'Sarah', 'Dewi Mas']
  const rowStatus = depositStatus === 'verified' ? 'verified' : depositStatus === 'rejected' ? 'rejected' : 'pending'

  return Array.from({ length: safeCount }, (_, index) => {
    const isLast = index === safeCount - 1
    const amount = isLast ? total - Math.floor(total / safeCount) * (safeCount - 1) : Math.floor(total / safeCount)
    const method = index % 3 === 1 && qris > 0 ? 'QRIS' : 'Tunai'

    return {
      id: `PAY-${depositId}-${String(index + 1).padStart(3, '0')}`,
      bill_amount: Math.max(amount, 0),
      customer_id: `PEL-2026-${String(index + 1).padStart(3, '0')}`,
      customer_name: names[index % names.length],
      method,
      status: rowStatus,
      total_usage: 8 + (index % 9),
    }
  })
}

export function getMonthlyReport(period: string): MonthlyReport {
  const periodStart = new Date(`${period}-01T00:00:00.000Z`)
  const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1))

  const transactions = listCashTransactions().filter((transaction) => transaction.status === 'posted')
  const openingBalance = transactions.reduce((balance, transaction) => new Date(transaction.occurred_at) < periodStart ? applyBalance(balance, transaction) : balance, 0)
  const periodTransactions = transactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurred_at)
    return occurredAt >= periodStart && occurredAt < periodEnd
  })

  const incomeTotal = periodTransactions.filter((transaction) => transaction.type === 'income' || transaction.type === 'adjustment').reduce((total, transaction) => total + transaction.amount, 0)
  const expenseTotal = periodTransactions.filter((transaction) => transaction.type === 'expense').reduce((total, transaction) => total + transaction.amount, 0)

  const expenses = listExpenses().filter((expense) => expense.status === 'posted' && expense.expense_date.startsWith(period))
  const verifiedDeposits = listDeposits().filter((deposit) => deposit.status === 'verified' && deposit.verified_at && new Date(deposit.verified_at) >= periodStart && new Date(deposit.verified_at) < periodEnd)

  return {
    period,
    opening_balance: openingBalance,
    income_total: incomeTotal,
    expense_total: expenseTotal,
    closing_balance: openingBalance + incomeTotal - expenseTotal,
    discrepancy_total: verifiedDeposits.reduce((total, deposit) => total + (deposit.discrepancy ?? 0), 0),
    verified_deposit_count: verifiedDeposits.length,
    income_rows: periodTransactions
      .filter((transaction) => transaction.type === 'income' || transaction.type === 'adjustment')
      .map((transaction) => ({ date: transaction.occurred_at, description: transaction.description, amount: transaction.amount })),
    expense_rows: expenses.map((expense) => ({ date: expense.expense_date, description: expense.description, category: expense.category, amount: expense.amount })),
  }
}

export function resetFinanceMockData() {
  window.localStorage.removeItem(DEPOSITS_KEY)
  window.localStorage.removeItem(CASH_TRANSACTIONS_KEY)
  window.localStorage.removeItem(EXPENSES_KEY)
}
