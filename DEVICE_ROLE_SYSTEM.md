# Device Role System - Technical Specification

## Overview
The Device Role System enables role-based push notifications for the Labalaba application. Devices are assigned roles (NONE, STORE_TABLET, OWNER) that determine which notifications they receive.

## Architecture

### Concepts
- **Device Role**: Classification of a physical device (tablet, phone)
- **Device ID**: Unique identifier for each physical device (stored in localStorage)
- **Role-Based Routing**: Notifications are sent to devices based on their assigned role
- **No User Accounts**: This is NOT a user authentication system - it's device-based

### Device Roles
- **NONE**: Default role, no special features
- **STORE_TABLET**: Tablet located at the store
- **OWNER**: Owner's personal phone

## Database Schema

### Collection: `devices`
```javascript
{
  "id": "unique_id",                    // Primary key
  "device_id": "unique_device_identifier", // From localStorage (UUID)
  "device_name": "My Tablet",           // Human-readable name
  "role": "STORE_TABLET|OWNER|NONE",   // Device role
  "last_active": "2024-01-01T00:00:00Z", // Last activity timestamp
  "created_at": "2024-01-01T00:00:00Z"  // Registration timestamp
}
```

## Backend Endpoints

### Device Management

#### POST /api/devices
Register a new device or update existing device.

**Request Body:**
```json
{
  "device_id": "uuid-from-localstorage",
  "device_name": "My Tablet",
  "role": "STORE_TABLET"
}
```

**Response:**
```json
{
  "id": "device_id",
  "device_id": "uuid-from-localstorage",
  "device_name": "My Tablet",
  "role": "STORE_TABLET",
  "last_active": "2024-01-01T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### GET /api/devices
Get all registered devices.

**Response:**
```json
[
  {
    "id": "device_id",
    "device_id": "uuid",
    "device_name": "My Tablet",
    "role": "STORE_TABLET",
    "last_active": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### PUT /api/devices/{device_id}
Update device role or name.

**Request Body:**
```json
{
  "device_name": "Updated Name",
  "role": "OWNER"
}
```

#### DELETE /api/devices/{device_id}
Delete a device.

**Response:**
```json
{
  "message": "Device dihapus"
}
```

#### GET /api/devices/by-role/{role}
Get all devices with specific role.

**Response:**
```json
[
  {
    "id": "device_id",
    "device_id": "uuid",
    "device_name": "Owner Phone",
    "role": "OWNER",
    "last_active": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Notification Routing

#### Notification Helper Function
```python
async def send_notification_to_role(role: str, title: str, body: str, data: dict = None):
    """Send push notification to all devices with specified role"""
```

**Current Implementation:** Placeholder that logs to console

**Future Implementation:** Will use FCM to send actual push notifications

#### Kasbon Notifications

**POST /api/kasbon**
When an employee submits a kasbon request:
- Sends notification to all devices with role `OWNER`
- Title: "Permintaan Kasbon Baru"
- Body: "{Employee Name} meminta kasbon Rp {amount}"
- Data: `{ type: 'kasbon_request', kasbon_id: '...' }`

**POST /api/kasbon/settle/{emp_id}**
When owner approves kasbon:
- Sends notification to all devices with role `STORE_TABLET`
- Title: "Kasbon Disetujui"
- Body: "Kasbon untuk {Employee Name} telah disetujui"
- Data: `{ type: 'kasbon_approved', employee_id: '...' }`

## Frontend Implementation

### Device Settings UI
**Location:** Admin Page → Settings Tab → "Pengaturan Perangkat"

**Features:**
- Display current device ID (from localStorage)
- Register/update device role
- View all registered devices
- Edit device name and role
- Delete devices
- Visual role badges (purple for OWNER, blue for STORE_TABLET, gray for NONE)

### API Functions
```javascript
registerDevice(data)  // POST /api/devices
getDevices()          // GET /api/devices
updateDevice(id, data)// PUT /api/devices/{id}
deleteDevice(id)      // DELETE /api/devices/{id}
getDevicesByRole(role)// GET /api/devices/by-role/{role}
```

### Device ID Management
```javascript
// On app initialization
let deviceId = localStorage.getItem('device_id')
if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem('device_id', deviceId)
}
```

## Future FCM Integration Plan

### Prerequisites
1. Firebase project created in Firebase Console
2. Firebase configuration obtained:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId
3. Service account key downloaded for backend
4. `firebase-admin` package installed in backend
5. `firebase` package installed in frontend

### Backend Changes

#### 1. Install Firebase Admin SDK
```bash
pip install firebase-admin
```

#### 2. Initialize Firebase Admin
```python
from firebase_admin import credentials, messaging
import firebase_admin

cred = credentials.Certificate('path/to/service-account.json')
firebase_admin.initialize_app(cred)
```

#### 3. Update Device Schema
Add `fcm_token` field to device documents:
```javascript
{
  "fcm_token": "firebase-cloud-messaging-token"
}
```

#### 4. Implement Actual FCM Sending
Replace placeholder in `send_notification_to_role`:
```python
async def send_notification_to_role(role: str, title: str, body: str, data: dict = None):
    devices = await db.devices.find({'role': role}, {'_id': 0}).to_list(None)
    for device in devices:
        if device.get('fcm_token'):
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data,
                token=device['fcm_token']
            )
            messaging.send(message)
