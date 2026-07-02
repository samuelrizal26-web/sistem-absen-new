import { useState, useEffect } from 'react'
import { getDevices, updateDevice, deleteDevice, registerDevice } from '../services/api'

export default function DeviceSettingsModal({ onClose, showToast }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDeviceId, setCurrentDeviceId] = useState('')
  const [editDevice, setEditDevice] = useState(null)
  const [role, setRole] = useState('')
  const [deviceName, setDeviceName] = useState('')

  const ROLE_OPTIONS = [
    { value: 'NONE', label: 'None' },
    { value: 'STORE_TABLET', label: 'Tablet Toko' },
    { value: 'OWNER', label: 'HP Pemilik' },
  ]

  useEffect(() => {
    loadDevices()
    // Get or generate device ID
    let deviceId = localStorage.getItem('device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_id', deviceId)
    }
    setCurrentDeviceId(deviceId)
  }, [])

  const loadDevices = async () => {
    setLoading(true)
    try {
      const data = await getDevices()
      setDevices(data)
    } catch {
      showToast('Gagal memuat devices', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    try {
      await registerDevice({
        device_id: currentDeviceId,
        device_name: deviceName || `Device ${currentDeviceId.slice(0, 8)}`,
        role: role || 'NONE'
      })
      showToast('Device berhasil diregister', 'success')
      loadDevices()
      setDeviceName('')
      setRole('')
    } catch {
      showToast('Gagal register device', 'error')
    }
  }

  const handleUpdate = async () => {
    if (!editDevice) return
    try {
      await updateDevice(editDevice.device_id, {
        device_name: deviceName || editDevice.device_name,
        role: role || editDevice.role
      })
      showToast('Device berhasil diupdate', 'success')
      loadDevices()
      setEditDevice(null)
      setDeviceName('')
      setRole('')
    } catch {
      showToast('Gagal update device', 'error')
    }
  }

  const handleDelete = async (deviceId) => {
    if (!confirm('Hapus device ini?')) return
    try {
      await deleteDevice(deviceId)
      showToast('Device berhasil dihapus', 'success')
      loadDevices()
    } catch {
      showToast('Gagal hapus device', 'error')
    }
  }

  const startEdit = (device) => {
    setEditDevice(device)
    setDeviceName(device.device_name)
    setRole(device.role)
  }

  const cancelEdit = () => {
    setEditDevice(null)
    setDeviceName('')
    setRole('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Pengaturan Perangkat</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
            ✕
          </button>
        </div>

        {/* Current Device Info */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-blue-800 font-medium mb-1">Perangkat Ini</p>
          <p className="text-xs text-blue-600 font-mono">{currentDeviceId}</p>
          <p className="text-xs text-blue-500 mt-1">
            {devices.find(d => d.device_id === currentDeviceId) ? 'Sudah diregister' : 'Belum diregister'}
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Register Perangkat Baru</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="Nama Perangkat (opsional)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Pilih Role</option>
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={editDevice ? handleUpdate : handleRegister}
              disabled={!role}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-40"
            >
              {editDevice ? 'Update Perangkat' : 'Register Perangkat'}
            </button>
            {editDevice && (
              <button
                onClick={cancelEdit}
                className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-100"
              >
                Batal Edit
              </button>
            )}
          </div>
        </div>

        {/* Device List */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Daftar Perangkat</h3>
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Belum ada perangkat</p>
          ) : (
            <div className="space-y-2">
              {devices.map(device => (
                <div key={device.device_id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{device.device_name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">{device.device_id}</p>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          device.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                          device.role === 'STORE_TABLET' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {ROLE_OPTIONS.find(r => r.value === device.role)?.label || device.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(device)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(device.device_id)}
                        className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
