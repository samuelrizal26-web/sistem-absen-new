import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdvertisingConfig, getStock, getAcrylics } from '../services/api'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../utils/format'
import {
  DEFAULT_ADVERTISING_CONFIG,
  mergeAdvConfig,
  calcNeonbox,
  calcHurufTimbul,
  calcRambu,
  calcNeonflex,
} from '../utils/advertisingCalc'
import AcrylicCalculatorModal from './AcrylicCalculatorModal'

const PRODUCT_TABS = [
  { key: 'akrilik', label: 'Akrilik', icon: '🟦' },
  { key: 'neonbox', label: 'Neonbox', icon: '💡' },
  { key: 'huruf', label: 'Huruf Timbul', icon: '🔤' },
  { key: 'rambu', label: 'Rambu / Plang', icon: '🪧' },
  { key: 'neonflex', label: 'Neonflex', icon: '✨' },
]

export default function AdvertisingCalculatorModal({ onClose, showToast }) {
  const navigate = useNavigate()
  const [active, setActive] = useState('akrilik')
  const [config, setConfig] = useState(DEFAULT_ADVERTISING_CONFIG)
  const [stocks, setStocks] = useState([])
  const [acrylics, setAcrylics] = useState([])

  // ── State Neonbox ──
  const [nbForm, setNbForm] = useState({
    length: '', width: '', sides: 2, frameThick: 13,
    poleId: 'none', extraCostRaw: '', extraNote: '', customDealRaw: '',
  })

  // ── State Huruf Timbul ──
  const [htForm, setHtForm] = useState({
    text: '', heightCm: '', variantId: 'akrilik_led',
    logoCount: '0', logoHeightCm: '',
    hasBackdrop: false, backdropLength: '', backdropWidth: '',
    rangkaMeter: '', extraCostRaw: '', extraNote: '', customDealRaw: '',
  })

  // ── State Rambu / Papan Nama ──
  const [rbForm, setRbForm] = useState({
    boardId: 'ACP',
    stickerId: 'reflective_asahi',
    colorCount: '2',
    length: '', width: '', qty: '1', sides: 1,
    rangkaMeter: '', tiangMeter: '', penIklanQty: '0',
    extraCostRaw: '', extraNote: '', customDealRaw: '',
  })

  // ── State Neonflex ──
  const [nfForm, setNfForm] = useState({
    meterLength: '', acrylicLength: '', acrylicWidth: '',
    cutShape: 'kotak', colorName: 'Warm White',
    penIklanQty: '4', extraCostRaw: '', extraNote: '', customDealRaw: '',
  })

  useEffect(() => {
    Promise.allSettled([getAdvertisingConfig(), getStock(), getAcrylics()]).then(([cRes, sRes, aRes]) => {
      if (cRes.status === 'fulfilled' && cRes.value) setConfig(mergeAdvConfig(cRes.value))
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value)) setStocks(sRes.value)
      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) setAcrylics(aRes.value)
    })
  }, [])

  // ── Live Calculations ──
  const nbResult = useMemo(() => calcNeonbox({
    ...nbForm,
    extraCost: parseRupiahInput(nbForm.extraCostRaw),
  }, config, stocks, acrylics), [nbForm, config, stocks, acrylics])

  const htResult = useMemo(() => calcHurufTimbul({
    ...htForm,
    extraCost: parseRupiahInput(htForm.extraCostRaw),
  }, config, stocks), [htForm, config, stocks])

  const rbResult = useMemo(() => calcRambu({
    ...rbForm,
    extraCost: parseRupiahInput(rbForm.extraCostRaw),
  }, config), [rbForm, config])

  const nfResult = useMemo(() => calcNeonflex({
    ...nfForm,
    extraCost: parseRupiahInput(nfForm.extraCostRaw),
  }, config, stocks), [nfForm, config, stocks])

  const handleSaveToProject = (payload) => {
    onClose?.()
    navigate('/project', { state: { prefillFromCalculator: payload } })
  }

  const copyWA = (text) => {
    navigator.clipboard?.writeText(text).then(() => {
      showToast?.('Rincian penawaran disalin! Siap paste ke WhatsApp', 'success')
    }).catch(() => {
      showToast?.('Gagal menyalin teks', 'error')
    })
  }

  const inpCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white'

  // Reusable Result Card for Kasir (Tanpa HPP Modal, Fokus Harga Disarankan + Batas Net 15%)
  const renderKasirResultCard = ({ result, customDealRaw, onCustomDealChange, waText, onReset, summaryLines = [] }) => {
    if (!result) return null
    const customDeal = parseRupiahInput(customDealRaw)
    const finalPrice = customDeal > 0 ? customDeal : result.recommendedSellPrice
    const isBelowNet = customDeal > 0 && customDeal < result.netFloorPrice
    const isSafeNego = customDeal > 0 && customDeal >= result.netFloorPrice

    return (
      <div className="bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-600">Hasil Kalkulasi Penawaran:</span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
            {result.tierLabel}
          </span>
        </div>

        {/* Card Utama: Harga Jual yang Disarankan */}
        <div className="bg-white rounded-2xl p-4 border border-cyan-200 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 mb-0.5">
            🏷️ Harga Jual yang Disarankan
          </p>
          <p className="text-3xl font-black text-cyan-900">
            {formatRupiah(result.recommendedSellPrice)}
          </p>
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200 flex items-center justify-center gap-2 text-xs">
            <span className="text-gray-500">🔒 Batas Harga Net (Diskon Maks {result.negoPct}%):</span>
            <span className="font-extrabold text-amber-700">
              {formatRupiah(result.netFloorPrice)}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Space tawar-menawar kasir: {formatRupiah(result.recommendedSellPrice - result.netFloorPrice)}
          </p>
        </div>

        {/* Ringkasan Spesifikasi */}
        {summaryLines.length > 0 && (
          <div className="space-y-1 text-xs text-gray-600 pt-1 border-t border-cyan-100">
            {summaryLines.map(([label, val], idx) => (
              <div key={idx} className="flex justify-between gap-2">
                <span>{label}</span>
                <span className="font-semibold text-gray-800 text-right">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input Harga Deal Custom (Jika Nego) */}
        <div className="bg-white/80 rounded-xl p-2.5 border border-cyan-100">
          <label className="text-[11px] font-bold text-gray-600 block mb-1">
            ✏️ Harga Deal Negosiasi (Opsional — isi jika pembeli menawar):
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={customDealRaw}
              onChange={e => onCustomDealChange(formatRupiahInput(e.target.value))}
              placeholder={formatRupiahInput(String(result.recommendedSellPrice))}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
          {isSafeNego && (
            <p className="text-[11px] font-bold text-emerald-700 mt-1">
              🟢 Harga Deal Aman (Masih di atas Batas Harga Net)
            </p>
          )}
          {isBelowNet && (
            <p className="text-[11px] font-bold text-red-600 mt-1">
              🔴 Peringatan: Harga di bawah Batas Net! Wajib konfirmasi Owner sebelum deal.
            </p>
          )}
        </div>

        {/* Tombol Aksi Kasir */}
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <button
              onClick={() => copyWA(waText(finalPrice))}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              💬 Salin Penawaran ke WhatsApp
            </button>
            <button
              onClick={onReset}
              className="px-3.5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors"
            >
              Reset
            </button>
          </div>
          <button
            onClick={() => handleSaveToProject({
              project_name: result.projectTitle,
              selling_price: finalPrice,
              notes: summaryLines.map(([k, v]) => `${k} ${v}`).join(' · '),
              materials: result.materials || [],
            })}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            🚀 Simpan Langsung ke Project ({formatRupiah(finalPrice)})
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #0A4D68 0%, #088395 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg">
              🧮
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Kalkulator Advertising</h2>
              <p className="text-[11px] text-white/80">Pilih produk untuk hitung harga penawaran customer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Produk */}
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
          {PRODUCT_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                active === t.key
                  ? 'bg-cyan-700 text-white border-cyan-700 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {/* ── TAB 1: AKRILIK ── */}
          {active === 'akrilik' && (
            <AcrylicCalculatorModal
              embedded
              onClose={onClose}
              showToast={showToast}
              onSaveToProject={handleSaveToProject}
            />
          )}

          {/* ── TAB 2: NEONBOX ── */}
          {active === 'neonbox' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Panjang (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={nbForm.length}
                    onChange={e => setNbForm(f => ({ ...f, length: e.target.value }))}
                    placeholder="Contoh: 150"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Lebar / Diameter (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={nbForm.width}
                    onChange={e => setNbForm(f => ({ ...f, width: e.target.value }))}
                    placeholder="Contoh: 60"
                    className={inpCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tipe Visual Muka</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[1, 2].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNbForm(f => ({ ...f, sides: s }))}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          nbForm.sides === s
                            ? 'bg-cyan-700 text-white border-cyan-700'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {s} Sisi
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tebal Frame (cm)</label>
                  <input
                    type="number"
                    value={nbForm.frameThick}
                    onChange={e => setNbForm(f => ({ ...f, frameThick: e.target.value }))}
                    placeholder="13"
                    className={inpCls}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Opsi Rangka / Tiang & Pasang</label>
                <select
                  value={nbForm.poleId}
                  onChange={e => setNbForm(f => ({ ...f, poleId: e.target.value }))}
                  className={inpCls}
                >
                  {(config.neonbox?.poles || DEFAULT_ADVERTISING_CONFIG.neonbox.poles).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sell_price > 0 ? `(+${formatRupiah(p.sell_price)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Biaya Tambahan (Opsional)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nbForm.extraCostRaw}
                    onChange={e => setNbForm(f => ({ ...f, extraCostRaw: formatRupiahInput(e.target.value) }))}
                    placeholder="Rp 0"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Ket. Biaya Tambahan</label>
                  <input
                    type="text"
                    value={nbForm.extraNote}
                    onChange={e => setNbForm(f => ({ ...f, extraNote: e.target.value }))}
                    placeholder="Mis: Kabel panjang / bongkar"
                    className={inpCls}
                  />
                </div>
              </div>

              {renderKasirResultCard({
                result: nbResult,
                customDealRaw: nbForm.customDealRaw,
                onCustomDealChange: v => setNbForm(f => ({ ...f, customDealRaw: v })),
                onReset: () => setNbForm({ length: '', width: '', sides: 2, frameThick: 13, poleId: 'none', extraCostRaw: '', extraNote: '', customDealRaw: '' }),
                summaryLines: nbResult ? [
                  ['Ukuran & Luas:', `${nbResult.length} × ${nbResult.width} cm (${nbResult.areaSqcm.toLocaleString('id-ID')} cm²)`],
                  ['Spesifikasi:', `${nbResult.sides} Sisi · Tebal ${nbResult.frameThick} cm · LED + Trafo Include`],
                  ['Harga Badan Neonbox:', formatRupiah(nbResult.bodySellPrice)],
                  ...(nbResult.poleSellPrice > 0 ? [['Tiang / Rangka:', `${nbResult.poleItem?.name} (${formatRupiah(nbResult.poleSellPrice)})`]] : []),
                  ...(nbResult.extraCost > 0 ? [['Biaya Tambahan:', formatRupiah(nbResult.extraCost)]] : []),
                ] : [],
                waText: (finalPrice) =>
`*Penawaran Neonbox - Labalaba Advertising*
---------------------------------------
Ukuran      : ${nbResult.length} x ${nbResult.width} cm (${nbResult.sides} Sisi)
Tebal Frame : ${nbResult.frameThick} cm
Penerangan  : LED + Power Supply Rainproof (Include)
Tiang/Rangka: ${nbResult.poleItem?.name || 'Tanpa Tiang'}${nbResult.extraCost > 0 ? `\nTambahan    : ${nbForm.extraNote || 'Biaya Tambahan'} (${formatRupiah(nbResult.extraCost)})` : ''}
---------------------------------------
*Total Harga: ${formatRupiah(finalPrice)}*

_Harga dapat berubah sewaktu-waktu._`,
              })}
            </div>
          )}

          {/* ── TAB 3: HURUF TIMBUL ── */}
          {active === 'huruf' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Pilih Jenis Bahan Huruf Timbul</label>
                <select
                  value={htForm.variantId}
                  onChange={e => setHtForm(f => ({ ...f, variantId: e.target.value }))}
                  className={inpCls}
                >
                  {(config.huruf_timbul?.variants || DEFAULT_ADVERTISING_CONFIG.huruf_timbul.variants).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">Ketik Teks Tulisan *</label>
                  <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200">
                    {(htForm.text || '').replace(/\s+/g, '').length} Huruf (tanpa spasi)
                  </span>
                </div>
                <input
                  type="text"
                  value={htForm.text}
                  onChange={e => setHtForm(f => ({ ...f, text: e.target.value }))}
                  placeholder="Contoh: TOKO BERKAH JAYA"
                  className={inpCls}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tinggi Huruf (cm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={htForm.heightCm}
                    onChange={e => setHtForm(f => ({ ...f, heightCm: e.target.value }))}
                    placeholder="Mis: 20"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Jml Logo (2x)</label>
                  <input
                    type="number"
                    min="0"
                    value={htForm.logoCount}
                    onChange={e => setHtForm(f => ({ ...f, logoCount: e.target.value }))}
                    placeholder="0"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tinggi Logo (cm)</label>
                  <input
                    type="number"
                    min="0"
                    value={htForm.logoHeightCm}
                    onChange={e => setHtForm(f => ({ ...f, logoHeightCm: e.target.value }))}
                    placeholder={htForm.heightCm || '25'}
                    className={inpCls}
                  />
                </div>
              </div>

              {htResult?.belowMinWarning && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 font-medium">
                  ⚠️ Tinggi di bawah {config.huruf_timbul?.min_height_cm || 10} cm! Disarankan arahkan customer memakai <b>Akrilik Lempengan 10mm</b>. Jika tetap huruf timbul, sistem mengenakan batas minimum {config.huruf_timbul?.min_height_cm || 10} cm.
                </div>
              )}

              {/* Opsi Backdrop ACP & Rangka */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={htForm.hasBackdrop}
                    onChange={e => setHtForm(f => ({ ...f, hasBackdrop: e.target.checked }))}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  Tambah Backdrop / Dasaran ACP
                </label>
                {htForm.hasBackdrop && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <input
                      type="number"
                      value={htForm.backdropLength}
                      onChange={e => setHtForm(f => ({ ...f, backdropLength: e.target.value }))}
                      placeholder="Panjang Backdrop (cm)"
                      className={inpCls}
                    />
                    <input
                      type="number"
                      value={htForm.backdropWidth}
                      onChange={e => setHtForm(f => ({ ...f, backdropWidth: e.target.value }))}
                      placeholder="Lebar Backdrop (cm)"
                      className={inpCls}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Rangka Dudukan (Meter)</label>
                  <input
                    type="number"
                    step="any"
                    value={htForm.rangkaMeter}
                    onChange={e => setHtForm(f => ({ ...f, rangkaMeter: e.target.value }))}
                    placeholder="0 (Jika tempel tembok)"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Biaya Pasang / Lainnya</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={htForm.extraCostRaw}
                    onChange={e => setHtForm(f => ({ ...f, extraCostRaw: formatRupiahInput(e.target.value) }))}
                    placeholder="Rp 0"
                    className={inpCls}
                  />
                </div>
              </div>

              {renderKasirResultCard({
                result: htResult,
                customDealRaw: htForm.customDealRaw,
                onCustomDealChange: v => setHtForm(f => ({ ...f, customDealRaw: v })),
                onReset: () => setHtForm({ text: '', heightCm: '', variantId: 'akrilik_led', logoCount: '0', logoHeightCm: '', hasBackdrop: false, backdropLength: '', backdropWidth: '', rangkaMeter: '', extraCostRaw: '', extraNote: '', customDealRaw: '' }),
                summaryLines: htResult ? [
                  ['Jenis Bahan:', htResult.variant.name],
                  ['Rincian Huruf:', `${htResult.letterCount} huruf × ${htResult.effectiveHeight} cm (${formatRupiah(htResult.lettersSellPrice)})`],
                  ...(htResult.logoCount > 0 ? [['Rincian Logo (2x):', `${htResult.logoCount} logo × ${htResult.logoHeightCm} cm (${formatRupiah(htResult.logosSellPrice)})`]] : []),
                  ...(htResult.backdropSellPrice > 0 ? [['Backdrop ACP:', `${htResult.backdropL}×${htResult.backdropW} cm (${formatRupiah(htResult.backdropSellPrice)})`]] : []),
                  ...(htResult.rangkaSellPrice > 0 ? [['Rangka Dudukan:', `${htResult.rangkaMeter} m (${formatRupiah(htResult.rangkaSellPrice)})`]] : []),
                  ...(htResult.extraCost > 0 ? [['Biaya Pasang/Lainnya:', formatRupiah(htResult.extraCost)]] : []),
                ] : [],
                waText: (finalPrice) =>
`*Penawaran Huruf Timbul - Labalaba Advertising*
---------------------------------------
Tulisan     : ${htResult.rawText || '-'} (${htResult.letterCount} huruf)
Bahan       : ${htResult.variant.name}
Tinggi Huruf: ${htResult.heightCm} cm${htResult.logoCount > 0 ? `\nLogo Khusus : ${htResult.logoCount} pcs (Tinggi ${htResult.logoHeightCm} cm)` : ''}${htResult.backdropArea > 0 ? `\nBackdrop ACP: ${htResult.backdropL} x ${htResult.backdropW} cm` : ''}${htResult.extraCost > 0 ? `\nBiaya Pasang: ${formatRupiah(htResult.extraCost)}` : ''}
---------------------------------------
*Total Harga: ${formatRupiah(finalPrice)}*

_Harga sudah termasuk trafo/power supply (untuk varian berlampu)._`,
              })}
            </div>
          )}

          {/* ── TAB 4: RAMBU / PAPAN NAMA ── */}
          {active === 'rambu' && (() => {
            const boards = Array.isArray(config.rambu?.boards) && config.rambu.boards.length > 0
              ? config.rambu.boards
              : DEFAULT_ADVERTISING_CONFIG.rambu.boards
            const stickers = Array.isArray(config.rambu?.stickers) && config.rambu.stickers.length > 0
              ? config.rambu.stickers
              : DEFAULT_ADVERTISING_CONFIG.rambu.stickers
            const currentSticker = stickers.find(s => s.id === rbForm.stickerId) || stickers[0]

            return (
            <div className="p-5 space-y-4">
              {/* 1. Pilih Bahan Board */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">1. Pilih Bahan Board (Dasaran)</label>
                <select
                  value={rbForm.boardId}
                  onChange={e => setRbForm(f => ({ ...f, boardId: e.target.value }))}
                  className={inpCls}
                >
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Pilih Jenis Stiker & 3. Jumlah Warna Stiker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">2. Pilih Jenis Stiker</label>
                  <select
                    value={rbForm.stickerId}
                    onChange={e => setRbForm(f => ({ ...f, stickerId: e.target.value }))}
                    className={inpCls}
                  >
                    {stickers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">3. Jumlah Warna Stiker</label>
                  {currentSticker?.is_cutting ? (
                    <select
                      value={rbForm.colorCount}
                      onChange={e => setRbForm(f => ({ ...f, colorCount: e.target.value }))}
                      className={inpCls}
                    >
                      {[1, 2, 3, 4, 5].map(c => (
                        <option key={c} value={String(c)}>{c} Warna</option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-xs font-bold text-gray-600">
                      Full Color (Cetak)
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Panjang (cm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={rbForm.length}
                    onChange={e => setRbForm(f => ({ ...f, length: e.target.value }))}
                    placeholder="60"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Lebar (cm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={rbForm.width}
                    onChange={e => setRbForm(f => ({ ...f, width: e.target.value }))}
                    placeholder="40"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Jumlah (Pcs)</label>
                  <input
                    type="number"
                    min="1"
                    value={rbForm.qty}
                    onChange={e => setRbForm(f => ({ ...f, qty: e.target.value }))}
                    placeholder="1"
                    className={inpCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Jumlah Sisi</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[1, 2].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRbForm(f => ({ ...f, sides: s }))}
                        className={`py-2 rounded-xl text-xs font-bold border ${
                          rbForm.sides === s ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {s} Sisi
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Baut Pen Iklan (Pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={rbForm.penIklanQty}
                    onChange={e => setRbForm(f => ({ ...f, penIklanQty: e.target.value }))}
                    placeholder="0 (4 pcs untuk akrilik)"
                    className={inpCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Rangka Hollow (m)</label>
                  <input
                    type="number"
                    step="any"
                    value={rbForm.rangkaMeter}
                    onChange={e => setRbForm(f => ({ ...f, rangkaMeter: e.target.value }))}
                    placeholder="0 m"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tiang Pipa (m)</label>
                  <input
                    type="number"
                    step="any"
                    value={rbForm.tiangMeter}
                    onChange={e => setRbForm(f => ({ ...f, tiangMeter: e.target.value }))}
                    placeholder="0 m"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Biaya Lainnya</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rbForm.extraCostRaw}
                    onChange={e => setRbForm(f => ({ ...f, extraCostRaw: formatRupiahInput(e.target.value) }))}
                    placeholder="Rp 0"
                    className={inpCls}
                  />
                </div>
              </div>

              {renderKasirResultCard({
                result: rbResult,
                customDealRaw: rbForm.customDealRaw,
                onCustomDealChange: v => setRbForm(f => ({ ...f, customDealRaw: v })),
                onReset: () => setRbForm({ boardId: 'ACP', stickerId: 'reflective_asahi', colorCount: '2', length: '', width: '', qty: '1', sides: 1, rangkaMeter: '', tiangMeter: '', penIklanQty: '0', extraCostRaw: '', extraNote: '', customDealRaw: '' }),
                summaryLines: rbResult ? [
                  ['Bahan Board:', rbResult.board.name],
                  ['Jenis Stiker & Warna:', `${rbResult.sticker.name} (${rbResult.colorLabel})`],
                  ['Ukuran & Qty:', `${rbResult.length} × ${rbResult.width} cm × ${rbResult.qty} pcs (${rbResult.sides} Sisi)`],
                  ['Harga Papan/Rambu:', formatRupiah(rbResult.boardSellPrice)],
                  ...(rbResult.rangkaSell > 0 ? [['Rangka Hollow:', `${rbResult.rangkaMeter} m (${formatRupiah(rbResult.rangkaSell)})`]] : []),
                  ...(rbResult.tiangSell > 0 ? [['Tiang Pipa:', `${rbResult.tiangMeter} m (${formatRupiah(rbResult.tiangSell)})`]] : []),
                  ...(rbResult.penSell > 0 ? [['Baut Pen Iklan:', `${rbResult.penIklanQty} pcs (${formatRupiah(rbResult.penSell)})`]] : []),
                ] : [],
                waText: (finalPrice) =>
`*Penawaran Rambu / Papan Nama - Labalaba Adv*
---------------------------------------
Bahan Board : ${rbResult.board.name}
Stiker      : ${rbResult.sticker.name} (${rbResult.colorLabel})
Ukuran      : ${rbResult.length} x ${rbResult.width} cm (${rbResult.sides} Sisi)
Jumlah      : ${rbResult.qty} pcs${rbResult.tiangMeter > 0 ? `\nTiang Pipa  : ${rbResult.tiangMeter} meter` : ''}${rbResult.penIklanQty > 0 ? `\nPen Iklan   : ${rbResult.penIklanQty} pcs` : ''}
---------------------------------------
*Total Harga: ${formatRupiah(finalPrice)}*`,
              })}
            </div>
            )
          })()}

          {/* ── TAB 5: NEONFLEX ── */}
          {active === 'neonflex' && (
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900">
                💡 <b>Panduan Cepat:</b> Cek total panjang kurva lampu di plugin <b>eCut CorelDRAW</b>, lalu masukkan angka meternya di bawah ini beserta ukuran akrilik backing.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Total Panjang Neonflex (Meter) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={nfForm.meterLength}
                    onChange={e => setNfForm(f => ({ ...f, meterLength: e.target.value }))}
                    placeholder="Misal dari eCut: 4.5"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Warna / Catatan Lampu</label>
                  <input
                    type="text"
                    value={nfForm.colorName}
                    onChange={e => setNfForm(f => ({ ...f, colorName: e.target.value }))}
                    placeholder="Warm White / Ice Blue / Pink"
                    className={inpCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Panjang Akrilik (cm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={nfForm.acrylicLength}
                    onChange={e => setNfForm(f => ({ ...f, acrylicLength: e.target.value }))}
                    placeholder="Contoh: 80"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Lebar Akrilik (cm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={nfForm.acrylicWidth}
                    onChange={e => setNfForm(f => ({ ...f, acrylicWidth: e.target.value }))}
                    placeholder="Contoh: 40"
                    className={inpCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Potongan Akrilik</label>
                  <select
                    value={nfForm.cutShape}
                    onChange={e => setNfForm(f => ({ ...f, cutShape: e.target.value }))}
                    className={inpCls}
                  >
                    <option value="kotak">Potong Kotak</option>
                    <option value="contour">Ikut Pola (+{config.neonflex?.contour_cut_pct || 15}%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Pen Iklan (Pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={nfForm.penIklanQty}
                    onChange={e => setNfForm(f => ({ ...f, penIklanQty: e.target.value }))}
                    placeholder="4"
                    className={inpCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Biaya Lainnya</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nfForm.extraCostRaw}
                    onChange={e => setNfForm(f => ({ ...f, extraCostRaw: formatRupiahInput(e.target.value) }))}
                    placeholder="Rp 0"
                    className={inpCls}
                  />
                </div>
              </div>

              {renderKasirResultCard({
                result: nfResult,
                customDealRaw: nfForm.customDealRaw,
                onCustomDealChange: v => setNfForm(f => ({ ...f, customDealRaw: v })),
                onReset: () => setNfForm({ meterLength: '', acrylicLength: '', acrylicWidth: '', cutShape: 'kotak', colorName: 'Warm White', penIklanQty: '4', extraCostRaw: '', extraNote: '', customDealRaw: '' }),
                summaryLines: nfResult ? [
                  ['Panjang Jalur LED:', `${nfResult.meterLength} meter (${nfResult.colorName}) — Include Adaptor`],
                  ['Akrilik Backing:', `${nfResult.acrylicLength} × ${nfResult.acrylicWidth} cm (${nfResult.isContour ? 'Potong Pola' : 'Potong Kotak'})`],
                  ...(nfResult.penSellPrice > 0 ? [['Baut Pen Iklan:', `${nfResult.penIklanQty} pcs (${formatRupiah(nfResult.penSellPrice)})`]] : []),
                ] : [],
                waText: (finalPrice) =>
`*Penawaran Custom Neonflex - Labalaba Adv*
---------------------------------------
Panjang LED : ${nfResult.meterLength} meter (Warna: ${nfResult.colorName})
Akrilik     : ${nfResult.acrylicLength} x ${nfResult.acrylicWidth} cm (${nfResult.isContour ? 'Cutting Pola Kontur' : 'Potong Kotak'})
Kelengkapan : Adaptor 12V + ${nfResult.penIklanQty} pcs Baut Pen Iklan
---------------------------------------
*Total Harga: ${formatRupiah(finalPrice)}*`,
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
