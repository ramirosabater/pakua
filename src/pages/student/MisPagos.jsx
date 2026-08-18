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
  const [clases, setClases] = useState([])
  const [claseId, setClaseId] = useState('')
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('transferencia')
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [abierto, setAbierto] = useState(false)

  async function load() {
    const { data } = await supabase.from('pagos')
      .select('*, clase:clases(nombre)').eq('alumno_id', uid).order('created_at', { ascending: false })
    setPagos(data ?? [])
    const { data: insc } = await supabase.from('inscripciones')
      .select('clase:clases(id, nombre, cuota, requiere_informe)').eq('alumno_id', uid)
    setClases((insc ?? []).map(i => i.clase).filter(Boolean))
  }
  useEffect(() => { load() }, [])

  function elegirClase(id) {
    setClaseId(id)
    const c = clases.find(x => x.id === id)
    if (c && Number(c.cuota) > 0) setMonto(String(c.cuota))
  }

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      const clase = clases.find(c => c.id === claseId)
      if (!clase) throw new Error('Elegí la clase que estás pagando.')
      const caja = clase.requiere_informe ? 'escuela' : 'recinto'
      let comprobante_url = null
      if (file) {
        const path = `${uid}/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file)
        if (upErr) throw upErr
        comprobante_url = path
      }
      const { error } = await supabase.from('pagos').insert({
        alumno_id: uid, clase_id: claseId, caja, monto: Number(monto), metodo, periodo, comprobante_url,
      })
      if (error) throw error
      setMonto(''); setFile(null); setClaseId('')
      setMsg({ type: 'ok', text: 'Pago registrado. Queda pendiente de revisión.' }); setAbierto(false)
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
      {!abierto && msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
      {!abierto ? (
        <div><button className="btn btn-primary" onClick={() => { setAbierto(true); setMsg(null) }}>+ Nuevo pago</button></div>
      ) : (
        <section className="card">
          <div className="row-between">
            <h2>Registrar un pago</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
          <form onSubmit={submit} className="form">
            <label>Clase que pagás
              <select value={claseId} onChange={e => elegirClase(e.target.value)} required>
                <option value="">Elegí una clase…</option>
                {clases.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
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
          {clases.length === 0 && <p className="hint">Cuando estés inscripto en una clase, vas a poder registrar su pago acá.</p>}
        </section>
      )}

      <section className="card">
        <h2>Mis pagos</h2>
        {pagos.length === 0 && <p className="muted">Todavía no registraste pagos.</p>}
        {pagos.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Período</th><th>Clase</th><th>Monto</th><th>Medio</th><th>Estado</th></tr></thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id}>
                    <td className="mono">{p.periodo}</td>
                    <td>{p.clase?.nombre ?? '—'}</td>
                    <td className="mono">${Number(p.monto).toLocaleString('es-AR')}</td>
                    <td>{p.metodo}</td>
                    <td><span className={'pill pill-' + ESTADO_PILL[p.estado]}>{p.estado}</span></td>
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
