---
title: "Outil - Amass"
type: outil
categorie: Reconnaissance & OSINT
tags:
  - cyber
  - outil
  - Reconnaissance & OSINT
statut: publie
version: v5.1.1
licence: Apache License 2.0
langage: Go
developpeur: OWASP / Jeff Foley (caffix) — OWASP Amass Project
repo: https://github.com/owasp-amass/amass
site: https://owasp.org/www-project-amass/
doc: https://owasp-amass.github.io/docs/
---

# Amass — Reconnaissance & Scan

> [!info] **En 1 phrase**
> Amass (OWASP) est l'outil de référence pour l'énumération de sous-domaines : il agrège plus de 200 sources OSINT passives et des techniques actives (DNS, certificats) pour cartographier la surface d'attaque d'un domaine.

---

## Overview

| Champ | Valeur |
|---|---|
| Nom complet | OWASP Amass |
| Description | Énumération de sous-domaines et cartographie de surface d'attaque : sources OSINT passives, DNS actif, brute-force, corrélation IP/ASN/relations dans une base de graphe |
| Catégorie | Reconnaissance & OSINT |
| Sous-catégorie | Énumération de sous-domaines & cartographie d'actifs |
| Fonction principale | Découvrir tous les noms DNS et actifs associés à une organisation |
| Type d'outil | CLI + moteur de données (client/engine) |
| Licence | Apache License 2.0 |
| Open source / propriétaire | Open source (projet OWASP) |
| Langage(s) de programmation | Go |
| Développeur / organisation | Jeff Foley (« caffix ») / OWASP Amass Project |
| Projet officiel | OWASP Amass Project |
| Dépôt officiel | https://github.com/owasp-amass/amass |
| Documentation officielle | https://owasp-amass.github.io/docs/ |
| Date de création | 10 juillet 2018 (premier commit du dépôt actuel) |
| État du projet | actif |
| Dernière version connue | v5.1.1 (2026-04-07) |
| Systèmes compatibles | Linux, Windows, macOS (binaires officiels + compilation Go) |

> [!note] Pour vérifier / compléter
> Le projet a subi une refonte majeure en v5 (2025) : architecture client/engine, configuration `config.yaml`/`datasources.yaml`. Les sous-commandes `intel`, `viz`, `track`, `db` de la v4 ont été retirées du binaire core et sont reprises par les outils `oam_tools` / le moteur REST de l'engine. La plupart des tutoriels existants (dont le wiki officiel) documentent encore la v4.

---

## Concept

Amass appartient à la phase de **reconnaissance** : il collecte les sous-domaines d'une organisation via des sources publiques (Certificate Transparency, DNS brute-force, reverse DNS, archives web, moteurs de recherche, API de threat intel) puis les corrèle en un **graphe de relations** (sous-domaines, IP, ASN, services). Les résultats sont stockés dans une **base de données d'actifs** locale : on peut relancer des énumérations successives sans reperdre les données, et suivre l'évolution de la surface d'attaque au fil des engagements. Le mode `-passive` ne contacte **jamais** la cible (données publiques uniquement) ; le mode `-active` effectue des requêtes DNS directes, des tentatives de transfert de zone et des sondes de services.

Outil du projet **OWASP**, il se pilote en CLI : la sous-commande principale est `amass enum` (énumération DNS et cartographie réseau). En v4, `amass intel` (renseignement passif/actif sur ASN, IP, whois), `amass viz` (visualisation du graphe), `amass db` et `amass track` complétaient la suite ; en v5 ces fonctions migrent vers le moteur REST de l'engine et la base d'actifs (`asset-db`). L'ajout de clés API (Censys, Shodan, VirusTotal...) dans le fichier de configuration décuple le nombre de sources. Amass se distingue de subfinder par sa profondeur : corrélation multi-sources, gestion du scope, transformations typées et base de données persistante.

```mermaid
flowchart LR
    A["Domaine cible"] --> B["Sources passives CT et OSINT"]
    B --> C["DNS actif et brute-force"]
    C --> D["Liste de sous-domaines"]
    D --> E["Corrélation IP et ASN"]
    E --> F["Graphe de la surface d'attaque"]
```

---

## Concepts fondamentaux

