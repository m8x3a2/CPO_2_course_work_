import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CinemasPage from './pages/CinemasPage'
import CinemaDetailPage from './pages/CinemaDetailPage'
import FilmsPage from './pages/FilmsPage'
import FilmDetailPage from './pages/FilmDetailPage'
import SessionsPage from './pages/SessionsPage'
import MyTicketsPage from './pages/MyTicketsPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="cinemas" element={<CinemasPage />} />
            <Route path="cinemas/:id" element={<CinemaDetailPage />} />
            <Route path="films" element={<FilmsPage />} />
            <Route path="films/:id" element={<FilmDetailPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="my-tickets" element={<MyTicketsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
