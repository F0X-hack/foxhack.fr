import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, Info, ShieldAlert, Terminal } from 'lucide-react'
import ToolHeader from './ToolHeader'
import {
  generateListener,
  generateReverseShell,
  isValidHost,
  isValidPort,
  payloadTypes,
  type PayloadType,
} from './revshell/generator'

type CopyTarget = 'payload' | 'listener'

function useClipboard() {
  const [copied, setCopied] = useState<CopyTarget | null>(null)

  async function copy(value: string, target: CopyTarget) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        throw new Error('Clipboard API unavailable')
      }
      setCopied(target)
      window.setTimeout(() => setCopied((current) => current === target ? null : current), 1600)
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
      if (succeeded) {
        setCopied(target)
        window.setTimeout(() => setCopied((current) => current === target ? null : current), 1600)
      } else {
        setCopied(null)
      }
    }
  }

  return { copied, copy }
}

export default function RevshellPage() {
  const [host, setHost] = useState('127.0.0.1')
  const [port, setPort] = useState('9001')
  const [payloadType, setPayloadType] = useState<PayloadType>('bash')
  const { copied, copy } = useClipboard()

  const hostIsValid = isValidHost(host)
  const portIsValid = isValidPort(port)
  const ready = hostIsValid && portIsValid
  const selectedType = payloadTypes.find((item) => item.id === payloadType) ?? payloadTypes[0]

  const payload = useMemo(() => {
    if (!ready) return ''
    return generateReverseShell(host, port, payloadType)
  }, [host, port, payloadType, ready])

  const listener = portIsValid ? generateListener(port) : ''
  const hostError = host.trim() ? !hostIsValid : false
  const portError = port.trim() !== '' && !portIsValid

  return (
    <div className="tools-page revshell-page">
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
              Générateur de commandes reverse shell pour les exercices en labo et les tests autorisés.
            </p>
          </div>
          <div className="revshell-version">
            <span className="revshell-version__dot" aria-hidden="true" />
            <span>GÉNÉRATION LOCALE</span>
            <span className="revshell-version__divider">/</span>
            <span>V1.0</span>
          </div>
        </section>

        <section className="revshell-warning" aria-label="Avertissement d’utilisation">
          <ShieldAlert aria-hidden="true" />
          <p><strong>À utiliser uniquement avec autorisation.</strong> Les paramètres saisis restent dans ton navigateur ; aucun backend ne les reçoit.</p>
          <span className="revshell-warning__tag">LAB ONLY</span>
        </section>

        <div className="revshell-layout">
          <section className="revshell-panel" aria-labelledby="config-title">
            <div className="revshell-panel__header">
              <div className="revshell-panel__title-wrap">
                <span className="revshell-panel__number">01</span>
                <div>
                  <p className="tools-eyebrow">CONFIGURATION</p>
                  <h2 id="config-title">Paramètres de connexion</h2>
                </div>
              </div>
              <span className="revshell-panel__indicator"><span /> EN ATTENTE</span>
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
                    value={host}
                    onChange={(event) => setHost(event.target.value)}
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
                <div className={`revshell-input-wrap ${portError ? 'has-error' : ''}`}>
                  <span className="revshell-input-prefix" aria-hidden="true">#</span>
                  <input
                    id="revshell-port"
                    name="port"
                    type="number"
                    min="1"
                    max="65535"
                    step="1"
                    value={port}
                    onChange={(event) => setPort(event.target.value)}
                    inputMode="numeric"
                    aria-invalid={portError}
                    aria-describedby={portError ? 'port-error' : 'port-hint'}
                  />
                </div>
                <p id={portError ? 'port-error' : 'port-hint'} className={`revshell-field__hint ${portError ? 'is-error' : ''}`}>
                  {portError ? 'Le port doit être compris entre 1 et 65535.' : 'Valeur comprise entre 1 et 65535'}
                </p>
              </div>
            </div>

            <div className="revshell-type-field">
              <div className="revshell-field-heading">
                <label id="payload-type-label">TYPE DE COMMANDE</label>
                <span>Choisis le format adapté à ton environnement</span>
              </div>
              <div className="revshell-type-options" role="group" aria-labelledby="payload-type-label">
                {payloadTypes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`revshell-type-option ${payloadType === item.id ? 'is-selected' : ''}`}
                    aria-pressed={payloadType === item.id}
                    onClick={() => setPayloadType(item.id)}
                  >
                    <span className="revshell-type-option__name">{item.label}</span>
                    <span className="revshell-type-option__hint">{item.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="revshell-output" aria-labelledby="payload-output-title">
              <div className="revshell-output__header">
                <div>
                  <p className="tools-eyebrow">SORTIE / {selectedType.label.toUpperCase()}</p>
                  <h3 id="payload-output-title">Commande reverse shell</h3>
                </div>
                <button
                  type="button"
                  className="revshell-copy-button"
                  onClick={() => payload && copy(payload, 'payload')}
                  disabled={!ready}
                  aria-label={copied === 'payload' ? 'Commande copiée' : 'Copier la commande'}
                >
                  {copied === 'payload' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  <span>{copied === 'payload' ? 'COPIÉ' : 'COPIER'}</span>
                </button>
              </div>
              <pre className={`revshell-code ${ready ? '' : 'is-empty'}`} aria-live="polite"><code>{ready ? payload : 'Renseigne une adresse et un port valides pour générer la commande.'}</code></pre>
              <p className="revshell-output__footnote"><span aria-hidden="true">›</span> La commande est mise à jour à chaque modification.</p>
            </div>
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
              <p className="revshell-aside__description">Commande Netcat à lancer dans ton environnement de test avant le contrôle.</p>
              <pre className={`revshell-listener__code ${listener ? '' : 'is-empty'}`}><code>{listener || 'Port invalide'}</code></pre>
              <button
                type="button"
                className="revshell-listener__copy"
                onClick={() => listener && copy(listener, 'listener')}
                disabled={!listener}
              >
                {copied === 'listener' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied === 'listener' ? 'COPIÉ' : 'COPIER LA COMMANDE'}
              </button>
            </section>

            <section className="revshell-info" aria-labelledby="info-title">
              <div className="revshell-info__heading">
                <Info aria-hidden="true" />
                <h2 id="info-title">À savoir</h2>
              </div>
              <ul>
                <li>La génération est effectuée localement dans cette page.</li>
                <li>Une connexion entrante peut nécessiter une règle réseau adaptée dans ton labo.</li>
                <li>Vérifie l’adresse et le port avant de copier la sortie.</li>
              </ul>
            </section>

            <a className="revshell-back-link" href="/tools/"><ArrowLeft aria-hidden="true" /> RETOUR AU CATALOGUE</a>
          </aside>
        </div>

        <div className="revshell-footnote">
          <span className="revshell-footnote__icon">i</span>
          <p>Outil pédagogique pour les CTF, environnements isolés et tests explicitement autorisés. N’exécute pas de commande sur un système sans permission.</p>
        </div>
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
