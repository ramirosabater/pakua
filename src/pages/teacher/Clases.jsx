import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const CLASE_VACIA = { nombre: '', horario: '', descripcion: '', profesor_id: '', requiere_informe: false }

export default function Clases() {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'
  const [clases, setClases] = useState([])
  const [profesores, setProfesores] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [msg, setMsg] = useState(null)

  // Formulario de alta/edición. editId = null => alta; con valor => edición.
  const [form, setForm] = useState(CLASE_VACIA)
  const [editId, setEditId] = useState(null)

  // Gestión de inscripciones
  const [selClase, setSelClase] = useState('')
  const [inscriptos, setInscriptos] = useState([])
  const [addAlumno, setAddAlumno] = useState('')

  async function load() {
    const { data: cl } = await supabase.from('clases')
      .select('*, profesor:profiles(full_name)').order('nombre')
    setClases(cl ?? [])
    const { data: profs } = await supabase.from('profiles')
      .select('id, full_name').in('role', ['profesor', 'admin'])
    setProfesores(profs ?? [])
    const { data: al } = await supabase.from('profiles')
      .select('id, full_name').eq('role', 'alumno')
    setAlumnos(al ?? [])
  }
  useEffect(() => { load() }, [])

  function editar(c) {
    setEditId(c.id)
    setForm({
      nombre: c.nombre ?? '',
      horario: c.horario ?? '',
      descripcion: c.descripcion ?? '',
      profesor_id: c.profesor_id ?? '',
      requiere_informe: !!c.requiere_informe,
    })
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditId(null)
    setForm(CLASE_VACIA)
    setMsg(null)
  }

  async function guardar(e) {
    e.preventDefault(); setMsg(null)
    const datos = {
      nombre: form.nombre,
      horario: form.horario || null,
      descripcion: form.descripcion || null,
      profesor_id: form.profesor_id || null,
      requiere_informe: form.requiere_informe,
    }
    const { error } = editId
      ? await supabase.from('clases').update(datos).eq('id', editId)
      : await supabase.from('clases').insert(datos)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setMsg({ type: 'ok', text: editId ? 'Clase actualizada.' : 'Clase creada.' })
    cancelar()
    load()
  }

  async function borrar(c) {
    const ok = window.confirm(
      `¿Eliminar la clase "${c.nombre}"?\n\nSe borrarán también sus inscripciones y su asistencia. Esta acción no se puede deshacer.`
    )
    if (!ok) return
    const { error } = await supabase.from('clases').delete().eq('id', c.id)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    if (selClase === c.id) { setSelClase(''); setInscriptos([]) }
    load()
  }

  async function loadInscriptos(claseId) {
    setSelClase(claseId)
    if (!claseId) { setInscriptos([]); return }
    const { data } = await supabase.from('inscripciones')
      .select('id, alumno:profiles(id, full_name)').eq('clase_id', claseId)
    setInscriptos(data ?? [])
  }

  async function inscribir() {
    if (!addAlumno || !selClase) return
    await supabase.from('inscripciones').insert({ clase_id: selClase, alumno_id: addAlumno })
    setAddAlumno(''); loadInscriptos(selClase)
  }

  async function quitar(id) {
    await supabase.from('inscripciones').delete().eq('id', id)
    loadInscriptos(selClase)
  }

  const claseSel = clases.find(c => c.id === selClase)
  const up = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  return (
    <div className="stack">
      {isAdmin && (
        <section className="card">
          <h2>{editId ? 'Editar clase' : 'Nueva clase'}</h2>
          <form onSubmit={guardar} className="form">
            <div className="grid-2">
              <label>Nombre
                <input value={form.nombre} onChange={e => up('nombre', e.target.value)} required />
              </label>
              <label>Horario
                <input value={form.horario} onChange={e => up('horario', e.target.value)} placeholder="Lun y Mié 19hs" />
              </label>
            </div>
            <label>Descripción
              <input value={form.descripcion} onChange={e => up('descripcion', e.target.value)} placeholder="Opcional" />
            </label>
            <label>Profesor a cargo
              <select value={form.profesor_id} onChange={e => up('profesor_id', e.target.value)}>
                <option value="">Sin asignar</option>
                {profesores.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.requiere_informe}
                onChange={e => up('requiere_informe', e.target.checked)} />
              Clase especial (requiere informe del alumno)
            </label>
            {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
            <div className="row-actions">
              <button className="btn btn-primary">{editId ? 'Guardar cambios' : 'Crear clase'}</button>
              {editId && <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>}
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Clases</h2>
        {clases.length === 0 && <p className="muted">No hay clases cargadas.</p>}
        {clases.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Clase</th><th>Horario</th><th>Profesor</th><th>Especial</th><th></th></tr>
              </thead>
              <tbody>
                {clases.map(c => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.horario || '—'}</td>
                    <td>{c.profesor?.full_name ?? '—'}</td>
                    <td>{c.requiere_informe ? 'Sí' : 'No'}</td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => loadInscriptos(c.id)}>Inscriptos</button>
                      {isAdmin && <button className="link-btn" onClick={() => editar(c)}>Editar</button>}
                      {isAdmin && <button className="link-btn danger" onClick={() => borrar(c)}>Eliminar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selClase && (
        <section className="card">
          <h2>Inscriptos · {claseSel?.nombre}</h2>
          <div className="inline-add">
            <select value={addAlumno} onChange={e => setAddAlumno(e.target.value)}>
              <option value="">Agregar alumno…</option>
              {alumnos.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
            <button className="btn btn-sm btn-primary" onClick={inscribir}>Inscribir</button>
          </div>
          {inscriptos.length === 0 && <p className="muted">Nadie inscripto todavía.</p>}
          <ul className="list">
            {inscriptos.map(i => (
              <li key={i.id} className="list-item row-between">
                <span>{i.alumno?.full_name}</span>
                <button className="link-btn danger" onClick={() => quitar(i.id)}>Quitar</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
