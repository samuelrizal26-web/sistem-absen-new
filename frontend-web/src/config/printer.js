// Konfigurasi printer thermal Bluetooth
// KASSEN BTP-299 - Bluetooth Classic SPP, ESC/POS compatible, 58mm (48mm print width / 384 dots)
export const PRINTER_PAPER_WIDTH_DOTS = 384
export const PRINTER_PAPER_WIDTH_CHARS = 32

// Default MAC address (fallback jika belum diset di localStorage)
export const DEFAULT_PRINTER_MAC = 'A4:BA:A2:02:59:A1'

export function getPrinterMAC() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('printer_mac_address') || DEFAULT_PRINTER_MAC
  }
  return DEFAULT_PRINTER_MAC
}

export function setPrinterMAC(mac) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('printer_mac_address', mac)
  }
}
