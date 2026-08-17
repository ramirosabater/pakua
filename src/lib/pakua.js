// Rangos (cintas) de Pakua.
// OJO: no pude confirmar el orden OFICIAL de World Pa Kua en una fuente pública.
// Esta es una progresión de cintas como punto de partida: AJUSTALA al sistema
// real de tu escuela editando esta lista (el orden y los nombres que quieras).
export const RANGOS = [
  'Cinta blanca',
  'Cinta amarilla',
  'Cinta naranja',
  'Cinta verde',
  'Cinta azul',
  'Cinta roja',
  'Cinta marrón',
  'Cinta negra',
  'Instructor',
  'Maestro',
]

// Edad a partir de la fecha de nacimiento ('YYYY-MM-DD').
export function calcularEdad(fechaNac) {
  if (!fechaNac) return null
  const n = new Date(fechaNac + 'T00:00:00')
  const hoy = new Date()
  let e = hoy.getFullYear() - n.getFullYear()
  const m = hoy.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--
  return e
}

// ¿La fecha de nacimiento cae (mismo día y mes) en la fecha dada?
export function cumpleEnFecha(fechaNac, fecha) {
  if (!fechaNac || !fecha) return false
  const n = new Date(fechaNac + 'T00:00:00')
  const f = new Date(fecha + 'T00:00:00')
  return n.getMonth() === f.getMonth() && n.getDate() === f.getDate()
}
