---
title: "Outil - mitmproxy"
type: outil
categorie: 🔍 Scan Web & Fuzzing
tags:
  - cyber
  - outil
  - 🔍 Scan Web & Fuzzing
statut: publie
version: 12.2.3 (mai 2026)
licence: MIT
langage: Python
developpeur: Aldo Cortesi, Maximilian Hils, Thomas Kriechbaumer
repo: https://github.com/mitmproxy/mitmproxy
site: https://mitmproxy.org
doc: https://docs.mitmproxy.org/stable/
---

# 🔍 mitmproxy — Proxy d'interception TLS scriptable en Python

> [!info] **En 1 phrase**
> mitmproxy est un proxy d'interception TLS ultra-puissant et 100 % scriptable en Python, décliné en trois outils : `mitmproxy` (interface interactive), `mitmdump` (CLI) et `mitmweb` (interface web).

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | mitmproxy |
| Description | Proxy d'interception (MITM) qui décrypte, inspecte, modifie, enregistre et rejoue le trafic HTTP/HTTPS, HTTP/2, HTTP/3, WebSockets, TCP brut, UDP/DTLS et DNS |
| Catégorie | 🔍 Scan Web & Fuzzing |
| Sous-catégorie | Proxy d'interception / analyse de trafic / MITM |
| Fonction principale | Intercepter le trafic réseau via un certificat CA pour l'inspecter et le modifier en temps réel |
| Type d'outil | CLI (TUI `mitmproxy`, CLI `mitmdump`, UI web `mitmweb`) |
| Licence | MIT |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | Python (cœur asyncio, extension Rust `mitmproxy_rs`) |
| Développeur / organisation | Aldo Cortesi, Maximilian Hils, Thomas Kriechbaumer (core team) |
| Projet officiel | https://mitmproxy.org |
| Dépôt officiel | https://github.com/mitmproxy/mitmproxy |
| Documentation officielle | https://docs.mitmproxy.org/stable/ |
| Date de création | 2014 (ex-`libmproxy`, renommé mitmproxy) |
| État du projet | actif (releases ~mensuelles) |
| Dernière version connue | 12.2.3 (12 mai 2026) |
| Systèmes compatibles | Linux / Windows / macOS / Docker ; Python 3.12+ (3.14 embarqué dans les binaires depuis 12.2.0) |

> [!note] Pour vérifier / compléter
> - Le paquet `apt install mitmproxy` est souvent **plus ancien** que la dernière release PyPI ; privilégier `pipx install mitmproxy` ou les binaires de mitmproxy.org.
> - Depuis **12.2.2**, la validité des certificats feuilles générés passe à **199 jours** (12.2.3 : 197 jours) pour rester sous la limite des 200 jours de Chromium — les anciens CA/leaf restent compatibles.

---

## 🎯 Concept

mitmproxy est un proxy MITM (Man In The Middle) écrit en Python qui intercepte, inspecte, modifie, enregistre et rejoue le trafic HTTP/HTTPS (et WebSockets). Il se place entre le client et le serveur et décrypte le HTTPS grâce à un **certificat CA** que l'on installe dans le navigateur ou l'appareil cible.

Sa vraie force est la **scriptabilité** : chaque événement (requête, réponse, websocket...) déclenche des *addons* Python qui peuvent modifier le trafic en temps réel, réinjecter des payloads, loguer des identifiants, ou transformer un replay en fuzzer. Modes disponibles : **regular** (par défaut), **transparent** (transparence réseau), **reverse** (proxy vers un seul hôte), **upstream** (via un autre proxy), **socks5**, **wireguard** (VPN intégré, sans configuration de routage), **local redirect** (interception d'applications locales sans config réseau, Windows/macOS/Linux) et **dns**.

Dans un pentest web ou mobile, mitmproxy se place **entre l'application et le serveur** : il complète Burp Suite pour l'automatisation (scripts Python, replay massif, capture de flux rejouables). Les flux sont filtrables (`~d example.com`, `~m POST`, `~b`, `~h`...) et exportables (HAR, curl, httpie, raw) pour l'analyse hors ligne. Depuis v12, les *contentviews* sont interactives (Protobuf, gRPC, MsgPack), les corps streamés peuvent être stockés, et la réécriture des réponses est très rapide (compression optimisée).

```mermaid
flowchart LR
    A["Client / navigateur"] -->|"HTTPS intercepté"| B["mitmproxy"]
    B --> C["Addons Python -s"]
    C --> D["Log -w flows"]
    D --> E["Replay / analyse -r"]
```

---

## 🧠 Concepts fondamentaux

| Concept | Explication |
|---|---|
| Certificat CA | mitmproxy génère une autorité de certification locale ; on l'installe dans le client pour que le HTTPS soit décrypté (page d'onboarding `http://mitm.it`) |
| Flow | Une conversation HTTP/TCP/WebSocket complète (requête + réponse) enregistrée et manipulable |
| Addon | Script Python chargé avec `-s` qui réagit aux événements (`request`, `response`, `websocket_message`...) |
| Mode proxy | `regular`, `transparent`, `reverse`, `upstream`, `socks5`, `wireguard`, `local`, `dns` — choisir selon la position du proxy |
| Filtre de flux | Expressions `~d host`, `~m POST`, `~u regex`, `~b texte`, `~h header`, `~marker`... (insensibles à la casse par défaut depuis 11.1) |
| Contentview | Vues de décodage : JSON, HTML, Protobuf, gRPC, MsgPack, MQTT, hex, raw... (interactives et ré-encodables depuis v12) |
| Replay | Client replay (`r` dans la TUI) renvoie les requêtes stockées ; server replay (`--server-replay`) simule les réponses |
| Map local / Map remote | Rediriger des URLs vers des fichiers locaux ou d'autres serveurs |
| Sticky cookies / auth | Répéter automatiquement cookies ou `Authorization` sur les flux suivants |
| HAR | Format d'export/import standard (`save.har`, `-r fichier.har`, `hardump`) |
| MITM et pinning | La confiance repose sur l'installation du CA ; le pinning applicatif doit être contourné (Frida/objection) |

