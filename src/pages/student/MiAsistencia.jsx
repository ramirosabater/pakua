import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function MiAsistencia() {
  const { session } = useAuth()
  const [rows, setRows] = useState([])

  useEffect(() => {
    supabase.from('asistencia')
      .select('fecha, presente, clase:clases(nombre)')
      .eq('alumno_id', session.user.id)
      .order('fecha', { ascending: false })
      .then(({ data }) => setRows(data ?? []))
  }, [])

  const presentes = rows.filter(r => r.presente).length

  return (
    <section className="card">
      <h2>Mi asistencia</h2>
      {rows.length > 0 && <p className="muted mono">{presentes} presente(s) de {rows.length} registro(s)</p>}
      {rows.length === 0 && <p className="muted">Sin registros de asistencia todavía.</p>}
      {rows.length > 0 && (
        <table className="table">
          <thead><tr><th>Fecha</th><th>Clase</th><th>Estado</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="mono">{new Date(r.fecha).toLocaleDateString()}</td>
                <td>{r.clase?.nombre}</td>
                <td>{r.presente
                  ? <span className="pill pill-ok">Presente</span>
                  : <span className="pill pill-off">Ausente</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
