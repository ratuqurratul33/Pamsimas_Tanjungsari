import { useEffect, useEffectEvent, useState, type FormEvent } from 'react'
import { Badge } from '../../../components/Badge'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatCard } from '../../../components/StatCard'
import { TableCard } from '../../../components/TableCard'
import { financeRepository, type CreateExpensePayload, type Expense, type FinanceCashAccount, type UpdateExpensePayload } from '../../../app/services/financeRepository'

export function ExpensesPage({ notify }: { notify: (message: string) => void }) {
  const [accounts, setAccounts] = useState<FinanceCashAccount[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [query, setQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7))

  const thisMonthPosted = expenses.filter((expense) => expense.status === 'posted' && expense.expense_date.startsWith(monthFilter))
  const totalThisMonth = thisMonthPosted.reduce((total, expense) => total + expense.amount, 0)
  const totalByAccount = (accountId: number) => thisMonthPosted.filter((expense) => expense.cash_account_id === accountId).reduce((total, expense) => total + expense.amount, 0)
  const visibleExpenses = expenses
    .filter((expense) => !monthFilter || expense.expense_date.startsWith(monthFilter))
    .filter((expense) => !query || `${expense.description} ${expense.category}`.toLowerCase().includes(query.toLowerCase()))

  const loadInitialExpenses = useEffectEvent(refetch)
  useEffect(() => { void loadInitialExpenses() }, [])

  async function refetch() {
    try {
      const [nextAccounts, nextExpenses] = await Promise.all([
        financeRepository.listCashAccounts(),
        financeRepository.listExpenses(),
      ])
      setAccounts(nextAccounts)
      setExpenses(nextExpenses)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Data pengeluaran gagal dimuat.')
    }
  }

  return (
    <>
      <PageHeader
        action={<button className="primary" onClick={() => setIsModalOpen(true)}><Icon name="plus" />Tambah Pengeluaran</button>}
        subtitle="Catat dan kelola pengeluaran operasional PAMSIMAS."
        title="Pengeluaran"
      />
      <section className="stat-grid three">
        <StatCard stat={{ label: 'Pengeluaran Bulan Ini', tone: 'blue', value: formatMoney(totalThisMonth) }} />
        {accounts.map((account) => (
          <StatCard key={account.id} stat={{ label: `Pengeluaran ${account.name}`, tone: 'orange', value: formatMoney(totalByAccount(account.id)) }} />
        ))}
      </section>
      <section className="filter-bar compact-filter">
        <label className="search-field full-search">
          <Icon name="search" />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Cari keterangan atau kategori pengeluaran..." value={query} />
        </label>
        <input className="input-select compact-select" onChange={(event) => setMonthFilter(event.target.value)} type="month" value={monthFilter} />
      </section>
      <TableCard footer={`Menampilkan ${visibleExpenses.length} dari ${expenses.length} data`} title="Riwayat Pengeluaran">
        <thead>
          <tr><th>Tanggal</th><th>Kategori</th><th>Sumber Dana</th><th>Keterangan</th><th>Total</th><th>Bukti Nota</th><th>Visibilitas</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          {visibleExpenses.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.expense_date}</td>
              <td>{expense.category}</td>
              <td>{accounts.find((account) => account.id === expense.cash_account_id)?.name ?? '-'}</td>
              <td>{expense.description}</td>
              <td>{formatMoney(expense.amount)}</td>
              <td>{expense.proof_preview ? <a className="table-link" href={expense.proof_preview} rel="noreferrer" target="_blank">Lihat Nota</a> : <span className="muted">Tidak ada</span>}</td>
              <td><Badge status={expense.is_public ? 'Publik' : 'Khusus Admin'} /></td>
              <td className="action-cell-center">
                <button className="ghost small" onClick={() => setEditingExpense(expense)}><Icon name="edit" />Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
      {isModalOpen && (
        <ExpenseModal
          accounts={accounts}
          onClose={() => setIsModalOpen(false)}
          onSave={async (payload) => {
            try {
              const expense = await financeRepository.createExpense(payload)
              await financeRepository.postExpense(expense.id)
              await refetch()
              setIsModalOpen(false)
              notify('Pengeluaran berhasil disimpan dan langsung memperbarui saldo serta ringkasan.')
            } catch (error) {
              notify(error instanceof Error ? error.message : 'Gagal menyimpan pengeluaran.')
            }
          }}
        />
      )}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSave={async (payload) => {
            try {
              await financeRepository.updateExpense(editingExpense.id, payload)
              await refetch()
              setEditingExpense(null)
              notify('Pengeluaran berhasil diperbarui.')
            } catch (error) {
              notify(error instanceof Error ? error.message : 'Gagal memperbarui pengeluaran.')
            }
          }}
        />
      )}
    </>
  )
}

