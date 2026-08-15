import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { session, profile, loading, signOut } = useAuth()
  if (loading) return <div className="center-screen">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />
  // La sesión ya existe pero el perfil (rol) puede tardar un instante en llegar.
  if (!profile) return <div className="center-screen">Cargando…</div>

  // Cuenta dada de baja: bloquea el acceso sin borrar los datos.
  if (profile && profile.activo === false) {
    return (
      <div className="center-screen">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Cuenta desactivada</h1>
          <p className="muted">Tu cuenta está inhabilitada. Contactá a la dirección de la academia.</p>
          <button className="btn btn-ghost" onClick={signOut} style={{ marginTop: '1rem' }}>Salir</button>
        </div>
      </div>
    )
  }

  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}
