import assert from 'node:assert/strict'
import { calculateCidr, formatIpv4 } from '../src/tools/cidr/calculator'

const subnet = calculateCidr('192.168.1.42/24')
assert.equal(subnet.network, '192.168.1.0')
assert.equal(subnet.broadcast, '192.168.1.255')
assert.equal(subnet.netmask, '255.255.255.0')
assert.equal(subnet.wildcard, '0.0.0.255')
assert.equal(subnet.firstHost, '192.168.1.1')
assert.equal(subnet.lastHost, '192.168.1.254')
assert.equal(subnet.totalAddresses, 256)
assert.equal(subnet.usableHosts, 254)

const pointToPoint = calculateCidr('10.0.0.4/31')
assert.equal(pointToPoint.firstHost, '10.0.0.4')
assert.equal(pointToPoint.lastHost, '10.0.0.5')
assert.equal(pointToPoint.usableHosts, 2)

const hostRoute = calculateCidr('203.0.113.9/32')
assert.equal(hostRoute.network, '203.0.113.9')
assert.equal(hostRoute.usableHosts, 1)
assert.equal(hostRoute.totalAddresses, 1)

assert.equal(calculateCidr('0.0.0.1/0').broadcast, '255.255.255.255')
assert.equal(formatIpv4(0xffffffff), '255.255.255.255')
assert.throws(() => calculateCidr('192.168.1.1/33'))
assert.throws(() => calculateCidr('256.1.1.1/24'))
assert.throws(() => calculateCidr('192.168.1.1'))

console.log('CIDR checks passed: masks, ranges, /31 and /32 edge cases, validation.')
