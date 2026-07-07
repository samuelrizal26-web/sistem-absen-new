import { PushNotifications } from '@capacitor/push-notifications'
import { Device } from '@capacitor/device'

let fcmToken = null

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

    // Get FCM token
    PushNotifications.addListener('registration', (token) => {
      console.log('[FCM] Registration successful, token:', token.value)
      fcmToken = token.value
      return token.value
    })

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[FCM] Registration error:', error.error)
    })

    // Handle incoming notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Push notification received:', notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[FCM] Push notification action performed:', notification)
    })

    return fcmToken
  } catch (error) {
    console.error('[FCM] Initialization error:', error)
    return null
  }
}

export const getFCMToken = () => fcmToken
