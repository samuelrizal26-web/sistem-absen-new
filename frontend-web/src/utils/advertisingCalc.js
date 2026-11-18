// Engine Kalkulasi Terpadu: Kalkulator Advertising Labalaba
// Mendukung 5 Modul Produk, Tiering Skala (Kecil/Sedang/Besar & Ecer/Menengah/Partai),
// Space Nego 15%, HPP BOM Real, serta Simulator Dua Arah (Bidirectional) untuk Owner.

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
    pen_iklan_sell_pcs: 15000,
    pen_iklan_buy_pcs: 6000,
    rangka_hollow_sell_m: 60000,
    rangka_hollow_buy_m: 35000,
    tiang_pipa_sell_m: 150000,
    tiang_pipa_buy_m: 95000,
    packages: [
      { id: 'acp_reflective', name: 'ACP + Stiker Reflective Asahi (2 Warna)', board: 'ACP', rate_ecer: 150, rate_mid: 120, rate_bulk: 100, buy_sqcm: 34 },
      { id: 'acp_oracal', name: 'ACP + Cutting Sticker Oracal 651', board: 'ACP', rate_ecer: 135, rate_mid: 110, rate_bulk: 90, buy_sqcm: 30 },
      { id: 'acp_print', name: 'ACP + Print Vinyl Outdoor + Laminasi', board: 'ACP', rate_ecer: 120, rate_mid: 100, rate_bulk: 85, buy_sqcm: 26 },
      { id: 'akrilik_reflective', name: 'Akrilik 3mm + Stiker Reflective Asahi', board: 'AKRILIK', rate_ecer: 140, rate_mid: 115, rate_bulk: 95, buy_sqcm: 30 },
      { id: 'akrilik_oracal', name: 'Akrilik 3mm + Cutting Sticker Oracal 651', board: 'AKRILIK', rate_ecer: 130, rate_mid: 105, rate_bulk: 88, buy_sqcm: 27 },
      { id: 'akrilik_print', name: 'Akrilik 3mm + Print UV / Vinyl Laminasi', board: 'AKRILIK', rate_ecer: 120, rate_mid: 95, rate_bulk: 80, buy_sqcm: 24 },
    ],
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

