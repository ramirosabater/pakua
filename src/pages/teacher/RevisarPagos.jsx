import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const METODOS = ['efectivo', 'transferencia', 'mercadopago', 'tarjeta', 'otro']
const ESTADOS = ['pendiente', 'aprobado', 'rechazado']
const ESTADO_PILL = { pendiente: 'warn', aprobado: 'ok', rechazado: 'off' }
const mesActual = () => new Date().toISOString().slice(0, 7)
const PAGO_VACIO = () => ({ alumno_id: '', monto: '', metodo: 'transferencia', periodo: mesActual(), estado: 'aprobado' })

export default function RevisarPagos() {
  const { session } = useAuth()
  const [pagos, setPagos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [msg, setMsg] = useState(null)
  const [filtro, setFiltro] = useState('')

  // Alta / edición
  const [form, setForm] = useState(PAGO_VACIO())
  const [editId, setEditId] = useState(null)
  const [editAlumnoNombre, setEditAlumnoNombre] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [abierto, setAbierto] = useState(false)

  async function load() {
    const { data } = await supabase.from('pagos')
      .select('*, alumno:profiles!alumno_id(full_name)')
      .order('created_at', { ascending: false })
    setPagos(data ?? [])
    const { data: al } = await supabase.from('profiles')
      .select('id, full_name').eq('role', 'alumno').eq('activo', true).order('full_name')
    setAlumnos(al ?? [])
  }
  useEffect(() => { load() }, [])

  const up = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  function editar(p) {
    setEditId(p.id)
    setEditAlumnoNombre(p.alumno?.full_name ?? '')
    setForm({
      alumno_id: p.alumno_id,
      monto: String(p.monto ?? ''),
      metodo: p.metodo,
      periodo: p.periodo ?? mesActual(),
      estado: p.estado,
    })
    setFile(null); setMsg(null)
    setAbierto(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditId(null); setEditAlumnoNombre('')
    setForm(PAGO_VACIO()); setFile(null); setMsg(null)
    setAbierto(false)
  }

  async function subirComprobante(alumnoId) {
    if (!file) return null
    const path = `${alumnoId}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('comprobantes').upload(path, file)
    if (error) throw error
    return path
  }

  async function guardar(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      if (editId) {
        const datos = {
          monto: Number(form.monto), metodo: form.metodo,
          periodo: form.periodo, estado: form.estado,
          revisado_por: session.user.id,
        }
        const nuevoComp = await subirComprobante(form.alumno_id)
        if (nuevoComp) datos.comprobante_url = nuevoComp
        const { error } = await supabase.from('pagos').update(datos).eq('id', editId)
        if (error) throw error
        setMsg({ type: 'ok', text: 'Pago actualizado.' })
      } else {
        if (!form.alumno_id) throw new Error('Elegí un alumno.')
        const comprobante_url = await subirComprobante(form.alumno_id)
        const { error } = await supabase.from('pagos').insert({
          alumno_id: form.alumno_id, monto: Number(form.monto), metodo: form.metodo,
          periodo: form.periodo, estado: form.estado, comprobante_url,
          revisado_por: form.estado === 'pendiente' ? null : session.user.id,
        })
        if (error) throw error
        setMsg({ type: 'ok', text: 'Pago registrado.' })
      }
      setEditId(null); setEditAlumnoNombre(''); setForm(PAGO_VACIO()); setFile(null); setAbierto(false)
      load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function setEstado(id, estado) {
    await supabase.from('pagos').update({ estado, revisado_por: session.user.id }).eq('id', id)
    load()
  }

  async function borrar(p) {
    const ok = window.confirm(`¿Eliminar el pago de ${p.alumno?.full_name} (${p.periodo})? No se puede deshacer.`)
    if (!ok) return
    const { error } = await supabase.from('pagos').delete().eq('id', p.id)
    if (error) setMsg({ type: 'error', text: error.message })
    else { if (editId === p.id) cancelar(); load() }
  }

  async function verComprobante(path) {
    const { data, error } = await supabase.storage.from('comprobantes').createSignedUrl(path, 60)
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const visibles = pagos.filter(p =>
    !filtro || (p.alumno?.full_name ?? '').toLowerCase().includes(filtro.toLowerCase()))

  return (
    <div className="stack">
      {!abierto && msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
      {!abierto ? (
        <div><button className="btn btn-primary" onClick={() => { cancelar(); setAbierto(true) }}>+ Registrar pago</button></div>
      ) : (
      <section className="card">
        <div className="row-between">
          <h2>{editId ? `Editar pago · ${editAlumnoNombre}` : 'Registrar pago'}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={cancelar}>Cerrar</button>
        </div>
        <form onSubmit={guardar} className="form">
          {!editId && (
            <label>Alumno
              <select value={form.alumno_id} onChange={e => up('alumno_id', e.target.value)} required>
                <option value="">Elegí un alumno…</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </label>
          )}
          <div className="grid-2">
            <label>Monto
              <input type="number" step="0.01" min="0" value={form.monto}
                onChange={e => up('monto', e.target.value)} required />
            </label>
            <label>Período
              <input type="month" value={form.periodo} onChange={e => up('periodo', e.target.value)} required />
            </label>
          </div>
          <div className="grid-2">
            <label>Medio de pago
              <select value={form.metodo} onChange={e => up('metodo', e.target.value)}>
                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label>Estado
              <select value={form.estado} onChange={e => up('estado', e.target.value)}>
                {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label>Comprobante {editId ? '(reemplazar, opcional)' : '(opcional)'}
            <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files[0] ?? null)} />
          </label>
          {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
          <div className="row-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? '…' : editId ? 'Guardar cambios' : 'Registrar pago'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>
          </div>
        </form>
      </section>
      )}

      <section className="card">
        <h2>Pagos</h2>
        <label className="search">Buscar por alumno
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Nombre…" />
        </label>
        {visibles.length === 0 && <p className="muted">No hay pagos para mostrar.</p>}
        {visibles.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Alumno</th><th>Período</th><th>Monto</th><th>Medio</th><th>Comprob.</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {visibles.map(p => (
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
                      {p.estado !== 'aprobado' && <button className="btn btn-sm btn-ok" onClick={() => setEstado(p.id, 'aprobado')}>Aprobar</button>}
                      {p.estado !== 'rechazado' && <button className="btn btn-sm btn-off" onClick={() => setEstado(p.id, 'rechazado')}>Rechazar</button>}
                      <button className="link-btn" onClick={() => editar(p)}>Editar</button>
                      <button className="link-btn danger" onClick={() => borrar(p)}>Eliminar</button>
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
