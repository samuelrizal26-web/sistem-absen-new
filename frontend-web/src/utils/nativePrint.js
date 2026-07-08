import logoPrint from '../assets/NEW LOGO.png'
import BluetoothPrinter from '../plugins/bluetoothPrinter'
import { getPrinterMAC } from '../config/printer'
import { CMD, cmd, concatBytes, textLine, imageToRaster, loadImage } from './escpos'

const STORE_NAME = 'LABALABA ADVERTISING'
const STORE_TAGLINE = 'One Stop Cutting Sticker'
const CONTACT_INSTAGRAM = '@labalabaadv'
const CONTACT_WHATSAPP = '085740280800'
const CONTACT_WEB = 'www.labalabaa.com'
const CONTACT_EMAIL = 'labalabasticker@gmail.com'
const PAPER_WIDTH = 32

let cachedLogoImg = null
async function getLogoImage() {
  if (cachedLogoImg) return cachedLogoImg
  cachedLogoImg = await loadImage(logoPrint)
  return cachedLogoImg
}

function pad(str, len, right = false) {
  const s = String(str ?? '')
  if (right) return s.padEnd(len, ' ').slice(0, len)
  return s.padStart(len, ' ').slice(0, len)
}

function row(label, value, width = PAPER_WIDTH) {
  const maxVal = width - label.length - 1
  return `${label} ${pad(value, maxVal, false)}`
}

function divider(char = '-', width = PAPER_WIDTH) {
  return char.repeat(width)
}

function formatRp(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function buildEscPosReceipt({ job, cashier, change = 0, openDrawer = false }) {
  const hargaNormal = job.harga_normal || job.price_per_unit || 0
  const dapat_diskon = job.dapat_diskon && job.diskon_nominal > 0
  const subtotal = hargaNormal * job.quantity
  const diskon = job.diskon_nominal || 0

  const parts = []
  parts.push(cmd(CMD.INIT))
  parts.push(cmd(CMD.ALIGN_CENTER))

  try {
    const img = await getLogoImage()
    parts.push(imageToRaster(img, 160))
    parts.push(cmd(CMD.LINE_FEED))
  } catch (e) {
    parts.push(cmd(CMD.BOLD_ON))
    parts.push(textLine(STORE_NAME))
    parts.push(cmd(CMD.BOLD_OFF))
    parts.push(textLine(STORE_TAGLINE))
  }

  parts.push(cmd(CMD.ALIGN_LEFT))
  parts.push(textLine(divider('=')))
  parts.push(textLine(row('Tgl  :', formatDate(job.date))))
  parts.push(textLine(row('Kasir:', cashier)))
  if (job.customer_name) parts.push(textLine(row('Cust :', job.customer_name)))
  parts.push(textLine(divider('-')))
  parts.push(textLine(row('Bahan:', job.material)))
  parts.push(textLine(row('Qty  :', `${job.quantity} pcs`)))
  parts.push(textLine(divider('-')))
  parts.push(textLine(row('Subtot:', formatRp(subtotal))))
  if (dapat_diskon) parts.push(textLine(row('Diskon:', '-' + formatRp(diskon))))
  if (dapat_diskon) {
    parts.push(cmd(CMD.ALIGN_CENTER))
    parts.push(textLine('* Hemat cetak minimal 10 pcs *'))
    parts.push(cmd(CMD.ALIGN_LEFT))
  }
  parts.push(textLine(divider('-')))
  parts.push(cmd(CMD.BOLD_ON))
  parts.push(textLine(row('TOTAL:', formatRp(job.total_price))))
  parts.push(cmd(CMD.BOLD_OFF))
  parts.push(textLine(row('Bayar:', job.payment_method === 'cash' ? 'Cash' : 'Transfer')))
  if (job.payment_method === 'cash') parts.push(textLine(row('Kemb :', formatRp(change))))
  if (job.notes) parts.push(textLine(row('Cat  :', job.notes)))
  parts.push(textLine(divider('=')))

  parts.push(cmd(CMD.ALIGN_CENTER))
  parts.push(textLine('Terima kasih!'))
  parts.push(textLine('- LB.ADV -'))
  parts.push(cmd(CMD.LINE_FEED))
  parts.push(textLine('Follow Us:'))
  parts.push(textLine(`📸 ${CONTACT_INSTAGRAM}`))
  parts.push(textLine(`📱 ${CONTACT_WHATSAPP}`))
  parts.push(textLine(`🌐 ${CONTACT_WEB}`))
  parts.push(textLine(`📧 ${CONTACT_EMAIL}`))
  parts.push(cmd(CMD.FEED_LINES(4)))

  if (openDrawer) {
    parts.push(cmd(CMD.DRAWER_KICK))
  }

  return concatBytes(parts)
}

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

export async function printReceiptNative({ job, cashier, change = 0, openDrawer = false, address }) {
  const printerAddress = address || getPrinterMAC()
  const bytes = await buildEscPosReceipt({ job, cashier, change, openDrawer })
  const base64 = bytesToBase64(bytes)
  return BluetoothPrinter.printRaw({ address: printerAddress, data: base64 })
}

export async function openCashDrawerNative(address) {
  const printerAddress = address || getPrinterMAC()
  const bytes = cmd(CMD.DRAWER_KICK)
  const base64 = bytesToBase64(bytes)
  return BluetoothPrinter.printRaw({ address: printerAddress, data: base64 })
}
