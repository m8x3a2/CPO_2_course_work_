import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { filmsApi, sessionsApi, resolveEntityImageSrc, usePlaceholderOnError } from '../api/index'
import { fmtDateTime, fmtPrice, fmtSeats } from '../utils'

function fmtDuration(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

export default function FilmDetailPage() {
  const { id } = useParams()
  const [film, setFilm] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([filmsApi.get(id), sessionsApi.list({ film_id: id })])
      .then(([f, s]) => { setFilm(f); setSessions(s) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Загрузка...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!film) return <div className="empty">Фильм не найден</div>

  return (
    <div>
      <Link to="/films" className="text-muted text-sm">← Все фильмы</Link>
      <h1 className="page-title mt-8 text-wrap">{film.title}</h1>
      <div className="entity-hero-container">
        <img
          className="entity-hero-image-contain"
          src={resolveEntityImageSrc('film', film.image_data)}
          onError={usePlaceholderOnError('film')}
          alt={film.title}
        />
      </div>

      <div className="card mt-16">
        <table>
          <tbody>
            <tr><td style={{ width: 140, color: 'var(--muted)', fontWeight: 500 }}>Жанр</td><td className="text-wrap">{film.genre}</td></tr>
            <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Режиссёр</td><td className="text-wrap">{film.director}</td></tr>
            {film.operator && <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Оператор</td><td className="text-wrap">{film.operator}</td></tr>}
            {film.studio && <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Студия</td><td className="text-wrap">{film.studio}</td></tr>}
            {film.year && <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Год</td><td>{film.year}</td></tr>}
            {film.duration_minutes && <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Длительность</td><td>{fmtDuration(film.duration_minutes)}</td></tr>}
            {film.actors && <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Актёры</td><td className="text-wrap">{film.actors}</td></tr>}
          </tbody>
        </table>
        {film.description && (
          <p className="description-text" style={{ marginTop: 12, fontSize: 14 }}>{film.description}</p>
        )}
      </div>

      <div className="mt-24">
        <h2 className="section-title">Сеансы</h2>
        {sessions.length === 0 ? (
          <p className="text-muted text-sm">Сеансов нет</p>
        ) : (
          <div className="card table-card sessions-card">
            <div className="table-scroll">
            <table className="responsive-table sessions-table">
              <thead>
                <tr><th>Кинотеатр</th><th>Зал</th><th>Дата и время</th><th>Цена</th><th>Мест</th></tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      <Link className="truncate" to={`/cinemas/${s.hall?.cinema_id ?? ''}`}>{s.cinema_name}</Link>
                    </td>
                    <td className="text-wrap">{s.hall.name}</td>
                    <td className="date-cell">{fmtDateTime(s.datetime)}</td>
                    <td>{fmtPrice(s.price)}</td>
                    <td>{fmtSeats(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
