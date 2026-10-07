import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, Info, Network } from 'lucide-react'
import ToolHeader from './ToolHeader'
import { calculateCidr, type CidrResult } from './cidr/calculator'

type CalculationState = {
  result: CidrResult | null
  error: string
}

export default function CidrPage() {
  const [input, setInput] = useState('192.168.1.42/24')
  const [copied, setCopied] = useState(false)
  const calculation = useMemo<CalculationState>(() => {
    try {
      return { result: calculateCidr(input), error: '' }
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Impossible de calculer ce sous-réseau.',
      }
    }
  }, [input])

  const result = calculation.result
  const formatCount = (value: number) => new Intl.NumberFormat('fr-FR').format(value)

  async function copySummary() {
    if (!result) return
    const text = [
      `CIDR : ${result.input}`,
      `Réseau : ${result.network}/${result.prefix}`,
      `Masque : ${result.netmask}`,
      `${result.prefix <= 30 ? 'Broadcast' : 'Dernière adresse'} : ${result.broadcast}`,
      `Première adresse utilisable : ${result.firstHost}`,
      `Dernière adresse utilisable : ${result.lastHost}`,
      `Adresses totales : ${formatCount(result.totalAddresses)}`,
      `Hôtes utilisables : ${formatCount(result.usableHosts)}`,
    ].join('\n')

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const succeeded = document.execCommand('copy')
      textarea.remove()
      if (!succeeded) return
    }

    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const metrics = result ? [
    { label: 'Adresse saisie', value: result.address, detail: `préfixe /${result.prefix}` },
    { label: 'Adresse réseau', value: `${result.network}/${result.prefix}`, detail: 'adresse de début du bloc' },
    { label: 'Masque réseau', value: result.netmask, detail: `wildcard ${result.wildcard}` },
    { label: result.prefix <= 30 ? 'Broadcast' : 'Dernière adresse', value: result.broadcast, detail: 'fin du bloc IPv4' },
    { label: 'Première adresse utilisable', value: result.firstHost, detail: 'plage hôte' },
    { label: 'Dernière adresse utilisable', value: result.lastHost, detail: 'plage hôte' },
    { label: 'Adresses totales', value: formatCount(result.totalAddresses), detail: 'dans le sous-réseau' },
    { label: 'Hôtes utilisables', value: formatCount(result.usableHosts), detail: 'selon les règles IPv4 usuelles' },
  ] : []

  return (
    <div className="tools-page cidr-page">
      <ToolHeader active="cidr" />

      <main className="tools-shell cidr-main" id="contenu">
        <nav className="revshell-breadcrumb" aria-label="Fil d’Ariane">
          <a href="/tools/"><ArrowLeft aria-hidden="true" /> TOUS LES OUTILS</a>
          <span aria-hidden="true">/</span>
          <span>RÉSEAU</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">CIDR</span>
        </nav>

        <section className="cidr-hero" aria-labelledby="cidr-title">
          <div>
            <p className="tools-eyebrow"><span>FOXHACK TOOLS</span> / 002 / NETWORK</p>
            <h1 id="cidr-title">Calculateur <span>CIDR</span><b>.</b></h1>
            <p>Analyse un sous-réseau IPv4 directement dans ton navigateur, sans requête serveur.</p>
          </div>
          <div className="cidr-hero__icon" aria-hidden="true"><Network /></div>
        </section>

        <section className="cidr-input-panel" aria-labelledby="cidr-input-title">
          <div className="cidr-input-panel__heading">
            <div>
              <p className="tools-eyebrow">ENTRÉE / IPV4</p>
              <h2 id="cidr-input-title">Adresse et préfixe</h2>
            </div>
            <span className="cidr-local-badge"><span /> CALCUL LOCAL</span>
          </div>
          <div className="cidr-input-panel__form">
            <label className="cidr-input-field" htmlFor="cidr-input">
              <span className="cidr-input-field__prefix" aria-hidden="true">⌁</span>
              <input
                id="cidr-input"
                type="text"
                value={input}
                onChange={(event) => { setInput(event.target.value); setCopied(false) }}
                placeholder="192.168.1.42/24"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!result}
                aria-describedby={result ? 'cidr-hint' : 'cidr-error'}
              />
              <span className="cidr-input-field__suffix" aria-hidden="true">/ PREFIX</span>
            </label>
            <button type="button" className="revshell-copy-button cidr-copy-all" onClick={copySummary} disabled={!result}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              <span>{copied ? 'COPIÉ' : 'COPIER LE RÉSUMÉ'}</span>
            </button>
          </div>
          <p id={result ? 'cidr-hint' : 'cidr-error'} className={`cidr-input-hint ${result ? '' : 'is-error'}`} role={result ? undefined : 'alert'}>
            {result ? 'Format : adresse IPv4/préfixe — par exemple 192.168.1.42/24.' : calculation.error}
          </p>
        </section>

        {result ? (
          <section className="cidr-results" aria-labelledby="cidr-results-title">
            <div className="cidr-results__heading">
              <div>
                <p className="tools-eyebrow">RÉSULTATS / {result.input}</p>
                <h2 id="cidr-results-title">Détails du sous-réseau</h2>
              </div>
              <span className="cidr-results__count">{formatCount(result.usableHosts)} HÔTES UTILISABLES</span>
            </div>
            <dl className="cidr-metrics">
              {metrics.map((metric, index) => (
                <div className={`cidr-metric ${index === 1 ? 'is-highlighted' : ''}`} key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                  <span>{metric.detail}</span>
                </div>
              ))}
            </dl>
          </section>
        ) : (
          <div className="cidr-empty-state" role="status">
            <Info aria-hidden="true" />
            <p>Vérifie l’adresse IPv4 et le préfixe CIDR pour afficher les résultats.</p>
          </div>
        )}

        <aside className="tools-callout cidr-callout">
          <div className="tools-callout__signal" aria-hidden="true">i</div>
          <div>
            <p className="tools-callout__title">Convention IPv4</p>
            <p>Pour les préfixes /31, les deux adresses sont comptées comme utilisables sur un lien point-à-point. Un /32 représente une seule adresse.</p>
          </div>
          <span className="tools-callout__code">RFC 3021 / HOST ROUTE</span>
        </aside>
      </main>

      <footer className="tools-footer">
        <div className="tools-shell tools-footer__inner">
          <span>© 2026 FOXHACK <span className="tools-footer__slash">/</span> CIDR</span>
          <a href="/tools/">RETOUR AU CATALOGUE <ArrowLeft aria-hidden="true" /></a>
        </div>
      </footer>
    </div>
  )
}
