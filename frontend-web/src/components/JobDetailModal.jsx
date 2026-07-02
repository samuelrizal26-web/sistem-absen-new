import { useState } from 'react'
import { markJobDone, markProjectDone, archiveJob, archiveProject } from '../services/api'
import { formatRupiah, formatDate } from '../utils/format'

export default function JobDetailModal({ job, onClose, onChanged, onEdit, showToast, tab }) {
  const [busy, setBusy] = useState(false)
  const isProject = job._source === 'project'
  const isLunas = job.payment_status === 'lunas' || (job.total_price > 0 && job.dp_amount >= job.total_price) || (job.selling_price > 0 && job.dp_amount >= job.selling_price)
  const isSelesai = job.status === 'selesai' || job.progress_status === 'selesai' || job.progress_status === 'completed'
  const total = Number(job.total_price || job.selling_price || job.total_project_value || 0)
  const dp = Number(job.dp_amount || 0)
  const sisa = Math.max(total - dp, 0)

  const handleSelesai = async () => {
    setBusy(true)
    try {
      if (job._source === 'project') {
        await markProjectDone(job.id)
        showToast('Project ditandai selesai', 'success')
      } else {
        await markJobDone(job.id)
        showToast('Pekerjaan ditandai selesai', 'success')
      }
      onChanged()
      onClose()
    } catch (e) {
      showToast(e.message || 'Gagal memperbarui', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDiambil = async () => {
    setBusy(true)
    try {
      if (job._source === 'project') {
        await archiveProject(job.id)
        showToast('Project diarsipkan', 'success')
      } else {
        await archiveJob(job.id)
        showToast('Pekerjaan diarsipkan', 'success')
      }
      onChanged()
      onClose()
    } catch (e) {
      showToast(e.message || 'Gagal mengarsipkan', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className={`p-5 ${isSelesai ? 'bg-gray-500' : isLunas ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="font-bold text-lg leading-tight truncate">{job.job_name || job.project_name}</p>
              <p className="text-white/80 text-sm truncate">{job.customer_name}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 shrink-0">
              {isSelesai ? 'SELESAI' : isLunas ? 'LUNAS' : 'DP'}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">NAMA</span>
            <span className="font-semibold text-gray-800">{job.customer_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">JUDUL</span>
            <span className="font-semibold text-gray-800">{job.job_name || job.project_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">TOTAL</span>
            <span className="font-semibold text-gray-800">{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">DP</span>
            <span className="font-semibold text-gray-800">{formatRupiah(dp)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">SISA</span>
            <span className={`font-bold ${isLunas ? 'text-green-600' : 'text-orange-600'}`}>{formatRupiah(sisa)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">TANGGAL</span>
            <span className="font-medium text-gray-800">{formatDate(job.date)}</span>
          </div>
          {job.notes && (
            <div className="text-sm pt-1">
              <span className="text-gray-500 font-medium block mb-0.5">CATATAN</span>
              <p className="text-gray-700">{job.notes}</p>
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            {tab === 'aktif' && !isSelesai && (
              <button onClick={handleSelesai} disabled={busy}
                className="w-full py-3 rounded-2xl bg-blue-500 text-white font-bold hover:bg-blue-600 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                SELESAI
              </button>
            )}
            {tab === 'selesai' && (
              <button onClick={handleDiambil} disabled={busy}
                className="w-full py-3 rounded-2xl bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                DIAMBIL
              </button>
            )}
            <div className="flex gap-2.5">
              <button onClick={() => onEdit(job)} disabled={busy}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium">Edit</button>
              <button onClick={onClose} disabled={busy}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
