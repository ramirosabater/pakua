import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['alumno', 'profesor', 'admin']

export default function Usuarios() {
  const { profile } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [edits, setEdits] = useState({})     // id -> { full_name, role, telefono }
  const [savingId, setSavingId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [filtro, setFiltro] = useState('')

  async function load() {
    const { data } = await supabase.from('profiles')
      .select('id, full_name, role, telefono')
      .order('role').order('full_name')
    setUsuarios(data ?? [])
    const map = {}
    ;(data ?? []).forEach(u => {
      map[u.id] = { full_name: u.full_name ?? '', role: u.role, telefono: u.telefono ?? '' }
    })
    setEdits(map)
  }
  useEffect(() => { load() }, [])

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
      if (id === profile.id) window.location.reload() // si me cambié a mí mismo, refrescar
      else load()
    }
    setSavingId(null)
  }

  const visibles = usuarios.filter(u =>
    !filtro || (u.full_name ?? '').toLowerCase().includes(filtro.toLowerCase()))

  return (
    <div className="stack">
      <section className="card">
        <h2>Usuarios</h2>
        <p className="muted">
          Editá el nombre y el rol de cada persona. Los alumnos se registran solos desde la app;
          para dar de alta profesores, cambiales el rol acá.
        </p>
        <label className="search">Buscar
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Nombre…" />
        </label>
        {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Rol</th><th>Teléfono</th><th></th></tr>
            </thead>
            <tbody>
              {visibles.map(u => (
                <tr key={u.id}>
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
                  <td className="row-actions">
                    <button className="btn btn-sm btn-primary"
                      onClick={() => guardar(u.id)} disabled={savingId === u.id}>
                      {savingId === u.id ? '…' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Dar de baja un usuario</h2>
        <p className="muted">
          Eliminar una cuenta por completo se hace desde Supabase, en Authentication &gt; Users
          (borra el acceso y sus datos asociados). Desde acá podés cambiar roles y datos, pero no
          borrar la cuenta de acceso, por seguridad.
        </p>
      </section>
    </div>
  )
}
