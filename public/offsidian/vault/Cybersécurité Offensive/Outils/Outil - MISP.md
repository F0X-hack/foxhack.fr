---
title: "Outil - MISP"
type: outil
categorie: Forensics, Threat Intel & Honeypots
tags:
  - cyber
  - outil
  - Forensics, Threat Intel & Honeypots
statut: publie
version: 2.5.44 (2026) ; 2.5.42 = release sécurité (2026-06-22)
licence: AGPL-3.0
langage: PHP (serveur), Python (scripts/modules), JavaScript (UI)
developpeur: MISP Project (communauté)
repo: https://github.com/MISP/MISP
site: https://www.misp-project.org
doc: https://misp.github.io/MISP/
---

# MISP — Plateforme de partage de Threat Intelligence

> [!info] **En 1 phrase**
> MISP (Malware Information Sharing Platform) est une plateforme open source de partage de threat intelligence : elle centralise événements, indicateurs de compromission (IoC), galaxies de taxonomies et flux synchronisés entre organisations.

---

## Overview

| Champ | Valeur |
|---|---|
| Nom complet | MISP — Malware Information Sharing Platform |
| Description | Plateforme de partage de threat intelligence : centralise événements, IoC, galaxies, taxonomies et synchronisation inter-organisations |
| Catégorie | Forensics, Threat Intel & Honeypots |
| Sous-catégorie | Threat Intelligence / IoC Management |
| Fonction principale | Centraliser, enrichir, corréler et partager les indicateurs de compromission et les analyses d'attaques |
| Type d'outil | Serveur web (PHP/MySQL) + API REST + clients (PyMISP) |
| Licence | AGPL-3.0 |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | PHP (serveur), Python (scripts/modules), JavaScript (UI) |
| Développeur / organisation | MISP Project (communauté) |
| Projet officiel | MISP |
| Dépôt officiel | https://github.com/MISP/MISP |
| Documentation officielle | https://misp.github.io/MISP/ |
| Date de création | 2011 (CERT-CTME, CIRCL) |
| État du projet | actif (2.5.44 courante ; 2.5.42 release sécurité 2026-06-22) |
| Dernière version connue | 2.5.44 |
| Systèmes compatibles | Linux (Debian/Ubuntu recommandé), Docker ; clients Python (PyMISP) |

> [!note] Pour vérifier / compléter
> MISP publie régulièrement des releases (dont des mises à jour de sécurité : v2.5.42 du 22/06/2026) : appliquer les correctifs rapidement et suivre le changelog officiel.

---

## Concept

MISP est un serveur de threat intel qui modélise la connaissance en **événements** (une attaque, un incident), chacun contenant des **attributs** (les IoC : IP, hash, domaines, emails) reliés par des **relations**. Chaque objet peut être tagué avec une **galaxie** (MITRE ATT&CK, malwares, ransomware, etc.) pour être catégorisé et recherchable. C'est la pierre angulaire d'un SOC : centraliser les IoC, les enrichir et les partager en automatique.

Le partage se fait via **feeds** (fichiers CSV/JSON/MISP publiés, ex. CIRCL, Botvrij, Feodo) et via **synchronisation** entre instances MISP (nœuds interconnectés, blancs/abonnés). La plateforme propose aussi une API REST et un système de **warninglists** (listes d'IoC légitimes à ne pas déclencher d'alertes). L'intérêt défensif : tout indicateur remonté par un honeypot (Cowrie, Canarytokens), un sandbox ou une analyse YARA peut être poussé dans MISP et corrélé avec le SIEM.

```mermaid
flowchart LR
    A["Sources - sandbox, honeypots, feeds"] --> B["MISP événements"]
    B --> C["Attributs IoC + galaxies"]
    C --> D["Synchronisation inter-orga"]
    D --> E["Alertes SIEM / chasse"]
```

---

## Concepts fondamentaux

