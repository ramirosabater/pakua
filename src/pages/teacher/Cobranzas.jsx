import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const money = n => '$' + Number(n || 0).toLocaleString('es-AR')

export default function Cobranzas() {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [pagos, setPagos] = useState([])
  const [alumnos, setAlumnos] = useState([])

  useEffect(() => {
    supabase.from('pagos')
      .select('alumno_id, monto, estado, metodo, alumno:profiles(full_name)')
      .eq('periodo', periodo)
      .then(({ data }) => setPagos(data ?? []))
    supabase.from('profiles')
      .select('id, full_name, telefono').eq('role', 'alumno').eq('activo', true).order('full_name')
      .then(({ data }) => setAlumnos(data ?? []))
  }, [periodo])

  const aprobados = pagos.filter(p => p.estado === 'aprobado')
  const pendientes = pagos.filter(p => p.estado === 'pendiente')
  const totalRecaudado = aprobados.reduce((s, p) => s + Number(p.monto), 0)
  const montoPendiente = pendientes.reduce((s, p) => s + Number(p.monto), 0)

  const pagaronIds = new Set(aprobados.map(p => p.alumno_id))
  const pendientesIds = new Set(pendientes.map(p => p.alumno_id))
  const deudores = alumnos.filter(a => !pagaronIds.has(a.id))

  // Recaudación por medio de pago (solo aprobados)
  const porMetodo = {}
  aprobados.forEach(p => { porMetodo[p.metodo] = (porMetodo[p.metodo] || 0) + Number(p.monto) })

  return (
    <div className="stack">
      <section className="card">
        <h2>Cobranzas</h2>
        <label className="search">Período
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
        </label>

        <div className="stats">
          <div className="stat">
            <div className="stat-num">{money(totalRecaudado)}</div>
            <div className="stat-lbl">Recaudado</div>
          </div>
          <div className="stat">
            <div className="stat-num">{aprobados.length}</div>
            <div className="stat-lbl">Pagos aprobados</div>
          </div>
          <div className="stat">
            <div className="stat-num">{pendientes.length}</div>
            <div className="stat-lbl">En revisión</div>
          </div>
          <div className="stat">
            <div className="stat-num">{deudores.length}</div>
            <div className="stat-lbl">Deudores</div>
          </div>
        </div>

        {Object.keys(porMetodo).length > 0 && (
          <>
            <h3 style={{ fontSize: '0.95rem', marginTop: '0.5rem' }}>Recaudación por medio</h3>
            <table className="table">
              <thead><tr><th>Medio</th><th>Monto</th></tr></thead>
              <tbody>
                {Object.entries(porMetodo).map(([m, monto]) => (
                  <tr key={m}><td>{m}</td><td className="mono">{money(monto)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

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
