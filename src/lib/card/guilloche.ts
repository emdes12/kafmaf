/**
 * Guilloche-style line pattern (fine interlaced waves, as used in security printing).
 * Purely decorative background for the card; generated once as SVG path data.
 */
export function guillochePaths(width = 856, height = 540, lines = 18): string[] {
  const paths: string[] = []
  for (let k = 0; k < lines; k++) {
    const phase = (k / lines) * Math.PI * 2
    const amp = 26 + 10 * Math.sin(phase * 2)
    const baseY = height * 0.5
    let d = ''
    for (let x = -10; x <= width + 10; x += 8) {
      const t = x / width
      const y =
        baseY +
        amp * Math.sin(t * Math.PI * 6 + phase) +
        (height * 0.32) * Math.sin(t * Math.PI * 1.2 + phase / 3) * Math.cos(phase)
      d += `${x === -10 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `
    }
    paths.push(d.trim())
  }
  return paths
}