| Concept | Explication |
|---|---|
| Event | Un événement = un incident/attaque avec son contexte (info, threat level, distribution) |
| Attribute | Un IoC : ip-src, ip-dst, domain, hostname, md5, sha1, sha256, filename, email-src, url... |
| Object | Groupe structuré d'attributs (file, domain-ip, network-connection...) |
| Tag | Étiquette de couleur libre (ex. TLP, statut de l'événement) |
| Galaxy | Bibliothèque de classification : MITRE ATT&CK, threat actors, ransomware, outils |
| Taxonomy | Taxonomies standardisées (TLP, admiralty, incident classification) |
| Warninglist | Listes d'indicateurs légitimes (IP publiques, domaines connus) pour éviter les fausses alertes |
| Feed | Flux externe d'événements (CIRCL, Botvrij, Feodo, URLhaus...) |
| Synchronisation | Partage serveur-à-serveur entre instances MISP (relations de confiance) |
| Distribution | Niveau de partage : 0=organisation seule, 1=communauté, 2=communautés liées, 3=toutes |
| Correlation | Mise en relation des attributs identiques entre événements (clustering d'attaques) |
| PyMISP | Bibliothèque Python pour piloter l'API MISP |

---

## Installation

Deux voies : Docker Compose officiel (recommandée) ou installation classique LAMP :

```bash
# Docker Compose (lab fonctionnel en quelques minutes)
git clone https://github.com/MISP/MISP.git /var/www/MISP
curl -O https://raw.githubusercontent.com/MISP/misp-docker/main/docker-compose.yml
docker compose up -d

# Installation classique (Debian) : script d'installation
# https://misp.github.io/MISP/INSTALL.ubuntu2404/
```

```bash
# Alternative : ansible (déploiement industrialisé)
git clone https://github.com/MISP/misp-ansible.git && cd misp-ansible
ansible-playbook -i inventory.yml playbooks/site.yml
```

Première connexion : `https://<ip>/users/login` avec les identifiants par défaut fournis par le déploiement Docker ; changer immédiatement le mot de passe et configurer le nom de l'organisation.

> [!warning] Prérequis & problèmes potentiels
> - Changer les identifiants par défaut et la clé de chiffrement (`encryption_key`) dès la première connexion.
> - Activer HTTPS (reverse proxy ou TLS natif) avant toute synchronisation.
> - Les modules MISP (enrichissement) nécessitent un service externe `misp-modules` à déployer séparément.

---

## Configuration

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `MISP.baseurl` | URL publique de l'instance | URL HTTPS | Synchronisation, liens | `https://misp.example.com` |
| `MISP.external_baseurl` | URL vue de l'extérieur | URL | Contexte des feeds | `https://misp.example.com` |
| `MISP.default_event_distribution` | Distribution par défaut | 0-3 | Confidentialité des partages | `1` (communauté) |
| `MISP.default_threat_level` | Niveau de menace par défaut | 1-4 | Priorisation | `4` (undefined) |
| `MISP.host_org_id` | Organisation hôte | ID | Propriété des événements | ID de l'orga |
| `Security.authkey_rotate` | Rotation des clés API | activé/désactivé | Hygiène des accès | activé |
| `Plugin.Enrichment_*` | Modules d'enrichissement | liste | Enrichissement automatique | `expand_on_publish` |
| `MISP.attachments_dir` | Dossier des pièces jointes | chemin | Stockage | `/var/www/MISP/app/files` |
| `Warninglists` | Listes à activer | liste de warninglists | Réduction des faux positifs | `generic`, `cidr`, `dns` |

> [!note] À vérifier
> La configuration se fait via l'UI (Administration → Server Settings) et le fichier `config.php` ; chaque version évolue : se référer au MISP Book officiel pour la version installée.

---

## Architecture interne

Composants et flux à l'exécution :

- **Serveur web PHP (CakePHP)** : application principale exposant l'UI et l'API REST ; base MySQL/MariaDB pour les événements, attributs, utilisateurs.
- **Modèle de données** : Event → Attribute/Object ; chaque entité porte distribution, tags, galaxy, timestamps.
- **API REST** : endpoints `/events`, `/attributes`, `/objects`, `/events/restSearch`, `/attributes/restSearch`, `/galaxies` ; authentification par clé API (`Authorization` header).
- **Moteur de corrélation** : indexe les attributs pour relier les événements partageant les mêmes IoC.
- **Feeds & synchronisation** : import/export périodique (cron) de flux (CSV/JSON/MISP) et échanges serveur-à-serveur avec signatures.
- **Galaxies & taxonomies** : bases de données versionnées (`misp-galaxy`, `misp-taxonomies`, `misp-warninglists`) chargées localement.
- **Modules MISP** : service Python annexe pour enrichissement (expansion, export, import) appelé au moment de la publication.

Flux type : un analyste (ou un script) crée un événement → ajoute des attributs (IoC) → tagge avec une galaxie ATT&CK → publication → corrélation + export vers feeds/sync → ingestion par le SIEM pour détection.

---

## Commandes

### Commandes principales

```bash
# API REST : créer un événement puis ajouter des attributs
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://localhost/events \
     -d '{"Event":{"info":"INC-2026-042 C2","threat_level_id":"2","distribution":"1"}}'

# Ajouter un attribut (IoC) à l'événement créé
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://localhost/attributes \
     -d '{"Attribute":{"event_id":"<EVENT_ID>","category":"Network activity","type":"ip-dst","value":"1.2.3.4"}}'

# Recherche filtrée par tag (pour alimenter le SIEM)
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://localhost/events/restSearch" -d '{"tags":["ATT&CK:command-and-control"]}'
```

| Action / Commande | Effet |
|---|---|
| `Events → Add Event` | Crée un événement (titre, niveau de menace, distribution) |
| `Add Attribute` | Ajoute un IoC : IP, domaine, hash (md5/sha1/sha256), filename, email |
| `Galaxy` / `Taxonomies` | Tagge l'événement avec MITRE ATT&CK, malwares, ransomware |
| `Feeds` (menu) | Active les flux CSV/MISP externes (CIRCL, Botvrij) à importer |
| `Sync Actions` | Configure la synchronisation entre instances MISP partenaires |
| `Warninglists` | Importe les listes de fausses alertes (IP publiques, domaines légitimes) |
| API `POST /events` | Crée un événement par script |
| API `POST /attributes` | Ajoute un attribut par script |
| API `GET /attributes` | Interroge les IoC en JSON pour alimenter le SIEM ou des scripts |
| API `GET /events/restSearch` | Recherche par filtre (tag, orgc, date) pour extraire des indicateurs |

### Commandes avancées

```bash
# Recherche d'attributs par type et valeur
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/attributes/restSearch" -d '{"type":"ip-src","value":"203.0.113.0/24"}'

# Lister les galaxies disponibles
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     https://misp.local/galaxies | jq -r '.Galaxy[].name' | sort | head
```

```python
# Python (PyMISP) — récupérer les derniers événements
from pymisp import ExpandedPyMISP
misp = ExpandedPyMISP("https://misp.local", "AUTHKEY", False)
for e in misp.search_events(limit=5):
    print(e.get("info"), e.get("threat_level_id"))
```

---

## Options et flags

| Paramètre | Description | Exemple | Niveau |
|---|---|---|---|
| `threat_level_id` | Niveau de menace (1-4) | `2` (moyen) | Basic |
| `distribution` | Niveau de partage (0-3) | `1` (communauté) | Basic |
| `type` (attribut) | Type d'IoC | `ip-dst`, `domain`, `sha256` | Basic |
| `category` (attribut) | Catégorie de l'attribut | `Network activity`, `Artifacts dropped` | Basic |
| `tags` (restSearch) | Filtre par tag | `["TLP:GREEN"]` | Intermediate |
| `org` / `orgc` (restSearch) | Filtre par organisation | `["CIRCL"]` | Intermediate |
| `timestamp` (restSearch) | Filtre temporel | `1690000000` | Advanced |
| `to_ids` | Attribut à inclure dans les signatures IDS | `1` / `0` | Intermediate |
| `published` | Événement publié uniquement | `1` | Basic |
| `withAttachments` | Inclure les pièces jointes | `1` | Advanced |
| `enforceWarninglist` | Filtrer les warninglists | `1` | Expert |

> [!tip] Options les plus utiles au quotidien
> `distribution` et `threat_level_id` à la création, `to_ids` pour ne publier que les IoC exploitables par les IDS, `restSearch` avec `tags`/`type` pour alimenter le SIEM, et `enforceWarninglist` pour limiter les faux positifs.

---

## Exemples pratiques

### Beginner

```bash
# Objectif : créer un événement simple via l'UI ou l'API
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://misp.local/events \
     -d '{"Event":{"info":"Phishing campagne Q2","threat_level_id":"3","distribution":"1"}}'
```

### Intermediate

```bash
# Objectif : ajouter les IoC d'un rapport (hash + domaine)
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://misp.local/attributes \
     -d '{"Attribute":{"event_id":"<ID>","category":"Payload delivery","type":"sha256","value":"d41d8cd98f00b204e9800998ecf8427e"}}'
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://misp.local/attributes \
     -d '{"Attribute":{"event_id":"<ID>","category":"Network activity","type":"domain","value":"malware.example.com"}}'
```

### Advanced

```bash
# Objectif : exporter les domaines C2 du dernier mois pour la liste de blocage
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/events/restSearch" \
     -d '{"tags":["ATT&CK:command-and-control"],"type":["domain"]}' \
     | jq -r '.response[].Event.Attribute[].value' | sort -u
```

### Expert

```python
# Python (PyMISP) — publier un événement avec objet structuré
from pymisp import ExpandedPyMISP, MISPEvent, MISPObject

misp = ExpandedPyMISP("https://misp.local", "AUTHKEY", False)
event = MISPEvent()
event.info = "INC-2026-042 - C2 réseau"
event.distribution = 1
obj = MISPObject("domain-ip")
obj.add_attribute("domain", value="malware.example.com")
obj.add_attribute("ip", value="203.0.113.66")
event.add_object(obj)
misp.add_event(event, pythonify=True)
```

---

## Workflow complet (scénario pas à pas)

1. Activer un feed : menu `Sync Actions → Feeds` → activer le feed `CIRCL` (événements partagés) et lancer `Fetch all feed events`.
2. Créer un événement d'incident : `Add Event` → info `INC-2026-042 - Emotet via malspam`, distribution `Community only`.
3. Ajouter les IoC du rapport : IP du C2, hash du binaire (issue de l'analyse Volatility/YARA), domaine d'exfiltration.
4. Taguer : `Galaxy → MITRE ATT&CK → command-and-control` (TA0011) + galaxie `emotet`.
5. Exporter pour le SIEM : API `restSearch` filtrée sur `attack:command-and-control` → alimenter la liste de blocage (firewall/EDR) ou le pipeline Sigma.
6. Synchroniser : configurer un nœud partenaire (ex. CERT) pour recevoir ses événements et lui partager le vôtre (relations de confiance).
7. Consulter la corrélation : l'onglet de l'événement montre les attributs communs avec d'autres événements (même hash, même IP) → cluster d'attaques.

---

## Scénarios avancés

### Scénario 1 : Remontée automatique d'IoC depuis un honeypot

```bash
# Script : pousser l'IP attaquante captée par Cowrie dans MISP
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://misp.local/events \
     -d '{"Event":{"info":"Honeypot Cowrie - brute force SSH","threat_level_id":"2","distribution":"1"}}'
# puis ajouter l'attribut ip-src avec la valeur capturée
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://misp.local/attributes \
     -d '{"Attribute":{"event_id":"<EVENT_ID>","category":"Network activity","type":"ip-src","value":"<IP_ATTAQUANTE>"}}'
```

Automatisable en cron ou en post-traitement de la sortie du honeypot.

### Scénario 2 : Corrélation d'incident avec le SIEM

```bash
# Extraire tous les domaines C2 du dernier mois pour la liste de blocage
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/events/restSearch" -d '{"tags":["ATT&CK:command-and-control"],"type":["domain"]}' \
     | jq -r '.response[].Event.Attribute[].value' | sort -u
# Pipeline Sigma -> corrélation des règles sur le SIEM à partir des attributs MISP
```

### Scénario 3 : Chasse d'attaques liées via la corrélation

```bash
# Chercher tous les événements contenant le même hash de malware
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/attributes/restSearch" \
     -d '{"type":"sha256","value":"d41d8cd98f00b204e9800998ecf8427e"}'
# MISP renvoie tous les événements partageant ce hash → regroupement par acteur
```

### Scénario 4 : Blocage automatique des IoC frais dans le SIEM

```bash
# Script de synchronisation MISP → SIEM (cron quotidien)
# 1. Extraire les IP/domaines vus ces 24 h
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/events/restSearch" -d '{"to_ids":true,"timestamp":"<now-86400>"}' \
     | jq -r '.response[].Event.Attribute[] | select(.type=="ip-dst") | .value' | sort -u > /tmp/ioc.txt
# 2. Ingest dans le firewall / la liste de blocage SIEM (ex. recherche type lookup)
```

---

## Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Threat intel | Centraliser et structurer les IoC (IP, hash, domaines, emails) |
| Partage | Synchroniser les événements entre organisations (CERT, pairs) |
| Détection | Alimenter SIEM/IDS avec les IoC `to_ids` (blocs, corrélation) |
| Chasse | Corrélation par attributs communs (clustering d'attaques) |
| Enrichissement | Modules (expansion) : réputation, WHOIS, VirusTotal via modules MISP |
| Opération | Feeds actifs (CIRCL, Botvrij, URLhaus) + warninglists pour limiter le bruit |

---

## MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Command and Control | Application Layer Protocol: Web Protocols | T1071.001 | Les domaines/IP C2 sont les IoC les plus partagés | IoC `ip-dst`/`domain` en SIEM/IDS | Egress filtering |
| Initial Access | Phishing | T1566 | Campagnes de phishing documentées en événements | Attributs email/url + galaxies | Filtrage mail, sensibilisation |
| Resource Development | Obtain Capabilities: Malware | T1588.001 | Hash de malwares et outils distribués | Hashs `to_ids` en EDR/AV | Sandbox, analyse |
| Exfiltration | Exfiltration Over Web Service | T1567 | Domaines de rapatriement/exfil en IoC | Domaines en blocage DNS | DLP, quotas |
| Persistence | Valid Accounts | T1078 | Compromission de comptes corrélée aux événements | Corrélation attributs user | MFA, monitoring |
| Reconnaissance | Gather Victim Org Information | T1591 | Profilage des victimes visibles dans les événements | Corrélation org/objectifs | Partage restreint |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> MISP est une **plateforme de partage** : les mappings décrivent les attaques dont elle distribue les IoC, pas des capacités offensives propres.

---

## Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Pics de requêtes API MISP non autorisées | Restreindre l'API par IP/clé, supervision des logs d'accès |
| Exfiltration d'événements (confidentialité) | Contrôler les distributions (`distribution` 0-3), audit des exports |
| Instance exposée à Internet | Accès restreint (VPN/SSO), MFA sur les comptes admin |
| Feeds non modérés introduisant du bruit | Import en mode « proposé », revue manuelle avant passage en automatique |
| IoC périmés dans les blocs SIEM | Purge des attributs non revus, suivi `first_seen`/`last_seen` |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma — détection de connexions vers des IP/domaines issus de MISP (IoC lookup)
title: Connection to MISP Flagged IoC
id: d0e1f2a3-4b5c-4d6e-7f8a-9b0c1d2e3f4a
status: experimental
logsource:
    category: network_connection
    product: windows
detection:
    selection:
        DestinationIp|in:
            # à remplir par la liste extraite de MISP (ip-dst)
            - '203.0.113.66'
        DestinationHostname|in:
            - 'malware.example.com'
    condition: selection
falsepositives:
    - IoC partagés mais non malveillants (à filtrer via warninglists)
level: medium
```

```text
# Règle Suricata — blocage/alerte sur un domaine issu de MISP
alert dns any any -> any any (msg:"MISP IoC - C2 domain";
  dns.query; content:"malware.example.com"; nocase; sid:3000001; rev:1;)
```

---

## Automatisation

```bash
# Bash — cron : push des IP du honeypot Cowrie vers MISP
for ip in $(grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" /var/log/cowrie/cowrie.json | sort -u); do
  curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
       -X POST https://misp.local/attributes \
       -d "{\"Attribute\":{\"event_id\":\"<ID>\",\"category\":\"Network activity\",\"type\":\"ip-src\",\"value\":\"$ip\"}}"
done
```

```python
# Python (PyMISP) — export quotidien des IoC pour le firewall
from pymisp import ExpandedPyMISP

misp = ExpandedPyMISP("https://misp.local", "AUTHKEY", False)
iocs = misp.search_attributes(type_attribute="domain", to_ids=True)
with open("/tmp/ioc_domains.txt", "w") as f:
    for a in iocs:
        f.write(a.value + "\n")
```

---

## Output et parsing

L'API renvoie du **JSON** : `response[]` contient les `Event` avec leurs `Attribute[]` (champs `value`, `type`, `category`, `to_ids`, `timestamp`). Les exports peuvent aussi être produits en CSV, MISP XML, STIX, OpenIOC.

```bash
# Extraire les IP source des événements de la semaine
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/events/restSearch" -d '{"type":["ip-src"]}' \
     | jq -r '.response[].Event.Attribute[] | .value' | sort -u

# Compter les IoC par type
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/attributes/restSearch" \
     | jq -r '.response[].Attribute.type' | sort | uniq -c | sort -rn | head
```

```python
# Python — parser les résultats d'une recherche
import json, requests

r = requests.post("https://misp.local/events/restSearch",
                  headers={"Authorization": "AUTHKEY", "Accept": "application/json"},
                  data='{"tags":["TLP:GREEN"]}', verify=False)
for ev in r.json().get("response", []):
    print(ev["Event"]["info"], len(ev["Event"]["Attribute"]), "attributs")
```

---

## Intégrations

```text
MISP (API restSearch) → SIEM (Elastic/Splunk/Graylog) → liste de blocage
MISP ← honeypots (Cowrie, Canarytokens) → événements automatiques
MISP ← sandbox / analyse YARA / Volatility → hash et artefacts
MISP ↔ OpenCTI (synchronisation de threat intel structurée)
MISP ↔ TheHive / Cortex → cas d'incident et enrichissement
MISP → IDS/EDR (IoC to_ids) → règles Suricata/Snort, blocs DNS
```

- [[Tools| Outils]]
- [[Outils/Outil - OpenCTI| OpenCTI]] — plateforme STIX complémentaire (synchronisation)
- [[Outils/Outil - YARA| YARA]] — hash/signatures issus des analyses croisés avec les IoC
- [[Outil - Cowrie]] — honeypot SSH alimentant MISP en IP attaquantes
- [[Outil - Canarytokens]] — canary triggers remontant des incidents dans MISP
- [[Outil - Elastic]] — ingestion des IoC MISP pour corrélation
- [[Outil - Suricata]] — règles générées à partir des attributs `to_ids`
- [[Outil - Velociraptor]] — collecte de preuves dont les artefacts sont tagués dans MISP

---

## Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| MISP | Partage multi-orga, galaxies, API riche | Courbe d'apprentissage, lourd à administrer | SOC/CERT collaboratif |
| OpenCTI | Modèle STIX 2.1, graph de connaissances | Moins orienté partage inter-orga | Analyse et visualisation |
| ThreatConnect / Anomali | Commercial, intégrations | Coût, fermé | Entreprise |
| Abuse.ch (URLhaus, Feodo) | Gratuits, ciblés | Pas de plateforme | Feeds spécialisés |
| CSV maison / ThreatBook | Simple | Pas de corrélation/partage | Petit SOC sans infrastructure |

> **Quand utiliser MISP plutôt qu'un autre ?** Dès qu'il y a **partage entre organisations** (CERT, partenaires) ou besoin de **corrélation par attributs** : MISP est la référence open source pour structurer et diffuser la threat intel.

---

## Performance

- **Corrélation** : le moteur indexe chaque attribut ; sur les grosses instances, désactiver la corrélation sur les types peu discriminants (emails, filename) pour limiter la charge.
- **Feeds** : l'import massif de feeds peut saturer CPU/MySQL : planifier les fetches (cron) et importer par lots.
- **API** : les requêtes `restSearch` non filtrées sont coûteuses : toujours filtrer par `timestamp`, `type`, `org`.
- **MySQL** : la base grossit vite (millions d'attributs) : indexer, purger les événements vides, prévoir des sauvegardes quotidiennes.
- **Attachments** : stockage disque pour pièces jointes et exports ; dimensionner `attachments_dir`.

> [!note] À vérifier
> Les chiffres dépendent du volume (événements/attributs) et du matériel : surveiller les logs et l'usage MySQL, purger régulièrement les données obsolètes.

---

## Troubleshooting

### Common problems

#### Problème : l'API répond `401 Unauthorized`

- **Cause** : clé API invalide ou rotation activée sans mise à jour du script.
- **Solution** : régénérer la clé (User → Auth Keys), mettre à jour les scripts.
- **Vérification** : `curl -k -H "Authorization: <clé>" https://misp.local/users/me`.

#### Problème : la synchronisation entre instances échoue

- **Cause** : TLS/HTTPS non activé, relations de confiance non établies, versions incompatibles.
- **Solution** : vérifier la baseurl, établir la relation Sync (serveur/serveur), mettre les instances à jour.
- **Vérification** : `Sync Actions → List Servers → test connection`.

#### Problème : les feeds ne s'importent pas

- **Cause** : réseau bloqué, format invalide, permissions du dossier des feeds.
- **Solution** : tester l'URL du feed, vérifier les permissions, forcer `Fetch all feed events`.
- **Vérification** : logs du job (Administration → Jobs).

#### Problème : trop de faux positifs dans le SIEM

- **Cause** : warninglists désactivées ou IoC non `to_ids` non filtrés.
- **Solution** : activer les warninglists, utiliser `enforceWarninglist`, n'exporter que `to_ids: true`.
- **Vérification** : `restSearch` avec `enforceWarninglist: true`.

#### Problème : la corrélation ralentit la recherche

- **Cause** : corrélation activée sur tous les types, base non indexée.
- **Solution** : restreindre la corrélation aux types discriminants, optimiser MySQL.
- **Vérification** : `SHOW PROCESSLIST` / monitoring de la base.

---

## Sécurité de l'outil

- **Accès** : UI et API protégées par comptes/MFA ; clés API par service avec privilèges minimaux et rotation.
- **Chiffrement** : HTTPS obligatoire (reverse proxy) ; base MySQL et sauvegardes chiffrées.
- **Confidentialité** : la distribution (0-3) contrôle le partage : ne jamais mettre d'infrastructure interne ou de données personnelles dans un événement partagé.
- **Intégrité** : les synchronisations et feeds signés (PGP) ; vérifier les origines des événements importés.
- **Exposition** : accès restreint (VPN/SSO), supervision des logs d'accès, alerte sur les pics d'API.
- **Modules** : les modules d'enrichissement exécutent du code sur des données externes : les déployer isolés et vérifier les sources.

---

## Limitations

- **Pas un SIEM** : MISP partage des IoC, ne fait pas de corrélation temps réel sur les logs.
- **Qualité des données** : la valeur dépend de la rigueur des contributeurs (IoC périmés, mal tagués).
- **Volume** : la corrélation et l'indexation pèsent sur MySQL à grande échelle.
- **Apprentissage** : concepts (events, attributs, distribution, galaxies) et API demandent de la formation.
- **Faux positifs** : sans warninglists et `to_ids` maîtrisés, les blocs génèrent du bruit.
- **Administration** : mises à jour fréquentes (dont sécurité), maintenance MySQL, gestion des modules.

---

## Cheatsheet

```bash
# Créer un événement
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://misp.local/events \
     -d '{"Event":{"info":"Mon incident","threat_level_id":"2","distribution":"1"}}'

# Ajouter un attribut
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     -X POST https://misp.local/attributes \
     -d '{"Attribute":{"event_id":"<ID>","category":"Network activity","type":"ip-dst","value":"1.2.3.4"}}'

# Rechercher (restSearch)
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/events/restSearch" -d '{"tags":["ATT&CK:command-and-control"]}'

# Vérifier sa clé
curl -k -H "Authorization: <authkey>" https://misp.local/users/me

# Exporter les domaines C2
curl -k -H "Authorization: <authkey>" -H "Accept: application/json" \
     "https://misp.local/events/restSearch" -d '{"tags":["ATT&CK:command-and-control"],"type":["domain"]}' \
     | jq -r '.response[].Event.Attribute[].value' | sort -u
```

---

## Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Plateforme de partage de threat intel : centraliser, corréler, enrichir et diffuser les IoC |
| **Quand l'utiliser ?** | SOC/CERT, partage avec partenaires, alimentation SIEM/IDS, chasse d'attaques liées |
| **Commande principale** | API `POST /events` + `POST /attributes` ; recherche via `/events/restSearch` |
| **Alternative principale** | OpenCTI, ThreatConnect, Abuse.ch (feeds) |
| **Concepts importants** | Event, Attribute, Galaxy, Taxonomy, Warninglist, Feed, Synchronisation, Distribution |
| **Liens associés** | [[Outils/Outil - OpenCTI| OpenCTI]] · [[Outils/Outil - YARA| YARA]] |

---

## Détection & Défense

| Signe | Défense |
|---|---|
| IoC MISP apparaissant dans les logs SIEM | Corrélation automatique → escalade d'incident |
| IP attaquante détectée par un honeypot | Push automatique dans MISP → blocage proactif |
| Événement partagé avec d'autres orga | Blocage coordonné, alerte partenaires |
| IoC périmés toujours dans les blocs | Suivi `first_seen`/`last_seen`, purge |
| Instance MISP sondée depuis Internet | VPN/SSO, MFA, supervision des accès |

---

## Tips & Pièges

> [!tip] Activez la **corrélation** par défaut et utilisez `restSearch` avec le filtre `tag`: vous transformez MISP en moteur de recherche d'attaques liées (mêmes acteurs, mêmes outils).

> [!warning] Un événement partagé en `distribution: 3` devient visible de toutes les organisations connectées : ne jamais y mettre d'infrastructure interne ou d'informations personnelles.

> [!tip] Renseignez `first_seen`/`last_seen` sur les attributs : les IoC expirés (plus vus depuis des mois) doivent être retirés ou marqués, sinon ils génèrent des alertes mortes.

> [!warning] L'import de feeds non modérés introduit du bruit : activez-les en mode « proposé » (import manuel) avant de passer en automatique, et surveillez les doublons entre feeds.

> [!warning] **Piège** : une clé API compromis = accès à tous les événements.
> Stockez les clés dans un coffre, limitez par service, activez la rotation (`Security.authkey_rotate`).

---

## References

### Official

- MISP — site officiel : https://www.misp-project.org/
- Dépôt GitHub MISP : https://github.com/MISP/MISP
- Documentation MISP Book : https://misp.github.io/MISP/
- PyMISP : https://github.com/MISP/PyMISP
- Docker MISP : https://github.com/MISP/misp-docker

### Security references

- MITRE ATT&CK T1071.001 — Web Protocols : https://attack.mitre.org/techniques/T1071/001/
- MITRE ATT&CK T1566 — Phishing : https://attack.mitre.org/techniques/T1566/
- MITRE ATT&CK T1588.001 — Malware : https://attack.mitre.org/techniques/T1588/001/

### Community

- MISP galaxies : https://github.com/MISP/misp-galaxy
- MISP taxonomies : https://github.com/MISP/misp-taxonomies
- MISP warninglists : https://github.com/MISP/misp-warninglists
- Abuse.ch feeds (URLhaus, Feodo) : https://abuse.ch

---

**Liens :** [[Tools| Outils]] · [[Outils/Outil - OpenCTI| OpenCTI]] · [[Outils/Outil - YARA| YARA]] · [[Techniques/09 - Reverse Engineering & Malware| Reverse Engineering & Malware]]
