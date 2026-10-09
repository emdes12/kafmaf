/**
 * Card export: HTML/CSS template -> high-resolution PNG (html-to-image) -> PDF (jsPDF).
 *
 * The card template is laid out at 856 × 540 CSS px, i.e. exactly 0.1 mm per px
 * for an ID-1 card (85.60 × 53.98 mm). Rasterising at pixelRatio 3.5 gives
 * 2996 × 1890 px ≈ 889 dpi, comfortably above the 300 dpi print minimum, and
 * keeps the QR modules sharp. Everything runs in the browser; no paid service.
 */
import QRCode from 'qrcode'

export const CARD_W_MM = 85.6
export const CARD_H_MM = 53.98
export const CARD_W_PX = 856
export const CARD_H_PX = 540
const PIXEL_RATIO = 3.5

export async function qrSvgDataUrl(text: string): Promise<string> {
  const svg = await QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#000000', light: '#ffffff' } })
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function waitForImages(el: HTMLElement) {
  const imgs = Array.from(el.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((r) => ((img.onload = () => r()), (img.onerror = () => r()))),
    ),
  )
}

export async function renderCardPng(el: HTMLElement): Promise<string> {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await waitForImages(el)
  return toPng(el, {
    pixelRatio: PIXEL_RATIO,
    width: CARD_W_PX,
    height: CARD_H_PX,
    cacheBust: false,
    style: { transform: 'none', margin: '0' },
  })
}

export async function buildCardPdf(front: HTMLElement, back: HTMLElement, layout: 'card' | 'a4'): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const [frontPng, backPng] = [await renderCardPng(front), await renderCardPng(back)]

  if (layout === 'card') {
    // Two pages at exact card size: page 1 front, page 2 back (for card printers / print shops).
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_W_MM, CARD_H_MM], compress: true })
    doc.addImage(frontPng, 'PNG', 0, 0, CARD_W_MM, CARD_H_MM, undefined, 'FAST')
    doc.addPage([CARD_W_MM, CARD_H_MM], 'landscape')
    doc.addImage(backPng, 'PNG', 0, 0, CARD_W_MM, CARD_H_MM, undefined, 'FAST')
    doc.setProperties({ title: 'Membership card', creator: 'KAFMAF membership platform' })
    return doc.output('blob')
  }

  // A4 sheet: front and back at actual size with crop marks, for home printing.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const x = (210 - CARD_W_MM) / 2
  const positions = [40, 40 + CARD_H_MM + 24]
  ;[frontPng, backPng].forEach((png, i) => {
    const y = positions[i]
    doc.setFontSize(8)
    doc.setTextColor(110)
    doc.text(i === 0 ? 'FRONT' : 'BACK', x, y - 6)
    doc.addImage(png, 'PNG', x, y, CARD_W_MM, CARD_H_MM, undefined, 'FAST')
    drawCropMarks(doc, x, y, CARD_W_MM, CARD_H_MM)
  })
  doc.setFontSize(8)
  doc.text('Print at 100% scale (no "fit to page"). Cut along the crop marks. Card size 85.60 × 53.98 mm (ID-1).', x, 200)
  return doc.output('blob')
}

function drawCropMarks(doc: import('jspdf').jsPDF, x: number, y: number, w: number, h: number) {
  const len = 4
  const gap = 1.5
  doc.setDrawColor(120)
  doc.setLineWidth(0.15)
  for (const [cx, cy, dx, dy] of [
    [x, y, -1, -1],
    [x + w, y, 1, -1],
    [x, y + h, -1, 1],
    [x + w, y + h, 1, 1],
  ] as const) {
    doc.line(cx + dx * gap, cy, cx + dx * (gap + len), cy)
    doc.line(cx, cy + dy * gap, cx, cy + dy * (gap + len))
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
