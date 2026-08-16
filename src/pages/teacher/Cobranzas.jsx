import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const money = n => '$' + Number(n || 0).toLocaleString('es-AR')

export default function Cobranzas() {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [pagos, setPagos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [clases, setClases] = useState([])
  const [inscripciones, setInscripciones] = useState([])

  useEffect(() => {
    supabase.from('pagos')
      .select('alumno_id, monto, estado, metodo, alumno:profiles!alumno_id(full_name)')
      .eq('periodo', periodo)
      .then(({ data }) => setPagos(data ?? []))
  }, [periodo])

  useEffect(() => {
    supabase.from('profiles')
      .select('id, full_name, telefono').eq('role', 'alumno').eq('activo', true).order('full_name')
      .then(({ data }) => setAlumnos(data ?? []))
    supabase.from('clases')
      .select('id, nombre, cuota').order('nombre')
      .then(({ data }) => setClases(data ?? []))
    supabase.from('inscripciones')
      .select('clase_id, alumno:profiles(activo)')
      .then(({ data }) => setInscripciones(data ?? []))
  }, [])

  // ---- Recaudación real del período ----
  const aprobados = pagos.filter(p => p.estado === 'aprobado')
  const pendientes = pagos.filter(p => p.estado === 'pendiente')
  const totalRecaudado = aprobados.reduce((s, p) => s + Number(p.monto), 0)
  const montoPendiente = pendientes.reduce((s, p) => s + Number(p.monto), 0)
  const pagaronIds = new Set(aprobados.map(p => p.alumno_id))
  const pendientesIds = new Set(pendientes.map(p => p.alumno_id))
  const deudores = alumnos.filter(a => !pagaronIds.has(a.id))

  const porMetodo = {}
  aprobados.forEach(p => { porMetodo[p.metodo] = (porMetodo[p.metodo] || 0) + Number(p.monto) })

  // ---- Proyección esperada según cuotas e inscripciones ----
  const alumnosPorClase = {}
  inscripciones.forEach(i => {
    if (i.alumno?.activo !== false) alumnosPorClase[i.clase_id] = (alumnosPorClase[i.clase_id] || 0) + 1
  })
  const filasClase = clases.map(c => {
    const cant = alumnosPorClase[c.id] || 0
    return { ...c, alumnos: cant, esperado: Number(c.cuota || 0) * cant }
  })
  const totalEsperado = filasClase.reduce((s, f) => s + f.esperado, 0)
  const pctCobrado = totalEsperado ? Math.round((totalRecaudado / totalEsperado) * 100) : 0
  const faltaCobrar = Math.max(totalEsperado - totalRecaudado, 0)

  return (
    <div className="stack">
      <section className="card">
        <h2>Tablero de cobranzas</h2>
        <label className="search">Período
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
        </label>

        <div className="stats">
          <div className="stat">
            <div className="stat-num">{money(totalEsperado)}</div>
            <div className="stat-lbl">Esperado del mes</div>
          </div>
          <div className="stat">
            <div className="stat-num">{money(totalRecaudado)}</div>
            <div className="stat-lbl">Recaudado</div>
          </div>
          <div className="stat">
            <div className="stat-num">{money(faltaCobrar)}</div>
            <div className="stat-lbl">Falta cobrar</div>
          </div>
          <div className="stat">
            <div className="stat-num">{pctCobrado}%</div>
            <div className="stat-lbl">Cobrado del esperado</div>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-num">{aprobados.length}</div>
            <div className="stat-lbl">Pagos aprobados</div>
          </div>
          <div className="stat">
            <div className="stat-num">{pendientes.length}</div>
            <div className="stat-lbl">En revisión ({money(montoPendiente)})</div>
          </div>
          <div className="stat">
            <div className="stat-num">{deudores.length}</div>
            <div className="stat-lbl">Deudores</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Esperado por clase</h2>
        <p className="muted">Proyección según el valor de cuota de cada clase y sus alumnos activos inscriptos.</p>
        {filasClase.length === 0 && <p className="muted">No hay clases cargadas.</p>}
        {filasClase.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Clase</th><th>Alumnos</th><th>Cuota</th><th>Esperado</th></tr></thead>
              <tbody>
                {filasClase.map(f => (
                  <tr key={f.id}>
                    <td>{f.nombre}</td>
                    <td className="mono">{f.alumnos}</td>
                    <td className="mono">{money(f.cuota)}</td>
                    <td className="mono">{money(f.esperado)}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Total</strong></td>
                  <td></td><td></td>
                  <td className="mono"><strong>{money(totalEsperado)}</strong></td>
                </tr>
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
        {deudores.length === 0 && <p className="muted">Todos los alumnos activos pagaron este período. 🎉</p>}
        {deudores.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Alumno</th><th>Teléfono</th><th>Estado</th></tr></thead>
              <tbody>
                {deudores.map(a => (
                  <tr key={a.id}>
                    <td>{a.full_name}</td>
                    <td className="mono">{a.telefono || '—'}</td>
                    <td>
                      {pendientesIds.has(a.id)
                        ? <span className="pill pill-warn">Pago en revisión</span>
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
