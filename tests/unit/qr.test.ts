import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'

/**
 * The card embeds QRCode.toString(url, { errorCorrectionLevel: 'M' }) as SVG.
 * Here we render the same payload to PNG and decode it, proving the QR content
 * is exactly the member's verification URL.
 */
describe('verification QR code', () => {
  it('decodes to the exact verification URL', async () => {
    const token = 'a3f1'.repeat(16)
    const url = `https://kafmaf-example.vercel.app/verify/${token}`
    const buf = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', margin: 4, scale: 6 })
    const png = PNG.sync.read(buf)
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
    expect(decoded?.data).toBe(url)
  })

  it('stays within a small QR version so modules print large on the card', () => {
    const url = `https://kafmaf-example.vercel.app/verify/${'f'.repeat(64)}`
    const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
    // 21.2 mm printable QR width / modules => module size in mm
    const moduleMm = 21.2 / qr.modules.size
    expect(qr.version).toBeLessThanOrEqual(7)
    expect(moduleMm).toBeGreaterThan(0.4)
  })
})
