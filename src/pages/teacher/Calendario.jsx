import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const CABECERA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

export default function Calendario() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [clases, setClases] = useState([])
  const [claseId, setClaseId] = useState('')
  const hoy = new Date()
  const [ym, setYm] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() })

  useEffect(() => {
    let query = supabase.from('clases').select('id, nombre, dias, hora, horario').order('nombre')
    if (profile.role !== 'admin') query = query.eq('profesor_id', session.user.id)
    query.then(({ data }) => {
      setClases(data ?? [])
      if (data?.length) setClaseId(data[0].id)
    })
  }, [])

  const clase = clases.find(c => c.id === claseId)
  const dias = clase?.dias ?? []

  function cambiarMes(delta) {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  // Construir la grilla del mes (semana arranca en lunes)
  const primerDia = new Date(ym.y, ym.m, 1)
  const diasEnMes = new Date(ym.y, ym.m + 1, 0).getDate()
  const offset = (primerDia.getDay() + 6) % 7  // getDay: 0=Dom -> queremos Lun primero
  const celdas = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  const esHoy = d => d === hoy.getDate() && ym.y === hoy.getFullYear() && ym.m === hoy.getMonth()

  function irAAsistencia(dia) {
    const fecha = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    navigate(`/profesor?clase=${claseId}&fecha=${fecha}`)
  }

  return (
    <section className="card">
      <h2>Calendario de clases</h2>
      <label>Clase
        <select value={claseId} onChange={e => setClaseId(e.target.value)}>
          {clases.length === 0 && <option value="">Sin clases</option>}
          {clases.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}{c.horario ? ` · ${c.horario}` : ''}</option>
          ))}
        </select>
      </label>

      {clase && (
        <>
          <div className="cal-nav">
            <button className="btn btn-ghost btn-sm" onClick={() => cambiarMes(-1)}>← Anterior</button>
            <span className="cal-title">{MESES[ym.m]} {ym.y}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => cambiarMes(1)}>Siguiente →</button>
          </div>

          {dias.length === 0 && (
            <div className="alert alert-warn">Esta clase no tiene días asignados. Cargalos en la pestaña Clases.</div>
          )}

          <div className="cal-grid">
            {CABECERA.map(h => <div key={h} className="cal-head">{h}</div>)}
            {celdas.map((d, i) => {
              if (d === null) return <div key={'e' + i} className="cal-cell empty" />
              const dow = new Date(ym.y, ym.m, d).getDay()
              const esClase = dias.includes(dow)
              const cls = 'cal-cell' + (esClase ? ' clase' : '') + (esHoy(d) ? ' hoy' : '')
              return (
                <div key={d} className={cls}
                  onClick={esClase ? () => irAAsistencia(d) : undefined}
                  title={esClase ? 'Tomar asistencia' : undefined}>
                  {d}
                </div>
              )
            })}
          </div>
          <p className="hint">Los días en verde son de clase. Tocá uno para tomar asistencia de esa fecha.</p>
        </>
      )}
    </section>
  )
}
