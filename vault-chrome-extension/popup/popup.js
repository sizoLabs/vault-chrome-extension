import {
  ACCOUNTS_STORAGE_KEY,
  CURRENT_ACCOUNT_STORAGE_KEY,
  getAccountStorageKey,
  getPreferredAccountId,
  findMatchingServices,
  getServiceDisplayGroups,
  generateServicePassword,
  normalizeDomain,
  verifyMasterPassword,
} from '../shared.js'

const unlockPanel = document.getElementById('account-panel')
const resultsPanel = document.getElementById('results-panel')
const unlockButton = document.getElementById('unlock-button')
const accountSelect = document.getElementById('account-select')
const masterPasswordInput = document.getElementById('master-password')
const searchInput = document.getElementById('search-input')
const serviceList = document.getElementById('service-list')
const noSearchResults = document.getElementById('no-search-results')
const alertContainer = document.getElementById('alert-container')
const noMasterPasswordWarning = document.getElementById('no-master-password-warning')
const accountHeaderDisplay = document.getElementById('account-header')
const accountIconDisplay = document.getElementById('account-icon')
const accountNameDisplay = document.getElementById('account-name')

// Dropdown elements
const accountDropdownContainer = document.getElementById('account-dropdown-container')
const accountDropdownButton = document.getElementById('account-dropdown-button')
const accountDropdownMenu = document.getElementById('account-dropdown-menu')
const accountDropdownLabel = document.getElementById('account-dropdown-label')
const accountDropdownIcon = document.getElementById('account-dropdown-icon')

const showNoSearchResults = (message = 'No services match this search...') => {
  if (!noSearchResults) return
  noSearchResults.textContent = message
  noSearchResults.classList.remove('hidden')
}

const hideNoSearchResults = () => {
  if (!noSearchResults) return
  noSearchResults.classList.add('hidden')
}

const showAlert = (message, type = 'info') => {
  if (!alertContainer) return
  alertContainer.innerHTML = message
  alertContainer.className = `alert-container bg-white/5 border border-white/10 squircle-md px-5 py-3 text-[15px] mb-2 ${type}`
  alertContainer.classList.remove('hidden')
  if (type === 'success') {
    setTimeout(() => {
      alertContainer.classList.add('hidden')
    }, 5000)
  }
}

const safeTogglePanels = () => {
  if (!resultsPanel || !unlockPanel) return
  resultsPanel.classList.toggle('hidden', !resultsPanel.classList.contains('hidden'))
  unlockPanel.classList.toggle('hidden', !unlockPanel.classList.contains('hidden'))
}

const syncAccountPanelVisibility = async () => {
  if (!unlockPanel || !resultsPanel) return
  const hasSyncedAccount = state.accountIds.length > 0
  unlockPanel.classList.toggle('hidden', !hasSyncedAccount)
  if (!hasSyncedAccount) {
    resultsPanel.classList.add('hidden')
  } else {
    await updateMasterPasswordWarning()
  }
}

const state = {
  services: [],
  alphabets: [],
  currentDomain: '',
  masterPassword: '',
  accountId: '',
  accountIds: [],
  currentResults: [],
}

const getStoredData = async (accountId = state.accountId) => {
  if (!accountId) {
    return { services: [], alphabets: [] }
  }

  const storageKey = getAccountStorageKey(accountId)
  const { [storageKey]: value } = await chrome.storage.local.get(storageKey)
  const parsed = value || { services: [], alphabets: [] }
  return {
    services: Array.isArray(parsed.services) ? parsed.services : [],
    alphabets: Array.isArray(parsed.alphabets) ? parsed.alphabets : [],
  }
}

