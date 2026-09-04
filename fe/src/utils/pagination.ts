export function buildPaginationSummary(page: number, pageSize: number, total: number, noun = 'data') {
  if (total === 0) return `Menampilkan 0 ${noun}`
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return `Menampilkan ${start}-${end} dari ${total} ${noun}`
}
