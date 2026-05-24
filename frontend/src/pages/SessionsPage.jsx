import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authApi, sessionsApi, filmsApi, cinemasApi, ticketsApi } from '../api/index'
import { useAuth } from '../AuthContext'
import { fmtDateTime, fmtPrice } from '../utils'

const EMPTY_SESSION = { film_id: '', hall_id: '', datetime: '', price: '', free_seats: '', status: 'active' }
const STATUS_LABELS = { active: 'Активен', cancelled: 'Отменен', finished: 'Завершен' }

export default function SessionsPage() {
  const { user, setUser } = useAuth()
  const [sessions, setSessions] = useState([])
  const [films, setFilms] = useState([])
  const [cinemas, setCinemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ genre: '', director: '', date_from: '', date_to: '', has_seats: '', status: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_SESSION)
  const [hallsForCinema, setHallsForCinema] = useState([])
  const [selectedCinema, setSelectedCinema] = useState('')
  const [formError, setFormError] = useState('')
  const [buying, setBuying] = useState(null)
  const [buyMsg, setBuyMsg] = useState({})
  const [seatPicker, setSeatPicker] = useState({})
  const [seatLoading, setSeatLoading] = useState(null)

  async function load(params = {}) {
    setLoading(true)
    try {
      const data = await sessionsApi.list(params)
      setSessions(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    filmsApi.list().then(setFilms)
    cinemasApi.list().then(setCinemas)
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    load(params)
  }

  function resetFilters() {
    setFilters({ genre: '', director: '', date_from: '', date_to: '', has_seats: '', status: '' })
    load()
  }

  async function onCinemaChange(cinemaId) {
    setSelectedCinema(cinemaId)
    setForm(f => ({ ...f, hall_id: '' }))
    if (!cinemaId) { setHallsForCinema([]); return }
    const c = cinemas.find(c => c.id === Number(cinemaId))
    setHallsForCinema(c?.halls || [])
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    const payload = {
      ...form,
      film_id: Number(form.film_id),
      hall_id: Number(form.hall_id),
      price: Number(form.price),
      free_seats: Number(form.free_seats),
    }
    try {
      await sessionsApi.create(payload)
      setShowForm(false)
      setForm(EMPTY_SESSION)
      setSelectedCinema('')
      setHallsForCinema([])
      load()
    } catch (err) {
      setFormError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить сеанс? Билеты останутся в архиве пользователей без изменений.')) return
    try {
      await sessionsApi.delete(id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await sessionsApi.updateStatus(id, status)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  async function openSeatPicker(sessionId) {
    if (!user) { alert('Войдите, чтобы купить билет'); return }
    setSeatLoading(sessionId)
    try {
      const seats = await sessionsApi.seats(sessionId)
      setSeatPicker({ [sessionId]: { ...seats, selected: seats.free_seats[0] || '' } })
    } catch (err) {
      setBuyMsg({ [sessionId]: { ok: false, text: err.message } })
    } finally {
      setSeatLoading(null)
    }
  }

  async function handleBuy(sessionId, seatNumber) {
    setBuying(sessionId)
    setBuyMsg({})
    try {
      await ticketsApi.buy(sessionId, seatNumber)
      setBuyMsg({ [sessionId]: { ok: true, text: 'Билет куплен!' } })
      setSeatPicker({})
      setUser(await authApi.me())
      load()
    } catch (err) {
      setBuyMsg({ [sessionId]: { ok: false, text: err.message } })
    } finally {
      setBuying(null)
    }
  }

  return (
    <div>
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Сеансы</h1>
        {user?.role === 'admin' && <button onClick={() => setShowForm(v => !v)}>{showForm ? 'Отмена' : '+ Добавить'}</button>}
      </div>

      {showForm && (
        <div className="card mb-16">
          <h2 className="section-title">Новый сеанс</h2>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group">
                <label>Фильм *</label>
                <select value={form.film_id} onChange={e => setForm(f => ({ ...f, film_id: e.target.value }))} required>
                  <option value="">— выберите —</option>
                  {films.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Кинотеатр *</label>
                <select value={selectedCinema} onChange={e => onCinemaChange(e.target.value)} required>
                  <option value="">— выберите —</option>
                  {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Зал *</label>
                <select value={form.hall_id} onChange={e => setForm(f => ({ ...f, hall_id: e.target.value }))} required disabled={!selectedCinema}>
                  <option value="">— выберите —</option>
                  {hallsForCinema.map(h => <option key={h.id} value={h.id}>{h.name} ({h.total_seats} мест)</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Дата и время *</label>
                <input type="datetime-local" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Цена (руб.) *</label>
                <input type="number" min="1" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Свободных мест *</label>
                <input type="number" min="0" value={form.free_seats} onChange={e => setForm(f => ({ ...f, free_seats: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Статус</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Активен</option>
                  <option value="cancelled">Отменен</option>
                  <option value="finished">Завершен</option>
                </select>
              </div>
            </div>
            <div className="flex-gap">
              <button type="submit">Создать</button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <form className="filters" onSubmit={handleSearch}>
        <div className="filter-field"><label>Жанр (через запятую)</label><input value={filters.genre} onChange={e => setFilters(f => ({ ...f, genre: e.target.value }))} placeholder="боевик, фантастика" /></div>
        <div className="filter-field"><label>Режиссёр</label><input value={filters.director} onChange={e => setFilters(f => ({ ...f, director: e.target.value }))} /></div>
        <div className="filter-field"><label>Дата с</label><input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} /></div>
        <div className="filter-field"><label>Дата по</label><input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} /></div>
        <div className="filter-field">
          <label>Наличие мест</label>
          <select value={filters.has_seats} onChange={e => setFilters(f => ({ ...f, has_seats: e.target.value }))}>
            <option value="">Все</option>
            <option value="true">Есть места</option>
            <option value="false">Нет мест</option>
          </select>
        </div>
        <div className="filter-field">
          <label>Статус</label>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">Все</option>
            <option value="active">Активен</option>
            <option value="cancelled">Отменен</option>
            <option value="finished">Завершен</option>
          </select>
        </div>
        <button type="submit">Найти</button>
        <button type="button" className="btn-outline" onClick={resetFilters}>Сбросить</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : sessions.length === 0 ? (
        <div className="empty">Сеансов не найдено</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Фильм</th>
                <th>Кинотеатр / Зал</th>
                <th>Дата и время</th>
                <th>Цена</th>
                <th>Мест</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <>
                  <tr key={s.id}>
                    <td><Link to={`/films/${s.film.id}`}>{s.film.title}</Link><br /><span className="text-muted text-sm">{s.film.genre}</span></td>
                    <td>{s.cinema_name}<br /><span className="text-muted text-sm">{s.hall.name}</span></td>
                    <td>{fmtDateTime(s.datetime)}</td>
                    <td>{fmtPrice(s.price)}</td>
                    <td>{s.free_seats}</td>
                    <td><span className={`badge badge-${s.status}`}>{STATUS_LABELS[s.status] || s.status}</span></td>
                    <td>
                      <div className="flex-gap">
                        {user && s.status === 'active' && s.free_seats > 0 && (
                          <button
                            className="btn-success btn-sm"
                            disabled={seatLoading === s.id}
                            onClick={() => openSeatPicker(s.id)}
                          >
                            {seatLoading === s.id ? '...' : 'Купить'}
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <select
                              value={s.status}
                              style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }}
                              onChange={e => handleStatusChange(s.id, e.target.value)}
                            >
                              <option value="active">Активен</option>
                              <option value="cancelled">Отменен</option>
                              <option value="finished">Завершен</option>
                            </select>
                            <button className="btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {buyMsg[s.id] && (
                    <tr key={`msg-${s.id}`}>
                      <td colSpan={7}>
                        <div className={`alert ${buyMsg[s.id].ok ? 'alert-success' : 'alert-error'}`} style={{ margin: 0 }}>
                          {buyMsg[s.id].text}
                        </div>
                      </td>
                    </tr>
                  )}
                  {seatPicker[s.id] && (
                    <tr key={`seats-${s.id}`}>
                      <td colSpan={7}>
                        <div className="seat-panel">
                          <div className="text-sm text-muted mb-16">Выберите свободное место перед покупкой</div>
                          <div className="seat-grid">
                            {Array.from({ length: seatPicker[s.id].total_seats }, (_, i) => i + 1).map(seat => {
                              const occupied = seatPicker[s.id].occupied_seats.includes(seat)
                              const selected = seatPicker[s.id].selected === seat
                              return (
                                <button
                                  key={seat}
                                  type="button"
                                  className={`seat ${occupied ? 'seat-taken' : ''} ${selected ? 'seat-selected' : ''}`}
                                  disabled={occupied}
                                  onClick={() => setSeatPicker(p => ({ ...p, [s.id]: { ...p[s.id], selected: seat } }))}
                                >
                                  {seat}
                                </button>
                              )
                            })}
                          </div>
                          <div className="flex-gap mt-16">
                            <button
                              className="btn-success btn-sm"
                              disabled={buying === s.id || !seatPicker[s.id].selected}
                              onClick={() => handleBuy(s.id, seatPicker[s.id].selected)}
                            >
                              {buying === s.id ? '...' : `Купить место ${seatPicker[s.id].selected}`}
                            </button>
                            <button className="btn-outline btn-sm" onClick={() => setSeatPicker({})}>Отмена</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
