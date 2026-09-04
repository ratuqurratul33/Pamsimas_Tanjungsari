import { useState, type ReactNode } from 'react'
import { Icon } from '../../../components/Icon'
import { resolvePath } from '../../../app/router/routeConfig'
import type { Page, SetPage } from '../../../types'
import { logout } from '../../../app/services/authService'
import type { FieldProfile } from '../data/petugasData'

const petugasNav: Array<{ icon: string; label: string; page: Page }> = [
  { icon: 'grid', label: 'Dashboard', page: 'field-dashboard' },
  { icon: 'user', label: 'Data Pelanggan', page: 'field-customers' },
  { icon: 'chart', label: 'Input Meter', page: 'field-meter' },
  { icon: 'wallet', label: 'Pelanggan Bayar', page: 'field-payments' },
  { icon: 'receipt', label: 'Setoran', page: 'field-deposits' },
]

type PetugasLayoutProps = {
  children: ReactNode
  page: Page
  profile: FieldProfile
  setPage: SetPage
}

export function PetugasLayout({ children, page, profile, setPage }: PetugasLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  function navigate(nextPage: Page) {
    setPage(nextPage)
    setIsSidebarOpen(false)
  }

  return (
    <div className={`app-shell petugas-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <strong>PAMSIMAS</strong>
            <span>Desa Tanjungsari</span>
          </div>
        </div>
        <nav>
          {petugasNav.map((item) => (
            <a
              className={isActive(page, item.page) ? 'active' : ''}
              href={resolvePath(item.page)}
              key={item.page}
              onClick={(event) => {
                event.preventDefault()
                navigate(item.page)
              }}
            >
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a
            className={page === 'field-help' ? 'active' : ''}
            href={resolvePath('field-help')}
            onClick={(event) => {
              event.preventDefault()
              navigate('field-help')
            }}
          >
            <Icon name="help" />
            Panduan
          </a>
          <a
            className={page === 'field-profile' ? 'active' : ''}
            href={resolvePath('field-profile')}
            onClick={(event) => {
              event.preventDefault()
              navigate('field-profile')
            }}
          >
            <Icon name="user" />
            Profil
          </a>
          <a
            className="danger"
            href={resolvePath('login')}
            onClick={(event) => {
              event.preventDefault()
              logout()
              navigate('login')
            }}
          >
            Logout
          </a>
        </div>
      </aside>
      <button
        aria-label="Tutup menu"
        className="sidebar-backdrop"
        onClick={() => setIsSidebarOpen(false)}
        type="button"
      />
      <main className="main-panel">
        <header className="topbar">
          <button aria-label="Buka menu" className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} type="button">
            <Icon name="menu" />
          </button>
          <div className="topbar-actions">
            <button className="topbar-help" onClick={() => navigate('field-help')} type="button"><Icon name="help" />Panduan</button>
            <div className="admin-pill">
              <div>
                <strong>{profile.name}</strong>
                <span>{profile.role}</span>
              </div>
              <div className="avatar">{profile.photo ? <img alt={profile.name} src={profile.photo} /> : profile.avatar}</div>
            </div>
          </div>
        </header>
        <div className="content-area">{children}</div>
      </main>
    </div>
  )
}

function isActive(page: Page, navPage: Page) {
  const childPages: Partial<Record<Page, Page[]>> = {
    'field-customers': ['field-customer-detail'],
  }

  return page === navPage || childPages[navPage]?.includes(page) === true
}