---

## 🛠️ Installation

### Recommandé : pipx (environnement isolé)

```bash
pipx install mitmproxy

# Mise à jour
pipx upgrade mitmproxy

# Vérification
mitmproxy --version
```

### pip / distro

```bash
# pip (Python 3.12+)
python -m venv ~/.mitmproxy-venv && source ~/.mitmproxy-venv/bin/activate
pip install mitmproxy

# Debian / Ubuntu (paquet souvent en retard sur PyPI)
sudo apt install mitmproxy
```

### macOS

```bash
brew install mitmproxy
```

### Windows

```powershell
# Installeur signé : https://mitmproxy.org (ou Microsoft Store)
# ou via pip dans un environnement Python 3.12+
pip install mitmproxy
```

### Docker

```bash
# Console (TUI) sur le port 8080
docker run --rm -it -p 8080:8080 mitmproxy/mitmproxy

# Interface web accessible sur le LAN
docker run --rm -it -p 8080:8080 -p 8081:8081 mitmproxy/mitmproxy mitmweb --web-host 0.0.0.0
# (images aussi publiées sur GHCR : ghcr.io/mitmproxy/mitmproxy)
```

### Vérification rapide

```bash
mitmproxy --version   # affiche version Python + OpenSSL embarqué
```

> [!warning] ⚠️ Prérequis & problèmes potentiels
> - **Python 3.12+** requis (depuis mitmproxy 11.1.0) ; les binaires standalone embarquent leur propre Python (3.14 depuis 12.2.0).
> - Après installation, le certificat CA est généré au premier lancement dans `~/.mitmproxy/` ; il faut l'**installer dans le client** (onboarding `http://mitm.it`).
> - Le paquet apt est souvent obsolète : utiliser pipx ou les binaires officiels pour rester à jour.

---

## ⚙️ Configuration

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `-p <port>` | Port d'écoute | nombre | Port du proxy | `-p 8080` |
| `-m <mode>` | Mode de proxy | `regular`, `transparent`, `reverse:<url>`, `upstream:<url>`, `socks5`, `wireguard`, `local`, `dns` | Position du proxy dans le trafic | `-m reverse:https://cible.local` |
| `-w <fichier>` | Enregistrer les flows | chemin `.mitm` | Trace rejouable | `-w engagement.mitm` |
| `-r <fichier>` | Lire des flows | `.mitm` ou `.har` | Analyse hors ligne | `-r capture.mitm` |
| `-s <script>` | Charger un addon Python | chemin du `.py` | Automatisation | `-s addon.py` |
| `-n` | Pas de serveur (lecture seule) | On/Off | Analyse de capture | `-n -r capture.mitm` |
| `-k` / `--ssl-insecure` | Ne pas valider le cert upstream | On/Off | Certificats auto-signés | `-k` |
| `--ignore-hosts <regex>` | Ne pas intercepter ces hôtes | regex | Réduire le bruit | `--ignore-hosts ".*\.google\.com"` |
| `--allow-hosts <regex>` | N'intercepter QUE ces hôtes | regex | Filtrage strict | `--allow-hosts ".*\.cible\.local"` |
| `-f <filtre>` | Filtre d'affichage | `~d`, `~m`, `~b`, `~h`... | N'afficher que certains flows | `-f "~d cible.local"` |
| `--set <opt>=<valeur>` | Régler n'importe quelle option | ex : `--set block_global=false` | Configuration fine | `--set ssl_version_client=SSL3` |
| `--listen-host <ip>` | Interface d'écoute | IP | Exposition réseau | `--listen-host 0.0.0.0` |
| `--web-host / --web-port` | Interface mitmweb | IP/port | UI web distante | `--web-host 0.0.0.0` |
| `--server-replay <fichier>` | Rejouer des réponses | `.mitm` | Simulation serveur | `--server-replay replay.mitm` |

