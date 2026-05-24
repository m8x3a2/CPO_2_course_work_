import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="page-title">Добро пожаловать в КиноГород</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Информационная система о кинотеатрах города. Просматривайте кинотеатры, фильмы и расписание сеансов.
      </p>
      <div className="grid grid-3">
        <div className="card">
          <h2 className="section-title">🏛 Кинотеатры</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
            Список кинотеатров города с адресами и залами.
          </p>
          <Link to="/cinemas"><button>Смотреть</button></Link>
        </div>
        <div className="card">
          <h2 className="section-title">🎥 Фильмы</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
            Каталог фильмов с поиском по жанру, режиссёру и году.
          </p>
          <Link to="/films"><button>Смотреть</button></Link>
        </div>
        <div className="card">
          <h2 className="section-title">🎟 Сеансы</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
            Расписание сеансов с фильтрацией по дате, кинотеатру и жанру.
          </p>
          <Link to="/sessions"><button>Смотреть</button></Link>
        </div>
      </div>

      {!user && (
        <div className="alert alert-info mt-24">
          <Link to="/register">Зарегистрируйтесь</Link> или <Link to="/login">войдите</Link>, чтобы покупать билеты на сеансы.
        </div>
      )}
      {user && (
        <div className="alert alert-success mt-24">
          Вы вошли как <strong>{user.username}</strong>. <Link to="/sessions">Перейти к сеансам</Link> и купить билет.
        </div>
      )}
    </div>
  )
}
