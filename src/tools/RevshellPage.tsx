import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Info,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react'
import ToolHeader from './ToolHeader'
import {
  defaultPayloadSelections,
  encodings,
  generateListenerForPreset,
  generatePayload,
  getPayload,
  isLowPort,
  isValidHost,
  isValidPort,
  listenerPresets,
  operatingSystems,
  payloadCategories,
  payloadsForCategory,
  shells,
  type OperatingSystemFilter,
  type PayloadCategory,
  type PayloadEncoding,
  type PayloadTemplate,
} from './revshell/generator'

type CopyTarget = 'payload' | 'listener'
type Theme = 'dark' | 'light' | 'meme'

type RevshellSettings = {
  host: string
  port: string
  category: PayloadCategory
  encoding: PayloadEncoding
  shell: string
  listenerId: string
  search: string
  operatingSystem: OperatingSystemFilter
  theme: Theme
  selectedByCategory: Record<PayloadCategory, string>
}

const STORAGE_KEY = 'foxhack:revshell:settings:v2'
const themeOptions: { id: Theme; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'meme', label: 'Meme' },
]
const osTags = new Set(['windows', 'linux', 'mac', 'macos', 'android', 'apple_ios'])

function makeDefaultSettings(): RevshellSettings {
  return {
    host: '10.10.10.10',
    port: '9001',
    category: 'ReverseShell',
    encoding: 'none',
    shell: 'bash',
    listenerId: listenerPresets[0]?.id ?? 'nc',
    search: '',
    operatingSystem: 'all',
    theme: 'dark',
    selectedByCategory: defaultPayloadSelections(),
  }
}

function isCategory(value: unknown): value is PayloadCategory {
  return payloadCategories.some(({ id }) => id === value)
}

function isEncoding(value: unknown): value is PayloadEncoding {
  return encodings.some(({ id }) => id === value)
}

function isOperatingSystem(value: unknown): value is OperatingSystemFilter {
  return operatingSystems.some(({ id }) => id === value)
}

function isTheme(value: unknown): value is Theme {
  return themeOptions.some(({ id }) => id === value)
}

function loadSettings(): RevshellSettings {
  const defaults = makeDefaultSettings()
  if (typeof window === 'undefined') return defaults

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<RevshellSettings> | null
    if (!saved || typeof saved !== 'object') return defaults

    const selectedByCategory = { ...defaults.selectedByCategory, ...(saved.selectedByCategory ?? {}) }
    for (const { id } of payloadCategories) {
      if (!getPayload(id, selectedByCategory[id])) selectedByCategory[id] = defaults.selectedByCategory[id]
    }

    return {
      ...defaults,
      host: typeof saved.host === 'string' ? saved.host : defaults.host,
      port: typeof saved.port === 'string' ? saved.port : defaults.port,
      category: isCategory(saved.category) ? saved.category : defaults.category,
      encoding: isEncoding(saved.encoding) ? saved.encoding : defaults.encoding,
      shell: typeof saved.shell === 'string' && shells.includes(saved.shell) ? saved.shell : defaults.shell,
      listenerId: typeof saved.listenerId === 'string' && listenerPresets.some((preset) => preset.id === saved.listenerId)
        ? saved.listenerId
        : defaults.listenerId,
      search: typeof saved.search === 'string' ? saved.search : defaults.search,
      operatingSystem: isOperatingSystem(saved.operatingSystem) ? saved.operatingSystem : defaults.operatingSystem,
      theme: isTheme(saved.theme) ? saved.theme : defaults.theme,
      selectedByCategory,
    }
  } catch {
    return defaults
  }
}

function useClipboard() {
  const [copied, setCopied] = useState<CopyTarget | null>(null)

  async function copy(value: string, target: CopyTarget) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(value)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const succeeded = document.execCommand('copy')
      textarea.remove()
      if (!succeeded) return
    }

    setCopied(target)
    window.setTimeout(() => setCopied((current) => current === target ? null : current), 1600)
  }

  return { copied, copy }
}

