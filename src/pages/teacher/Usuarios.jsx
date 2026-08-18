import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { aEmail, sanitizarUsuario } from '../../lib/usuario'
import { RANGOS, calcularEdad } from '../../lib/pakua'

const ROLES = ['alumno', 'profesor', 'admin']
const FORM_VACIO = {
  full_name: '', usuario: '', password: '', role: 'alumno', rango: '',
  fecha_nacimiento: '', dni: '', direccion: '',
  contacto1_nombre: '', contacto1_tel: '', contacto2_nombre: '', contacto2_tel: '',
  antecedentes: '',
}
const CAMPOS_PERFIL = ['full_name', 'role', 'rango', 'fecha_nacimiento', 'dni', 'direccion',
  'contacto1_nombre', 'contacto1_tel', 'contacto2_nombre', 'contacto2_tel', 'antecedentes']

export default function Usuarios() {
  const { profile } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [msg, setMsg] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState(FORM_VACIO)
  const [editId, setEditId] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('profiles')
      .select('id, full_name, role, telefono, activo, usuario, rango, fecha_nacimiento, dni, direccion, contacto1_nombre, contacto1_tel, contacto2_nombre, contacto2_tel, antecedentes')
      .order('role').order('full_name')
    setUsuarios(data ?? [])
  }
  useEffect(() => { load() }, [])

  const up = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  function nuevo() {
    setForm(FORM_VACIO); setEditId(null); setMsg(null); setAbierto(true)
  }
  function editar(u) {
    const f = { ...FORM_VACIO }
    CAMPOS_PERFIL.forEach(c => { f[c] = u[c] ?? '' })
    f.role = u.role
    setForm(f); setEditId(u.id); setMsg(null); setAbierto(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function cancelar() { setForm(FORM_VACIO); setEditId(null); setAbierto(false) }

  async function guardar(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      const esAlumno = form.role === 'alumno'
      const perfil = {
        full_name: form.full_name.trim(),
        role: form.role,
        rango: esAlumno ? (form.rango || null) : null,
        fecha_nacimiento: esAlumno ? (form.fecha_nacimiento || null) : null,
        dni: esAlumno ? (form.dni || null) : null,
        direccion: esAlumno ? (form.direccion || null) : null,
        contacto1_nombre: esAlumno ? (form.contacto1_nombre || null) : null,
        contacto1_tel: esAlumno ? (form.contacto1_tel || null) : null,
        contacto2_nombre: esAlumno ? (form.contacto2_nombre || null) : null,
        contacto2_tel: esAlumno ? (form.contacto2_tel || null) : null,
        antecedentes: esAlumno ? (form.antecedentes || null) : null,
      }

      if (editId) {
        const { error } = await supabase.from('profiles').update(perfil).eq('id', editId)
        if (error) throw error
        setMsg({ type: 'ok', text: 'Usuario actualizado.' })
      } else {
        const usuarioGuardar = form.usuario.includes('@')
          ? form.usuario.trim().toLowerCase() : sanitizarUsuario(form.usuario)
        if (!usuarioGuardar) throw new Error('Ingresá un usuario válido.')
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )
        const { data, error } = await tempClient.auth.signUp({
          email: aEmail(form.usuario), password: form.password,
          options: { data: { full_name: form.full_name.trim() } },
        })
        if (error) {
          if (/registered|already/i.test(error.message)) throw new Error('Ese usuario ya existe. Elegí otro.')
          throw error
        }
        const nuevoId = data.user?.id
        if (nuevoId) {
          const { error: e2 } = await supabase.from('profiles')
            .update({ ...perfil, usuario: usuarioGuardar }).eq('id', nuevoId)
          if (e2) throw e2
        }
        setMsg({ type: 'ok', text: `Usuario "${usuarioGuardar}" creado. Ya puede ingresar.` })
      }
      cancelar(); load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function toggleActivo(u) {
    setMsg(null)
    if (u.id === profile.id) { setMsg({ type: 'error', text: 'No podés desactivar tu propia cuenta.' }); return }
    const { error } = await supabase.from('profiles').update({ activo: !u.activo }).eq('id', u.id)
    if (error) setMsg({ type: 'error', text: error.message })
    else load()
  }

  const esAlumno = form.role === 'alumno'
  const visibles = usuarios.filter(u =>
    !filtro || (u.full_name ?? '').toLowerCase().includes(filtro.toLowerCase()))

  return (
    <div className="stack">
      {!abierto && msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
      {!abierto ? (
        <div><button className="btn btn-primary" onClick={nuevo}>+ Nuevo usuario</button></div>
      ) : (
        <section className="card">
          <div className="row-between">
            <h2>{editId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelar}>Cerrar</button>
          </div>
          <form onSubmit={guardar} className="form">
            <div className="grid-2">
              <label>Nombre y apellido
                <input value={form.full_name} onChange={e => up('full_name', e.target.value)} required />
              </label>
              <label>Rol
                <select value={form.role} onChange={e => up('role', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>

            {!editId && (
              <>
                <div className="grid-2">
                  <label>Usuario
                    <input type="text" value={form.usuario} onChange={e => up('usuario', e.target.value)}
                      required autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="ej: juan.perez" />
                  </label>
                  <label>Contraseña temporal
                    <input type="text" value={form.password} onChange={e => up('password', e.target.value)}
                      required minLength={6} placeholder="mínimo 6 caracteres" />
                  </label>
                </div>
                <p className="hint">El alumno ingresa con ese usuario y esa contraseña. No hace falta email.</p>
              </>
            )}

            {esAlumno && (
              <>
                <div className="grid-2">
                  <label>DNI
                    <input value={form.dni} onChange={e => up('dni', e.target.value)} />
                  </label>
                  <label>Fecha de nacimiento
                    <input type="date" value={form.fecha_nacimiento} onChange={e => up('fecha_nacimiento', e.target.value)} />
                  </label>
                </div>
                <div className="grid-2">
                  <label>Rango
                    <select value={form.rango} onChange={e => up('rango', e.target.value)}>
                      <option value="">Sin asignar</option>
                      {RANGOS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label>Dirección
                    <input value={form.direccion} onChange={e => up('direccion', e.target.value)} />
                  </label>
                </div>

                <span className="field-label">Contacto 1</span>
                <div className="grid-2">
                  <label>Nombre
                    <input value={form.contacto1_nombre} onChange={e => up('contacto1_nombre', e.target.value)} />
                  </label>
                  <label>Teléfono
                    <input value={form.contacto1_tel} onChange={e => up('contacto1_tel', e.target.value)} />
                  </label>
                </div>
                <span className="field-label">Contacto 2</span>
                <div className="grid-2">
                  <label>Nombre
                    <input value={form.contacto2_nombre} onChange={e => up('contacto2_nombre', e.target.value)} />
                  </label>
                  <label>Teléfono
                    <input value={form.contacto2_tel} onChange={e => up('contacto2_tel', e.target.value)} />
                  </label>
                </div>

                <label>Antecedentes médicos
                  <textarea rows={4} value={form.antecedentes} onChange={e => up('antecedentes', e.target.value)}
                    placeholder="Alergias, lesiones, condiciones a tener en cuenta…" />
                </label>
              </>
            )}

            {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
            <div className="row-actions">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? '…' : editId ? 'Guardar cambios' : 'Crear usuario'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Usuarios</h2>
        <label className="search">Buscar
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Nombre…" />
        </label>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Usuario</th><th>Rango</th><th>Edad</th><th>Rol</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {visibles.map(u => (
                <tr key={u.id} style={u.activo === false ? { opacity: 0.55 } : undefined}>
                  <td>{u.full_name || '—'}</td>
                  <td className="mono">{u.usuario || '—'}</td>
                  <td>{u.rango || '—'}</td>
                  <td className="mono">{calcularEdad(u.fecha_nacimiento) ?? '—'}</td>
                  <td>{u.role}</td>
                  <td>{u.activo === false
                    ? <span className="pill pill-off">Inactivo</span>
                    : <span className="pill pill-ok">Activo</span>}</td>
                  <td className="row-actions">
                    <button className="btn btn-sm btn-primary" onClick={() => editar(u)}>Editar</button>
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
          datos. Podés reactivarla cuando quieras. Para borrar la cuenta de acceso por completo,
          se hace desde Supabase (Authentication &gt; Users).
        </p>
      </section>
    </div>
  )
}
