import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

// Convención de días igual a JS getDay(): 0=Dom ... 6=Sáb
const DIAS = [
  { n: 1, lbl: 'Lun' }, { n: 2, lbl: 'Mar' }, { n: 3, lbl: 'Mié' },
  { n: 4, lbl: 'Jue' }, { n: 5, lbl: 'Vie' }, { n: 6, lbl: 'Sáb' }, { n: 0, lbl: 'Dom' },
]
const LBL = Object.fromEntries(DIAS.map(d => [d.n, d.lbl]))

function horarioTexto(dias, hora) {
  const ds = DIAS.filter(d => dias.includes(d.n)).map(d => d.lbl)
  if (ds.length === 0 && !hora) return null
  return (ds.join(', ') + (hora ? ' ' + hora : '')).trim()
}

const FORM_VACIO = { nombre: '', descripcion: '', profesor_id: '', requiere_informe: false, dias: [], hora: '', cuota: '' }

export default function Clases() {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'
  const [clases, setClases] = useState([])
  const [profesores, setProfesores] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [msg, setMsg] = useState(null)

  const [form, setForm] = useState(FORM_VACIO)
  const [editId, setEditId] = useState(null)
  const [abierto, setAbierto] = useState(false)

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
      .select('id, full_name').eq('role', 'alumno').eq('activo', true)
    setAlumnos(al ?? [])
  }
  useEffect(() => { load() }, [])

  const up = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))
  const toggleDia = n => setForm(f => ({
    ...f, dias: f.dias.includes(n) ? f.dias.filter(x => x !== n) : [...f.dias, n],
  }))

  function editar(c) {
    setEditId(c.id)
    setForm({
      nombre: c.nombre ?? '', descripcion: c.descripcion ?? '',
      profesor_id: c.profesor_id ?? '', requiere_informe: !!c.requiere_informe,
      dias: c.dias ?? [], hora: c.hora ?? '', cuota: c.cuota ?? '',
    })
    setMsg(null)
    setAbierto(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() { setEditId(null); setForm(FORM_VACIO); setMsg(null); setAbierto(false) }

  async function guardar(e) {
    e.preventDefault(); setMsg(null)
    const datos = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      profesor_id: form.profesor_id || null,
      requiere_informe: form.requiere_informe,
      dias: form.dias,
      hora: form.hora || null,
      cuota: Number(form.cuota) || 0,
      horario: horarioTexto(form.dias, form.hora),
    }
    const { error } = editId
      ? await supabase.from('clases').update(datos).eq('id', editId)
      : await supabase.from('clases').insert(datos)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setMsg({ type: 'ok', text: editId ? 'Clase actualizada.' : 'Clase creada.' })
    setEditId(null); setForm(FORM_VACIO); setAbierto(false); load()
  }

  async function borrar(c) {
    const ok = window.confirm(
      `¿Eliminar la clase "${c.nombre}"?\n\nSe borrarán también sus inscripciones y su asistencia. No se puede deshacer.`
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

  return (
    <div className="stack">
      {isAdmin && !abierto && msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
      {isAdmin && !abierto && (
        <div><button className="btn btn-primary" onClick={() => { cancelar(); setAbierto(true) }}>+ Nueva clase</button></div>
      )}
      {isAdmin && abierto && (
        <section className="card">
          <div className="row-between">
            <h2>{editId ? 'Editar clase' : 'Nueva clase'}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelar}>Cerrar</button>
          </div>
          <form onSubmit={guardar} className="form">
            <label>Nombre
              <input value={form.nombre} onChange={e => up('nombre', e.target.value)} required />
            </label>
            <label>Descripción
              <input value={form.descripcion} onChange={e => up('descripcion', e.target.value)} placeholder="Opcional" />
            </label>
            <label>Profesor a cargo
              <select value={form.profesor_id} onChange={e => up('profesor_id', e.target.value)}>
                <option value="">Sin asignar</option>
                {profesores.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </label>

            <div>
              <span className="field-label">Días de clase</span>
              <div className="dias-row">
                {DIAS.map(d => (
                  <button type="button" key={d.n}
                    className={'dia-chip' + (form.dias.includes(d.n) ? ' on' : '')}
                    onClick={() => toggleDia(d.n)}>
                    {d.lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid-2">
              <label>Hora de inicio
                <input type="time" value={form.hora} onChange={e => up('hora', e.target.value)} />
              </label>
              <label>Valor de la cuota ($)
                <input type="number" step="0.01" min="0" value={form.cuota}
                  onChange={e => up('cuota', e.target.value)} placeholder="0" />
              </label>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={form.requiere_informe}
                onChange={e => up('requiere_informe', e.target.checked)} />
              Clase especial (requiere informe del alumno)
            </label>
            {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
            <div className="row-actions">
              <button className="btn btn-primary">{editId ? 'Guardar cambios' : 'Crear clase'}</button>
              <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>
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
                <tr><th>Clase</th><th>Horario</th><th>Cuota</th><th>Profesor</th><th>Especial</th><th></th></tr>
              </thead>
              <tbody>
                {clases.map(c => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.horario || '—'}</td>
                    <td className="mono">${Number(c.cuota || 0).toLocaleString('es-AR')}</td>
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

export { LBL }
