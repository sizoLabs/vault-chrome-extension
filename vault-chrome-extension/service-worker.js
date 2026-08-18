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

const replaceSyncedAccountData = ({
  accountId = '',
  accountIds = [],
  info = {},
  services = [],
  alphabets = [],
  master = null,
}) => {
  const list = Array.isArray(accountIds) ? accountIds.filter(Boolean) : []
  const nextIds = list.includes(accountId) ? list : [...list, accountId]

  return {
    accountIds: nextIds,
    accountData: {
      info: {
        id: accountId,
        name: info?.name || '',
        icon: info?.icon || '',
      },
      services: Array.isArray(services) ? services : [],
      alphabets: Array.isArray(alphabets) ? alphabets : [],
      master: master ?? null,
      updatedAt: new Date().toISOString(),
    },
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SYNC_ACCOUNT') {
    handleSyncAccount(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === 'DELETE_ACCOUNT') {
    handleDeleteAccount(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === 'CLEAR_ALL') {
    handleClearAllExtensionData()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  return false
})

const handleSyncAccount = async (payload) => {

  if (!payload || typeof payload !== 'object') return

  const accountInfo = payload.info || {}
  const accountId = accountInfo.id || payload.accountId
  const services = Array.isArray(payload.services) ? payload.services : []
  const alphabets = Array.isArray(payload.alphabets) ? payload.alphabets : []

  if (!accountId) return

  const storedAccounts = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY)
  const accountIds = Array.isArray(storedAccounts[ACCOUNTS_STORAGE_KEY]) ? storedAccounts[ACCOUNTS_STORAGE_KEY].filter(Boolean) : []
  const accountKey = getAccountStorageKey(accountId)
  const master = payload.master || null
  const nextState = replaceSyncedAccountData({
    accountId,
    accountIds,
    info: accountInfo,
    services,
    alphabets,
    master,
  })

  await chrome.storage.local.set({
    [ACCOUNTS_STORAGE_KEY]: nextState.accountIds,
    [accountKey]: nextState.accountData,
  })

  console.log(`✓ Vault Account Synced! (${accountId})`)

}

const handleDeleteAccount = async (payload = {}) => {
  const accountId = typeof payload?.accountId === 'string' ? payload.accountId : payload?.info?.id

  if (!accountId) {
    throw new Error('Missing account id for DELETE_ACCOUNT command')
  }

  const storedAccounts = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY)
  const accountIds = Array.isArray(storedAccounts[ACCOUNTS_STORAGE_KEY]) ? storedAccounts[ACCOUNTS_STORAGE_KEY].filter(Boolean) : []
  const nextAccountIds = accountIds.filter((id) => id !== accountId)
  const accountKey = getAccountStorageKey(accountId)
  const currentAccount = await chrome.storage.local.get('vault-current-account')

  await chrome.storage.local.remove(accountKey)
  await chrome.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: nextAccountIds })

  if (currentAccount['vault-current-account'] === accountId) {
    await chrome.storage.local.remove('vault-current-account')
  }

  console.log(`✓ Vault Account Deleted! (${accountId})`)
}

const handleClearAllExtensionData = async () => {
  await chrome.storage.local.clear()
  console.log('✓ All Vault extension data cleared')
}
