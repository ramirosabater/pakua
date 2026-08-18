import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const money = n => '$' + Number(n || 0).toLocaleString('es-AR')

export default function Cobranzas() {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [filtroRecinto, setFiltroRecinto] = useState('')
  const [pagos, setPagos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [clases, setClases] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [recintosLista, setRecintosLista] = useState([])

  useEffect(() => {
    supabase.from('pagos')
      .select('alumno_id, monto, estado, metodo, caja, alumno:profiles!alumno_id(full_name, recinto)')
      .eq('periodo', periodo)
      .then(({ data }) => setPagos(data ?? []))
  }, [periodo])

  useEffect(() => {
    supabase.from('profiles')
      .select('id, full_name, telefono, recinto').eq('role', 'alumno').eq('activo', true).order('full_name')
      .then(({ data }) => setAlumnos(data ?? []))
    supabase.from('clases')
      .select('id, nombre, cuota, requiere_informe').order('nombre')
      .then(({ data }) => setClases(data ?? []))
    supabase.from('inscripciones')
      .select('clase_id, alumno_id, alumno:profiles(activo, recinto)')
      .then(({ data }) => setInscripciones(data ?? []))
    supabase.from('recintos').select('nombre').order('nombre')
      .then(({ data }) => setRecintosLista((data ?? []).map(r => r.nombre)))
  }, [])

  const recintos = recintosLista
  const enRecinto = r => !filtroRecinto || r === filtroRecinto

  // ---- Recaudación real del período (respeta filtro por recinto del alumno) ----
  const pagosF = pagos.filter(p => enRecinto(p.alumno?.recinto))
  const aprobados = pagosF.filter(p => p.estado === 'aprobado')
  const pendientes = pagosF.filter(p => p.estado === 'pendiente')
  const totalRecaudado = aprobados.reduce((s, p) => s + Number(p.monto), 0)
  const montoPendiente = pendientes.reduce((s, p) => s + Number(p.monto), 0)
  const cajaEscuela = aprobados.filter(p => p.caja === 'escuela').reduce((s, p) => s + Number(p.monto), 0)
  const cajaRecinto = aprobados.filter(p => p.caja === 'recinto').reduce((s, p) => s + Number(p.monto), 0)

  const porMetodo = {}
  aprobados.forEach(p => { porMetodo[p.metodo] = (porMetodo[p.metodo] || 0) + Number(p.monto) })

  // ---- Proyección esperada (cuenta alumnos del recinto filtrado) ----
  const alumnosPorClase = {}
  inscripciones.forEach(i => {
    if (i.alumno?.activo !== false && enRecinto(i.alumno?.recinto))
      alumnosPorClase[i.clase_id] = (alumnosPorClase[i.clase_id] || 0) + 1
  })
  const filasClase = clases.map(c => {
    const cant = alumnosPorClase[c.id] || 0
    return { ...c, alumnos: cant, esperado: Number(c.cuota || 0) * cant, caja: c.requiere_informe ? 'escuela' : 'recinto' }
  })
  const totalEsperado = filasClase.reduce((s, f) => s + f.esperado, 0)
  const espEscuela = filasClase.filter(f => f.caja === 'escuela').reduce((s, f) => s + f.esperado, 0)
  const espRecinto = filasClase.filter(f => f.caja === 'recinto').reduce((s, f) => s + f.esperado, 0)
  const pctCobrado = totalEsperado ? Math.round((totalRecaudado / totalEsperado) * 100) : 0
  const faltaCobrar = Math.max(totalEsperado - totalRecaudado, 0)

  // ---- Deudores (del recinto filtrado): pagado aprobado vs esperado ----
  const cuotaPorClase = Object.fromEntries(clases.map(c => [c.id, Number(c.cuota || 0)]))
  const alumnosF = alumnos.filter(a => enRecinto(a.recinto))
  const activosSet = new Set(alumnosF.map(a => a.id))
  const esperadoPorAlumno = {}
  inscripciones.forEach(i => {
    if (i.alumno?.activo !== false && activosSet.has(i.alumno_id))
      esperadoPorAlumno[i.alumno_id] = (esperadoPorAlumno[i.alumno_id] || 0) + (cuotaPorClase[i.clase_id] || 0)
  })
  const pagadoPorAlumno = {}
  aprobados.forEach(p => { pagadoPorAlumno[p.alumno_id] = (pagadoPorAlumno[p.alumno_id] || 0) + Number(p.monto) })
  const pendientesIds = new Set(pendientes.map(p => p.alumno_id))
  const deudores = alumnosF.map(a => {
    const esperado = esperadoPorAlumno[a.id] || 0
    const pagado = pagadoPorAlumno[a.id] || 0
    return { ...a, esperado, pagado, saldo: esperado - pagado }
  }).filter(a => a.saldo > 0)

  return (
    <div className="stack">
      <section className="card">
        <h2>Tablero de cobranzas</h2>
        <div className="grid-2">
          <label className="search">Período
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
          </label>
          <label>Recinto
            <select value={filtroRecinto} onChange={e => setFiltroRecinto(e.target.value)}>
              <option value="">Todos los recintos</option>
              {recintos.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-num">{money(totalEsperado)}</div><div className="stat-lbl">Esperado del mes</div></div>
          <div className="stat"><div className="stat-num">{money(totalRecaudado)}</div><div className="stat-lbl">Recaudado</div></div>
          <div className="stat"><div className="stat-num">{money(faltaCobrar)}</div><div className="stat-lbl">Falta cobrar</div></div>
          <div className="stat"><div className="stat-num">{pctCobrado}%</div><div className="stat-lbl">Cobrado del esperado</div></div>
        </div>
      </section>

      <section className="card">
        <h2>Cajas</h2>
        <p className="muted">Las clases especiales van a Caja Escuela; las no especiales, a Caja Recinto.</p>
        <div className="stats">
          <div className="stat">
            <div className="stat-num">{money(cajaEscuela)}</div>
            <div className="stat-lbl">Caja Escuela · esperado {money(espEscuela)}</div>
          </div>
          <div className="stat">
            <div className="stat-num">{money(cajaRecinto)}</div>
            <div className="stat-lbl">Caja Recinto · esperado {money(espRecinto)}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Esperado por clase</h2>
        <p className="muted">Proyección según la cuota de cada clase y sus alumnos activos inscriptos.</p>
        {filasClase.length === 0 && <p className="muted">No hay clases cargadas.</p>}
        {filasClase.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Clase</th><th>Caja</th><th>Alumnos</th><th>Cuota</th><th>Esperado</th></tr></thead>
              <tbody>
                {filasClase.map(f => (
                  <tr key={f.id}>
                    <td>{f.nombre}</td>
                    <td>{f.caja === 'escuela' ? 'Escuela' : 'Recinto'}</td>
                    <td className="mono">{f.alumnos}</td>
                    <td className="mono">{money(f.cuota)}</td>
                    <td className="mono">{money(f.esperado)}</td>
                  </tr>
                ))}
                <tr><td><strong>Total</strong></td><td></td><td></td><td></td><td className="mono"><strong>{money(totalEsperado)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {Object.keys(porMetodo).length > 0 && (
        <section className="card">
          <h2>Recaudación por medio</h2>
          <table className="table">
            <thead><tr><th>Medio</th><th>Monto</th></tr></thead>
            <tbody>
              {Object.entries(porMetodo).map(([m, monto]) => (
                <tr key={m}><td>{m}</td><td className="mono">{money(monto)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h2>Deudores del período</h2>
        {deudores.length === 0 && <p className="muted">Todos los alumnos activos están al día con su cuota. 🎉</p>}
        {deudores.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Alumno</th><th>Recinto</th><th>Teléfono</th><th>Esperado</th><th>Pagado</th><th>Debe</th><th>Estado</th></tr></thead>
              <tbody>
                {deudores.map(a => (
                  <tr key={a.id}>
                    <td>{a.full_name}</td>
                    <td>{a.recinto || '—'}</td>
                    <td className="mono">{a.telefono || '—'}</td>
                    <td className="mono">{money(a.esperado)}</td>
                    <td className="mono">{money(a.pagado)}</td>
                    <td className="mono">{money(a.saldo)}</td>
                    <td>
                      {pendientesIds.has(a.id)
                        ? <span className="pill pill-warn">En revisión</span>
                        : a.pagado > 0
                          ? <span className="pill pill-off">Pagó de menos</span>
                          : <span className="pill pill-off">Sin pagar</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
