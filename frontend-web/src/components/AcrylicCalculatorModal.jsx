import { useState, useEffect, useMemo } from 'react'
import { getAcrylics } from '../services/api'
import { formatRupiah } from '../utils/format'

export default function AcrylicCalculatorModal({ onClose, showToast }) {
  const [acrylics, setAcrylics] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [lengthInput, setLengthInput] = useState('')
  const [widthInput, setWidthInput] = useState('')
  const [qtyInput, setQtyInput] = useState('1')

  useEffect(() => {
    loadAcrylics()
  }, [])

  const loadAcrylics = async () => {
    setLoading(true)
    try {
      const data = await getAcrylics()
      const list = Array.isArray(data) ? data : []
      setAcrylics(list)
      if (list.length > 0) {
        setSelectedId(list[0].id)
      }
    } catch {
      showToast?.('Gagal memuat katalog akrilik', 'error')
    } finally {
      setLoading(false)
    }
  }

  const selectedItem = useMemo(() => {
    return acrylics.find(a => a.id === selectedId) || null
  }, [acrylics, selectedId])

  // Perhitungan live
  const calcResult = useMemo(() => {
    if (!selectedItem) return null

    const length = parseFloat(lengthInput) || 0
    const width = parseFloat(widthInput) || 0
    const qty = Math.max(1, parseInt(qtyInput, 10) || 1)

    if (length <= 0 || width <= 0) return null

    const areaPerPcs = Math.round(length * width * 100) / 100
    const totalArea = Math.round(areaPerPcs * qty * 100) / 100

    const minArea = selectedItem.min_area_sqcm || 400.0
    const minQtyBulk = selectedItem.min_qty_bulk || 5

    const isSmallArea = areaPerPcs < minArea
    const isBulk = qty >= minQtyBulk

    let tierLabel = 'Tarif Normal'
    let rate = selectedItem.price_normal_sqcm || 0

    if (isSmallArea && !isBulk) {
      tierLabel = 'Tarif Eceran Kecil'
      rate = selectedItem.price_small_sqcm || (selectedItem.price_normal_sqcm * 1.4) || 0
    } else if (isSmallArea && isBulk) {
      tierLabel = `Tarif Normal (Partai ≥ ${minQtyBulk} pcs)`
      rate = selectedItem.price_normal_sqcm || 0
    }

    const rawTotal = areaPerPcs * rate * qty
    // Pembulatan ke atas kelipatan Rp 500
    const roundTo = 500
    const totalPrice = rawTotal > 0 ? Math.ceil(rawTotal / roundTo) * roundTo : 0
    const pricePerPcs = qty > 0 ? Math.round(totalPrice / qty) : 0

    return {
      length,
      width,
      qty,
      areaPerPcs,
      totalArea,
      isSmallArea,
      isBulk,
      minArea,
      minQtyBulk,
      tierLabel,
      rate,
      totalPrice,
      pricePerPcs,
    }
  }, [selectedItem, lengthInput, widthInput, qtyInput])

  const handleCopyWhatsApp = () => {
    if (!calcResult || !selectedItem) return

    const text = 
`*Penawaran Harga Akrilik - Labalaba Advertising*
---------------------------------------
Bahan    : ${selectedItem.name} ${selectedItem.thickness}${selectedItem.color ? ` (${selectedItem.color})` : ''}
Ukuran   : ${calcResult.length} x ${calcResult.width} cm
Luas     : ${calcResult.areaPerPcs.toLocaleString('id-ID')} cm²
Jumlah   : ${calcResult.qty} pcs
Kategori : ${calcResult.tierLabel}
---------------------------------------
*Total   : ${formatRupiah(calcResult.totalPrice)}*${calcResult.qty > 1 ? ` (@ ${formatRupiah(calcResult.pricePerPcs)})` : ''}

_Harga dapat berubah sewaktu-waktu._`

    navigator.clipboard?.writeText(text).then(() => {
      showToast?.('Rincian penawaran disalin! Siap paste ke WhatsApp', 'success')
    }).catch(() => {
      showToast?.('Gagal menyalin teks ke clipboard', 'error')
    })
  }

  const handleReset = () => {
    setLengthInput('')
    setWidthInput('')
    setQtyInput('1')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between text-white"
          style={{ background: 'linear-gradient(135deg, #0A4D68 0%, #088395 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Kalkulator Akrilik</h2>
              <p className="text-xs text-white/80">Hitung cepat harga potongan untuk customer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <svg className="w-8 h-8 animate-spin mx-auto text-primary mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Memuat data bahan akrilik...
            </div>
          ) : acrylics.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="font-semibold text-gray-600 mb-1">Belum ada katalog akrilik</p>
              <p className="text-xs">Silakan input data bahan akrilik terlebih dahulu di menu Admin.</p>
            </div>
          ) : (
            <>
              {/* 1. Pilih Bahan */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">1. Pilih Jenis & Tebal Bahan</label>
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-50"
                >
                  {acrylics.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.thickness} {item.color ? `(${item.color})` : ''} — Normal: {formatRupiah(item.price_normal_sqcm)}/cm²
                    </option>
                  ))}
                </select>
                {selectedItem && (
                  <div className="flex gap-2 mt-1.5 text-[11px] text-gray-500 flex-wrap">
                    <span>Normal: <b>{formatRupiah(selectedItem.price_normal_sqcm)}/cm²</b></span>
                    <span>•</span>
                    <span>Eceran &lt;{selectedItem.min_area_sqcm}cm²: <b>{formatRupiah(selectedItem.price_small_sqcm)}/cm²</b></span>
                    <span>•</span>
                    <span>Partai: <b>≥ {selectedItem.min_qty_bulk} pcs</b></span>
                  </div>
                )}
              </div>

              {/* 2. Ukuran & Qty */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">2. Masukkan Ukuran (cm) & Jumlah</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-500 block mb-1">Panjang (cm)</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={lengthInput}
                      onChange={e => setLengthInput(e.target.value)}
                      placeholder="Contoh: 30"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block mb-1">Lebar (cm)</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={widthInput}
                      onChange={e => setWidthInput(e.target.value)}
                      placeholder="Contoh: 40"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block mb-1">Jumlah (Pcs)</span>
                    <input
                      type="number"
                      min="1"
                      value={qtyInput}
                      onChange={e => setQtyInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Hasil Perhitungan */}
              {calcResult && (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-medium">Hasil Perhitungan:</span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                      calcResult.tierLabel.includes('Eceran')
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {calcResult.tierLabel}
                    </span>
                  </div>

                  {/* Highlight Box */}
                  <div className="bg-white rounded-xl p-3 border border-cyan-100 text-center shadow-sm">
                    <p className="text-xs text-gray-500 mb-0.5">Total Harga Jual ke Customer</p>
                    <p className="text-2xl font-black text-cyan-800">
                      {formatRupiah(calcResult.totalPrice)}
                    </p>
                    {calcResult.qty > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        (@ {formatRupiah(calcResult.pricePerPcs)} / pcs)
                      </p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-xs text-gray-600 pt-1 border-t border-cyan-100">
                    <div className="flex justify-between">
                      <span>Luas per pcs:</span>
                      <span className="font-semibold text-gray-800">{calcResult.areaPerPcs.toLocaleString('id-ID')} cm²</span>
                    </div>
                    {calcResult.qty > 1 && (
                      <div className="flex justify-between">
                        <span>Total luas ({calcResult.qty} pcs):</span>
                        <span className="font-semibold text-gray-800">{calcResult.totalArea.toLocaleString('id-ID')} cm²</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tarif yang berlaku:</span>
                      <span className="font-semibold text-gray-800">{formatRupiah(calcResult.rate)} / cm²</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCopyWhatsApp}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z"/>
                      </svg>
                      Salin ke WhatsApp
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
