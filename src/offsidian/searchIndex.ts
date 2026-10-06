import type { VaultSearchIndex } from './types'

/* L'index plein texte pèse ~1 Mo : on ne le télécharge qu'au moment où la
   recherche devient plausible (survol ou focus du champ, ⌘K), et une seule
   fois par session. Les visites suivantes repassent par le cache HTTP
   (requête conditionnelle), sans recharger le corps du fichier. */
let request: Promise<VaultSearchIndex> | null = null

export function loadSearchIndex(): Promise<VaultSearchIndex> {
  if (!request) {
    request = fetch('/offsidian/search-index.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Index HTTP ${response.status}`)
        return response.json() as Promise<VaultSearchIndex>
      })
      .catch((reason) => {
        request = null
        throw reason
      })
  }
  return request
}

/** Lance le téléchargement sans attendre : appelé au survol du champ de recherche. */
export function warmSearchIndex() {
  loadSearchIndex().catch(() => undefined)
}
