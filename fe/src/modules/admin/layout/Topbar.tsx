import { useEffect, useState } from 'react'
import { Icon } from '../../../components/Icon'
import { subscribeToRealtimeUpdates } from '../../../app/services/realtimeService'
import { getAdminAccount } from '../services/adminApi'
import type { SetPage } from '../../../types'

type TopbarProps = {
  onMenuClick: () => void
  setPage: SetPage
}

export function Topbar({ onMenuClick, setPage }: TopbarProps) {
  const [identity, setIdentity] = useState({ avatar: 'AU', name: 'Admin', photo: '' })

  useEffect(() => {
    const controller = new AbortController()
    const loadIdentity = () => {
      void getAdminAccount(controller.signal).then((account) => {
        setIdentity({ avatar: account.avatar, name: account.name, photo: account.photo })
      }).catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
      })
    }

    loadIdentity()
    const unsubscribeRealtime = subscribeToRealtimeUpdates(['account'], loadIdentity)

    return () => {
      controller.abort()
      unsubscribeRealtime()
    }
  }, [])

  return (
    <header className="topbar">
      <button aria-label="Buka menu" className="mobile-menu-button" onClick={onMenuClick} type="button">
        <Icon name="menu" />
      </button>
      <div className="topbar-actions">
        <button className="topbar-help" onClick={() => setPage('admin-help')} type="button"><Icon name="help" />Panduan</button>
        <button className="admin-pill account-button" onClick={() => setPage('admin-account')} type="button">
          <div>
            <strong>{identity.name}</strong>
            <span>Aktif</span>
          </div>
          <div className="avatar">{identity.photo ? <img alt={identity.name} src={identity.photo} /> : identity.avatar}</div>
        </button>
      </div>
    </header>
  )
}