function downloadText(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function filenamePart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'payload'
}

function getOsTags(payload: PayloadTemplate): string[] {
  return [...new Set(payload.meta.filter((tag) => osTags.has(tag)).map((tag) => {
    if (tag === 'macos') return 'mac'
    if (tag === 'apple_ios') return 'ios'
    return tag
  }))]
}

function matchesOs(payload: PayloadTemplate, filter: OperatingSystemFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'mac') return payload.meta.includes('mac') || payload.meta.includes('macos')
  return payload.meta.includes(filter)
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Impossible de générer cette commande.'
}

export default function RevshellPage() {
  const [settings, setSettings] = useState<RevshellSettings>(loadSettings)
  const [rawMode, setRawMode] = useState(false)
  const { copied, copy } = useClipboard()

  function updateSetting<Key extends keyof RevshellSettings>(key: Key, value: RevshellSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // The tool continues to work when storage is disabled or full.
    }
  }, [settings])

  useEffect(() => {
    if (!rawMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRawMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rawMode])

  const hostIsValid = isValidHost(settings.host)
  const portIsValid = isValidPort(settings.port)
  const ready = hostIsValid && portIsValid
  const hostError = settings.host.trim() !== '' && !hostIsValid
  const portError = settings.port.trim() !== '' && !portIsValid
  const selectedPayloadName = settings.selectedByCategory[settings.category]
  const selectedPayload = getPayload(settings.category, selectedPayloadName)
    ?? payloadsForCategory(settings.category)[0]
  const filteredPayloads = useMemo(() => {
    const search = settings.search.trim().toLowerCase()
    return payloadsForCategory(settings.category).filter((payload) => {
      if (!matchesOs(payload, settings.operatingSystem)) return false
      if (!search) return true
      return `${payload.name} ${payload.meta.join(' ')}`.toLowerCase().includes(search)
    })
  }, [settings.category, settings.operatingSystem, settings.search])

  const generated = useMemo(() => {
    if (!ready || !selectedPayload) return { command: '', error: '' }
    try {
      return {
        command: generatePayload(selectedPayload, {
          host: settings.host,
          port: settings.port,
          shell: settings.shell,
          category: settings.category,
          encoding: settings.encoding,
        }),
        error: '',
      }
    } catch (error) {
      return { command: '', error: describeError(error) }
    }
  }, [ready, selectedPayload, settings.category, settings.encoding, settings.host, settings.port, settings.shell])

  const selectedListener = listenerPresets.find((preset) => preset.id === settings.listenerId) ?? listenerPresets[0]
  const listenerOutput = useMemo(() => {
    if (!ready || !selectedListener || !selectedPayload) return { command: '', warning: '' }
    try {
      return generateListenerForPreset(selectedListener, {
        host: settings.host,
        port: settings.port,
        category: settings.category,
        selectedPayload,
      })
    } catch (error) {
      return { command: '', warning: describeError(error) }
    }
  }, [ready, selectedListener, selectedPayload, settings.category, settings.host, settings.port])

  const portNeedsPrivileges = isLowPort(settings.port)

  function selectPayload(name: string) {
    setSettings((current) => ({
      ...current,
      selectedByCategory: { ...current.selectedByCategory, [current.category]: name },
    }))
  }

  function incrementPort() {
    if (!portIsValid || Number(settings.port) >= 65535) return
    updateSetting('port', String(Number(settings.port) + 1))
  }

  function copyPayload() {
    if (generated.command) void copy(generated.command, 'payload')
  }

  function copyListener() {
    if (listenerOutput.command) void copy(listenerOutput.command, 'listener')
  }

  const payloadPlaceholder = !hostIsValid
    ? 'Saisis une adresse IPv4 ou un nom d’hôte valide.'
    : !portIsValid
      ? 'Saisis un port valide compris entre 1 et 65535.'
      : generated.error || 'Sélectionne un payload pour afficher la commande.'

  return (
    <div className="tools-page revshell-page" data-theme={settings.theme}>
      <ToolHeader active="revshell" />

      <main className="tools-shell revshell-main" id="contenu">
        <nav className="revshell-breadcrumb" aria-label="Fil d’Ariane">
          <a href="/tools/"><ArrowLeft aria-hidden="true" /> TOUS LES OUTILS</a>
          <span aria-hidden="true">/</span>
          <span>RÉSEAU</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">REVSHELL</span>
        </nav>

        <section className="revshell-hero" aria-labelledby="revshell-title">
          <div>
            <p className="tools-eyebrow"><span>FOXHACK TOOLS</span> / 001 / REVERSE SHELL</p>
            <h1 id="revshell-title">Revshell<span className="tools-title-mark">_</span></h1>
            <p className="revshell-hero__lede">
              Générateur local de reverse shells, bind shells, commandes MSFVenom, HoaxShell et shellcodes assembleur.
            </p>
          </div>
          <div className="revshell-version">
            <span className="revshell-version__dot" aria-hidden="true" />
            <span>GÉNÉRATION LOCALE</span>
            <span className="revshell-version__divider">/</span>
            <span>{payloadsForCategory('ReverseShell').length + payloadsForCategory('BindShell').length + payloadsForCategory('MSFVenom').length + payloadsForCategory('HoaxShell').length + payloadsForCategory('Assembled').length} MODÈLES</span>
          </div>
        </section>

        <section className="revshell-warning" aria-label="Avertissement d’utilisation">
          <ShieldAlert aria-hidden="true" />
          <p><strong>À utiliser uniquement avec autorisation.</strong> La génération est locale : aucune adresse ni commande n’est envoyée à un backend.</p>
          <span className="revshell-warning__tag">LAB ONLY</span>
        </section>

        <div className="revshell-layout">
          <section className="revshell-panel" aria-labelledby="config-title">
            <div className="revshell-panel__header">
              <div className="revshell-panel__title-wrap">
                <span className="revshell-panel__number">01</span>
                <div>
                  <p className="tools-eyebrow">CONFIGURATION</p>
                  <h2 id="config-title">Adresse d’écoute & catalogue</h2>
                </div>
              </div>
              <span className="revshell-panel__indicator"><span /> PARAMÈTRES LOCAUX</span>
            </div>

            <div className="revshell-fields">
              <div className="revshell-field">
                <label htmlFor="revshell-host">LHOST <span>— adresse d’écoute</span></label>
                <div className={`revshell-input-wrap ${hostError ? 'has-error' : ''}`}>
                  <span className="revshell-input-prefix" aria-hidden="true">⌁</span>
                  <input
                    id="revshell-host"
                    name="host"
                    type="text"
                    value={settings.host}
                    onChange={(event) => updateSetting('host', event.target.value)}
                    placeholder="10.10.10.10"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="decimal"
                    aria-invalid={hostError}
                    aria-describedby={hostError ? 'host-error' : 'host-hint'}
                  />
                </div>
                <p id={hostError ? 'host-error' : 'host-hint'} className={`revshell-field__hint ${hostError ? 'is-error' : ''}`}>
                  {hostError ? 'Saisis une IPv4 ou un nom d’hôte valide.' : 'IPv4 ou nom d’hôte — ex. 10.10.10.10'}
                </p>
              </div>

              <div className="revshell-field">
                <label htmlFor="revshell-port">LPORT <span>— port d’écoute</span></label>
                <div className={`revshell-port-control ${portError ? 'has-error' : ''}`}>
                  <div className="revshell-input-wrap">
                    <span className="revshell-input-prefix" aria-hidden="true">#</span>
                    <input
                      id="revshell-port"
                      name="port"
                      type="number"
                      min="1"
                      max="65535"
                      step="1"
                      value={settings.port}
                      onChange={(event) => updateSetting('port', event.target.value)}
                      inputMode="numeric"
                      aria-invalid={portError}
                      aria-describedby={portError ? 'port-error' : 'port-hint'}
                    />
                  </div>
                  <button
                    type="button"
                    className="revshell-port-increment"
                    onClick={incrementPort}
                    disabled={!portIsValid || Number(settings.port) >= 65535}
                    aria-label="Incrémenter le port de un"
                    title="Incrémenter le port de +1"
                  >
                    <Plus aria-hidden="true" />
                    <span>+1</span>
                  </button>
                </div>
                <p id={portError ? 'port-error' : 'port-hint'} className={`revshell-field__hint ${portError ? 'is-error' : ''}`}>
                  {portError ? 'Le port doit être compris entre 1 et 65535.' : 'Port TCP/UDP compris entre 1 et 65535'}
                </p>
              </div>
            </div>

            {portNeedsPrivileges && (
              <p className="revshell-privilege-warning" role="status">
                <ShieldAlert aria-hidden="true" /> Port inférieur à 1024 : le listener peut nécessiter des privilèges élevés (root / administrateur).
              </p>
            )}

            <div className="revshell-payload-browser">
              <div className="revshell-category-tabs" role="tablist" aria-label="Famille de payloads">
                {payloadCategories.map((category) => {
                  const active = settings.category === category.id
                  return (
                    <button
                      key={category.id}
                      id={`revshell-tab-${category.id}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls="revshell-payload-panel"
                      className={`revshell-category-tab ${active ? 'is-selected' : ''}`}
                      onClick={() => updateSetting('category', category.id)}
                    >
                      <span>{category.label}</span>
                      <span className="revshell-category-tab__count">{payloadsForCategory(category.id).length}</span>
                    </button>
                  )
                })}
              </div>

              <div className="revshell-browser-toolbar">
                <label className="revshell-search" htmlFor="revshell-search">
                  <Search aria-hidden="true" />
                  <input
                    id="revshell-search"
                    type="search"
                    value={settings.search}
                    onChange={(event) => updateSetting('search', event.target.value)}
                    placeholder="Rechercher un payload…"
                    autoComplete="off"
                  />
                </label>
                <label className="revshell-os-filter" htmlFor="revshell-os-filter">
                  <span>OS</span>
                  <select
                    id="revshell-os-filter"
                    value={settings.operatingSystem}
                    onChange={(event) => updateSetting('operatingSystem', event.target.value as OperatingSystemFilter)}
                  >
                    {operatingSystems.map((operatingSystem) => (
                      <option key={operatingSystem.id} value={operatingSystem.id}>{operatingSystem.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div id="revshell-payload-panel" role="tabpanel" aria-labelledby={`revshell-tab-${settings.category}`}>
                <div className="revshell-payload-list__heading">
                  <span>{payloadCategories.find(({ id }) => id === settings.category)?.description}</span>
                  <span>{filteredPayloads.length} / {payloadsForCategory(settings.category).length}</span>
                </div>
                <div className="revshell-payload-list" role="listbox" aria-label="Sélection du payload">
                  {filteredPayloads.length > 0 ? filteredPayloads.map((payload) => {
                    const active = selectedPayload?.name === payload.name
                    const tags = getOsTags(payload)
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        key={`${settings.category}-${payload.name}`}
                        className={`revshell-payload-option ${active ? 'is-selected' : ''}`}
                        onClick={() => selectPayload(payload.name)}
                      >
                        <span className="revshell-payload-option__name">{payload.name}</span>
                        <span className="revshell-payload-option__tags">
                          {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <span>multi-OS</span>}
                        </span>
                      </button>
                    )
                  }) : (
                    <p className="revshell-payload-empty">Aucun payload ne correspond à ces filtres.</p>
                  )}
                </div>
              </div>
            </div>

            <details className="revshell-advanced">
              <summary><SlidersHorizontal aria-hidden="true" /><span>Options avancées</span><span className="revshell-advanced__hint">Shell cible</span></summary>
              <div className="revshell-advanced__content">
                <label className="revshell-control" htmlFor="revshell-shell">
                  <span>Shell cible</span>
                  <select id="revshell-shell" value={settings.shell} onChange={(event) => updateSetting('shell', event.target.value)}>
                    {shells.map((shell) => <option key={shell} value={shell}>{shell}</option>)}
                  </select>
                  <small>Utilisé par les modèles qui contiennent le paramètre <code>{'{shell}'}</code>.</small>
                </label>
              </div>
            </details>

            <section className="revshell-output" aria-labelledby="payload-output-title">
              <div className="revshell-output__header">
                <div className="revshell-output__title">
                  <p className="tools-eyebrow">SORTIE / {payloadCategories.find(({ id }) => id === settings.category)?.label.toUpperCase()}</p>
                  <h3 id="payload-output-title">{selectedPayload?.name ?? 'Commande générée'}</h3>
                </div>
                <div className="revshell-output__actions">
                  <label className="revshell-encoding" htmlFor="revshell-encoding">
                    <span>ENCODAGE</span>
                    <select
                      id="revshell-encoding"
                      value={settings.encoding}
                      onChange={(event) => updateSetting('encoding', event.target.value as PayloadEncoding)}
                    >
                      {encodings.map((encoding) => <option key={encoding.id} value={encoding.id}>{encoding.label}</option>)}
                    </select>
                  </label>
                  <button type="button" className="revshell-action-button" onClick={() => setRawMode(true)} disabled={!generated.command}>
                    <Terminal aria-hidden="true" /><span>RAW</span>
                  </button>
                  <button
                    type="button"
                    className="revshell-action-button"
                    onClick={() => generated.command && downloadText(`revshell-${filenamePart(selectedPayload?.name ?? 'payload')}.txt`, generated.command)}
                    disabled={!generated.command}
                  >
                    <Download aria-hidden="true" /><span>TÉLÉCHARGER</span>
                  </button>
                  <button
                    type="button"
                    className="revshell-copy-button"
                    onClick={copyPayload}
                    disabled={!generated.command}
                    aria-label={copied === 'payload' ? 'Commande copiée' : 'Copier la commande'}
                  >
                    {copied === 'payload' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    <span>{copied === 'payload' ? 'COPIÉ' : 'COPIER'}</span>
                  </button>
                </div>
              </div>
              <pre className={`revshell-code ${generated.command ? '' : 'is-empty'}`} aria-live="polite"><code>{generated.command || generated.error || payloadPlaceholder}</code></pre>
              <p className="revshell-output__footnote"><span aria-hidden="true">›</span> Le résultat est généré dans le navigateur et suit les paramètres d’encodage sélectionnés.</p>
            </section>
          </section>

          <aside className="revshell-aside">
            <section className="revshell-listener" aria-labelledby="listener-title">
              <div className="revshell-aside__header">
                <div className="revshell-aside__icon"><Terminal aria-hidden="true" /></div>
                <div>
                  <p className="tools-eyebrow">CÔTÉ ÉCOUTE</p>
                  <h2 id="listener-title">Listener</h2>
                </div>
              </div>
              <p className="revshell-aside__description">Choisis un listener adapté au payload, puis lance-le dans ton environnement autorisé.</p>
              <label className="revshell-listener-select" htmlFor="revshell-listener-select">
                <span>TYPE DE LISTENER</span>
                <select
                  id="revshell-listener-select"
                  value={selectedListener?.id ?? ''}
                  onChange={(event) => updateSetting('listenerId', event.target.value)}
                >
                  {listenerPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                </select>
              </label>
              {listenerOutput.warning && <p className="revshell-listener__warning" role="status">{listenerOutput.warning}</p>}
              <pre className={`revshell-listener__code ${listenerOutput.command ? '' : 'is-empty'}`}><code>{listenerOutput.command || 'Vérifie l’adresse et le port pour générer le listener.'}</code></pre>
              <div className="revshell-listener__actions">
                <button type="button" className="revshell-listener__copy" onClick={copyListener} disabled={!listenerOutput.command}>
                  {copied === 'listener' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied === 'listener' ? 'COPIÉ' : 'COPIER'}
                </button>
                <button
                  type="button"
                  className="revshell-listener__download"
                  onClick={() => listenerOutput.command && downloadText(`listener-${filenamePart(selectedListener?.label ?? 'nc')}.txt`, listenerOutput.command)}
                  disabled={!listenerOutput.command}
                  aria-label="Télécharger la commande du listener"
                >
                  <Download aria-hidden="true" />
                </button>
              </div>
            </section>

            <section className="revshell-theme-card" aria-labelledby="theme-title">
              <p className="tools-eyebrow">APPARENCE</p>
              <h2 id="theme-title">Thème</h2>
              <div className="revshell-theme-options" role="group" aria-label="Choisir un thème">
                {themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={settings.theme === theme.id}
                    className={settings.theme === theme.id ? 'is-selected' : ''}
                    onClick={() => updateSetting('theme', theme.id)}
                  >
                    {theme.id === 'meme' && <Sparkles aria-hidden="true" />}{theme.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="revshell-info" aria-labelledby="info-title">
              <div className="revshell-info__heading">
                <Info aria-hidden="true" />
                <h2 id="info-title">À savoir</h2>
              </div>
              <ul>
                <li>Filtres par système, recherche, shell cible et quatre encodages.</li>
                <li>Les paramètres sont sauvegardés dans le stockage local de ce navigateur.</li>
                <li>Les ports inférieurs à 1024 peuvent demander des privilèges élevés.</li>
              </ul>
              <p className="revshell-attribution">Catalogue adapté de <a href="https://github.com/0dayCTF/reverse-shell-generator" target="_blank" rel="noreferrer">0dayCTF/reverse-shell-generator</a> — <a href="/licenses/revshell-generator-MIT.txt">licence MIT</a>.</p>
            </section>

            <a className="revshell-back-link" href="/tools/"><ArrowLeft aria-hidden="true" /> RETOUR AU CATALOGUE</a>
          </aside>
        </div>

        <div className="revshell-footnote">
          <span className="revshell-footnote__icon">i</span>
          <p>Outil pédagogique pour les CTF, environnements isolés et tests explicitement autorisés. N’exécute pas de commande sur un système sans permission.</p>
        </div>

        {rawMode && (
          <div className="revshell-raw-overlay" role="dialog" aria-modal="true" aria-labelledby="revshell-raw-title">
            <section className="revshell-raw-dialog">
              <header>
                <div>
                  <p className="tools-eyebrow">SORTIE TEXTE BRUT / {settings.encoding.toUpperCase()}</p>
                  <h2 id="revshell-raw-title">{selectedPayload?.name}</h2>
                </div>
                <button type="button" className="revshell-raw-close" onClick={() => setRawMode(false)} aria-label="Fermer le mode Raw"><X aria-hidden="true" /></button>
              </header>
              <pre><code>{generated.command}</code></pre>
              <div className="revshell-raw-actions">
                <button type="button" className="revshell-copy-button" onClick={copyPayload}>
                  {copied === 'payload' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied === 'payload' ? 'COPIÉ' : 'COPIER'}
                </button>
                <button type="button" className="revshell-action-button" onClick={() => generated.command && downloadText(`revshell-${filenamePart(selectedPayload?.name ?? 'payload')}.txt`, generated.command)}>
                  <Download aria-hidden="true" /><span>TÉLÉCHARGER</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="tools-footer">
        <div className="tools-shell tools-footer__inner">
          <span>© 2026 FOXHACK <span className="tools-footer__slash">/</span> REVSHELL</span>
          <span className="tools-footer__local">AUCUNE TÉLÉMÉTRIE <span aria-hidden="true">·</span> AUCUN BACKEND</span>
        </div>
      </footer>
    </div>
  )
}
