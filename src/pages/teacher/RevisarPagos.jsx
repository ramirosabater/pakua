import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const ESTADO_PILL = { pendiente: 'warn', aprobado: 'ok', rechazado: 'off' }

export default function RevisarPagos() {
  const { session } = useAuth()
  const [pagos, setPagos] = useState([])

  async function load() {
    const { data } = await supabase.from('pagos')
      .select('*, alumno:profiles(full_name)')
      .order('created_at', { ascending: false })
    setPagos(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function setEstado(id, estado) {
    await supabase.from('pagos').update({ estado, revisado_por: session.user.id }).eq('id', id)
    load()
  }

  async function verComprobante(path) {
    const { data, error } = await supabase.storage.from('comprobantes').createSignedUrl(path, 60)
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <section className="card">
      <h2>Pagos</h2>
      {pagos.length === 0 && <p className="muted">No hay pagos registrados.</p>}
      {pagos.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Alumno</th><th>Período</th><th>Monto</th><th>Medio</th><th>Comprob.</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id}>
                  <td>{p.alumno?.full_name}</td>
                  <td className="mono">{p.periodo}</td>
                  <td className="mono">${Number(p.monto).toLocaleString()}</td>
                  <td>{p.metodo}</td>
                  <td>{p.comprobante_url
                    ? <button className="link-btn" onClick={() => verComprobante(p.comprobante_url)}>Ver</button>
                    : <span className="muted">—</span>}</td>
                  <td><span className={'pill pill-' + ESTADO_PILL[p.estado]}>{p.estado}</span></td>
                  <td className="row-actions">
                    <button className="btn btn-sm btn-ok" onClick={() => setEstado(p.id, 'aprobado')}>Aprobar</button>
                    <button className="btn btn-sm btn-off" onClick={() => setEstado(p.id, 'rechazado')}>Rechazar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
