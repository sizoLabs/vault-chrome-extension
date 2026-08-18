const DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$%*()_+=-?[]{}\",./<>|"

const stringify = (value) => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, (key, item) => {
      if (typeof item === 'function') return item.toString()
      return item
    })
  } catch (_error) {
    return String(value)
  }
}

const createSeededRandom = (seed) => {
  const Mash = function () {
    let n = 0xefc8249d
    const mash = function (data) {
      if (data) {
        data = data.toString()
        for (let i = 0; i < data.length; i++) {
          n += data.charCodeAt(i)
          let h = 0.02519603282416938 * n
          n = h >>> 0
          h -= n
          h *= n
          n = h >>> 0
          h -= n
          n += h * 0x100000000
        }
        return (n >>> 0) * 2.3283064365386963e-10
      } else {
        n = 0xefc8249d
      }
    }
    return mash
  }

  const uheprng = (function () {
    const o = 48
    let c = 1
    let p = o
    const s = new Array(o)
    let i
    let j
    let k = 0
    const mash = new Mash()

    const rawprng = function () {
      if (++p >= o) {
        p = 0
      }
      const t = 1768863 * s[p] + c * 2.3283064365386963e-10
      return s[p] = t - (c = t | 0)
    }

    const random = function (range) {
      return Math.floor(range * (rawprng() + (rawprng() * 0x200000 | 0) * 1.1102230246251565e-16))
    }

    random.string = function (count) {
      let output = ''
      for (let i = 0; i < count; i++) {
        output += String.fromCharCode(33 + random(94))
      }
      return output
    }

    const hash = function () {
      const args = Array.prototype.slice.call(arguments)
      for (i = 0; i < args.length; i++) {
        for (j = 0; j < o; j++) {
          s[j] -= mash(args[i])
          if (s[j] < 0) {
            s[j] += 1
          }
        }
      }
    }

    random.cleanString = function (inStr) {
      inStr = inStr.replace(/(^\s*)|(\s*$)/gi, '')
      inStr = inStr.replace(/[\x00-\x1F]/gi, '')
      inStr = inStr.replace(/\n /, '\n')
      return inStr
    }

    random.hashString = function (inStr) {
      inStr = random.cleanString(inStr)
      mash(inStr)
      for (i = 0; i < inStr.length; i++) {
        k = inStr.charCodeAt(i)
        for (j = 0; j < o; j++) {
          s[j] -= mash(k)
          if (s[j] < 0) {
            s[j] += 1
          }
        }
      }
    }

    random.seed = function (value) {
      if (typeof value === 'undefined' || value === null) {
        value = Math.random()
      }
      if (typeof value !== 'string') {
        value = stringify(value)
      }
      random.initState()
      random.hashString(value)
    }

    random.addEntropy = function () {
      const args = []
      for (let index = 0; index < arguments.length; index++) {
        args.push(arguments[index])
      }
      hash((k++) + (new Date().getTime()) + args.join('') + Math.random())
    }

    random.initState = function () {
      mash()
      for (i = 0; i < o; i++) {
        s[i] = mash(' ')
      }
      c = 1
      p = o
    }

    random.done = function () {
      mash = null
    }

    if (typeof seed !== 'undefined') {
      random.seed(seed)
    }

    random.range = function (range) {
      return random(range)
    }

    random.random = function () {
      return random(Number.MAX_VALUE - 1) / Number.MAX_VALUE
    }

    random.floatBetween = function (min, max) {
      return random.random() * (max - min) + min
    }

    random.intBetween = function (min, max) {
      return Math.floor(random.random() * (max - min + 1))
    }

    return random
  }())

  return uheprng
}

const createHash = async (value) => {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-512', encoder.encode(String(value)))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const createPassword = (hash, length, alphabet) => {
  const random = createSeededRandom(hash)
  let result = ''
  const characters = alphabet || DEFAULT_ALPHABET

  for (let i = 0; i < length; i++) {
    result += characters[random(characters.length)]
  }

  return result
}

export const ACCOUNTS_STORAGE_KEY = 'vault-synced-accounts'
export const CURRENT_ACCOUNT_STORAGE_KEY = 'vault-current-account'

export const getAccountStorageKey = (accountId = '') => {
  if (!accountId || typeof accountId !== 'string') return ''
  return `vault-account:${accountId}`
}

export const getPreferredAccountId = (accountIds = [], currentAccountId = '') => {
  const list = Array.isArray(accountIds) ? accountIds.filter(Boolean) : []
  if (currentAccountId && list.includes(currentAccountId)) return currentAccountId
  return list[0] || ''
}

export const mergeAccountIds = (accountIds = [], nextAccountId = '') => {
  const list = Array.isArray(accountIds) ? accountIds.filter(Boolean) : []
  if (!nextAccountId) return list

  const exists = list.includes(nextAccountId)
  if (exists) return list

  return [...list, nextAccountId]
}