| Concept | Explication |
|---|---|
| Open Asset Model (OAM) | Modèle de données standardisé d'Amass (v4+) : entités typées (`FQDN`, `IPAddress`, `AutonomousSystem`, `TLSCertificate`, `DomainRecord`…) reliées par des transformations. V4 et v5 s'appuient dessus pour corréler les découvertes |
| Source de données | Fournisseur passif interrogé par API : Certificate Transparency (`crtsh`), SecurityTrails, VirusTotal, AlienVault OTX, Shodan, Censys, DNSDumpster, Wayback… Chaque source produit des entités avec un score de fiabilité |
| DNS actif | Requêtes DNS directes vers les résolveurs (A, AAAA, CNAME, transfert de zone, brute-force) — visible par la cible, contrairement au passif |
| Certificate Transparency | Journaux publics de certificats TLS (`crt.sh`, Google CT) : un certificat émis pour `*.example.com` révèle des sous-domaines jamais indexés ailleurs |
| Brute-force DNS | Test d'une wordlist de noms (`-w`) sur le domaine, avec résolution : à limiter en volume et en durée |
| Alterations | Génération de noms dérivés (préfixes, suffixes, remplacements de caractères) à partir des noms connus (`-alts`) |
| ASN / whois | Renseignement sur les numéros de système autonome (`-asn`), les CIDR (`-cidr`) et les propriétaires de domaines (`-whois`) pour élargir le périmètre |
| Base de données d'actifs (asset-db) | Persistance locale des résultats : évolution de la surface d'attaque, reprise d'énumérations, requêtes programmatiques |
| Moteur (engine) | Service REST/GraphQL d'Amass v5 qui orchestre les énumérations et l'API de données ; la CLI `amass enum` est un client de ce moteur |

---

## Installation

### Debian / Ubuntu / Kali Linux

```bash
sudo apt update && sudo apt install -y amass
amass -version
```

> [!note] À vérifier
> Le paquet `amass` des dépôts Debian/Kali fournit généralement la v4. La v5 s'installe via `go install` ou les binaires de release.

### Arch Linux

```bash
sudo pacman -S amass
```

### Fedora / RHEL

```bash
sudo dnf install amass
```

### macOS

```bash
brew install amass
```

### Windows

```powershell
# Binaire précompilé (Windows) depuis https://github.com/owasp-amass/amass/releases
# ou compilation Go
go install -v github.com/owasp-amass/amass/v5/cmd/amass@main
```

### Docker

```bash
docker pull owaspamass/amass
docker run --rm -it -v ~/.config/amass:/.config/amass owaspamass/amass enum -d example.com
```

### Compilation depuis les sources

```bash
git clone https://github.com/owasp-amass/amass.git && cd amass
# v5 : binaire client
CGO_ENABLED=0 go install -v github.com/owasp-amass/amass/v5/cmd/amass@main
# v4 : binaire historique
go install -v github.com/owasp-amass/amass/v4/...@master
```

> [!warning] Prérequis & problèmes potentiels
> - Nécessite Go 1.21+ (v5 : Go 1.26 minimum selon les releases récentes).
> - En v5, la CLI client a besoin d'un **engine** configuré (`options.engine` dans `config.yaml`, ex. `http://127.0.0.1:4000/graphql`) et d'une base (`options.database`, ex. Neo4j ou PostgreSQL via `asset-db`).
> - Les clés API se gèrent dans le fichier de configuration, pas dans des variables d'environnement individuelles (sauf `AMASS_CONFIG`).

---

## Configuration

### Emplacements

- v4 : `~/.config/amass/config.ini` (fichier INI de sources API, détecté automatiquement).
- v5 : `~/.config/amass/config.yaml` (scope, options, transformations) + `datasources.yaml` (clés API). Variable d'environnement `AMASS_CONFIG` pour pointer vers un autre fichier.
- Alternatives : `-config <fichier>` pour charger explicitement une configuration.

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `options.datasources` | Chemin du fichier des clés API | chemin YAML | Active ou non les sources payantes/privées | `datasources: "./datasources.yaml"` |
| `options.engine` | URL du moteur Amass v5 | URL GraphQL | Nécessaire au client v5 | `engine: "http://127.0.0.1:4000/graphql"` |
| `options.database` | Chaîne de connexion à la base d'actifs | Neo4j bolt / PostgreSQL | Persistance et corrélation des résultats | `database: "bolt://neo4j:amass4OWASP@neo4j:7687/neo4j"` |
| `options.bruteforce.enabled` | Active le brute-force DNS | booléen | Volume de requêtes + couverture | `enabled: true` |
| `options.bruteforce.wordlists` | Wordlists de brute-force | listes de chemins | Jeu de noms testés | `- "./wordlists/short-wordlist.txt"` |
| `options.alterations.enabled` | Génération de noms altérés | booléen | Découverte de noms dérivés | `enabled: true` |
| `scope.domains` | Domaines racines en scope | liste | Périmètre de l'énumération | `- example.com` |
| `scope.ports` | Ports sondés en mode actif | liste | Couverture des services | `- 80` / `- 443` |
| `AMASS_CONFIG` | Variable d'environnement | chemin | Remplace le fichier par défaut | `export AMASS_CONFIG=/opt/amass/config.yaml` |

