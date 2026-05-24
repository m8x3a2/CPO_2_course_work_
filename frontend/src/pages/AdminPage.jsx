import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminDataApi, authApi, promocodesApi } from '../api/index'
import { useAuth } from '../AuthContext'

const ROLE_LABELS = { client: 'Клиент', admin: 'Админ' }

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [promocodes, setPromocodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)
  const [msg, setMsg] = useState('')
  const [promoForm, setPromoForm] = useState({ code: '', max_uses: 1, amount: 100 })
  const [promoSearch, setPromoSearch] = useState({ code: '', amount: '', used: '' })
  const [userSearch, setUserSearch] = useState({ username: '', email: '', role: '' })

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return }
    Promise.all([loadUsers(), loadPromocodes()]).finally(() => setLoading(false))
  }, [user])

  async function loadUsers() {
    try {
      setUsers(await authApi.listUsers())
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadPromocodes() {
    try {
      setPromocodes(await promocodesApi.list())
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRoleChange(userId, newRole) {
    setUpdating(userId)
    setMsg('')
    try {
      await authApi.updateRole(userId, newRole)
      setMsg('Роль обновлена')
      await loadUsers()
    } catch (err) {
      setMsg('Ошибка: ' + err.message)
    } finally {
      setUpdating(null)
    }
  }

  async function handleUserDelete(userId) {
    if (!confirm('Удалить пользователя? Его билеты и использования промокодов тоже будут удалены.')) return
    setMsg('')
    try {
      await authApi.deleteUser(userId)
      setMsg('Пользователь удален')
      await loadUsers()
    } catch (err) {
      setMsg('Ошибка: ' + err.message)
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
      await loadPromocodes()
    } catch (err) {
      setMsg('Ошибка: ' + err.message)
    }
  }

  async function handlePromoDelete(id) {
    if (!confirm('Удалить промокод?')) return
    try {
      await promocodesApi.delete(id)
      await loadPromocodes()
    } catch (err) {
      setMsg('Ошибка: ' + err.message)
    }
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
      await Promise.all([loadUsers(), loadPromocodes()])
    } catch (err) {
      setMsg('Ошибка импорта: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  const filteredPromocodes = useMemo(() => {
    return promocodes.filter(p => {
      const usedText = `${p.used_count} / ${p.max_uses}`
      return p.code.toLowerCase().includes(promoSearch.code.toLowerCase())
        && String(p.amount).includes(promoSearch.amount)
        && usedText.includes(promoSearch.used)
    })
  }, [promocodes, promoSearch])

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const roleText = ROLE_LABELS[u.role] || u.role
      return u.username.toLowerCase().includes(userSearch.username.toLowerCase())
        && u.email.toLowerCase().includes(userSearch.email.toLowerCase())
        && roleText.toLowerCase().includes(userSearch.role.toLowerCase())
    })
  }, [users, userSearch])

  if (loading) return <div className="loading">Загрузка...</div>

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

      <div className="admin-grid">
        <section>
          <h2 className="section-title">Промокоды</h2>
          <div className="card">
            <form onSubmit={handlePromoCreate} className="filters" style={{ marginBottom: 12 }}>
              <div className="filter-field">
                <label>Код</label>
                <input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value }))} required />
              </div>
              <div className="filter-field">
                <label>Использований</label>
                <input type="number" min="1" value={promoForm.max_uses} onChange={e => setPromoForm(f => ({ ...f, max_uses: e.target.value }))} required />
              </div>
              <div className="filter-field">
                <label>Деньги</label>
                <input type="number" min="1" step="0.01" value={promoForm.amount} onChange={e => setPromoForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <button type="submit">Создать</button>
            </form>
            <div className="table-search-row">
              <input placeholder="Код" value={promoSearch.code} onChange={e => setPromoSearch(f => ({ ...f, code: e.target.value }))} />
              <input placeholder="Деньги" value={promoSearch.amount} onChange={e => setPromoSearch(f => ({ ...f, amount: e.target.value }))} />
              <input placeholder="Использовано" value={promoSearch.used} onChange={e => setPromoSearch(f => ({ ...f, used: e.target.value }))} />
            </div>
            <div className="scroll-list">
              <table>
                <thead><tr><th>Код</th><th>Деньги</th><th>Использовано</th><th></th></tr></thead>
                <tbody>
                  {filteredPromocodes.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.code}</strong></td>
                      <td>{p.amount}</td>
                      <td>{p.used_count} / {p.max_uses}</td>
                      <td><button className="btn-danger btn-sm" onClick={() => handlePromoDelete(p.id)}>Удалить</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title">Пользователи</h2>
          <div className="card">
            <div className="table-search-row">
              <input placeholder="Имя пользователя" value={userSearch.username} onChange={e => setUserSearch(f => ({ ...f, username: e.target.value }))} />
              <input placeholder="Email" value={userSearch.email} onChange={e => setUserSearch(f => ({ ...f, email: e.target.value }))} />
              <input placeholder="Роль" value={userSearch.role} onChange={e => setUserSearch(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="scroll-list">
              <table>
                <thead>
                  <tr><th>Имя пользователя</th><th>Email</th><th>Роль</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong>{u.id === user.id && <span className="text-muted text-sm"> (вы)</span>}</td>
                      <td className="text-muted text-sm">{u.email}</td>
                      <td>
                        {u.id !== user.id ? (
                          <select
                            value={u.role}
                            disabled={updating === u.id}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                          >
                            <option value="client">Клиент</option>
                            <option value="admin">Админ</option>
                          </select>
                        ) : (
                          <span className={`badge badge-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                        )}
                      </td>
                      <td>
                        {u.id !== user.id && (
                          <button className="btn-danger btn-sm" onClick={() => handleUserDelete(u.id)}>Удалить</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
