// Browser Notification Utility
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Browser tidak mendukung notifikasi')
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

export const showNotification = (title, body, icon = '/icon-512.png') => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon,
      badge: '/icon-192.png',
      vibrate: [200, 100, 200]
    })
  }
}

export const initNotifications = async () => {
  await requestNotificationPermission()
}