> [!note] À vérifier
> Le format exact des clés API dans `datasources.yaml` (v5) diffère de l'ancien `config.ini` (v4) : se référer à https://owasp-amass.github.io/docs/configuration/ et aux exemples du dépôt `resources/`.

---

## Architecture interne

- **v4** : binaire monolithique avec un moteur interne, une **base de graphe** locale (Neo4j par défaut, via le sous-ensemble `asset-db`), des packages de sources de données, et des sous-commandes `enum` / `intel` / `viz` / `db` / `track`.
- **v5** : séparation **client / engine**. La CLI (`amass enum`, un client) parle au **moteur REST/GraphQL** (`internal/engine`), qui orchestre les énumérations et le persiste dans l'**asset-db** (Neo4j ou PostgreSQL). Le catalogue des transformations est déclaré dans `config.yaml` (clé `transformations`, ex. `FQDN->DNS`) avec TTL, confiance et priorité par type de transition.
- **OAM (Open Asset Model)** : entités et transformations typées — c'est le cœur logique : chaque source produit des entités qui sont validées, dédupliquées et reliées entre elles.
- **Sources de données** : implémentées en Go dans `internal/datasrc`, interrogées en parallèle avec quotas ; la liste est consultable via `amass enum -list` / `amass intel -list` (v4).
- **Flux d'exécution (enum)** : résolution du scope → collecte passive (CT, OSINT, API) → résolution DNS active (si `-active`) → brute-force / alterations → résolution des IP → enrichissement (ASN, services, certs) → écriture dans la base + sorties texte/JSON.

---

## Commandes

### Commandes principales

