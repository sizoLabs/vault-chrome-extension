const ACCOUNTS_STORAGE_KEY = 'vault-synced-accounts'

const getAccountStorageKey = (accountId = '') => {
  if (!accountId || typeof accountId !== 'string') return ''
  return `vault-account:${accountId}`
}

const mergeAccountIds = (accountIds = [], nextAccountId = '') => {
  const list = Array.isArray(accountIds) ? accountIds.filter(Boolean) : []
  if (!nextAccountId) return list
  if (list.includes(nextAccountId)) return list
  return [...list, nextAccountId]
}

const normalizeMessage = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  if (payload.source === 'vault-extension-sync') return payload
  if (payload.source === 'vault-extension-command') return payload
  return null
}

const sendAccountSyncMessage = async (payload) => {
  const runtime = globalThis.chrome?.runtime || globalThis.browser?.runtime

  if (!runtime?.sendMessage) {
    console.warn('Vault sync skipped: extension runtime is unavailable in this context.')
    return false
  }

  try {
    const response = await runtime.sendMessage(payload)
    return response?.success === true
  } catch (error) {
    console.error('Failed to send message to extension:', error)
    return false
  }
}

window.addEventListener('message', async (event) => {
  const message = normalizeMessage(event.data)
  if (!message) return

  if (message.source === 'vault-extension-command') {
    const type = typeof message.type === 'string' ? message.type.toUpperCase() : ''
    if (!type) return

    try {
      const success = await sendAccountSyncMessage({
        type,
        payload: message.payload || {},
      })

      if (success) {
        console.log(`✓ Extension command sent and confirmed: ${type}`)
      } else {
        console.warn(`✗ Extension command failed or no response: ${type}`)
      }

      // Send response back to the webpage
      if (message.requestId) {
        window.postMessage({
          source: 'vault-extension-response',
          requestId: message.requestId,
          success,
        }, '*')
      }
    } catch (error) {
      console.error('Failed to forward extension command:', error)
      // Send error response back to the webpage
      if (message.requestId) {
        window.postMessage({
          source: 'vault-extension-response',
          requestId: message.requestId,
          success: false,
          error: error.message,
        }, '*')
      }
    }
    return
  }

  const payload = message.payload || {}
  const accountInfo = payload.info || {}
  const accountId = accountInfo.id || payload.accountId
  const services = Array.isArray(payload.services) ? payload.services : []
  const alphabets = Array.isArray(payload.alphabets) ? payload.alphabets : []
  if (!accountId) return
  try {
    const sent = await sendAccountSyncMessage({
      type: 'SYNC_ACCOUNT',
      payload: {
        info: accountInfo,
        accountId,
        services,
        alphabets,
        master: payload.master || null,
      },
    })

    if (sent) {
      console.log(`✓ Account sync message sent: ${accountId}`)
    }
  } catch (error) {
    console.error('Failed to sync account:', error)
  }
})