// ─── 1. KALKULASI NEONBOX ──────────────────────────────────────
export function calcNeonbox(input, rawConfig, stocks = [], acrylics = []) {
  const cfg = mergeAdvConfig(rawConfig)
  const nb = cfg.neonbox
  const length = num(input.length)
  const width = num(input.width)
  if (length <= 0 || width <= 0) return null

  const sides = num(input.sides, 2) === 1 ? 1 : 2
  const frameThick = num(input.frameThick, 13)
  const areaSqcm = Math.round(length * width)
  const perimeterCm = Math.round(2 * (length + width))

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

  // Override rate jika sedang dituning di simulator Admin
  const activeRate = input.overrideRate !== undefined && input.overrideRate !== '' ? num(input.overrideRate) : rateSqcm
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

  // ── Estimasi HPP BOM (Untuk Owner & Snapshot Project) ──
  const acrCostSqcm = acrylics.length > 0 ? num(acrylics[0].cost_per_sqcm, 16.8) : 16.8
  const faceAreaTotal = areaSqcm * sides
  const sideBandArea = perimeterCm * frameThick
  const acrylicCost = Math.round((faceAreaTotal + sideBandArea) * acrCostSqcm)

  // Lampu LED
  const lampStock = stocks.find(s => s.id === input.lampStockId)
  const lampUnitCost = lampStock ? num(lampStock.price, 3000) : 3000
  const lampUnitWatt = lampStock ? num(lampStock.watt, 1.5) : 1.5
  const autoLampQty = Math.max(4, Math.ceil(perimeterCm / 10))
  const lampQty = num(input.lampQty) > 0 ? num(input.lampQty) : autoLampQty
  const lampCost = Math.round(lampQty * lampUnitCost)
  const totalWatt = Math.round(lampQty * lampUnitWatt * 10) / 10

  // Trafo otomatis berdasarkan beban Watt (safety factor 1.25x)
  const trafoStocks = stocks
    .filter(s => s.usage_category === 'ADVERTISING' && s.adv_sub_category === 'TRAFO' && num(s.watt_capacity) > 0)
    .sort((a, b) => num(a.watt_capacity) - num(b.watt_capacity))
  const autoTrafo = trafoStocks.find(t => num(t.watt_capacity) >= totalWatt * 1.25) || trafoStocks[trafoStocks.length - 1]
  const trafoCost = autoTrafo ? num(autoTrafo.price, 60000) : (totalWatt <= 48 ? 60000 : totalWatt <= 85 ? 120000 : 165000)
  const trafoName = autoTrafo ? autoTrafo.name : (totalWatt <= 48 ? 'Trafo 60W 12V' : totalWatt <= 85 ? 'Trafo 100W 12V' : 'Trafo 200W 12V')

  // Visual Stiker / Backlite
  const stickerCost = Math.round(faceAreaTotal * 6.5)
  const miscCost = 25000 // Kabel, lem kloroform, baut
  const bodyHpp = acrylicCost + lampCost + trafoCost + stickerCost + miscCost
  const totalHpp = bodyHpp + poleBuyPrice + extraCost

  const materials = [
    { name: `Akrilik Muka (${sides} Sisi) + Frame ${frameThick}cm`, quantity: 1, unit: 'set', price: acrylicCost, is_custom: true },
    { name: lampStock ? lampStock.name : 'Lampu LED Sidelight / Modul', quantity: lampQty, unit: 'pcs', price: lampUnitCost, stock_id: lampStock?.id || null, is_custom: !lampStock },
    { name: `${trafoName} (Beban ~${totalWatt}W)`, quantity: 1, unit: 'pcs', price: trafoCost, stock_id: autoTrafo?.id || null, is_custom: !autoTrafo },
    { name: `Visual Stiker / Print (${sides} Sisi)`, quantity: 1, unit: 'set', price: stickerCost, is_custom: true },
  ]
  if (poleBuyPrice > 0 || poleSellPrice > 0) {
    materials.push({ name: poleItem?.name || 'Tiang & Rangka Las', quantity: 1, unit: 'paket', price: poleBuyPrice, is_custom: true })
  }
  if (extraCost > 0) {
    materials.push({ name: input.extraNote || 'Biaya Tambahan / Pasang', quantity: 1, unit: 'paket', price: extraCost, is_custom: true })
  }

  return {
    productType: 'NEONBOX',
    projectTitle: `Neonbox ${length}x${width} cm (${sides} Sisi)`,
    length, width, sides, frameThick,
    areaSqcm, perimeterCm,
    tierLabel, rateSqcm: activeRate, defaultRateSqcm: rateSqcm,
    minOrderApplied,
    bodySellPrice, poleItem, poleSellPrice, poleBuyPrice, extraCost,
    recommendedSellPrice, netFloorPrice, negoPct,
    // HPP Detail
    acrylicCost, lampQty, lampUnitCost, lampCost, totalWatt, trafoName, trafoCost, stickerCost, miscCost,
    bodyHpp, totalHpp,
    profitAtRecommended: recommendedSellPrice - totalHpp,
    marginPctAtRecommended: recommendedSellPrice > 0 ? Math.round(((recommendedSellPrice - totalHpp) / recommendedSellPrice) * 1000) / 10 : 0,
    profitAtNet: netFloorPrice - totalHpp,
    materials,
  }
}

// ─── 2. KALKULASI HURUF TIMBUL ─────────────────────────────────
export function calcHurufTimbul(input, rawConfig, stocks = []) {
  const cfg = mergeAdvConfig(rawConfig)
  const ht = cfg.huruf_timbul
  const rawText = String(input.text || '')
  const letterCount = rawText.replace(/\s+/g, '').length
  const heightCm = num(input.heightCm)
  const logoCount = Math.max(0, parseInt(input.logoCount, 10) || 0)
  const logoHeightCm = num(input.logoHeightCm, heightCm)

  if ((letterCount <= 0 && logoCount <= 0) || heightCm <= 0) return null

  const variants = Array.isArray(ht.variants) ? ht.variants : DEFAULT_ADVERTISING_CONFIG.huruf_timbul.variants
  const variant = variants.find(v => v.id === input.variantId) || variants[0]

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

  // ── HPP Modal Real (Compare eCut CorelDRAW) ──
  const estTotalWidth = num(input.totalWidthCm) > 0
    ? num(input.totalWidthCm)
    : Math.round((letterCount * effectiveHeight * 0.75) + (logoCount * effLogoHeight))
  const boundingBoxArea = estTotalWidth * effectiveHeight
  const plateCost = Math.round(boundingBoxArea * num(variant.buy_sqcm, 24))

  const lampStock = stocks.find(s => s.id === input.lampStockId)
  const lampUnitCost = lampStock ? num(lampStock.price, 3000) : 3000
  const lampUnitWatt = lampStock ? num(lampStock.watt, 1.2) : 1.2
  const estLampQty = variant.has_led ? (num(input.lampQtyManual) > 0 ? num(input.lampQtyManual) : Math.max(1, (letterCount + logoCount * 2) * Math.ceil(effectiveHeight / 5))) : 0
  const lampCost = variant.has_led ? Math.round(estLampQty * lampUnitCost) : 0
  const totalWatt = Math.round(estLampQty * lampUnitWatt * 10) / 10
  const trafoCost = variant.has_led ? (totalWatt <= 50 ? 60000 : totalWatt <= 90 ? 120000 : 165000) : 0

  const backdropBuyCost = Math.round(backdropArea * num(ht.backdrop_acp_buy_sqcm, 22))
  const rangkaBuyCost = Math.round(rangkaMeter * num(ht.rangka_dudukan_buy_m, 45000))
  const totalHpp = plateCost + lampCost + trafoCost + backdropBuyCost + rangkaBuyCost + extraCost

  const totalEffectiveCm = (letterCount * effectiveHeight) + (logoCount * effLogoHeight * logoMult)
  const materials = [
    { name: `Bahan ${variant.name} (${letterCount} huruf, T:${heightCm}cm)`, quantity: 1, unit: 'set', price: plateCost, is_custom: true },
  ]
  if (variant.has_led) {
    materials.push({ name: `Lampu LED Huruf (${estLampQty} pcs) + Trafo`, quantity: 1, unit: 'set', price: lampCost + trafoCost, is_custom: true })
  }
  if (backdropArea > 0) {
    materials.push({ name: `Backdrop ACP ${backdropL}x${backdropW} cm`, quantity: 1, unit: 'set', price: backdropBuyCost, is_custom: true })
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
    variant, tierLabel, ratePerCm: activeRate, defaultRatePerCm: defaultRate,
    totalEffectiveCm,
    lettersSellPrice, logosSellPrice,
    hasBackdrop, backdropL, backdropW, backdropArea, backdropSellPrice, backdropBuyCost,
    rangkaMeter, rangkaSellPrice, rangkaBuyCost, extraCost,
    recommendedSellPrice, netFloorPrice, negoPct,
    // HPP Detail
    estTotalWidth, boundingBoxArea, plateCost, estLampQty, lampCost, totalWatt, trafoCost, totalHpp,
    profitAtRecommended: recommendedSellPrice - totalHpp,
    marginPctAtRecommended: recommendedSellPrice > 0 ? Math.round(((recommendedSellPrice - totalHpp) / recommendedSellPrice) * 1000) / 10 : 0,
    materials,
  }
}

