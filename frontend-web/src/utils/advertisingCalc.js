// Engine Kalkulasi Terpadu: Kalkulator Advertising Labalaba
// Seluruh pilihan bahan (Board ACP/Akrilik/Plat, Stiker, Lampu, Trafo, Hollow/Pipa, Aksesoris)
// diambil langsung secara dinamis dari Stok Material Advertising & Katalog Akrilik yang disimpan di Admin.

export const DEFAULT_ADVERTISING_CONFIG = {
  id: 'master_config',
  nego_discount_pct: 15.0,
  rounding_step: 1000,
  neonbox: {
    min_order_price: 350000,
    small_max_area: 4000,
    mid_max_area: 8000,
    rate_small_1s: 320,
    rate_small_2s: 380,
    rate_mid_1s: 280,
    rate_mid_2s: 330,
    rate_big_1s: 250,
    rate_big_2s: 300,
    poles: [
      { id: 'none', name: 'Tanpa Tiang / Rangka Luar', buy_price: 0, sell_price: 0, unit: 'paket' },
      { id: 'rangka_hollow', name: 'Rangka Hollow Penguat Dalam', buy_price: 150000, sell_price: 250000, unit: 'paket' },
      { id: 'bracket_dinding', name: 'Bracket Besi Siku Dinding', buy_price: 150000, sell_price: 250000, unit: 'paket' },
      { id: 'tiang_2in', name: 'Paket Tiang Pipa 2" + Rangka + Pasang', buy_price: 1200000, sell_price: 1500000, unit: 'paket' },
      { id: 'tiang_25in', name: 'Paket Tiang Pipa 2.5" + Rangka + Pasang', buy_price: 1600000, sell_price: 1950000, unit: 'paket' },
      { id: 'tiang_3in', name: 'Paket Tiang Pipa 3" + Rangka + Pasang', buy_price: 2000000, sell_price: 2500000, unit: 'paket' },
    ],
  },
  huruf_timbul: {
    min_height_cm: 10,
    tier_threshold_cm: 30,
    logo_multiplier: 2.0,
    min_order_price: 250000,
    backdrop_acp_sell_sqcm: 55,
    backdrop_acp_buy_sqcm: 22,
    rangka_dudukan_sell_m: 85000,
    rangka_dudukan_buy_m: 45000,
    variants: [
      { id: 'akrilik_non', name: 'Akrilik Tanpa Lampu', has_led: false, rate_std: 6500, rate_big: 8000, buy_sqcm: 20 },
      { id: 'akrilik_led', name: 'Akrilik + Lampu (Include Trafo)', has_led: true, rate_std: 11000, rate_big: 13500, buy_sqcm: 26 },
      { id: 'stenlis_non', name: 'Stenlis Mirror Tanpa Lampu', has_led: false, rate_std: 7000, rate_big: 8500, buy_sqcm: 22 },
      { id: 'stenlis_led', name: 'Stenlis Mirror + Lampu (Include Trafo)', has_led: true, rate_std: 12000, rate_big: 15000, buy_sqcm: 28 },
      { id: 'galvanis_non', name: 'Galvanis Cat Duco Tanpa Lampu', has_led: false, rate_std: 7500, rate_big: 9000, buy_sqcm: 24 },
      { id: 'galvanis_led', name: 'Galvanis Cat Duco + Lampu (Include Trafo)', has_led: true, rate_std: 12500, rate_big: 15500, buy_sqcm: 30 },
    ],
  },
  rambu: {
    min_order_price: 100000,
    min_area_sqcm: 600,
    qty_mid_min: 3,
    qty_bulk_min: 5,
    // Acuan pengali/tarif dasar per cm² untuk Rambu (otomatis menyesuaikan bahan stok yang dipilih)
    rate_ecer_base: 150,
    rate_mid_base: 120,
    rate_bulk_base: 100,
    extra_color_ecer: 30,
    extra_color_mid: 25,
    extra_color_bulk: 20,
    pen_iklan_sell_pcs: 15000,
    pen_iklan_buy_pcs: 6000,
    rangka_hollow_sell_m: 60000,
    rangka_hollow_buy_m: 35000,
    tiang_pipa_sell_m: 150000,
    tiang_pipa_buy_m: 95000,
  },
  neonflex: {
    min_order_price: 250000,
    mid_meter_min: 3.0,
    bulk_meter_min: 8.0,
    rate_meter_ecer: 220000,
    rate_meter_mid: 195000,
    rate_meter_bulk: 175000,
    buy_meter_default: 65000,
    adaptor_buy_default: 65000,
    acrylic_sell_sqcm: 38,
    acrylic_buy_sqcm: 17,
    contour_cut_pct: 15,
    pen_iklan_sell_pcs: 15000,
    pen_iklan_buy_pcs: 6000,
  },
}

const num = (v, fallback = 0) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

export const roundPrice = (value, step = 1000) => {
  const v = num(value)
  if (v <= 0) return 0
  const s = Math.max(100, num(step, 1000))
  return Math.ceil(v / s) * s
}

export function mergeAdvConfig(raw) {
  if (!raw) return DEFAULT_ADVERTISING_CONFIG
  return {
    ...DEFAULT_ADVERTISING_CONFIG,
    ...raw,
    neonbox: { ...DEFAULT_ADVERTISING_CONFIG.neonbox, ...(raw.neonbox || {}) },
    huruf_timbul: { ...DEFAULT_ADVERTISING_CONFIG.huruf_timbul, ...(raw.huruf_timbul || {}) },
    rambu: { ...DEFAULT_ADVERTISING_CONFIG.rambu, ...(raw.rambu || {}) },
    neonflex: { ...DEFAULT_ADVERTISING_CONFIG.neonflex, ...(raw.neonflex || {}) },
  }
}

