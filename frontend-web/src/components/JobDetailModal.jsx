import { useState } from 'react'
import { markJobDone, deleteJob } from '../services/api'
import { formatRupiah, formatDate } from '../utils/format'

export default function JobDetailModal({ job, onClose, onChanged, onEdit, showToast }) {
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isLunas = job.payment_status === 'lunas'
  const total = Number(job.total_price || 0)
  const dp = Number(job.dp_amount || 0)
  const sisa = Math.max(total - dp, 0)

  const handleDone = async () => {
    setBusy(true)
    try {
      await markJobDone(job.id)
      showToast('Pekerjaan ditandai selesai', 'success')
      onChanged()
      onClose()
    } catch (e) {
      showToast(e.message || 'Gagal memperbarui', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteJob(job.id)
      showToast('Pekerjaan dihapus', 'success')
      onChanged()
      onClose()
    } catch (e) {
      showToast(e.message || 'Gagal menghapus', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className={`p-5 ${isLunas ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="font-bold text-lg leading-tight truncate">{job.job_name}</p>
              <p className="text-white/80 text-sm truncate">{job.customer_name}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 shrink-0">
              {isLunas ? 'LUNAS' : 'DP'}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tanggal</span>
            <span className="font-medium text-gray-800">{formatDate(job.date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Harga</span>
            <span className="font-medium text-gray-800">{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">DP Dibayar</span>
            <span className="font-medium text-gray-800">{formatRupiah(dp)}</span>
          </div>
          {!isLunas && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sisa</span>
              <span className="font-bold text-orange-600">{formatRupiah(sisa)}</span>
            </div>
          )}
          {job.notes && (
            <div className="text-sm pt-1">
              <span className="text-gray-500 block mb-0.5">Catatan</span>
              <p className="text-gray-700">{job.notes}</p>
            </div>
          )}

          {!confirmDelete ? (
            <div className="space-y-2.5 pt-2">
              <button onClick={handleDone} disabled={busy}
                className="w-full py-3 rounded-2xl bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tandai Selesai / Sudah Diambil
              </button>
              <div className="flex gap-2.5">
                <button onClick={() => onEdit(job)} disabled={busy}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium">Edit</button>
                <button onClick={() => setConfirmDelete(true)} disabled={busy}
                  className="flex-1 py-3 rounded-2xl border border-red-200 text-red-600 font-medium">Hapus</button>
              </div>
              <button onClick={onClose} className="w-full py-2.5 text-gray-400 text-sm">Tutup</button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              <p className="text-center text-sm text-gray-600">Yakin hapus pekerjaan ini?</p>
              <div className="flex gap-2.5">
                <button onClick={() => setConfirmDelete(false)} disabled={busy}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium">Batal</button>
                <button onClick={handleDelete} disabled={busy}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold disabled:opacity-40">
                  {busy ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
