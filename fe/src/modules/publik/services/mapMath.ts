export function calculateRouteDistance(points: Array<[number, number]>) {
  return points.reduce((total, point, index) => {
    if (index === 0) {
      return total
    }

    return total + distanceInMeters(points[index - 1], point)
  }, 0)
}

function distanceInMeters(firstPoint: [number, number], secondPoint: [number, number]) {
  const earthRadius = 6371000
  const firstLat = toRadians(firstPoint[0])
  const secondLat = toRadians(secondPoint[0])
  const latDiff = toRadians(secondPoint[0] - firstPoint[0])
  const lngDiff = toRadians(secondPoint[1] - firstPoint[1])
  const a = Math.sin(latDiff / 2) ** 2 + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(lngDiff / 2) ** 2

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}
