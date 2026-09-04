import { useEffect, useEffectEvent, useState, type FormEvent } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { financeRepository, type CashTransaction, type CreateCashIncomePayload, type FinanceCashAccount } from '../../../app/services/financeRepository'

export function CashPage({ notify }: { notify: (message: string) => void }) {
  const [accounts, setAccounts] = useState<FinanceCashAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState(1)
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7))

  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0]
  const accountTransactions = transactions
    .filter((transaction) => transaction.account_id === activeAccountId && transaction.status === 'posted')
    .filter((transaction) => !monthFilter || transaction.occurred_at.startsWith(monthFilter))
    .filter((transaction) => !query || transaction.description.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  const currentBalance = activeAccount?.balance ?? 0
  const openingBalance = activeAccount?.opening_balance ?? 0
  const income = accountTransactions.filter((transaction) => transaction.type === 'income').reduce((total, transaction) => total + transaction.amount, 0)
  const expense = accountTransactions.filter((transaction) => transaction.type === 'expense').reduce((total, transaction) => total + transaction.amount, 0)

  const loadInitialCash = useEffectEvent(refetch)
  useEffect(() => { void loadInitialCash() }, [])

  async function refetch() {
    try {
      const [nextAccounts, nextTransactions] = await Promise.all([
        financeRepository.listCashAccounts(),
        financeRepository.listCashTransactions(),
      ])
      setAccounts(nextAccounts)
      setTransactions(nextTransactions)
      if (!nextAccounts.some((account) => account.id === activeAccountId) && nextAccounts[0]) setActiveAccountId(nextAccounts[0].id)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Data akun kas gagal dimuat.')
    }
  }

  return (
    <>
      <PageHeader
        action={(
          <div className="button-group">
            <button className="ghost" onClick={() => setIsIncomeOpen(true)}>Tambah Pemasukan</button>
            <button className="primary" onClick={() => setIsTransferOpen(true)}>Pindahkan Dana</button>
          </div>
        )}
        title="Akun Kas"
      />
      <div className="tabs">
        {accounts.map((account) => (
          <button className={account.id === activeAccountId ? 'active' : ''} key={account.id} onClick={() => setActiveAccountId(account.id)}>
            {account.name}
          </button>
        ))}
      </div>
      <section className="filter-bar compact-filter">
        <label className="search-field full-search">
          <Icon name="search" />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Cari keterangan transaksi..." value={query} />
        </label>
        <input className="input-select compact-select" onChange={(event) => setMonthFilter(event.target.value)} type="month" value={monthFilter} />
      </section>
      <section className="stat-grid four cash-compact-cards">
        <StatCard stat={{ label: 'Saldo Awal', value: formatMoney(openingBalance), tone: 'blue' }} />
        <StatCard stat={{ label: 'Total Pemasukan', value: `+ ${formatMoney(income)}`, tone: 'blue' }} />
        <StatCard stat={{ label: 'Total Pengeluaran', value: `- ${formatMoney(expense)}`, tone: 'red' }} />
        <StatCard stat={{ label: 'Saldo Saat Ini', value: formatMoney(currentBalance), tone: 'blue' }} />
      </section>
      <TableCard footer={`Menampilkan ${accountTransactions.length > 0 ? 1 : 0}-${accountTransactions.length} dari ${accountTransactions.length} transaksi`} title={`Riwayat Transaksi ${activeAccount?.name ?? ''}`}>
        <thead>
          <tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th>Nominal</th></tr>
        </thead>
        <tbody>
          {accountTransactions.length === 0 && (
            <tr>
              <td className="empty-table-cell" colSpan={4}>Belum ada transaksi pada akun kas ini.</td>
            </tr>
          )}
          {accountTransactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{formatDateTime(transaction.occurred_at)}</td>
              <td>{typeLabel(transaction.type)}</td>
              <td>{transaction.description}</td>
              <td className={`cash-amount ${transaction.type}`}>
                {transaction.type === 'expense' ? '- ' : transaction.type === 'transfer' ? '' : '+ '}
                {formatMoney(transaction.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      {isTransferOpen && (
        <TransferModal
          accounts={accounts}
          activeAccountId={activeAccountId}
          onClose={() => setIsTransferOpen(false)}
          onSave={async (amount, fromId, toId) => {
            try {
              await financeRepository.createCashTransfer(fromId, toId, amount, 'Mutasi antar akun kas')
              await refetch()
              notify('Pemindahan dana berhasil dicatat.')
              setIsTransferOpen(false)
            } catch (error) {
              notify(error instanceof Error ? error.message : 'Gagal memindahkan dana.')
            }
          }}
        />
      )}
      {isIncomeOpen && (
        <IncomeModal
          accounts={accounts}
          activeAccountId={activeAccountId}
          openingBalanceAccountIds={Array.from(new Set(transactions.filter((transaction) => transaction.type === 'adjustment' && transaction.status === 'posted').map((transaction) => transaction.account_id)))}
          onClose={() => setIsIncomeOpen(false)}
          onSave={async (payload) => {
            try {
              await financeRepository.createCashIncome(payload)
              await refetch()
              notify('Pemasukan berhasil ditambahkan ke akun kas.')
              setIsIncomeOpen(false)
            } catch (error) {
              notify(error instanceof Error ? error.message : 'Gagal menambah pemasukan.')
            }
          }}
        />
      )}
    </>
  )
}

function typeLabel(type: CashTransaction['type']) {
  if (type === 'income') return 'Pemasukan'
  if (type === 'expense') return 'Pengeluaran'
  if (type === 'adjustment') return 'Penyesuaian'
  return 'Mutasi'
}

function TransferModal({
  accounts,
  activeAccountId,
  onClose,
  onSave,
}: {
  accounts: Array<{ id: number; name: string }>
  activeAccountId: number
  onClose: () => void
  onSave: (amount: number, fromId: number, toId: number) => void
}) {
  const [fromId, setFromId] = useState(activeAccountId)
  const [amount, setAmount] = useState('500000')
  const toAccount = accounts.find((account) => account.id !== fromId) ?? accounts[0]

  useEffect(() => {
    if (accounts.length > 0 && !accounts.some((account) => account.id === fromId)) {
      setFromId(activeAccountId)
    }
  }, [accounts, activeAccountId, fromId])

  function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!toAccount) return
    onSave(Number(amount), fromId, toAccount.id)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal payment-modal" onSubmit={submitTransfer}>
        <div className="modal-head">
          <div>
            <h2>Pindahkan Dana</h2>
            <p>Catat mutasi antar akun kas tanpa menambah pemasukan baru.</p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button"><Icon name="close" /></button>
        </div>
        <div className="modal-grid one-column">
          <label>
            Dari Akun
            <select className="input-select" onChange={(event) => setFromId(Number(event.target.value))} value={fromId}>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>
          <label>Ke Akun<input disabled value={toAccount?.name ?? ''} /></label>
          <label>Nominal<input min="1" onChange={(event) => setAmount(event.target.value)} required type="number" value={amount} /></label>
          <div className="total-box">
            <span>Total Mutasi</span>
            <strong>{formatMoney(Number(amount || 0))}</strong>
          </div>
        </div>
        <div className="modal-foot">
          <button className="ghost" onClick={onClose} type="button">Batal</button>
          <button className="primary" type="submit">Simpan Mutasi</button>
        </div>
      </form>
    </div>
  )
}

function IncomeModal({
  accounts,
  activeAccountId,
  openingBalanceAccountIds,
  onClose,
  onSave,
}: {
  accounts: Array<{ id: number; name: string }>
  activeAccountId: number
  openingBalanceAccountIds: number[]
  onClose: () => void
  onSave: (payload: CreateCashIncomePayload) => void | Promise<void>
}) {
  const [accountId, setAccountId] = useState(activeAccountId)
  const [amount, setAmount] = useState('1000000')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('Saldo awal operasional bulan berjalan')
  const [isOpeningBalance, setIsOpeningBalance] = useState(false)
  const hasOpeningBalance = openingBalanceAccountIds.includes(accountId)

  useEffect(() => {
    if (accounts.length > 0 && !accounts.some((account) => account.id === accountId)) {
      setAccountId(activeAccountId)
    }
  }, [accounts, activeAccountId, accountId])

  function submitIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      account_id: accountId,
      amount: Number(amount || 0),
      description,
      occurred_at: `${occurredAt}T08:00:00`,
      is_opening_balance: isOpeningBalance,
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal payment-modal cash-income-modal" onSubmit={submitIncome}>
        <div className="modal-head">
          <div>
            <h2>Tambah Pemasukan</h2>
            <p>Gunakan untuk saldo awal, bantuan dana, pinjaman operasional, atau pemasukan manual lain.</p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button"><Icon name="close" /></button>
        </div>
        <div className="modal-grid one-column">
          <label>
            Masuk ke Akun
            <select className="input-select" onChange={(event) => { setAccountId(Number(event.target.value)); setIsOpeningBalance(false) }} value={accountId}>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>
          <label>Tanggal Pemasukan<input onChange={(event) => setOccurredAt(event.target.value)} required type="date" value={occurredAt} /></label>
          <label>Keterangan<textarea onChange={(event) => setDescription(event.target.value)} required rows={3} value={description} /></label>
          <label>Nominal<input min="1" onChange={(event) => setAmount(event.target.value)} required type="number" value={amount} /></label>
          <label className="checkbox-row opening-balance-check">
            <input checked={isOpeningBalance} disabled={hasOpeningBalance} onChange={(event) => setIsOpeningBalance(event.target.checked)} type="checkbox" />
            <span>
              Tetapkan sebagai saldo awal (hanya satu kali per akun)
              {hasOpeningBalance && <small>Saldo awal akun ini sudah ditetapkan.</small>}
            </span>
          </label>
          <div className="total-box">
            <span>Total Pemasukan</span>
            <strong>{formatMoney(Number(amount || 0))}</strong>
          </div>
        </div>
        <div className="modal-foot">
          <button className="ghost" onClick={onClose} type="button">Batal</button>
          <button className="primary" type="submit">Simpan Pemasukan</button>
        </div>
      </form>
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