> [!note] À vérifier
> La configuration avancée se fait aussi via le fichier `config.yaml` dans le dossier de conf (`~/.mitmproxy/`). Les noms d'options évoluent entre versions : consulter `mitmproxy --options` pour la liste complète.

---

## 🏗️ Architecture interne

- **Trois interfaces, un moteur** : `mitmproxy` (TUI curses), `mitmdump` (CLI), `mitmweb` (UI web) partagent le même cœur asyncio et le même système d'addons.
- **Cœur asyncio (Python)** : gestion événementielle des connexions ; les flux sont modélisés en objets `HTTPFlow`, `TCPFlow`, `WebSocketFlow`, `DNSFlow` manipulables dans les addons.
- **Extension Rust `mitmproxy_rs`** : parties critiques (UDP, mTLS, contentviews) implémentées en Rust pour la performance ; les contentviews peuvent être écrites en Rust (v12).
- **Proxy core** : depuis v7, support du **secure web proxy** (TLS-over-TLS), des greetings serveur (proxy TCP brut), du WireGuard, du local redirect (v10.2) et du mode `tun` Linux (v11.0.1).
- **Génération de certificats** : un CA local (`~/.mitmproxy/mitmproxy-ca.pem`) signe des certificats feuilles à la volée par domaine (validité 197 jours depuis 12.2.3, mTLS, re-négociation TLS 1.3).
- **Système d'addons** : chaque `-s` charge des classes avec des hooks (`load`, `request`, `response`, `websocket_message`, `client_connected`...) ; l'API `ctx` (remplacée par `logging`) permet de loguer.
- **Contentviews** : décodage interactif et ré-encodage (Protobuf → YAML éditable → binaire), vues gRPC, MsgPack, MQTT, JSON, HTML, hex, raw.
- **Streaming** : stockage optionnel des corps streamés (v12), `tcp_timeout` configurable (12.2.1), flush du fichier de flows après chaque flow (12.2.1).
- **Filtrage** : expressions de filtres insensibles à la casse par défaut (11.1), recherche par corps `~b`/`~bq`/`~bs` (12.1), commentaires sur les flows (12.2.2).

Flux type : client → proxy (TLS décrypté via CA) → addons (`request`/`response`) → serveur ; sortie vers console, fichier `.mitm`, HAR ou exports (curl/httpie/raw).

---

## ⌨️ Commandes

### Commandes principales

```bash
# Interface interactive (flèches pour naviguer, 'e' pour éditer une requête)
mitmproxy -p 8080

# Interface web + enregistrement des flux
mitmweb -p 8080 -w captures.mitm

# CLI non interactive : enregistrer le trafic
mitmdump -w captures.mitm

# Mode reverse proxy vers une cible unique
mitmdump -m reverse:https://cible.local -p 443

# Mode transparent : rediriger le trafic réseau vers le proxy (root requis)
#   iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
#   iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8080
mitmdump -m transparent -p 8080

# Mode SOCKS5 (émulateur, device)
mitmdump -m socks5 -p 1080

# Rejouer/analyser un fichier de captures hors ligne
mitmdump -r captures.mitm -n -s analyse.py

# Filtrer l'affichage des flux
mitmproxy -f "~d cible.local"
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `mitmproxy -p 8080` | TUI interactive | Navigation/édition des flows en direct |
| `mitmweb -p 8080` | UI web | Timeline type DevTools dans le navigateur |
| `mitmdump -w cap.mitm` | Capture non interactive | Fichier `.mitm` rejouable |
| `mitmdump -r cap.mitm -n -s addon.py` | Analyse hors ligne | Traitement scripté d'une capture |
| `mitmdump -m reverse:https://api.local` | Proxy API dédié | Toute l'API d'un hôte interceptée |
| `mitmdump --server-replay replay.mitm` | Simulation serveur | Réponses rejouées sans contact serveur |
| `mitmdump -m wireguard` | VPN WireGuard intégré | Transparence sans config réseau |

### Commandes avancées

```bash
# HTTP/3 (transparent) et WebSockets
mitmdump -m transparent --set http3=true

# Mode DNS (interception des requêtes DNS)
mitmdump -m dns -p 53

# Capture + export HAR en une passe
mitmdump --hardump capture.har

# Sécuriser mitmweb (mot de passe + authentification par jeton)
mitmweb --set web_password=superSecret

# Ignorer les hôtes inutiles pendant l'interception
mitmdump --ignore-hosts ".*\.(google|facebook)\.com" -w cap.mitm
```

---

