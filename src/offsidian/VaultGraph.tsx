import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, Network, X } from 'lucide-react'
import type { OpenNote, VaultManifest, VaultNote } from './types'
import { shortTitle } from './utils'

type GraphNode = {
  note: VaultNote
  x: number
  y: number
  direction: 'out' | 'in' | 'both'
}

type VaultGraphProps = {
  open: boolean
  manifest: VaultManifest
  selected: VaultNote
  onClose: () => void
  onOpenNote: OpenNote
}

const truncate = (value: string, max = 23) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

export default function VaultGraph({ open, manifest, selected, onClose, onOpenNote }: VaultGraphProps) {
  const noteById = useMemo(() => new Map(manifest.notes.map((note) => [note.id, note])), [manifest.notes])

  const nodes = useMemo(() => {
    const outbound = new Set(selected.links.map((link) => link.id))
    const inbound = new Set(selected.backlinks)
    const ids = [...new Set([...outbound, ...inbound])].slice(0, 30)

    return ids.flatMap((id, index): GraphNode[] => {
      const note = noteById.get(id)
      if (!note) return []
      const firstRingCount = Math.min(ids.length, 16)
      const isOuter = index >= firstRingCount
      const ringIndex = isOuter ? index - firstRingCount : index
      const ringCount = isOuter ? ids.length - firstRingCount : firstRingCount
      const radiusX = isOuter ? 338 : 220
      const radiusY = isOuter ? 202 : 142
      const angle = -Math.PI / 2 + (ringIndex / Math.max(ringCount, 1)) * Math.PI * 2
      return [{
        note,
        x: 450 + Math.cos(angle) * radiusX,
        y: 270 + Math.sin(angle) * radiusY,
        direction: outbound.has(id) && inbound.has(id) ? 'both' : outbound.has(id) ? 'out' : 'in',
      }]
    })
  }, [noteById, selected.backlinks, selected.links])

  if (!open) return null

  const hiddenConnections = new Set([...selected.links.map((link) => link.id), ...selected.backlinks]).size - nodes.length

  return (
    <div className="offsidian-modal-layer offsidian-graph-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="offsidian-graph-modal" role="dialog" aria-modal="true" aria-label={`Graphe local de ${selected.title}`}>
        <header className="offsidian-graph-header">
          <div>
            <span className="offsidian-kicker"><Network aria-hidden="true" /> Graphe local</span>
            <h2>{shortTitle(selected)}</h2>
            <p>{nodes.length} note{nodes.length > 1 ? 's' : ''} directement reliée{nodes.length > 1 ? 's' : ''}</p>
          </div>
          <button type="button" className="offsidian-icon-btn" onClick={onClose} aria-label="Fermer le graphe">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="offsidian-graph-stage">
          <svg viewBox="0 0 900 540" role="img" aria-label="Visualisation des liens entre les notes">
            <defs>
              <radialGradient id="graph-center-glow">
                <stop offset="0" stopColor="rgb(255 106 32)" stopOpacity="0.34" />
                <stop offset="1" stopColor="rgb(255 106 32)" stopOpacity="0" />
              </radialGradient>
              <filter id="graph-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <circle cx="450" cy="270" r="105" fill="url(#graph-center-glow)" />
            {nodes.map((node) => (
              <line
                key={`line-${node.note.id}`}
                x1="450"
                y1="270"
                x2={node.x}
                y2={node.y}
                className={`graph-edge graph-edge--${node.direction}`}
              />
            ))}

            {nodes.map((node) => (
              <g
                key={node.note.id}
                className={`graph-node graph-node--${node.note.group.toLocaleLowerCase('fr')}`}
                transform={`translate(${node.x} ${node.y})`}
                role="button"
                tabIndex={0}
                aria-label={`Ouvrir ${node.note.title}`}
                onClick={() => {
                  onOpenNote(node.note.id)
                  onClose()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    onOpenNote(node.note.id)
                    onClose()
                  }
                }}
              >
                <circle r="8" />
                <circle r="15" className="graph-node-hit" />
                <text y="25" textAnchor="middle">{truncate(shortTitle(node.note))}</text>
              </g>
            ))}

            <g className="graph-node graph-node--center" transform="translate(450 270)">
              <circle r="15" filter="url(#graph-glow)" />
              <circle r="28" className="graph-node-center-ring" />
              <text y="42" textAnchor="middle">{truncate(shortTitle(selected), 32)}</text>
            </g>
          </svg>
          {!nodes.length ? (
            <div className="offsidian-graph-empty">
              <Network aria-hidden="true" />
              <p>Cette note n’a pas encore de lien interne.</p>
            </div>
          ) : null}
        </div>

        <footer className="offsidian-graph-footer">
          <div className="offsidian-graph-legend">
            <span><i className="is-out" /> <ArrowUpRight aria-hidden="true" /> lien sortant</span>
            <span><i className="is-in" /> <ArrowDownLeft aria-hidden="true" /> backlink</span>
            <span><i className="is-both" /> double lien</span>
          </div>
          <p>
            Clique sur un nœud pour ouvrir la note.
            {hiddenConnections > 0 ? ` ${hiddenConnections} liens supplémentaires sont masqués pour garder le graphe lisible.` : ''}
          </p>
        </footer>
      </section>
    </div>
  )
}