type ExpenseFormPayload = CreateExpensePayload

function ExpenseModal({
  accounts,
  onClose,
  onSave,
}: {
  accounts: FinanceCashAccount[]
  onClose: () => void
  onSave: (payload: ExpenseFormPayload) => void | Promise<void>
}) {
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('Pemeliharaan')
  const [description, setDescription] = useState('')
  const [cashAccountId, setCashAccountId] = useState(accounts[0]?.id ?? 1)
  const [amount, setAmount] = useState('0')
  const [proof, setProof] = useState<{ file: File; name: string; preview: string } | null>(null)
  const [proofError, setProofError] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const availableBalance = accounts.find((account) => account.id === cashAccountId)?.balance ?? 0

  function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      amount: Number(amount || 0),
      cash_account_id: cashAccountId,
      category,
      description,
      expense_date: expenseDate,
      payment_method: 'cash',
      proof_name: proof?.name,
      proof_preview: proof?.preview,
      proof_file: proof?.file,
      is_public: isPublic,
    })
  }

  function updateProof(file?: File) {
    setProofError('')
    if (!file) {
      setProof(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setProofError('Bukti nota harus berupa JPG, JPEG, atau PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setProofError('Ukuran bukti nota maksimal 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProof({ file, name: file.name, preview: typeof reader.result === 'string' ? reader.result : '' })
    reader.readAsDataURL(file)
  }

  return (
    <div className="modal-backdrop">
      <form className="modal compact-modal" onSubmit={submitExpense}>
        <div className="modal-head">
          <div>
            <h2>Tambah Pengeluaran</h2>
            <p>Catat pengeluaran baru untuk operasional PAMSIMAS. Pengeluaran tersimpan sebagai draft sampai diposting.</p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button"><Icon name="close" /></button>
        </div>
        <div className="modal-grid">
          <label>Tanggal<input onChange={(event) => setExpenseDate(event.target.value)} required type="date" value={expenseDate} /></label>
          <label>Keterangan<textarea onChange={(event) => setDescription(event.target.value)} required value={description} /></label>
          <label>
            Sumber Dana
            <select className="input-select" onChange={(event) => setCashAccountId(Number(event.target.value))} value={cashAccountId}>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <span className="helper">Saldo Tersedia: {formatMoney(availableBalance)}</span>
          </label>
          <label>Kategori<input onChange={(event) => setCategory(event.target.value)} required value={category} /></label>
          <label>Nominal<input min="0" onChange={(event) => setAmount(event.target.value)} required type="number" value={amount} /></label>
          <label>
            Bukti Nota
            <input accept="image/png,image/jpeg" onChange={(event) => updateProof(event.target.files?.[0])} type="file" />
            <small>Opsional, maksimal 2 MB. Bukti hanya terlihat oleh Admin.</small>
            {proof && <span className="file-status">{proof.name}</span>}
            {proofError && <span className="field-error">{proofError}</span>}
          </label>
          <label className="checkbox-row">
            <input checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} type="checkbox" />
            <span>
              Tampilkan di halaman Transparansi Publik
              <small>Jika tidak dicentang, pengeluaran ini hanya terlihat oleh Admin.</small>
            </span>
          </label>
        </div>
        <div className="modal-foot">
          <div className="mini-summary">
            <span>Saldo Saat Ini {formatMoney(availableBalance)}</span>
            <span>Pengeluaran -{formatMoney(Number(amount || 0))}</span>
            <b>Saldo Setelah Diposting {formatMoney(availableBalance - Number(amount || 0))}</b>
          </div>
          <button className="ghost" onClick={onClose} type="button">Batal</button>
          <button className="primary" type="submit">Simpan Pengeluaran</button>
        </div>
      </form>
    </div>
  )
}

function EditExpenseModal({
  expense,
  onClose,
  onSave,
}: {
  expense: Expense
  onClose: () => void
  onSave: (payload: UpdateExpensePayload) => void | Promise<void>
}) {
  const [expenseDate, setExpenseDate] = useState(expense.expense_date)
  const [category, setCategory] = useState(expense.category)
  const [description, setDescription] = useState(expense.description)
  const [amount, setAmount] = useState(String(expense.amount))
  const [proof, setProof] = useState<{ file: File; name: string; preview: string } | null>(null)
  const [proofError, setProofError] = useState('')
  const [isPublic, setIsPublic] = useState(expense.is_public)
  const [isSaving, setIsSaving] = useState(false)

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        amount: Number(amount || 0),
        category,
        description,
        expense_date: expenseDate,
        is_public: isPublic,
        proof_file: proof?.file,
        proof_name: proof?.name,
        proof_preview: proof?.preview,
      })
    } finally {
      setIsSaving(false)
    }
  }

  function updateProof(file?: File) {
    setProofError('')
    if (!file) {
      setProof(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setProofError('Bukti nota harus berupa JPG, JPEG, atau PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setProofError('Ukuran bukti nota maksimal 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProof({ file, name: file.name, preview: typeof reader.result === 'string' ? reader.result : '' })
    reader.readAsDataURL(file)
  }

  return (
    <div className="modal-backdrop">
      <form className="modal compact-modal" onSubmit={submitExpense}>
        <div className="modal-head">
          <div>
            <h2>Edit Pengeluaran</h2>
            <p>Perbaiki nominal, kategori, atau data lain. Saldo kas menyesuaikan otomatis jika nominal berubah.</p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button"><Icon name="close" /></button>
        </div>
        <div className="modal-grid">
          <label>Tanggal<input onChange={(event) => setExpenseDate(event.target.value)} required type="date" value={expenseDate} /></label>
          <label>Keterangan<textarea onChange={(event) => setDescription(event.target.value)} required value={description} /></label>
          <label>Kategori<input onChange={(event) => setCategory(event.target.value)} required value={category} /></label>
          <label>Nominal<input min="0" onChange={(event) => setAmount(event.target.value)} required type="number" value={amount} /></label>
          <label>
            Bukti Nota
            <input accept="image/png,image/jpeg" onChange={(event) => updateProof(event.target.files?.[0])} type="file" />
            <small>{expense.proof_preview ? 'Sudah ada nota. Unggah file baru untuk menggantinya.' : 'Opsional, maksimal 2 MB.'}</small>
            {proof && <span className="file-status">{proof.name}</span>}
            {proofError && <span className="field-error">{proofError}</span>}
          </label>
          <label className="checkbox-row">
            <input checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} type="checkbox" />
            <span>
              Tampilkan di halaman Transparansi Publik
              <small>Jika tidak dicentang, pengeluaran ini hanya terlihat oleh Admin.</small>
            </span>
          </label>
        </div>
        <div className="modal-foot">
          <button className="ghost" onClick={onClose} type="button">Batal</button>
          <button className="primary" disabled={isSaving} type="submit">{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
        </div>
      </form>
    </div>
  )
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}
