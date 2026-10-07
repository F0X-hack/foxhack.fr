import assert from 'node:assert/strict'
import {
  generateListener,
  generateReverseShell,
  isValidHost,
  isValidPort,
  payloadTypes,
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

for (const { id } of payloadTypes) {
  const command = generateReverseShell('192.0.2.10', '4444', id)
  assert.ok(command.includes('192.0.2.10'), `${id} output contains the selected host`)
  assert.ok(command.includes('4444'), `${id} output contains the selected port`)
}

assert.equal(generateListener(9001), 'nc -lvnp 9001')
assert.throws(() => generateReverseShell('127.0.0.1;id', 9001, 'bash'))
assert.throws(() => generateReverseShell('127.0.0.1', 65536, 'python3'))
assert.throws(() => generateListener('0'))

console.log('Revshell checks passed: input validation, payload templates and listener command.')
