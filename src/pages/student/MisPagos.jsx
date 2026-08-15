import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import AvisoCuota from '../../components/AvisoCuota'

const METODOS = ['efectivo', 'transferencia', 'mercadopago', 'tarjeta', 'otro']
const ESTADO_PILL = { pendiente: 'warn', aprobado: 'ok', rechazado: 'off' }

export default function MisPagos() {
  const { session } = useAuth()
  const uid = session.user.id
  const [pagos, setPagos] = useState([])
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('transferencia')
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('pagos')
      .select('*').eq('alumno_id', uid).order('created_at', { ascending: false })
    setPagos(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      let comprobante_url = null
      if (file) {
        const path = `${uid}/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file)
        if (upErr) throw upErr
        comprobante_url = path
      }
      const { error } = await supabase.from('pagos').insert({
        alumno_id: uid, monto: Number(monto), metodo, periodo, comprobante_url,
      })
      if (error) throw error
      setMonto(''); setFile(null)
      setMsg({ type: 'ok', text: 'Pago registrado. Queda pendiente de revisión.' })
      load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <AvisoCuota />
      <section className="card">
        <h2>Registrar un pago</h2>
        <form onSubmit={submit} className="form">
          <div className="grid-2">
            <label>Monto
              <input type="number" step="0.01" min="0" value={monto} onChange={e => setMonto(e.target.value)} required />
            </label>
            <label>Período
              <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} required />
            </label>
          </div>
          <label>Medio de pago
            <select value={metodo} onChange={e => setMetodo(e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>Comprobante (opcional)
            <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files[0] ?? null)} />
          </label>
          {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
          <button className="btn btn-primary" disabled={busy}>Registrar pago</button>
        </form>
      </section>

      <section className="card">
        <h2>Mis pagos</h2>
        {pagos.length === 0 && <p className="muted">Todavía no registraste pagos.</p>}
        {pagos.length > 0 && (
          <table className="table">
            <thead><tr><th>Período</th><th>Monto</th><th>Medio</th><th>Estado</th></tr></thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id}>
                  <td className="mono">{p.periodo}</td>
                  <td className="mono">${Number(p.monto).toLocaleString()}</td>
                  <td>{p.metodo}</td>
                  <td><span className={'pill pill-' + ESTADO_PILL[p.estado]}>{p.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