// ─── PEMBANGUN KATALOG MATERIAL DARI STOK & AKRILIK ADMIN ──────
export function buildMaterialCatalog(stocks = [], acrylics = []) {
  const advStocks = (Array.isArray(stocks) ? stocks : []).filter(
    s => String(s.usage_category || '').toUpperCase() === 'ADVERTISING'
  )

  // 1. Bahan Board / Lembaran (Gabungan Stok SHEET + Master Akrilik)
  const sheetBoards = advStocks
    .filter(s => s.adv_sub_category === 'SHEET')
    .map(s => {
      const area = Math.max(1, num(s.sheet_length, 122) * num(s.sheet_width, 244))
      const buySqcm = Math.round(((num(s.price, 600000) / area) + Number.EPSILON) * 100) / 100
      return {
        id: `sheet_${s.id}`,
        stockId: s.id,
        source: 'STOCK_SHEET',
        name: `${s.name}${s.thickness_mm && !s.name.includes(`${s.thickness_mm}mm`) ? ` (${s.thickness_mm}mm)` : ''}${s.color ? ` - ${s.color}` : ''}`,
        buy_price: num(s.price, 600000),
        buy_sqcm: buySqcm,
        sheet_length: num(s.sheet_length, 122),
        sheet_width: num(s.sheet_width, 244),
      }
    })

  const acrylicBoards = (Array.isArray(acrylics) ? acrylics : []).map(a => {
    const area = Math.max(1, num(a.sheet_length, 122) * num(a.sheet_width, 244))
    const buySqcm = num(a.cost_per_sqcm) > 0
      ? num(a.cost_per_sqcm)
      : Math.round(((num(a.buy_price, 500000) / area) + Number.EPSILON) * 100) / 100
    const sellSqcm = num(a.price_normal_sqcm) > 0
      ? num(a.price_normal_sqcm)
      : Math.round(((num(a.sell_price, 1000000) / area) + Number.EPSILON) * 100) / 100
    return {
      id: `acr_${a.id}`,
      acrylicId: a.id,
      source: 'ACRYLIC',
      name: `${a.name} ${a.thickness || ''}${a.color && !a.name.toLowerCase().includes(a.color.toLowerCase()) ? ` (${a.color})` : ''}`.trim(),
      buy_price: num(a.buy_price, 500000),
      buy_sqcm: buySqcm,
      sell_sqcm: sellSqcm,
      sheet_length: num(a.sheet_length, 122),
      sheet_width: num(a.sheet_width, 244),
    }
  })

  const boardOptions = [...sheetBoards, ...acrylicBoards]

  // 2. Jenis Stiker (Dari Stok ADVERTISING -> STICKER)
  const stickerOptions = advStocks
    .filter(s => s.adv_sub_category === 'STICKER')
    .map(s => {
      const w = num(s.roll_width_cm, 60)
      const lCm = num(s.roll_length_m, 1) * 100
      const area = Math.max(1, w * lCm)
      const buySqcm = Math.round(((num(s.price, 40000) / area) + Number.EPSILON) * 100) / 100
      const upper = String(s.name || '').toUpperCase()
      const isCutting = !upper.includes('PRINT') && !upper.includes('CETAK') && !upper.includes('BACKLITE')
      return {
        id: `stk_${s.id}`,
        stockId: s.id,
        name: `${s.name}${s.brand && !s.name.includes(s.brand) ? ` (${s.brand})` : ''}${s.color ? ` - ${s.color}` : ''}`,
        price: num(s.price, 40000),
        roll_width_cm: w,
        roll_length_m: num(s.roll_length_m, 1),
        buy_sqcm: buySqcm,
        is_cutting: isCutting,
      }
    })

  // 3. Lampu LED (Dari Stok ADVERTISING -> LAMP)
  const lampOptions = advStocks
    .filter(s => s.adv_sub_category === 'LAMP')
    .map(s => ({
      id: s.id,
      stockId: s.id,
      name: `${s.name}${s.color && !s.name.includes(s.color) ? ` (${s.color})` : ''}${s.watt ? ` · ${s.watt}W` : ''}`,
      price: num(s.price, 3000),
      unit: s.unit || 'pcs',
      watt: num(s.watt, 1.5),
      watt_basis: s.watt_basis || 'PER_UNIT',
      spacing_cm: num(s.spacing_cm, 12),
      color: s.color || '',
    }))

  // 4. Trafo / Power Supply (Dari Stok ADVERTISING -> TRAFO)
  const trafoOptions = advStocks
    .filter(s => s.adv_sub_category === 'TRAFO')
    .map(s => ({
      id: s.id,
      stockId: s.id,
      name: `${s.name}${s.watt_capacity && !s.name.includes(`${s.watt_capacity}W`) ? ` (${s.watt_capacity}W)` : ''}`,
      price: num(s.price, 60000),
      watt_capacity: num(s.watt_capacity, 60),
      ampere: num(s.ampere, 5),
      trafo_type: s.trafo_type || 'RAINPROOF',
    }))
    .sort((a, b) => a.watt_capacity - b.watt_capacity)

  // 5. Batangan: Hollow, Profil, Pipa Tiang (Dari Stok ADVERTISING -> BAR)
  const barOptions = advStocks
    .filter(s => s.adv_sub_category === 'BAR')
    .map(s => {
      const lenM = Math.max(1, num(s.bar_length_m, 6))
      const buyPerM = Math.round(num(s.price, 95000) / lenM)
      return {
        id: s.id,
        stockId: s.id,
        name: `${s.name}${s.diameter && !s.name.includes(s.diameter) ? ` (${s.diameter})` : ''}`,
        price: num(s.price, 95000),
        bar_length_m: lenM,
        buy_per_m: buyPerM,
      }
    })

  // 6. Aksesoris: Baut Pen Iklan, dll (Dari Stok ADVERTISING -> ACCESSORY)
  const accessoryOptions = advStocks
    .filter(s => s.adv_sub_category === 'ACCESSORY')
    .map(s => ({
      id: s.id,
      stockId: s.id,
      name: s.name,
      price: num(s.price, 6000),
      unit: s.unit || 'pcs',
    }))

  return {
    boardOptions,
    stickerOptions,
    lampOptions,
    trafoOptions,
    barOptions,
    accessoryOptions,
  }
}

