---
title: "Outil - Hping3"
type: outil
categorie: 🌐 Réseau & Capture
tags:
  - cyber
  - outil
  - reseau
  - scan
statut: publie
version: 3.a2.ds2 (paquet Debian, basé sur 3.0.0-alpha2)
licence: GPL-2.0
langage: C (scripting Tcl intégré)
developpeur: Salvatore Sanfilippo (antirez)
repo: https://github.com/antirez/hping
site: http://www.hping.org/
doc: http://www.hping.org/documentation.html
---

# 🏹 Hping3 — Le forgeron de paquets TCP/IP

> [!info] **En 1 phrase**
> hping3 assemble et envoie des paquets TCP/IP entièrement personnalisés (flags, adresses, ports, fragments) pour scanner, tester des pare-feu, déjouer des IDS et mesurer la réactivité d'un réseau.

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | hping3 (hping 3.0.0-alpha2, paquet Debian 3.a2.ds2) |
| Description | Assembleur/analyseur de paquets TCP/IP : envoi de paquets custom (SYN, FIN, fragments…), scans, tests de pare-feu, fingerprinting, floods |
| Catégorie | Réseau & Capture |
| Sous-catégorie | Forgerie de paquets / scan avancé |
| Fonction principale | Forger et envoyer des paquets TCP/UDP/ICMP/RAW avec contrôle complet des en-têtes |
| Type d'outil | CLI (plus scripting Tcl) |
| Licence | GPL-2.0 |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | C ; scripting via Tcl intégré |
| Développeur / organisation | Salvatore Sanfilippo (antirez) |
| Projet officiel | hping (site officiel) ; miroir GitHub antirez/hping |
| Dépôt officiel | https://github.com/antirez/hping |
| Documentation officielle | http://www.hping.org/documentation.html |
| Date de création | 1997 (hping2) ; hping3 ~2003 |
| État du projet | Peu actif : pas de release majeure récente, paquets Debian maintenus |
| Dernière version connue | 3.0.0-alpha2 (build Debian 3.a2.ds2) |
| Systèmes compatibles | Linux, BSD, macOS (compilable) |

> [!note] Pour vérifier / compléter
> hping3 n'est plus activement développé (le repo antirez/hping est en maintenance) ; sur Kali il reste préinstallé et fonctionnel. Le support Tcl varie selon la compilation. `hping3 -h` liste les options disponibles de la build locale.

---

## 🎯 Concept

hping3 est un **constructeur de paquets** : contrairement à un scanner classique, il ne se contente pas d'ouvrir des connexions — il forge l'en-tête IP/TCP/UDP/ICMP lui-même. On choisit les **flags TCP** (`-S`, `-A`, `-F`, `-P`, `-R`, `-U`, `-X`, `-Y`), le **TTL**, le **port source/destination**, la **taille et le contenu des données** (`-d`, `--data`, `-E fichier`), la **fragmentation** (`-f`), et même l'**adresse source usurpée** (`-a`). Cette liberté permet de reproduire des comportements impossibles avec un socket normal (fragments volontairement malformés, flags illégaux, spoofing).

