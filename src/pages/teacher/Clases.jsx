import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function Clases() {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'
  const [clases, setClases] = useState([])
  const [profesores, setProfesores] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [msg, setMsg] = useState(null)

  const [nombre, setNombre] = useState('')
  const [horario, setHorario] = useState('')
  const [profesorId, setProfesorId] = useState('')
  const [requiereInforme, setRequiereInforme] = useState(false)

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

  async function crearClase(e) {
    e.preventDefault(); setMsg(null)
    const { error } = await supabase.from('clases').insert({
      nombre, horario, profesor_id: profesorId || null, requiere_informe: requiereInforme,
    })
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setNombre(''); setHorario(''); setProfesorId(''); setRequiereInforme(false)
      load()
    }
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
      {isAdmin && (
        <section className="card">
          <h2>Nueva clase</h2>
          <form onSubmit={crearClase} className="form">
            <div className="grid-2">
              <label>Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} required /></label>
              <label>Horario<input value={horario} onChange={e => setHorario(e.target.value)} placeholder="Lun y Mié 19hs" /></label>
            </div>
            <label>Profesor a cargo
              <select value={profesorId} onChange={e => setProfesorId(e.target.value)}>
                <option value="">Sin asignar</option>
                {profesores.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={requiereInforme} onChange={e => setRequiereInforme(e.target.checked)} />
              Clase especial (requiere informe del alumno)
            </label>
            {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
            <button className="btn btn-primary">Crear clase</button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Clases</h2>
        {clases.length === 0 && <p className="muted">No hay clases cargadas.</p>}
        {clases.length > 0 && (
          <table className="table">
            <thead><tr><th>Clase</th><th>Horario</th><th>Profesor</th><th>Especial</th><th></th></tr></thead>
            <tbody>
              {clases.map(c => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.horario || '—'}</td>
                  <td>{c.profesor?.full_name ?? '—'}</td>
                  <td>{c.requiere_informe ? 'Sí' : 'No'}</td>
                  <td><button className="link-btn" onClick={() => loadInscriptos(c.id)}>Inscriptos</button></td>
                </tr>
              ))}
            </tbody>
          </table>
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
