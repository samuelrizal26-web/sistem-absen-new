import logoPrint from '../assets/NEW LOGO.png'

const STORE_NAME = 'LABALABA ADVERTISING'
const STORE_TAGLINE = 'One Stop Cutting Sticker'
const PAPER_WIDTH = 42
const CONTACT_INSTAGRAM = '@labalabaadv'
const CONTACT_WHATSAPP = '085740280800'
const CONTACT_WEB = 'www.labalabaa.com'
const CONTACT_EMAIL = 'labalabasticker@gmail.com'

// Convert image to base64 for RawBT
let logoBase64 = null
const img = new Image()
img.src = logoPrint
img.onload = () => {
  const canvas = document.createElement('canvas')
  // Resize logo to be smaller
  const targetWidth = 80
  const targetHeight = 80
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  logoBase64 = canvas.toDataURL('image/png')
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

  const lines = []
  
  // Add logo if available
  if (logoBase64) {
    lines.push('[IMAGE]' + logoBase64)
  } else {
    lines.push(center(STORE_NAME))
    lines.push(center(STORE_TAGLINE))
  }
  
  lines.push(divider('='))
  lines.push(row('Tgl  :', formatDate(job.date)))
  lines.push(row('Kasir:', cashier))
  if (job.customer_name) lines.push(row('Cust :', job.customer_name))
  lines.push(divider('-'))
  lines.push(row('Bahan:', job.material))
  lines.push(row('Qty  :', `${job.quantity} pcs`))
  lines.push(divider('-'))
  lines.push(row('Subtot:', formatRp(subtotal)))
  if (dapat_diskon) lines.push(row('Diskon:', '-' + formatRp(diskon)))
  if (dapat_diskon) lines.push(center('* Hemat cetak minimal 10 pcs *'))
  lines.push(divider('-'))
  lines.push(row('TOTAL:', formatRp(job.total_price)))
  lines.push(row('Bayar:', job.payment_method === 'cash' ? 'Cash' : 'Transfer'))
  if (job.payment_method === 'cash') lines.push(row('Kemb :', formatRp(change)))
  if (job.notes) lines.push(row('Cat  :', job.notes))
  lines.push(divider('='))
  lines.push(center('Terima kasih!'))
  lines.push(center('- LB.ADV -'))
  lines.push('')
  lines.push(center('Follow Us:'))
  lines.push(center(`📸 ${CONTACT_INSTAGRAM}`))
  lines.push(center(`📱 ${CONTACT_WHATSAPP}`))
  lines.push(center(`🌐 ${CONTACT_WEB}`))
  lines.push(center(`📧 ${CONTACT_EMAIL}`))
  lines.push('')
  lines.push('')
  
  return lines.filter(l => l !== null).join('\n')
}

export function triggerRawBTPrint(text, openDrawer = false) {
  // Check if text contains image and logo is ready
  const hasImage = text.includes('[IMAGE]') && logoBase64
  const drawerCmd = '\x1B\x70\x00\x19\xFA'
  
  if (hasImage) {
    // For images, RawBT needs a different format
    const imageData = logoBase64
    const textOnly = text.replace(/\[IMAGE\][^\n]*/, '').trim()
    
    // RawBT format for image printing
    const uri = `rawbt://print?image=${encodeURIComponent(imageData)}&text=${encodeURIComponent(textOnly)}`
    const a = document.createElement('a')
    a.href = uri
    a.click()
    // Drawer kick command is not reliably interpreted when mixed with image
    // print, so send it as a separate text-only intent right after.
    if (openDrawer) {
      setTimeout(() => openCashDrawerOnly(), 400)
    }
    return
  }
  
  // Regular text printing (fallback if no image or image not ready)
  const fullText = openDrawer ? text + drawerCmd : text
  const uri = `rawbt://print?text=${encodeURIComponent(fullText)}`
  const a = document.createElement('a')
  a.href = uri
  a.click()
}