// ─── 1. KALKULASI NEONBOX (Spek Material Lengkap dari Stok) ────
export function calcNeonbox(input, rawConfig, stocks = [], acrylics = []) {
  const cfg = mergeAdvConfig(rawConfig)
  const nb = cfg.neonbox
  const catalog = buildMaterialCatalog(stocks, acrylics)

  const length = num(input.length)
  const width = num(input.width)
  if (length <= 0 || width <= 0) return null

  const sides = num(input.sides, 2) === 1 ? 1 : 2
  const frameThick = num(input.frameThick, 13)
  const areaSqcm = Math.round(length * width)
  const perimeterCm = Math.round(2 * (length + width))

  // Pilih Bahan Muka Akrilik dari Katalog
  const faceItem = catalog.boardOptions.find(b => b.id === input.faceBoardId)
    || catalog.boardOptions.find(b => b.source === 'ACRYLIC')
    || catalog.boardOptions[0]
    || { name: 'Akrilik 3mm', buy_sqcm: 16.8 }

  // Pilih Jenis Stiker Visual dari Katalog
  const stickerItem = catalog.stickerOptions.find(s => s.id === input.stickerId)
    || catalog.stickerOptions.find(s => s.name.toUpperCase().includes('BACKLITE'))
    || catalog.stickerOptions[0]
    || { name: 'Stiker Backlite UV', buy_sqcm: 6.5 }

  // Pilih Lampu LED dari Katalog
  const lampItem = catalog.lampOptions.find(l => l.id === input.lampStockId)
    || catalog.lampOptions[0]
    || { name: 'Lampu LED Sidelight 1.5W', price: 3000, watt: 1.5 }

  // Skala Ukuran Neonbox
  let tierLabel = 'Ukuran Sedang'
  let rateSqcm = sides === 2 ? num(nb.rate_mid_2s, 330) : num(nb.rate_mid_1s, 280)
  if (areaSqcm <= num(nb.small_max_area, 4000)) {
    tierLabel = `Ukuran Kecil (≤ ${nb.small_max_area} cm²)`
    rateSqcm = sides === 2 ? num(nb.rate_small_2s, 380) : num(nb.rate_small_1s, 320)
  } else if (areaSqcm > num(nb.mid_max_area, 8000)) {
    tierLabel = `Ukuran Besar (> ${nb.mid_max_area} cm²)`
    rateSqcm = sides === 2 ? num(nb.rate_big_2s, 300) : num(nb.rate_big_1s, 250)
  } else {
    tierLabel = `Ukuran Sedang (${nb.small_max_area}–${nb.mid_max_area} cm²)`
  }

  // Sesuaikan tarif jika bahan muka yang dipilih lebih tebal/mahal dari akrilik 3mm standar (Rp 16.8/cm²)
  const matDiffSqcm = Math.max(0, (num(faceItem.buy_sqcm, 16.8) - 17) * sides * 1.8)
  const adjustedDefaultRate = Math.round(rateSqcm + matDiffSqcm)

  const activeRate = input.overrideRate !== undefined && input.overrideRate !== '' ? num(input.overrideRate) : adjustedDefaultRate
  const rawBodySell = areaSqcm * activeRate
  const minOrderApplied = rawBodySell < num(nb.min_order_price, 350000) && !input.overrideRate
  const bodySellPrice = minOrderApplied ? num(nb.min_order_price, 350000) : rawBodySell

  const poles = Array.isArray(nb.poles) ? nb.poles : DEFAULT_ADVERTISING_CONFIG.neonbox.poles
  const poleItem = poles.find(p => p.id === input.poleId) || poles[0]
  const poleSellPrice = input.customPoleSell !== undefined && input.customPoleSell !== ''
    ? num(input.customPoleSell)
    : num(poleItem?.sell_price, 0)
  const poleBuyPrice = input.customPoleBuy !== undefined && input.customPoleBuy !== ''
    ? num(input.customPoleBuy)
    : num(poleItem?.buy_price, 0)

  const extraCost = num(input.extraCost, 0)
  const recommendedSellPrice = roundPrice(bodySellPrice + poleSellPrice + extraCost, cfg.rounding_step)
  const negoPct = num(cfg.nego_discount_pct, 15)
  const netFloorPrice = roundPrice(recommendedSellPrice * (1 - negoPct / 100), cfg.rounding_step)

  // ── HPP BOM Real dari Stok yang Dipilih ──
  const faceAreaTotal = areaSqcm * sides
  const sideBandArea = perimeterCm * frameThick
  const acrylicCost = Math.round((faceAreaTotal + sideBandArea) * num(faceItem.buy_sqcm, 16.8))

  const autoLampQty = Math.max(4, Math.ceil(perimeterCm / Math.max(5, num(lampItem.spacing_cm, 10))))
  const lampQty = num(input.lampQty) > 0 ? num(input.lampQty) : autoLampQty
  const lampCost = Math.round(lampQty * num(lampItem.price, 3000))
  const totalWatt = Math.round(lampQty * num(lampItem.watt, 1.5) * 10) / 10

  // Pilih Trafo otomatis dari Stok TRAFO berdasarkan total Watt (safety factor 1.25x) atau pilihan manual
  const manualTrafo = catalog.trafoOptions.find(t => t.id === input.trafoStockId)
  const autoTrafo = manualTrafo
    || catalog.trafoOptions.find(t => t.watt_capacity >= totalWatt * 1.25)
    || catalog.trafoOptions[catalog.trafoOptions.length - 1]
  const trafoCost = autoTrafo ? num(autoTrafo.price, 60000) : (totalWatt <= 48 ? 60000 : totalWatt <= 85 ? 120000 : 165000)
  const trafoName = autoTrafo ? autoTrafo.name : (totalWatt <= 48 ? 'Trafo 60W 12V' : totalWatt <= 85 ? 'Trafo 100W 12V' : 'Trafo 200W 12V')

  const stickerCost = input.stickerId === 'NONE' ? 0 : Math.round(faceAreaTotal * num(stickerItem.buy_sqcm, 6.5))
  const miscCost = 25000
  const bodyHpp = acrylicCost + lampCost + trafoCost + stickerCost + miscCost
  const totalHpp = bodyHpp + poleBuyPrice + extraCost

  const materials = [
    { name: `${faceItem.name} (${sides} Sisi + Frame ${frameThick}cm)`, quantity: 1, unit: 'set', price: acrylicCost, is_custom: true },
    { name: lampItem.name, quantity: lampQty, unit: lampItem.unit || 'pcs', price: num(lampItem.price, 3000), stock_id: lampItem.stockId || null, is_custom: !lampItem.stockId },
    { name: `${trafoName} (Beban ~${totalWatt}W)`, quantity: 1, unit: 'pcs', price: trafoCost, stock_id: autoTrafo?.stockId || null, is_custom: !autoTrafo?.stockId },
  ]
  if (stickerCost > 0) {
    materials.push({ name: `${stickerItem.name} (${sides} Sisi)`, quantity: 1, unit: 'set', price: stickerCost, is_custom: true })
  }
  if (poleBuyPrice > 0 || poleSellPrice > 0) {
    materials.push({ name: poleItem?.name || 'Tiang & Rangka Las', quantity: 1, unit: 'paket', price: poleBuyPrice, is_custom: true })
  }
  if (extraCost > 0) {
    materials.push({ name: input.extraNote || 'Biaya Tambahan / Pasang', quantity: 1, unit: 'paket', price: extraCost, is_custom: true })
  }

  return {
    productType: 'NEONBOX',
    projectTitle: `Neonbox ${length}x${width} cm (${sides} Sisi - ${faceItem.name})`,
    length, width, sides, frameThick,
    faceItem, stickerItem, lampItem,
    areaSqcm, perimeterCm,
    tierLabel, rateSqcm: activeRate, defaultRateSqcm: adjustedDefaultRate,
    minOrderApplied,
    bodySellPrice, poleItem, poleSellPrice, poleBuyPrice, extraCost,
    recommendedSellPrice, netFloorPrice, negoPct,
    acrylicCost, lampQty, lampUnitCost: num(lampItem.price, 3000), lampCost, totalWatt, trafoName, trafoCost, stickerCost, miscCost,
    bodyHpp, totalHpp,
    profitAtRecommended: recommendedSellPrice - totalHpp,
    marginPctAtRecommended: recommendedSellPrice > 0 ? Math.round(((recommendedSellPrice - totalHpp) / recommendedSellPrice) * 1000) / 10 : 0,
    profitAtNet: netFloorPrice - totalHpp,
    materials,
  }
}

