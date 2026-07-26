import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Device } from '@capacitor/device'
import { updateDevice } from '../services/api'

let fcmToken = null
let tokenResolve = null

export const initFCM = async () => {
  try {
    console.log('[FCM] Starting FCM initialization...')
    const info = await Device.getInfo()
    console.log('[FCM] Platform:', info.platform)
    if (info.platform !== 'android') {
      console.log('[FCM] Not on Android, skipping FCM initialization')
      return null
    }

    // Request permission
    console.log('[FCM] Checking permissions...')
    let permStatus = await PushNotifications.checkPermissions()
    console.log('[FCM] Permission status:', permStatus.receive)
    if (permStatus.receive === 'prompt') {
      console.log('[FCM] Requesting permissions...')
      permStatus = await PushNotifications.requestPermissions()
      console.log('[FCM] Permission after request:', permStatus.receive)
    }

    if (permStatus.receive !== 'granted') {
      console.log('[FCM] Push notification permission denied')
      return null
    }

    // Request local notification permission
    console.log('[FCM] Requesting local notification permission...')
    await LocalNotifications.requestPermissions()

    // Register with FCM
    console.log('[FCM] Registering with FCM...')
    await PushNotifications.register()
    console.log('[FCM] Registration called, waiting for token...')

    // Return Promise that resolves when token is received
    const tokenPromise = new Promise((resolve) => {
      tokenResolve = resolve
      
      // Timeout after 10 seconds if token not received
      setTimeout(() => {
        if (tokenResolve) {
          tokenResolve(null)
          tokenResolve = null
        }
      }, 10000)
    })

    // Get FCM token
    PushNotifications.addListener('registration', (token) => {
      console.log('[FCM] Registration successful, token:', token.value)
      fcmToken = token.value
      if (tokenResolve) {
        tokenResolve(token.value)
        tokenResolve = null
      }
    })

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[FCM] Registration error:', error.error)
      if (tokenResolve) {
        tokenResolve(null)
        tokenResolve = null
      }
    })

    // Handle incoming notifications
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('[FCM] Push notification received:', notification)

      // Get title and body from data (for data-only messages) or from notification object
      const title = notification.data?.title || notification.title || 'Notifikasi'
      const body = notification.data?.body || notification.body || ''

      // Show local notification when app is in foreground
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 2147483647,
            title: title,
            body: body,
            largeBody: body,
            schedule: { at: new Date(Date.now() + 1000) },
          }
        ]
      })
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[FCM] Push notification action performed:', notification)
    })

    const token = await tokenPromise
    return token
  } catch (error) {
    console.error('[FCM] Initialization error:', error)
    if (tokenResolve) {
      tokenResolve(null)
      tokenResolve = null
    }
    return null
  }
}

export const getFCMToken = () => fcmToken

export const registerFCMTokenToBackend = async (deviceId, token) => {
  try {
    console.log('[FCM] Attempting to register token to backend...')
    console.log('[FCM] deviceId:', deviceId)
    console.log('[FCM] token:', token ? 'present' : 'missing')
    if (!deviceId || !token) {
      console.log('[FCM] Missing deviceId or token, skipping backend registration')
      return false
    }
    await updateDevice(deviceId, { fcm_token: token })
    console.log('[FCM] Token registered to backend successfully')
    return true
  } catch (error) {
    console.error('[FCM] Failed to register token to backend:', error)
    return false
  }
}
