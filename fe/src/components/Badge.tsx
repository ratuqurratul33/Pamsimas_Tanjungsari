export function Badge({ status }: { status: string }) {
  const tone = getBadgeTone(status)

  return <span className={`badge ${tone}`}>{status}</span>
}

function getBadgeTone(status: string) {
  if (status.includes('Aktif') || status.includes('Lunas') || status.includes('Sudah') || status.includes('Terverifikasi') || status.includes('Diposting') || status === 'Terinput Meter' || status === 'YA' || status === 'verified' || status === 'posted') {
    return 'success'
  }

  if (status.includes('Belum') || status.includes('Menunggak') || status.includes('Ditolak') || status.includes('Dibatalkan') || status === 'TIDAK' || status === 'rejected' || status === 'voided') {
    return 'danger'
  }

  if (status.includes('Menunggu') || status.includes('Pending') || status.includes('Draft') || status === 'pending' || status === 'draft') {
    return 'warning'
  }

  return 'muted'
}
