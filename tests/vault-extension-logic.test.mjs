import assert from 'node:assert/strict'

const sharedPath = new URL('../vault-chrome-extension/shared.js', import.meta.url)
const {
  normalizeDomain,
  findMatchingServices,
  getServiceDisplayGroups,
  generateServicePassword,
  ACCOUNTS_STORAGE_KEY,
  CURRENT_ACCOUNT_STORAGE_KEY,
  getAccountStorageKey,
  getPreferredAccountId,
  mergeAccountIds,
  replaceSyncedAccountData,
  normalizeExtensionCommand,
  isDeleteAccountCommand,
  isClearAllCommand,
} = await import(sharedPath)

const service = {
  id: 'svc-1',
  name: 'GitHub',
  url: 'https://github.com',
  identifier: 'github',
  length: 16,
  version: 1,
  alphabet: {
    id: 'default',
    identifier: 'default',
    characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
  }
}

assert.equal(normalizeDomain('https://www.github.com/login?tab=overview'), 'github.com')
assert.equal(normalizeDomain('GitHub'), 'github')
assert.deepEqual(findMatchingServices([service], 'github.com'), [service])
assert.deepEqual(findMatchingServices([service], 'notebook.example.com'), [])

const relatedServices = [
  { ...service, id: 'svc-match', name: 'GitHub', url: 'https://github.com' },
  { id: 'svc-2', name: 'GitHub Enterprise', url: 'https://github.example.com' },
  { id: 'svc-3', name: 'Slack', url: 'https://slack.com' },
]
const grouped = getServiceDisplayGroups(relatedServices, 'github.com')
assert.deepEqual(grouped.primary, [relatedServices[0]])
assert.deepEqual(grouped.related.map((entry) => entry.id), ['svc-2', 'svc-3'])
assert.deepEqual(grouped.all.map((entry) => entry.id), ['svc-match', 'svc-2', 'svc-3'])

const password = await generateServicePassword('strong-master-password', 'github', 16, service.alphabet, 1)
assert.equal(typeof password, 'string')
assert.equal(password.length, 16)
assert.equal(ACCOUNTS_STORAGE_KEY, 'vault-synced-accounts')
assert.equal(CURRENT_ACCOUNT_STORAGE_KEY, 'vault-current-account')
assert.equal(getAccountStorageKey('abc-123'), 'vault-account:abc-123')
assert.equal(getPreferredAccountId(['a', 'b'], 'b'), 'b')
assert.equal(getPreferredAccountId(['a', 'b'], 'c'), 'a')
assert.deepEqual(mergeAccountIds(['a', 'b'], 'c'), ['a', 'b', 'c'])
assert.deepEqual(mergeAccountIds(['a', 'b'], 'b'), ['a', 'b'])

const replaced = replaceSyncedAccountData({
  accountId: 'abc-123',
  accountIds: ['abc-123', 'other-account'],
  info: { id: 'abc-123', name: 'Updated', icon: 'star' },
  services: [{ id: 'svc-2', name: 'New Service' }],
  alphabets: [{ id: 'alpha-1', identifier: 'alpha-1' }],
  master: { salt: 'salt', verifier: 'verifier' },
})

assert.deepEqual(replaced.accountIds, ['abc-123', 'other-account'])
assert.equal(replaced.accountData.info.name, 'Updated')
assert.deepEqual(replaced.accountData.services, [{ id: 'svc-2', name: 'New Service' }])
assert.deepEqual(replaced.accountData.alphabets, [{ id: 'alpha-1', identifier: 'alpha-1' }])
assert.deepEqual(replaced.accountData.master, { salt: 'salt', verifier: 'verifier' })

assert.deepEqual(normalizeExtensionCommand({
  source: 'vault-extension-command',
  type: 'DELETE_ACCOUNT',
  payload: { accountId: 'abc-123' },
}), {
  type: 'DELETE_ACCOUNT',
  payload: { accountId: 'abc-123' },
})
assert.equal(isDeleteAccountCommand({ source: 'vault-extension-command', type: 'DELETE_ACCOUNT' }), true)
assert.equal(isClearAllCommand({ source: 'vault-extension-command', type: 'CLEAR_ALL' }), true)
assert.equal(normalizeExtensionCommand({ source: 'vault-extension-sync', type: 'SYNC_ACCOUNT' }), null)

console.log('vault extension logic regression checks passed')
