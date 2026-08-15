import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function VerInformes() {
  const [informes, setInformes] = useState([])
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    supabase.from('informes')
      .select('id, titulo, contenido, created_at, alumno:profiles(full_name), clase:clases(nombre)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setInformes(data ?? []))
  }, [])

  const visibles = informes.filter(i =>
    !filtro || (i.alumno?.full_name ?? '').toLowerCase().includes(filtro.toLowerCase()))

  return (
    <section className="card">
      <h2>Informes de alumnos</h2>
      <label className="search">Buscar por alumno
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Nombre…" />
      </label>
      {visibles.length === 0 && <p className="muted">No hay informes para mostrar.</p>}
      <ul className="list">
        {visibles.map(i => (
          <li key={i.id} className="list-item">
            <div className="li-head">
              <strong>{i.alumno?.full_name}</strong>
              <span className="mono muted">{new Date(i.created_at).toLocaleDateString()}</span>
            </div>
            <div className="li-sub">{i.titulo || 'Sin título'}{i.clase?.nombre ? ' · ' + i.clase.nombre : ''}</div>
            <p className="pre">{i.contenido}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
