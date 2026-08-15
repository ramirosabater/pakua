import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function TomarAsistencia() {
  const { session, profile } = useAuth()
  const [clases, setClases] = useState([])
  const [claseId, setClaseId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [alumnos, setAlumnos] = useState([])
  const [estado, setEstado] = useState({})
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let query = supabase.from('clases').select('id, nombre').order('nombre')
    if (profile.role !== 'admin') query = query.eq('profesor_id', session.user.id)
    query.then(({ data }) => setClases(data ?? []))
  }, [])

  async function loadRoster() {
    if (!claseId) { setAlumnos([]); return }
    const { data: insc } = await supabase
      .from('inscripciones')
      .select('alumno:profiles(id, full_name)')
      .eq('clase_id', claseId)
    const list = (insc ?? []).map(i => i.alumno).filter(Boolean)
    setAlumnos(list)

    const { data: asis } = await supabase
      .from('asistencia').select('alumno_id, presente')
      .eq('clase_id', claseId).eq('fecha', fecha)
    const map = {}
    list.forEach(a => { map[a.id] = true })
    ;(asis ?? []).forEach(a => { map[a.alumno_id] = a.presente })
    setEstado(map)
  }
  useEffect(() => { loadRoster() }, [claseId, fecha])

  async function save() {
    setBusy(true); setMsg(null)
    const rows = alumnos.map(a => ({
      clase_id: claseId, alumno_id: a.id, fecha,
      presente: !!estado[a.id], registrado_por: session.user.id,
    }))
    const { error } = await supabase.from('asistencia')
      .upsert(rows, { onConflict: 'clase_id,alumno_id,fecha' })
    setMsg(error ? { type: 'error', text: error.message } : { type: 'ok', text: 'Asistencia guardada.' })
    setBusy(false)
  }

  return (
    <section className="card">
      <h2>Tomar asistencia</h2>
      <div className="grid-2">
        <label>Clase
          <select value={claseId} onChange={e => setClaseId(e.target.value)}>
            <option value="">Elegí una clase…</option>
            {clases.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label>Fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </label>
      </div>

      {claseId && alumnos.length === 0 && <p className="muted">No hay alumnos inscriptos en esta clase.</p>}

      {alumnos.length > 0 && (
        <>
          <ul className="roster">
            {alumnos.map(a => (
              <li key={a.id} className="roster-row">
                <span>{a.full_name}</span>
                <label className={'switch' + (estado[a.id] ? ' on' : '')}>
                  <input type="checkbox" checked={!!estado[a.id]}
                    onChange={e => setEstado({ ...estado, [a.id]: e.target.checked })} />
                  <span>{estado[a.id] ? 'Presente' : 'Ausente'}</span>
                </label>
              </li>
            ))}
          </ul>
          {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
          <button className="btn btn-primary" onClick={save} disabled={busy}>Guardar asistencia</button>
        </>
      )}
    </section>
  )
}
