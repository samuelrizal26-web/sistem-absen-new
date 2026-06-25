import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker hanya di production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration.scope)
      })
      .catch((error) => {
        console.log('SW registration failed: ', error)
      })
  })
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Unregister semua SW saat dev mode agar tidak ganggu API calls
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
}
