import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cinemasApi, resolveEntityImageSrc, resolveImageSrc, uploadImage, usePlaceholderOnError } from '../api/index'
import { useAuth } from '../AuthContext'

function validateImage(file) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Можно загрузить только PNG или JPG')
  if (file.size > 10 * 1024 * 1024) throw new Error('Размер изображения не должен превышать 10 МБ')
}

const EMPTY_CINEMA = { name: '', address: '', description: '', image_data: '' }
const TEXT_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

export default function CinemasPage() {
  const { user } = useAuth()
  const [cinemas, setCinemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ name: '', address: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_CINEMA)
  const [formError, setFormError] = useState('')

  async function load(params = filters) {
    setLoading(true)
    setError('')
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
      const data = await cinemasApi.list(cleanParams)
      setCinemas(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load({ name: '', address: '' }) }, [])

  function handleSearch(e) {
    e.preventDefault()
    load(filters)
  }

  function resetFilters() {
    const emptyFilters = { name: '', address: '' }
    setFilters(emptyFilters)
    load(emptyFilters)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    try {
      await cinemasApi.create({ ...form, halls_count: 1 })
      await load(filters)
      setShowForm(false)
      setForm(EMPTY_CINEMA)
    } catch (err) {
      setFormError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить кинотеатр? Связанные залы и сеансы будут удалены. Билеты останутся в архиве пользователей без изменений.')) return
    try {
      await cinemasApi.delete(id)
      await load(filters)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Кинотеатры</h1>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Отмена' : '+ Добавить'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-16">
          <h2 className="section-title">Новый кинотеатр</h2>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Название</label>
              <input value={form.name} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Адрес</label>
              <input value={form.address} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Описание и ссылки</label>
              <textarea className="description-input" value={form.description} maxLength={DESCRIPTION_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Картинка</label>
              <input type="file" accept="image/png,image/jpeg" onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  validateImage(file)
                  const { path } = await uploadImage(file, 'cinemas')
                  setForm(f => ({ ...f, image_data: path }))
                } catch (err) {
                  setFormError(err.message)
                }
              }} />
            </div>
            <img
              className="entity-image"
              src={resolveEntityImageSrc('cinema', form.image_data)}
              onError={usePlaceholderOnError('cinema')}
              alt=""
            />
            <div className="flex-gap">
              <button type="submit">Создать</button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <form className="filters" onSubmit={handleSearch}>
        <div className="filter-field">
          <label>Название</label>
          <input placeholder="Поиск..." value={filters.name} maxLength={TEXT_MAX_LENGTH} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="filter-field">
          <label>Адрес</label>
          <input placeholder="Улица..." value={filters.address} maxLength={TEXT_MAX_LENGTH} onChange={e => setFilters(f => ({ ...f, address: e.target.value }))} />
        </div>
        <button type="submit">Найти</button>
        <button type="button" className="btn-outline" onClick={resetFilters}>Сбросить</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : cinemas.length === 0 ? (
        <div className="empty">Кинотеатры не найдены</div>
      ) : (
        <div className="grid grid-2">
          {cinemas.map(c => (
            <CinemaCard key={c.id} cinema={c} isAdmin={user?.role === 'admin'} onDelete={handleDelete} onEdit={() => load(filters)} />
          ))}
        </div>
      )}
    </div>
  )
}

function CinemaCard({ cinema, isAdmin, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: cinema.name,
    address: cinema.address,
    description: cinema.description || '',
    image_data: cinema.image_data || '',
  })
  const [err, setErr] = useState('')

  async function handleUpdate(e) {
    e.preventDefault()
    setErr('')
    try {
      await cinemasApi.update(cinema.id, {
        ...form,
        halls_count: Math.max(1, cinema.halls?.length || cinema.halls_count || 1),
      })
      await onEdit()
      setEditing(false)
    } catch (err) {
      setErr(err.message)
    }
  }

  if (editing) {
    return (
      <div className="card">
        <h2 className="section-title">Редактировать</h2>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label>Название</label>
            <input value={form.name} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Адрес</label>
            <input value={form.address} maxLength={TEXT_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Описание и ссылки</label>
            <textarea className="description-input" value={form.description} maxLength={DESCRIPTION_MAX_LENGTH} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Картинка</label>
            <input type="file" accept="image/png,image/jpeg" onChange={async e => {
              const file = e.target.files?.[0]
              if (file) {
                try {
                  validateImage(file)
                  const { path } = await uploadImage(file, 'cinemas')
                  setForm(f => ({ ...f, image_data: path }))
                } catch (err) {
                  setErr(err.message)
                }
              }
            }} />
          </div>
          <img
            className="entity-image"
            src={resolveEntityImageSrc('cinema', form.image_data)}
            onError={usePlaceholderOnError('cinema')}
            alt=""
          />
          <div className="flex-gap">
            <button type="submit">Сохранить</button>
            <button type="button" className="btn-outline" onClick={() => setEditing(false)}>Отмена</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="card">
      <img
        className="entity-image"
        src={resolveEntityImageSrc('cinema', cinema.image_data)}
        onError={usePlaceholderOnError('cinema')}
        alt={cinema.name}
      />
      <div className="flex-between entity-title-row">
        <Link className="truncate" to={`/cinemas/${cinema.id}`} style={{ fontWeight: 600, fontSize: 16 }}>{cinema.name}</Link>
        {isAdmin && (
          <div className="flex-gap">
            <button className="btn-outline btn-sm" onClick={() => setEditing(true)}>Ред.</button>
            <button className="btn-danger btn-sm" onClick={() => onDelete(cinema.id)}>Удалить</button>
          </div>
        )}
      </div>
      <p className="text-muted text-sm mt-8 text-wrap">{cinema.address}</p>
      <p className="text-sm mt-8">Залов: <strong>{cinema.halls?.length ?? cinema.halls_count}</strong></p>
      {cinema.description && <p className="description-text text-sm mt-8">{cinema.description}</p>}
      <div className="mt-8">
        {cinema.halls?.map(h => (
          <span key={h.id} className="text-sm text-muted" style={{ marginRight: 8 }}>
            {h.name} ({h.total_seats} мест)
          </span>
        ))}
      </div>
      <div className="mt-8">
        <Link to={`/cinemas/${cinema.id}`} className="text-sm">Подробнее</Link>
      </div>
    </div>
  )
}
