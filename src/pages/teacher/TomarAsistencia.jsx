import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const DIA_GRACIA = 10  // hasta el día 10 del mes, no pagar aún no es "deuda"

// Estado de cuota del mes actual según el pago (o su ausencia).
function estadoCuota(estadoPago, diaDelMes) {
  if (estadoPago === 'aprobado') return { key: 'pago', label: 'Al día', pill: 'ok' }
  if (estadoPago === 'pendiente') return { key: 'revision', label: 'Pago en revisión', pill: 'warn' }
  if (diaDelMes > DIA_GRACIA) return { key: 'deuda', label: 'Con deuda', pill: 'off' }
  return { key: 'plazo', label: 'Sin pagar (en plazo)', pill: 'warn' }
}

function estiloFila(key) {
  if (key === 'deuda') return { borderLeft: '3px solid var(--danger)', background: 'rgba(200,111,92,0.10)', paddingLeft: '0.6rem' }
  if (key === 'revision' || key === 'plazo') return { borderLeft: '3px solid var(--brass)', paddingLeft: '0.6rem' }
  return { borderLeft: '3px solid transparent', paddingLeft: '0.6rem' }
}

function ultimaFechaDeClase(dias) {
  const hoy = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() - i)
    if (dias.includes(d.getDay())) return d.toISOString().slice(0, 10)
  }
  return hoy.toISOString().slice(0, 10)
}

export default function TomarAsistencia() {
  const { session, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [clases, setClases] = useState([])
  const [claseId, setClaseId] = useState(searchParams.get('clase') || '')
  const [fecha, setFecha] = useState(searchParams.get('fecha') || new Date().toISOString().slice(0, 10))
  const [alumnos, setAlumnos] = useState([])
  const [estado, setEstado] = useState({})      // alumno_id -> presente (bool)
  const [cuotas, setCuotas] = useState({})      // alumno_id -> estado de cuota
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let query = supabase.from('clases').select('id, nombre, dias, hora, horario').order('nombre')
    if (profile.role !== 'admin') query = query.eq('profesor_id', session.user.id)
    query.then(({ data }) => setClases(data ?? []))
  }, [])

  function seleccionarClase(id) {
    setClaseId(id)
    const c = clases.find(x => x.id === id)
    if (c?.dias?.length) setFecha(ultimaFechaDeClase(c.dias))
  }

  async function loadRoster() {
    if (!claseId) { setAlumnos([]); return }
    const { data: insc } = await supabase
      .from('inscripciones').select('alumno:profiles(id, full_name)').eq('clase_id', claseId)
    const list = (insc ?? []).map(i => i.alumno).filter(Boolean)
    setAlumnos(list)

    // Asistencia ya cargada para esa fecha
    const { data: asis } = await supabase
      .from('asistencia').select('alumno_id, presente').eq('clase_id', claseId).eq('fecha', fecha)
    const mapA = {}
    list.forEach(a => { mapA[a.id] = true })
    ;(asis ?? []).forEach(a => { mapA[a.alumno_id] = a.presente })
    setEstado(mapA)

    // Estado de cuota del MES ACTUAL para cada alumno
    const ids = list.map(a => a.id)
    const periodoActual = new Date().toISOString().slice(0, 7)
    const diaDelMes = new Date().getDate()
    const mapC = {}
    if (ids.length) {
      const { data: pagosMes } = await supabase
        .from('pagos').select('alumno_id, estado').eq('periodo', periodoActual).in('alumno_id', ids)
      const rank = { aprobado: 3, pendiente: 2, rechazado: 1 }
      const mejor = {}
      ;(pagosMes ?? []).forEach(p => {
        if (!mejor[p.alumno_id] || rank[p.estado] > rank[mejor[p.alumno_id]]) mejor[p.alumno_id] = p.estado
      })
      list.forEach(a => { mapC[a.id] = estadoCuota(mejor[a.id], diaDelMes) })
    }
    setCuotas(mapC)
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

  const claseSel = clases.find(c => c.id === claseId)
  const diaSel = new Date(fecha + 'T00:00:00').getDay()
  const noEsDiaDeClase = claseSel?.dias?.length && !claseSel.dias.includes(diaSel)
  const conDeuda = Object.values(cuotas).filter(c => c.key === 'deuda').length

  return (
    <section className="card">
      <h2>Tomar asistencia</h2>
      <div className="grid-2">
        <label>Clase
          <select value={claseId} onChange={e => seleccionarClase(e.target.value)}>
            <option value="">Elegí una clase…</option>
            {clases.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.horario ? ` · ${c.horario}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>Fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </label>
      </div>

      {claseSel?.horario && <p className="muted">Horario: {claseSel.horario}</p>}
      {noEsDiaDeClase && (
        <div className="alert alert-warn">Ojo: la fecha elegida no es un día de clase de este grupo.</div>
      )}

      {claseId && alumnos.length === 0 && <p className="muted">No hay alumnos inscriptos en esta clase.</p>}

      {alumnos.length > 0 && (
        <>
          {conDeuda > 0 && (
            <p className="muted">
              <span className="pill pill-off">Con deuda</span>{' '}
              {conDeuda} alumno(s) sin pagar la cuota de este mes.
            </p>
          )}
          <ul className="roster">
            {alumnos.map(a => {
              const c = cuotas[a.id]
              return (
                <li key={a.id} className="roster-row" style={c ? estiloFila(c.key) : undefined}>
                  <span className="roster-name">
                    {a.full_name}
                    {c && c.key !== 'pago' && <span className={'pill pill-' + c.pill}>{c.label}</span>}
                  </span>
                  <label className={'switch' + (estado[a.id] ? ' on' : '')}>
                    <input type="checkbox" checked={!!estado[a.id]}
                      onChange={e => setEstado({ ...estado, [a.id]: e.target.checked })} />
                    <span>{estado[a.id] ? 'Presente' : 'Ausente'}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
          <button className="btn btn-primary" onClick={save} disabled={busy}>Guardar asistencia</button>
        </>
      )}
    </section>
  )
}
