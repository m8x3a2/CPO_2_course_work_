import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { ticketsApi } from '../api/index'
import { fmtDateTime, fmtPrice } from '../utils'

export default function MyTicketsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    load()
  }, [user])

  function load() {
    ticketsApi.myTickets()
      .then(setTickets)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  async function handleDelete(id) {
    if (!confirm('Удалить билет?')) return
    try {
      await ticketsApi.deleteTicket(id)
      setTickets(ts => ts.filter(t => t.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDeleteAll() {
    if (!confirm('Удалить все билеты? Это действие нельзя отменить.')) return
    try {
      await ticketsApi.deleteAllTickets()
      setTickets([])
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div>
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Мои билеты</h1>
        {tickets.length > 0 && (
          <button className="btn-danger btn-sm icon-btn" title="Удалить все билеты" aria-label="Удалить все билеты" onClick={handleDeleteAll}>🗑</button>
        )}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {tickets.length === 0 ? (
        <div className="empty">
          <p>У вас нет купленных билетов.</p>
          <p className="mt-8"><Link to="/sessions">Перейти к сеансам</Link></p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Фильм</th>
                <th>Кинотеатр / Зал</th>
                <th>Дата сеанса</th>
                <th>Цена</th>
                <th>Место</th>
                <th>Куплен</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td className="text-muted text-sm">{t.id}</td>
                  <td>{t.film_title}</td>
                  <td>{t.cinema_name}<br /><span className="text-muted text-sm">{t.hall_name}</span></td>
                  <td>{fmtDateTime(t.session_datetime)}</td>
                  <td>{fmtPrice(t.price)}</td>
                  <td>{t.seat_number ?? '-'}</td>
                  <td className="text-muted text-sm">{fmtDateTime(t.purchased_at)}</td>
                  <td>
                    <button className="btn-danger btn-sm icon-btn" title="Удалить" aria-label="Удалить" onClick={() => handleDelete(t.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
