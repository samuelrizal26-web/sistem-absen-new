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
    { value: 'NONE', label: 'Belum Diatur (Nonaktif)' },
    { value: 'STORE_TABLET', label: 'Tablet Toko (Tanpa Notif)' },
    { value: 'OWNER', label: 'HP Pemilik (Menerima Notif)' },
  ]

  useEffect(() => {
    loadDevices()
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
    } catch (e) {
      showToast(e.message || 'Gagal register device', 'error')
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
    } catch (e) {
      showToast(e.message || 'Gagal update device', 'error')
    }
  }

  const handleDelete = async (deviceId) => {
    if (!confirm('Hapus device ini?')) return
    try {
      await deleteDevice(deviceId)
      showToast('Device berhasil dihapus', 'success')
      loadDevices()
    } catch (e) {
      showToast(e.message || 'Gagal hapus device', 'error')
    }
  }

  const startEdit = (device) => {
    setEditDevice(device)
    setDeviceName(device.device_name || '')
    setRole(device.role || 'NONE')
  }

  const cancelEdit = () => {
    setEditDevice(null)
    setDeviceName('')
    setRole('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Pengaturan Perangkat</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
            ✕
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-5 text-xs text-amber-900 leading-relaxed">
          🔔 <b>Aturan Notifikasi:</b> Hanya perangkat bertipe <b>HP Pemilik</b> yang akan menerima notifikasi kasbon dan pesanan baru. Perangkat <b>Tablet Toko</b> dan <b>Belum Diatur</b> tidak menerima notifikasi.
        </div>

        {/* Current Device Info */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-5 border border-blue-100">
          <p className="text-xs text-blue-800 font-semibold mb-1">Perangkat Ini</p>
          <p className="text-xs text-blue-600 font-mono break-all">{currentDeviceId}</p>
          <p className="text-xs text-blue-500 mt-1 font-medium">
            Status: {devices.find(d => d.device_id === currentDeviceId) ? 'Sudah terdaftar di database' : 'Belum terdaftar'}
          </p>
        </div>

        {/* Form Register / Edit */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            {editDevice ? `Edit Perangkat (${editDevice.device_name || editDevice.device_id.slice(0, 8)})` : 'Set / Register Perangkat Ini'}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="Nama Perangkat (misal: Tablet Kasir Depan / HP Owner)"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Pilih Role</option>
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={editDevice ? handleUpdate : handleRegister}
              disabled={!role}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {editDevice ? 'Simpan Perubahan' : 'Register / Perbarui Perangkat Ini'}
            </button>
            {editDevice && (
              <button
                onClick={cancelEdit}
                className="w-full py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Batal Edit
              </button>
            )}
          </div>
        </div>

        {/* Device List */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-700">Daftar Perangkat Aktif (14 Hari Terakhir)</h3>
            <span className="text-xs text-gray-400 font-medium">{devices.length} perangkat</span>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Memuat data perangkat...</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-2xl">Belum ada perangkat yang aktif</p>
          ) : (
            <div className="space-y-2.5">
              {devices.map(device => (
                <div key={device.device_id} className={`border rounded-xl p-3.5 transition-all ${device.device_id === currentDeviceId ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 truncate">{device.device_name || 'Tanpa Nama'}</p>
                        {device.device_id === currentDeviceId && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">Perangkat Ini</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{device.device_id}</p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          device.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                          device.role === 'STORE_TABLET' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {ROLE_OPTIONS.find(r => r.value === device.role)?.label || device.role}
                        </span>
                        <span className={`text-[11px] font-mono ${device.fcm_token ? 'text-green-600' : 'text-gray-400'}`}>
                          {device.fcm_token ? '✓ Notif Siap' : '✗ FCM Belum Siap'}
                        </span>
                      </div>
                      {device.last_active && (
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          Terakhir aktif: {new Date(device.last_active).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => startEdit(device)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(device.device_id)}
                        className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
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