// ─── 2. KALKULASI HURUF TIMBUL (Spek Material Lengkap) ─────────
export function calcHurufTimbul(input, rawConfig, stocks = [], acrylics = []) {
  const cfg = mergeAdvConfig(rawConfig)
  const ht = cfg.huruf_timbul
  const catalog = buildMaterialCatalog(stocks, acrylics)

  const rawText = String(input.text || '')
  const letterCount = rawText.replace(/\s+/g, '').length
  const heightCm = num(input.heightCm)
  const logoCount = Math.max(0, parseInt(input.logoCount, 10) || 0)
  const logoHeightCm = num(input.logoHeightCm, heightCm)

  if ((letterCount <= 0 && logoCount <= 0) || heightCm <= 0) return null

  const variants = Array.isArray(ht.variants) ? ht.variants : DEFAULT_ADVERTISING_CONFIG.huruf_timbul.variants
  const variant = variants.find(v => v.id === input.variantId) || variants[0]

  // Bahan Plat/Akrilik dari Stok jika dipilih spesifik
  const plateItem = catalog.boardOptions.find(b => b.id === input.plateBoardId)
  const plateBuySqcm = plateItem ? num(plateItem.buy_sqcm, 22) : num(variant.buy_sqcm, 24)

  const minH = num(ht.min_height_cm, 10)
  const belowMinWarning = heightCm < minH
  const effectiveHeight = Math.max(heightCm, minH)
  const isBigTier = effectiveHeight > num(ht.tier_threshold_cm, 30)
  const tierLabel = isBigTier ? `Tinggi Besar (> ${ht.tier_threshold_cm} cm)` : `Tinggi Standar (${minH}–${ht.tier_threshold_cm} cm)`
  const defaultRate = isBigTier ? num(variant.rate_big) : num(variant.rate_std)
  const activeRate = input.overrideRate !== undefined && input.overrideRate !== '' ? num(input.overrideRate) : defaultRate

  const lettersSellPrice = letterCount * effectiveHeight * activeRate
  const effLogoHeight = Math.max(logoHeightCm || effectiveHeight, minH)
  const logoMult = num(ht.logo_multiplier, 2.0)
  const logosSellPrice = logoCount * effLogoHeight * (activeRate * logoMult)

  const hasBackdrop = Boolean(input.hasBackdrop)
  const backdropBoard = catalog.boardOptions.find(b => b.id === input.backdropBoardId) || catalog.boardOptions[0]
  const backdropL = num(input.backdropLength)
  const backdropW = num(input.backdropWidth)
  const backdropArea = hasBackdrop && backdropL > 0 && backdropW > 0 ? backdropL * backdropW : 0
  const backdropSellPrice = Math.round(backdropArea * num(ht.backdrop_acp_sell_sqcm, 55))

  const rangkaMeter = num(input.rangkaMeter, 0)
  const rangkaSellPrice = Math.round(rangkaMeter * num(ht.rangka_dudukan_sell_m, 85000))
  const extraCost = num(input.extraCost, 0)

  const baseCharsSell = Math.max(num(ht.min_order_price, 250000), lettersSellPrice + logosSellPrice)
  const recommendedSellPrice = roundPrice(baseCharsSell + backdropSellPrice + rangkaSellPrice + extraCost, cfg.rounding_step)
  const negoPct = num(cfg.nego_discount_pct, 15)
  const netFloorPrice = roundPrice(recommendedSellPrice * (1 - negoPct / 100), cfg.rounding_step)

  // HPP Modal Real
  const estTotalWidth = num(input.totalWidthCm) > 0
    ? num(input.totalWidthCm)
    : Math.round((letterCount * effectiveHeight * 0.75) + (logoCount * effLogoHeight))
  const boundingBoxArea = estTotalWidth * effectiveHeight
  const plateCost = Math.round(boundingBoxArea * plateBuySqcm)

  const lampItem = catalog.lampOptions.find(l => l.id === input.lampStockId) || catalog.lampOptions[1] || catalog.lampOptions[0]
  const lampUnitCost = lampItem ? num(lampItem.price, 2500) : 2500
  const lampUnitWatt = lampItem ? num(lampItem.watt, 1.2) : 1.2
  const estLampQty = variant.has_led ? (num(input.lampQtyManual) > 0 ? num(input.lampQtyManual) : Math.max(1, (letterCount + logoCount * 2) * Math.ceil(effectiveHeight / 5))) : 0
  const lampCost = variant.has_led ? Math.round(estLampQty * lampUnitCost) : 0
  const totalWatt = Math.round(estLampQty * lampUnitWatt * 10) / 10

  const autoTrafo = variant.has_led
    ? (catalog.trafoOptions.find(t => t.watt_capacity >= totalWatt * 1.25) || catalog.trafoOptions[0])
    : null
  const trafoCost = variant.has_led ? (autoTrafo ? num(autoTrafo.price, 60000) : (totalWatt <= 50 ? 60000 : 120000)) : 0

  const backdropBuySqcm = backdropBoard ? num(backdropBoard.buy_sqcm, 20) : num(ht.backdrop_acp_buy_sqcm, 20)
  const backdropBuyCost = Math.round(backdropArea * backdropBuySqcm)
  const rangkaBuyCost = Math.round(rangkaMeter * num(ht.rangka_dudukan_buy_m, 45000))
  const totalHpp = plateCost + lampCost + trafoCost + backdropBuyCost + rangkaBuyCost + extraCost

  const totalEffectiveCm = (letterCount * effectiveHeight) + (logoCount * effLogoHeight * logoMult)
  const materials = [
    { name: `Bahan ${plateItem ? plateItem.name : variant.name} (${letterCount} huruf, T:${heightCm}cm)`, quantity: 1, unit: 'set', price: plateCost, is_custom: true },
  ]
  if (variant.has_led) {
    materials.push({ name: `${lampItem ? lampItem.name : 'Lampu LED'} (${estLampQty} pcs) + ${autoTrafo ? autoTrafo.name : 'Trafo'}`, quantity: 1, unit: 'set', price: lampCost + trafoCost, is_custom: true })
  }
  if (backdropArea > 0) {
    materials.push({ name: `Backdrop ${backdropBoard?.name || 'ACP'} ${backdropL}x${backdropW} cm`, quantity: 1, unit: 'set', price: backdropBuyCost, is_custom: true })
  }
  if (rangkaMeter > 0) {
    materials.push({ name: `Rangka Dudukan (${rangkaMeter} m)`, quantity: rangkaMeter, unit: 'Meter', price: num(ht.rangka_dudukan_buy_m, 45000), is_custom: true })
  }
  if (extraCost > 0) {
    materials.push({ name: input.extraNote || 'Biaya Pasang / Lain-lain', quantity: 1, unit: 'paket', price: extraCost, is_custom: true })
  }

  return {
    productType: 'HURUF_TIMBUL',
    projectTitle: `Huruf Timbul "${rawText.slice(0, 20)}" (${variant.name}, T:${heightCm}cm)`,
    rawText, letterCount, heightCm, effectiveHeight, belowMinWarning,
    logoCount, logoHeightCm: effLogoHeight, logoMult,
    variant, plateItem, lampItem, backdropBoard,
    tierLabel, ratePerCm: activeRate, defaultRatePerCm: defaultRate,
    totalEffectiveCm,
    lettersSellPrice, logosSellPrice,
    hasBackdrop, backdropL, backdropW, backdropArea, backdropSellPrice, backdropBuyCost,
    rangkaMeter, rangkaSellPrice, rangkaBuyCost, extraCost,
    recommendedSellPrice, netFloorPrice, negoPct,
    estTotalWidth, boundingBoxArea, plateCost, estLampQty, lampCost, totalWatt, trafoCost, totalHpp,
    profitAtRecommended: recommendedSellPrice - totalHpp,
    marginPctAtRecommended: recommendedSellPrice > 0 ? Math.round(((recommendedSellPrice - totalHpp) / recommendedSellPrice) * 1000) / 10 : 0,
    materials,
  }
}

