import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const DIA_GRACIA = 10

export default function AvisoCuota() {
  const { session } = useAuth()
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    const periodo = new Date().toISOString().slice(0, 7)
    supabase.from('pagos').select('estado')
      .eq('alumno_id', session.user.id).eq('periodo', periodo)
      .then(({ data }) => {
        const estados = (data ?? []).map(p => p.estado)
        const dia = new Date().getDate()
        if (estados.includes('aprobado')) return setAviso(null)
        if (estados.includes('pendiente'))
          return setAviso({ type: 'warn', text: 'Tu pago de este mes está en revisión.' })
        if (dia > DIA_GRACIA)
          setAviso({ type: 'error', text: 'Tenés la cuota de este mes pendiente. Regularizala cuando puedas.' })
        else
          setAviso({ type: 'warn', text: 'Todavía no registraste el pago de este mes.' })
      })
  }, [])

  if (!aviso) return null
  return <div className={'alert alert-' + aviso.type} style={{ marginBottom: '1rem' }}>{aviso.text}</div>
}
