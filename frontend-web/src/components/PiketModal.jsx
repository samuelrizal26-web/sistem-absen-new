import { useState, useEffect } from 'react'
import { getPiketGroup, rotatePiket } from '../services/api'

export default function PiketModal({ groupId, onClose, showToast }) {
  const [groupData, setGroupData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    loadGroupData()
  }, [groupId])

  const loadGroupData = async () => {
    setLoading(true)
    try {
      const data = await getPiketGroup(groupId)
      setGroupData(data)
    } catch (e) {
      showToast('Gagal memuat data piket', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRotate = async () => {
    setRotating(true)
    try {
      await rotatePiket(groupId)
      showToast('Piket berhasil dirotasi', 'success')
      await loadGroupData()
    } catch (e) {
      showToast('Gagal rotasi piket', 'error')
    } finally {
      setRotating(false)
    }
  }

  const getCurrentEmployee = () => {
    if (!groupData || !groupData.employees || groupData.employees.length === 0) return null
    const currentIndex = groupData.current_index || 0
    return groupData.employees[currentIndex]
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
          <p className="text-center text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!groupData) {
    return null
  }

  const currentEmployee = getCurrentEmployee()

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">{groupData.title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="bg-yellow-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-yellow-800 font-medium mb-1">Sedang Bertugas:</p>
          {currentEmployee ? (
            <p className="text-2xl font-bold text-yellow-900">{currentEmployee.name}</p>
          ) : (
            <p className="text-sm text-yellow-600">Tidak ada anggota</p>
          )}
        </div>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-700">Daftar Anggota:</h3>
          {groupData.employees && groupData.employees.map((emp, index) => (
            <div key={emp.id} className={`flex justify-between items-center p-3 rounded-xl ${index === (groupData.current_index || 0) ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-50'}`}>
              <p className="text-sm font-medium">{emp.name}</p>
              {index === (groupData.current_index || 0) && (
                <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">Bertugas</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleRotate}
          disabled={rotating || !groupData.employees || groupData.employees.length === 0}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {rotating ? 'Memproses...' : 'Selesai → Rotasi ke Anggota Berikutnya'}
        </button>
      </div>
    </div>
  )
}
