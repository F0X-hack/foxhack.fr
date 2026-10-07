export type CidrResult = {
  input: string
  address: string
  prefix: number
  network: string
  broadcast: string
  netmask: string
  wildcard: string
  firstHost: string
  lastHost: string
  totalAddresses: number
  usableHosts: number
}

function ipv4ToNumber(address: string): number {
  const octets = address.split('.')
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part))) {
    throw new Error('Saisis une adresse IPv4 valide.')
  }

  const values = octets.map(Number)
  if (values.some((value) => value < 0 || value > 255)) {
    throw new Error('Chaque partie de l’adresse doit être comprise entre 0 et 255.')
  }

  return values.reduce((result, octet) => ((result << 8) | octet) >>> 0, 0)
}

export function formatIpv4(value: number): string {
  const address = value >>> 0
  return [24, 16, 8, 0].map((shift) => (address >>> shift) & 255).join('.')
}

export function calculateCidr(input: string): CidrResult {
  const value = input.trim()
  const match = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(value)
  if (!match) throw new Error('Saisis une IPv4 avec un préfixe CIDR, par exemple 192.168.1.42/24.')

  const [, addressInput, prefixInput] = match
  const addressNumber = ipv4ToNumber(addressInput)
  const prefix = Number(prefixInput)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('Le préfixe CIDR doit être compris entre 0 et 32.')
  }

  const maskNumber = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const hostMaskNumber = (~maskNumber) >>> 0
  const networkNumber = (addressNumber & maskNumber) >>> 0
  const broadcastNumber = (networkNumber | hostMaskNumber) >>> 0
  const totalAddresses = 2 ** (32 - prefix)
  const usableHosts = prefix <= 30 ? totalAddresses - 2 : prefix === 31 ? 2 : 1
  const firstHostNumber = prefix <= 30 ? (networkNumber + 1) >>> 0 : networkNumber
  const lastHostNumber = prefix <= 30 ? (broadcastNumber - 1) >>> 0 : broadcastNumber

  return {
    input: `${formatIpv4(addressNumber)}/${prefix}`,
    address: formatIpv4(addressNumber),
    prefix,
    network: formatIpv4(networkNumber),
    broadcast: formatIpv4(broadcastNumber),
    netmask: formatIpv4(maskNumber),
    wildcard: formatIpv4(hostMaskNumber),
    firstHost: formatIpv4(firstHostNumber),
    lastHost: formatIpv4(lastHostNumber),
    totalAddresses,
    usableHosts,
  }
}
