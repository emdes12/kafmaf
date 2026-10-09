/**
 * Passport photograph processing in the browser.
 *
 * Re-encoding through a canvas strips all metadata (EXIF GPS, camera details)
 * and normalises the image to a 4:5 JPEG at 600×750. The storage bucket also
 * enforces type (jpeg/png/webp) and size (2 MB) limits on the server.
 */
export const PHOTO_MAX_INPUT_BYTES = 8 * 1024 * 1024
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'
const OUTPUT_W = 600
const OUTPUT_H = 750

export class PhotoError extends Error {}

export async function processPassportPhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new PhotoError('Please choose a JPG, PNG or WebP image.')
  }
  if (file.size > PHOTO_MAX_INPUT_BYTES) {
    throw new PhotoError('That image is larger than 8 MB. Please choose a smaller photo.')
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new PhotoError('That file could not be read as an image.')
  }
  if (bitmap.width < 240 || bitmap.height < 300) {
    bitmap.close()
    throw new PhotoError('The photo is too small. Please use an image at least 240 × 300 pixels.')
  }

  // Centre-crop to 4:5, biased slightly upwards (faces sit in the upper half of portraits).
  const targetRatio = OUTPUT_W / OUTPUT_H
  let sw = bitmap.width
  let sh = bitmap.height
  let sx = 0
  let sy = 0
  if (sw / sh > targetRatio) {
    sw = Math.round(sh * targetRatio)
    sx = Math.round((bitmap.width - sw) / 2)
  } else {
    sh = Math.round(sw / targetRatio)
    sy = Math.round((bitmap.height - sh) * 0.35)
  }

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_W
  canvas.height = OUTPUT_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('Your browser could not process the image.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, OUTPUT_W, OUTPUT_H)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
  if (!blob) throw new PhotoError('Your browser could not process the image.')
  return blob
}

/** Random, unguessable file name (no personal data in storage paths). */
export function randomFileName(ext = 'jpg'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `photo_${id}.${ext}`
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
