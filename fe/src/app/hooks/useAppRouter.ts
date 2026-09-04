import { useEffect, useState } from 'react'
import { resolvePage, resolvePath } from '../router/routeConfig'
import type { Page } from '../../types'

export function useAppRouter() {
  const [page, setPage] = useState<Page>(() => resolvePage(window.location.pathname))

  useEffect(() => {
    const syncPageFromUrl = () => setPage(resolvePage(window.location.pathname))

    window.addEventListener('popstate', syncPageFromUrl)
    return () => window.removeEventListener('popstate', syncPageFromUrl)
  }, [])

  function navigate(nextPage: Page) {
    const nextPath = resolvePath(nextPage)

    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }

    setPage(nextPage)
  }

  return { navigate, page }
}