## 🎚️ Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `-p <port>` | Port d'écoute | `-p 8080` | Basic |
| `-w <fichier>` | Enregistrer les flows | `-w cap.mitm` | Basic |
| `-r <fichier>` | Lire des flows (.mitm ou .har) | `-r cap.mitm` | Basic |
| `-s <script>` | Charger un addon | `-s addon.py` | Basic |
| `-n` | Pas de serveur (analyse seule) | `-n -r cap.mitm` | Basic |
| `-k` / `--ssl-insecure` | Ignorer les erreurs TLS upstream | `-k` | Basic |
| `-f <filtre>` | Filtre de flows | `-f "~m POST"` | Intermediate |
| `-m <mode>` | Mode de proxy | `-m reverse:https://x` | Intermediate |
| `--listen-host <ip>` | Interface d'écoute | `--listen-host 0.0.0.0` | Intermediate |
| `--ignore-hosts <regex>` | Hosts non interceptés | `--ignore-hosts ".*\.cdn\.com"` | Intermediate |
| `--allow-hosts <regex>` | Hosts seuls interceptés | `--allow-hosts ".*\.cible\.local"` | Intermediate |
| `--set <opt>=<val>` | Régler une option | `--set stream_large_bodies=1m` | Intermediate |
| `--web-host <ip>` / `--web-port` | Config mitmweb | `--web-host 0.0.0.0` | Intermediate |
| `--hardump <fichier>` | Export HAR direct | `--hardump cap.har` | Intermediate |
| `--server-replay <f>` | Rejouer des réponses | `--server-replay r.mitm` | Advanced |
| `--client-replay <f>` | Rejouer des requêtes | `--client-replay r.mitm` | Advanced |
| `-C <fichier>` | Config YAML | `-C config.yaml` | Advanced |
| `--confdir <dir>` | Dossier de configuration | `--confdir ~/.mitmproxy` | Advanced |
| `--mode <mode>` | Alias long de `-m` | `--mode wireguard` | Advanced |
| `--ssl-version-client` | Version TLS côté client | `--ssl-version-client TLS1_2` | Expert |
| `--add-cert-file <pem>` | CA additionnel | `--add-cert-file ca.pem` | Expert |
| `--ignore-http` | Ne pas intercepter HTTP | `--ignore-http` | Expert |
| `--http2 / --no-http2` | Activer/désactiver HTTP/2 | `--http2` | Expert |

> [!tip] Options les plus utiles au quotidien
> `-w` (trace rejouable), `-s` (automatisation), `-m reverse:https://host` (API unique), `--ignore-hosts` (réduire le bruit) et `--hardump` (rapport HAR).

---

## 🧪 Exemples pratiques

### Beginner

```bash
# Objectif : voir le trafic HTTPS d'un navigateur
mitmweb -p 8080
# -> http://127.0.0.1:8081 dans le navigateur, proxy 127.0.0.1:8080 configuré dans le navigateur

# Objectif : capturer une session et la sauvegarder
mitmdump -w session.mitm -p 8080
```

### Intermediate

```bash
# Objectif : intercepter une API mobile via reverse proxy
mitmdump -m reverse:https://api.cible.local -p 443 -w api.mitm

# Objectif : filtrer l'affichage sur un hôte et une méthode
mitmproxy -f "~d cible.local & ~m POST"

# Objectif : ne pas intercepter les CDN (réduire le bruit)
mitmdump --ignore-hosts ".*\.(cloudfront|googleapis)\.com" -w cap.mitm
```

### Advanced

```bash
# Objectif : simuler un serveur avec des réponses enregistrées
mitmdump --server-replay replay.mitm -n

# Objectif : loguer les credentials de type Basic Auth dans un fichier
mitmdump -s log_creds.py > creds.log

# Objectif : interception transparente d'une VM Linux (iptables)
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8080
mitmdump -m transparent -p 8080
```

### Expert

```bash
# Objectif : WireGuard pour intercepter un appareil sans config réseau
mitmdump -m wireguard --listen-host 0.0.0.0
# -> génère une config WireGuard à importer sur l'appareil cible

# Objectif : local redirect sur Windows/macOS pour une app locale
mitmdump -m local

# Objectif : interception DNS (fuzzing/spoofing de réponses DNS)
mitmdump -m dns -p 53
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Démarrer le proxy** et installer le certificat CA dans le navigateur (http://mitm.it après le lancement) :
   ```bash
   mitmweb -p 8080 -w engagement.mitm
   ```
2. **Configurer le navigateur** sur `127.0.0.1:8080`, puis parcourir l'application : chaque requête/réponse est visible dans la timeline.
3. **Intercepter et modifier** — dans `mitmproxy` (TUI), appuyer sur `e` pour éditer une requête avant qu'elle ne parte, tester des valeurs de paramètres (IDOR, manipulation d'en-têtes...).
4. **Rejouer** — touche `r` pour renvoyer une requête modifiée ; exporter les flows utiles (`x`) en curl/httpie pour les réutiliser.
5. **Scriptifier** — écrire un addon qui remplace automatiquement une valeur dans les réponses ou qui ajoute un délai, puis recharger avec `-s`.
6. **Générer un rapport** — exporter la session en HAR (`--hardump`) pour l'intégrer au rapport d'engagement.

---

## 🎬 Scénarios avancés

### Scénario 1 : Addon Python qui réinjecte un payload

```python
# addon_xss.py
from mitmproxy import http

def response(flow: http.HTTPFlow) -> None:
    if flow.request.pretty_host == "cible.local" and "html" in flow.response.headers.get("Content-Type", ""):
        flow.response.text = flow.response.text.replace(
            "<!-- marker -->",
            "<script>alert(document.domain)</script>"
        )
