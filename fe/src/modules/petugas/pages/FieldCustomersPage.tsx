import { useState } from 'react'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { TableCard } from '../../../components/TableCard'
import type { FieldCustomer } from '../data/petugasData'
import type { SetPage } from '../../../types'
import { buildPaginationSummary } from '../../../utils/pagination'

type FieldCustomersPageProps = {
  customers: FieldCustomer[]
  onSelectCustomer: (customerId: string) => void
  setPage: SetPage
}

export function FieldCustomersPage({ customers, onSelectCustomer, setPage }: FieldCustomersPageProps) {
  const [query, setQuery] = useState('')
  const [rt, setRt] = useState('Semua RT')
  const [pageNumber, setPageNumber] = useState(1)
  const pageSize = 15
  const uniqueRt = Array.from(new Set(customers.map((customer) => customer.rt)))

  const filteredCustomers = customers.filter((customer) => {
    const matchesQuery = `${customer.id} ${customer.name} ${customer.kampung} ${customer.address}`.toLowerCase().includes(query.toLowerCase())
    const matchesRt = rt === 'Semua RT' || customer.rt === rt

    return matchesQuery && matchesRt
  })
  const paginatedCustomers = filteredCustomers.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)

  function openDetail(customerId: string) {
    onSelectCustomer(customerId)
    setPage('field-customer-detail')
  }

  return (
    <>
      <PageHeader subtitle="Daftar pelanggan yang menjadi wilayah tugas Anda." title="Data Pelanggan" />
      <section className="filter-bar compact-filter">
        <label className="search-field">
          <Icon name="search" />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau ID pelanggan..."
            value={query}
          />
        </label>
        <select className="input-select compact-select" onChange={(event) => setRt(event.target.value)} value={rt}>
          <option>Semua RT</option>
          {uniqueRt.map((item) => <option key={item}>{item}</option>)}
        </select>
      </section>

      <TableCard
        footer={buildPaginationSummary(pageNumber, pageSize, filteredCustomers.length, 'pelanggan')}
        pagination={{ onPageChange: setPageNumber, page: pageNumber, pageSize, total: filteredCustomers.length }}
      >
        <thead>
          <tr>
            <th>ID Pelanggan</th>
            <th>Nama</th>
            <th>Alamat</th>
            <th>RT</th>
            <th>Kampung</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {paginatedCustomers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.id}</td>
              <td><strong>{customer.name}</strong></td>
              <td>{customer.address}</td>
              <td>{customer.rt}</td>
              <td>{customer.kampung}</td>
              <td>
                <button className="link" onClick={() => openDetail(customer.id)}>
                  Detail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </>
  )
}