```

#### 5. Add FCM Token Registration Endpoint
```python
@api.post('/devices/{device_id}/fcm-token')
async def update_fcm_token(device_id: str, body: dict):
    token = body.get('fcm_token')
    await db.devices.update_one(
        {'device_id': device_id},
        {'$set': {'fcm_token': token, 'last_active': now_str()}}
    )
    return {'success': True}
```

### Frontend Changes

#### 1. Install Firebase SDK
```bash
npm install firebase
```

#### 2. Create Firebase Config
```javascript
// firebaseConfig.js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

#### 3. Initialize Firebase
```javascript
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { firebaseConfig } from './firebaseConfig'

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)
```

#### 4. Request FCM Token
```javascript
import { getMessaging, getToken } from 'firebase/messaging'

async function requestFCMToken() {
  try {
    const token = await getToken(messaging, { 
      vapidKey: 'YOUR_VAPID_KEY' 
    })
    if (token) {
      // Send token to backend
      await updateFCMToken(token)
      localStorage.setItem('fcm_token', token)
    }
  } catch (error) {
    console.error('Error getting FCM token:', error)
  }
}
```

#### 5. Handle Incoming Messages
```javascript
import { onMessage } from 'firebase/messaging'

onMessage(messaging, (payload) => {
  console.log('Message received:', payload)
  // Show in-app notification
  showNotification(
    payload.notification.title,
    payload.notification.body,
    payload.data
  )
})
```

#### 6. Register Device with FCM Token
```javascript
async function registerDeviceWithFCM() {
  const deviceId = localStorage.getItem('device_id')
  const fcmToken = localStorage.getItem('fcm_token')
  
  await registerDevice({
    device_id: deviceId,
    device_name: deviceName,
    role: role,
    fcm_token: fcmToken
  })
}
```

#### 7. Add VAPID Key to Firebase Config
Generate VAPID key in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

### Notification Flow Examples

#### Kasbon Request Flow
1. Employee submits kasbon via tablet
2. Backend creates kasbon record
3. Backend calls `send_notification_to_role('OWNER', ...)`
4. Backend queries all devices with role `OWNER`
5. Backend sends FCM notification to each OWNER device
6. Owner's phone receives push notification
7. Owner taps notification → opens app to approve

#### Kasbon Approval Flow
1. Owner approves kasbon via phone
2. Backend updates kasbon status
3. Backend calls `send_notification_to_role('STORE_TABLET', ...)`
4. Backend queries all devices with role `STORE_TABLET`
5. Backend sends FCM notification to each STORE_TABLET device
6. Tablet receives push notification
7. Tablet displays notification to employee

### Testing Checklist

- [ ] Create Firebase project
- [ ] Obtain Firebase config
- [ ] Generate VAPID key
- [ ] Install firebase-admin in backend
- [ ] Install firebase in frontend
- [ ] Initialize Firebase Admin SDK
- [ ] Initialize Firebase Client SDK
- [ ] Implement FCM token request
- [ ] Implement FCM token registration
- [ ] Implement actual FCM sending in backend
- [ ] Test notification to OWNER role
- [ ] Test notification to STORE_TABLET role
- [ ] Test in-app notification display
- [ ] Test notification tap handling

## Current Status

### Completed
- ✅ Backend device management endpoints
- ✅ Backend notification helper function (placeholder)
- ✅ Backend notification routing for kasbon
- ✅ Frontend Device Settings UI
- ✅ Frontend device API functions
- ✅ Device ID generation and storage

### Pending
- ⏳ Firebase project setup
- ⏳ Firebase Admin SDK integration (backend)
- ⏳ Firebase Client SDK integration (frontend)
- ⏳ FCM token generation and registration
- ⏳ Actual FCM notification sending
- ⏳ In-app notification handling

## Notes
- Device roles are managed via Admin → Settings → Pengaturan Perangkat
- Each device has a unique ID stored in localStorage
- No user authentication - device-based only
- Notifications are role-based, not user-based
- Backend currently logs notifications to console (placeholder)
- FCM integration will be implemented after PWA → APK wrapper migration