```bash
amass enum [options] -d DOMAIN
amass intel [options] [v4]
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `amass enum -passive -d example.com -o subs.txt` | Énumération passive (sources OSINT uniquement) | Liste de sous-domaines dans `subs.txt` |
| `amass enum -active -d example.com` | Ajoute DNS actif, résolution, sondes | Sous-domaines + IP résolues |
| `amass enum -brute -w wordlist.txt -d example.com` | Brute-force de sous-domaines | Noms découverts par wordlist |
| `amass enum -passive -d example.com -ip -src` | Résolution IP + origine des données | Sous-domaines, IP et source par entrée |
| `amass enum -df domains.txt -o subs.txt` | Plusieurs domaines racines (un par ligne) | Résultats fusionnés |
| `amass enum -d example.com -json out.json` | Sortie JSON structurée | Fichier JSON exploitable |
| `amass intel -whois -d example.com` (v4) | Recherche de domaines liés par reverse whois | Domaines apparentés |
| `amass intel -org "Example Corp"` (v4) | Trouve les ASN d'une organisation | Numéros d'ASN |
| `amass intel -active -addr 10.10.10.10` (v4) | Reverse DNS : IP → domaines | Noms résolus sur l'IP |
| `amass viz -d3 -o graph.html` (v4) | Visualisation 3D du graphe | Fichier HTML interactif |

> [!note] À vérifier
> En v5, `intel`, `viz`, `db` et `track` ne font plus partie du binaire principal (`amass` = client du moteur). La fonctionnalité est portée par l'engine et les outils `oam_tools`. Vérifier la version installée avec `amass -version` avant d'utiliser ces sous-commandes.

### Commandes avancées

```bash
# Énumération active complète avec brute-force et wordlist Seclists
amass enum -active -brute -d example.com \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -o subs.txt
# Sorties multi-formats avec préfixe commun
amass enum -passive -d example.com -oA amass_scan
# Restreindre les sources (exclusion / inclusion)
amass enum -passive -d example.com -exclude crtsh,shodan -o subs.txt
# Énumération sous contrainte de temps (30 minutes)
amass enum -active -brute -d example.com -timeout 30 -o subs.txt
# Resolveurs préférés pour répartir la charge
amass enum -passive -d example.com -r 8.8.8.8,1.1.1.1 -o subs.txt
```

---

## Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `-d <domaine>` | Domaine racine cible (répétable) | `amass enum -d example.com` | Basic |
| `-passive` | Mode purement passif (aucun paquet vers la cible) | `amass enum -passive -d example.com` | Basic |
| `-o <fichier>` | Fichier de sortie texte | `amass enum -d example.com -o subs.txt` | Basic |
| `-df <fichier>` | Fichier de domaines racines (un par ligne) | `amass enum -df domains.txt` | Basic |
| `-active` | Techniques actives (DNS direct, transfert de zone, sondes) | `amass enum -active -d example.com` | Intermediate |
| `-brute` | Brute-force de sous-domaines | `amass enum -brute -d example.com` | Intermediate |
| `-w <wordlist>` | Wordlist pour le brute-force | `amass enum -brute -w words.txt` | Intermediate |
| `-ip` / `-ipv4` / `-ipv6` | Résout les noms en adresses IP | `amass enum -ip -d example.com` | Intermediate |
| `-src` | Affiche la source de chaque découverte | `amass enum -src -d example.com` | Intermediate |
| `-json <fichier>` | Sortie JSON | `amass enum -json out.json -d example.com` | Intermediate |
| `-oA <préfixe>` | Sorties multiples (texte, JSON, CSV) | `amass enum -oA scan -d example.com` | Advanced |
| `-timeout <minutes>` | Durée maximale d'exécution | `amass enum -timeout 30 -d example.com` | Advanced |
| `-exclude <sources>` / `-ef <f>` | Exclut des sources de données | `amass enum -exclude crtsh` | Advanced |
| `-include <sources>` / `-if <f>` | Ne garde que certaines sources | `amass enum -include virustotal` | Advanced |
| `-r <ip>` / `-rf <f>` | Résolveurs DNS préférés | `amass enum -r 1.1.1.1` | Advanced |
| `-bl <nom>` / `-blf <f>` | Blacklist de noms exclus | `amass enum -bl mail.example.com` | Advanced |
| `-nf <fichier>` | Noms déjà connus fournis en entrée | `amass enum -nf known.txt` | Advanced |
| `-noalts` / `-norecursive` | Désactive alterations / brute-force récursif | `amass enum -noalts -d example.com` | Expert |
| `-max-dns-queries <n>` | Plafond de requêtes DNS concurrentes | `amass enum -max-dns-queries 200` | Expert |
| `-do <fichier>` | Sortie des opérations de données (JSON) | `amass enum -do data.json` | Expert |
| `-config <fichier>` | Fichier de configuration explicite | `amass enum -config config.ini` | Expert |
| `-demo` | Obture la sortie pour les démonstrations | `amass intel -demo -d example.com` | Expert |

> [!tip] Options les plus utiles au quotidien
> `-passive` (recon sans bruit), `-o` (sauvegarde), `-ip -src` (résolution + traçabilité), `-brute -w` (profondeur), `-timeout` (maîtrise de la durée).

---

## Exemples pratiques

### Beginner

```bash
# Énumération passive simple, sortie dans un fichier
amass enum -passive -d example.com -o sous-domaines.txt
# Vérifier les sources disponibles
amass enum -list
```

### Intermediate

```bash
# Énumération active + brute-force avec wordlist
amass enum -active -brute -d example.com \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -o subs.txt
# Résolution IP + origine de chaque nom
amass enum -passive -d example.com -ip -src -o subs_ip.txt
```

### Advanced

```bash
# Corrélation sur plusieurs domaines racines, sorties JSON+CSV
amass enum -passive -df domains.txt -oA amass_scan
# Renseignement organisationnel (v4) : ASN puis énumération sur l'ASN
amass intel -org "Example Corp"
amass intel -asn 12345 -whois
```

### Expert

```bash
# Monitoring d'évolution : deux scans datés puis diff
amass enum -passive -d example.com -oA scan_2026_07
amass enum -passive -d example.com -oA scan_2026_08
comm -13 scan_2026_07.txt scan_2026_08.txt
# Énumération sous contrainte de temps avec sources restreintes
amass enum -active -brute -timeout 20 -d example.com \
  -exclude passive-dns -max-dns-queries 300 -o subs.txt