```
```bash
mitmdump -p 8080 -s addon_xss.py
```
Parfait pour démontrer un XSS sans devoir modifier chaque requête à la main.

### Scénario 2 : Capture + analyse hors ligne

```bash
# enregistrement pendant une session
mitmdump -w session.mitm
# analyse différée : extraire toutes les requêtes contenant un token
mitmdump -r session.mitm -n -s "extract.py" > tokens.txt
```

### Scénario 3 : Interception d'une app mobile sur émulateur (SOCKS5)

```bash
# 1. Proxy SOCKS5 sur l'hôte
mitmdump -m socks5 -p 1080 -w mobile.mitm
# 2. Dans l'émulateur : configurer le proxy SOCKS5 sur 10.0.2.2:1080
# 3. Installer le CA mitmproxy (http://mitm.it) dans l'émulateur
# 4. Lancer l'app : les flux API sont interceptés et modifiables via addons
```

### Scénario 4 : Addon qui modifie les réponses JSON d'une API

```python
# addon_rewrite_json.py
import json
from mitmproxy import http

def response(flow: http.HTTPFlow) -> None:
    if "application/json" in flow.response.headers.get("Content-Type", ""):
        data = json.loads(flow.response.text)
        data.setdefault("isAdmin", True)   # test d'un privilège côté serveur
        flow.response.text = json.dumps(data)
```
```bash
mitmdump -p 8080 -s addon_rewrite_json.py
```
À utiliser pour tester une **confiance excessive dans les réponses client** (champs `isAdmin`, `role`, `isPremium`...).

### Scénario 5 : Spoofing de réponses DNS (addon)

```python
# addon_dns_spoof.py
from mitmproxy import dns

def dns_response(flow: dns.DNSFlow) -> None:
    if flow.response and flow.request.question:
        name = flow.request.question[0].name
        if name == "exemple.interne.local":
            flow.response.answers[0].rdata = "10.10.10.66"
```
```bash
sudo mitmdump -m dns -p 53 -s addon_dns_spoof.py
```
Redirige une résolution DNS vers une IP contrôlée — classique en test de redirection/SSRF.

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Reconnaissance | Cartographier les endpoints API d'une app mobile/web, collecter les flux |
| Énumération | Découverte de paramètres, tokens, cookies et en-têtes dans les flux |
| Vulnérabilité | Tester IDOR, manipulations de réponses (confiance client), injection via addons |
| Exploitation | Réinjection de payloads (XSS, SSTI), spoofing DNS, redirections |
| Post-exploitation | Interception de trafic après compromission d'un point du réseau |
| Rapport | Export HAR/curl des preuves rejouables |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Reconnaissance | Active Scanning | T1595 | Collecte du trafic d'une cible via interception | Volumes anormaux, certificats inconnus | Supervision des flux, CA monitoring |
| Collection | Man in the Middle | T1557 | Décryptage et modification du trafic TLS | Détection de certificats non attendus | Pinning, HSTS, attestation |
| Collection | Data from Local System | T1005 | Extraction de credentials/tokens des flux | Détection d'exfiltration | Chiffrement, sandboxing |
| Defense Evasion | Modify Authentication Process / Valid Accounts | T1556 / T1078 | Replay de sessions capturées (cookies) | Analyse de comportement de session | MFA, rotation de sessions |
| Credential Access | Credentials from Web Browsers | T1555.003 | Capture de mots de passe saisis en HTTP/HTTPS intercepté | Alertes sur trafic suspect | HTTPS strict, credentials isolés |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> L'association la plus spécifique est **T1557 (Man in the Middle)** — c'est le cœur de l'outil. Les autres techniques ne s'appliquent que selon l'usage effectif.

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Certificat inconnu dans la chaîne de confiance | Certificats épinglés (certificate pinning), liste d'autorités de confiance restreinte |
| Certificat CA non approuvé installé sur un poste | Contrôler le magasin de certificats (local machine), alertes sur CA non approuvés |
| Décryptage TLS d'une app mobile/desktop | Pinning natif, attestation, détection d'environnement modifié |
| Proxy détecté par le client | Vérifications du proxy côté app, HSTS pour empêcher la rétrogradation HTTP |
| Trafic modifié en transit | Signatures des réponses, TLS 1.3 + trafic chiffré de bout en bout |
| Connexions WireGuard/DTLS/UDP inhabituelles | Supervision des flux réseau, liste blanche de protocoles |
| Scripts Python à forte empreinte | Supervision des processus, intégrité du système |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma (pédagogique - à adapter) : installation d'un CA non standard
title: New Certificate Authority Install (mitmproxy-like)
status: experimental
logsource:
    product: windows
    category: registry_set
detection:
    selection:
        TargetObject|contains: '\Root\LocalMachine\'
        EventType: SetValue
    condition: selection
falsepositives:
    - Installation légitime d'un CA d'entreprise
level: medium
```

