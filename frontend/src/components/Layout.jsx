import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const ROLE_LABELS = { client: 'Клиент', admin: 'Админ' }

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="layout">
      <nav>
        <div className="nav-inner">
          <NavLink to="/" className="nav-brand">КиноГород</NavLink>
          <div className="nav-links">
            <NavLink to="/cinemas">Кинотеатры</NavLink>
            <NavLink to="/films">Фильмы</NavLink>
            <NavLink to="/sessions">Сеансы</NavLink>
            {user && <NavLink to="/my-tickets">Мои билеты</NavLink>}
            {user && <NavLink to="/profile">Профиль</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin">Админ</NavLink>}
          </div>
          <div className="nav-user">
            {user ? (
              <>
                <span>{user.username} <span className={`badge badge-${user.role}`}>{ROLE_LABELS[user.role] || user.role}</span></span>
                <button className="btn-outline btn btn-sm" onClick={handleLogout}>Выйти</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Войти</NavLink>
                <NavLink to="/register">
                  <button className="btn btn-sm">Регистрация</button>
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}
