import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['alumno', 'profesor', 'admin']
const NUEVO_VACIO = { full_name: '', email: '', password: '', role: 'alumno' }

export default function Usuarios() {
  const { profile } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [edits, setEdits] = useState({})     // id -> { full_name, role, telefono }
  const [savingId, setSavingId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [filtro, setFiltro] = useState('')

  // Alta de usuario
  const [nuevo, setNuevo] = useState(NUEVO_VACIO)
  const [creando, setCreando] = useState(false)
  const [altaMsg, setAltaMsg] = useState(null)
  const [abierto, setAbierto] = useState(false)

  async function load() {
    const { data } = await supabase.from('profiles')
      .select('id, full_name, role, telefono, activo')
      .order('role').order('full_name')
    setUsuarios(data ?? [])
    const map = {}
    ;(data ?? []).forEach(u => {
      map[u.id] = { full_name: u.full_name ?? '', role: u.role, telefono: u.telefono ?? '' }
    })
    setEdits(map)
  }
  useEffect(() => { load() }, [])

  const upNuevo = (campo, valor) => setNuevo(n => ({ ...n, [campo]: valor }))

  async function crearUsuario(e) {
    e.preventDefault(); setCreando(true); setAltaMsg(null)
    try {
      // Cliente temporal para registrar sin pisar la sesión del admin.
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const { data, error } = await tempClient.auth.signUp({
        email: nuevo.email.trim(),
        password: nuevo.password,
        options: { data: { full_name: nuevo.full_name.trim() } },
      })
      if (error) throw error

      const nuevoId = data.user?.id
      if (nuevoId) {
        // El trigger crea el perfil como 'alumno'; ajustamos nombre y rol.
        const { error: e2 } = await supabase.from('profiles')
          .update({ full_name: nuevo.full_name.trim(), role: nuevo.role })
          .eq('id', nuevoId)
        if (e2) throw e2
      }
      setAltaMsg({ type: 'ok', text: `Usuario ${nuevo.email.trim()} creado como ${nuevo.role}.` })
      setNuevo(NUEVO_VACIO)
      setAbierto(false)
      load()
    } catch (err) {
      setAltaMsg({ type: 'error', text: err.message })
    } finally {
      setCreando(false)
    }
  }

  const up = (id, campo, valor) =>
    setEdits(e => ({ ...e, [id]: { ...e[id], [campo]: valor } }))

  async function guardar(id) {
    setSavingId(id); setMsg(null)
    const { full_name, role, telefono } = edits[id]
    const { error } = await supabase.from('profiles')
      .update({ full_name, role, telefono: telefono || null })
      .eq('id', id)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setMsg({ type: 'ok', text: 'Usuario actualizado.' })
      if (id === profile.id) window.location.reload()
      else load()
    }
    setSavingId(null)
  }

  async function toggleActivo(u) {
    setMsg(null)
    if (u.id === profile.id) {
      setMsg({ type: 'error', text: 'No podés desactivar tu propia cuenta.' })
      return
    }
    const { error } = await supabase.from('profiles')
      .update({ activo: !u.activo }).eq('id', u.id)
    if (error) setMsg({ type: 'error', text: error.message })
    else load()
  }

  const visibles = usuarios.filter(u =>
    !filtro || (u.full_name ?? '').toLowerCase().includes(filtro.toLowerCase()))

  return (
    <div className="stack">
      {!abierto && altaMsg && <div className={'alert alert-' + altaMsg.type}>{altaMsg.text}</div>}
      {!abierto ? (
        <div><button className="btn btn-primary" onClick={() => { setAbierto(true); setAltaMsg(null) }}>+ Nuevo usuario</button></div>
      ) : (
      <section className="card">
        <div className="row-between">
          <h2>Alta de usuario</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAbierto(false)}>Cerrar</button>
        </div>
        <p className="muted">
          Creá cuentas de alumnos o profesores. La persona podrá ingresar con el email y la
          contraseña que pongas acá (después puede cambiarla).
        </p>
        <form onSubmit={crearUsuario} className="form">
          <div className="grid-2">
            <label>Nombre y apellido
              <input value={nuevo.full_name} onChange={e => upNuevo('full_name', e.target.value)} required />
            </label>
            <label>Rol
              <select value={nuevo.role} onChange={e => upNuevo('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          <div className="grid-2">
            <label>Email
              <input type="email" value={nuevo.email} onChange={e => upNuevo('email', e.target.value)} required />
            </label>
            <label>Contraseña temporal
              <input type="text" value={nuevo.password} onChange={e => upNuevo('password', e.target.value)}
                required minLength={6} placeholder="mínimo 6 caracteres" />
            </label>
          </div>
          {altaMsg && <div className={'alert alert-' + altaMsg.type}>{altaMsg.text}</div>}
          <button className="btn btn-primary" disabled={creando}>
            {creando ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>
      </section>
      )}

      <section className="card">
        <h2>Usuarios</h2>
        <label className="search">Buscar
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Nombre…" />
        </label>
        {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Rol</th><th>Teléfono</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {visibles.map(u => (
                <tr key={u.id} style={u.activo === false ? { opacity: 0.55 } : undefined}>
                  <td>
                    <input value={edits[u.id]?.full_name ?? ''}
                      onChange={e => up(u.id, 'full_name', e.target.value)} />
                  </td>
                  <td>
                    <select value={edits[u.id]?.role ?? 'alumno'}
                      onChange={e => up(u.id, 'role', e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <input value={edits[u.id]?.telefono ?? ''}
                      onChange={e => up(u.id, 'telefono', e.target.value)} placeholder="—" />
                  </td>
                  <td>
                    {u.activo === false
                      ? <span className="pill pill-off">Inactivo</span>
                      : <span className="pill pill-ok">Activo</span>}
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-sm btn-primary"
                      onClick={() => guardar(u.id)} disabled={savingId === u.id}>
                      {savingId === u.id ? '…' : 'Guardar'}
                    </button>
                    {u.id !== profile.id && (
                      u.activo === false
                        ? <button className="btn btn-sm btn-ok" onClick={() => toggleActivo(u)}>Activar</button>
                        : <button className="btn btn-sm btn-off" onClick={() => toggleActivo(u)}>Desactivar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Sobre dar de baja</h2>
        <p className="muted">
          "Desactivar" da de baja lógica: la persona ya no puede ingresar, pero se conservan sus
          datos (informes, pagos, asistencia). Podés reactivarla cuando quieras. Para borrar la
          cuenta de acceso por completo y de forma permanente, se hace desde Supabase, en
          Authentication &gt; Users.
        </p>
      </section>
    </div>
  )
}