```

---

## Workflow complet (scénario pas à pas)

1. **Recon passive initiale** : `amass enum -passive -d example.com -o subs.txt`.
2. **Élargir avec brute-force** : `amass enum -active -brute -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -d example.com -o subs_plus.txt`.
3. **Résolution en IP** : `amass enum -passive -d example.com -ip -o subs_ip.txt`.
4. **Prioriser les hôtes web** : lancer ensuite `httpx -l subs_ip.txt` ou `nmap -p-` sur les IP pour trouver les services vivants.
5. **Vérification manuelle** : `dig A <sous-domaine>` ou `host <sous-domaine>` pour confirmer que chaque nom est vivant avant de le scanner.

---

## Scénarios avancés

### Scénario 1 : Cartographie d'un ASN complet

Découvrir les domaines hébergés derrière l'ASN d'une entreprise (surface étendue hors du domaine principal) :

```bash
amass intel -org "Example Corp"       # trouver les ASN de l'organisation (v4)
amass intel -asn 12345                # sous-domaines hébergés sur l'ASN (v4)
amass enum -passive -df domains.txt -o tous_sous_domaines.txt
```

### Scénario 2 : Visualisation du graphe et ciblage des sous-domaines oubliés

```bash
amass viz -d3 -o graph.html           # ouvrir graph.html dans un navigateur (v4)
# Les nœuds isolés (peu de connexions) sont souvent des sous-domaines oubliés,
# donc moins surveillés : candidates parfaites pour la suite du pentest
httpx -l tous_sous_domaines.txt -title -status-code -o vivants.txt
```

### Scénario 3 : Monitoring de l'évolution de la surface d'attaque

Relancer une énumération chaque mois et différer les résultats pour repérer les nouveaux sous-domaines (et donc les nouvelles cibles) :

```bash
amass enum -passive -d example.com -oA scan_2026_07
amass enum -passive -d example.com -oA scan_2026_08
# Nouveaux sous-domaines apparus entre les deux scans :
comm -13 scan_2026_07.txt scan_2026_08.txt
# Sortie multi-formats (txt, json, csv) directement exploitables par le SIEM/rapport
```

---

## Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Reconnaissance | Énumération passive de sous-domaines (`-passive`), sans contact avec la cible |
| Reconnaissance | Renseignement ASN / whois / reverse whois (`amass intel`, v4) |
| Énumération | Brute-force DNS + alterations pour élargir la surface |
| Énumération | Corrélation IP / ASN / services pour prioriser les cibles |
| Rapport / audit | Graphe de la surface d'attaque (`amass viz`, v4) et sorties JSON/CSV |
| Red team | Suivi de l'évolution de la surface d'attaque entre engagements (diff) |

---

## MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Reconnaissance | Search Open Technical Databases : DNS/Passive DNS | T1596.001 | Amass interroge des bases de DNS passif (SecurityTrails, passive DNS) | DET0817 : monitoring des requêtes DNS répétées | Restreindre les données DNS publiques, surveiller les résolveurs |
| Reconnaissance | Search Open Technical Databases : WHOIS | T1596.002 | `amass intel -whois` explore les bases whois | Alertes sur volume anormal de requêtes WHOIS | WHOIS privacy, contrôler les données d'enregistrement |
| Reconnaissance | Search Open Technical Databases : Scan Databases | T1596.005 | Sources type Shodan/Censys/VirusTotal interrogées via API | Quotas et journaux d'API (logs providers) | Clés API limitées, journalisation des accès |
| Reconnaissance | Search Open Technical Databases : SSL Certificates | T1596.006 | Certificate Transparency (crt.sh, Google CT) pour retrouver des sous-domaines | Surveillance des journaux CT | Certificats wildcard, contrôle des champs publics |
| Reconnaissance | Active Scanning : Scanning IP Blocks | T1595.001 | Mode `-active` : résolution DNS, brute-force, sondes vers la cible | Pics de requêtes DNS, NXDOMAIN en rafale | Rate limiting DNS, RPZ, journalisation des résolveurs |
| Discovery | Network Service Discovery | T1046 | Sondes de services sur les ports scopés (mode actif) | IDS/IPS, corrélation de connexions | Firewall, segmentation |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> Les techniques principales d'Amass sont de l'ordre de T1596.* (recherche de bases techniques ouvertes) et T1595.001 pour la partie active.

---

## Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Requêtes DNS massives vers un résolveur | Brute-force ou énumération active depuis une IP |
| Rafales de NXDOMAIN | Exploration d'une wordlist de noms inexistants |
| Requêtes WHOIS / RDAP répétées | Renseignement d'infrastructure (`amass intel -whois`) |
| Demandes de transfert de zone (AXFR) | Tentative de dump d'enregistrements (mode actif) |
| Requêtes vers les APIs de threat intel (Shodan, VirusTotal, CT) | Corrélation passive des actifs |
| Exécution du binaire `amass` sur un endpoint | Détection EDR/processus (Linux/Windows) |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma — Adaptation pédagogique de la règle SigmaHQ
# proc_creation_lnx_susp_network_utilities_execution (id 3e102cd9-a70d-4a7a-9508-403963092f31)
title: Linux Network Service Scanning Tools Execution
id: 3e102cd9-a70d-4a7a-9508-403963092f31
status: test
logsource:
    category: process_creation
    product: linux
detection:
    selection_network_scanning_tools:
        Image|endswith:
            - '/amass'
            - '/subfinder'
            - '/dnsx'
            - '/masscan'
            - '/nmap'
    condition: selection_network_scanning_tools
falsepositives:
    - Legitimate administrative usage
level: medium
```