// ─── 3. KALKULASI RAMBU & PAPAN NAMA (Dari Stok Board & Stiker) ──
export function calcRambu(input, rawConfig, stocks = [], acrylics = []) {
  const cfg = mergeAdvConfig(rawConfig)
  const rb = cfg.rambu
  const catalog = buildMaterialCatalog(stocks, acrylics)

  const length = num(input.length)
  const width = num(input.width)
  const qty = Math.max(1, parseInt(input.qty, 10) || 1)
  if (length <= 0 || width <= 0) return null

  const sides = num(input.sides, 1) === 2 ? 2 : 1

  // 1. Bahan Board dari Stok Admin (ACP 3mm, ACP 4mm, Akrilik 2mm, 3mm, 5mm, dll)
  const board = catalog.boardOptions.find(b => b.id === input.boardId)
    || catalog.boardOptions[0]
    || { id: 'default_acp', name: 'ACP 3mm Standar', buy_sqcm: 20.15 }

  // 2. Jenis Stiker dari Stok Admin (Reflective Asahi, 3M, Oracal 651, Print Laminasi, dll)
  const sticker = catalog.stickerOptions.find(s => s.id === input.stickerId)
    || catalog.stickerOptions[0]
    || { id: 'default_asahi', name: 'Stiker Reflective Asahi', buy_sqcm: 6.67, is_cutting: true }

  // 3. Jumlah Warna Stiker
  const isCutting = Boolean(sticker.is_cutting)
  const colorCount = isCutting ? Math.max(1, parseInt(input.colorCount, 10) || 2) : 1
  const extraColors = Math.max(0, colorCount - 1)

  const areaPerPcs = Math.round(length * width)
  const effectiveArea = Math.max(areaPerPcs, num(rb.min_area_sqcm, 600))

  // Deteksi skala: Eceran / Menengah / Partai
  let tierKey = 'mid'
  let tierLabel = 'Normal / Menengah'
  if (qty >= num(rb.qty_bulk_min, 5) || areaPerPcs >= 8000) {
    tierKey = 'bulk'
    tierLabel = `Partai / Besar (≥ ${rb.qty_bulk_min} pcs)`
  } else if (qty < num(rb.qty_mid_min, 3) && areaPerPcs < 2000) {
    tierKey = 'ecer'
    tierLabel = 'Eceran / Kecil'
  }

  // Hitung Modal per cm² dari bahan yang dipilih di stok
  const boardBuySqcm = num(board.buy_sqcm, 20.15)
  const stickerBuySqcm = num(sticker.buy_sqcm, 6.67) * colorCount
  const unitBuySqcm = Math.round((boardBuySqcm + stickerBuySqcm) * 100) / 100

  // Baseline referensi: ACP 3mm (Rp 20.15/cm²) + Asahi 2 warna (Rp 13.34/cm²) = Rp 33.5/cm² -> Jual Normal Rp 120/cm²
  const baseRateRef = tierKey === 'bulk'
    ? num(rb.rate_bulk_base, 100)
    : tierKey === 'ecer'
    ? num(rb.rate_ecer_base, 150)
    : num(rb.rate_mid_base, 120)

  const extraColorRate = tierKey === 'bulk'
    ? num(rb.extra_color_bulk, 20)
    : tierKey === 'ecer'
    ? num(rb.extra_color_ecer, 30)
    : num(rb.extra_color_mid, 25)

  // Penyesuaian otomatis tarif per cm² berdasarkan selisih harga modal Board & Stiker yang dipilih + jumlah warna
  const baseline2ColorBuy = 20.15 + 6.67
  const selected1ColorBuy = boardBuySqcm + num(sticker.buy_sqcm, 6.67)
  const matDelta = (selected1ColorBuy - baseline2ColorBuy) * 2.5
  const colorDelta = isCutting ? (colorCount - 2) * extraColorRate : -extraColorRate

  const defaultRate = Math.max(40, Math.round(baseRateRef + matDelta + colorDelta))
  const activeRate = input.overrideRate !== undefined && input.overrideRate !== '' ? num(input.overrideRate) : defaultRate

  const sideMult = sides === 2 ? 1.75 : 1.0
  const rawBoardSell = effectiveArea * activeRate * sideMult * qty
  const boardSellPrice = Math.max(num(rb.min_order_price, 100000), rawBoardSell)

  const rangkaMeter = num(input.rangkaMeter, 0)
  const tiangMeter = num(input.tiangMeter, 0)
  const penIklanQty = Math.max(0, parseInt(input.penIklanQty, 10) || 0)
  const extraCost = num(input.extraCost, 0)

  const rangkaSell = Math.round(rangkaMeter * num(rb.rangka_hollow_sell_m, 60000))
  const tiangSell = Math.round(tiangMeter * num(rb.tiang_pipa_sell_m, 150000))
  const penSell = Math.round(penIklanQty * num(rb.pen_iklan_sell_pcs, 15000))

  const recommendedSellPrice = roundPrice(boardSellPrice + rangkaSell + tiangSell + penSell + extraCost, cfg.rounding_step)
  const negoPct = num(cfg.nego_discount_pct, 15)
  const netFloorPrice = roundPrice(recommendedSellPrice * (1 - negoPct / 100), cfg.rounding_step)

  // HPP Total
  const boardBuyCost = Math.round(areaPerPcs * unitBuySqcm * (sides === 2 ? 1.6 : 1) * qty)
  const rangkaBuy = Math.round(rangkaMeter * num(rb.rangka_hollow_buy_m, 35000))
  const tiangBuy = Math.round(tiangMeter * num(rb.tiang_pipa_buy_m, 95000))
  const penBuy = Math.round(penIklanQty * num(rb.pen_iklan_buy_pcs, 6000))
  const totalHpp = boardBuyCost + rangkaBuy + tiangBuy + penBuy + extraCost

  const colorLabel = isCutting ? `${colorCount} Warna` : 'Full Color (Cetak)'
  const specName = `${board.name} + ${sticker.name} (${colorLabel})`

  const materials = [
    { name: `Board: ${board.name} (${length}x${width}cm)`, quantity: qty, unit: 'pcs', price: Math.round(areaPerPcs * boardBuySqcm), is_custom: true },
    { name: `Stiker: ${sticker.name} (${colorLabel}, ${sides} Sisi)`, quantity: qty, unit: 'pcs', price: Math.round(areaPerPcs * stickerBuySqcm * (sides === 2 ? 1.6 : 1)), is_custom: true },
  ]
  if (rangkaMeter > 0) materials.push({ name: `Rangka Hollow (${rangkaMeter} m)`, quantity: rangkaMeter, unit: 'Meter', price: num(rb.rangka_hollow_buy_m, 35000), is_custom: true })
  if (tiangMeter > 0) materials.push({ name: `Tiang Pipa (${tiangMeter} m)`, quantity: tiangMeter, unit: 'Meter', price: num(rb.tiang_pipa_buy_m, 95000), is_custom: true })
  if (penIklanQty > 0) materials.push({ name: 'Baut Pen Iklan / Standoff', quantity: penIklanQty, unit: 'pcs', price: num(rb.pen_iklan_buy_pcs, 6000), is_custom: true })
  if (extraCost > 0) materials.push({ name: input.extraNote || 'Biaya Tambahan / Pasang', quantity: 1, unit: 'paket', price: extraCost, is_custom: true })

  return {
    productType: 'RAMBU',
    projectTitle: `Rambu ${board.name} + ${sticker.name} (${colorLabel}) ${length}x${width}cm × ${qty}`,
    length, width, qty, sides,
    board, sticker, isCutting, colorCount, colorLabel, specName,
    boardBuySqcm, stickerBuySqcm, unitBuySqcm,
    areaPerPcs, totalAreaSqcm: areaPerPcs * qty,
    tierLabel, rateSqcm: activeRate, defaultRateSqcm: defaultRate,
    boardSellPrice, rangkaMeter, rangkaSell, tiangMeter, tiangSell, penIklanQty, penSell, extraCost,
    recommendedSellPrice, netFloorPrice, negoPct,
    boardBuyCost, totalHpp,
    profitAtRecommended: recommendedSellPrice - totalHpp,
    marginPctAtRecommended: recommendedSellPrice > 0 ? Math.round(((recommendedSellPrice - totalHpp) / recommendedSellPrice) * 1000) / 10 : 0,
    materials,
  }
}

