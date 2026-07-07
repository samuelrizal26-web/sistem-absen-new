import { useState, useEffect } from 'react'
import {
  getFloatingMenu, createFloatingMenuItem, updateFloatingMenuItem, deleteFloatingMenuItem,
  getPiketGroups, createPiketGroup, updatePiketGroup, deletePiketGroup, rotatePiket, getPiketGroup
} from '../services/api'

export default function FloatingMenuSettings({ onClose, showToast, employees }) {
  const [activeTab, setActiveTab] = useState('menu') // 'menu' or 'piket'
  const [menuItems, setMenuItems] = useState([])
  const [piketGroups, setPiketGroups] = useState([])
  const [loading, setLoading] = useState(true)

  // Menu item form state
  const [menuItemForm, setMenuItemForm] = useState({ title: '', type: 'navigation', target: '', icon: '', order: 0 })
  const [editingMenuItem, setEditingMenuItem] = useState(null)

  // Piket group form state
  const [piketGroupForm, setPiketGroupForm] = useState({ title: '', employee_ids: [] })
  const [editingPiketGroup, setEditingPiketGroup] = useState(null)
  const [selectedPiketGroup, setSelectedPiketGroup] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [menuData, piketData] = await Promise.all([getFloatingMenu(), getPiketGroups()])
      setMenuItems(menuData)
      setPiketGroups(piketData)
    } catch {
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Menu item handlers
  const handleCreateMenuItem = async () => {
    if (!menuItemForm.title || !menuItemForm.type) {
      showToast('Judul dan tipe harus diisi', 'error')
      return
    }
    try {
      await createFloatingMenuItem(menuItemForm)
      showToast('Menu item berhasil ditambahkan', 'success')
      setMenuItemForm({ title: '', type: 'navigation', target: '', icon: '', order: 0 })
      loadData()
    } catch {
      showToast('Gagal menambah menu item', 'error')
    }
  }

  const handleUpdateMenuItem = async () => {
    if (!editingMenuItem) return
    try {
      await updateFloatingMenuItem(editingMenuItem.id, menuItemForm)
      showToast('Menu item berhasil diupdate', 'success')
      setEditingMenuItem(null)
      setMenuItemForm({ title: '', type: 'navigation', target: '', icon: '', order: 0 })
      loadData()
    } catch {
      showToast('Gagal update menu item', 'error')
    }
  }

  const handleDeleteMenuItem = async (itemId) => {
    if (!confirm('Hapus menu item ini?')) return
    try {
      await deleteFloatingMenuItem(itemId)
      showToast('Menu item berhasil dihapus', 'success')
      loadData()
    } catch {
      showToast('Gagal hapus menu item', 'error')
    }
  }

  const startEditMenuItem = (item) => {
    setEditingMenuItem(item)
    setMenuItemForm({ title: item.title, type: item.type, target: item.target, icon: item.icon, order: item.order })
  }

  const cancelEditMenuItem = () => {
    setEditingMenuItem(null)
    setMenuItemForm({ title: '', type: 'navigation', target: '', icon: '', order: 0 })
  }

  // Piket group handlers
  const handleCreatePiketGroup = async () => {
    if (!piketGroupForm.title || piketGroupForm.employee_ids.length === 0) {
      showToast('Judul dan minimal 1 anggota harus diisi', 'error')
      return
    }
    try {
      await createPiketGroup(piketGroupForm)
      showToast('Piket group berhasil ditambahkan', 'success')
      setPiketGroupForm({ title: '', employee_ids: [] })
      loadData()
    } catch {
      showToast('Gagal menambah piket group', 'error')
    }
  }

  const handleUpdatePiketGroup = async () => {
    if (!editingPiketGroup) return
    try {
      await updatePiketGroup(editingPiketGroup.id, piketGroupForm)
      showToast('Piket group berhasil diupdate', 'success')
      setEditingPiketGroup(null)
      setPiketGroupForm({ title: '', employee_ids: [] })
      loadData()
    } catch {
      showToast('Gagal update piket group', 'error')
    }
  }

  const handleDeletePiketGroup = async (groupId) => {
    if (!confirm('Hapus piket group ini?')) return
    try {
      await deletePiketGroup(groupId)
      showToast('Piket group berhasil dihapus', 'success')
      loadData()
    } catch {
      showToast('Gagal hapus piket group', 'error')
    }
  }

  const startEditPiketGroup = (group) => {
    setEditingPiketGroup(group)
    setPiketGroupForm({ title: group.title, employee_ids: group.employee_ids })
  }

  const cancelEditPiketGroup = () => {
    setEditingPiketGroup(null)
    setPiketGroupForm({ title: '', employee_ids: [] })
  }

  const toggleEmployeeSelection = (empId) => {
    if (piketGroupForm.employee_ids.includes(empId)) {
      setPiketGroupForm(prev => ({ ...prev, employee_ids: prev.employee_ids.filter(id => id !== empId) }))
    } else {
      setPiketGroupForm(prev => ({ ...prev, employee_ids: [...prev.employee_ids, empId] }))
    }
  }

  const handleViewPiketGroup = async (group) => {
    try {
      const data = await getPiketGroup(group.id)
      setSelectedPiketGroup(data)
    } catch {
      showToast('Gagal memuat detail piket group', 'error')
    }
  }

  const handleRotatePiket = async () => {
    if (!selectedPiketGroup) return
    try {
      await rotatePiket(selectedPiketGroup.id)
      showToast('Piket berhasil dirotasi', 'success')
      const data = await getPiketGroup(selectedPiketGroup.id)
      setSelectedPiketGroup(data)
      loadData()
    } catch {
      showToast('Gagal rotasi piket', 'error')
    }
  }

  const getCurrentPiketEmployee = () => {
    if (!selectedPiketGroup || !selectedPiketGroup.employees || selectedPiketGroup.employees.length === 0) return null
    const currentIndex = selectedPiketGroup.current_index || 0
    return selectedPiketGroup.employees[currentIndex]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Pengaturan Tombol Mengambang</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-3 rounded-xl font-semibold ${activeTab === 'menu' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab('piket')}
            className={`flex-1 py-3 rounded-xl font-semibold ${activeTab === 'piket' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Jadwal Piket
          </button>
        </div>

        {activeTab === 'menu' ? (
          <div>
            {/* Menu Item Form */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                {editingMenuItem ? 'Edit Menu Item' : 'Tambah Menu Item Baru'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={menuItemForm.title}
                  onChange={e => setMenuItemForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Judul (misal: PrintJob)"
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <select
                  value={menuItemForm.type}
                  onChange={e => setMenuItemForm(prev => ({ ...prev, type: e.target.value }))}
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="navigation">Navigasi</option>
                  <option value="piket">Jadwal Piket</option>
                </select>
                <input
                  type="text"
                  value={menuItemForm.target}
                  onChange={e => setMenuItemForm(prev => ({ ...prev, target: e.target.value }))}
                  placeholder="Target (halaman atau piket group ID)"
                  className="col-span-2 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  type="number"
                  value={menuItemForm.order}
                  onChange={e => setMenuItemForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  placeholder="Urutan"
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={editingMenuItem ? handleUpdateMenuItem : handleCreateMenuItem}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  {editingMenuItem ? 'Update' : 'Tambah'}
                </button>
                {editingMenuItem && (
                  <button
                    onClick={cancelEditMenuItem}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-100"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>

            {/* Menu Items List */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">Daftar Menu Items</h3>
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
              ) : menuItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada menu item</p>
              ) : (
                <div className="space-y-2">
                  {menuItems.map(item => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-500">Type: {item.type} | Target: {item.target}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditMenuItem(item)}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.id)}
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
        ) : (
          <div>
            {/* Piket Group Form */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                {editingPiketGroup ? 'Edit Piket Group' : 'Tambah Piket Group Baru'}
              </h3>
              <input
                type="text"
                value={piketGroupForm.title}
                onChange={e => setPiketGroupForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Judul (misal: PIKET GALON)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
              />
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 mb-3">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={piketGroupForm.employee_ids.includes(emp.id)}
                      onChange={() => toggleEmployeeSelection(emp.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{emp.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={editingPiketGroup ? handleUpdatePiketGroup : handleCreatePiketGroup}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                >
                  {editingPiketGroup ? 'Update' : 'Tambah'}
                </button>
                {editingPiketGroup && (
                  <button
                    onClick={cancelEditPiketGroup}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-100"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>

            {/* Piket Groups List */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">Daftar Jadwal Piket</h3>
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
              ) : piketGroups.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada jadwal piket</p>
              ) : (
                <div className="space-y-2">
                  {piketGroups.map(group => (
                    <div key={group.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{group.title}</p>
                          <p className="text-xs text-gray-500">{group.employee_ids.length} anggota</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewPiketGroup(group)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            Lihat
                          </button>
                          <button
                            onClick={() => startEditPiketGroup(group)}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePiketGroup(group.id)}
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
        )}
      </div>

      {/* Piket Detail Modal */}
      {selectedPiketGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">{selectedPiketGroup.title}</h2>
              <button onClick={() => setSelectedPiketGroup(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-1">Sedang Bertugas:</p>
              {getCurrentPiketEmployee() ? (
                <p className="text-2xl font-bold text-yellow-900">{getCurrentPiketEmployee().name}</p>
              ) : (
                <p className="text-sm text-yellow-600">Tidak ada anggota</p>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-bold text-gray-700">Daftar Anggota:</h3>
              {selectedPiketGroup.employees && selectedPiketGroup.employees.map((emp, index) => (
                <div key={emp.id} className={`flex justify-between items-center p-3 rounded-xl ${index === (selectedPiketGroup.current_index || 0) ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium">{emp.name}</p>
                  {index === (selectedPiketGroup.current_index || 0) && (
                    <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">Bertugas</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleRotatePiket}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
            >
              Selesai → Rotasi ke Anggota Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
