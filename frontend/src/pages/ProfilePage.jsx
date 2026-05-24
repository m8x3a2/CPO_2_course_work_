import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { promocodesApi } from '../api/index'
import { useAuth } from '../AuthContext'
import { fmtPrice } from '../utils'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  async function applyCode(e) {
    e.preventDefault()
    setMsg('')
    setError('')
    setLoading(true)
    try {
      const updatedUser = await promocodesApi.apply(code)
      setUser(updatedUser)
      setCode('')
      setMsg('Промокод применен')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 className="page-title">Профиль</h1>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card">
        <table>
          <tbody>
            <tr><td style={{ width: 140, color: 'var(--muted)', fontWeight: 500 }}>Логин</td><td>{user.username}</td></tr>
            <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Email</td><td>{user.email}</td></tr>
            <tr><td style={{ color: 'var(--muted)', fontWeight: 500 }}>Баланс</td><td><strong>{fmtPrice(user.balance || 0)}</strong></td></tr>
          </tbody>
        </table>

        <form className="mt-16" onSubmit={applyCode}>
          <div className="form-group">
            <label>Промокод</label>
            <input value={code} onChange={e => setCode(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Проверка...' : 'Применить'}</button>
        </form>
      </div>
    </div>
  )
}
