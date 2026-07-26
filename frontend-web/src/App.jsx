import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import SplashScreen from './pages/SplashScreen'
import HomeScreen from './pages/HomeScreen'
import PrintJobPage from './pages/PrintJobPage'
import CashflowPage from './pages/CashflowPage'
import ProjectPage from './pages/ProjectPage'
import AdminPage from './pages/AdminPage'
import KasbonDashboard from './pages/KasbonDashboard'
import ScreenSaver from './components/ScreenSaver'
import { initFCM, registerFCMTokenToBackend } from './utils/fcm'
import { registerDevice } from './services/api'

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const initFCMAndRegister = async () => {
      try {
        console.log('[App] Starting FCM and device registration...')
        console.log('[App] Is native platform:', Capacitor.isNativePlatform())
        const token = await initFCM()
        console.log('[App] FCM token received:', token ? 'YES' : 'NO')
        if (token) {
          const info = await Device.getInfo()
          // Generate or get device ID from localStorage
          let deviceId = localStorage.getItem('device_id')
          if (!deviceId) {
            deviceId = crypto.randomUUID()
            localStorage.setItem('device_id', deviceId)
          }
          console.log('[App] Device ID:', deviceId)
          console.log('[App] Device info:', JSON.stringify(info))
          if (deviceId) {
            await registerDevice({ device_id: deviceId, device_name: info.model, role: 'OWNER', fcm_token: token })
            await registerFCMTokenToBackend(deviceId, token)
          } else {
            console.log('[App] No device ID, skipping registration')
          }
        } else {
          console.log('[App] No FCM token received, skipping device registration')
        }
      } catch (error) {
        console.error('[App] FCM initialization error:', error)
      }
    }
    initFCMAndRegister()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const handleBackButton = () => {
      if (location.pathname === '/') {
        CapacitorApp.exitApp()
      } else if (location.pathname === '/home') {
        CapacitorApp.exitApp()
      } else {
        navigate(-1)
      }
    }

    const listener = CapacitorApp.addListener('backButton', handleBackButton)

    return () => {
      listener.then(f => f.remove())
    }
  }, [location, navigate])

  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/home" element={<HomeScreen />} />
      <Route path="/print" element={<PrintJobPage />} />
      <Route path="/cashflow" element={<CashflowPage />} />
      <Route path="/project" element={<ProjectPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/kasbon-dashboard" element={<KasbonDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <ScreenSaver />
    </BrowserRouter>
  )
}
