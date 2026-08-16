import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { aEmail } from '../lib/usuario'

export default function Login() {
  const { session, profile, loading } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: aEmail(usuario), password })
      if (error) throw error
    } catch (err) {
      setMsg({ type: 'error', text: 'Usuario o contraseña incorrectos.' })
    } finally {
      setBusy(false)
    }
  }

  // Si ya hay sesión iniciada, esperar el perfil y luego ir al panel según el rol.
  if (!loading && session) {
    if (!profile) return <div className="center-screen">Cargando…</div>
    return <Navigate to={profile.role === 'alumno' ? '/alumno' : '/profesor'} replace />
  }

  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-head">
          <img src="/logopakua.png" alt="Pakua Liga Sudamericana"
            style={{ width: '100%', maxWidth: 240, borderRadius: 8, marginBottom: '0.4rem' }} />
          <h1>Pakua Liga Sudamericana</h1>
          <p className="muted">Ingresá a tu cuenta</p>
        </div>
        <form onSubmit={submit} className="form">
          <label>Usuario
            <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
              required autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="tu usuario" />
          </label>
          <label>Contraseña
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </label>
          {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? '…' : 'Ingresar'}
          </button>
        </form>
        <p className="hint center">¿No tenés cuenta? Pedile el alta a la dirección de la academia.</p>
      </div>
    </div>
  )
}
