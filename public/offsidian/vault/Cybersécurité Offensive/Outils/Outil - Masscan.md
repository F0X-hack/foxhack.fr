---
title: "Outil - Masscan"
type: outil
categorie: 🕵️ Reconnaissance & OSINT
tags:
  - cyber
  - outil
  - 🕵️ Reconnaissance & OSINT
statut: publie
version: 1.3.2
licence: AGPL-3.0
langage: C
developpeur: Robert David Graham (robertdavidgraham)
repo: https://github.com/robertdavidgraham/masscan
site: https://github.com/robertdavidgraham/masscan
doc: https://github.com/robertdavidgraham/masscan/blob/master/README.md
---


# 🕵️ Masscan — Scan de ports ultrarapide, complément de Nmap

> [!info] **En 1 phrase**
> Masscan est le scanner de ports le plus rapide au monde : jusqu'à 10 millions de ports/s en parallèle, idéal pour cartographier un grand réseau en quelques secondes.

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | masscan (Massive network scanner) |
| Description | Scanner de ports asynchrone à très haut débit : balayage SYN de larges plages IP (jusqu'à un `/8` complet), export compatible Nmap pour l'analyse fine |
| Catégorie | Reconnaissance & OSINT |
| Sous-catégorie | Scan de ports / découverte de surface réseau |
| Fonction principale | Découvrir rapidement les ports ouverts sur de grands périmètres |
| Type d'outil | CLI |
| Licence | AGPL-3.0 |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | C |
| Développeur / organisation | Robert David Graham |
| Projet officiel | robertdavidgraham/masscan |
| Dépôt officiel | https://github.com/robertdavidgraham/masscan |
| Documentation officielle | https://github.com/robertdavidgraham/masscan/blob/master/README.md |
| Date de création | 2013 (premier commit du dépôt) |
| État du projet | actif (maintenance) |
| Dernière version connue | 1.3.2 (2021-01-31) |
| Systèmes compatibles | Linux, BSD ; pas de build Windows officiel maintenu (portage expérimental) |

> [!note] Pour vérifier / compléter
> La dernière release est 1.3.2 (janvier 2021). Le débit maximum annoncé (10 M ports/s) n'est atteint que sur du matériel spécifique (carte 10 Gbit/s) ; en pratique le débit dépend du réseau et du matériel.

---

## 🎯 Concept

Masscan repose sur le même moteur de scan SYN que Nmap, mais avec une architecture **asynchrone** qui permet d'atteindre des débits énormes. Il est conçu pour scanner de **larges plages** (un `/8` entier à 10 M ports/s) plutôt que pour l'énumération fine. On l'utilise pour découvrir rapidement tous les ports ouverts d'un périmètre, puis on exporte le résultat vers Nmap pour l'analyse détaillée (versions, scripts NSE).

Dans le cycle de pentest, Masscan se place en **première passe de découverte** : il répond à la question « quels hôtes ont quels ports ouverts ? » en quelques secondes sur des périmètres entiers. Il est moins adapté aux cibles uniques (Nmap y est plus riche) et surtout **détectable** : un rate élevé ressemble à un SYN flood et déclenche les IDS/IPS.

En pratique, on retient le schéma « **Masscan large + Nmap fin** » : la découverte se fait en SYN à haut débit, puis l'énumération des hôtes intéressants est confiée à Nmap. La sortie `-oL` est volontairement compatible avec les outils de la famille Nmap, ce qui facilite l'enchaînement des deux outils dans un même pipeline.

```mermaid
flowchart LR
    A["Plage à scanner -p 1-65535"] --> B["Masscan --rate 1000 à 10M"]
    B --> C["Ports ouverts détectés"]
    C --> D["Export nmap -oL / -oJ / -oG"]
    D --> E["Nmap -sV -sC sur les ports trouvés"]
```

---

## 🧠 Concepts fondamentaux

| Concept | Explication |
|---|---|
| Scan SYN | Découverte de ports ouverts par envoi de SYN (pas d'établissement de connexion) : très rapide |
| Architecture asynchrone | Envoi et réception de paquets sans attendre les réponses : des millions de paquets/s |
| Rate (`--rate`) | Nombre de paquets par seconde : le réglage central (1000 p/s en lab, 100 000+ sur grand périmètre) |
| SYN flood / détection | Un rate élevé ressemble à un SYN flood : détectable par les IDS/IPS |
| `-oL` compatible Nmap | Format de sortie « list » attendu par les scripts de la famille Nmap |
| Usurpation d'adresse source | Masscan peut envoyer avec une IP/port source arbitraire (`--adapter-ip`/`--adapter-port`) |
| Ping sweep | Découverte d'hôtes vivants par ICMP seul (`--ping-sweep`) |

---

## 🛠️ Installation

### Debian / Ubuntu / Kali Linux

```bash
sudo apt install masscan
# Vérification
masscan --version
```

### Arch Linux

```bash
# AUR
yay -S masscan
```

### Fedora / RHEL

```bash
sudo dnf install masscan
```

### macOS

```bash
# Via Homebrew
brew install masscan
```

### Windows

```powershell
# Pas de build Windows officiel maintenu (portage expérimental).
# Utiliser WSL :
wsl --install
wsl sudo apt install masscan
```

### Docker

```bash
# Images communautaires (ex. via Docker Hub) ; usage avec --net=host pour le scan
docker run --rm --network=host example/masscan 10.10.10.0/24 -p80 --rate 1000
```

### Compilation depuis les sources

```bash
git clone https://github.com/robertdavidgraham/masscan.git && cd masscan
make -j && sudo make install
```

> [!warning] ⚠️ Prérequis & problèmes potentiels
> - Les scans SYN nécessitent les privilèges root (`sudo masscan …`).
> - Binaire Linux/BSD : pas de build Windows officiel maintenu (portage expérimental). Pour Windows, passer par WSL.
> - Le scan UDP est lent : les ports fermés ne répondent pas toujours, les résultats sont partiels.

---

## ⚙️ Configuration

Pas de fichier de configuration : tout passe par les options CLI.

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `--rate <n>` | Paquets/seconde | entier | Vitesse vs pertes de paquets / détection | `--rate 10000` |
| `--interface <dev>` | Interface réseau | nom | Interface utilisée pour l'envoi | `--interface eth0` |
| `--adapter-ip <ip>` | IP source | adresse | Adresse source (usurpation possible) | `--adapter-ip 10.0.0.5` |
| `--adapter-port <port>` | Port source | entier | Port source des paquets | `--adapter-port 31337` |
| `--router-mac <mac>` | MAC du routeur | adresse MAC | Parfois nécessaire (ARP) | `--router-mac 00:11:22:33:44:55` |
| `--retries <n>` | Retransmissions | entier | Fiabilité à haut rate | `--retries 2` |
| `--wait <s>` | Délai de fin | entier | Temps d'attente avant de quitter | `--wait 5` |
| `--exclude <ip>` | Exclusion | adresse/plage | Éviter honeypots et IP sensibles | `--exclude 10.0.0.1` |
| `--excludefile <f>` | Fichier d'exclusions | chemin | Listes d'exclusions | `--excludefile exclusions.txt` |
| `--randomize-hosts` | Mélanger les hôtes | booléen | Profil de scan moins détectable | `--randomize-hosts` |
| `-iL <f>` | Liste de cibles | chemin | Multi-cibles | `-iL targets.txt` |

---

## 🏗️ Architecture interne

- **Moteur SYN asynchrone** : envoi en continu de segments SYN sans attendre les réponses ; le récepteur capture les SYN-ACK (port ouvert) et RST (port fermé).
- **Stockage de résultats en mémoire** : réponses collectées puis écrites à la fin du scan dans le format demandé (`-oL/-oG/-oJ/-oX/-oB`).
- **Pile réseau customisée** : Masscan construit ses propres paquets IP/TCP (type `raw socket`) : possibilité d'usurper l'adresse source.
- **Format binaire `-oB`** : sauvegarde intermédiaire rejouable avec `--readscan` (reprise et conversion sans re-scanner).
- **Exclusions et ranges** : gestion des plages (`/8`, plages multiples) et des exclusions à la volée, sans re-calcul du plan de scan.

---

## ⌨️ Commandes

### Commandes principales

```bash
masscan [plages IP] [options] [-oL/-oG/-oJ/-oX/-oB sortie]
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `sudo masscan 10.10.10.10 -p0-65535 --rate 1000` | Tous les ports TCP d'une machine | Liste des ports ouverts |
| `sudo masscan 10.0.0.0/8 -p1-65535 --rate 10000 -oL masscan.txt` | Grand réseau en export Nmap | Fichier `-oL` |
| `sudo masscan 10.10.10.10 -pU:53,161 --rate 1000` | Scan UDP ciblé | Ports UDP qui répondent |
| `sudo masscan -iL targets.txt --top-ports 100 --rate 5000 -oJ scan.json` | Top ports multi-cibles JSON | Fichier JSON |
| `sudo masscan 10.0.0.0/8 --ping-sweep` | Découverte ICMP (ping sweep) | Hôtes vivants |
| `sudo masscan --readscan scan.bin -oJ scan.json` | Convertir un scan binaire | Conversion sans re-scan |

### Commandes avancées

```bash
# Bannières des services (équivalent d'un -sV léger)
sudo masscan 10.10.10.10 -p80,443 --banners --rate 5000
# Reprise d'un scan interrompu (offset)
sudo masscan --resume scan.bin
# Exclusions + randomisation sur un grand périmètre
sudo masscan 10.0.0.0/8 -p443 --rate 100000 --excludefile exclusions.txt --randomize-hosts -oL https_hosts.txt
```

---

## 🎚️ Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `-p <ports>` | Plage de ports | `-p1-65535` | Basic |
| `-p0-65535` | Tous les ports, y compris 0 | `-p0-65535` | Intermediate |
| `--rate <n>` | Paquets/seconde | `--rate 10000` | Basic |
| `--top-ports <n>` | Ports les plus courants | `--top-ports 100` | Intermediate |
| `-pU:<ports>` | Scan UDP | `-pU:53,161` | Intermediate |
| `--banners` | Récupérer les bannières | `--banners` | Intermediate |
| `--ping-sweep` | Scan ICMP seul | `--ping-sweep` | Intermediate |
| `-iL <f>` | Liste de cibles | `-iL targets.txt` | Basic |
| `--exclude <ip>` / `--excludefile <f>` | Exclusions | `--exclude 10.0.0.1` | Advanced |
| `--randomize-hosts` | Mélanger les hôtes | `--randomize-hosts` | Intermediate |
| `--interface <dev>` | Interface réseau | `--interface eth0` | Advanced |
| `--adapter-ip <ip>` / `--adapter-port <port>` | Adresse/port source | `--adapter-ip 10.0.0.5` | Expert |
| `--router-mac <mac>` | MAC du routeur | `--router-mac 00:11:22:33:44:55` | Advanced |
| `--retries <n>` | Retransmissions | `--retries 2` | Intermediate |
| `--wait <s>` | Délai de fin | `--wait 5` | Intermediate |
| `--resume <f>` | Reprendre un scan | `--resume scan.bin` | Advanced |
| `--readscan <f>` | Lire un scan binaire | `--readscan scan.bin` | Expert |
| `-oL <f>` | Sortie « list » (compatible Nmap) | `-oL out.txt` | Basic |
| `-oG <f>` | Format grepable | `-oG out.gnmap` | Intermediate |
| `-oJ <f>` | Sortie JSON | `-oJ out.json` | Intermediate |
| `-oX <f>` | Sortie XML (compatible Nmap) | `-oX out.xml` | Advanced |
| `-oB <f>` | Sortie binaire | `-oB out.bin` | Advanced |

> [!tip] Options les plus utiles au quotidien
> `--rate` (dosage), `-p1-65535`, `-oL` (export Nmap), `--exclude`/`--excludefile` (éviter les pièges), `--banners` (infos rapides), `-oB` + `--readscan` (reprise sans re-scanner).

---

## 🧪 Exemples pratiques

### Beginner

```bash
# Scan SYN rapide d'une machine : tous les ports TCP
sudo masscan 10.10.10.10 -p0-65535 --rate 1000
# Top ports
sudo masscan 10.10.10.10 --top-ports 100 --rate 1000
```

### Intermediate

```bash
# Grand réseau avec export compatible Nmap
sudo masscan 10.0.0.0/8 -p1-65535 --rate 10000 -oL masscan.txt
# Bannières sur les ports web
sudo masscan 10.10.10.10 -p80,443,8080 --banners --rate 5000
```

### Advanced

```bash
# Scan UDP ciblé
sudo masscan 10.10.10.10 -pU:53,161 --rate 1000
# Listes d'hôtes + exclusions
sudo masscan -iL targets.txt --top-ports 1000 --rate 50000 --excludefile exclusions.txt -oJ scan.json
```

### Expert

```bash
# Ping sweep ICMP seul
sudo masscan 10.0.0.0/8 --ping-sweep
# Reprise + conversion d'un scan binaire
sudo masscan --resume scan.bin
sudo masscan --readscan scan.bin -oJ scan.json
# Scan à très haut rate avec IP source distincte (lab uniquement)
sudo masscan 10.0.0.0/8 -p443 --rate 100000 --adapter-ip 10.0.0.5 --randomize-hosts -oL https_hosts.txt
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Préparation** : définir la cible et le rate adapté. Sur un lab `10.10.10.0/24`, un `--rate 10000` suffit.
2. **Scan global** :
   ```bash
   sudo masscan 10.10.10.0/24 -p1-65535 --rate 10000 -oL open_ports.txt
   ```
3. **Conversion vers Nmap** : extraire les IP:ports trouvés :
   ```bash
   cat open_ports.txt | awk '{print $4}' | sort -u > targets.txt
   ```
4. **Analyse fine avec Nmap** :
   ```bash
   sudo nmap -sC -sV -Pn -iL targets.txt -oA detail
   ```
5. **Vérification** : si un hôte semble « down » alors qu'un port était ouvert, re-tester à un `--rate` plus faible (500) pour limiter les pertes de paquets.

Le format `-oL` produit une ligne par hôte (`open tcp 443 10.10.10.10`) : c'est le format natif attendu par de nombreux scripts de la famille Nmap, ce qui évite tout reformatage manuel.

---

## 🎬 Scénarios avancés

### Scénario 1 : Scan d'un périmètre internet (/8) sans toucher aux IP sensibles

```bash
# Scan du port 443 sur 16M d'adresses en excluant les plages critiques
sudo masscan 10.0.0.0/8 -p443 --rate 100000 \
    --excludefile exclusions.txt -oL https_hosts.txt
# Exclusions : 10.0.0.1, 10.1.0.0/16, 10.255.255.255 (honeypots, production)
```

### Scénario 2 : Cartographie rapide d'un réseau d'entreprise avant engagement

```bash
# Top 1000 ports sur les 10 plages principales, en JSON pour le reporting
sudo masscan -iL plages.txt --top-ports 1000 --rate 50000 -oJ scan.json
# Extraire uniquement les hôtes avec un port web
cat scan.json | jq -r '.[] | select(.ports[].port == 443) | .ip'
```

### Scénario 3 : Bannières et découverte de services avant l'analyse fine

```bash
# Récupérer les bannières HTTP des hôtes vivants
sudo masscan -iL hosts.txt -p80,443,8080,8443 --banners --rate 10000 -oJ banners.json
# Identifier les versions exposées
cat banners.json | jq -r '.ip + ":" + (.ports[].port|tostring) + " " + (.ports[].service|tostring)'
```

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Reconnaissance | Découverte massive des ports ouverts d'un périmètre |
| Énumération | Balayage SYN rapide des plages entières avant analyse Nmap |
| Énumération | Ping sweep ICMP pour identifier les hôtes vivants |
| Cartographie | Inventaire de la surface exposée (ports web, services) pour le rapport |
| Tests d'intrusion | Chaîne « Masscan large → Nmap fin » pour un ciblage efficace |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Reconnaissance | Active Scanning : Scanning IP Blocks | T1595.001 | Balayage SYN massif de plages IP entières | Flux réseau (NetFlow/sFlow) : volume anormal de SYN, catégorisé « SYN flood » | Rate limiting, IDS/IPS, filtrage ingress (BCP38) |
| Discovery | Network Service Scanning | T1046 | Détection des services/ports ouverts | Rafales de RST/SYN-ACK observables | Réduire la surface exposée, firewall, segmentation |
| Discovery | Host Discovery | T1595.001 (ping sweep) | Découverte ICMP des hôtes vivants | Logs de ping/ICMP anormaux | Bloquer l'ICMP si non requis |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> Masscan relève principalement de T1595.001 (scan actif de blocs IP) et T1046 (découverte de services).

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Rate très élevé (inondation SYN sans ACK final) | Visible dans les flux (NetFlow, sFlow) : catégorisé en « SYN flood » par les IDS/IPS |
| Réponses RST en rafale à chaque SYN | Révèle les ports fermés : durcir les services exposés |
| Scans périodiques depuis une même IP | Rate limiting côté pare-feu, blocage des sources anormales |
| Usurpation d'adresse source possible | BCP38 (anti-spoofing), filtrage ingress/egress |
| Découverte de services exposés | Réduire la surface : firewall, segmentation, aucun service inutile en public |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma — Balayage réseau depuis un endpoint Linux
# (adaptation pédagogique de la règle SigmaHQ proc_creation_lnx_susp_network_utilities_execution)
title: Masscan Network Scan Execution
id: 3f7d5a9c-2e8b-4c1d-9a4e-6b2f8d0c7a31
status: test
logsource:
    category: process_creation
    product: linux
detection:
    selection:
        Image|endswith:
            - '/masscan'
        CommandLine|contains:
            - '--rate'
            - '-p0-65535'
            - '--exclude'
    condition: selection
falsepositives:
    - Legitimate authorized scanning
level: medium
```

```bash
# Suricata — SYN flood caractéristique d'un scan masscan
# (adaptation pédagogique ; ajuster seuil et fenêtre selon le trafic)
alert tcp any any -> any any (msg:"ET SCAN Potential Masscan SYN Sweep"; \
  flags:S; \
  threshold:type both, track by_src, count 1000, seconds 60; sid:2026008; rev:1;)
```

```yaml
# YARA — détection du binaire masscan
rule Masscan_Binary_Detection {
    meta:
        description = "Detection of masscan binary strings"
        author = "SOC"
    strings:
        $a = "masscan"
        $b = "robertdavidgraham"
        $c = "SYN"
    condition:
        any of them
}
```

> [!note] À vérifier
> Exemples pédagogiques : adapter les seuils, les sources de logs (NetFlow/sFlow, IDS, EDR) et les indicateurs à votre environnement.

---

## 🤖 Automatisation

```bash
# Bash — scan + conversion automatique vers Nmap
sudo masscan 10.10.10.0/24 -p1-65535 --rate 10000 -oL open_ports.txt
cat open_ports.txt | awk '{print $4}' | sort -u > targets.txt
sudo nmap -sC -sV -Pn -iL targets.txt -oA detail
```

```python
# Python — exécuter masscan et parser le JSON
import subprocess, json

def masscan(iprange, ports="1-65535", rate=10000):
    cmd = ["sudo", "masscan", iprange, "-p" + ports,
           "--rate", str(rate), "-oJ", "-", "--wait", "10"]
    out = subprocess.run(cmd, capture_output=True).stdout
    return json.loads(out)

res = masscan("10.10.10.0/24", "80,443", 5000)
for host in res:
    print(host["ip"], [p["port"] for p in host["ports"]])
```

```yaml
# cron — ré-inventaire hebdomadaire des ports exposés
0 5 * * 1  sudo masscan -iL /opt/recon/plages.txt --top-ports 1000 --rate 50000 -oJ /opt/recon/scan.json
```

---

## 📤 Output et parsing

Sorties : texte (`-oL`), grepable (`-oG`), JSON (`-oJ`), XML (`-oX`), binaire (`-oB`).

```bash
# Format -oL (compatible Nmap) : "open tcp 443 10.10.10.10"
sudo masscan 10.10.10.0/24 -p443 --rate 10000 -oL open_ports.txt
cat open_ports.txt | awk '{print $4}' | sort -u
# JSON → jq : hôtes avec le port 443
cat scan.json | jq -r '.[] | select(.ports[].port == 443) | .ip'
# Conversion d'un scan binaire sans re-scanner
sudo masscan --readscan scan.bin -oJ scan.json
```

```python
# Python — parsing JSON masscan
import json
with open("scan.json") as f:
    for host in json.load(f):
        for p in host["ports"]:
            print(host["ip"], p["port"], p.get("proto"))
```

---

## 🔗 Intégrations

- [[Tools|🧰 Outils]] global
- [[Outil - Nmap|Nmap]] — analyse fine (versions, scripts NSE) sur les ports trouvés par Masscan
- [[Outil - naabu|naabu]] — alternative projectdiscovery pour le scan de ports
- [[Outil - httpx|httpx]] — probing HTTP des ports web découverts
- [[Outil - nuclei|nuclei]] — scan de vulnérabilités sur les services exposés
- [[01 - Reconnaissance|🕵️ Reconnaissance]]

```text
Masscan (large) → Nmap -sV -sC (fin) → httpx → nuclei
```

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| [[Outil - Nmap|Nmap]] | Riche (versions, scripts NSE, OS detect) | Plus lent sur les grands périmètres | Analyse fine, cibles uniques |
| [[Outil - naabu|naabu]] | Rapide, intégré à projectdiscovery | Moins de formats/options réseau | Pipeline recon Go |
| `zmap` | Très haut débit, scan 1 port/paquet | Mono-port, moins de formats | Mesures internet, scan IPv4 entier |
| `unicornscan` | Asynchrone, ancien | Moins maintenu | Héritage |
| `rustscan` | Rapide, batch + nmap intégré | Moins flexible que masscan | Découverte rapide multi-ports |

> **Quand utiliser masscan plutôt que naabu ?** Pour les très grands périmètres (plages /8, taux >100k p/s) et l'export Nmap natif. naabu est plus adapté au pipeline projectdiscovery (intégration Go, sortie JSON simple).

---

## ⚡ Performance

- Débit revendiqué : jusqu'à 10 M ports/s sur du matériel spécifique (10 Gbit/s) ; en pratique le débit dépend du réseau.
- Un `--rate` trop élevé provoque des **pertes de paquets** : faux négatifs ; augmenter `--retries` ou re-scanner les ports trouvés.
- Le scan UDP est lent et incomplet (les ports fermés ne répondent pas toujours).
- Sur un réseau d'entreprise, un rate élevé = alertes SOC quasi certaines.

> [!note] À vérifier
> Aucun benchmark officiel récent n'est publié. Les chiffres de débit dépendent fortement du matériel (CPU, carte réseau) et du réseau.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : « failed to open network interface »

- **Cause** : interface réseau incorrecte ou droits root absents.
- **Solution** : lancer en `sudo` et préciser `--interface eth0` (nom exact via `ip a`).
- **Vérification** : `sudo masscan --interface eth0 10.10.10.10 -p80 --rate 1000`.

#### Problème : beaucoup de faux négatifs à haut rate

- **Cause** : pertes de paquets avec `--rate 100000`.
- **Solution** : baisser le rate ou augmenter `--retries` ; re-scanner les ports clés.
- **Vérification** : comparer avec un scan `--rate 500` sur les mêmes ports.

#### Problème : ARP / « router-mac » manquant

- **Cause** : le scan ne trouve pas la passerelle (MAC du routeur).
- **Solution** : fournir `--router-mac` (voir `ip neigh`).
- **Vérification** : `sudo masscan --router-mac 00:11:22:33:44:55 10.10.10.0/24 -p80`.

#### Problème : scan interrompu (contrôle-C, crash)

- **Cause** : interruption pendant un gros scan.
- **Solution** : relancer avec `--resume scan.bin` (format binaire).
- **Vérification** : `sudo masscan --resume scan.bin`.

#### Problème : Windows — aucun binaire officiel

- **Cause** : portage Windows non maintenu.
- **Solution** : utiliser WSL (Linux) pour exécuter masscan.
- **Vérification** : `wsl sudo masscan --version`.

---

## 🔐 Sécurité de l'outil

- **Détectabilité** : un rate élevé ressemble à un SYN flood et déclenche les IDS/IPS ; l'activité est clairement visible dans les flux réseau.
- **Usurpation possible** : `--adapter-ip`/`--adapter-port` permettent de falsifier la source (à réserver aux labos autorisés).
- **Permissions** : nécessite root pour les raw sockets.
- **Usage légal** : scanner des plages sans autorisation est illégal (ex. loi LPM 2321-1 en France). Uniquement des cibles autorisées.
- **Pas d'accès aux données** : scan de surface uniquement (SYN, bannières) — aucun contenu applicatif.

---

## ⚠️ Limitations

- Scan de surface : pas de détection fine de versions (équivalent `-sV`) ni de scripts NSE.
- Faux négatifs à haut rate (pertes de paquets) : résultats jamais exhaustifs.
- Scan UDP lent et partiel.
- Binaire Linux/BSD : pas de build Windows officiel maintenu.
- Très détectable : rate élevé = alertes IDS/IPS presque certaines.
- Le port 0 existe : `-p1-65535` ne le couvre pas (utiliser `-p0-65535`).

---

## 📋 Cheatsheet

```bash
# Scan SYN rapide d'une machine : tous les ports TCP
sudo masscan 10.10.10.10 -p0-65535 --rate 1000

# Grand réseau avec export compatible Nmap
sudo masscan 10.0.0.0/8 -p1-65535 --rate 10000 -oL masscan.txt

# Top ports + JSON
sudo masscan -iL targets.txt --top-ports 100 --rate 5000 -oJ scan.json

# Bannières
sudo masscan 10.10.10.10 -p80,443 --banners --rate 5000

# Ping sweep ICMP
sudo masscan 10.0.0.0/8 --ping-sweep

# Exclusions + randomisation
sudo masscan 10.0.0.0/8 -p443 --rate 100000 --excludefile exclusions.txt --randomize-hosts -oL https_hosts.txt

# Reprise / conversion
sudo masscan --resume scan.bin
sudo masscan --readscan scan.bin -oJ scan.json
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Balayage SYN ultrarapide de grands périmètres pour trouver les ports ouverts |
| **Quand l'utiliser ?** | Première passe de découverte, avant l'analyse fine Nmap |
| **Commande principale** | `sudo masscan 10.0.0.0/8 -p1-65535 --rate 10000 -oL out.txt` |
| **Alternative principale** | Nmap (fin), naabu (pipeline), zmap (très grand débit mono-port) |
| **Concepts importants** | Scan SYN, rate, exclusions, sortie `-oL` compatible Nmap, ping sweep |
| **Liens associés** | [[Outil - Nmap]] · [[Outil - naabu]] · [[Outil - httpx]] · [[Outil - nuclei]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Rate très élevé (inondation SYN sans ACK final) | Visible dans les flux (NetFlow, sFlow) : catégorisé en « SYN flood » par les IDS/IPS |
| Réponses RST en rafale à chaque SYN | Révèle les ports fermés : durcir les services exposés |
| Scans périodiques depuis une même IP | Rate limiting côté pare-feu, blocage des sources anormales |
| Usurpation d'adresse source possible | BCP38 (anti-spoofing), filtrage ingress/egress |
| Découverte de services exposés | Réduire la surface : firewall, segmentation, aucun service inutile en public |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Toujours exporter vers Nmap**
> Masscan ne fait pas la détection de versions complète : `-oL` + `awk` + `nmap -sV -sC` donne le meilleur des deux mondes.

> [!tip] 💡 **Ajuster `--rate` au contexte**
> 1000-5000 p/s sur un lab, 100 000+ sur un grand périmètre ; sur un réseau d'entreprise, un rate élevé = alertes SOC quasi certaines. Utilise `--randomize-hosts` pour lisser le profil de scan.

> [!warning] ⚠️ **Le port 0 existe**
> Par convention on écrit `-p1-65535`, mais certains services exotiques utilisent le port 0 : tester aussi `-p0-65535`.

> [!warning] ⚠️ **Faux négatifs à haut rate**
> Avec `--rate 100000`, des paquets se perdent : les résultats ne sont jamais exhaustifs. Re-scanner les ports clés trouvés (ou augmenter `--retries`).

> [!warning] ⚠️ **Ce n'est pas un outil d'énumération**
> Masscan est un balayage de surface : ne pas l'utiliser pour la détection fine de services ou les scripts NSE — réserver Nmap pour cela.

---

## 📚 References

### Official

- GitHub officiel — Masscan : https://github.com/robertdavidgraham/masscan
- Documentation du projet (README) : https://github.com/robertdavidgraham/masscan/blob/master/README.md

### Security references

- MITRE ATT&CK T1595 — Active Scanning : https://attack.mitre.org/techniques/T1595/
- MITRE ATT&CK T1046 — Network Service Discovery : https://attack.mitre.org/techniques/T1046/
- SigmaHQ — proc_creation_lnx_susp_network_utilities_execution : https://github.com/SigmaHQ/sigma/blob/master/rules/linux/process_creation/proc_creation_lnx_susp_network_utilities_execution.yml

### Community

- Discussion technique sur le blog de Robert David Graham : https://blog.erratasec.com
- Nmap documentation (en complément) : https://nmap.org/book/man.html

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Outil - Nmap|🕵️ Nmap]] · [[Outil - naabu|naabu]] · [[01 - Reconnaissance|🔎 Reconnaissance]]
