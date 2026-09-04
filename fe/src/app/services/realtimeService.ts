import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { appEnvironment } from '../config/environment'

export type RealtimeScope =
  | 'account'
  | 'dashboard'
  | 'deposits'
  | 'field'
  | 'finance'
  | 'public-content'
  | 'public-summary'
  | 'public-transparency'
  | 'receipts'
  | 'settings'

type RealtimePayload = {
  occurred_at: string
  scopes: RealtimeScope[]
  source: string
}

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

let echo: Echo<'reverb'> | null = null

export function subscribeToRealtimeUpdates(
  scopes: RealtimeScope[],
  onUpdate: (payload: RealtimePayload) => void,
) {
  const client = getRealtimeClient()

  if (!client) {
    return () => undefined
  }

  const channel = client.channel('pamsimas.updates')
  const handler = (payload: RealtimePayload) => {
    const shouldRefresh = payload.scopes.some((scope) => scopes.includes(scope))

    if (shouldRefresh) {
      onUpdate(payload)
    }
  }

  channel.listen('.pamsimas.updated', handler)

  return () => {
    channel.stopListening('.pamsimas.updated', handler)
  }
}

function getRealtimeClient() {
  if (appEnvironment.useMockApi || !appEnvironment.realtime.enabled) {
    return null
  }

  if (!echo) {
    window.Pusher = Pusher
    echo = new Echo({
      broadcaster: 'reverb',
      enabledTransports: ['ws', 'wss'],
      forceTLS: appEnvironment.realtime.scheme === 'https',
      key: appEnvironment.realtime.appKey,
      wsHost: appEnvironment.realtime.host,
      wsPort: appEnvironment.realtime.port,
      wssPort: appEnvironment.realtime.port,
    })
  }

  return echo
}
