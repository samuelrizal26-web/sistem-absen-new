import { useState, useEffect, useMemo } from 'react'
import { getAdvertisingConfig, updateAdvertisingConfig } from '../services/api'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../utils/format'
import {
  DEFAULT_ADVERTISING_CONFIG,
  mergeAdvConfig,
  buildMaterialCatalog,
  calcAcrylic,
  calcNeonbox,
  calcHurufTimbul,
  calcRambu,
  calcNeonflex,
} from '../utils/advertisingCalc'

const SUB_TABS = [
  { key: 'akrilik', label: 'Akrilik', icon: '🟦' },
  { key: 'neonbox', label: 'Neonbox & Las', icon: '💡' },
  { key: 'huruf', label: 'Huruf Timbul', icon: '🔤' },
  { key: 'rambu', label: 'Rambu / Plang', icon: '🪧' },
  { key: 'neonflex', label: 'Neonflex', icon: '✨' },
]

export default function AdminAdvertisingPanel({ stocks = [], acrylics = [], showToast, onGoToStock }) {
  const [subTab, setSubTab] = useState('akrilik')
  const [config, setConfig] = useState(DEFAULT_ADVERTISING_CONFIG)
  const [saving, setSaving] = useState(false)

  // ── Simulator State: Akrilik (Dua Arah) ──
  const [acSim, setAcSim] = useState({
    acrylicId: '', length: '60', width: '40', qty: '1', customRate: '', customTotalRaw: '',
  })

  // ── Simulator State: Neonbox (Dua Arah) ──
  const [nbSim, setNbSim] = useState({
    length: '60', width: '150', sides: 2, frameThick: '13',
    poleId: 'tiang_25in', lampStockId: '', lampQty: '42',
    extraCost: '0', customRate: '', customTotalRaw: '',
  })

  // ── Simulator State: Huruf Timbul (Dua Arah + eCut) ──
  const [htSim, setHtSim] = useState({
    text: 'LABALABA', heightCm: '20', variantId: 'stenlis_led',
    logoCount: '0', logoHeightCm: '20', totalWidthCm: '',
    lampStockId: '', lampQtyManual: '35',
    hasBackdrop: false, backdropLength: '', backdropWidth: '',
    rangkaMeter: '0', extraCost: '0', customRate: '', customTotalRaw: '',
  })

  // ── Simulator State: Rambu (Dua Arah) ──
  const [rbSim, setRbSim] = useState({
    boardId: 'ACP', stickerId: 'reflective_asahi', colorCount: '2',
    length: '60', width: '40', qty: '1', sides: 1,
    rangkaMeter: '0', tiangMeter: '0', penIklanQty: '0',
    extraCost: '0', customRate: '', customTotalRaw: '',
  })

  // ── Simulator State: Neonflex (Dua Arah) ──
  const [nfSim, setNfSim] = useState({
    meterLength: '4.5', acrylicLength: '80', acrylicWidth: '40',
    cutShape: 'kotak', lampStockId: '', penIklanQty: '4',
    extraCost: '0', customRate: '', customTotalRaw: '',
  })

  useEffect(() => {
    getAdvertisingConfig()
      .then(res => { if (res) setConfig(mergeAdvConfig(res)) })
      .catch(() => {})
  }, [])

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const saved = await updateAdvertisingConfig(config)
      setConfig(mergeAdvConfig(saved))
      showToast?.('Pengaturan tarif & titik mati berhasil disimpan!', 'success')
    } catch (e) {
      showToast?.(e.message || 'Gagal menyimpan konfigurasi', 'error')
    } finally {
      setSaving(false)
    }
  }

  const catalog = useMemo(() => buildMaterialCatalog(stocks, acrylics), [stocks, acrylics])
  const lampStocks = catalog.lampOptions

  // ── Hasil Simulasi Live ──
  const acRes = useMemo(() => calcAcrylic({
    ...acSim,
    overrideRate: acSim.customRate,
    overrideTotal: acSim.customTotalRaw !== '' ? parseRupiahInput(acSim.customTotalRaw) : '',
  }, config, stocks, acrylics), [acSim, config, stocks, acrylics])

  const nbRes = useMemo(() => calcNeonbox({
    ...nbSim,
    overrideRate: nbSim.customRate,
    overrideTotal: nbSim.customTotalRaw !== '' ? parseRupiahInput(nbSim.customTotalRaw) : '',
  }, config, stocks, acrylics), [nbSim, config, stocks, acrylics])

  const htRes = useMemo(() => calcHurufTimbul({
    ...htSim,
    overrideRate: htSim.customRate,
    overrideTotal: htSim.customTotalRaw !== '' ? parseRupiahInput(htSim.customTotalRaw) : '',
  }, config, stocks, acrylics), [htSim, config, stocks, acrylics])

  const rbRes = useMemo(() => calcRambu({
    ...rbSim,
    overrideRate: rbSim.customRate,
    overrideTotal: rbSim.customTotalRaw !== '' ? parseRupiahInput(rbSim.customTotalRaw) : '',
  }, config, stocks, acrylics), [rbSim, config, stocks, acrylics])

  const nfRes = useMemo(() => calcNeonflex({
    ...nfSim,
    overrideRate: nfSim.customRate,
    overrideTotal: nfSim.customTotalRaw !== '' ? parseRupiahInput(nfSim.customTotalRaw) : '',
  }, config, stocks, acrylics), [nfSim, config, stocks, acrylics])

  const inp = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white'

  // Komponen Kartu Analisis Profit & Dua Arah (Khusus Owner)
  const renderBidirectionalCompare = ({
    rateLabel,
    activeRate,
    defaultRate,
    customRate,
    onRateChange,
    totalSell,
    customTotalRaw,
    onTotalRawChange,
    totalHpp,
    negoPct,
    hppRows = [],
    onResetOverride,
  }) => {
    const profit = totalSell - totalHpp
    const marginPct = totalSell > 0 ? Math.round((profit / totalSell) * 1000) / 10 : 0
    const netPrice = Math.ceil((totalSell * (1 - (negoPct || 15) / 100)) / 1000) * 1000
    const profitAtNet = netPrice - totalHpp
    const marginAtNet = netPrice > 0 ? Math.round((profitAtNet / netPrice) * 1000) / 10 : 0

    const badgeColor = marginPct >= 40
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : marginPct >= 20
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-red-100 text-red-700 border-red-300'

    const rateDisplayValue = customRate !== '' && customRate !== undefined
      ? customRate
      : String(Math.round(activeRate || 0))

    const totalDisplayValue = customTotalRaw !== '' && customTotalRaw !== undefined
      ? customTotalRaw
      : formatRupiahInput(String(Math.round(totalSell || 0)))

    return (
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-white border-2 border-purple-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wide">
            🎛️ Kalkulasi 2 Arah (Isi Salah Satu, Otomatis Sinkron)
          </p>
          <button
            type="button"
            onClick={onResetOverride}
            className="text-[11px] text-purple-600 hover:underline font-semibold"
          >
            Reset ke Tarif Default ({formatRupiah(defaultRate)})
          </button>
        </div>

        {/* Input 2 Arah: Tarif Satuan <-> Total Harga Jual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-purple-200 shadow-sm">
            <label className="text-[11px] font-bold text-purple-700 block mb-1">
              1️⃣ {rateLabel}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={rateDisplayValue}
                onChange={e => onRateChange(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-purple-300 text-base font-black text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              Ketik tarif per-cm/m untuk lihat Total Jual
            </span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-emerald-200 shadow-sm">
            <label className="text-[11px] font-bold text-emerald-700 block mb-1">
              2️⃣ Total Harga Jual (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={totalDisplayValue}
                onChange={e => onTotalRawChange(formatRupiahInput(e.target.value))}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-emerald-300 text-base font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              Ketik Total Jual untuk cari tahu tarif per-cm nya
            </span>
          </div>
        </div>

        {/* Rincian Bedah HPP Real (BOM) */}
        <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-1.5 text-xs">
          <p className="font-bold text-gray-700 border-b border-gray-100 pb-1">
            🔍 Bedah Modal Bahan Real (HPP BOM):
          </p>
          {hppRows.map(([k, v], i) => (
            <div key={i} className="flex justify-between text-gray-600">
              <span>• {k}</span>
              <span className="font-semibold text-gray-800">{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1.5 border-t border-gray-200 font-bold text-gray-900 text-sm">
            <span>TOTAL MODAL REAL (HPP)</span>
            <span className="text-rose-700">{formatRupiah(totalHpp)}</span>
          </div>
        </div>

        {/* Ringkasan Laba & Margin */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <span className="text-[10px] text-gray-500 block">Laba Bersih (Harga Normal)</span>
            <p className={`text-base font-black ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatRupiah(profit)}
            </p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
              Margin: {marginPct}%
            </span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <span className="text-[10px] text-gray-500 block">Jika Nego Mentok (-{negoPct}% = {formatRupiah(netPrice)})</span>
            <p className={`text-base font-black ${profitAtNet >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
              Laba: {formatRupiah(profitAtNet)}
            </p>
            <span className="inline-block mt-1 text-[10px] font-semibold text-gray-500">
              Margin Net: {marginAtNet}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      {/* Sub-Navigation 5 Produk + Pengaturan Global */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {SUB_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                subTab === t.key
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          {onGoToStock && (
            <button
              type="button"
              onClick={() => onGoToStock('ALL')}
              className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 font-bold text-xs transition-colors"
            >
              📦 Input / Edit Barang di Menu Stok
            </button>
          )}
          <span className="text-gray-500 font-medium">Space Nego Kasir:</span>
          <input
            type="number"
            min="0"
            max="50"
            value={config.nego_discount_pct}
            onChange={e => setConfig(c => ({ ...c, nego_discount_pct: parseFloat(e.target.value) || 0 }))}
            className="w-16 px-2 py-1 rounded-lg border border-gray-300 text-center font-bold"
          />
          <span className="font-bold text-gray-700">%</span>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : '💾 Simpan Semua Tarif'}
          </button>
        </div>
      </div>

      {/* ── SUB-TAB 1: AKRILIK (Disatukan dengan Stok > ADVERTISING > Akrilik) ── */}
      {subTab === 'akrilik' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Kiri: Titik Mati Tarif Potongan Akrilik & Daftar Bahan dari Stok */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              ⚙️ Titik Mati Tarif Potongan Akrilik (Terhubung ke Stok)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Order (Rp)</label>
                <input
                  type="number"
                  value={config.acrylic?.min_order_price ?? 25000}
                  onChange={e => setConfig(c => ({ ...c, acrylic: { ...(c.acrylic || {}), min_order_price: parseFloat(e.target.value) || 0 } }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Batas Kecil (cm²)</label>
                <input
                  type="number"
                  value={config.acrylic?.min_area_sqcm ?? 400}
                  onChange={e => setConfig(c => ({ ...c, acrylic: { ...(c.acrylic || {}), min_area_sqcm: parseFloat(e.target.value) || 400 } }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Qty Partai</label>
                <input
                  type="number"
                  value={config.acrylic?.min_qty_bulk ?? 5}
                  onChange={e => setConfig(c => ({ ...c, acrylic: { ...(c.acrylic || {}), min_qty_bulk: parseInt(e.target.value, 10) || 5 } }))}
                  className={inp}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200 text-xs">
              <p className="font-bold text-purple-800">Pengali Harga Jual dari Modal Lembaran:</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-gray-500 block">Pengali Normal / Partai (× Modal)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={config.acrylic?.markup_normal_mult ?? 2.0}
                    onChange={e => setConfig(c => ({ ...c, acrylic: { ...(c.acrylic || {}), markup_normal_mult: parseFloat(e.target.value) || 2.0 } }))}
                    className={inp}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Pengali Eceran Kecil (× Modal)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={config.acrylic?.markup_small_mult ?? 2.8}
                    onChange={e => setConfig(c => ({ ...c, acrylic: { ...(c.acrylic || {}), markup_small_mult: parseFloat(e.target.value) || 2.8 } }))}
                    className={inp}
                  />
                </div>
              </div>
            </div>

            {/* Daftar Lembaran Akrilik yang Terbaca dari Stok > ADVERTISING > Akrilik */}
            <div className="bg-cyan-50/70 rounded-xl p-3 border border-cyan-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-cyan-900">
                  💎 Lembaran Akrilik di Menu Stok ({catalog.acrylicOptions.length}):
                </p>
                {onGoToStock && (
                  <button
                    type="button"
                    onClick={() => onGoToStock('ACRYLIC')}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm"
                  >
                    + Tambah / Edit di Stok
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {catalog.acrylicOptions.map(a => (
                  <div key={a.id} className="flex justify-between items-center bg-white rounded-lg px-2.5 py-1.5 border border-cyan-100">
                    <div>
                      <span className="font-bold text-gray-800 block">{a.name}</span>
                      <span className="text-[10px] text-gray-400">Modal Lembar: {formatRupiah(a.buy_price)} ({a.sheet_length}×{a.sheet_width}cm)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-cyan-700 block">Modal: Rp {a.buy_sqcm}/cm²</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Jual: Rp {Math.round(a.buy_sqcm * (config.acrylic?.markup_normal_mult ?? 2.0) * 10) / 10}/cm²
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 italic">
                *Seluruh input & edit lembaran akrilik kini sudah disatukan di menu <b>Stok &gt; ADVERTISING &gt; 💎 Akrilik</b>.
              </p>
            </div>

            <button onClick={handleSaveConfig} disabled={saving} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow">
              {saving ? 'Menyimpan...' : '💾 Simpan Tarif Akrilik'}
            </button>
          </div>

          {/* Kanan: Simulator 2 Arah Potongan Akrilik */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              🧪 Simulator Dua Arah Potongan Akrilik (Dari Stok Admin)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Pilih Akrilik dari Stok</label>
                <select
                  value={acSim.acrylicId}
                  onChange={e => setAcSim(s => ({ ...s, acrylicId: e.target.value, customRate: '' }))}
                  className={inp}
                >
                  {catalog.acrylicOptions.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Modal Rp {a.buy_sqcm}/cm²)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Panjang (cm)</label>
                <input type="number" value={acSim.length} onChange={e => setAcSim(s => ({ ...s, length: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Lebar (cm)</label>
                <input type="number" value={acSim.width} onChange={e => setAcSim(s => ({ ...s, width: e.target.value }))} className={inp} />
              </div>
            </div>

            <div className="w-32">
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Jumlah (Pcs)</label>
              <input type="number" min="1" value={acSim.qty} onChange={e => setAcSim(s => ({ ...s, qty: e.target.value }))} className={inp} />
            </div>

            {acRes && renderBidirectionalCompare({
              rateLabel: `Tarif Jual per cm² (${acRes.tierLabel})`,
              activeRate: acRes.rateSqcm,
              defaultRate: acRes.defaultRateSqcm,
              customRate: acSim.customRate,
              onRateChange: val => setAcSim(s => ({ ...s, customRate: val, customTotalRaw: '' })),
              totalSell: acRes.recommendedSellPrice,
              customTotalRaw: acSim.customTotalRaw,
              onTotalRawChange: rawVal => setAcSim(s => ({ ...s, customTotalRaw: rawVal, customRate: '' })),
              totalHpp: acRes.totalHpp,
              negoPct: config.nego_discount_pct,
              onResetOverride: () => setAcSim(s => ({ ...s, customRate: '', customTotalRaw: '' })),
              hppRows: [
                [`Bahan Akrilik (${acRes.item.name})`, `Modal Lembar: ${formatRupiah(acRes.item.buy_price)} (Rp ${acRes.buySqcm}/cm²)`],
                [`Total Luas Potongan (${acRes.length}×${acRes.width}cm × ${acRes.qty} pcs)`, `${acRes.totalAreaSqcm.toLocaleString('id-ID')} cm²`],
              ],
            })}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: NEONBOX & LAS ── */}
      {subTab === 'neonbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Kiri: Master Titik Mati Tarif Neonbox & Pricelist Tukang Las */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              ⚙️ Titik Mati Tarif Neonbox (Kecil / Sedang / Besar)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Order (Rp)</label>
                <input
                  type="number"
                  value={config.neonbox.min_order_price}
                  onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, min_order_price: parseFloat(e.target.value) || 0 } }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Batas Kecil (cm²)</label>
                <input
                  type="number"
                  value={config.neonbox.small_max_area}
                  onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, small_max_area: parseFloat(e.target.value) || 0 } }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Batas Sedang (cm²)</label>
                <input
                  type="number"
                  value={config.neonbox.mid_max_area}
                  onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, mid_max_area: parseFloat(e.target.value) || 0 } }))}
                  className={inp}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs">
              <div className="grid grid-cols-3 font-bold text-gray-600 pb-1 border-b">
                <span>Skala Ukuran</span>
                <span>Tarif 1 Sisi (/cm²)</span>
                <span>Tarif 2 Sisi (/cm²)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="font-semibold text-gray-700">Kecil (≤{config.neonbox.small_max_area})</span>
                <input type="number" value={config.neonbox.rate_small_1s} onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, rate_small_1s: parseFloat(e.target.value) || 0 } }))} className={inp} />
                <input type="number" value={config.neonbox.rate_small_2s} onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, rate_small_2s: parseFloat(e.target.value) || 0 } }))} className={inp} />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="font-semibold text-gray-700">Sedang (≤{config.neonbox.mid_max_area})</span>
                <input type="number" value={config.neonbox.rate_mid_1s} onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, rate_mid_1s: parseFloat(e.target.value) || 0 } }))} className={inp} />
                <input type="number" value={config.neonbox.rate_mid_2s} onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, rate_mid_2s: parseFloat(e.target.value) || 0 } }))} className={inp} />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="font-semibold text-gray-700">Besar (&gt;{config.neonbox.mid_max_area})</span>
                <input type="number" value={config.neonbox.rate_big_1s} onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, rate_big_1s: parseFloat(e.target.value) || 0 } }))} className={inp} />
                <input type="number" value={config.neonbox.rate_big_2s} onChange={e => setConfig(c => ({ ...c, neonbox: { ...c.neonbox, rate_big_2s: parseFloat(e.target.value) || 0 } }))} className={inp} />
              </div>
            </div>

            {/* Pricelist Vendor Tukang Las */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-800 text-xs">👨‍🏭 Pricelist Rangka & Tiang (Tukang Las)</h4>
                <button
                  type="button"
                  onClick={() => {
                    const newPole = { id: `pole_${Date.now()}`, name: 'Paket Tiang Baru', buy_price: 1000000, sell_price: 1300000, unit: 'paket' }
                    setConfig(c => ({ ...c, neonbox: { ...c.neonbox, poles: [...(c.neonbox.poles || []), newPole] } }))
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200"
                >
                  + Tambah Paket Las
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(config.neonbox.poles || []).map((p, idx) => (
                  <div key={p.id} className="bg-gray-50 rounded-xl p-2.5 border border-gray-200 space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={e => {
                          const list = [...config.neonbox.poles]
                          list[idx] = { ...p, name: e.target.value }
                          setConfig(c => ({ ...c, neonbox: { ...c.neonbox, poles: list } }))
                        }}
                        className={inp}
                      />
                      {p.id !== 'none' && (
                        <button
                          type="button"
                          onClick={() => {
                            const list = config.neonbox.poles.filter((_, i) => i !== idx)
                            setConfig(c => ({ ...c, neonbox: { ...c.neonbox, poles: list } }))
                          }}
                          className="px-2 rounded-lg bg-red-50 text-red-500 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Modal Tukang Las (Rp)</span>
                        <input
                          type="number"
                          value={p.buy_price}
                          onChange={e => {
                            const list = [...config.neonbox.poles]
                            list[idx] = { ...p, buy_price: parseFloat(e.target.value) || 0 }
                            setConfig(c => ({ ...c, neonbox: { ...c.neonbox, poles: list } }))
                          }}
                          className={inp}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Harga Jual Kasir (Rp)</span>
                        <input
                          type="number"
                          value={p.sell_price}
                          onChange={e => {
                            const list = [...config.neonbox.poles]
                            list[idx] = { ...p, sell_price: parseFloat(e.target.value) || 0 }
                            setConfig(c => ({ ...c, neonbox: { ...c.neonbox, poles: list } }))
                          }}
                          className={inp}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow"
            >
              {saving ? 'Menyimpan...' : '💾 Simpan Tarif Neonbox & Las'}
            </button>
          </div>

          {/* Kanan: Simulator Dua Arah Neonbox */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              🧪 Simulator Uji Harga & Bedah HPP Neonbox (Khusus Owner)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Panjang (cm)</label>
                <input type="number" value={nbSim.length} onChange={e => setNbSim(s => ({ ...s, length: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Lebar (cm)</label>
                <input type="number" value={nbSim.width} onChange={e => setNbSim(s => ({ ...s, width: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Sisi Muka</label>
                <select value={nbSim.sides} onChange={e => setNbSim(s => ({ ...s, sides: parseInt(e.target.value, 10) }))} className={inp}>
                  <option value={1}>1 Sisi</option>
                  <option value={2}>2 Sisi</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Jml Mata LED</label>
                <input type="number" value={nbSim.lampQty} onChange={e => setNbSim(s => ({ ...s, lampQty: e.target.value }))} placeholder="Auto" className={inp} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Pilih Paket Tiang / Rangka Las</label>
                <select value={nbSim.poleId} onChange={e => setNbSim(s => ({ ...s, poleId: e.target.value }))} className={inp}>
                  {(config.neonbox.poles || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Modal: {formatRupiah(p.buy_price)} / Jual: {formatRupiah(p.sell_price)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Pilih Lampu dari Stok Advertising</label>
                <select value={nbSim.lampStockId} onChange={e => setNbSim(s => ({ ...s, lampStockId: e.target.value }))} className={inp}>
                  <option value="">Default (Sidelight Rp 3.000 / 1.5W)</option>
                  {lampStocks.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({formatRupiah(l.price)} · {l.watt || 1.5}W)</option>
                  ))}
                </select>
              </div>
            </div>

            {nbRes && renderBidirectionalCompare({
              rateLabel: `Tarif Badan per cm² (${nbRes.tierLabel})`,
              activeRate: nbRes.rateSqcm,
              defaultRate: nbRes.defaultRateSqcm,
              customRate: nbSim.customRate,
              onRateChange: val => setNbSim(s => ({ ...s, customRate: val, customTotalRaw: '' })),
              totalSell: nbRes.recommendedSellPrice,
              customTotalRaw: nbSim.customTotalRaw,
              onTotalRawChange: rawVal => setNbSim(s => ({ ...s, customTotalRaw: rawVal, customRate: '' })),
              totalHpp: nbRes.totalHpp,
              negoPct: config.nego_discount_pct,
              onResetOverride: () => setNbSim(s => ({ ...s, customRate: '', customTotalRaw: '' })),
              hppRows: [
                [`Akrilik (${nbRes.sides} Sisi + Samping ${nbRes.frameThick}cm)`, formatRupiah(nbRes.acrylicCost)],
                [`Lampu LED (${nbRes.lampQty} pcs × ${formatRupiah(nbRes.lampUnitCost)})`, formatRupiah(nbRes.lampCost)],
                [`${nbRes.trafoName} (Beban ${nbRes.totalWatt}W)`, formatRupiah(nbRes.trafoCost)],
                ['Visual Stiker / Print + Kabel & Lem', formatRupiah(nbRes.stickerCost + nbRes.miscCost)],
                ...(nbRes.poleBuyPrice > 0 ? [[`Modal Las (${nbRes.poleItem?.name})`, formatRupiah(nbRes.poleBuyPrice)]] : []),
              ],
            })}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: HURUF TIMBUL ── */}
      {subTab === 'huruf' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Kiri: Master Tarif 6 Varian Huruf Timbul */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              ⚙️ Titik Mati Tarif Huruf Timbul (Per cm Tinggi)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Tinggi (cm)</label>
                <input type="number" value={config.huruf_timbul.min_height_cm} onChange={e => setConfig(c => ({ ...c, huruf_timbul: { ...c.huruf_timbul, min_height_cm: parseFloat(e.target.value) || 10 } }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Batas Besar (cm)</label>
                <input type="number" value={config.huruf_timbul.tier_threshold_cm} onChange={e => setConfig(c => ({ ...c, huruf_timbul: { ...c.huruf_timbul, tier_threshold_cm: parseFloat(e.target.value) || 30 } }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Pengali Logo</label>
                <input type="number" step="0.1" value={config.huruf_timbul.logo_multiplier} onChange={e => setConfig(c => ({ ...c, huruf_timbul: { ...c.huruf_timbul, logo_multiplier: parseFloat(e.target.value) || 2 } }))} className={inp} />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {(config.huruf_timbul.variants || []).map((v, idx) => (
                <div key={v.id} className="bg-gray-50 rounded-xl p-2.5 border border-gray-200 space-y-1.5">
                  <p className="font-bold text-xs text-gray-800">{v.name}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block">≤{config.huruf_timbul.tier_threshold_cm}cm (/cm)</span>
                      <input
                        type="number"
                        value={v.rate_std}
                        onChange={e => {
                          const list = [...config.huruf_timbul.variants]
                          list[idx] = { ...v, rate_std: parseFloat(e.target.value) || 0 }
                          setConfig(c => ({ ...c, huruf_timbul: { ...c.huruf_timbul, variants: list } }))
                        }}
                        className={inp}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">&gt;{config.huruf_timbul.tier_threshold_cm}cm (/cm)</span>
                      <input
                        type="number"
                        value={v.rate_big}
                        onChange={e => {
                          const list = [...config.huruf_timbul.variants]
                          list[idx] = { ...v, rate_big: parseFloat(e.target.value) || 0 }
                          setConfig(c => ({ ...c, huruf_timbul: { ...c.huruf_timbul, variants: list } }))
                        }}
                        className={inp}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Modal Plat (/cm²)</span>
                      <input
                        type="number"
                        value={v.buy_sqcm}
                        onChange={e => {
                          const list = [...config.huruf_timbul.variants]
                          list[idx] = { ...v, buy_sqcm: parseFloat(e.target.value) || 0 }
                          setConfig(c => ({ ...c, huruf_timbul: { ...c.huruf_timbul, variants: list } }))
                        }}
                        className={inp}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleSaveConfig} disabled={saving} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow">
              {saving ? 'Menyimpan...' : '💾 Simpan Tarif Huruf Timbul'}
            </button>
          </div>

          {/* Kanan: Simulator Huruf Timbul + eCut CorelDRAW Compare */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              🧪 Simulator Huruf Timbul & Compare Lampu eCut CorelDRAW
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Teks Tulisan</label>
                <input type="text" value={htSim.text} onChange={e => setHtSim(s => ({ ...s, text: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Tinggi Huruf (cm)</label>
                <input type="number" value={htSim.heightCm} onChange={e => setHtSim(s => ({ ...s, heightCm: e.target.value }))} className={inp} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Varian Bahan</label>
                <select value={htSim.variantId} onChange={e => setHtSim(s => ({ ...s, variantId: e.target.value }))} className={inp}>
                  {(config.huruf_timbul.variants || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Panjang Total Tulisan (cm)</label>
                <input type="number" value={htSim.totalWidthCm} onChange={e => setHtSim(s => ({ ...s, totalWidthCm: e.target.value }))} placeholder="Auto estimasi" className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-purple-700 block mb-1">Jml Pcs Lampu (eCut)</label>
                <input type="number" value={htSim.lampQtyManual} onChange={e => setHtSim(s => ({ ...s, lampQtyManual: e.target.value }))} placeholder="Dari eCut" className={inp} />
              </div>
            </div>

            {htRes && renderBidirectionalCompare({
              rateLabel: `Tarif per cm Tinggi (${htRes.tierLabel})`,
              activeRate: htRes.ratePerCm,
              defaultRate: htRes.defaultRatePerCm,
              customRate: htSim.customRate,
              onRateChange: val => setHtSim(s => ({ ...s, customRate: val, customTotalRaw: '' })),
              totalSell: htRes.recommendedSellPrice,
              customTotalRaw: htSim.customTotalRaw,
              onTotalRawChange: rawVal => setHtSim(s => ({ ...s, customTotalRaw: rawVal, customRate: '' })),
              totalHpp: htRes.totalHpp,
              negoPct: config.nego_discount_pct,
              onResetOverride: () => setHtSim(s => ({ ...s, customRate: '', customTotalRaw: '' })),
              hppRows: [
                [`Modal Plat/Akrilik (${htRes.estTotalWidth}×${htRes.effectiveHeight} cm)`, formatRupiah(htRes.plateCost)],
                ...(htRes.variant.has_led ? [
                  [`Modal Lampu LED eCut (${htRes.estLampQty} pcs)`, formatRupiah(htRes.lampCost)],
                  [`Modal Trafo Include (Beban ~${htRes.totalWatt}W)`, formatRupiah(htRes.trafoCost)],
                ] : []),
                ...(htRes.backdropBuyCost > 0 ? [['Modal Backdrop ACP', formatRupiah(htRes.backdropBuyCost)]] : []),
              ],
            })}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 4: RAMBU / PAPAN NAMA ── */}
      {subTab === 'rambu' && (() => {
        const simSticker = catalog.stickerOptions.find(s => s.id === rbSim.stickerId) || catalog.stickerOptions[0]

        return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Kiri: Master Tarif Rambu & Ringkasan Bahan dari Stok */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              ⚙️ Titik Mati Tarif Rambu (Terhubung ke Stok Admin)
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Order (Rp)</label>
                <input type="number" value={config.rambu.min_order_price} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, min_order_price: parseFloat(e.target.value) || 0 } }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Qty Menengah</label>
                <input type="number" value={config.rambu.qty_mid_min} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, qty_mid_min: parseInt(e.target.value, 10) || 3 } }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Qty Partai</label>
                <input type="number" value={config.rambu.qty_bulk_min} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, qty_bulk_min: parseInt(e.target.value, 10) || 5 } }))} className={inp} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-2.5 text-xs border border-gray-200">
              <p className="font-bold text-purple-800">1. Tarif Acuan Dasar Rambu 2 Warna (/cm²)</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 block">Eceran (/cm²)</span>
                  <input type="number" value={config.rambu.rate_ecer_base ?? 150} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, rate_ecer_base: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Menengah (/cm²)</span>
                  <input type="number" value={config.rambu.rate_mid_base ?? 120} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, rate_mid_base: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Partai (/cm²)</span>
                  <input type="number" value={config.rambu.rate_bulk_base ?? 100} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, rate_bulk_base: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
              </div>

              <p className="font-bold text-amber-800 pt-2 border-t">2. Tambahan per Warna Stiker Berikutnya (/cm²)</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 block">+Wrn Ecer</span>
                  <input type="number" value={config.rambu.extra_color_ecer ?? 30} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, extra_color_ecer: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">+Wrn Menengah</span>
                  <input type="number" value={config.rambu.extra_color_mid ?? 25} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, extra_color_mid: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">+Wrn Partai</span>
                  <input type="number" value={config.rambu.extra_color_bulk ?? 20} onChange={e => setConfig(c => ({ ...c, rambu: { ...c.rambu, extra_color_bulk: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
              </div>
            </div>

            {/* Daftar Bahan Board & Stiker yang Terbaca dari Stok Admin */}
            <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-100 space-y-2 text-xs max-h-64 overflow-y-auto">
              <p className="font-bold text-purple-900">📦 Bahan Board Terbaca dari Stok & Akrilik ({catalog.boardOptions.length}):</p>
              {catalog.boardOptions.map(b => (
                <div key={b.id} className="flex justify-between text-gray-700 border-b border-purple-100/60 pb-1">
                  <span>• {b.name}</span>
                  <span className="font-semibold text-purple-700">Modal: Rp {b.buy_sqcm}/cm²</span>
                </div>
              ))}
              <p className="font-bold text-purple-900 pt-2">🏷️ Jenis Stiker Terbaca dari Stok ({catalog.stickerOptions.length}):</p>
              {catalog.stickerOptions.map(s => (
                <div key={s.id} className="flex justify-between text-gray-700 border-b border-purple-100/60 pb-1">
                  <span>• {s.name}</span>
                  <span className="font-semibold text-purple-700">Modal: Rp {s.buy_sqcm}/cm²</span>
                </div>
              ))}
              <p className="text-[10px] text-gray-500 italic pt-1">
                *Untuk menambah/mengubah bahan Board atau Stiker, silakan kelola di tab <b>Stok &gt; ADVERTISING</b> atau tab <b>Akrilik</b>.
              </p>
            </div>

            <button onClick={handleSaveConfig} disabled={saving} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow">
              {saving ? 'Menyimpan...' : '💾 Simpan Tarif Rambu'}
            </button>
          </div>

          {/* Kanan: Simulator Dua Arah Rambu */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              🧪 Simulator Dua Arah Rambu / Papan Nama (Dari Stok Admin)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">1. Pilih Bahan Board</label>
                <select value={rbSim.boardId} onChange={e => setRbSim(s => ({ ...s, boardId: e.target.value, customRate: '' }))} className={inp}>
                  {catalog.boardOptions.map(b => <option key={b.id} value={b.id}>{b.name} (Rp {b.buy_sqcm}/cm²)</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">2. Pilih Jenis Stiker</label>
                <select value={rbSim.stickerId} onChange={e => setRbSim(s => ({ ...s, stickerId: e.target.value, customRate: '' }))} className={inp}>
                  {catalog.stickerOptions.map(st => <option key={st.id} value={st.id}>{st.name} (Rp {st.buy_sqcm}/cm²)</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">3. Jumlah Warna Stiker</label>
                {simSticker?.is_cutting !== false ? (
                  <select value={rbSim.colorCount} onChange={e => setRbSim(s => ({ ...s, colorCount: e.target.value, customRate: '' }))} className={inp}>
                    {[1, 2, 3, 4, 5].map(c => <option key={c} value={String(c)}>{c} Warna</option>)}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-bold text-gray-500">Full Color (Cetak)</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Panjang (cm)</label>
                <input type="number" value={rbSim.length} onChange={e => setRbSim(s => ({ ...s, length: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Lebar (cm)</label>
                <input type="number" value={rbSim.width} onChange={e => setRbSim(s => ({ ...s, width: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Jumlah (Pcs)</label>
                <input type="number" value={rbSim.qty} onChange={e => setRbSim(s => ({ ...s, qty: e.target.value }))} className={inp} />
              </div>
            </div>

            {rbRes && renderBidirectionalCompare({
              rateLabel: `Tarif Gabungan per cm² (${rbRes.tierLabel} · ${rbRes.colorLabel})`,
              activeRate: rbRes.rateSqcm,
              defaultRate: rbRes.defaultRateSqcm,
              customRate: rbSim.customRate,
              onRateChange: val => setRbSim(s => ({ ...s, customRate: val, customTotalRaw: '' })),
              totalSell: rbRes.recommendedSellPrice,
              customTotalRaw: rbSim.customTotalRaw,
              onTotalRawChange: rawVal => setRbSim(s => ({ ...s, customTotalRaw: rawVal, customRate: '' })),
              totalHpp: rbRes.totalHpp,
              negoPct: config.nego_discount_pct,
              onResetOverride: () => setRbSim(s => ({ ...s, customRate: '', customTotalRaw: '' })),
              hppRows: [
                [`Modal Board (${rbRes.board.name})`, `Rp ${rbRes.boardBuySqcm}/cm² × ${rbRes.totalAreaSqcm} cm² = ${formatRupiah(Math.round(rbRes.totalAreaSqcm * rbRes.boardBuySqcm))}`],
                [`Modal Stiker (${rbRes.sticker.name} · ${rbRes.colorLabel})`, `Rp ${rbRes.stickerBuySqcm}/cm² × ${rbRes.totalAreaSqcm} cm² = ${formatRupiah(Math.round(rbRes.totalAreaSqcm * rbRes.stickerBuySqcm))}`],
              ],
            })}
          </div>
        </div>
        )
      })()}

      {/* ── SUB-TAB 5: NEONFLEX ── */}
      {subTab === 'neonflex' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Kiri: Master Tarif Neonflex */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              ⚙️ Titik Mati Tarif Neonflex (Per Meter eCut + Akrilik)
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Min Order (Rp)</label>
                <input type="number" value={config.neonflex.min_order_price} onChange={e => setConfig(c => ({ ...c, neonflex: { ...c.neonflex, min_order_price: parseFloat(e.target.value) || 0 } }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Tambahan Potong Pola (%)</label>
                <input type="number" value={config.neonflex.contour_cut_pct} onChange={e => setConfig(c => ({ ...c, neonflex: { ...c.neonflex, contour_cut_pct: parseFloat(e.target.value) || 0 } }))} className={inp} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs">
              <p className="font-bold text-gray-700">Tarif Jual Lampu Neonflex per Meter (Include Adaptor):</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 block">Ecer (&lt;{config.neonflex.mid_meter_min}m)</span>
                  <input type="number" value={config.neonflex.rate_meter_ecer} onChange={e => setConfig(c => ({ ...c, neonflex: { ...c.neonflex, rate_meter_ecer: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Sedang (≥{config.neonflex.mid_meter_min}m)</span>
                  <input type="number" value={config.neonflex.rate_meter_mid} onChange={e => setConfig(c => ({ ...c, neonflex: { ...c.neonflex, rate_meter_mid: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Partai (≥{config.neonflex.bulk_meter_min}m)</span>
                  <input type="number" value={config.neonflex.rate_meter_bulk} onChange={e => setConfig(c => ({ ...c, neonflex: { ...c.neonflex, rate_meter_bulk: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <span className="text-[10px] text-gray-500 block">Jual Akrilik Backing (/cm²)</span>
                  <input type="number" value={config.neonflex.acrylic_sell_sqcm} onChange={e => setConfig(c => ({ ...c, neonflex: { ...c.neonflex, acrylic_sell_sqcm: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Modal Akrilik Backing (/cm²)</span>
                  <input type="number" value={config.neonflex.acrylic_buy_sqcm} onChange={e => setConfig(c => ({ ...c, neonflex: { ...c.neonflex, acrylic_buy_sqcm: parseFloat(e.target.value) || 0 } }))} className={inp} />
                </div>
              </div>
            </div>

            <button onClick={handleSaveConfig} disabled={saving} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow">
              {saving ? 'Menyimpan...' : '💾 Simpan Tarif Neonflex'}
            </button>
          </div>

          {/* Kanan: Simulator Dua Arah Neonflex */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">
              🧪 Simulator Dua Arah Neonflex (Panjang eCut + Akrilik)
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Panjang LED eCut (m)</label>
                <input type="number" step="any" value={nfSim.meterLength} onChange={e => setNfSim(s => ({ ...s, meterLength: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Panjang Akrilik (cm)</label>
                <input type="number" value={nfSim.acrylicLength} onChange={e => setNfSim(s => ({ ...s, acrylicLength: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Lebar Akrilik (cm)</label>
                <input type="number" value={nfSim.acrylicWidth} onChange={e => setNfSim(s => ({ ...s, acrylicWidth: e.target.value }))} className={inp} />
              </div>
            </div>

            {nfRes && renderBidirectionalCompare({
              rateLabel: `Tarif LED per Meter (${nfRes.tierLabel})`,
              activeRate: nfRes.ratePerMeter,
              defaultRate: nfRes.defaultRatePerMeter,
              customRate: nfSim.customRate,
              onRateChange: val => setNfSim(s => ({ ...s, customRate: val, customTotalRaw: '' })),
              totalSell: nfRes.recommendedSellPrice,
              customTotalRaw: nfSim.customTotalRaw,
              onTotalRawChange: rawVal => setNfSim(s => ({ ...s, customTotalRaw: rawVal, customRate: '' })),
              totalHpp: nfRes.totalHpp,
              negoPct: config.nego_discount_pct,
              onResetOverride: () => setNfSim(s => ({ ...s, customRate: '', customTotalRaw: '' })),
              hppRows: [
                [`Modal Lampu Neonflex (${nfRes.meterLength} m)`, formatRupiah(nfRes.ledBuyCost)],
                [`Modal Akrilik Backing (${nfRes.acrylicLength}×${nfRes.acrylicWidth} cm)`, formatRupiah(nfRes.acrylicBuyCost)],
                ['Modal Adaptor 12V + Baut Pen', formatRupiah(nfRes.adaptorBuyCost + (nfRes.penIklanQty * 6000))],
              ],
            })}
          </div>
        </div>
      )}
    </div>
  )
}
