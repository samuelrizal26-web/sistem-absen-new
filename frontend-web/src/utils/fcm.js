import { PushNotifications } from '@capacitor/push-notifications'
import { Device } from '@capacitor/device'
import { updateDevice } from '../services/api'

let fcmToken = null
let tokenResolve = null

export const initFCM = async () => {
  try {
    const info = await Device.getInfo()
    if (info.platform !== 'android') {
      console.log('[FCM] Not on Android, skipping FCM initialization')
      return null
    }

    // Request permission
    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }

    if (permStatus.receive !== 'granted') {
      console.log('[FCM] Push notification permission denied')
      return null
    }

    // Register with FCM
    await PushNotifications.register()

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
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Push notification received:', notification)
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
