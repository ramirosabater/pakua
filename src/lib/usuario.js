// Login por "usuario" simple (sin email). Internamente se arma un email.
export const DOMINIO_INTERNO = 'pakualiga.com'

export function sanitizarUsuario(u) {
  return (u || '').trim().toLowerCase()
    .replace(/\s+/g, '.')          // espacios -> punto
    .replace(/[^a-z0-9._-]/g, '')  // solo letras, números, . _ -
}

// Si el texto ya es un email (tiene @), se usa tal cual; si no, se arma uno interno.
export function aEmail(input) {
  const v = (input || '').trim()
  if (v.includes('@')) return v.toLowerCase()
  return `${sanitizarUsuario(v)}@${DOMINIO_INTERNO}`
}
