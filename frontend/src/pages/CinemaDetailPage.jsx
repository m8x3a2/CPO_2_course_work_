import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { cinemasApi, hallsApi, sessionsApi, resolveEntityImageSrc, usePlaceholderOnError } from '../api/index'
import { useAuth } from '../AuthContext'
import { fmtDateTime, fmtPrice } from '../utils'

const STATUS_LABELS = { active: 'Активен', cancelled: 'Отменен', finished: 'Завершен' }

export default function CinemaDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [cinema, setCinema] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hallForm, setHallForm] = useState({ name: '', total_seats: 50 })
  const [showHallForm, setShowHallForm] = useState(false)
  const [hallErr, setHallErr] = useState('')

  async function load() {
    try {
      const [c, s] = await Promise.all([
        cinemasApi.get(id),
        sessionsApi.list({ cinema_id: id })
      ])
      setCinema(c)
      setSessions(s)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleAddHall(e) {
    e.preventDefault()
    setHallErr('')
    try {
      await hallsApi.create({ cinema_id: Number(id), name: hallForm.name, total_seats: Number(hallForm.total_seats) })
      await load()
      setShowHallForm(false)
      setHallForm({ name: '', total_seats: 50 })
    } catch (err) {
      setHallErr(err.message)
    }
  }

  async function handleDeleteHall(hallId) {
    if (!confirm('Удалить зал? Связанные сеансы будут удалены. Билеты останутся в архиве пользователей без изменений.')) return
    try {
      await hallsApi.delete(hallId)
      await load()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="loading">Загрузка...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!cinema) return <div className="empty">Кинотеатр не найден</div>

  return (
    <div>
      <Link to="/cinemas" className="text-muted text-sm">← Все кинотеатры</Link>
      <h1 className="page-title mt-8">{cinema.name}</h1>
      <div className="entity-hero-container">
        <img
          className="entity-hero-image-contain"
          src={resolveEntityImageSrc('cinema', cinema.image_data)}
          onError={usePlaceholderOnError('cinema')}
          alt={cinema.name}
        />
      </div>
      <p className="text-muted">📍 {cinema.address}</p>
      {cinema.description && <p className="text-sm mt-8" style={{ whiteSpace: 'pre-wrap' }}>{cinema.description}</p>}

      <div className="mt-24">
        <div className="flex-between mb-16">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Залы ({cinema.halls.length})</h2>
          {user?.role === 'admin' && (
            <button className="btn-sm" onClick={() => setShowHallForm(v => !v)}>
              {showHallForm ? 'Отмена' : '+ Зал'}
            </button>
          )}
        </div>

        {showHallForm && (
          <div className="card mb-16">
            {hallErr && <div className="alert alert-error">{hallErr}</div>}
            <form onSubmit={handleAddHall} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Название зала</label>
                <input value={hallForm.name} onChange={e => setHallForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0, width: 120 }}>
                <label>Мест</label>
                <input type="number" min="1" value={hallForm.total_seats} onChange={e => setHallForm(f => ({ ...f, total_seats: e.target.value }))} required />
              </div>
              <button type="submit">Добавить</button>
            </form>
          </div>
        )}

        {cinema.halls.length === 0 ? (
          <p className="text-muted text-sm">Залы не добавлены</p>
        ) : (
          <div className="card">
            <table>
              <thead><tr><th>Название</th><th>Мест</th>{user?.role === 'admin' && <th></th>}</tr></thead>
              <tbody>
                {cinema.halls.map(h => (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td>{h.total_seats}</td>
                    {user?.role === 'admin' && (
                      <td><button className="btn-danger btn-sm" onClick={() => handleDeleteHall(h.id)}>Удалить</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-24">
        <h2 className="section-title">Сеансы</h2>
        {sessions.length === 0 ? (
          <p className="text-muted text-sm">Сеансов нет</p>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr><th>Фильм</th><th>Зал</th><th>Дата и время</th><th>Цена</th><th>Мест</th><th>Статус</th></tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td><Link to={`/films/${s.film.id}`}>{s.film.title}</Link></td>
                    <td>{s.hall.name}</td>
                    <td>{fmtDateTime(s.datetime)}</td>
                    <td>{fmtPrice(s.price)}</td>
                    <td>{s.free_seats}</td>
                    <td><span className={`badge badge-${s.status}`}>{STATUS_LABELS[s.status] || s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
