import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const CABECERA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
// Colores distintos por clase (para diferenciarlas en el calendario)
const COLORS = ['#3FA66A','#7C5CE0','#3B82C4','#D6A43C','#2AA7A0','#C4547E','#D9663A','#5B8DEF','#B0843C','#4CAF50']

export default function Calendario() {
  const { session, profile } = useAuth()
  const [clases, setClases] = useState([])
  const hoy = new Date()
  const [ym, setYm] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() })

  useEffect(() => {
    let query = supabase.from('clases').select('id, nombre, dias, hora, horario').order('nombre')
    if (profile.role !== 'admin') query = query.eq('profesor_id', session.user.id)
    query.then(({ data }) => {
      const conColor = (data ?? []).map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }))
      setClases(conColor)
    })
  }, [])

  // Mapa día de la semana (0..6) -> clases de ese día, ordenadas por hora
  const porDia = {}
  clases.forEach(c => (c.dias ?? []).forEach(d => { (porDia[d] = porDia[d] || []).push(c) }))
  Object.values(porDia).forEach(arr => arr.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')))

  function cambiarMes(delta) {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const primerDia = new Date(ym.y, ym.m, 1)
  const diasEnMes = new Date(ym.y, ym.m + 1, 0).getDate()
  const offset = (primerDia.getDay() + 6) % 7  // semana arranca en lunes
  const celdas = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  const esHoy = d => d === hoy.getDate() && ym.y === hoy.getFullYear() && ym.m === hoy.getMonth()

  return (
    <section className="card">
      <h2>Calendario de clases</h2>

      <div className="cal-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => cambiarMes(-1)}>← Anterior</button>
        <span className="cal-title">{MESES[ym.m]} {ym.y}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => cambiarMes(1)}>Siguiente →</button>
      </div>

      <div className="cal-grid">
        {CABECERA.map(h => <div key={h} className="cal-head">{h}</div>)}
        {celdas.map((d, i) => {
          if (d === null) return <div key={'e' + i} className="cal-cell empty" />
          const dow = new Date(ym.y, ym.m, d).getDay()
          const evs = porDia[dow] ?? []
          return (
            <div key={d} className={'cal-cell' + (esHoy(d) ? ' hoy' : '')}>
              <span className="cal-daynum">{d}</span>
              {evs.map(c => (
                <div key={c.id} className="cal-ev" title={`${c.nombre}${c.hora ? ' · ' + c.hora : ''}`}>
                  <span className="cal-dot" style={{ background: c.color }} />
                  {c.hora ? c.hora + ' ' : ''}{c.nombre}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {clases.length > 0 && (
        <div className="cal-legend">
          {clases.map(c => (
            <span key={c.id} className="cal-legend-item">
              <span className="cal-dot" style={{ background: c.color }} />
              {c.nombre}{c.horario ? ` · ${c.horario}` : ''}
            </span>
          ))}
        </div>
      )}
      {clases.length === 0 && <p className="muted">No hay clases con días asignados. Cargalos en la pestaña Clases.</p>}
    </section>
  )
}
