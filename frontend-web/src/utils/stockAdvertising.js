// Konstanta & helper untuk kategori stok ADVERTISING (sumber data Kalkulator Advertising)

export const STOCK_TABS = [
  { key: 'PRINT', label: 'PRINT', icon: '🖨️', hint: 'Muncul di Print Job kasir', color: 'orange' },
  { key: 'UMUM', label: 'UMUM', icon: '📦', hint: 'Perlengkapan & operasional toko', color: 'blue' },
  { key: 'ADVERTISING', label: 'ADVERTISING', icon: '💡', hint: 'Sumber data Kalkulator Advertising', color: 'purple' },
]

export const ADV_SUBS = [
  { key: 'LAMP', label: 'Lampu', icon: '💡', defaultUnit: 'pcs' },
  { key: 'TRAFO', label: 'Trafo', icon: '🔌', defaultUnit: 'pcs' },
  { key: 'SHEET', label: 'Plat / Lembaran', icon: '🟦', defaultUnit: 'lembar' },
  { key: 'BAR', label: 'Hollow / Profil / Pipa', icon: '📏', defaultUnit: 'batang' },
  { key: 'STICKER', label: 'Stiker', icon: '🏷️', defaultUnit: 'Roll' },
  { key: 'ACCESSORY', label: 'Aksesoris', icon: '🔩', defaultUnit: 'pcs' },
]

export const STOCK_UNITS = ['pcs', 'Roll', 'Meter', 'Kg (Kilogram)', 'Liter', 'Box', 'Pack', 'lembar', 'batang']

export const EMPTY_STOCK_FORM = {
  name: '', quantity: '', unit: 'pcs', price: '', price_raw: '', usage_category: 'PRINT', notes: '',
  adv_sub_category: 'LAMP', brand: '', color: '',
  watt: '', watt_basis: 'PER_UNIT', spacing_cm: '',
  watt_capacity: '', ampere: '', trafo_type: 'RAINPROOF',
  thickness_mm: '', sheet_length: '122', sheet_width: '244',
  bar_length_m: '6', diameter: '',
  roll_width_cm: '', roll_length_m: '',
}

// Kategori efektif sebuah item (data lama selain PRINT/ADVERTISING dianggap UMUM)
export function stockTabOf(s) {
  const c = String(s.usage_category || '').toUpperCase()
  if (c === 'PRINT') return 'PRINT'
  if (c === 'ADVERTISING') return 'ADVERTISING'
  return 'UMUM'
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

// Harga modal turunan untuk item ADVERTISING. Mengembalikan array {label, value} untuk ditampilkan.
export function advDerivedInfo(s) {
  const price = num(s.price)
  const out = []
  switch (s.adv_sub_category) {
    case 'SHEET': {
      const area = num(s.sheet_length) * num(s.sheet_width)
      if (area > 0 && price > 0) out.push({ label: 'Modal / cm²', value: `Rp ${(price / area).toFixed(2)}` })
      break
    }
    case 'BAR': {
      const m = num(s.bar_length_m)
      if (m > 0 && price > 0) out.push({ label: 'Modal / meter', value: `Rp ${Math.round(price / m).toLocaleString('id-ID')}` })
      break
    }
    case 'STICKER': {
      const area = num(s.roll_width_cm) * num(s.roll_length_m) * 100
      if (area > 0 && price > 0) out.push({ label: 'Modal / cm²', value: `Rp ${(price / area).toFixed(3)}` })
      break
    }
    case 'LAMP': {
      if (num(s.watt) > 0) out.push({ label: 'Daya', value: `${s.watt} W ${s.watt_basis === 'PER_METER' ? '/ meter' : '/ pcs'}` })
      break
    }
    case 'TRAFO': {
      if (num(s.watt_capacity) > 0) out.push({ label: 'Kapasitas', value: `${s.watt_capacity} W${num(s.ampere) > 0 ? ` · ${s.ampere}A` : ''}` })
      break
    }
    default: break
  }
  return out
}

// Ringkasan satu baris untuk daftar
export function advSummaryLine(s) {
  const parts = []
  if (s.brand) parts.push(s.brand)
  if (s.color) parts.push(s.color)
  if (s.thickness_mm) parts.push(`${s.thickness_mm}mm`)
  if (s.diameter) parts.push(s.diameter)
  advDerivedInfo(s).forEach(i => parts.push(`${i.label}: ${i.value}`))
  return parts.join(' · ')
}

// Susun payload API dari form
export function buildStockPayload(form, parseRupiahInput) {
  const payload = {
    name: form.name.trim(),
    quantity: parseFloat(form.quantity),
    unit: form.unit,
    price: parseRupiahInput(form.price_raw) || parseFloat(form.price) || 0,
    usage_category: form.usage_category,
    notes: form.notes || '',
  }
  if (form.usage_category !== 'ADVERTISING') return payload

  const n = (v) => (v === '' || v === null || v === undefined ? undefined : parseFloat(v))
  const t = (v) => (v ? String(v).trim() : undefined)
  const sub = form.adv_sub_category
  const extra = { adv_sub_category: sub, brand: t(form.brand), color: t(form.color) }
  if (sub === 'LAMP') Object.assign(extra, { watt: n(form.watt), watt_basis: form.watt_basis, spacing_cm: n(form.spacing_cm) })
  if (sub === 'TRAFO') Object.assign(extra, { watt_capacity: n(form.watt_capacity), ampere: n(form.ampere), trafo_type: form.trafo_type })
  if (sub === 'SHEET') Object.assign(extra, { thickness_mm: n(form.thickness_mm), sheet_length: n(form.sheet_length), sheet_width: n(form.sheet_width) })
  if (sub === 'BAR') Object.assign(extra, { bar_length_m: n(form.bar_length_m), diameter: t(form.diameter) })
  if (sub === 'STICKER') Object.assign(extra, { roll_width_cm: n(form.roll_width_cm), roll_length_m: n(form.roll_length_m) })
  Object.keys(extra).forEach(k => extra[k] === undefined && delete extra[k])
  return { ...payload, ...extra }
}

// Isi form dari item yang diedit
export function stockToForm(s, formatRupiahInput) {
  const f = { ...EMPTY_STOCK_FORM }
  Object.keys(f).forEach(k => { if (s[k] !== undefined && s[k] !== null) f[k] = s[k] })
  f.usage_category = stockTabOf(s)
  f.price = s.price || ''
  f.price_raw = formatRupiahInput(String(s.price || ''))
  f.notes = s.notes || ''
  return f
}