```bash
# Suricata/Snort (pédagogique) : trafic vers un port proxy inhabituel
alert tcp any any -> any 8080 (msg:"Potential mitmproxy listener"; flow:to_server,established; content:"CONNECT"; http.method; sid:66000016; rev:1;)
```

```yaml
# YARA : addon ou binaire mitmproxy sur un poste
rule Mitmproxy_Addon {
    meta:
        description = "Script/addon mitmproxy"
        author = "Équipe SOC"
    strings:
        $a = "from mitmproxy import" ascii wide
        $b = "HTTPFlow" ascii wide
        $c = "mitmproxy" ascii wide
    condition:
        any of them
}
```

---

## 🤖 Automatisation

```bash
# Automatiser la capture + export HAR en tâche de fond
mitmdump --hardump $(date +%Y%m%d).har -w flows.mitm &
# ... lancer l'application testée ...
# Arrêter ensuite le proxy : kill %1
```

```python
# Python : addon de logging structuré
import json
from mitmproxy import http

class Logger:
    def __init__(self):
        self.requests = []

    def request(self, flow: http.HTTPFlow) -> None:
        self.requests.append({
            "url": flow.request.pretty_url,
            "method": flow.request.method,
            "headers": dict(flow.request.headers),
        })

addons = [Logger()]
```
```bash
mitmdump -s logger.py -n -r capture.mitm
# Les addons sont appelés même en mode hors ligne (relecture de capture)
```

```python
# Python : post-traitement d'un fichier .mitm hors ligne
from mitmproxy import io, http
from mitmproxy.exceptions import FlowReadException

with open("capture.mitm", "rb") as f:
    reader = io.FlowReader(f)
    try:
        for flow in reader.stream():
            if isinstance(flow, http.HTTPFlow) and flow.request.method == "POST":
                print(flow.request.pretty_url, dict(flow.request.urlencoded_form))
    except FlowReadException as e:
        print(f"Lecture interrompue : {e}")
```

---

## 📤 Output et parsing

mitmproxy exporte les flows dans plusieurs formats : fichier `.mitm` (natif), **HAR** (`--hardump` / `save.har`), et exports ponctuels depuis la TUI (curl, httpie, python, raw).

```bash
# Export HAR (standard d'échange avec les outils de rapport)
mitmdump --hardump rapport.har -w session.mitm

# Extraire les URLs des flux hors ligne avec jq (sur le HAR)
jq -r '.log.entries[].request.url' rapport.har | sort -u

# Lister les méthodes POST dans le HAR
jq -r '.log.entries[] | select(.request.method == "POST") | .request.url' rapport.har

# Charger un HAR dans mitmproxy pour l'analyser avec un addon
mitmdump -r rapport.har -n -s addon.py
```

```bash
# Extraction simple des requêtes via un addon (remplace grep sur binaire .mitm)
mitmdump -r session.mitm -n -s - <<'EOF'
from mitmproxy import http
def request(flow: http.HTTPFlow) -> None:
    print(flow.request.pretty_url)
EOF
```

> [!note] À vérifier
> Le format `.mitm` est un format binaire (tnetstring) lié à la version de mitmproxy : **non rétro-compatible** entre versions majeures. Pour l'interopérabilité, utiliser le format HAR.

---

## 🔗 Intégrations

```text
mitmproxy -> proxy navigateur / émulateur -> application cible
mitmproxy -> HAR -> outils de rapport (Burp, Postman, Wireshark)
mitmproxy -> addons Python -> automatisation des tests
mitmproxy -> Frida/objection -> contournement du pinning mobile
```

- [[Tools|🧰 Outils]] global
- [[Outil - Burp Suite]] — proxy GUI équivalent (Intruder, Repeater, extensions)
- [[Outil - OWASP ZAP]] — alternative open source avec scanner automatisé
- [[Techniques/IDOR|IDOR]] · [[Techniques/SSRF|SSRF]] · [[Techniques/HTTP Request Smuggling|HTTP Request Smuggling]] · [[Techniques/Injection de commandes|Injection de commandes]]
- [[Outil - gobuster]] / [[Outil - ffuf]] — rejouer les requêtes interceptées en fuzzing

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| Burp Suite | GUI riche, Intruder/Repeater, extensions, scanner | Commercial (Community limitée) | Pentest web complet |
| OWASP ZAP | Open source, scanner auto, GUI | Plus lourd, moins scriptable finement | Scan automatisé web |
| Charles Proxy | GUI simple, focus mobile/desktop | Propriétaire, payant | Debug mobile rapide |
| Fiddler | GUI, décryptage facile sur Windows | Windows-centric | Debug Windows |
| Wireshark | Analyse réseau complète (pas de modification) | Pas de MITM/rewrite | Analyse passive |

> **Quand utiliser mitmproxy plutôt que les autres ?** Dès qu'on veut de la **scriptabilité Python** (addons), du **replay/automatisation**, des **modes exotiques** (WireGuard, local redirect, DNS) ou un **outil gratuit en CLI** léger. C'est le complément idéal de Burp/ZAP plutôt qu'un remplaçant en GUI.

---

