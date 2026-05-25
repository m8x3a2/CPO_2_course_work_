import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { filmsApi, resolveEntityImageSrc, resolveImageSrc, uploadImage, usePlaceholderOnError } from '../api/index'
import { useAuth } from '../AuthContext'

const EMPTY_FILM = { title: '', director: '', operator: '', genre: '', studio: '', actors: '', description: '', year: '', duration_minutes: '', image_data: '' }
const TEXT_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

function validateImage(file) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Можно загрузить только PNG или JPG')
  if (file.size > 10 * 1024 * 1024) throw new Error('Размер изображения не должен превышать 10 МБ')
}

// Search by multiple genres (split by comma/space)
async function searchFilmsByGenres(params) {
  const genreInput = (params.genre || '').trim()
  const genres = genreInput
    ? genreInput.split(/[,\s]+/).map(g => g.trim()).filter(Boolean)
    : []

  if (genres.length <= 1) {
    return filmsApi.list(params)
  }

  // Fetch for each genre, then intersect by film id
  const results = await Promise.all(
    genres.map(g => filmsApi.list({ ...params, genre: g }))
  )
  // Films that appear in ALL genre results
  const idSets = results.map(r => new Set(r.map(f => f.id)))
  const intersection = results[0].filter(f => idSets.every(s => s.has(f.id)))
  return intersection
}

export default function FilmsPage() {
  const { user } = useAuth()
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ title: '', director: '', genre: '', studio: '', year: '' })
  const [showForm, setShowForm] = useState(false)
  const [editFilm, setEditFilm] = useState(null)
  const [form, setForm] = useState(EMPTY_FILM)
  const [formError, setFormError] = useState('')

  async function load(params = {}) {
    setLoading(true)
    try {
      const data = await searchFilmsByGenres(params)
      setFilms(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleSearch(e) {
    e.preventDefault()
    load(filters)
  }

  function resetFilters() {
    setFilters({ title: '', director: '', genre: '', studio: '', year: '' })
    load()
  }

  function openCreate() {
    setForm(EMPTY_FILM)
    setEditFilm(null)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(film) {
    setForm({
      title: film.title, director: film.director, operator: film.operator || '',
      genre: film.genre, studio: film.studio || '', actors: film.actors || '',
      description: film.description || '', year: film.year || '',
      duration_minutes: film.duration_minutes || '',
      image_data: film.image_data || ''
    })
    setEditFilm(film)
    setFormError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.title = form.title; payload.director = form.director; payload.genre = form.genre
    try {
      if (editFilm) {
        await filmsApi.update(editFilm.id, payload)
      } else {
        await filmsApi.create(payload)
      }
      await load(filters)
      setShowForm(false)
    } catch (err) {
      setFormError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить фильм? Связанные сеансы будут удалены. Билеты останутся в архиве пользователей без изменений.')) return
    try {
      await filmsApi.delete(id)
      load(filters)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Фильмы</h1>
        {user?.role === 'admin' && <button onClick={openCreate}>+ Добавить</button>}
      </div>

      {showForm && (
        <div className="card mb-16">
          <h2 className="section-title">{editFilm ? 'Редактировать фильм' : 'Новый фильм'}</h2>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group"><label>Название *</label><input value={form.title} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div className="form-group"><label>Жанр * (через запятую)</label><input value={form.genre} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} required /></div>
              <div className="form-group"><label>Режиссёр *</label><input value={form.director} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} required /></div>
              <div className="form-group"><label>Оператор</label><input value={form.operator} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} /></div>
              <div className="form-group"><label>Студия</label><input value={form.studio} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
              <div className="form-group"><label>Год</label><input type="number" min="1888" max="2100" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} /></div>
              <div className="form-group">
                <label>Продолжительность (минут)</label>
                <input type="number" min="1" max="600" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="напр. 120" />
              </div>
            </div>
            <div className="form-group"><label>Актёры (через запятую)</label><input value={form.actors} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, actors: e.target.value }))} /></div>
            <div className="form-group"><label>Описание</label><textarea className="description-input" value={form.description} maxLength={DESCRIPTION_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="form-group">
              <label>Картинка</label>
              <input type="file" accept="image/png,image/jpeg" onChange={async e => {
                const file = e.target.files?.[0]
                if (file) {
                  try {
                    validateImage(file)
                    const { path } = await uploadImage(file, 'films')
                    setForm(f => ({ ...f, image_data: path }))
                  } catch (err) {
                    setFormError(err.message)
                  }
                }
              }} />
            </div>
            <img
              className="entity-image"
              src={resolveEntityImageSrc('film', form.image_data)}
              onError={usePlaceholderOnError('film')}
              alt=""
            />
            <div className="flex-gap">
              <button type="submit">{editFilm ? 'Сохранить' : 'Создать'}</button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <form className="filters" onSubmit={handleSearch}>
        <div className="filter-field"><label>Название</label><input value={filters.title} maxLength={TEXT_MAX_LENGTH} onChange={e => setFilters(f => ({ ...f, title: e.target.value }))} /></div>
        <div className="filter-field"><label>Режиссёр</label><input value={filters.director} maxLength={TEXT_MAX_LENGTH} onChange={e => setFilters(f => ({ ...f, director: e.target.value }))} /></div>
        <div className="filter-field"><label>Жанр (через запятую)</label><input value={filters.genre} maxLength={TEXT_MAX_LENGTH} onChange={e => setFilters(f => ({ ...f, genre: e.target.value }))} placeholder="боевик, фантастика" /></div>
        <div className="filter-field"><label>Студия</label><input value={filters.studio} maxLength={TEXT_MAX_LENGTH} onChange={e => setFilters(f => ({ ...f, studio: e.target.value }))} /></div>
        <div className="filter-field"><label>Год</label><input type="number" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} /></div>
        <button type="submit">Найти</button>
        <button type="button" className="btn-outline" onClick={resetFilters}>Сбросить</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : films.length === 0 ? (
        <div className="empty">Фильмы не найдены</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Жанр</th>
                <th>Режиссёр</th>
                <th>Год</th>
                <th>Длит.</th>
                {user?.role === 'admin' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {films.map(f => (
                <tr key={f.id}>
                  <td>
                    <div className="entity-list-title">
                      <img
                        className="entity-thumb"
                        src={resolveEntityImageSrc('film', f.image_data)}
                        onError={usePlaceholderOnError('film')}
                        alt=""
                      />
                      <Link className="truncate" to={`/films/${f.id}`}>{f.title}</Link>
                    </div>
                  </td>
                  <td>{f.genre}</td>
                  <td>{f.director}</td>
                  <td>{f.year || '—'}</td>
                  <td>{f.duration_minutes ? fmtDuration(f.duration_minutes) : '—'}</td>
                  {user?.role === 'admin' && (
                    <td>
                      <div className="flex-gap">
                        <button className="btn-outline btn-sm" onClick={() => openEdit(f)}>✏️</button>
                        <button className="btn-danger btn-sm" onClick={() => handleDelete(f.id)}>🗑</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}
