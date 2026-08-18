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
  const [abierto, setAbierto] = useState(false)

  // Edición (única) de un informe existente
  const [editId, setEditId] = useState(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editContenido, setEditContenido] = useState('')

  async function load() {
    const { data: insc } = await supabase
      .from('inscripciones')
      .select('clase:clases(id, nombre, requiere_informe)')
      .eq('alumno_id', uid)
    setClases((insc ?? []).map(i => i.clase).filter(c => c?.requiere_informe))

    const { data: inf } = await supabase
      .from('informes')
      .select('id, titulo, contenido, created_at, editado, clase:clases(nombre)')
      .order('created_at', { ascending: false })
    setInformes(inf ?? [])
  }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    const { error } = await supabase.from('informes').insert({
      alumno_id: uid, clase_id: claseId || null, titulo, contenido,
    })
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setTitulo(''); setContenido(''); setClaseId('')
      setMsg({ type: 'ok', text: 'Informe enviado.' }); setAbierto(false); load()
    }
    setBusy(false)
  }

  function editar(i) {
    setEditId(i.id); setEditTitulo(i.titulo ?? ''); setEditContenido(i.contenido ?? ''); setMsg(null)
  }
  function cancelarEdicion() { setEditId(null); setEditTitulo(''); setEditContenido('') }

  async function guardarEdicion(id) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('informes')
      .update({ titulo: editTitulo, contenido: editContenido }).eq('id', id)
    if (error) setMsg({ type: 'error', text: error.message })
    else { cancelarEdicion(); setMsg({ type: 'ok', text: 'Informe modificado. Ya no se puede editar de nuevo.' }); load() }
    setBusy(false)
  }

  return (
    <div className="stack">
      <AvisoCuota />
      {!abierto && msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
      {!abierto ? (
        <div><button className="btn btn-primary" onClick={() => { setAbierto(true); setMsg(null) }}>+ Nuevo informe</button></div>
      ) : (
        <section className="card">
          <div className="row-between">
            <h2>Nuevo informe</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
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
      )}

      <section className="card">
        <h2>Mis informes enviados</h2>
        {informes.length === 0 && <p className="muted">Todavía no escribiste ningún informe.</p>}
        <ul className="list">
          {informes.map(i => (
            <li key={i.id} className="list-item">
              {editId === i.id ? (
                <div className="form">
                  <div className="alert alert-warn">Podés editar este informe una sola vez. Después queda bloqueado.</div>
                  <label>Título<input value={editTitulo} onChange={e => setEditTitulo(e.target.value)} /></label>
                  <label>Informe<textarea rows={6} value={editContenido} onChange={e => setEditContenido(e.target.value)} /></label>
                  <div className="row-actions">
                    <button className="btn btn-sm btn-primary" onClick={() => guardarEdicion(i.id)} disabled={busy}>Guardar cambio</button>
                    <button className="btn btn-sm btn-ghost" onClick={cancelarEdicion}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="li-head">
                    <strong>{i.titulo || 'Sin título'}</strong>
                    <span className="mono muted">{new Date(i.created_at).toLocaleDateString()}</span>
                  </div>
                  {i.clase?.nombre && <span className="tag">{i.clase.nombre}</span>}
                  <p className="pre">{i.contenido}</p>
                  {i.editado
                    ? <span className="muted mono">Editado · no se puede modificar de nuevo</span>
                    : <button className="link-btn" onClick={() => editar(i)}>Editar (una sola vez)</button>}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