export const replaceSyncedAccountData = ({
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

export const normalizeExtensionCommand = (payload = null) => {
  if (!payload || typeof payload !== 'object') return null
  if (payload.source !== 'vault-extension-command') return null

  const type = typeof payload.type === 'string' ? payload.type.toUpperCase() : ''
  if (!type) return null

  const commandPayload = payload.payload && typeof payload.payload === 'object' ? payload.payload : {}

  return {
    type,
    payload: commandPayload,
  }
}

export const isDeleteAccountCommand = (payload = null) => normalizeExtensionCommand(payload)?.type === 'DELETE_ACCOUNT'

export const isClearAllCommand = (payload = null) => normalizeExtensionCommand(payload)?.type === 'CLEAR_ALL'

export const normalizeDomain = (value = '') => {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return ''

  let candidate = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  candidate = candidate.replace(/^[^a-z0-9.-]+|[^a-z0-9.-]+$/g, '')
  candidate = candidate.replace(/\s+/g, '')

  try {
    const parsed = new URL(`https://${candidate}`)
    return parsed.hostname.replace(/^www\./, '')
  } catch (_error) {
    return candidate
  }
}

export const findMatchingServices = (services = [], domain = '') => {
  const target = normalizeDomain(domain)
  if (!target) return []

  const normalizedServices = (Array.isArray(services) ? services : [])
    .map((service) => {
      const aliases = [
        normalizeDomain(service?.name || ''),
        normalizeDomain(service?.url || ''),
        normalizeDomain(service?.identifier || ''),
      ].filter(Boolean)

      return {
        service,
        aliases,
        score: aliases.some((alias) => alias.includes(target) || target.includes(alias)) ? 1 : 0,
      }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      const aScore = a.aliases.findIndex((alias) => alias === target || alias.includes(target) || target.includes(alias))
      const bScore = b.aliases.findIndex((alias) => alias === target || alias.includes(target) || target.includes(alias))
      return (aScore === -1 ? Number.MAX_SAFE_INTEGER : aScore) - (bScore === -1 ? Number.MAX_SAFE_INTEGER : bScore)
    })

  return normalizedServices.map((entry) => entry.service)
}

export const getServiceDisplayGroups = (services = [], domain = '') => {
  const all = Array.isArray(services) ? services : []
  const matches = findMatchingServices(all, domain)
  const primary = matches.length ? [matches[0]] : []
  const target = normalizeDomain(domain)

  const isRelatedToTarget = (value = '') => {
    const candidate = normalizeDomain(value)
    if (!target || !candidate) return false

    if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
      return true
    }

    const targetTokens = new Set(target.split('.').filter(Boolean))
    const candidateTokens = new Set(candidate.split('.').filter(Boolean))
    const sharedTokens = [...targetTokens].filter((token) => token.length > 2 && candidateTokens.has(token))
    return sharedTokens.length > 0
  }

  const related = all.filter((service) => !primary.some((match) => match?.id === service?.id))
    .filter((service) => {
      const haystack = [
        service?.name || '',
        service?.url || '',
        service?.identifier || '',
      ].join(' ')

      return isRelatedToTarget(haystack) || isRelatedToTarget(service?.url || '') || isRelatedToTarget(service?.name || '')
    })
    .filter((service, index, array) => array.findIndex((candidate) => candidate?.id === service?.id) === index)

  return {
    all,
    primary,
    related,
    visible: primary.length ? [...primary, ...related] : all,
  }
}

export const generateServicePassword = async (masterPassword, identifier, length, alphabet, version = 1) => {
  if (!masterPassword || !identifier) return ''

  const alphabetData = alphabet && typeof alphabet === 'object'
    ? alphabet
    : {
        identifier: 'default',
        characters: DEFAULT_ALPHABET,
      }

  let versionHash = ''
  if (version && Number(version) > 1) {
    versionHash = await createHash(`version-${version}`)
  }

  const masterHash = await createHash(masterPassword)
  const identifierHash = await createHash(identifier)
  const alphabetHash = await createHash(alphabetData.identifier || 'default')
  let appendHashes = masterHash + identifierHash + alphabetHash

  if (versionHash) {
    appendHashes += versionHash
  }

  const hash = await createHash(appendHashes)
  return createPassword(hash, Number(length) || 16, alphabetData.characters || DEFAULT_ALPHABET)
}

export const verifyMasterPassword = async (masterPassword, salt, verifier) => {
  if (!salt || !verifier || !masterPassword) return false

  try {
    const saltBuf = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)).buffer
    const verifierBuf = Uint8Array.from(atob(verifier), (c) => c.charCodeAt(0)).buffer
    const key = await deriveHmacKey(masterPassword, saltBuf)
    const enc = new TextEncoder()
    const testVerifier = await crypto.subtle.sign('HMAC', key, enc.encode('vault-verifier-v1'))
    return equalArrayBuffers(testVerifier, verifierBuf)
  } catch (_error) {
    return false
  }
}

export const deriveHmacKey = async (masterPassword, salt) => {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 200000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  )
  return key
}

export const equalArrayBuffers = (a, b) => {
  if (a.byteLength !== b.byteLength) return false
  const aView = new Uint8Array(a)
  const bView = new Uint8Array(b)
  for (let i = 0; i < aView.length; i++) {
    if (aView[i] !== bView[i]) return false
  }
  return true
}

if (typeof globalThis !== 'undefined') {
  globalThis.VaultShared = {
    ACCOUNTS_STORAGE_KEY,
    getAccountStorageKey,
    mergeAccountIds,
    normalizeDomain,
    findMatchingServices,
    getServiceDisplayGroups,
    generateServicePassword,
    verifyMasterPassword,
    deriveHmacKey,
    equalArrayBuffers,
  }
}
