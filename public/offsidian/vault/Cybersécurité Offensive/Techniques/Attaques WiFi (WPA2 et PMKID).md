---
title: "Attaques WiFi (WPA2 et PMKID)"
type: technique
categorie: wireless
tags:
  - cyber
  - technique
  - wireless
statut: publie
---




# Attaques WiFi — Hub & Index

> [!info] **En 1 phrase**
> Le hacking WiFi se découpe en **attaques spécialisées** : **WEP** (mort, minutes), **WPA2-PSK** (handshake → crack offline),
> **PMKID** (sans client), **WPS** (PIN), **WPA2-Enterprise** (phishing EAP) — chaque sujet a désormais **sa propre fiche dédiée** ci-dessous.

---

## Index des fiches WiFi

```mermaid
flowchart LR
    A[WiFi] --> B[Préparation & basiques]
    A --> C[WEP<br>mort en minutes]
    A --> D[WPA2-PSK<br>handshake 4-way]
    A --> E[PMKID<br>sans client]
    A --> F[WPS<br>PIN brute-force]
    A --> G[Enterprise<br>evil twin EAP]
    A --> H[Rogue AP & MITM]
    A --> I[Outils & Recon]
```

| Sujet | Fiche dédiée | Cible |
|---|---|---|
| **Préparation** : adaptateurs, monitor, injection, fake auth, deauth | [[Techniques/Attaques WiFi - Préparation & Basiques\| Préparation & Basiques]] | Toutes les attaques |
| **WEP** : ARP replay, fragmentation, chopchop, SKA | [[Techniques/Attaques WiFi - WEP\| WEP]] | Réseaux WEP (legacy) |
| **WPA2-PSK** : capture handshake + crack (aircrack, John, Pyrit, coWPAtty, airolib, bettercap) | [[Techniques/Attaques WiFi - WPA2 PSK\| WPA2-PSK]] | Réseaux domestiques/SMB |
| **PMKID** : capture sans client + hashcat 16800 | [[Techniques/Attaques WiFi - PMKID\| PMKID]] | WPA/WPA2 avec AP compatible |
| **WPS** : Reaver, pixiewps, bypass rate-limit | [[Techniques/Attaques WiFi - WPS\| WPS]] | AP avec WPS activé |
| **Enterprise (EAP)** : EAPHammer, evil twin, hostile portal, captive portal | [[Techniques/Attaques WiFi - Enterprise\| Enterprise (EAP)]] | Réseaux d'entreprise 802.1X |
| **Rogue AP** : airbase-ng, Karmetasploit, AP MITM | [[Techniques/Attaques WiFi - Rogue AP\| Rogue AP & MITM]] | Phishing, MITM, capture handshake |
| **Outils** : airdecap-ng, airgraph, Kismet, giskismet, filtrage MAC, tshark | [[Techniques/Attaques WiFi - Outils & Recon\| Outils & Recon]] | Analyse, décryptage, cartographie |

---

## Quick reference (ordre de bataille)

```mermaid
flowchart LR
    A[Scanner<br>airodump-ng] --> B{Type de réseau ?}
    B -->|WEP| C[Fiche WEP<br>ARP replay / chopchop]
    B -->|WPA2-PSK| D[Fiche WPA2<br>handshake + deauth]
    B -->|WPA2 + AP PMKID| E[Fiche PMKID<br>sans client]
    B -->|WPS actif| F[Fiche WPS<br>reaver / pixiewps]
    B -->|Enterprise| G[Fiche Enterprise<br>EAPHammer]
    C --> H[Passphrase / clé]
    D --> H
    E --> H
    F --> H
    G --> I[Credentials AD]
```

## Liens

- [[Password Cracking| Password Cracking]]
- → Note complète : [[07 - Wireless, MITM & Social Engineering| Wireless / MITM / SE]]