// ─── 3. KALKULASI RAMBU & PAPAN NAMA ───────────────────────────
export function calcRambu(input, rawConfig) {
  const cfg = mergeAdvConfig(rawConfig)
  const rb = cfg.rambu
  const length = num(input.length)
  const width = num(input.width)
  const qty = Math.max(1, parseInt(input.qty, 10) || 1)
  if (length <= 0 || width <= 0) return null

  const sides = num(input.sides, 1) === 2 ? 2 : 1
  const packages = Array.isArray(rb.packages) ? rb.packages : DEFAULT_ADVERTISING_CONFIG.rambu.packages
  const pkg = packages.find(p => p.id === input.packageId) || packages[0]

  const areaPerPcs = Math.round(length * width)
  const effectiveArea = Math.max(areaPerPcs, num(rb.min_area_sqcm, 600))

  let tierLabel = 'Normal / Menengah'
  let defaultRate = num(pkg.rate_mid, 120)
  if (qty >= num(rb.qty_bulk_min, 5) || areaPerPcs >= 8000) {
    tierLabel = `Partai / Besar (≥ ${rb.qty_bulk_min} pcs)`
    defaultRate = num(pkg.rate_bulk, 100)
  } else if (qty < num(rb.qty_mid_min, 3) && areaPerPcs < 2000) {
    tierLabel = 'Eceran / Kecil'
    defaultRate = num(pkg.rate_ecer, 150)
  }

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

  // HPP
  const boardBuyCost = Math.round(areaPerPcs * num(pkg.buy_sqcm, 34) * (sides === 2 ? 1.6 : 1) * qty)
  const rangkaBuy = Math.round(rangkaMeter * num(rb.rangka_hollow_buy_m, 35000))
  const tiangBuy = Math.round(tiangMeter * num(rb.tiang_pipa_buy_m, 95000))
  const penBuy = Math.round(penIklanQty * num(rb.pen_iklan_buy_pcs, 6000))
  const totalHpp = boardBuyCost + rangkaBuy + tiangBuy + penBuy + extraCost

  const materials = [
    { name: `${pkg.name} (${length}x${width}cm, ${sides} Sisi)`, quantity: qty, unit: 'pcs', price: Math.round(boardBuyCost / qty), is_custom: true },
  ]
  if (rangkaMeter > 0) materials.push({ name: `Rangka Hollow (${rangkaMeter} m)`, quantity: rangkaMeter, unit: 'Meter', price: num(rb.rangka_hollow_buy_m, 35000), is_custom: true })
  if (tiangMeter > 0) materials.push({ name: `Tiang Pipa (${tiangMeter} m)`, quantity: tiangMeter, unit: 'Meter', price: num(rb.tiang_pipa_buy_m, 95000), is_custom: true })
  if (penIklanQty > 0) materials.push({ name: 'Baut Pen Iklan / Standoff', quantity: penIklanQty, unit: 'pcs', price: num(rb.pen_iklan_buy_pcs, 6000), is_custom: true })
  if (extraCost > 0) materials.push({ name: input.extraNote || 'Biaya Tambahan / Pasang', quantity: 1, unit: 'paket', price: extraCost, is_custom: true })

  return {
    productType: 'RAMBU',
    projectTitle: `Rambu/Plang ${pkg.name} ${length}x${width}cm (${qty} pcs)`,
    length, width, qty, sides, pkg,
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

// ─── 4. KALKULASI NEONFLEX (eCut Curve Length + Akrilik) ───────
export function calcNeonflex(input, rawConfig, stocks = []) {
  const cfg = mergeAdvConfig(rawConfig)
  const nf = cfg.neonflex
  const meterLength = num(input.meterLength)
  const acrylicLength = num(input.acrylicLength)
  const acrylicWidth = num(input.acrylicWidth)
  if (meterLength <= 0 && (acrylicLength <= 0 || acrylicWidth <= 0)) return null

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
  const acrylicSellPrice = Math.round(acrylicArea * num(nf.acrylic_sell_sqcm, 38) * cutMult)

  const penIklanQty = Math.max(0, parseInt(input.penIklanQty, 10) || 0)
  const penSellPrice = Math.round(penIklanQty * num(nf.pen_iklan_sell_pcs, 15000))
  const extraCost = num(input.extraCost, 0)

  const baseSell = Math.max(num(nf.min_order_price, 250000), ledSellPrice + acrylicSellPrice)
  const recommendedSellPrice = roundPrice(baseSell + penSellPrice + extraCost, cfg.rounding_step)
  const negoPct = num(cfg.nego_discount_pct, 15)
  const netFloorPrice = roundPrice(recommendedSellPrice * (1 - negoPct / 100), cfg.rounding_step)

  // HPP
  const lampStock = stocks.find(s => s.id === input.lampStockId)
  const buyPerMeter = lampStock ? num(lampStock.price, num(nf.buy_meter_default, 65000)) : num(nf.buy_meter_default, 65000)
  const ledBuyCost = Math.round(meterLength * buyPerMeter)
  const acrylicBuyCost = Math.round(acrylicArea * num(nf.acrylic_buy_sqcm, 17))
  const adaptorBuyCost = meterLength > 0 ? num(nf.adaptor_buy_default, 65000) : 0
  const penBuyCost = Math.round(penIklanQty * num(nf.pen_iklan_buy_pcs, 6000))
  const totalHpp = ledBuyCost + acrylicBuyCost + adaptorBuyCost + penBuyCost + extraCost

  const materials = [
    { name: `LED Neonflex ${input.colorName || ''} (${meterLength} m)`, quantity: meterLength, unit: 'Meter', price: buyPerMeter, stock_id: lampStock?.id || null, is_custom: !lampStock },
  ]
  if (acrylicArea > 0) {
    materials.push({ name: `Akrilik Backing ${acrylicLength}x${acrylicWidth}cm (${isContour ? 'Potong Pola' : 'Kotak'})`, quantity: 1, unit: 'lembar', price: acrylicBuyCost, is_custom: true })
  }
  if (adaptorBuyCost > 0) {
    materials.push({ name: 'Adaptor / Trafo 12V Neonflex', quantity: 1, unit: 'pcs', price: adaptorBuyCost, is_custom: true })
  }
  if (penIklanQty > 0) {
    materials.push({ name: 'Baut Pen Iklan Akrilik', quantity: penIklanQty, unit: 'pcs', price: num(nf.pen_iklan_buy_pcs, 6000), is_custom: true })
  }
  if (extraCost > 0) {
    materials.push({ name: input.extraNote || 'Biaya Tambahan / Rakit', quantity: 1, unit: 'paket', price: extraCost, is_custom: true })
  }

  return {
    productType: 'NEONFLEX',
    projectTitle: `Neonflex ${meterLength}m + Akrilik ${acrylicLength}x${acrylicWidth}cm`,
    meterLength, acrylicLength, acrylicWidth, acrylicArea, isContour,
    colorName: input.colorName || 'Standar',
    tierLabel, ratePerMeter: activeRateMeter, defaultRatePerMeter: defaultRateMeter,
    ledSellPrice, acrylicSellPrice, penIklanQty, penSellPrice, extraCost,
    recommendedSellPrice, netFloorPrice, negoPct,
    ledBuyCost, acrylicBuyCost, adaptorBuyCost, totalHpp,
    profitAtRecommended: recommendedSellPrice - totalHpp,
    marginPctAtRecommended: recommendedSellPrice > 0 ? Math.round(((recommendedSellPrice - totalHpp) / recommendedSellPrice) * 1000) / 10 : 0,
    materials,
  }
}