const refreshAccountSelect = async () => {
  const { [ACCOUNTS_STORAGE_KEY]: storedAccountIds = [], [CURRENT_ACCOUNT_STORAGE_KEY]: storedCurrentAccountId = '' } = await chrome.storage.local.get([ACCOUNTS_STORAGE_KEY, CURRENT_ACCOUNT_STORAGE_KEY])
  const accountIds = Array.isArray(storedAccountIds) ? storedAccountIds.filter(Boolean) : []
  state.accountIds = accountIds

  const accountOptions = []
  for (const id of accountIds) {
    const storageKey = getAccountStorageKey(id)
    const { [storageKey]: storedAccount = null } = await chrome.storage.local.get(storageKey)
    const accountInfo = storedAccount?.info || {}
    const label = accountInfo.name || accountInfo.id || id
    const iconClass = accountInfo.icon ? `ti ti-${accountInfo.icon}` : 'ti ti-user'
    accountOptions.push({ id, label, iconClass })
  }

  const preferredAccountId = getPreferredAccountId(accountIds, storedCurrentAccountId)
  const selectedValue = state.accountId && state.accountIds.includes(state.accountId) ? state.accountId : preferredAccountId
  
  accountSelect.innerHTML = '<option value="">Select Account</option>' + accountOptions.map((account) => `<option value="${account.id}">${account.label}</option>`).join('')

  accountDropdownMenu.innerHTML = accountOptions.map((account) => `
    <li class="account-dropdown-option" data-account-id="${account.id}">
      <div class="flex flex-row items-center justify-center gap-2">
        <i class="${account.iconClass} text-white text-lg"></i>
        <div class="font-inter-medium text-xl account-dropdown-option-label">${account.label}</div>
      </div>
      <div class="text-[10px] account-dropdown-option-id">${account.id}</div>
    </li>
  `).join('')

  // Add click handlers to dropdown options
  accountDropdownMenu.querySelectorAll('.account-dropdown-option').forEach((option) => {
    option.addEventListener('click', async () => {
      const accountId = option.dataset.accountId
      state.accountId = accountId
      await chrome.storage.local.set({ [CURRENT_ACCOUNT_STORAGE_KEY]: accountId })
      
      // Update display
      const selectedAccount = accountOptions.find(acc => acc.id === accountId)
      if (selectedAccount) {
        accountDropdownLabel.textContent = selectedAccount.label
        accountDropdownIcon.className = selectedAccount.iconClass
      }
      
      // Mark as selected
      accountDropdownMenu.querySelectorAll('.account-dropdown-option').forEach(opt => {
        if (opt.dataset.accountId === accountId) {
          opt.classList.add('selected')
        } else {
          opt.classList.remove('selected')
        }
      })
      
      // Close dropdown
      closeAccountDropdown()
      
      // Update state
      await loadSelectedAccountData()
      await updateMasterPasswordWarning()
      syncAccountPanelVisibility()
      masterPasswordInput.value = ''
      searchInput.value = ''
    })
  })

  if (selectedValue) {
    accountSelect.value = selectedValue
    state.accountId = selectedValue
    await chrome.storage.local.set({ [CURRENT_ACCOUNT_STORAGE_KEY]: selectedValue })
    
    // Update dropdown display
    const selectedAccount = accountOptions.find(acc => acc.id === selectedValue)
    if (selectedAccount) {
      accountDropdownLabel.textContent = selectedAccount.label
      accountDropdownIcon.className = selectedAccount.iconClass
      accountDropdownMenu.querySelectorAll('.account-dropdown-option').forEach(option => {
        if (option.dataset.accountId === selectedValue) {
          option.classList.add('selected')
        } else {
          option.classList.remove('selected')
        }
      })
    }
  } else {
    state.accountId = accountOptions[0]?.id || ''
    if (state.accountId) {
      accountSelect.value = state.accountId
      await chrome.storage.local.set({ [CURRENT_ACCOUNT_STORAGE_KEY]: state.accountId })
      
      // Update dropdown display
      const selectedAccount = accountOptions.find(acc => acc.id === state.accountId)
      if (selectedAccount) {
        accountDropdownLabel.textContent = selectedAccount.label
        accountDropdownIcon.className = selectedAccount.iconClass
        accountDropdownMenu.querySelectorAll('.account-dropdown-option').forEach(option => {
          if (option.dataset.accountId === state.accountId) {
            option.classList.add('selected')
          } else {
            option.classList.remove('selected')
          }
        })
      }
    } else {
      await chrome.storage.local.remove(CURRENT_ACCOUNT_STORAGE_KEY)
      accountDropdownLabel.textContent = 'Select an account'
      accountDropdownIcon.className = 'ti ti-user text-xl'
    }
  }

  syncAccountPanelVisibility()
}

const loadSelectedAccountData = async () => {
  const accountId = state.accountId
  const { services, alphabets } = await getStoredData(accountId)
  state.services = services
  state.alphabets = alphabets
  state.currentResults = []
}

const updateMasterPasswordWarning = async () => {
  if (!state.accountId || !noMasterPasswordWarning) return

  const accountKey = getAccountStorageKey(state.accountId)
  const { [accountKey]: storedAccount } = await chrome.storage.local.get(accountKey)
  const master = storedAccount?.master

  if (!master) {
    noMasterPasswordWarning.classList.remove('hidden')
  } else {
    noMasterPasswordWarning.classList.add('hidden')
  }
}

const getCurrentDomain = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url) return ''

  try {
    return normalizeDomain(new URL(tab.url).hostname)
  } catch (_error) {
    return normalizeDomain(tab.url)
  }
}

