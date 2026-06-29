import { useState } from 'react'
import { createJob, updateJob } from '../services/api'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../utils/format'

export default function JobFormModal({ job, onClose, onSaved, showToast }) {
  const isEdit = !!job
  const [customerName, setCustomerName] = useState(job?.customer_name || '')
  const [jobName, setJobName] = useState(job?.job_name || '')
  const [totalRaw, setTotalRaw] = useState(job?.total_price ? formatRupiahInput(String(job.total_price)) : '')
  const [dpRaw, setDpRaw] = useState(job?.dp_amount ? formatRupiahInput(String(job.dp_amount)) : '')
  const [date, setDate] = useState(job?.date || new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(job?.notes || '')
  const [saving, setSaving] = useState(false)

  const total = parseRupiahInput(totalRaw) || 0
  const dp = parseRupiahInput(dpRaw) || 0
  const sisa = Math.max(total - dp, 0)
  const isLunas = total > 0 && dp >= total

  const handleSave = async () => {
    if (!customerName.trim()) { showToast('Nama pelanggan wajib diisi', 'error'); return }
    if (!jobName.trim()) { showToast('Judul pekerjaan wajib diisi', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        customer_name: customerName.trim(),
        job_name: jobName.trim(),
        total_price: total,
        dp_amount: dp,
        date,
        notes: notes.trim(),
      }
      if (isEdit) await updateJob(job.id, payload)
      else await createJob(payload)
      showToast(isEdit ? 'Pekerjaan diperbarui' : 'Pekerjaan ditambahkan', 'success')
      onSaved()
      onClose()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan pekerjaan', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-3.5 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-gray-800 text-center">{isEdit ? 'Edit Pekerjaan' : 'Tambah Pekerjaan'}</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan *</label>
          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nama pelanggan"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judul Pekerjaan *</label>
          <input type="text" value={jobName} onChange={e => setJobName(e.target.value)} placeholder="Mis. Spanduk 3x1m"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Harga</label>
            <input type="text" inputMode="numeric" value={totalRaw}
              onChange={e => setTotalRaw(formatRupiahInput(e.target.value))} placeholder="0"
              className="w-full px-3 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DP Dibayar</label>
            <input type="text" inputMode="numeric" value={dpRaw}
              onChange={e => setDpRaw(formatRupiahInput(e.target.value))} placeholder="0"
              className="w-full px-3 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {total > 0 && (
          <div className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm ${isLunas ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
            <span className="font-semibold">{isLunas ? 'LUNAS' : 'BELUM LUNAS (DP)'}</span>
            {!isLunas && <span>Sisa: {formatRupiah(sisa)}</span>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Detail tambahan..."
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium">Batal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark disabled:opacity-40 transition-all">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