## ⚡ Performance

- **Rust `mitmproxy_rs`** : les chemins critiques (UDP, contentviews, mTLS) sont en Rust ; depuis v12, les contentviews Rust sont supportées.
- **Compression** : depuis 12.2.2, toutes les compressions de contenu utilisent les réglages « fastest » par défaut → réécriture de `message.content` beaucoup plus rapide.
- **HTTP/2** : fenêtre de contrôle de flux augmentée depuis 11.0.1 ; correctifs de régression sur les gros corps (10.4).
- **Mémoire** : `stream_large_bodies` permet de streamer les gros corps au lieu de les charger en mémoire ; stockage optionnel des corps streamés (v12).
- **Fichier de flows** : flush après chaque flow (12.2.1) → les captures restent utilisables en cas d'interruption.
- **Docker** : `automaxprocs` respecte les limites CPU des conteneurs.

> [!note] À vérifier
> Les performances dépendent du volume de trafic et des addons : des addons synchrones lourds peuvent ralentir le proxy. Tester avec un échantillon réaliste.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : le HTTPS n'est pas décrypté (erreurs de certificat dans le navigateur)

- **Cause** : le CA mitmproxy n'est pas installé/ne fait pas confiance.
- **Solution** : ouvrir `http://mitm.it` (via le proxy), télécharger et installer le certificat pour la plateforme concernée.
- **Vérification** : `mitmproxy --version` pour l'emplacement du CA ; sur Android 7+, installer le CA en profil **user** (ou WSA/Magisk).

#### Problème : l'application mobile ne passe pas par le proxy (pinning)

- **Cause** : certificate pinning (Android/iOS) ou vérification de proxy.
- **Solution** : contourner le pinning avec Frida/objection (ou `--ssl-insecure` pour les certificats upstream), puis réinstaller le CA.
- **Vérification** : lancer l'app après `objection patchapk` ou un hook Frida, relancer le proxy.

#### Problème : le mode transparent ne capture rien

- **Cause** : pas de root, mauvaise règle iptables, ou proxy sur une autre VM que le client.
- **Solution** : vérifier `sysctl net.ipv4.ip_forward`, la règle `PREROUTING`, et lancer le proxy sur la même machine que le client.
- **Vérification** : `mitmdump -m transparent -p 8080` puis `curl --proxy http://127.0.0.1:8080` en test.

#### Problème : `Cannot establish TLS with client`

- **Cause** : client refusant le certificat, ou versions TLS incompatibles.
- **Solution** : vérifier le CA installé, désactiver HTTP/2 (`--no-http2`) sur cibles exotiques.
- **Vérification** : `--ssl-insecure` côté upstream pour écarter le certificat serveur.

#### Problème : mitmweb affiche une page blanche sur Windows

- **Cause** : régression corrigée en 12.2.2.
- **Solution** : mettre à jour mitmproxy ; sinon vider le cache du navigateur.
- **Vérification** : `mitmweb --version`.

---

## 🔐 Sécurité de l'outil

- **CA compromettant** : le CA privé de mitmproxy permet de décrypter tout le trafic qui lui fait confiance — le garder hors de portée et ne l'installer que sur des cibles autorisées.
- **mitmweb** : depuis 11.1.2, l'API est protégée par un **jeton d'authentification** par défaut (fix du CVE-2025-23217 / SSRF) ; penser à `web_password` pour un accès stable.
- **Exposition réseau** : `--listen-host 0.0.0.0` expose le proxy — limiter aux réseaux de test, protéger mitmweb par mot de passe.
- **Vulnérabilités corrigées** : injection LDAP (GHSA-527g-3w9m-29hv, 12.2.2), request smuggling HTTP/2→HTTP/1 (12.1.2), DNS rebinding mitmweb (CVE-2018-14505), SSRF mitmweb (CVE-2025-23217) — **toujours mettre à jour**.
- **Certificats** : validité des feuilles 197 jours (12.2.3) pour rester compatibles Chromium ; vérifier le CA après mise à jour majeure.
- **Données sensibles** : les captures `.mitm`/HAR contiennent tokens et credentials — les stocker chiffrées et les purger après l'engagement.

---

## ⚠️ Limitations

- **Confiance basée sur le CA** : sans installation du certificat, pas de décryptage HTTPS ; Android 7+ et iOS limitent la confiance des CA user.
- **Pinning** : ne contourne pas le certificate pinning tout seul — nécessite Frida/objection.
- **HTTP/3** : supporté (transparent, reverse) mais expérimental et moins mature que HTTP/2.
- **Format `.mitm`** : non rétro-compatible entre versions majeures ; utiliser HAR pour l'échange.
- **Pas de scanner intégré** : contrairement à Burp/ZAP, pas de scan de vulnérabilités automatisé.
- **Digest auth** : le sticky auth ne rejoue pas l'authentification HTTP Digest.
- **Apprentissage TUI** : l'interface console a une courbe d'apprentissage pour les utilisateurs habitués au GUI.

---

## 📋 Cheatsheet

