import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'

import MisInformes from './pages/student/MisInformes'
import MiAsistencia from './pages/student/MiAsistencia'
import MisPagos from './pages/student/MisPagos'

import TomarAsistencia from './pages/teacher/TomarAsistencia'
import VerInformes from './pages/teacher/VerInformes'
import RevisarPagos from './pages/teacher/RevisarPagos'
import Clases from './pages/teacher/Clases'
import Usuarios from './pages/teacher/Usuarios'
import Calendario from './pages/teacher/Calendario'
import Cobranzas from './pages/teacher/Cobranzas'

function HomeRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return <div className="center-screen">Cargando…</div>
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={profile.role === 'alumno' ? '/alumno' : '/profesor'} replace />
}

const studentNav = [
  { to: '/alumno', label: 'Mis informes' },
  { to: '/alumno/asistencia', label: 'Mi asistencia' },
  { to: '/alumno/pagos', label: 'Mis pagos' },
]

// El menú de profesor/dirección. Cobranzas y Usuarios se muestran solo al admin.
function TeacherLayout() {
  const { profile } = useAuth()
  const nav = [
    { to: '/profesor', label: 'Asistencia' },
    { to: '/profesor/calendario', label: 'Calendario' },
    { to: '/profesor/informes', label: 'Informes' },
    { to: '/profesor/pagos', label: 'Pagos' },
    { to: '/profesor/clases', label: 'Clases' },
  ]
  if (profile?.role === 'admin') {
    nav.push({ to: '/profesor/cobranzas', label: 'Cobranzas' })
    nav.push({ to: '/profesor/usuarios', label: 'Usuarios' })
  }
  return <Layout nav={nav} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/alumno" element={
        <ProtectedRoute roles={['alumno', 'admin']}><Layout nav={studentNav} /></ProtectedRoute>
      }>
        <Route index element={<MisInformes />} />
        <Route path="asistencia" element={<MiAsistencia />} />
        <Route path="pagos" element={<MisPagos />} />
      </Route>

      <Route path="/profesor" element={
        <ProtectedRoute roles={['profesor', 'admin']}><TeacherLayout /></ProtectedRoute>
      }>
        <Route index element={<TomarAsistencia />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="informes" element={<VerInformes />} />
        <Route path="pagos" element={<RevisarPagos />} />
        <Route path="clases" element={<Clases />} />
        <Route path="cobranzas" element={
          <ProtectedRoute roles={['admin']}><Cobranzas /></ProtectedRoute>
        } />
        <Route path="usuarios" element={
          <ProtectedRoute roles={['admin']}><Usuarios /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
