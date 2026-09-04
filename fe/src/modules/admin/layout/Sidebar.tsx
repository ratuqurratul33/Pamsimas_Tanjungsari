import { useEffect, useState } from 'react'
import { navGroups } from '../data/mockData'
import { resolvePath } from '../../../app/router/routeConfig'
import type { Page, SetPage } from '../../../types'
import { Icon } from '../../../components/Icon'
import { logout } from '../../../app/services/authService'

type SidebarProps = {
  page: Page
  setPage: SetPage
}

const childPages: Partial<Record<Page, Page[]>> = {
  customers: ['customer-detail'],
  officers: ['officer-detail'],
  receipts: ['receipt-bulk'],
  verification: ['deposit-detail'],
  transparency: ['dusun-detail', 'rt-detail'],
  reports: ['report-print'],
}

export function Sidebar({ page, setPage }: SidebarProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(() => findGroupIdForPage(page))

  useEffect(() => {
    const groupId = findGroupIdForPage(page)
    if (groupId) setOpenGroupId(groupId)
  }, [page])

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">P</div>
        <div>
          <strong>PAMSIMAS</strong>
          <span>Desa Tanjungsari</span>
        </div>
      </div>
      <nav>
        {navGroups.map((entry) => {
          if (entry.type === 'link') {
            return (
              <a
                className={isNavActive(page, entry.page) ? 'active' : ''}
                href={resolvePath(entry.page)}
                key={entry.page}
                onClick={(event) => {
                  event.preventDefault()
                  setPage(entry.page)
                }}
              >
                <Icon name={entry.icon} />
                {entry.label}
              </a>
            )
          }

          const isOpen = openGroupId === entry.id
          const isGroupActive = entry.items.some((item) => isNavActive(page, item.page))

          return (
            <div className={`nav-group ${isOpen ? 'nav-group-open' : ''}`} key={entry.id}>
              <button
                className={`nav-group-header ${isGroupActive ? 'active' : ''}`}
                onClick={() => setOpenGroupId(isOpen ? null : entry.id)}
                type="button"
              >
                <Icon name={entry.icon} />
                {entry.label}
                <span className="nav-group-chevron" />
              </button>
              <div className="nav-group-children">
                <div className="nav-group-children-inner">
                  {entry.items.map((item) => (
                    <a
                      className={isNavActive(page, item.page) ? 'active' : ''}
                      href={resolvePath(item.page)}
                      key={item.page}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(item.page)
                      }}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <button onClick={() => setPage('system-settings')}>
          <Icon name="grid" />
          Pengaturan Sistem
        </button>
        <button className="danger" onClick={() => { logout(); setPage('login') }}>Logout</button>
      </div>
    </aside>
  )
}

function isNavActive(page: Page, navPage: Page) {
  return page === navPage || childPages[navPage]?.includes(page) === true
}

function findGroupIdForPage(page: Page) {
  for (const entry of navGroups) {
    if (entry.type === 'group' && entry.items.some((item) => isNavActive(page, item.page))) {
      return entry.id
    }
  }

  return null
}
