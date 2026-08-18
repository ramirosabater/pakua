import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const mesActual = () => new Date().toISOString().slice(0, 7)
function rangoMes(mes) {
  const [y, m] = mes.split('-').map(Number)
  return { desde: `${mes}-01`, hasta: new Date(y, m, 1).toISOString().slice(0, 10) }
}

export default function InformeAsistencia() {
  const { session, profile } = useAuth()
  const [clases, setClases] = useState([])
  const [claseId, setClaseId] = useState('')
  const [mes, setMes] = useState(mesActual())
  const [todo, setTodo] = useState(false)
  const [registros, setRegistros] = useState([])

  useEffect(() => {
    let q = supabase.from('clases').select('id, nombre, profesor_id').order('nombre')
    if (profile.role !== 'admin') q = q.eq('profesor_id', session.user.id)
    q.then(({ data }) => setClases(data ?? []))
  }, [])

  async function cargar() {
    const ids = clases.map(c => c.id)
    if (ids.length === 0) { setRegistros([]); return }
    let q = supabase.from('asistencia')
      .select('presente, fecha, clase_id, alumno:profiles!alumno_id(id, full_name), clase:clases(nombre)')
      .in('clase_id', claseId ? [claseId] : ids)
    if (!todo) {
      const { desde, hasta } = rangoMes(mes)
      q = q.gte('fecha', desde).lt('fecha', hasta)
    }
    const { data } = await q
    setRegistros(data ?? [])
  }
  useEffect(() => { cargar() }, [clases, claseId, mes, todo])

  // Agregaciones
  const porAlumno = {}, porClase = {}
  registros.forEach(r => {
    const aid = r.alumno?.id ?? '—'
    porAlumno[aid] = porAlumno[aid] || { nombre: r.alumno?.full_name ?? '—', p: 0, a: 0 }
    r.presente ? porAlumno[aid].p++ : porAlumno[aid].a++
    const cid = r.clase_id
    porClase[cid] = porClase[cid] || { nombre: r.clase?.nombre ?? '—', p: 0, a: 0 }
    r.presente ? porClase[cid].p++ : porClase[cid].a++
  })
  const alumnos = Object.values(porAlumno).sort((x, y) => x.nombre.localeCompare(y.nombre))
  const clasesAgg = Object.values(porClase).sort((x, y) => x.nombre.localeCompare(y.nombre))
  const pct = (p, a) => (p + a) ? Math.round((p / (p + a)) * 100) : 0

  const Tabla = ({ titulo, filas }) => (
    <section className="card">
      <h2>{titulo}</h2>
      {filas.length === 0 && <p className="muted">Sin registros para el filtro elegido.</p>}
      {filas.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{titulo.includes('alumno') ? 'Alumno' : 'Clase'}</th><th>Asistencias</th><th>Inasistencias</th><th>% Asist.</th></tr></thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.nombre}</td>
                  <td className="mono">{f.p}</td>
                  <td className="mono">{f.a}</td>
                  <td className="mono">{pct(f.p, f.a)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  return (
    <div className="stack">
      <section className="card">
        <h2>Reporte de asistencia</h2>
        <div className="grid-2">
          <label>Clase
            <select value={claseId} onChange={e => setClaseId(e.target.value)}>
              <option value="">Todas las clases</option>
              {clases.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label>Mes
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} disabled={todo} />
          </label>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={todo} onChange={e => setTodo(e.target.checked)} />
          Todo el histórico (ignorar el mes)
        </label>
      </section>

      <Tabla titulo="Por alumno" filas={alumnos} />
      <Tabla titulo="Por clase" filas={clasesAgg} />
    </div>
  )
}
