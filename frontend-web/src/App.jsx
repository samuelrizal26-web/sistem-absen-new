import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SplashScreen from './pages/SplashScreen'
import HomeScreen from './pages/HomeScreen'
import PrintJobPage from './pages/PrintJobPage'
import CashflowPage from './pages/CashflowPage'
import ProjectPage from './pages/ProjectPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/print" element={<PrintJobPage />} />
        <Route path="/cashflow" element={<CashflowPage />} />
        <Route path="/project" element={<ProjectPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