export function triggerBrowserPrint(text) {
  console.log('triggerBrowserPrint called')
  // Format text for browser printing
  const formattedText = text.replace(/\[IMAGE\][^\n]*/g, '') // Remove image marker
  const lines = formattedText.split('\n').filter(line => line.trim)
  
  console.log('Receipt lines:', lines)
  
  // Parse lines into label-value pairs
  const parsedLines = lines.map(line => {
    if (line.includes('=')) return { type: 'divider', style: 'dashed' }
    if (line.includes('-')) return { type: 'divider', style: 'dotted' }
    if (line.includes('Terima kasih') || line.includes('LB.ADV')) return { type: 'center', text: line }
    // Contact lines - replace with brand logos
    if (line.includes('Follow Us')) return { type: 'center', text: line, isHeader: true }
    if (line.includes(CONTACT_INSTAGRAM)) return { type: 'contact', platform: 'instagram', value: CONTACT_INSTAGRAM }
    if (line.includes(CONTACT_WHATSAPP)) return { type: 'contact', platform: 'whatsapp', value: CONTACT_WHATSAPP }
    if (line.includes(CONTACT_WEB)) return { type: 'contact', platform: 'web', value: CONTACT_WEB }
    if (line.includes(CONTACT_EMAIL)) return { type: 'contact', platform: 'email', value: CONTACT_EMAIL }
    if (line.includes('Tgl') || line.includes('Kasir') || line.includes('Cust') || line.includes('Bahan') || 
        line.includes('Qty') || line.includes('Harga') || line.includes('Subtot') || line.includes('Diskon') ||
        line.includes('TOTAL') || line.includes('Bayar') || line.includes('Kemb') || line.includes('Cat')) {
      const match = line.match(/^([A-Za-z\s]+):\s*(.+)$/)
      if (match) {
        return { type: 'row', label: match[1].trim(), value: match[2].trim() }
      }
    }
    return { type: 'text', text: line }
  })
  
  // Create a printable HTML document
  const printWindow = window.open('', '_blank', 'width=300,height=600')
  if (!printWindow) {
    alert('Popup blocker detected! Please allow popups for this site to print.')
    return
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Receipt</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          width: 58mm;
          max-width: 58mm;
          margin: 0;
          padding: 2mm;
          line-height: 1.3;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .line {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .label {
          flex: 0 0 auto;
          font-size: 13px;
        }
        .value {
          flex: 1;
          text-align: right;
          font-size: 13px;
        }
        .center {
          text-align: center;
          font-size: 14px;
        }
        .contact-item {
          display: flex !important;
          justify-content: flex-start !important;
          align-items: center;
          gap: 5px;
          margin: 3px 0;
        }
        .contact-item img {
          width: 16px;
          height: 16px;
          margin: 0;
        }
        .contact-item span {
          font-size: 11px;
        }
        .divider {
          border-bottom: 1px dashed #000;
          margin: 3px 0;
        }
        .logo-img {
          max-width: 35mm;
          height: auto;
          display: block;
          margin: 0 auto 3mm auto;
        }
        @media print {
          body {
            margin: 0;
            padding: 2mm;
            width: 58mm;
            max-width: 58mm;
          }
          @page {
            size: 58mm auto;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      ${logoBase64 ? `<div class="center"><img src="${logoBase64}" class="logo-img" alt="Logo"></div>` : ''}
      ${parsedLines.map(line => {
        if (line.type === 'divider') return `<div class="divider" style="border-bottom-style: ${line.style};"></div>`
        if (line.type === 'center') return `<div class="center" style="${line.isHeader ? 'font-weight: bold; margin-top: 5px;' : ''}">${line.text}</div>`
        if (line.type === 'row') return `<div class="line"><span class="label">${line.label}:</span><span class="value">${line.value}</span></div>`
        if (line.type === 'contact') {
          const logoUrls = {
            instagram: 'https://cdn.simpleicons.org/instagram/000000',
            whatsapp: 'https://cdn.simpleicons.org/whatsapp/000000',
            email: 'https://cdn.simpleicons.org/gmail/000000'
          }
          const iconEmojis = {
            web: '🌐'
          }
          const iconLabels = {
            instagram: 'Instagram',
            whatsapp: 'WhatsApp',
            web: 'Website',
            email: 'Email'
          }
          if (line.platform === 'web') {
            return `<div class="contact-item">
              <span>${iconEmojis.web}</span>
              <span>${line.value}</span>
            </div>`
          }
          return `<div class="contact-item">
            <img src="${logoUrls[line.platform]}" alt="${iconLabels[line.platform]}" />
            <span>${line.value}</span>
          </div>`
        }
        return `<div class="line">${line.text}</div>`
      }).join('')}
    </body>
    </html>
  `)
  printWindow.document.close()
  
  // Try to trigger print immediately
  setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
      console.log('Print dialog triggered')
    } catch (e) {
      console.error('Print failed:', e)
      alert('Print dialog gagal muncul. Silakan tekan Ctrl+P untuk print manual.')
    }
  }, 250)
  
  console.log('Print window opened')
}

export function openCashDrawerOnly() {
  import('@capacitor/core').then(({ Capacitor }) => {
    if (Capacitor.isNativePlatform()) {
      import('./nativePrint').then(({ openCashDrawerNative }) => {
        openCashDrawerNative().catch((e) => console.error('Gagal buka laci:', e))
      })
      return
    }
    const drawerCmd = '\x1B\x70\x00\x19\xFA'
    const uri = `rawbt://print?text=${encodeURIComponent(drawerCmd)}`
    const a = document.createElement('a')
    a.href = uri
    a.click()
  })
}