// ─── 4. KALKULASI NEONFLEX (eCut Curve Length + Akrilik Stok) ──
export function calcNeonflex(input, rawConfig, stocks = [], acrylics = []) {
  const cfg = mergeAdvConfig(rawConfig)
  const nf = cfg.neonflex
  const catalog = buildMaterialCatalog(stocks, acrylics)

  const meterLength = num(input.meterLength)
  const acrylicLength = num(input.acrylicLength)
  const acrylicWidth = num(input.acrylicWidth)
  if (meterLength <= 0 && (acrylicLength <= 0 || acrylicWidth <= 0)) return null

  const lampItem = catalog.lampOptions.find(l => l.id === input.lampStockId)
    || catalog.lampOptions.find(l => l.name.toUpperCase().includes('NEONFLEX'))
    || catalog.lampOptions[0]
    || { name: 'LED Neonflex 12V', price: 65000, watt: 9 }

  const backingItem = catalog.boardOptions.find(b => b.id === input.backingBoardId)
    || catalog.boardOptions.find(b => b.source === 'ACRYLIC' && b.name.includes('3mm'))
    || catalog.boardOptions[0]
    || { name: 'Akrilik Bening 3mm', buy_sqcm: 16.8, sell_sqcm: 35 }

  let tierLabel = 'Panjang Eceran'
  let defaultRateMeter = num(nf.rate_meter_ecer, 220000)
  if (meterLength >= num(nf.bulk_meter_min, 8)) {
    tierLabel = `Panjang Partai (≥ ${nf.bulk_meter_min} m)`
    defaultRateMeter = num(nf.rate_meter_bulk, 175000)
  } else if (meterLength >= num(nf.mid_meter_min, 3)) {
    tierLabel = `Panjang Menengah (${nf.mid_meter_min}–${nf.bulk_meter_min} m)`
    defaultRateMeter = num(nf.rate_meter_mid, 195000)
  }

  const activeRateMeter = input.overrideRate !== undefined && input.overrideRate !== '' ? num(input.overrideRate) : defaultRateMeter
  const ledSellPrice = Math.round(meterLength * activeRateMeter)

  const acrylicArea = Math.max(0, Math.round(acrylicLength * acrylicWidth))
  const isContour = input.cutShape === 'contour'
  const cutMult = isContour ? (1 + num(nf.contour_cut_pct, 15) / 100) : 1.0
  const backingSellRate = num(backingItem.sell_sqcm) > 0 ? num(backingItem.sell_sqcm) : num(nf.acrylic_sell_sqcm, 38)
  const acrylicSellPrice = Math.round(acrylicArea * backingSellRate * cutMult)

  const penIklanQty = Math.max(0, parseInt(input.penIklanQty, 10) || 0)
  const penSellPrice = Math.round(penIklanQty * num(nf.pen_iklan_sell_pcs, 15000))
  const extraCost = num(input.extraCost, 0)

  const baseSell = Math.max(num(nf.min_order_price, 250000), ledSellPrice + acrylicSellPrice)
  const recommendedSellPrice = roundPrice(baseSell + penSellPrice + extraCost, cfg.rounding_step)
  const negoPct = num(cfg.nego_discount_pct, 15)
  const netFloorPrice = roundPrice(recommendedSellPrice * (1 - negoPct / 100), cfg.rounding_step)

  // HPP dari stok yang dipilih
  const buyPerMeter = num(lampItem.price, num(nf.buy_meter_default, 65000))
  const ledBuyCost = Math.round(meterLength * buyPerMeter)
  const acrylicBuyCost = Math.round(acrylicArea * num(backingItem.buy_sqcm, 17))
  const totalWatt = Math.round(meterLength * num(lampItem.watt, 9))
  const autoTrafo = catalog.trafoOptions.find(t => t.watt_capacity >= totalWatt * 1.25) || catalog.trafoOptions[0]
  const adaptorBuyCost = meterLength > 0 ? (autoTrafo ? num(autoTrafo.price, 60000) : num(nf.adaptor_buy_default, 65000)) : 0
  const penBuyCost = Math.round(penIklanQty * num(nf.pen_iklan_buy_pcs, 6000))
  const totalHpp = ledBuyCost + acrylicBuyCost + adaptorBuyCost + penBuyCost + extraCost

  const materials = [
    { name: `${lampItem.name} (${meterLength} m)`, quantity: meterLength, unit: 'Meter', price: buyPerMeter, stock_id: lampItem.stockId || null, is_custom: !lampItem.stockId },
  ]
  if (acrylicArea > 0) {
    materials.push({ name: `${backingItem.name} ${acrylicLength}x${acrylicWidth}cm (${isContour ? 'Potong Pola' : 'Kotak'})`, quantity: 1, unit: 'lembar', price: acrylicBuyCost, is_custom: true })
  }
  if (adaptorBuyCost > 0) {
    materials.push({ name: autoTrafo ? autoTrafo.name : 'Adaptor / Trafo 12V Neonflex', quantity: 1, unit: 'pcs', price: adaptorBuyCost, is_custom: true })
  }
  if (penIklanQty > 0) {
    materials.push({ name: 'Baut Pen Iklan Akrilik', quantity: penIklanQty, unit: 'pcs', price: num(nf.pen_iklan_buy_pcs, 6000), is_custom: true })
  }
  if (extraCost > 0) {
    materials.push({ name: input.extraNote || 'Biaya Tambahan / Rakit', quantity: 1, unit: 'paket', price: extraCost, is_custom: true })
  }

  return {
    productType: 'NEONFLEX',
    projectTitle: `Neonflex ${meterLength}m (${lampItem.name}) + ${backingItem.name} ${acrylicLength}x${acrylicWidth}cm`,
    meterLength, acrylicLength, acrylicWidth, acrylicArea, isContour,
    lampItem, backingItem, autoTrafo, totalWatt,
    tierLabel, ratePerMeter: activeRateMeter, defaultRatePerMeter: defaultRateMeter,
    ledSellPrice, acrylicSellPrice, penIklanQty, penSellPrice, extraCost,
    recommendedSellPrice, netFloorPrice, negoPct,
    ledBuyCost, acrylicBuyCost, adaptorBuyCost, totalHpp,
    profitAtRecommended: recommendedSellPrice - totalHpp,
    marginPctAtRecommended: recommendedSellPrice > 0 ? Math.round(((recommendedSellPrice - totalHpp) / recommendedSellPrice) * 1000) / 10 : 0,
    materials,
  }
}
