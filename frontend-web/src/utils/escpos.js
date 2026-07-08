// ESC/POS command builder for thermal printer (Bluetooth Classic SPP)
// Compatible with KASSEN BTP-299 and most ESC/POS thermal printers

export const ESC = 0x1b
export const GS = 0x1d

export const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_ON: [GS, 0x21, 0x11],
  DOUBLE_OFF: [GS, 0x21, 0x00],
  LINE_FEED: [0x0a],
  FEED_LINES: (n) => [ESC, 0x64, n],
  DRAWER_KICK: [ESC, 0x70, 0x00, 0x19, 0xfa],
}

export function concatBytes(arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

// Convert a string to bytes, replacing non-ASCII with closest equivalent
export function textToBytes(str) {
  const normalized = String(str ?? '')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
  const bytes = []
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i)
    bytes.push(code > 255 ? 0x3f : code) // '?' fallback for unsupported chars
  }
  return new Uint8Array(bytes)
}

export function textLine(str) {
  return concatBytes([textToBytes(str), new Uint8Array(CMD.LINE_FEED)])
}

export function cmd(bytes) {
  return new Uint8Array(bytes)
}

// Rasterize an HTMLImageElement into ESC/POS GS v 0 raster bit image command
// targetWidth should be a multiple of 8 for clean byte packing (max 384 for 58mm printers)
export function imageToRaster(img, targetWidth = 160) {
  const scale = targetWidth / img.naturalWidth
  const targetHeight = Math.round(img.naturalHeight * scale)
  const widthBytes = Math.ceil(targetWidth / 8)
  const alignedWidth = widthBytes * 8

  const canvas = document.createElement('canvas')
  canvas.width = alignedWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, alignedWidth, targetHeight)
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  const imageData = ctx.getImageData(0, 0, alignedWidth, targetHeight)
  const pixels = imageData.data

  const rasterData = new Uint8Array(widthBytes * targetHeight)

  for (let y = 0; y < targetHeight; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byte = 0
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit
        if (x >= alignedWidth) continue
        const idx = (y * alignedWidth + x) * 4
        const r = pixels[idx]
        const g = pixels[idx + 1]
        const b = pixels[idx + 2]
        const a = pixels[idx + 3]
        const gray = (r + g + b) / 3
        const isBlack = a > 128 && gray < 180
        if (isBlack) {
          byte |= (0x80 >> bit)
        }
      }
      rasterData[y * widthBytes + xByte] = byte
    }
  }

  const xL = widthBytes & 0xff
  const xH = (widthBytes >> 8) & 0xff
  const yL = targetHeight & 0xff
  const yH = (targetHeight >> 8) & 0xff

  const header = new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH])
  return concatBytes([header, rasterData])
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
