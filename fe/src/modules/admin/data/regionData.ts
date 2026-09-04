export type AreaUnit = {
  dusun: 'Dusun 1' | 'Dusun 3'
  rw: string
  rt: string
  kampung: string
  households: number
}

export const areaUnits: AreaUnit[] = [
  { dusun: 'Dusun 1', rw: 'RW 05', rt: 'RT 01', kampung: 'Tanjungsari', households: 22 },
  { dusun: 'Dusun 1', rw: 'RW 05', rt: 'RT 02', kampung: 'Pasir Jati', households: 21 },
  { dusun: 'Dusun 1', rw: 'RW 05', rt: 'RT 03', kampung: 'Cikawung', households: 21 },
  { dusun: 'Dusun 3', rw: 'RW 06', rt: 'RT 01', kampung: 'Banceuy', households: 15 },
  { dusun: 'Dusun 3', rw: 'RW 06', rt: 'RT 02', kampung: 'Pasir Peucang', households: 22 },
  { dusun: 'Dusun 3', rw: 'RW 06', rt: 'RT 04', kampung: 'Babakan Sari', households: 38 },
  { dusun: 'Dusun 3', rw: 'RW 06', rt: 'RT 05', kampung: 'Sukaasih', households: 29 },
]

export function formatArea(unit: AreaUnit) {
  return `${unit.dusun} / ${unit.rw} / ${unit.rt} - ${unit.kampung}`
}

export function countHouseholds(area: string) {
  const unit = areaUnits.find((item) => formatArea(item) === area)
  return unit?.households ?? 0
}

export function findAreaByKampung(kampung: string) {
  return areaUnits.find((unit) => unit.kampung.toLowerCase() === kampung.toLowerCase())
}
