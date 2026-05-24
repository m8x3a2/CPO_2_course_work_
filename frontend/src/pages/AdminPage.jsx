import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminDataApi, authApi, promocodesApi } from '../api/index'
import { useAuth } from '../AuthContext'

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)
  const [msg, setMsg] = useState('')
  const [promocodes, setPromocodes] = useState([])
  const [promoForm, setPromoForm] = useState({ code: '', max_uses: 1, amount: 100 })

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return }
    loadUsers()
    loadPromocodes()
  }, [user])

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await authApi.listUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId, newRole) {
    setUpdating(userId)
    setMsg('')
    try {
      await authApi.updateRole(userId, newRole)
      setMsg('Роль обновлена')
      loadUsers()
    } catch (err) {
      setMsg('Ошибка: ' + err.message)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <div className="loading">Загрузка...</div>

  async function loadPromocodes() {
    try {
      setPromocodes(await promocodesApi.list())
    } catch (err) {
      setError(err.message)
    }
  }

  async function handlePromoCreate(e) {
    e.preventDefault()
    setMsg('')
    try {
      await promocodesApi.create({
        code: promoForm.code,
        max_uses: Number(promoForm.max_uses),
        amount: Number(promoForm.amount),
      })
      setPromoForm({ code: '', max_uses: 1, amount: 100 })
      setMsg('Промокод создан')
      loadPromocodes()
    } catch (err) {
      setMsg('Ошибка: ' + err.message)
    }
  }

  async function handlePromoDelete(id) {
    if (!confirm('Удалить промокод?')) return
    await promocodesApi.delete(id)
    loadPromocodes()
  }

  async function handleExport() {
    const data = await adminDataApi.export()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cinema-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Импорт заменит текущие данные. Продолжить?')) return
    try {
      const data = JSON.parse(await file.text())
      await adminDataApi.import(data)
      setMsg('Данные импортированы')
      loadUsers()
      loadPromocodes()
    } catch (err) {
      setMsg('Ошибка импорта: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div>
      <h1 className="page-title">Панель администратора</h1>

      {msg && <div className="alert alert-info mb-16">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <h2 className="section-title">Импорт и экспорт</h2>
      <div className="card mb-16">
        <div className="flex-gap">
          <button onClick={handleExport}>Экспорт JSON</button>
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            Импорт JSON
            <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <h2 className="section-title">Промокоды</h2>
      <div className="card mb-16">
        <form onSubmit={handlePromoCreate} className="filters" style={{ marginBottom: 12 }}>
          <div className="filter-field">
            <label>Код</label>
            <input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value }))} required />
          </div>
          <div className="filter-field">
            <label>Количество людей</label>
            <input type="number" min="1" value={promoForm.max_uses} onChange={e => setPromoForm(f => ({ ...f, max_uses: e.target.value }))} required />
          </div>
          <div className="filter-field">
            <label>Сколько денег</label>
            <input type="number" min="1" step="0.01" value={promoForm.amount} onChange={e => setPromoForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <button type="submit">Создать</button>
        </form>
        {promocodes.length > 0 && (
          <table>
            <thead><tr><th>Код</th><th>Деньги</th><th>Использовано</th><th></th></tr></thead>
            <tbody>
              {promocodes.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.code}</strong></td>
                  <td>{p.amount}</td>
                  <td>{p.used_count} / {p.max_uses}</td>
                  <td><button className="btn-danger btn-sm" onClick={() => handlePromoDelete(p.id)}>Удалить</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="section-title">Пользователи</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Изменить роль</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="text-muted text-sm">{u.id}</td>
                <td><strong>{u.username}</strong>{u.id === user.id && <span className="text-muted text-sm"> (вы)</span>}</td>
                <td className="text-muted text-sm">{u.email}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td>
                  {u.id !== user.id ? (
                    <select
                      value={u.role}
                      disabled={updating === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                    >
                      <option value="guest">guest</option>
                      <option value="client">client</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className="text-muted text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-24">
        <h2 className="section-title">Подсказки</h2>
        <div className="card text-sm">
          <p>• Кинотеатры, залы, фильмы и сеансы управляются на соответствующих страницах.</p>
          <p className="mt-8">• Для назначения первого администратора выполните SQL-команду в PostgreSQL:</p>
          <pre style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: 4, marginTop: 8, overflowX: 'auto', fontSize: 13 }}>
            UPDATE users SET role='admin' WHERE username='your_username';
          </pre>
        </div>
      </div>
    </div>
  )
}
