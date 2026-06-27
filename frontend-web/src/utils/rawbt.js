const STORE_NAME = 'LABALABA ADVERTISING'
const STORE_TAGLINE = 'One Stop Cutting Sticker'
const PAPER_WIDTH = 32

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

function center(str, width = PAPER_WIDTH) {
  const spaces = Math.max(0, Math.floor((width - str.length) / 2))
  return ' '.repeat(spaces) + str
}

function formatRp(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function buildPrintJobReceipt({ job, cashier, change = 0 }) {
  const hargaNormal = job.harga_normal || job.price_per_unit || 0
  const dapat_diskon = job.dapat_diskon && job.diskon_nominal > 0
  const subtotal = hargaNormal * job.quantity
  const diskon = job.diskon_nominal || 0

  const lines = [
    center(STORE_NAME),
    center(STORE_TAGLINE),
    divider('='),
    row('Tgl  :', formatDate(job.date)),
    row('Kasir:', cashier),
    job.customer_name ? row('Cust :', job.customer_name) : null,
    divider('-'),
    row('Bahan:', job.material),
    row('Qty  :', `${job.quantity} pcs`),
    row('Harga:', formatRp(hargaNormal) + '/pcs'),
    divider('-'),
    row('Subtot:', formatRp(subtotal)),
    dapat_diskon ? row('Diskon:', '-' + formatRp(diskon)) : null,
    dapat_diskon ? center('* Hemat cetak minimal 10 pcs *') : null,
    divider('-'),
    row('TOTAL:', formatRp(job.total_price)),
    row('Bayar:', job.payment_method === 'cash' ? 'Cash' : 'Transfer'),
    job.payment_method === 'cash' ? row('Kemb :', formatRp(change)) : null,
    job.notes ? row('Cat  :', job.notes) : null,
    divider('='),
    center('Terima kasih!'),
    center('- LB.ADV -'),
    '',
    '',
  ].filter(l => l !== null)
  return lines.join('\n')
}

export function triggerRawBTPrint(text, openDrawer = false) {
  const encoded = encodeURIComponent(text)
  const drawerCmd = openDrawer ? encodeURIComponent('\x1B\x70\x00\x19\xFA') : ''

  const fullText = openDrawer ? text + '\x1B\x70\x00\x19\xFA' : text
  const uri = `rawbt://print?text=${encodeURIComponent(fullText)}`

  const a = document.createElement('a')
  a.href = uri
  a.click()
}

export function openCashDrawerOnly() {
  const drawerCmd = '\x1B\x70\x00\x19\xFA'
  const uri = `rawbt://print?text=${encodeURIComponent(drawerCmd)}`
  const a = document.createElement('a')
  a.href = uri
  a.click()
}
