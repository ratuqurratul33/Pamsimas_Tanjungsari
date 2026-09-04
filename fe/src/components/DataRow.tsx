import { Badge } from './Badge'

const badgePattern = /Aktif|Lunas|Pending|Verifikasi|Dicetak|Bayar/

export function DataRow({ row }: { row: string[] }) {
  return (
    <tr>
      {row.map((cell) => (
        <td key={cell}>{badgePattern.test(cell) ? <Badge status={cell} /> : cell}</td>
      ))}
    </tr>
  )
}
