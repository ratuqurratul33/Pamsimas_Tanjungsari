import { useState, type ReactNode } from 'react'
import { Icon } from '../../../components/Icon'
import type { Page, SetPage } from '../../../types'
import { scrollToPublicSection, usePublicScrollSpy, type PublicSectionId } from '../hooks/usePublicScrollSpy'
import '../styles/public.css'

const publicNav: { id: PublicSectionId; label: string }[] = [
  { id: 'home', label: 'Beranda' },
  { id: 'map', label: 'Peta Air' },
  { id: 'transparency', label: 'Transparansi' },
  { id: 'about', label: 'Tentang Kami' },
  { id: 'faq', label: 'FAQ' },
]

export function PublicLayout({ children, setPage }: { children: ReactNode; page: Page; setPage: SetPage }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const activeSection = usePublicScrollSpy()

  function goToSection(sectionId: PublicSectionId) {
    setMenuOpen(false)
    setPage('public-home')
    window.history.replaceState(null, '', sectionId === 'home' ? '/website/public' : `/website/public#${sectionId}`)
    requestAnimationFrame(() => scrollToPublicSection(sectionId))
  }

  function goToLogin() {
    setMenuOpen(false)
    setPage('login')
  }

  return (
    <div className="public-shell">
      <header className="public-header-spa">
        <div className="public-header-inner">
          <button className="public-brand" onClick={() => goToSection('home')} type="button">
            <span className="public-brand-mark"><Icon name="drop" /></span>
            <span>PAMSIMAS</span>
          </button>

          <nav className="public-nav-spa" aria-label="Navigasi publik">
            {publicNav.map((item) => (
              <button
                className={activeSection === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => goToSection(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="public-header-actions">
            <button className="public-login-button" onClick={goToLogin} type="button">Login</button>
            <button className="public-menu-button" onClick={() => setMenuOpen((isOpen) => !isOpen)} type="button" aria-label="Buka menu publik">
              <Icon name="menu" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="public-mobile-nav" aria-label="Navigasi publik mobile">
            {publicNav.map((item) => (
              <button
                className={activeSection === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => goToSection(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            <button className="public-login-button mobile" onClick={goToLogin} type="button">Login Petugas</button>
          </nav>
        )}
      </header>

      <main className="public-main">{children}</main>

      <footer className="public-footer-spa">
        <div>
          <strong>PAMSIMAS Tanjungsari</strong>
          <p>Sistem informasi layanan air bersih, peta jaringan, transparansi iuran, dan panduan warga Desa Tanjungsari.</p>
        </div>
        <div>
          <span>Kontak Layanan</span>
          <b>+62 812-3456-7890</b>
        </div>
      </footer>
    </div>
  )
}
