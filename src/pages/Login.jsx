import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import OctagonMark from '../components/OctagonMark'

export default function Login() {
  const { session, profile, loading } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        setMsg({ type: 'ok', text: 'Cuenta creada. Ya podés ingresar.' })
        setMode('login')
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  // Si ya hay sesión iniciada, ir al panel según el rol.
  if (!loading && session) {
    return <Navigate to={profile?.role === 'alumno' ? '/alumno' : '/profesor'} replace />
  }

  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-head">
          <OctagonMark size={52} />
          <h1>Academia de Pakua</h1>
          <p className="muted">{mode === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta de alumno'}</p>
        </div>
        <form onSubmit={submit} className="form">
          {mode === 'signup' && (
            <label>Nombre y apellido
              <input value={fullName} onChange={e => setFullName(e.target.value)} required />
            </label>
          )}
          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>Contraseña
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </label>
          {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>
        <button className="link-btn center" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null) }}>
          {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
        </button>
      </div>
    </div>
  )
}
