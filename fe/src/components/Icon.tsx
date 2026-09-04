const paths: Record<string, string> = {
  grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0H5Z',
  team: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0H3Zm8 0a5 5 0 0 1 10 0h-5.5',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h4',
  shield: 'M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm-3 8 2 2 4-4',
  wallet: 'M4 7h16v12H4V7Zm2-3h12v3H6V4Zm11 9h2',
  money: 'M3 7h18v10H3V7Zm3 3h2m8 4h2m-6 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  map: 'M4 5 9 3l6 2 5-2v16l-5 2-6-2-5 2V5Zm5-2v16m6-14v16',
  chart: 'M5 19h14M7 16V9m5 7V5m5 11v-4',
  bell: 'M18 16H6l2-2V9a4 4 0 1 1 8 0v5l2 2Zm-7 3h2',
  help: 'M12 18h.01M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.3-1.7 2.7M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  search: 'm21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 18 9 12l6-6',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.3A10.4 10.4 0 0 1 12 5c6 0 10 6 10 6a15.6 15.6 0 0 1-3.3 3.9M6.6 6.6C4 8.3 2 11 2 11s4 6 10 6a9.7 9.7 0 0 0 3.4-.6',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M5 21h14',
  print: 'M7 9V3h10v6M6 17H4v-6h16v6h-2M7 15h10v6H7v-6Z',
  filter: 'M4 6h16M7 12h10m-7 6h4',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 6h16M4 12h16M4 18h16',
  drop: 'M12 3S5 10.2 5 15a7 7 0 0 0 14 0c0-4.8-7-12-7-12Zm-3 12a3 3 0 0 0 6 0',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.7a2 2 0 0 1-.5 1.7L7.7 9.4a16 16 0 0 0 6.9 6.9l1.3-1.3a2 2 0 0 1 1.7-.5l2.7.4a2 2 0 0 1 1.7 2Z',
  upload: 'M12 16V4m0 0-4 4m4-4 4 4M4 16v4h16v-4',
  edit: 'M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Zm11-14 3 3',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3',
  whatsapp: 'M9 4h6a6 6 0 0 1 6 6v1a6 6 0 0 1-6 6h-3l-4 3v-3.3A6 6 0 0 1 3 11v-1a6 6 0 0 1 6-6Z',
}

export function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] ?? paths.grid} />
    </svg>
  )
}
