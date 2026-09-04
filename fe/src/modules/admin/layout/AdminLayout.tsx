import type { ReactNode } from 'react'
import { useState } from 'react'
import type { Page, SetPage } from '../../../types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

type AdminLayoutProps = {
  children: ReactNode
  page: Page
  setPage: SetPage
}

export function AdminLayout({ children, page, setPage }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const navigate: SetPage = (nextPage) => {
    setPage(nextPage)
    setIsSidebarOpen(false)
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar page={page} setPage={navigate} />
      <button
        aria-label="Tutup menu"
        className="sidebar-backdrop"
        onClick={() => setIsSidebarOpen(false)}
        type="button"
      />
      <main className="main-panel">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} setPage={navigate} />
        <div className="content-area">{children}</div>
      </main>
    </div>
  )
}