C'est l'outil de prédilection pour **tester les pare-feu et les IDS** (voir comment un équipement réagit à un SYN, un FIN, un paquet fragmenté), pour le **fingerprinting** (analyse des réponses TCP d'un OS), et pour du **scan furtif/avancé**. Il peut aussi **écouter** (`-l`) et **flooder** (`--flood`, `--rand-source`) à des fins de test de robustesse.

En cybersécurité offensive, hping3 complète Nmap quand il faut **déjouer une détection** (fragmentation, flags inhabituels, spoofing) ou **sonder un pare-feu** : c'est le terrain de jeu de la défense/contournement réseau. En défense, il sert à valider que les règles et la détection tiennent face à du trafic malformé.

```mermaid
flowchart LR
    A["hping3 -S -p 80 -c 3 target"] --> B["Paquet TCP SYN forgé"]
    B --> C["Cible / pare-feu / IDS"]
    C --> D["Réponses SYN-ACK / RST / rien"]
    D --> E["Analyse : ouvert / filtré / fermé"]
```

---

## 🧠 Concepts fondamentaux

| Concept | Explication |
|---|---|
| Flags TCP | `-S` (SYN), `-A` (ACK), `-F` (FIN), `-P` (PSH), `-R` (RST), `-U` (URG), `-X`/`-Y` (combinaisons CWR/ECE) |
| Scan TCP | Un SYN reçoit SYN-ACK (ouvert), RST (fermé) ou rien (filtré) selon l'équipement |
| Spoofing | `-a <ip>` force l'adresse source (utile et illégal hors lab) |
| Fragmentation | `-f`/`-F` découpe les paquets pour contourner des filtres ou des IDS |
| Modes | `-1` ICMP, `-2` UDP, `-8` RAW IP, `-9` écoute (listen mode) |
| Traceroute | `-T` + `-t <ttl>` incrémente le TTL pour cartographier le chemin |
| Flood | `--flood`, `--rand-source`, `-i u0` pour saturer sans attendre de réponse |
| Intervalle | `-i <temps>` (ex. `-i u1000` = 1 ms, `-i 1` = 1 s) contrôle la cadence |
| Données | `-d <taille>`, `--data <hex>`, `-E <fichier>` injectent un payload arbitraire |
| Scripting Tcl | hping3 embarque un interpréteur Tcl pour automatiser les séquences |

---

## 🛠️ Installation

### Debian / Ubuntu / Kali Linux

```bash
sudo apt update && sudo apt install -y hping3
```

### Arch Linux

```bash
# Paquet AUR : hping
yay -S hping
```

### Fedora / RHEL

```bash
# EPEL parfois ; sinon compilation
sudo dnf install -y libpcap-devel tcl-devel
```

### macOS

```bash
brew install hping
```

### Compilation depuis les sources

```bash
git clone https://github.com/antirez/hping.git && cd hping
# Prérequis : libpcap, libtcl (pour le scripting)
./configure
make
sudo make install
```

> [!warning] ⚠️ Prérequis & problèmes potentiels
> - L'envoi de paquets bruts exige `root` (socket brut).
> - La compilation moderne peut nécessiter `libpcap-dev` et `tcl8.6-dev` ; le `configure` est ancien.
> - Le projet est peu actif : les paquets Debian restent la source fiable.
> - Certaines options (`-E`, Tcl) dépendent de la compilation.

---

## ⚙️ Configuration

hping3 se configure exclusivement par arguments. Les réglages les plus utilisés pour des tests reproductibles.

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `-c <N>` | Nombre de paquets | entier | Nombre d'envois puis arrêt | `-c 3` |
| `-i <t>` | Intervalle | `u<µs>`, `n<ns>`, secondes | Cadence d'envoi | `-i u1000` |
| `-p <port>` | Port destination | 1-65535 | Port cible du paquet | `-p 80` |
| `-s <port>` | Port source | 1-65535 | Port source du paquet | `-s 1024` |
| `-a <ip>` | Spoof de l'adresse source | IP | Usurpe l'émetteur | `-a 10.10.20.15` |
| `-d <N>` | Taille des données | octets | Longueur du payload | `-d 100` |
| `--data <hex>` | Données en hexadécimal | hex | Payload précis | `--data 41414141` |
| `-E <fichier>` | Données depuis un fichier | chemin | Payload chargé du disque | `-E payload.bin` |
| `-w <N>` | Fenêtre TCP | entier | Valeur de la fenêtre (fingerprint) | `-w 65535` |
| `-Q <tos>` | TOS / QoS | entier | Champ de service (ex. 0x00) | `-Q 0` |
| `--ttl <N>` | TTL | 1-255 | Durée de vie du paquet | `--ttl 64` |

---

## 🏗️ Architecture interne

hping3 repose sur un **constructeur d'en-têtes** et un **moteur d'analyse de réponses** :

- **Construction IP/TCP/UDP/ICMP** : chaque champ (version, flags, TTL, checksums, ports, fenêtre, urg…) est rempli depuis les options CLI, puis le paquet est sérialisé.
- **Envoi** : via une socket brute (ou libpcap), avec contrôle de l'intervalle (`-i`) et du nombre de paquets (`-c`).
- **Réception/analyse** : hping3 attend les réponses (SYN-ACK, RST, ICMP unreachable…) et les classe pour déduire l'état du port (ouvert/fermé/filtré) ou le comportement de l'équipement.
- **Modes** : scan (`-S`…), traceroute (`-T`), listen (`-9`), flood (`--flood`), et scripting Tcl pour des séquences programmées.

```mermaid
flowchart LR
    A["Options CLI"] --> B["Constructeur d'en-têtes"]
    B --> C["Socket brute / libpcap"]
    C --> D["Paquet forgé"]
    D --> E["Cible"]
    E --> F["Réponse (SYN-ACK/RST/ICMP)"]
    F --> G["Analyseur hping3"]
    G --> H["Rapport : ouvert/filtré/fermé"]
```

---

## ⌨️ Commandes

### Commandes principales

```bash
hping3 [options] <cible>
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `sudo hping3 -1 -c 3 10.10.20.15` | Ping ICMP (type 8) | Réponses ICMP echo-reply |
| `sudo hping3 -S -p 80 -c 3 10.10.20.15` | Scan SYN du port 80 | SYN-ACK si ouvert, RST si fermé |
| `sudo hping3 -S -p 22 -c 1 -v 10.10.20.15` | Scan SYN verbeux | Flags reçus affichés |
| `sudo hping3 -2 -p 53 -c 3 10.10.20.15` | Paquet UDP vers 53 | Réponse ICMP port unreachable si fermé |
| `sudo hping3 -F -p 80 -c 3 10.10.20.15` | Scan FIN | Réponse RST si ouvert (selon l'OS) |
| `sudo hping3 -T -t 1 -p 80 example.com` | Traceroute TCP | Sauts jusqu'à la destination |
| `sudo hping3 -a 10.10.20.15 -S -p 80 -c 3 cible` | SYN avec source usurpée | La cible répond à l'adresse usurpée |
| `sudo hping3 -S -p 80 --flood --rand-source cible` | Flood SYN | Saturation du port cible |

### Commandes avancées

```bash
# Fragmentation pour contourner des filtres
sudo hping3 -f -S -p 80 -c 3 10.10.20.15

# Scan multi-ports
sudo hping3 -S --scan 22,80,443 -i u500 10.10.20.15

# Envoyer un payload depuis un fichier avec TTL custom
sudo hping3 -E payload.bin --ttl 64 -S -p 4444 -c 1 10.10.20.15
```

---

## 🎚️ Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `-S` / `-A` / `-F` / `-P` / `-R` / `-U` | Flags TCP (SYN/ACK/FIN/PSH/RST/URG) | `-S` | Basic |
| `-p <port>` | Port destination | `-p 80` | Basic |
| `-s <port>` | Port source | `-s 1024` | Basic |
| `-c <N>` | Nombre de paquets | `-c 3` | Basic |
| `-i <t>` | Intervalle (u=µs, n=ns) | `-i u1000` | Basic |
| `-1` | Mode ICMP | `-1 -c 3 h` | Basic |
| `-2` | Mode UDP | `-2 -p 53` | Intermediate |
| `-9` | Mode écoute (listen) | `-9 -I eth0` | Intermediate |
| `-T` | Traceroute TCP | `-T -t 1 -p 80 h` | Intermediate |
| `-a <ip>` | Spoof source | `-a 10.10.20.15` | Advanced |
| `-f` / `-F` | Fragmentation | `-f -S -p 80` | Advanced |
| `-d <N>` | Taille des données | `-d 100` | Intermediate |
| `--data <hex>` | Données hexadécimales | `--data 4141` | Intermediate |
| `-E <fichier>` | Données depuis fichier | `-E payload.bin` | Advanced |
| `-w <N>` | Fenêtre TCP | `-w 65535` | Expert |
| `--ttl <N>` | TTL | `--ttl 64` | Intermediate |
| `--flood` | Envoyer sans attendre | `--flood` | Advanced |
| `--rand-source` | Source aléatoire | `--rand-source` | Advanced |
| `-v` | Verbeux | `-v` | Basic |

> [!tip] Options les plus utiles au quotidien
> `-S -p <port> -c 3 -v` (scan de base), `-1 -c 3` (ping), `-T -t 1` (traceroute), `-f` (fragmentation), `-a` (spoof, en lab). Toujours `-c` pour limiter le nombre d'envois.

---

## 🧪 Exemples pratiques

### Beginner

```bash
# Ping ICMP simple
sudo hping3 -1 -c 3 10.10.20.15

# Vérifier si le port 80 répond
sudo hping3 -S -p 80 -c 3 -v 10.10.20.15
```

### Intermediate

```bash
# Scan multi-ports rapide
sudo hping3 -S --scan 22,80,443,4444 -i u500 10.10.20.15

# Traceroute TCP vers un site
sudo hping3 -T -t 1 -p 80 example.com
```

### Advanced

```bash
# Fragmentation : contourner un filtre basique
sudo hping3 -f -S -p 80 -c 5 10.10.20.15

# Envoyer un payload précis (hex) sur un port custom
sudo hping3 -S -p 4444 --data "41414141" -c 1 10.10.20.15
```

### Expert

```bash
# SYN avec source usurpée (lab uniquement)
sudo hping3 -a 10.10.20.15 -S -p 80 -c 3 192.168.1.10

# Flood SYN contrôlé (test de robustesse, réseau dédié)
sudo hping3 -S -p 80 --flood --rand-source 10.10.20.15
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Étape 1 — Vérifier la connectivité** — ping ICMP :
   ```bash
   sudo hping3 -1 -c 3 10.10.20.15
   ```
2. **Étape 2 — Scanner les ports d'intérêt** — SYN scan :
   ```bash
   sudo hping3 -S --scan 22,80,443,4444 -i u500 10.10.20.15
   ```
3. **Étape 3 — Tester le pare-feu et le chemin** — FIN, fragmentation puis traceroute :
   ```bash
   sudo hping3 -F -p 80 -c 3 10.10.20.15
   sudo hping3 -f -S -p 80 -c 3 10.10.20.15
   sudo hping3 -T -t 1 -p 80 example.com
   ```

---

## 🎬 Scénarios avancés

### Scénario 1 : contournement de règle par fragmentation

```bash
# Un filtre ne bloque pas les fragments seuls ; on découpe le payload
sudo hping3 -f -S -p 80 -c 5 10.10.20.15
# Variante : fragments très petits avec données
sudo hping3 -F -S -p 80 -d 8 -c 5 10.10.20.15
```

### Scénario 2 : détection d'un service par analyse de réponse

```bash
# La réponse SYN-ACK révèle la fenêtre et le TTL de l'OS
sudo hping3 -S -p 80 -c 1 -v 10.10.20.15   # window + ttl → fingerprint
```

### Scénario 3 : test de robustesse d'un équipement

```bash
# En lab uniquement : flood SYN depuis sources aléatoires
sudo hping3 -S -p 80 --flood --rand-source 10.10.20.15
# Observer l'équipement (CPU, files, sessions) pendant le test
```

### Scénario 4 : sondage de règles egress (test défense)

```bash
# Vérifier quels ports sortants sont autorisés (voir les réponses)
for p in 80 443 53 4444; do
  sudo hping3 -S -p $p -c 1 -v example.com
done
```

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Reconnaissance | Ping sweeps ICMP, scans SYN/UDP/FIN, fingerprinting |
| Énumération | Détection de services via réponses TCP |
| Defense Evasion | Fragmentation, flags inhabituels, spoofing |
| Impact | Tests de robustesse (flood contrôlé) en lab |
| Défense | Validation des règles pare-feu/IDS, tests d'egress |
| Réseau | Traceroute TCP, mesures de latence et de pertes |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Discovery | Network Service Discovery | T1046 | Scans SYN/FIN/UDP de ports et de services | Netflow, corrélation de connexions | Segmentation, filtrage |
| Discovery | Active Scanning | T1595 | Ping sweeps et sondes systématiques | Détection de scans répétitifs | Limitation du taux, pare-feu |
| Impact | Network Denial of Service | T1498 | Flood SYN (`--flood`) contre un équipement | Analyse de débits anormaux | Rate limiting, anti-DDoS |
| Impact | Endpoint Denial of Service | T1499 | Saturation d'un service/port unique | Moniteurs de disponibilité | Redondance, mitigation DDoS |
| Command and Control | Non-Application Layer Protocol | T1095 | Communication brute sur TCP personnalisé | Analyse de flux | Egress control |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> hping3 est un outil de test polyvalent : T1046/T1595 couvrent le scan, T1498/T1499 le flood. Les floods ne doivent être testés qu'en lab ou avec autorisation explicite.

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Paquets TCP aux flags anormaux (SYN+FIN, FIN seuls…) | Suricata/Snort, corrélation de flags |
| Fragments TCP volontairement petits/séparés | Détection de fragmentation inhabituelle |
| Volumes de SYN anormaux (flood) | Seuils de SYN/s, netflow |
| Adresses source usurpées | Vérification des anti-spoofing (BCP38) |
| Scans répétitifs multi-ports | Corrélation temporelle des connexions |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma — Linux : hping3 exécuté avec des options de scan/flood
title: Hping3 Scan or Flood
id: 2a7d9e1f-4b8c-4f3a-9c1e-8d2f5a6b7c8d
status: experimental
logsource:
    category: process_creation
    product: linux
detection:
    selection:
        Image|endswith: '/hping3'
    condition: selection
falsepositives:
    - Legitimate network testing
level: medium
```

> [!note] À vérifier
> Les seuils de SYN/s et la sensibilité à la fragmentation dépendent du réseau : calibrer sur le trafic de référence pour limiter les faux positifs.

---

## 🤖 Automatisation

```bash
# Bash — sweep ICMP sur un /24 et garder les répondeurs
for ip in $(seq 1 254); do
  hping3 -1 -c 1 -i u100 10.10.20.$ip 2>/dev/null | grep -q "1 received" && echo "UP 10.10.20.$ip"
done

# Bash — vérifier la liste des ports d'un hôte
for p in 22 80 443 4444; do
  if hping3 -S -p $p -c 1 -w 3 10.10.20.15 2>/dev/null | grep -q "1 received"; then
    echo "ouvert: $p"
  fi
done
```

```python
# Python — piloter hping3 et parser le résultat (test simple)
import re, subprocess
out = subprocess.run(["sudo", "hping3", "-S", "-p", "80", "-c", "2",
                      "10.10.20.15"], capture_output=True, text=True).stdout
print("port 80 :", "ouvert" if re.search(r"1 packets received", out) else "fermé/filtré")
```

---

## 📤 Output et parsing

hping3 affiche les réponses brutes ligne par ligne : `len`, `ip`, flags reçus (`S` = SYN-ACK, `RA` = RST+ACK), `ttl`, `id`, et le résumé final (`X packets transmitted, Y packets received`).

```bash
# Exemple de sortie d'un SYN scan
sudo hping3 -S -p 80 -c 2 10.10.20.15
# len=46 ip=10.10.20.15 tcpflags=SA seq=... win=65535 ttl=64
# len=46 ip=10.10.20.15 tcpflags=SA seq=... win=65535 ttl=64
# 2 packets transmitted, 2 packets received, 0% packet loss

# Résumé exploitable
sudo hping3 -S -p 80 -c 2 10.10.20.15 2>&1 | tail -n 1
```

---

## 🔗 Intégrations

- [[Tools|🧰 Outils]] global
- [[Outil - Nmap]] — le scan complet ; hping3 pour le sur-mesure
- [[Outil - Scapy]] — la forgerie en Python (évolution scriptée de hping3)
- [[Outil - tcpdump]] / [[Outil - tshark]] — valider les paquets forgés par hping3
- [[Outil - Suricata]] / [[Outil - Snort]] — tester la détection du trafic forgé
- [[Outil - Metasploit]] — complément pour l'exploitation post-scan

```text
hping3 -S -p <port> <cible>  →  scan/cartographie
hping3 -f -S -p <port>       →  contournement par fragmentation
hping3 -T -t 1 <cible>       →  traceroute TCP
```

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| Nmap | Scans complets, scripts NSE, rendu | Moins de contrôle fin des en-têtes | Scan classique |
| Scapy | Forgerie totale en Python, scriptable | Plus lent, plus complexe | Sur-mesure et automatisation |
| nping (Nmap) | Paquets custom simples, ARP | Moins d'options que hping3 | Tests ponctuels |
| tcpreplay | Rejeu de captures existantes | Pas de forgerie ad hoc | Reproduction de trafic |
| ping (iputils) | Universel, minimal | ICMP uniquement | Vérification rapide |

> **Quand utiliser hping3 plutôt que Nmap ?** Pour tester un pare-feu/IDS avec des paquets anormaux (flags, fragments, spoof), ou quand le contrôle précis des en-têtes prime sur le rendu d'un scan.

---

## ⚡ Performance

- **Cadence** : `-i u1000` (1 ms) est un bon compromis scan ; `--flood` sature sans attendre de réponse.
- **Sweep ICMP** : `-i u100` sur un /24 est rapide mais les réponses se perdent si trop agressif.
- **Scans** : réduire `-c` et l'intervalle pour accélérer ; `-v` n'est utile qu'en petit nombre.
- **Coût** : la forgerie en espace utilisateur est plus coûteuse que les scans noyau (Nmap SYN) ; hping3 ne monte pas en débit aussi haut.
- **Limites** : la précision temporelle dépend du noyau et de la NIC (hautes cadences possibles mais non garanties).

> [!note] À vérifier
> Les débits/floods dépendent du matériel ; tester la robustesse uniquement en environnement isolé et autorisé.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : « Can't open raw socket »

- **Cause** : droits insuffisants.
- **Solution** : `sudo hping3 …` ou capabilities `CAP_NET_RAW`.
- **Vérification** : `sudo hping3 -1 -c 1 127.0.0.1`.

#### Problème : aucune réponse alors que le service répond

- **Cause** : pare-feu qui filtre, spoofing de source, ou intervalle trop rapide.
- **Solution** : retirer `-a`, réduire la cadence (`-i 1`), vérifier la route.
- **Vérification** : `sudo hping3 -S -p 80 -c 1 -v` en observant le réseau avec tcpdump.

#### Problème : le scan FIN ne donne rien

- **Cause** : certains OS (Windows) répondent par RST même filtrés ; Linux ignore les FIN sur ports fermés.
- **Solution** : croiser avec un SYN scan, ou utiliser `-SA`.
- **Vérification** : comparer `-S` et `-F` sur le même port.

#### Problème : hping3 absent / non trouvé

- **Cause** : paquet non installé ou projet non maintenu sur la distro.
- **Solution** : `apt install hping3`, ou compiler depuis le repo antirez/hping.
- **Vérification** : `hping3 -h`.

---

## 🔐 Sécurité de l'outil

- **Privilèges** : root requis pour les sockets brutes.
- **Spoofing** : `-a` masque la source — traçable côté cible uniquement via les anti-spoofing ; usage réservé au lab.
- **Floods** : `--flood` peut dégrader ou faire tomber des équipements — jamais hors environnement dédié et autorisé.
- **Télémétrie** : aucune ; mais les paquets forgés sont observables par l'équipement et les sondes.
- **Données** : `-E`/`--data` permettent d'injecter des payloads arbitraires — à documenter.
- **Autorisations** : scanner ou saturer un réseau sans accord est illégal.

---

## ⚠️ Limitations

- Projet peu actif : pas de release majeure depuis des années.
- Compilation dépendante d'anciennes libs (libpcap, Tcl).
- Forgerie en espace utilisateur : débits inférieurs aux scans noyau.
- Pas de rendu aussi lisible que Nmap (sortie texte brute).
- Certaines options (Tcl, `-E`) varient selon la build.
- Le support IPv6 n'est pas complet.

---

## 📋 Cheatsheet

```bash
# Ping ICMP
sudo hping3 -1 -c 3 10.10.20.15

# Scan SYN d'un port
sudo hping3 -S -p 80 -c 3 -v 10.10.20.15

# Scan multi-ports
sudo hping3 -S --scan 22,80,443 -i u500 10.10.20.15

# Scan UDP
sudo hping3 -2 -p 53 -c 3 10.10.20.15

# Traceroute TCP
sudo hping3 -T -t 1 -p 80 example.com

# Fragmentation
sudo hping3 -f -S -p 80 -c 3 10.10.20.15

# Payload hex sur port custom
sudo hping3 -S -p 4444 --data "41414141" -c 1 10.10.20.15

# Flood SYN (lab uniquement)
sudo hping3 -S -p 80 --flood --rand-source 10.10.20.15
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Forger/envoyer des paquets TCP/IP personnalisés : scans, tests pare-feu, fingerprinting, floods |
| **Quand l'utiliser ?** | Quand le contrôle fin des en-têtes prime (détection, furtivité, tests d'équipement) |
| **Commande principale** | `sudo hping3 -S -p 80 -c 3 -v 10.10.20.15` |
| **Alternative principale** | [[Outil - Nmap\|Nmap]], [[Outil - Scapy\|Scapy]], nping |
| **Concepts importants** | flags TCP, `-1`/`-2`/`-8`, fragmentation `-f`, spoof `-a`, `--flood`, `-i` |
| **Liens associés** | [[Outil - Nmap]] · [[Outil - Scapy]] · [[Outil - tcpdump]] · [[Outil - Suricata]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Flags TCP anormaux (SYN+FIN, FIN seuls) | Suricata/Snort, corrélation de flags |
| Fragmentation inhabituelle | Détection d'évasion par fragmentation |
| Rafales de SYN (flood) | Seuils de SYN/s, netflow |
| Adresses source usurpées | Anti-spoofing (BCP38), uRPF |
| Scans répétitifs | Corrélation temporelle, blacklists dynamiques |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> - Toujours limiter les envois avec `-c` et un intervalle raisonnable.
> - Croiser `-S`, `-F`, `-2` pour confirmer l'état d'un port.
> - Utiliser `-v` pour voir les flags reçus (SA = ouvert, RA = fermé).
> - Observer les réponses avec tcpdump pour comprendre le comportement d'un équipement.
> - En lab, isoler le réseau de test : un flood peut dégrader l'environnement.

> [!warning] ⚠️ **Pièges**
> - Un SYN scan peut déclencher les alertes IDS et les blocs des WAF.
> - Le FIN scan est inopérant sur certains OS (réponses RST même filtrés).
> - Spoofing et floods sont illégaux hors autorisation — traçables malgré tout.
> - hping3 n'est plus maintenu activement : ne pas dépendre de fonctions exotiques.
> - `--flood` sans réseau dédié peut faire tomber le testé… et le réseau.

---

## 📚 References

### Official

- Site officiel hping : http://www.hping.org/
- Documentation : http://www.hping.org/documentation.html
- Manuel man page : http://www.hping.org/manpage.html
- Dépôt miroir : https://github.com/antirez/hping

### Security references

- MITRE ATT&CK T1046 — Network Service Discovery : https://attack.mitre.org/techniques/T1046/
- MITRE ATT&CK T1595 — Active Scanning : https://attack.mitre.org/techniques/T1595/
- MITRE ATT&CK T1498 — Network Denial of Service : https://attack.mitre.org/techniques/T1498/
- MITRE ATT&CK T1499 — Endpoint Denial of Service : https://attack.mitre.org/techniques/T1499/

### Community

- HackTricks — scans et test de pare-feu : https://book.hacktricks.xyz/network-services-pentesting/pentesting-network
- Exemples hping (blogs) : http://www.hping.org/sample.html
- Kali tools — hping3 : https://www.kali.org/tools/hping3/

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Outil - Nmap|Nmap]] · [[Outil - Scapy|Scapy]] · [[Outil - tcpdump|tcpdump]] · [[Outil - Suricata|Suricata]]
