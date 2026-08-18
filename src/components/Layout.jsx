import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_LABEL = { alumno: 'Alumno', profesor: 'Profesor', admin: 'Maestro Línea Dorada' }

export default function Layout({ nav }) {
  const { profile, signOut } = useAuth()
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logopakua.png" alt="Pakua" style={{ height: 40, borderRadius: 4 }} />
          <div>
            <div className="brand-name">Pakua Liga Sudamericana</div>
            <div className="brand-sub">{ROLE_LABEL[profile?.role] ?? ''}</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="who">{profile?.full_name}</span>
          <button className="btn btn-ghost" onClick={signOut}>Salir</button>
        </div>
      </header>
      <nav className="tabs">
        {nav.map(n => (
          <NavLink key={n.to} to={n.to} end
            className={({ isActive }) => 'tab' + (isActive ? ' tab-active' : '')}>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <main className="content"><Outlet /></main>
    </div>
  )
}
