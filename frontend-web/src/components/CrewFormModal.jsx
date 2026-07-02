import { useState } from 'react'
import { createEmployee } from '../services/api'

export default function CrewFormModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    pin: '',
    birthdate: '',
    birthplace: '',
    photo: '',
  })
  const [showPin, setShowPin] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name || !form.whatsapp || !form.pin || !form.birthdate || !form.birthplace) {
      showToast('Lengkapi semua field wajib', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        status_crew: 'Tetap',
        monthly_salary: 0,
        work_hours_per_day: 8,
        position: '',
      }
      await createEmployee(payload)
      showToast('Anggota berhasil ditambahkan!', 'success')
      onSaved()
      onClose()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-3.5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Tambah Anggota</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
        </div>

        {/* Photo Upload */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200 relative">
            {form.photo ? (
              <img src={form.photo} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <label className="mt-2 text-sm text-purple-600 font-medium cursor-pointer hover:text-purple-700">
            Upload Foto
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files[0]
              if (file) {
                const reader = new FileReader()
                reader.onloadend = () => setForm(f => ({ ...f, photo: reader.result }))
                reader.readAsDataURL(file)
              }
            }} />
          </label>
          {form.photo && (
            <button onClick={() => setForm(f => ({ ...f, photo: '' }))} className="text-xs text-red-500 mt-1 hover:text-red-600">
              Hapus Foto
            </button>
          )}
        </div>

        {[['Nama *', 'name', 'text'], ['No WhatsApp *', 'whatsapp', 'tel'], ['Tempat Lahir *', 'birthplace', 'text']].map(([label, field, type]) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PIN (6 digit) *</label>
          <div className="relative">
            <input type={showPin ? 'text' : 'password'} inputMode="numeric" value={form.pin} maxLength={6}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              placeholder="Masukkan 6 digit PIN"
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
            <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPin ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir *</label>
          <input type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium">Batal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-40 transition-all">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
