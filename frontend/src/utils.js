export function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function fmtPrice(price) {
  if (price == null) return '—'
  return Number(price).toLocaleString('ru-RU') + ' ₽'
}

export function fmtSeats(session) {
  const freeSeats = session?.free_seats ?? 0
  const totalSeats = session?.hall?.total_seats
  return totalSeats ? `${freeSeats}/${totalSeats}` : String(freeSeats)
}
