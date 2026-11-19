/**
 * Utility: Back Button Registry
 * Allows active modals and components to intercept Android hardware back button
 * (Capacitor) and custom back actions before the router navigates away.
 */

const handlers = []

/**
 * Register a back handler. Handlers are evaluated in LIFO (last-in, first-out) order.
 * @param {() => boolean} handler Function that returns true if the back action was handled/consumed, false otherwise.
 * @returns {() => void} Unregister function.
 */
export function registerBackHandler(handler) {
  handlers.push(handler)
  return () => {
    const index = handlers.lastIndexOf(handler)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
  }
}

/**
 * Execute registered back handlers in reverse order.
 * @returns {boolean} True if any handler handled the event, false otherwise.
 */
export function executeBackHandler() {
  for (let i = handlers.length - 1; i >= 0; i--) {
    try {
      const handled = handlers[i]()
      if (handled) {
        return true
      }
    } catch (err) {
      console.error('[BackButton] Error running back handler:', err)
    }
  }
  return false
}
