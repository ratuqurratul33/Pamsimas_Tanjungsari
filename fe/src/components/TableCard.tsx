import type { ReactNode } from 'react'
import { Icon } from './Icon'

type TableCardProps = {
  children: ReactNode
  className?: string
  title?: string
  footer?: string
  onDownload?: () => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
}

function buildPageButtons(page: number, totalPages: number) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (page <= 2) {
    return [1, 2, 3]
  }

  if (page >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages]
  }

  return [page - 1, page, page + 1]
}

export function TableCard({ children, className = '', title, footer, onDownload, pagination }: TableCardProps) {
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1
  const visiblePages = pagination ? buildPageButtons(pagination.page, totalPages) : []

  return (
    <section className={`table-card ${className}`.trim()}>
      {title && (
        <div className="table-title">
          <h3>{title}</h3>
          {onDownload && (
            <button className="link" onClick={onDownload} type="button">
              <Icon name="download" />
              Unduh Laporan
            </button>
          )}
        </div>
      )}
      <div className="table-scroll">
        <table>{children}</table>
      </div>
      {footer && (
        <div className="table-footer">
          <span>{footer}</span>
          {pagination ? (
            <div className="pages">
              <button disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)} type="button">&lt;</button>
              {visiblePages[0] > 1 && totalPages > 3 && (
                <button disabled type="button">...</button>
              )}
              {visiblePages.map((pageNumber) => (
                <button
                  className={pageNumber === pagination.page ? 'current' : ''}
                  key={pageNumber}
                  onClick={() => pagination.onPageChange(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
              {visiblePages[visiblePages.length - 1] < totalPages && totalPages > 3 && (
                <button disabled type="button">...</button>
              )}
              <button disabled={pagination.page >= totalPages} onClick={() => pagination.onPageChange(pagination.page + 1)} type="button">&gt;</button>
            </div>
          ) : (
            <div className="pages">
              <button disabled>&lt;</button>
              <button className="current">1</button>
              <button disabled>&gt;</button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