const getAlphabetForService = (service) => {
  const byId = state.alphabets.find((alphabet) => alphabet.id === service.alphabet || alphabet.identifier === service.alphabet)
  if (byId) return byId

  return { identifier: 'default', characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$%*()_+=-?[]{}",./<>|' }
}

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const cardHtml = (service, index) => {
  const title = escapeHtml(service.name || 'Service')
  const url = escapeHtml(service.url || 'No URL')

  return `
    <div class="hover:bg-indigo-500/10 hover:border-indigo-500 bg-white/5 squircle-md px-5 py-3 border border-white/10 w-full cursor-pointer duration-300 flex flex-row justify-between" data-service-card="${index}">
      <div class="flex flex-col justify-center">
        <p class="text-xl font-bold">
          ${title}
        </p>
        <p class="text-xs text-white/50">
          Click here to fill login password
        </p>
      </div>
      <div class="flex flex-row justify-end mt-2">
        <button type="button" class="action-button copy px-6 py-4 bg-white/10 border-white/20 border squircle-md cursor-pointer" data-role="copy" data-service-index="${index}">Copy</button>
      </div>
    </div>
  `
}

const attachCardHandlers = (entries) => {
  serviceList.querySelectorAll('[data-service-card]').forEach((card) => {

    const index = Number(card.dataset.serviceCard)
    const service = entries[index]

    if (!service) return

    card.addEventListener('click', async (event) => {

      if (event.target.closest('[data-role="copy"]')) {
        event.stopPropagation()
        return
      }

      const password = await generateServicePassword(
        state.masterPassword,
        service.identifier,
        service.length,
        getAlphabetForService(service),
        service.version,
      )

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url || /^(chrome|about):/.test(tab.url)) {
        return
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (value) => {
          const selectors = [
            'input[type="password"]',
            'input[name*="password"][type="password"]',
            'input[id*="password"][type="password"]',
            'input[type="text"][name*="password"]',
            'input[type="text"][id*="password"]',
          ]

          const fields = Array.from(document.querySelectorAll(selectors.join(',')))
          if (!fields.length) return false

          let field = document.activeElement
          if (!field || !fields.includes(field)) {
            field = fields[0]
          }

          field.focus()
          field.value = value
          field.dispatchEvent(new Event('input', { bubbles: true }))
          field.dispatchEvent(new Event('change', { bubbles: true }))

          return true

        },
        args: [password],
      })

      card.classList.add('bg-emerald-500/20!', 'border-emerald-500!')
      setTimeout(() => {
        card.classList.remove('bg-emerald-500/20!', 'border-emerald-500!')
      }, 1200)

    })

    const copyButton = card.querySelector('[data-role="copy"]')
    if (!copyButton) return

    copyButton.addEventListener('click', async (event) => {
      event.preventDefault()
      event.stopPropagation()

      const password = await generateServicePassword(
        state.masterPassword,
        service.identifier,
        service.length,
        getAlphabetForService(service),
        service.version,
      )

      await navigator.clipboard.writeText(password)
      copyButton.textContent = 'Copied!'
      card.classList.add('bg-emerald-500/20!', 'border-emerald-500!')

      setTimeout(() => {
        copyButton.textContent = 'Copy'
        card.classList.remove('bg-emerald-500/20!', 'border-emerald-500!')
      }, 1200)
    })
  })
}

const renderServiceCards = (entries, options = {}) => {
  const { showEmptyAlert = false, emptyMessage = 'No services match this search...' } = options

  serviceList.innerHTML = ''

  if (!entries.length) {
    if (showEmptyAlert) {
      showAlert('No services matched this website. Use the search above to find a service.', 'warning')
    }

    showNoSearchResults(emptyMessage)
    return
  }

  hideNoSearchResults()
  serviceList.innerHTML = entries.map((service, index) => cardHtml(service, index)).join('')
  attachCardHandlers(entries)
}

const applySearch = () => {
  const query = searchInput.value.trim().toLowerCase()
  const groups = getServiceDisplayGroups(state.services, state.currentDomain)
  const hasMatches = groups.primary.length > 0
  const source = hasMatches ? groups.visible : state.services

  if (!query && hasMatches) {
    renderServiceGroups()
    return
  }

  const entries = !query
    ? source
    : source.filter((service) => {
        const haystack = `${service.name || ''} ${service.url || ''} ${service.identifier || ''}`.toLowerCase()
        return haystack.includes(query)
      })

  renderServiceCards(entries, { emptyMessage: 'No services match this search' })
}

