const rawMockFlag = String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase()
const rawRealtimePort = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)

export const appEnvironment = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api',
  realtime: {
    appKey: import.meta.env.VITE_REVERB_APP_KEY ?? '',
    enabled: Boolean(import.meta.env.VITE_REVERB_APP_KEY),
    host: import.meta.env.VITE_REVERB_HOST ?? window.location.hostname,
    port: Number.isFinite(rawRealtimePort) ? rawRealtimePort : 8080,
    scheme: import.meta.env.VITE_REVERB_SCHEME ?? 'http',
  },
  useMockApi: rawMockFlag === 'true' || rawMockFlag === '1' || rawMockFlag === 'yes',
} as const
