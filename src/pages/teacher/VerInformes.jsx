import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function VerInformes() {
  const [informes, setInformes] = useState([])
  const [filtro, setFiltro] = useState('')
  const [editId, setEditId] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('informes')
      .select('id, titulo, contenido, created_at, alumno:profiles(full_name), clase:clases(nombre)')
      .order('created_at', { ascending: false })
    setInformes(data ?? [])
  }
  useEffect(() => { load() }, [])

  function editar(i) {
    setEditId(i.id)
    setTitulo(i.titulo ?? '')
    setContenido(i.contenido ?? '')
    setMsg(null)
  }
  function cancelar() { setEditId(null); setTitulo(''); setContenido(''); setMsg(null) }

  async function guardar(id) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('informes')
      .update({ titulo, contenido }).eq('id', id)
    if (error) setMsg({ type: 'error', text: error.message })
    else { cancelar(); load() }
    setBusy(false)
  }

  const visibles = informes.filter(i =>
    !filtro || (i.alumno?.full_name ?? '').toLowerCase().includes(filtro.toLowerCase()))

  return (
    <section className="card">
      <h2>Informes de alumnos</h2>
      <label className="search">Buscar por alumno
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Nombre…" />
      </label>
      {msg && <div className={'alert alert-' + msg.type}>{msg.text}</div>}
      {visibles.length === 0 && <p className="muted">No hay informes para mostrar.</p>}
      <ul className="list">
        {visibles.map(i => (
          <li key={i.id} className="list-item">
            <div className="li-head">
              <strong>{i.alumno?.full_name}</strong>
              <span className="mono muted">{new Date(i.created_at).toLocaleDateString()}</span>
            </div>
            <div className="li-sub">{i.clase?.nombre ? i.clase.nombre : ''}</div>

            {editId === i.id ? (
              <div className="form" style={{ marginTop: '0.6rem' }}>
                <label>Título
                  <input value={titulo} onChange={e => setTitulo(e.target.value)} />
                </label>
                <label>Informe
                  <textarea rows={6} value={contenido} onChange={e => setContenido(e.target.value)} />
                </label>
                <div className="row-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => guardar(i.id)} disabled={busy}>
                    {busy ? '…' : 'Guardar'}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={cancelar}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <strong style={{ display: 'block', marginTop: '0.3rem' }}>{i.titulo || 'Sin título'}</strong>
                <p className="pre">{i.contenido}</p>
                <button className="link-btn" onClick={() => editar(i)}>Editar</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
