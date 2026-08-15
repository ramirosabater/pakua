import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import AvisoCuota from '../../components/AvisoCuota'

export default function MisInformes() {
  const { session } = useAuth()
  const uid = session.user.id
  const [clases, setClases] = useState([])
  const [informes, setInformes] = useState([])
  const [claseId, setClaseId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data: insc } = await supabase
      .from('inscripciones')
      .select('clase:clases(id, nombre, requiere_informe)')
      .eq('alumno_id', uid)
    setClases((insc ?? []).map(i => i.clase).filter(c => c?.requiere_informe))

    const { data: inf } = await supabase
      .from('informes')
      .select('id, titulo, contenido, created_at, clase:clases(nombre)')
      .order('created_at', { ascending: false })
    setInformes(inf ?? [])
  }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    const { error } = await supabase.from('informes').insert({
      alumno_id: uid, clase_id: claseId || null, titulo, contenido,
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setTitulo(''); setContenido(''); setClaseId('')
      setMsg({ type: 'ok', text: 'Informe enviado.' })
      load()
    }
    setBusy(false)
  }

  return (
    <div className="stack">
      <AvisoCuota />
      <section className="card">
        <h2>Nuevo informe</h2>
        <p className="muted">Sólo vos y los profesores pueden leer lo que escribas.</p>
        <form onSubmit={submit} className="form">
          <label>Clase especial
            <select value={claseId} onChange={e => setClaseId(e.target.value)} required>
              <option value="">Elegí una clase…</option>
              {clases.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label>Título
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Seminario de formas" />
          </label>
          <label>Informe
            <textarea rows={6} value={contenido} onChange={e => setContenido(e.target.value)} required />
          </label>
          {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
          <button className="btn btn-primary" disabled={busy}>Enviar informe</button>
        </form>
        {clases.length === 0 && <p className="hint">Cuando la dirección te inscriba en una clase especial, vas a poder escribir su informe acá.</p>}
      </section>

      <section className="card">
        <h2>Mis informes enviados</h2>
        {informes.length === 0 && <p className="muted">Todavía no escribiste ningún informe.</p>}
        <ul className="list">
          {informes.map(i => (
            <li key={i.id} className="list-item">
              <div className="li-head">
                <strong>{i.titulo || 'Sin título'}</strong>
                <span className="mono muted">{new Date(i.created_at).toLocaleDateString()}</span>
              </div>
              {i.clase?.nombre && <span className="tag">{i.clase.nombre}</span>}
              <p className="pre">{i.contenido}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