```yaml
# Sigma — Nombre anormal de requêtes DNS sortantes vers un même domaine
# Adaptation : adapter le seuil et la fenêtre à votre résolveur
title: Suspicious High Volume DNS Query Count
id: 2d5d2d8a-1a5e-4e8a-b8f6-0b61c2f8e0a1
status: test
logsource:
    product: dns
    service: resolution
detection:
    selection:
        query.type: A
    condition: selection
    timeframe: 5m
    aggregation:
        count: 500
        by: src_ip
falsepositives:
    - Legitimate bulk DNS operations
level: medium
```

```bash
# Suricata — bursts de requêtes DNS NXDOMAIN depuis une source unique
# (adaptation pédagogique, à ajuster selon le réseau)
alert dns any any -> any any (msg:"Potential Amass-style DNS enumeration"; \
  sid:2026001; rev:1;)
```

> [!note] À vérifier
> Exemples pédagogiques : adapter les seuils (count/timeframe) à votre réseau pour limiter les faux positifs.

---

## Automatisation

```bash
# Bash — boucle sur plusieurs domaines, un rapport par domaine
for d in example.com example.org example.net; do
    amass enum -passive -d "$d" -o "amass_$d.txt"
done
cat amass_*.txt | sort -u > all_subs.txt
```

```python
# Python — relance périodique + détection de nouvelles entités
import subprocess, time, os

def run_amass(domain, out):
    subprocess.run(["amass", "enum", "-passive", "-d", domain, "-o", out],
                   check=True)

today = "scan_2026_08.txt"
run_amass("example.com", today)
# Différence avec le scan précédent
try:
    prev = open("scan_2026_07.txt").read().splitlines()
except FileNotFoundError:
    prev = []
new = [x for x in open(today).read().splitlines() if x not in prev]
print("Nouveaux sous-domaines :", len(new))
```

```yaml
# cron — monitoring mensuel de la surface d'attaque
0 3 1 * *  cd /opt/recon && amass enum -passive -d example.com -oA amass_scan >> /var/log/amass.log 2>&1
```

---

## Output et parsing

Formats natifs : texte (`-o`), JSON (`-json`), multi-formats (`-oA` → `.txt`, `.json`, `.csv`). La sortie texte est une ligne par nom.

```bash
# Compter les résultats
wc -l subs.txt
# Trier / dédupliquer avant de passer à httpx
sort -u subs.txt -o subs.txt
# Exploiter le JSON (avec -json)
jq -r '.[] | select(.name) | .name' amass.json 2>/dev/null | sort -u
```

```python
# Python — parsing de la sortie texte
with open("subs.txt") as f:
    subs = {line.strip() for line in f if line.strip()}
print(f"{len(subs)} sous-domaines uniques")
```

```python
# Python — lecture du JSON (v4 -json) si disponible
import json
with open("amass.json") as f:
    data = json.load(f)
for item in data:
    if "name" in item:
        print(item["name"])
```

> [!note] À vérifier
> Le schéma exact de la sortie JSON dépend de la version (v4 vs v5). Adapter le parsing après `amass enum -json`.

---

## Intégrations

- [[Tools| Outils]] global
- [[Outil - subfinder|subfinder]] — complément passif rapide (croiser les deux sorties)
- [[Outil - dnsx|dnsx]] — validation DNS des sous-domaines découverts
- [[Outil - httpx|httpx]] — probing HTTP des hôtes vivants
- [[Outil - nuclei|nuclei]] — scan de vulnérabilités sur les cibles validées
- [[Outil - Censys|Censys]] / [[Outil - Shodan CLI|Shodan CLI]] — sources de données à configurer dans le fichier de config
- [[Outil - theHarvester|theHarvester]] — collecte OSINT complémentaire (emails, hôtes)
- [[Outil - Nmap|Nmap]] / [[Outil - naabu|naabu]] — scan des hôtes identifiés
- [[01 - Reconnaissance| Reconnaissance]]

```text
Domaines → Amass → subfinder → dnsx → httpx → nuclei
                 ↘  (graphe/asset-db pour le rapport)
```

---

## Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| subfinder | Très rapide, passif, intégration API simples | Pas de corrélation, pas de base de données | Recon passive en premier jet |
| dnsx | Brute-force + validation DNS à très haut débit | Uniquement DNS, pas de sources OSINT | Validation et brute-force |
| theHarvester | Emails, hôtes, résolution (moteurs de recherche) | Moins profond sur les sous-domaines | Collecte OSINT multi-cibles |
| SecurityTrails (API) | Historique DNS et whois riche | Payant, pas de CLI officielle | Complément d'historique |
| crt.sh | Gratuit, sans clé, données CT | Données brutes, pas de corrélation | Vérification rapide CT |
| Amass (v4 monolithique) | Tout-en-un historique avec `intel`/`viz` | Architecture v4 obsolète face à v5 | Compatibilité avec les tutoriels existants |

> **Quand utiliser subfinder plutôt qu'Amass ?** Pour une première passe passive rapide sur beaucoup de domaines (subfinder est plus léger et plus simple). Utiliser Amass quand on veut la corrélation IP/ASN/relations, la persistance en base et un graphe exploitable.

---

## Performance

- Parallélisation : énumérations concurrentes par source, résolution DNS massive avec contrôle (`-max-dns-queries`, `-timeout`).
- Le mode passif ne consomme que des API tierces : la durée dépend du nombre de sources configurées et de leurs quotas.
- En v5, le moteur REST apporte une file de travaux persistante et un débit maîtrisé (dispatcher durable, backlog borné).
- Le brute-force et les alterations multiplient les requêtes DNS : borner avec `-timeout` et `-max-dns-queries` sur les gros périmètres.

> [!note] À vérifier
> Aucun benchmark officiel publié par le projet : les chiffres varient fortement selon les sources configurées, les quotas API et la connectivité.

---

## Troubleshooting

### Common problems

#### Problème : « Failed to create the graph » (v4)

- **Cause** : échec de création de la base de graphe locale (permissions, répertoire).
- **Solution** : définir un répertoire de sortie explicite avec `-dir <chemin>`.
- **Vérification** : `amass enum -passive -d example.com -dir /tmp/amass`.

#### Problème : sous-commande `amass intel` introuvable (v5)

- **Cause** : en v5, `intel`, `viz`, `db`, `track` ont été retirés du binaire principal.
- **Solution** : utiliser `amass enum` (fonctionnalité de cartographie), ou revenir à la v4 (`go install .../amass/v4/...`), ou utiliser les outils `oam_tools` / l'API de l'engine.
- **Vérification** : `amass -version` puis `amass -h`.

#### Problème : le client v5 ne démarre pas sans engine

- **Cause** : l'architecture client/engine exige un moteur et une base configurés.
- **Solution** : démarrer l'engine (voir le docker-compose et `config.yaml` d'exemple du dépôt) et renseigner `options.engine` / `options.database`.
- **Vérification** : `docker compose up` puis `amass enum -d example.com`.

#### Problème : résultats vides alors que le domaine a des sous-domaines

- **Cause** : pas de clé API configurée (certaines sources nécessitent une clé) ou sources limitées par quota.
- **Solution** : configurer `datasources.yaml` (v5) / `config.ini` (v4) avec les clés Censys, Shodan, VirusTotal… et réessayer.
- **Vérification** : `amass enum -passive -d example.com -src` pour voir les sources qui ont répondu.

---

## Sécurité de l'outil