const renderServiceGroups = () => {

  const groups = getServiceDisplayGroups(state.services, state.currentDomain)
  const primary = groups.primary.filter((service, index, array) => array.findIndex((candidate) => candidate?.id === service?.id) === index)
  const related = groups.related.filter((service, index, array) => array.findIndex((candidate) => candidate?.id === service?.id) === index)

  if (!primary.length && !related.length) {
    showNoSearchResults('No services match this search')
    serviceList.innerHTML = ''
    return
  }

  hideNoSearchResults()
  const orderedEntries = [...primary, ...related]
  const sections = []
  let offset = 0

  if (primary.length) {
    const cards = primary.map((service) => cardHtml(service, offset++)).join('')
    sections.push(`<div class="flex flex-row flex-wrap justify-around gap-1 w-full">${cards}</div>`)
  }

  if (related.length) {
    const cards = related.map((service) => cardHtml(service, offset++)).join('')
    sections.push(`<div class="flex flex-row flex-wrap justify-around gap-1 w-full">${cards}</div>`)
  }

  serviceList.innerHTML = sections.join('') || `No services match this search`

  attachCardHandlers(orderedEntries)

}

const unlockServices = async () => {

  if (!state.accountId) {
    showAlert('Select an account before unlocking services', 'error')
    return
  }

  const password = masterPasswordInput.value.trim()
  if (!password) {
    showAlert('Enter the account Master Password', 'error')
    return
  }

  const { services, alphabets } = await getStoredData(state.accountId)
  if (!services.length) {
    showAlert('No services available for the selected account', 'error')
    return
  }

  const accountKey = getAccountStorageKey(state.accountId)
  const { [accountKey]: storedAccount } = await chrome.storage.local.get(accountKey)
  const master = storedAccount?.master

  if (master) {
    const isValid = await verifyMasterPassword(password, master.salt, master.verifier)
    if (!isValid) {
      showAlert('Incorrect master password', 'error')
      masterPasswordInput.value = ''
      return
    }
  }

  state.masterPassword = password
  state.services = services
  state.alphabets = alphabets
  state.currentDomain = await getCurrentDomain()

  if (noMasterPasswordWarning) {
    noMasterPasswordWarning.classList.add('hidden')
  }
  masterPasswordInput.value = ''

  // Display account info in header
  const accountInfo = storedAccount?.info || {}
  const accountName = accountInfo.name || state.accountId
  const iconClass = accountInfo.icon ? `ti ti-${accountInfo.icon}` : 'ti ti-user'

  if (accountHeaderDisplay) {
    accountHeaderDisplay.classList.remove('hidden')
  }

  if (accountIconDisplay) {
    accountIconDisplay.className = `${iconClass} text-base text-white/70`
  }

  if (accountNameDisplay) {
    accountNameDisplay.textContent = accountName
  }

  const exactMatches = findMatchingServices(services, state.currentDomain)
  state.currentResults = exactMatches.length ? exactMatches : services

  unlockPanel.classList.add('hidden')
  resultsPanel.classList.remove('hidden')

  if (exactMatches.length) {
    showAlert(`Matched ${exactMatches.length} service(s) for ${state.currentDomain}`, 'info')
    renderServiceGroups()
    return
  }

  showAlert(`No service matched for <b>${state.currentDomain}</b>`, 'warning')
  searchInput.value = ''
  renderServiceCards(services, { emptyMessage: 'No services match this search' })
}

// Dropdown functions
const closeAccountDropdown = () => {
  accountDropdownMenu.classList.add('hidden')
  accountDropdownButton.classList.remove('active')
}

const toggleAccountDropdown = () => {
  if (accountDropdownMenu.classList.contains('hidden')) {
    accountDropdownMenu.classList.remove('hidden')
    accountDropdownButton.classList.add('active')
  } else {
    closeAccountDropdown()
  }
}

// Dropdown event listeners
accountDropdownButton.addEventListener('click', toggleAccountDropdown)

document.addEventListener('click', (event) => {
  if (!accountDropdownContainer.contains(event.target)) {
    closeAccountDropdown()
  }
})

accountSelect.addEventListener('change', async () => {
  state.accountId = accountSelect.value
  if (state.accountId) {
    await chrome.storage.local.set({ [CURRENT_ACCOUNT_STORAGE_KEY]: state.accountId })
  } else {
    await chrome.storage.local.remove(CURRENT_ACCOUNT_STORAGE_KEY)
  }

  await loadSelectedAccountData()
  await updateMasterPasswordWarning()
  syncAccountPanelVisibility()
  masterPasswordInput.value = ''
  searchInput.value = ''
})

searchInput.addEventListener('input', applySearch)
unlockButton.addEventListener('click', unlockServices)

masterPasswordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    unlockServices()
  }
})

window.addEventListener('load', async () => {
  await refreshAccountSelect()
  await loadSelectedAccountData()

  if (!resultsPanel || !unlockPanel) return

  if (!state.accountId) {
    syncAccountPanelVisibility()
    showAlert('No synced account found. Go to Vault Settings and sync your account with extension.', 'error')
    renderServiceCards([])
    return
  }

  unlockPanel.classList.remove('hidden')
  resultsPanel.classList.add('hidden')
})
