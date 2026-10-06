---
title: "Outil - wfuzz"
type: outil
categorie: 🔍 Scan Web & Fuzzing
tags:
  - cyber
  - outil
  - 🔍 Scan Web & Fuzzing
statut: publie
version: 3.1.1 (projet en maintenance)
licence: GPL-2.0
langage: Python
developpeur: Xavi Mendez (xmendez), Christian Martorella, Carlos del ojo
repo: https://github.com/xmendez/wfuzz
site: https://wfuzz.org
doc: https://wfuzz.readthedocs.io
---

# 🔍 wfuzz — Fuzzer web Python (mot-clé FUZZ)

> [!info] **En 1 phrase**
> wfuzz est un fuzzer web en Python qui remplace le mot-clé `FUZZ` dans les URL, headers, cookies ou corps de requête pour tester paramètres et valeurs.

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | Wfuzz — The Web Fuzzer |
| Description | Framework de fuzzing web : injecte des payloads dans n'importe quel champ d'une requête HTTP (URL, paramètres, headers, cookies, corps) |
| Catégorie | 🔍 Scan Web & Fuzzing |
| Sous-catégorie | Fuzzing web / découverte de paramètres / brute force HTTP |
| Fonction principale | Remplacer le mot-clé `FUZZ` par chaque valeur d'un payload dans une requête |
| Type d'outil | CLI + bibliothèque Python (API `wfuzz`) |
| Licence | GPL-2.0 |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | Python |
| Développeur / organisation | Xavi Mendez (xmendez) ; Christian Martorella et Carlos del ojo (versions ≤ 1.4c) |
| Projet officiel | https://wfuzz.org |
| Dépôt officiel | https://github.com/xmendez/wfuzz |
| Documentation | https://wfuzz.readthedocs.io |
| Version actuelle | 3.1.1 |
| Date de sortie initiale | Années 2000 (héritage d'Edge Security) |
| Dépendances principales | Python, pycurl, pyparsing, requests (libre) |

---

## 🎯 Concept

wfuzz est un framework de fuzzing web complet, écrit en Python. Contrairement aux scanners de répertoires, il est pensé pour fuzzer n'importe quel champ de la requête : paramètres GET/POST, en-têtes, cookies, chemins, corps JSON. Le mot-clé `FUZZ` est remplacé par chaque mot d'un payload défini avec `-z`.

Il permet aussi de combiner plusieurs payloads (fuzzings multiples `FUZZ2`, `FUZZ3`...) et de s'automatiser via son API Python. Les filtres `--hc`, `--hh`, `--hl`, `--hw` (code, taille, lignes, mots) permettent d'écarter la baseline et de ne garder que l'insolite. On l'utilise en pentest web pour : la découverte de paramètres cachés (Hidden Parameters), l'énumération de ressources, le test de logique (IDOR via IDs), le fuzzing d'en-têtes (ex: `X-Forwarded-For`) et l'authentification par force brute ciblée.

```mermaid
flowchart LR
    A["URL avec FUZZ"] --> B["Payload -z"]
    B --> C["Filtres --hc --hh --hl --hw"]
    C --> D["Resultats insolites"]
    D --> E["Analyse manuelle"]
```

---

## 🧠 Concepts fondamentaux

- **Mot-clé `FUZZ`** : tout emplacement contenant `FUZZ` dans la requête (URL, headers, cookies, corps) est remplacé par chaque valeur du payload.
- **Payloads (`-z`)** : sources de données — fichiers (`file,chemin`), listes (`list,a,b,c`), plages (`range,1-100`), stdin, `hexrand`, `iprange`, sessions Burp (`burplog`/`burpstate`), etc.
- **Fuzzings multiples** : `FUZZ2`, `FUZZ3`... permettent d'attaquer plusieurs positions à la fois (mode cluster bomb).
- **Encoders (`-e`)** : transformer la valeur avant l'injection (urlencode, base64, md5, sha256, sha512, html_escape, hexlify...).
- **Filtres de résultats** : `--hc/--hh/--hl/--hw` (masquer) et `--sc/--ss/--sl/--sw` (afficher) selon code HTTP, taille, lignes ou mots.
- **Langage de filtres** : `--filter`/`--prefilter` acceptent des expressions comme `code=200 AND size>1000` pour un tri fin.
- **Récursivité (`-R`)** : relance le fuzzing dans les répertoires découverts, sur plusieurs niveaux de profondeur.
- **Authentification HTTP** : `--basic`, `--digest`, `--ntlm` pour les zones protégées.
- **Sessions (`-s`)** : sauvegarde/rechargement de sessions de fuzzing ; **recipes** pour réutiliser une configuration.
- **Outils annexes** : `wfpayload` (générer des payloads), `wfencode` (encoder des payloads), `wxfuzz` (front-end graphique).

---

## 🛠️ Installation

```bash
# Debian / Ubuntu / Kali
sudo apt install wfuzz

# Via pip (Python)
pip install wfuzz
# ou isolation propre
pipx install wfuzz

# macOS
brew install wfuzz

# Windows (via pip, nécessite Python + pycurl/libcurl)
pip install wfuzz

# Docker (image officielle ghcr.io)
docker pull ghcr.io/xmendez/wfuzz
docker run -v $(pwd)/wordlist:/wordlist/ -it ghcr.io/xmendez/wfuzz wfuzz

# Depuis la source
git clone https://github.com/xmendez/wfuzz
cd wfuzz && pip install -e .
```

> [!warning] ⚠️ Dépendance pycurl
> wfuzz repose sur **pycurl** (libcurl) pour les connexions : sous Windows ou certaines distros, l'installation de `pycurl` peut nécessiter `libcurl` (ex : `sudo apt install libcurl4-openssl-dev`).

---

## ⚙️ Configuration

### Configuration via CLI

| Paramètre | Rôle |
|---|---|
| `-z <payload>` | Définir un payload (plusieurs `-z` = fuzzings multiples) |
| `-u <url>` | URL cible contenant `FUZZ` |
| `-H <header>` | En-têtes personnalisés (répétables) |
| `-b <cookie>` | Cookies (ex : `-b "session=abc"`) |
| `-d <data>` | Corps de la requête (POST) |
| `-X <méthode>` | Méthode HTTP (GET, POST, PUT...) |
| `-t <n>` | Nombre de connexions concurrentes (défaut 10) |
| `-p <proxy>` | Proxy : `addr:port`, `http://...`, `socks5://...` |
| `-e <encoders>` | Encoders appliqués aux payloads |
| `-s <session>` | Sauvegarder/charger une session |
| `-R <n>` | Profondeur de récursion |
| `-o <fichier>` | Écrire les résultats dans un fichier |

### Fichier de configuration

```text
# ~/.wfuzz/wfuzz.ini (anciennement dans le répertoire de l'outil)
# Définit les valeurs par défaut (proxy, encoders, etc.)
[connection]
concurrent = 10
delay = 0.0

[general]
# ...
```

> [!note] À vérifier
> Les chemins exacts du fichier de configuration (XDG/`~/.wfuzz`) et les clés disponibles évoluent selon la version : consulter la documentation `wfuzz.readthedocs.io` pour la 3.x.

---

## 🏗️ Architecture interne

```text
wfuzz (Python)
├── fuzz/                # bibliothèque principale (API Python)
│   ├── fuzzfactory      # point d'entrée programmatique (fuzz())
│   ├── fuzzrequest / fuzzresponse   # requête/réponse fuzzée
│   ├── fuzzer / fuzzresults         # moteur d'exécution et résultats
│   ├── filters           # langage de filtres (code, size, lines, words)
│   ├── payloads          # types de payloads (file, list, range, iprange...)
│   ├── plugins           # plugins (report, screenshot, etc.)
│   └── encoders          # encoders (urlencode, b64, sha256, md5...)
├── wfuzz                # exécutable CLI (point d'entrée)
├── wfpayload            # générateur de payloads
├── wfencode             # encodeur de payloads
└── wxfuzz               # front-end graphique (Tk)
```

- **Moteur de fuzzing** : construit une requête par valeur de payload, exécute en parallèle (threads/pycurl multi), applique les filtres et affiche les résultats.
- **API Python** : la même logique est exposée via `from wfuzz.fuzzfactory import fuzz` pour l'automatisation scriptée.
- **Types de payloads** : `file`, `list`, `range`, `stdin`, `hexrand`, `iprange`, `iterator`, `names`, `burplog`, `burpstate`, `autorule`, `pattern`, etc.
- **Note de maintenance** : le projet n'est plus développé activement (dernière release 3.1.1) — il reste fonctionnel mais le code est ancien.

---

## ⌨️ Commandes

### Commandes de base

```bash
# Découverte de répertoires (directory busting)
wfuzz -c -z file,dirlist.txt -u http://10.10.10.10/FUZZ --hc 404

# Découverte de paramètres cachés
wfuzz -c -z file,params.txt -u http://10.10.10.10/page.php?FUZZ=value --hc 404

# Fuzzing combiné (users × mots de passe)
wfuzz -z file,users.txt -z file,pass.txt -u http://10.10.10.10/login.php \
  -d "user=FUZZ&pass=FUZZ2" --hc 200

# Plage numérique (IDs)
wfuzz -z range,1-1000 -u http://10.10.10.10/api/items/FUZZ --hh 2456
```

### Commandes avancées

```bash
# Encoders appliqués au payload
wfuzz -e urlencode,b64encode -z file,payloads.txt -u http://10.10.10.10/?id=FUZZ

# Langage de filtres
wfuzz -z file,params.txt -u http://10.10.10.10/?FUZZ=1 --filter "code=200 AND size>500"

# Récursion sur les répertoires découverts
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ -R 3 --hc 404

# Authentification HTTP (Basic / Digest / NTLM)
wfuzz --basic admin:password -z list,dir1,dir2 -u http://10.10.10.10/FUZZ

# Session et rapport
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ -o resultats.txt -s ma_session
```

---

## 🎚️ Options et flags

### Options principales

| Option | Description | Niveau |
|---|---|---|
| `-u <url>` | URL cible (contenant `FUZZ`) | Basic |
| `-z <payload>` | Payload : `file,chemin`, `list,a,b`, `range,1-100` | Basic |
| `-d <data>` | Corps de requête POST | Basic |
| `-H <header>` | En-tête personnalisé (répétable) | Basic |
| `-b <cookie>` | Cookie (répétable) | Basic |
| `-X <méthode>` | Méthode HTTP | Basic |
| `-t <n>` | Connexions concurrentes (défaut 10) | Basic |
| `-c` | Sortie colorée | Basic |
| `-v` | Mode verbeux | Intermediate |
| `--hc <codes>` | Masquer les codes HTTP (ex : `--hc 404,403`) | Basic |
| `--hh <tailles>` | Masquer les tailles de réponse | Basic |
| `--hl <lignes>` | Masquer les nombres de lignes | Basic |
| `--hw <mots>` | Masquer les nombres de mots | Basic |
| `--sc <codes>` / `--ss <str>` / `--sl` / `--sw` | Afficher selon code/string/lignes/mots | Intermediate |
| `--filter <expr>` | Langage de filtres (`code=200 AND size>500`) | Advanced |
| `--prefilter <expr>` | Filtre avant exécution | Expert |
| `-e <encoders>` | Encoders (`urlencode,b64encode,md5,sha256...`) | Intermediate |
| `-R <n>` | Profondeur de récursion | Advanced |
| `-p <proxy>` | Proxy (`addr:port`, `socks5://...`) | Intermediate |
| `-s <session>` | Sauvegarder/charger une session | Intermediate |
| `-o <fichier>` | Écrire les résultats dans un fichier | Intermediate |
| `-i` | Mode interactif | Advanced |
| `--basic <id:pass>` | Authentification HTTP Basic | Intermediate |
| `--digest <id:pass>` | Authentification HTTP Digest | Advanced |
| `--ntlm <id:pass>` | Authentification NTLM | Advanced |
| `--slice <expr>` | Découper un payload (`[1:3]`) | Expert |
| `-Z` | Stopper à la première erreur | Intermediate |
| `-f <filtre>` | Filtrer les résultats (ancien `-f`) | Expert |

### Types de payloads (`-z`)

| Type | Exemple | Usage |
|---|---|---|
| `file` | `file,wordlist.txt` | Lire une wordlist |
| `list` | `list,admin,user,root` | Petites listes inline |
| `range` | `range,1-1000` | Numériques (IDs) |
| `stdin` | `-z stdin` | Lire sur l'entrée standard |
| `hexrand` | `hexrand,8` | Chaînes hex aléatoires |
| `iprange` | `iprange,10.0.0.0-10.0.0.255` | Plages IP |
| `burplog` | `burplog,cap.xml` | Rejouer un flux Burp |
| `burpstate` | `burpstate,state.burp` | Sessions Burp |

### Encoders courants (`-e`)

| Encoder | Effet |
|---|---|
| `urlencode` | Encodage URL des caractères spéciaux |
| `b64encode` / `b64decode` | Base64 |
| `md5` / `sha256` / `sha512` | Hachage |
| `html_escape` | Échappement HTML |
| `hexlify` | Représentation hexadécimale |

---

## 🧪 Exemples pratiques

### Beginner

```bash
# Objectif : premier directory busting
wfuzz -c -z file,/usr/share/wordlists/dirb/common.txt \
  -u http://10.10.10.10/FUZZ --hc 404

# Objectif : fuzzer des valeurs dans un paramètre GET
wfuzz -z list,1,2,3,admin,test -u "http://10.10.10.10/page.php?role=FUZZ" --hc 404

# Objectif : vérifier la baseline avant de filtrer
wfuzz -z list,test -u http://10.10.10.10/page.php?test=1
```

### Intermediate

```bash
# Objectif : découverte de paramètres cachés avec exclusion de la baseline
wfuzz -z file,burp-parameter-names.txt \
  -u http://10.10.10.10/account.php?FUZZ=1 --hh 2456

# Objectif : force brute de cookies de session
wfuzz -z file,ids.txt -u http://10.10.10.10/dashboard.php \
  -b "user_id=FUZZ" --hc 403

# Objectif : fuzzing combiné login
wfuzz -z file,users.txt -z file,pass.txt -u http://10.10.10.10/login.php \
  -d "user=FUZZ&pass=FUZZ2" --hc 200
```

### Advanced

```bash
# Objectif : fuzzing d'en-tête pour contourner un contrôle IP
wfuzz -z file,ips.txt -u http://10.10.10.10/admin \
  -H "X-Forwarded-For: FUZZ" --hc 403

# Objectif : méthodes HTTP autorisées
wfuzz -z list,GET,POST,PUT,DELETE,PATCH,OPTIONS \
  -u http://10.10.10.10/api/item -X FUZZ --hc 404

# Objectif : encoders en chaîne
wfuzz -e urlencode,b64encode -z file,payloads.txt \
  -u "http://10.10.10.10/search?q=FUZZ"
```

### Expert

```bash
# Objectif : fuzzing récursif de répertoires
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ -R 3 --hc 404,403

# Objectif : filtre avancé avec le langage de filtres
wfuzz -z file,params.txt -u http://10.10.10.10/?FUZZ=1 \
  --filter "code=200 AND size>500 AND lines>3"

# Objectif : rejouer un flux Burp
wfuzz -z burplog,cap.xml -u http://10.10.10.10/FUZZ
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Découvrir un paramètre caché** : fuzzer les noms de paramètres sur un endpoint.
   ```bash
   wfuzz -z file,params.txt -u http://10.10.10.10/page.php?FUZZ=value --hc 404
   ```
2. **Établir la baseline** : noter la taille/code de réponse de référence pour filtrer.
   ```bash
   wfuzz -z list,test -u http://10.10.10.10/page.php?test=1
   ```
3. **Forcer une valeur de cookie** : énumérer les identifiants de session autorisés.
   ```bash
   wfuzz -z file,ids.txt -u http://10.10.10.10/dashboard.php -b "user_id=FUZZ" --hc 403
   ```
4. **Test d'authentification combiné** : users × mots de passe.
   ```bash
   wfuzz -z file,users.txt -z file,pass.txt -u http://10.10.10.10/login.php \
     -d "user=FUZZ&pass=FUZZ2" --hc 200
   ```
5. **Fuzzer un champ JSON** : endpoint API avec corps structuré.
   ```bash
   wfuzz -z list,1,2,3 -u http://10.10.10.10/api/check \
     -d '{"id":FUZZ}' -H "Content-Type: application/json" --hc 500
   ```
6. **Interpréter** : une réponse de taille différente (`--hh`) sur un paramètre peut indiquer une faille (SQLi, IDOR, mass assignment).

---

## 🎬 Scénarios avancés

### Scénario 1 : Découverte de paramètres cachés avec filtre sur la baseline

Fuzzer les noms de paramètres puis conserver uniquement ce qui diffère de la réponse par défaut.
```bash
wfuzz -z file,/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
  -u http://cible.local/account.php?FUZZ=1 --hh 2456
# Si la baseline fait 2456 octets, seules les vraies réponses ressortent
```

### Scénario 2 : Fuzzing d'en-têtes pour contourner un contrôle (IP interne)

```bash
wfuzz -z file,ips.txt -u http://cible.local/admin \
  -H "X-Forwarded-For: FUZZ" --hc 403
# Parfois 127.0.0.1 ou une IP interne valide la requête (contrôle d'origine)
```

### Scénario 3 : Automatisation via l'API Python

```python
from wfuzz.fuzzfactory import fuzz

for r in fuzz(url='http://cible.local/page.php?FUZZ=1',
              payload=[('file', '/usr/share/wordlists/common.txt')],
              hc=[404]):
    print(r.url, r.code, r.length)
```

### Scénario 4 : Découverte récursive de répertoires avec `-R`

Suivre les redirections (`-R`) pour descendre dans les arborescences découvertes.
```bash
wfuzz -z file,dirlist.txt -u http://cible.local/FUZZ -R 3 --hc 404,403
# Explore les répertoires trouvés sur 3 niveaux de profondeur
```

### Scénario 5 : Fuzzing de méthodes HTTP et d'en-têtes d'authentification

```bash
wfuzz -z list,GET,POST,PUT,DELETE,PATCH,OPTIONS \
  -u http://cible.local/api/item -X FUZZ --hc 404
# Les méthodes autorisées ressortent avec un code différent (200/405 vs 404)
```

### Scénario 6 : Cluster bomb multi-payloads (FUZZ2, FUZZ3)

```bash
wfuzz -z file,users.txt -z file,pass.txt -z list,true,false \
  -u http://cible.local/login.php -d "user=FUZZ&pass=FUZZ2&remember=FUZZ3" \
  --filter "code=200 AND size>3000"
# Teste toutes les combinaisons users × mots de passe × option
```

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Reconnaissance | Découverte de répertoires, fichiers et sous-domaines |
| Énumération | Découverte de paramètres cachés, méthodes HTTP, en-têtes |
| Vulnérabilité | Test d'injections (SQLi, XSS, command injection) via fuzzing |
| Exploitation | Validation de valeurs autorisées (IDs, rôles, cookies) |
| Post-exploitation | Fuzzing de l'API interne, découverte d'endpoints non documentés |
| Rapport | Évidence des réponses insolites (tailles/codes anormaux) |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Reconnaissance | Active Scanning: Vulnerability Scanning | T1595.002 | fuzzing actif pour identifier les vulnérabilités | Burst de requêtes variées, User-Agent wfuzz | WAF, rate limiting, supervision |
| Discovery | Application Window Discovery | T1010 | découverte de paramètres et ressources cachées | Patterns de requêtes répétitifs | Durcissement des endpoints |
| Credential Access | Brute Force | T1110 | fuzzing des formulaires de login (users × pass) | Tentatives de connexion multiples | MFA, rate limiting, lockout |
| Discovery | Brute Force: Password Guessing (variantes applicatives) | T1110.001 | test de valeurs dans les cookies/IDs de session | Volumes anormaux par endpoint | Validation stricte des entrées |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> L'association la plus spécifique dépend de l'usage : **T1595.002** pour le fuzzing général, **T1110** pour le brute force d'authentification.

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| User-Agent « Wfuzz » (ou dérivé) dans les logs | Premier signal d'un fuzzing |
| Requêtes variées sur un même endpoint avec paramètres successifs | Pattern typique du fuzzing |
| Valeurs suspectes dans les paramètres (SQL, XSS, encodages) | Marqueurs d'injection |
| Volume anormal de tentatives de login | Indice de brute force |
| Réponses 429 / lockout | Conséquence d'un fuzzing non calibré |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma : fuzzing wfuzz via User-Agent
title: Wfuzz Web Fuzzing
id: 3f1a4b2c-0004-4a5b-9c2d-000000000004
status: experimental
description: Détection d'un fuzzing wfuzz par le User-Agent
logsource:
    category: webserver
    product: apache
detection:
    selection:
        c-useragent|contains|all:
            - 'Wfuzz'
    condition: selection
falsepositives:
    - Outils d'audit légitimes
level: medium
```

```bash
# Suricata/Snort (pédagogique) : requêtes de fuzzing massives
alert http any any -> any any (msg:"Wfuzz - parameter fuzzing"; \
  flow:to_server,established; \
  http.user_agent; content:"Wfuzz"; \
  http.uri; content:"?"; \
  sid:66000020; rev:1;)
```

```yaml
# YARA : installation wfuzz sur un poste
rule Wfuzz_Installed {
    meta:
        description = "Présence d'une installation wfuzz"
        author = "Équipe SOC"
    strings:
        $a = "wfuzz" ascii wide
        $b = "fuzzfactory" ascii wide
        $c = "The Web Fuzzer" ascii wide
    condition:
        any of them
}
```

---

## 🤖 Automatisation

```bash
# Fuzzing en boucle sur plusieurs endpoints
for ep in login.php admin.php api.php; do
  wfuzz -z file,params.txt -u "http://10.10.10.10/$ep?FUZZ=1" --hc 404 -o "out_$ep.txt"
done

# Chaîner avec un proxy (Burp/ZAP) pour rejouer le trafic
wfuzz -p http://127.0.0.1:8080 -z file,dirlist.txt -u http://10.10.10.10/FUZZ --hc 404
```

```python
# Python : campagne de fuzzing scriptée avec l'API wfuzz
from wfuzz.fuzzfactory import fuzz

endpoints = ["login.php", "register.php", "profile.php"]
results = []

for ep in endpoints:
    for r in fuzz(url=f"http://10.10.10.10/{ep}?FUZZ=1",
                  payload=[('file', 'params.txt')],
                  hc=[404]):
        results.append((ep, r.code, r.length, r.url))

for ep, code, length, url in results:
    if code != 404:
        print(f"[{ep}] {code} {length} {url}")
```

```yaml
# Pipeline CI : fuzzing de sécurité sur staging
name: wfuzz-scan
on:
  schedule:
    - cron: "0 5 * * *"
jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fuzz
        run: |
          wfuzz -z file,seclists/burp-parameter-names.txt \
            -u "https://staging.cible.local/FUZZ" --hc 404 -o fuzz.txt
      - name: Upload
        uses: actions/upload-artifact@v4
        with:
          path: fuzz.txt
```

---

## 📤 Output et parsing

wfuzz affiche une sortie tabulaire : le numéro de ligne, le code HTTP, la taille en mots/lignes, la requête (URL avec la valeur injectée) et les payloads. Il peut écrire les résultats dans un fichier (`-o`) et sauvegarder des sessions (`-s`).

```bash
# Écrire les résultats dans un fichier
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ -o resultats.txt --hc 404

# Sauvegarder/recharger une session
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ -s session.wfuzz
wfuzz -s session.wfuzz

# Filtrer la sortie avec grep
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ --hc 404 | grep -E "^[0-9]+ *200"

# Compter les réponses intéressantes
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ --hc 404 | grep -cE "200|302"
```

> [!note] À vérifier
> Le format exact des sessions `.wfuzz` n'est pas rétro-compatible entre 2.x et 3.x (les sessions 3.0+ ne le sont pas avec les précédentes).

---

## 🔗 Intégrations

```text
wfuzz -> proxy (Burp/ZAP) -> trafic contrôlé et rejouable
wfuzz -> burplog/burpstate -> reprise des requêtes d'une session Burp
wfuzz -> API Python -> automatisation dans des scripts
wfuzz -> seclists/wordlists -> payloads standard
wfuzz -> outils d'échange (grep, jq) -> parsing des résultats
```

- [[Tools|🧰 Outils]] global
- [[Outil - ffuf]] — alternative Go plus rapide (même concept FUZZ)
- [[Outil - gobuster]] / [[Outil - Feroxbuster]] — directory busting spécialisé
- [[Outil - Burp Suite]] — Intruder pour le même type de fuzzing en GUI
- [[Techniques/Hidden Parameters|Hidden Parameters]] · [[Techniques/IDOR|IDOR]] · [[Techniques/Brute Force Rate Limit|Brute Force Rate Limit]] · [[03 - Exploitation Web|Exploitation Web]]

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| ffuf | Go, beaucoup plus rapide, filtrer -fw/-fl/-fs | Moins de types de payloads | Directory busting massif |
| Feroxbuster | Rust, récursif par défaut, rapide | Concept différent (pas FUZZ partout) | Énumération récursive |
| gobuster | Simple, stable, multi-modes | Moins flexible | Directory/DNS/Vhost |
| Burp Intruder | GUI, cluster bomb intégré | Commercial (Community limitée) | Fuzzing fin en GUI |
| ffuf/feroxbuster combinés | Meilleure vitesse | Perte de l'API Python | Fuzzing haute performance |

> **Quand utiliser wfuzz plutôt que les autres ?** Pour le **fuzzing multi-positions** (`FUZZ`, `FUZZ2`, `FUZZ3`), les **encoders**, les **payloads exotiques** (burplog, hexrand, iprange) et l'**API Python**. Pour du simple directory busting, ffuf/feroxbuster sont plus rapides.

---

## ⚡ Performance

- **pycurl multi** : wfuzz utilise libcurl en mode multi pour paralléliser les requêtes (`-t`, défaut 10 connexions).
- **Moins rapide que ffuf** : l'overhead Python et l'ancienneté du code le rendent plus lent pour de très grosses wordlists.
- **Filtres précoces** : utiliser `--prefilter` et des payloads ciblés réduit le volume de requêtes.
- **`-Z`** : stopper à la première erreur évite de gaspiller du temps sur une cible instable.
- **Récursion `-R`** : utile mais multiplie le nombre de requêtes — limiter la profondeur.
- **Calibrage** : noter la baseline (`Base`) avant une campagne permet de filtrer efficacement avec `--hh`/`--hc`.

> [!note] À vérifier
> Les performances varient selon le réseau et la cible : pour de gros volumes, privilégier ffuf/feroxbuster ; garder wfuzz pour sa flexibilité.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : `ImportError: No module named pycurl`

- **Cause** : pycurl absent ou non installé.
- **Solution** : `pip install pycurl` (ou `sudo apt install python3-pycurl`).
- **Vérification** : `python -c "import pycurl; print(pycurl.version)"`.

#### Problème : pycurl ne compile pas sur Windows

- **Cause** : libcurl manquante.
- **Solution** : installer `libcurl` (chocolatey : `choco install curl`) puis réinstaller pycurl, ou utiliser WSL2.
- **Vérification** : relancer `wfuzz -z list,test -u http://10.10.10.10/FUZZ`.

#### Problème : aucun résultat (tout filtré) alors que la cible répond

- **Cause** : filtres trop stricts (`--hc 404` alors que la cible renvoie 403).
- **Solution** : relancer sans filtre pour voir la baseline, puis affiner.
- **Vérification** : `wfuzz -z list,test -u http://10.10.10.10/page.php?test=1` sans filtres.

#### Problème : trop de réponses « Base » (faux positifs)

- **Cause** : la cible renvoie une page 404 custom (200) ou redirige tout.
- **Solution** : filtrer la taille/lignes de la baseline (`--hh`, `--hl`), tester sans suivre les redirections.
- **Vérification** : comparer les tailles des réponses pour repérer la baseline.

#### Problème : le site bloque après quelques requêtes (429/403)

- **Cause** : rate limiting ou WAF déclenché par le volume.
- **Solution** : réduire `-t`, utiliser `-p` (proxy) pour ralentir, changer de User-Agent (`-H`).
- **Vérification** : relancer avec `-t 1` et vérifier que les réponses redeviennent normales.

---

## 🔐 Sécurité de l'outil

- **Projet en maintenance** : dernière release 3.1.1 — pas de correctifs actifs ; à utiliser avec prudence et conscience des limites.
- **Volume de requêtes** : un fuzzing non calibré peut saturer une cible ou verrouiller des comptes (login).
- **Trafic non dissimulé** : le User-Agent par défaut « Wfuzz » est très reconnaissable ; adapter avec `-H`.
- **Proxy obligatoire en engagement** : passer par Burp/ZAP (`-p http://127.0.0.1:8080`) pour contrôler et enregistrer le trafic.
- **Données sensibles** : les résultats (`-o`) et sessions (`-s`) peuvent contenir des tokens/cookies — les purger après l'engagement.
- **Payloads exotiques** : les payloads `burplog`/`burpstate` peuvent rejouer du trafic réel — vérifier le contenu avant exécution.

---

## ⚠️ Limitations

- **Vitesse** : moins rapide que ffuf/feroxbuster sur de grosses wordlists (overhead Python).
- **Développement arrêté** : plus de maintenance active, dépendances anciennes, bugs non corrigés.
- **pycurl** : dépendance sensible sur Windows.
- **Baseline volatile** : les applications avec pages 404 custom (SPA/CDN) nécessitent un calibrage fin des filtres.
- **Pas de crawling** : wfuzz ne parcourt pas les applications, il fuzz ce qu'on lui donne.
- **Récursion limitée** : `-R` simple (répertoires), pas une vraie exploration applicative.

---

## 📋 Cheatsheet

```bash
# Directory busting
wfuzz -c -z file,dirlist.txt -u http://10.10.10.10/FUZZ --hc 404

# Paramètres cachés
wfuzz -c -z file,params.txt -u http://10.10.10.10/page.php?FUZZ=value --hc 404

# Force brute login (combinaison)
wfuzz -z file,users.txt -z file,pass.txt -u http://10.10.10.10/login.php \
  -d "user=FUZZ&pass=FUZZ2" --hc 200

# IDs numériques
wfuzz -z range,1-1000 -u http://10.10.10.10/api/items/FUZZ --hh 2456

# En-têtes (IP interne)
wfuzz -z file,ips.txt -u http://10.10.10.10/admin \
  -H "X-Forwarded-For: FUZZ" --hc 403

# Méthodes HTTP
wfuzz -z list,GET,POST,PUT,DELETE,PATCH,OPTIONS \
  -u http://10.10.10.10/api/item -X FUZZ --hc 404

# Filtre avancé
wfuzz -z file,params.txt -u http://10.10.10.10/?FUZZ=1 \
  --filter "code=200 AND size>500"

# Récursion
wfuzz -z file,dirlist.txt -u http://10.10.10.10/FUZZ -R 3 --hc 404

# Proxy
wfuzz -p http://127.0.0.1:8080 -z file,dirlist.txt -u http://10.10.10.10/FUZZ
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Fuzzer web Python : injecter des payloads dans n'importe quel champ HTTP |
| **Quand l'utiliser ?** | Paramètres cachés, brute force, tests de logique, en-têtes, méthodes HTTP |
| **Commande principale** | `wfuzz -z file,wordlist.txt -u http://cible.local/FUZZ --hc 404` |
| **Alternative principale** | ffuf (vitesse), Feroxbuster (récursion), Burp Intruder (GUI) |
| **Concepts importants** | FUZZ/FUZZ2/FUZZ3, payloads -z, encoders, filtres, récursion -R |
| **Liens associés** | [[Outil - ffuf]] · [[Outil - Feroxbuster]] · [[Outil - Burp Suite]] · [[Techniques/Hidden Parameters]] · [[Techniques/IDOR]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| User-Agent « Wfuzz » dans les logs | Règles SIEM/IDS sur le User-Agent |
| Requêtes variées sur un même endpoint avec paramètres successifs | Logs applicatifs + corrélation, détection de patterns de fuzzing |
| Patterns répétitifs et valeurs suspectes (SQL, XSS) | WAF / RASP : blocage des patterns et des requêtes anormales |
| Réponses 429, compteurs de tentatives (ex: login) | Rate limiting, lockout de compte, CAPTCHA |
| Traçabilité des paramètres fuzzés dans les endpoints JSON | API logs, alerting sur les volumes par endpoint |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> - Commence par fuzzer un seul paramètre connu avec une petite payload, note la baseline (`--hh`/`--hc`), puis extrapole proprement vers des listes plus grosses.
> - La sortie de wfuzz affiche la **baseline** (`Base` line) : note-la avant de lancer la campagne, c'est elle qui permet de calibrer `--hh`/`--hc`.
> - Utilise les **encoders** (`-e`) pour les contextes spéciaux (JSON, base64, hash) et `FUZZ2`/`FUZZ3` pour les combinaisons.
> - Passe par un proxy (`-p`) pour contrôler, modifier et rejouer le trafic pendant l'engagement.
> - Pour les grosses wordlists, préfère ffuf — mais garde wfuzz pour sa flexibilité (payloads exotiques, API Python).

> [!warning] ⚠️ **Pièges**
> - Sur une application de production, le fuzzing massif de login ou d'API peut verrouiller des comptes ou dégrader les performances. Vérifie le scope et garde `-t` modéré.
> - Le User-Agent par défaut « Wfuzz » est bloqué par beaucoup de WAF : personnalise-le (`-H "User-Agent: Mozilla/5.0..."`).
> - Les pages 404 custom (SPA) faussent les résultats sans un bon calibrage de baseline.
> - Le projet est en maintenance : ne pas attendre de correctifs récents, et tester ses dépendances (pycurl) avant engagement.

---

## 📚 References

### Official

- Site officiel : https://wfuzz.org
- Dépôt GitHub : https://github.com/xmendez/wfuzz
- Documentation : https://wfuzz.readthedocs.io
- Releases : https://github.com/xmendez/wfuzz/releases

### Security references

- MITRE ATT&CK T1595 — Active Scanning : https://attack.mitre.org/techniques/T1595/
- MITRE ATT&CK T1110 — Brute Force : https://attack.mitre.org/techniques/T1110/
- MITRE ATT&CK T1010 — Application Window Discovery : https://attack.mitre.org/techniques/T1010/

### Community

- Image Docker : https://github.com/xmendez/wfuzz/pkgs/container/wfuzz
- Seclists (wordlists) : https://github.com/danielmiessler/SecLists

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Outil - ffuf|Ffuf]] · [[Outil - Feroxbuster|Feroxbuster]] · [[Outil - Burp Suite|Burp Suite]] · [[Techniques/Hidden Parameters|Hidden Parameters]] · [[Techniques/IDOR|IDOR]] · [[Techniques/Brute Force Rate Limit|Brute Force Rate Limit]]