- **Mode passif** : ne contacte jamais la cible — le plus sûr légalement ; le mode `-active` et le brute-force sont **détectables** (logs DNS, transferts de zone).
- **Clés API** : stockées en clair dans `config.yaml` / `config.ini` → permissions restrictives (`chmod 600`), ne jamais committer ces fichiers.
- **V5** : le moteur REST et la base (Neo4j/PostgreSQL) exposent des identifiants (ex. mot de passe par défaut `amass4OWASP`) → changer les mots de passe par défaut en production.
- **Quotas** : certaines sources limitent les requêtes par jour ; lancer trop de scans peut faire bannir vos clés.
- Usage réservé aux périmètres autorisés (scope d'un engagement, bug bounty).

---

## Limitations

- Les sources OSINT contiennent des données **périmées** : un nom découvert ne prouve pas qu'il est encore actif (valider avec dnsx/httpx).
- La v5 a retiré les sous-commandes historiques (`intel`, `viz`, `db`, `track`) du binaire core : courbe d'apprentissage et documentation éclatée.
- Le brute-force est **bruyant et long** : à brider (`-timeout`, wordlist raisonnable).
- Sans API keys, la couverture passive est très réduite (quotas stricts).
- Pas de scan de ports ni de détection de vulnérabilités : c'est un outil de collecte/corrélation, pas un scanner.

---

## Cheatsheet

```bash
# Énumération passive (départ)
amass enum -passive -d example.com -o subs.txt

# Énumération active + brute-force
amass enum -active -brute -d example.com \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -o subs.txt

# Avec résolution IP et sources
amass enum -passive -d example.com -ip -src -o subs_ip.txt

# Plusieurs domaines
amass enum -passive -df domains.txt -o subs.txt

# Sorties multi-formats
amass enum -passive -d example.com -oA scan

# Renseignement (v4)
amass intel -whois -d example.com
amass intel -org "Example Corp"

# Visualisation (v4)
amass viz -d3 -o graph.html
```

---

## Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Cartographier la surface d'attaque DNS d'une organisation (sous-domaines, IP, ASN, relations) |
| **Quand l'utiliser ?** | Phase de reconnaissance, avant la validation DNS et le probing HTTP |
| **Commande principale** | `amass enum -passive -d example.com -ip -src -o subs.txt` |
| **Alternative principale** | subfinder (rapide, passif) / dnsx (brute-force) / theHarvester (OSINT) |
| **Concepts importants** | OAM, sources passives, Certificate Transparency, brute-force, asset-db, engine |
| **Liens associés** | [[Outil - subfinder]] · [[Outil - dnsx]] · [[Outil - httpx]] · [[Outil - theHarvester]] |

---

## Détection & Défense

| Signe | Défense |
|---|---|
| Mode passif | Ne laisse **aucune trace** chez la cible (données publiques uniquement) |
| Mode actif | Visible : requêtes DNS brute-force, tentatives de transfert de zone |
| Beaucoup de requêtes NXDOMAIN sur le resolver | Logs DNS + alerte = brute-force en cours |
| Transfert de zone (axfr) | Désactiver ou restreindre `axfr` sur les serveurs DNS |
| Sous-domaines oubliés exposés | Inventaire DNS + scans périodiques, retirer les enregistrements obsolètes |
| Requêtes vers les APIs OSINT (CT, Shodan) | Journaliser les quotas API, surveiller les usages anormaux des clés |

---

## Tips & Pièges

> [!tip] **Tips**
> - Configurer les API keys (Shodan, Censys, OTX) dans le fichier de configuration décuple les sources passives (résultats bien plus complets).
> - Croiser avec d'autres outils : `subfinder -d example.com -all` ou `crt.sh` donnent souvent des sous-domaines différents — toujours croiser 2-3 outils.
> - Utiliser `-src` pour savoir quelle source a trouvé chaque nom : utile pour le rapport.
> - En v5, penser au monitoring programmatique : la base d'actifs permet des requêtes et des diffs sans repasser par la CLI.

> [!warning] **Pièges**
> - Le brute-force (`-brute`) est bruyant et long : limiter avec `-timeout` et une wordlist raisonnable.
> - Les sources OSINT contiennent des données périmées : valider chaque sous-domaine par résolution DNS avant de le considérer comme vivant.
> - Sans API key, certaines sources (VirusTotal, AlienVault) limitent à quelques requêtes/jour : espacer les scans.
> - Ne pas confondre v4 et v5 : `config.ini` vs `config.yaml`, sous-commandes `intel`/`viz` absentes de la v5. Vérifier `amass -version` avant de copier une commande d'un tutoriel.

---

## References

### Official

- Documentation officielle (OWASP Amass docs) : https://owasp-amass.github.io/docs/
- GitHub officiel : https://github.com/owasp-amass/amass
- Wiki officiel (User Guide, flags v4) : https://github.com/owasp-amass/amass/wiki/User-Guide
- Documentation configuration : https://owasp-amass.github.io/docs/configuration/
- Page projet OWASP : https://owasp.org/www-project-amass/

### Security references

- MITRE ATT&CK T1596 — Search Open Technical Databases : https://attack.mitre.org/techniques/T1596/
- MITRE ATT&CK T1595 — Active Scanning : https://attack.mitre.org/techniques/T1595/
- SigmaHQ — proc_creation_lnx_susp_network_utilities_execution : https://github.com/SigmaHQ/sigma/blob/master/rules/linux/process_creation/proc_creation_lnx_susp_network_utilities_execution.yml

### Community

- OWASP Amass 5 First Look (Devious Plan, 2025) : https://www.devious-plan.com/blog/owasp-amass-5-first-look
- HackTricks — Reconnaissance / subdomains : https://book.hacktricks.xyz/network-services-pentesting/pentesting-network

---

**Liens :** [[Tools| Outils]] · [[01 - Reconnaissance| Reconnaissance]] · [[Outil - theHarvester| theHarvester]] · [[Outil - SpiderFoot| SpiderFoot]]