```bash
# Proxy interactif
mitmproxy -p 8080

# UI web + capture
mitmweb -p 8080 -w captures.mitm

# Capture CLI non interactive
mitmdump -w captures.mitm

# Reverse proxy API
mitmdump -m reverse:https://api.cible.local

# Analyse hors ligne avec addon
mitmdump -r captures.mitm -n -s analyse.py

# Export HAR
mitmdump --hardump rapport.har -w captures.mitm

# Filtres d'affichage
mitmproxy -f "~d cible.local & ~m POST"

# Ignorer les hosts inutiles
mitmdump --ignore-hosts ".*\.(google|facebook)\.com"

# Mode WireGuard (VPN intégré)
mitmdump -m wireguard

# Mode local redirect (apps locales)
mitmdump -m local
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Proxy d'interception TLS scriptable : inspecter, modifier, rejouer le trafic |
| **Quand l'utiliser ?** | Audit web/mobile, debug d'API, automatisation des tests d'intrusion |
| **Commande principale** | `mitmproxy -p 8080` puis configurer le client sur le proxy et installer le CA |
| **Alternative principale** | Burp Suite (GUI riche), OWASP ZAP (scanner), Charles (mobile) |
| **Concepts importants** | CA de confiance, flows, addons, modes (transparent/reverse/wireguard), filtres, HAR |
| **Liens associés** | [[Outil - Burp Suite]] · [[Outil - OWASP ZAP]] · [[Techniques/IDOR]] · [[Techniques/SSRF]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Certificat inconnu dans la chaîne de confiance | Certificats épinglés (certificate pinning), liste d'autorités restreinte |
| Certificat CA non approuvé sur un poste | Contrôler le magasin de certificats, alertes sur CA non approuvés |
| Décryptage TLS d'une app mobile/desktop | Pinning natif, attestation, détection d'environnement modifié |
| Proxy détecté par le client | Vérifications du proxy côté app, HSTS contre la rétrogradation HTTP |
| Trafic modifié en transit | Signatures des réponses, TLS 1.3, chiffrement de bout en bout |
| Scripts Python à forte empreinte | Supervision des processus, intégrité du système |
| Connexions WireGuard/DTLS/UDP inhabituelles | Supervision des flux réseau, liste blanche de protocoles |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> - Utilise `mitmweb` quand tu veux une vue graphique et un historique facilement navigable ; `mitmdump` pour les scripts et l'automatisation.
> - Enregistre systématiquement tes flux avec `-w` : ils deviennent une preuve rejouable de l'engagement.
> - En mode **reverse** tu interceptes toute l'API d'un hôte en une commande — très efficace pour auditer une API mobile.
> - Utilise `--hardump` pour générer un HAR à intégrer au rapport sans étape manuelle.
> - Les **contentviews interactives** (v12+) permettent d'éditer un Protobuf en YAML et de le re-sérialiser — pratique pour les API gRPC.

> [!warning] ⚠️ **Pièges**
> - Sans installation du certificat CA, le HTTPS n'est **pas** décrypté (le navigateur bloquera avec une erreur de certificat) : c'est la première cause d'échec.
> - Le mode **transparent** nécessite root et une configuration réseau (iptables/route) ; en virtualisation, le proxy doit être sur la même VM que le client.
> - Les apps avec **pinning** résistent à l'interception : pense à `Frida`/objection pour les contourner, ou à `--ssl-insecure` pour les cas simples.
> - Le fichier `.mitm` n'est **pas portable** entre versions majeures : utilise HAR pour archiver.
> - Sur Android 7+ / iOS récents, installer le CA en profil **user** ne suffit pas toujours (niveau réseau) : prévoir WSA/Magisk ou un APK patché.
> - Ne laisse pas `mitmweb --web-host 0.0.0.0` sans `web_password` : l'API est exposée (CVE-2025-23217 corrigé, mais l'exposition reste risquée).

---

## 📚 References

### Official

- Site officiel : https://mitmproxy.org
- Documentation stable : https://docs.mitmproxy.org/stable/
- GitHub : https://github.com/mitmproxy/mitmproxy
- Changelog : https://github.com/mitmproxy/mitmproxy/blob/main/CHANGELOG.md
- Releases : https://github.com/mitmproxy/mitmproxy/releases

### Security references

- MITRE ATT&CK T1557 — Man in the Middle : https://attack.mitre.org/techniques/T1557/
- MITRE ATT&CK T1595 — Active Scanning : https://attack.mitre.org/techniques/T1595/
- Advisories mitmproxy (GitHub) : https://github.com/mitmproxy/mitmproxy/security/advisories

### Community

- Blog officiel (releases) : https://mitmproxy.org/tags/releases/
- Addon examples : https://docs.mitmproxy.org/stable/addons-examples/

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Outil - Burp Suite|Burp Suite]] · [[Outil - OWASP ZAP|OWASP ZAP]] · [[Techniques/IDOR|IDOR]] · [[Techniques/SSRF|SSRF]] · [[Techniques/HTTP Request Smuggling|HTTP Request Smuggling]]
