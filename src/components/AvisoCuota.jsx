import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const DIA_GRACIA = 10

export default function AvisoCuota() {
  const { session } = useAuth()
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    const uid = session.user.id
    const periodo = new Date().toISOString().slice(0, 7)
    const dia = new Date().getDate()

    async function calcular() {
      // Lo que pagó (aprobado) y si tiene algún pendiente
      const { data: pagos } = await supabase.from('pagos')
        .select('estado, monto').eq('alumno_id', uid).eq('periodo', periodo)
      const pagado = (pagos ?? []).filter(p => p.estado === 'aprobado')
        .reduce((s, p) => s + Number(p.monto), 0)
      const tienePendiente = (pagos ?? []).some(p => p.estado === 'pendiente')

      // Lo que le corresponde: suma de cuotas de sus clases
      const { data: insc } = await supabase.from('inscripciones')
        .select('clase:clases(cuota)').eq('alumno_id', uid)
      const esperado = (insc ?? []).reduce((s, i) => s + Number(i.clase?.cuota || 0), 0)

      if (esperado <= 0 || pagado >= esperado) return setAviso(null)
      if (tienePendiente)
        return setAviso({ type: 'warn', text: 'Tu pago de este mes está en revisión.' })
      if (pagado > 0)
        return setAviso({ type: 'error', text: `Pagaste parte de la cuota. Te falta abonar $${(esperado - pagado).toLocaleString('es-AR')}.` })
      if (dia > DIA_GRACIA)
        return setAviso({ type: 'error', text: 'Tenés la cuota de este mes pendiente. Regularizala cuando puedas.' })
      setAviso({ type: 'warn', text: 'Todavía no registraste el pago de este mes.' })
    }
    calcular()
  }, [])

  if (!aviso) return null
  return <div className={'alert alert-' + aviso.type} style={{ marginBottom: '1rem' }}>{aviso.text}</div>
}
