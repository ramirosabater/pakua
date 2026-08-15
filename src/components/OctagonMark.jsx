export default function OctagonMark({ size = 32 }) {
  // Octágono con ocho radios: guiño al bagua que da nombre al Pakua.
  const cx = 50, cy = 50, r = 42
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i - Math.PI / 8
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
  const poly = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={poly} fill="none" stroke="var(--brass)" strokeWidth="3" />
      {pts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--jade)" strokeWidth="1.4" opacity="0.55" />
      ))}
      <circle cx={cx} cy={cy} r="5.5" fill="var(--brass)" />
    </svg>
  )
}
