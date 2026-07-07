import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import SplashScreen from './pages/SplashScreen'
import HomeScreen from './pages/HomeScreen'
import PrintJobPage from './pages/PrintJobPage'
import CashflowPage from './pages/CashflowPage'
import ProjectPage from './pages/ProjectPage'
import AdminPage from './pages/AdminPage'
import KasbonDashboard from './pages/KasbonDashboard'
import ScreenSaver from './components/ScreenSaver'
import { initFCM } from './utils/fcm'

export default function App() {
  useEffect(() => {
    initFCM()
  }, [])

  return (
    <BrowserRouter>
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
      <ScreenSaver />
    </BrowserRouter>
  )
}
