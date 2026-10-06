---
title: "Outil - hash-identifier"
type: outil
categorie: Exploitation & Cracking
tags:
  - cyber
  - outil
  - Exploitation & Cracking
statut: publie
version: 1.2+git20180314-0kali3 (paquet Kali)
licence: GPLv3
langage: Python
developpeur: Zion3R (packagé et maintenu par Kali Developers)
repo: https://github.com/blackploit/hash-identifier
site: https://www.kali.org/tools/hash-identifier/
doc: https://gitlab.com/kalilinux/packages/hash-identifier
---

# hash-identifier — Exploitation & Cracking

> [!info] **En 1 phrase**
> hash-identifier est le petit script interactif préinstallé sur Kali qui, en collant un hash, renvoie la liste des algorithmes probables — parfait pour un tri rapide avant de cracker.

---

## Overview

| Champ | Valeur |
|---|---|
| Nom complet | hash-identifier |
| Description | Identifieur de hash interactif : coller un hash, obtenir la liste des algorithmes probables (MD5, SHA, crypt() Unix, WordPress, NTLM...) |
| Catégorie | Exploitation & Cracking |
| Sous-catégorie | Identification de hash (pré-cracking) |
| Type d'outil | CLI (100 % interactif) |
| Licence | GPLv3 |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | Python (script unique `hash-id.py`) |
| Développeur / organisation | Zion3R ; paquet maintenu par Kali Developers |
| Projet officiel | hash-identifier (page Kali) |
| Dépôt officiel | https://github.com/blackploit/hash-identifier (mirror) |
| Documentation officielle | https://www.kali.org/tools/hash-identifier/ |
| Date de création | ~2011 (projet historique, code.google.com/p/hash-identifier) |
| État du projet | maintenu dans Kali (base de signatures figée) |
| Dernière version connue | 1.2+git20180314-0kali3 |
| Systèmes compatibles | Linux (Kali), macOS, Windows (via Python) |

> [!note] Pour vérifier / compléter
> L'outil est ancien et sa base de signatures ne couvre pas les formats récents : à utiliser comme première passe de tri, à recouper avec `hashid` / Name-That-Hash.

---

## Concept

hash-identifier (par Zion3R, packagé dans Kali) est l'identifieur de hash le plus simple du paysage : un outil **100 % interactif** qui attend que tu colles un hash puis te liste les formats possibles en se basant sur sa base de signatures (longueur, caractères, préfixes).

Son positionnement : le **triage de 30 secondes**. Tu as récupéré un hash au cours d'une session et tu veux une piste immédiate avant de lancer l'outil lourd (hashcat/john). Contrairement à `hashid` ou `Name-That-Hash`, il n'affiche pas les modes hashcat/John directement et sa base est ancienne : c'est un outil de complément, à recouper avec les deux autres pour les cas ambigus. Il reste néanmoins le réflexe zéro-configuration sur Kali : un seul lancement, un copier-coller, et on a déjà un ordre de grandeur de l'algorithme.

Dans un CTF ou un engagement, il arrive souvent que le format d'un hash extrait d'une base propriétaire, d'un binaire ou d'un dump soit totalement inconnu. hash-identifier donne alors un premier classement (MD5, SHA-1, SHA-2, crypt() Unix, formats WordPress/Joomla/Drupal, hashes Windows...) qui oriente la suite. Son usage est volontairement minimaliste : zéro argument, zéro configuration, un résultat immédiat — à condition de ne jamais considérer sa réponse comme une certitude absolue et de toujours vérifier par recoupement.

Le script fonctionne par **recherche dans une table de signatures** : longueur exacte, encodage (hexadécimal, base64), préfixes (`$1$`, `$2y$`, `$P$`, `$6$`...). Il gère aussi quelques cas spéciaux comme les formats `LM`/`NTLM` (32 caractères hex) ou les anciens hashes MySQL/PostgreSQL. Ses limites sont connues : base figée dans le temps (les formats récents type KDF applicatifs peuvent manquer) et liste parfois trop large sur les hashes courts (un 32-hex est compatible avec des dizaines de formats). D'où la règle d'usage : tri rapide d'abord, confirmation par un second outil ensuite.

```mermaid
flowchart LR
    A["Hash récupéré"] --> B["hash-identifier"]
    B --> C["Coller le hash"]
    C --> D["Liste des formats probables"]
    D --> E["Recoupement hashid / nth"]
    E --> F["Cracking ciblé"]
```

---

## Concepts fondamentaux

| Concept | Explication |
|---|---|
| Hash / digest | Empreinte de taille fixe d'une donnée ; sa longueur et son encodage sont les premiers indices d'identification |
| Signature | Règle de reconnaissance : longueur exacte + jeu de caractères (hex, base64) + préfixe/suffixe |
| Encodage hexadécimal | 32 chars = 128 bits, 40 = SHA-1, 64 = SHA-256, 128 = SHA-512 — première classification visuelle |
| Préfixes `$...$` | `$1$` MD5 crypt, `$5$` SHA-256 crypt, `$6$` SHA-512 crypt, `$2y$` bcrypt, `$P$`/`$H$` WordPress (phpass) |
| Base64 | Longueur non hexadécimale, souvent des fins `=` : indices de formats base64 (ex. certains bcrypt, formats applicatifs) |
| Sel (salt) | Donnée aléatoire ajoutée au mot de passe ; visible dans les formats Unix (`$6$sel$hash`) |
| LM / NTLM | Hashs Windows : 32 hex ; LM (faible, par blocs de 7 chars) vs NTLM (MD4) — indiscernables à l'œil nu |
| KDF (Key Derivation Function) | bcrypt, scrypt, argon2, PBKDF2 : lents par conception, marqueurs de systèmes récents |
| Mode hashcat | Numéro identifiant l'algorithme pour hashcat (ex. 0 = MD5, 1000 = NTLM) ; hash-identifier ne les affiche pas |
| Ambiguïté | Un 32-hex est MD5 **et** NTLM **et** MD4... : seul un recoupement (exemple connu) lève le doute |

---

## Installation

### Debian / Ubuntu / Kali Linux

```bash
# Kali : préinstallé — il suffit de lancer
hash-identifier

# Paquet explicite (si absent)
sudo apt update && sudo apt install -y hash-identifier
```

### Arch Linux / BlackArch

```bash
# BlackArch : paquet hash-identifier
sudo pacman -S hash-identifier
```

### Fedora / RHEL

```bash
# Non packagé : exécuter le script Python directement (voir sources)
sudo dnf install python3
```

### macOS

```bash
# Via l'écosystème Python : cloner puis lancer le script
git clone https://github.com/blackploit/hash-identifier.git
python3 hash-identifier/hash-id.py
```

### Windows

```powershell
# Script Python indépendant
git clone https://github.com/blackploit/hash-identifier.git
python hash-identifier\hash-id.py
```

### Compilation depuis les sources (mirror)

```bash
git clone https://github.com/blackploit/hash-identifier.git
cd hash-identifier && python3 hash-id.py
```

> [!warning] Prérequis & problèmes potentiels
> - Nécessite simplement **Python 3** ; aucun paquet supplémentaire.
> - L'outil attend une saisie **interactive** : sans stdin (tty), prévoir `echo <hash> | hash-identifier`.
> - Sur certains terminaux, le prompt affiche mal les accents : c'est purement cosmétique.

---

## Configuration

hash-identifier n'a **aucune configuration** : ni fichier de config, ni variable d'environnement, ni option de réglage. Tout le comportement est codé en dur dans `hash-id.py`.

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| (aucun) | L'outil est 100 % interactif | — | Aucun réglage possible | `hash-identifier` |
| stdin (pipe) | Alimenter le hash sans tty | une ligne | Automatisation de scripts | `echo 'hash' \| hash-identifier` |
| `Ctrl+C` | Quitter | — | Sortie propre | — |

> [!note] À vérifier
> La base de signatures se modifie uniquement en **éditant le source** `hash-id.py` (peu recommandé, fragile). Préférer un outil à jour pour les formats récents.

---

## Architecture interne

- **Un seul fichier** : `hash-id.py`, script Python sans dépendance externe (stdlib uniquement : `hashlib`, `re`, `sys`).
- **Base de signatures** : une table statique associant chaque format à une **regex** (longueur + jeu de caractères + préfixes optionnels). Le script teste le hash saisi contre chaque règle et collecte les correspondances.
- **Boucle interactive** : `raw_input()`/`input()` attend un hash ; si une chaîne est fournie via stdin (pipe), elle est lue puis traitée avant la sortie.
- **Sortie** : une liste `Possible Hashs:` avec `[+] <nom du format>` ; certains formats incluent des détails (ex. `MD5(Half)`, `NTLM`).
- **Cas spéciaux** codés en dur : formats `LM`/`NTLM`, anciens MySQL/PostgreSQL, `crypt()` Unix par préfixe.
- **Pas de modules ni d'extensions** : le projet n'a pas d'architecture modulaire ; c'est un script unique vieillissant.

---

## Commandes

### Commandes principales

```bash
hash-identifier
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `hash-identifier` | Lancer l'outil en mode interactif | Prompt `HASH:` prêt à recevoir le hash |
| `echo '<hash>' \| hash-identifier` | Usage non-interactif (pipe) pour chaîner un script | Liste des formats probables |
| `Ctrl+C` | Quitter | Sortie propre |

### Commandes avancées

```bash
# Trier un fichier ligne par ligne (première réponse seulement)
for h in $(cat fuite.txt); do echo "$h" | hash-identifier | head -1; done
# Compter les familles d'algorithmes identifiées
for h in $(cat fuite.txt); do echo "$h" | hash-identifier | grep -oP '(?<=\[ ).*?(?= \])' | head -1; done | sort | uniq -c
```

### Comparatif des identifieurs de hash

| Outil | Interactif | Modes hashcat/John | Base de signatures |
|---|---|---|---|
| hash-identifier | Oui (collage) | Non | Ancienne |
| hashid | Non (argument) | Oui (`-m -j`) | Moyenne |
| Name-That-Hash | Non (pipe) | Oui (hashcat/john) | Récente |

---

## Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| (aucune) | Aucune option : l'outil est purement interactif | `hash-identifier` | Basic |
| stdin (pipe) | Alimenter le hash depuis l'entrée standard | `echo '<hash>' \| hash-identifier` | Intermediate |
| `Ctrl+C` | Interrompre la boucle et quitter | — | Basic |

> [!tip] Options les plus utiles au quotidien
> Il n'y a pas d'option : la seule « fonctionnalité » avancée est le **pipe stdin** (`echo ... | hash-identifier`) pour automatiser un tri en masse.

---

## Exemples pratiques

### Beginner

```bash
# Lancer puis coller un hash (ex. MD5 de "azerty")
hash-identifier
# HASH: e99a18c428cb38d5f260853678922e03
```

### Intermediate

```bash
# Identifier un hash Unix avec sel
echo '$6$salis$Vr7D...' | hash-identifier
# Identifier un hash WordPress (phpass)
echo '$P$BkP8Z...' | hash-identifier
```

### Advanced

```bash
# Tri automatique d'une fuite : repérer les familles d'algorithmes
for h in $(cat fuite.txt); do echo "$h" | hash-identifier | grep -oP '(?<=\[ ).*?(?= \])' | head -1; done | sort | uniq -c
```

### Expert

```bash
# Pipeline complet : identification → recoupement → cracking
echo 'e99a18c428cb38d5f260853678922e03' | hash-identifier
hashid -m -j hash.txt                    # mode hashcat + format John
hashcat -m 0 -a 0 hash.txt wordlist.txt  # crack ciblé
```

---

## Workflow complet (scénario pas à pas)

1. **Récupérer le hash** — ex. un hash depuis `/etc/passwd`, un champ `password` d'une fuite SQL, un hash de session.
2. **Lancer hash-identifier et coller le hash** :
   ```bash
   hash-identifier
   # HASH: e99a18c428cb38d5f260853678922e03
   ```
3. **Lire les candidats** — l'outil liste par exemple : *MD5*, *MD5(Half)*, *NTLM*... (avec le détail du format).
   ```text
   Possible Hashs:
   [+] MD5
   [+] MD5(Half)
   [+] NTLM
   ```
4. **Recouper** — confirmer avec `hashid -m -j` ou `Name-That-Hash` pour obtenir le mode hashcat exact et lever les ambiguïtés (MD5 vs NTLM).
   ```bash
   hashid -m -j hash.txt
   ```
5. **Cracker** :
   ```bash
   hashcat -m 0 -a 0 hash.txt wordlist.txt
   ```

---

## Scénarios avancés

### Scénario 1 : Tri rapide en cours d'engagement

```bash
cat hash.txt | hash-identifier
```

Obtenir une première piste en quelques secondes sans quitter ta session, avant de décider quel outil dédier au crack.

### Scénario 2 : Recoupement multi-outils

Quand hash-identifier et hashid divergent, laisser trancher `Name-That-Hash` (base la plus à jour) puis vérifier le format choisi avec `hashcat --example-hashes`.

### Scénario 3 : tri automatique d'une fuite complète

```bash
for h in $(cat fuite.txt); do echo "$h" | hash-identifier | head -1; done
```

L'intérêt : repérer rapidement si une fuite mélange plusieurs algorithmes (fréquent sur les vieilles bases) avant de préparer des attaques hashcat par mode.

```bash
# Variante : compter les familles d'algorithmes identifiées
for h in $(cat fuite.txt); do echo "$h" | hash-identifier | grep -oP '(?<=\[ ).*?(?= \])' | head -1; done | sort | uniq -c
```

---

## Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Énumération | Identifier le format des hashes trouvés (fichiers, bases, configs) |
| Post-exploitation | Préparer le cracking des hashes extraits (SAM, NTDS.dit, bases web) |
| Credential Access | Chaîne complète : dump → identification → cracking → réutilisation |
| Analyse de fuites | Trier une fuite SQL mélangeant plusieurs algorithmes |
| CTF / Lab | Réflexe de tri avant de choisir le mode hashcat |

---

## MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Credential Access | Brute Force: Password Cracking | T1110.002 | L'identification de hash prépare le cracking hors-ligne des mots de passe | Pas de détection directe de l'outil (local) ; détecter les dumps en amont | Hash fort + sel, MFA |
| Credential Access | OS Credential Dumping | T1003 | Source des hashes à identifier (SAM, lsass, NTDS.dit) | EID 4662/4663, accès lsass (PPL) | LSA Protection, Credential Guard |
| Credential Access | Network Sniffing | T1040 | Capture de hashes réseau (NetNTLMv2) à identifier ensuite | Trafic SMB/LDAP anormal | Chiffrement, segmentation |
| Collection | Credentials from Password Stores | T1555 | Hashes issus de navigateurs/apps/gestionnaires à identifier | Accès aux stores (4688) | Credential Guard, pare-feu applicatif |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> hash-identifier est un outil **local de préparation** : il ne génère lui-même ni trafic réseau ni événement côté victime. Le risque détectable est en amont (source des hashes).

---

## Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Fichiers de hashes copiés | Extraction de SAM/NTDS.dit, bases SQL, fichiers config (processus EDR) |
| Cracking actif | GPU/CPU sollicités, fichiers wordlist/rules massifs, process `hashcat`/`john`/`hash-id.py` |
| Fuite de base | Mélange d'algorithmes indique une vieille base mal migrée |
| Réutilisation de creds | Corrélation entre hashes craqués et connexions réussies (4624) |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Exemple Sigma — Linux : exécution d'identifieurs de hash (poste d'attaque)
title: Suspicious Hash Identifier Execution
id: <uuid-a-generer>
status: experimental
logsource:
    category: process_creation
    product: linux
detection:
    selection:
        Image|endswith:
            - '/hash-id.py'
            - '/hash-identifier'
    condition: selection
falsepositives:
    - Legitimate forensic analysis
level: medium
```

> [!note] À vérifier
> Règle pédagogique : l'exécution de `hash-id.py` seul n'est qu'un indicateur faible ; corréler avec les dumps en amont (T1003) et le cracking en aval (hashcat/john).

---

## Automatisation

```bash
# Bash — trier un fichier de hashes et garder la première réponse
for h in $(cat fuite.txt); do echo "$h" | hash-identifier | head -1; done
```

```python
# Python — boucle d'identification par sous-processus
import subprocess
for h in open("hashes.txt").read().split():
    r = subprocess.run(["hash-identifier"], input=h + "\n",
                       capture_output=True, text=True)
    print(h[:20], "->", r.stdout.splitlines()[1] if r.stdout else "?")
```

---

## Output et parsing

Sortie **texte brut** : un en-tête `Possible Hashs:` suivi des formats probables sur une ligne chacun.

```bash
# Extraire le premier format probable d'un hash
echo 'e99a18c428cb38d5f260853678922e03' | hash-identifier | sed -n '/Possible Hashs:/,+2p' | tail -1
# Garder seulement les lignes "[+] ..."
echo '<hash>' | hash-identifier | grep '^\[+\]'
```

```python
# Python — regex sur les marqueurs [ + ]
import subprocess, re
out = subprocess.run(["hash-identifier"], input="<hash>\n",
                     capture_output=True, text=True).stdout
formats = re.findall(r"\[\+\]\s*(.+)", out)
print(formats)
```

> [!note] À vérifier
> Le prompt `HASH:` peut se mélanger à la sortie du hash saisi : filtrer avec `grep '^[+[]'` avant tout parsing.

---

## Intégrations

```text
Dump (SAM/NTDS/BDD) → hash-identifier → hashid / Name-That-Hash → hashcat / John → réutilisation
```

- [[Outil - hashid]] — recoupement avec modes hashcat/John (`-m -j`)
- [[Outil - Name-That-Hash]] — base la plus récente, modes hashcat/John en sortie
- [[Outil - hashcat]] — cracking GPU : `hashcat -m <mode> -a 0 hashes.txt wordlist.txt`
- [[Outil - John the Ripper]] — cracking CPU, formats d'audit
- [[Outil - SecLists]] — wordlists pour l'attaque de dictionnaire
- [[Tools| Outils]] global
- [[Techniques/Password Cracking| Password Cracking]] · [[Techniques/Dump NTDS.dit| Dump NTDS.dit]] · [[Techniques/Pass-the-Hash| Pass-the-Hash]]

---

## Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| hashid (hashID) | Plus de 200 formats, modes hashcat/John (`-m -j`), fichiers/répertoires | Base moins récente que Name-That-Hash | Standard pour choisir un mode |
| Name-That-Hash | 300+ formats, base à jour, sortie hashcat/John, pip installable | Besoin d'installation | Cas ambigus, formats récents |
| hashcat `--identify` | Intégré à hashcat, sortie exacte en mode | Nécessite hashcat installé | Vérification ultime avant crack |
| Services en ligne | Zéro installation (hashcat.net/hashcat, hashes.com...) | Confidentialité du hash, usage ponctuel | Hash unique non sensible |
| CyberChef | Analyse visuelle multi-étapes | Pas de liste de formats dédiée | Analyse de formats exotiques |

> **Quand utiliser Name-That-Hash plutôt que hash-identifier ?** Dès que le hash est ambigu ou récent : hash-identifier sert de tri de 30 secondes, Name-That-Hash tranche avec sa base à jour et ses modes hashcat/John prêts à l'emploi.

---

## Performance

- **Quasi instantané** : une simple recherche en table de signatures, aucune dépendance lourde ; le tri d'un hash prend < 1 s.
- **Par batch** : via le pipe stdin, un fichier de quelques centaines de hashes se traite en quelques secondes (coût = démarrage du processus Python par hash dans une boucle).
- **Ressources** : ~49 Ko installé ; consommation CPU/mémoire négligeable.

> [!note] À vérifier
> Pas de benchmark officiel. Le goulot d'étranglement réel est le **cracking** (hashcat/john) en aval, pas l'identification.

---

## Troubleshooting

### Common problems

#### Problème : l'outil ne démarre pas (« SyntaxError »)

- **Cause** : Python 2 vs Python 3 (ancien script).
- **Solution** : lancer explicitement `python3 hash-id.py`. **Vérif** : `python3 --version`.

#### Problème : pas de réponse lors d'un pipe

- **Cause** : la saisie interactive attend un tty, ou le stdin est fermé trop tôt.
- **Solution** : utiliser `echo '<hash>' | hash-identifier` et vérifier qu'une ligne est bien envoyée. **Vérif** : tester en interactif d'abord.

#### Problème : résultat trop vague (liste énorme)

- **Cause** : hash court/commun (32 hex) compatible avec beaucoup de formats.
- **Solution** : recouper avec `hashid -m -j` puis `hashcat --example-hashes` sur un hash connu. **Vérif** : générer un hash de contrôle (`echo -n "azerty" | md5sum`).

#### Problème : format récent non identifié

- **Cause** : base de signatures figée (ancienne).
- **Solution** : utiliser Name-That-Hash ou `hashcat --identify`. **Vérif** : comparer sur un exemple connu.

---

## Sécurité de l'outil

- **Aucun privilège requis** : script Python simple, pas de root, pas de télémétrie, pas de téléchargement réseau au runtime.
- **Confidentialité** : l'outil est **local** — aucun hash n'est envoyé à l'extérieur (contrairement aux services en ligne) ; à privilégier pour des données sensibles.
- **Source** : exécuter uniquement la version packagée (Kali) ou le mirror officiel `blackploit/hash-identifier` ; vérifier le contenu avant de lancer un script téléchargé.
- **Usage** : dans le cadre autorisé d'un test d'intrusion ; le cracking de mots de passe hors périmètre est illégal.

---

## Limitations

- **Base de signatures très ancienne** : les formats récents (KDF applicatifs, crypt() de certaines distributions) peuvent manquer.
- **Pas de modes hashcat/John** en sortie : contrairement à hashid/Name-That-Hash, il ne prépare pas directement le crack.
- **Ambiguités fréquentes** : un 32-hex peut être MD5, NTLM, MD4... sans recoupement, on peut lancer le mauvais mode.
- **Interactif** : mal adapté aux pipelines (seul le pipe stdin simple fonctionne).
- **Un hash à la fois** (via stdin) : pas d'analyse de fichiers ni de répertoires.
- **Résultats « possibles », pas certains** : une liste n'est pas une preuve.

---

## Cheatsheet

```bash
# Lancer (interactif), puis coller le hash
hash-identifier

# Non-interactif (pipe)
echo 'e99a18c428cb38d5f260853678922e03' | hash-identifier

# Trier un fichier de hashes
for h in $(cat fuite.txt); do echo "$h" | hash-identifier | head -1; done

# Recouper avec hashid (modes hashcat + John)
hashid -m -j hash.txt

# Cracker (ex. MD5, mode 0)
hashcat -m 0 -a 0 hash.txt wordlist.txt
```

---

## Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Identifier le(s) algorithme(s) probable(s) d'un hash en collant ce dernier |
| **Quand l'utiliser ?** | Première passe de tri, dès qu'un hash inconnu est récupéré |
| **Commande principale** | `hash-identifier` puis coller le hash |
| **Alternative principale** | hashid (`-m -j`) / Name-That-Hash (base à jour) |
| **Concepts importants** | Signature (longueur + charset + préfixe), ambiguïté MD5/NTLM, recoupement |
| **Liens associés** | [[Outil - hashid]] · [[Outil - Name-That-Hash]] · [[Outil - hashcat]] · [[Outil - John the Ripper]] |

---

## Détection & Défense

| Signe | Défense |
|---|---|
| Hash récupérable depuis le système/la base | Hachage fort (argon2id, bcrypt) + sel, chiffrement des données |
| Mots de passe faibles | Politique stricte + listes noires de mots de passe |
| Fuite réutilisée ailleurs | MFA, monitoring des fuites, rotation régulière |
| Trafic de brute-force sur les services | Rate limiting, verrouillage de comptes, IDS/IPS |
| Base de mots de passe stockée en encodage réversible | Ne jamais stocker en clair ni en base64 ; hasher avec un KDF lent |
| Hashes anciens (MySQL, LM, MD5 simple) encore en service | Migrer et forcer la rotation des mots de passe concernés |

---

## Tips & Pièges

> [!tip] **Tips**
> - Utilise-le comme **première passe** de tri, puis confirme avec `hashid -m` (modes hashcat) avant de lancer le crack.
> - Dans un script, le mode `echo ... | hash-identifier` permet d'automatiser le tri d'un fichier de hashes.
> - Note le contexte (source du hash, sel visible, encodage) : ça vaut mieux qu'une identification purement algorithmique.
> - Sur Kali, l'outil est aussi accessible via `hash-identifier` directement depuis le menu Outils d'analyse de mots de passe.
> - Le prompt affiche un récapitulatif des premiers formats probables : s'il hésite entre plusieurs (ex. MD5/NTLM), copie le hash dans `hashid -m -j` pour trancher.
> - Vérifie avec un hash dont tu connais la claire (ex. `echo -n "azerty" | md5sum`) : si l'outil renvoie la bonne famille, ta base d'identification est fiable.

> [!warning] **Pièges**
> - La base de signatures est **très ancienne** : les formats récents (KDF modernes, crypt() de certaines distributions) peuvent manquer.
> - Il n'affiche **pas de modes hashcat/John** : c'est un outil de tri, pas un outil de préparation de crack (contrairement à hashid/Name-That-Hash).
> - Rien ne distingue un **MD5 d'un NTLM** (32 hex) à l'œil : sans recoupement, tu peux lancer le mauvais mode et « ne rien trouver » sur un hash pourtant simple.
> - Un hash avec sel visible (`$1$xxxx$...`) peut être confondu avec un format purement hexadécimal : vérifie toujours le préfixe avant de choisir un mode.
> - La liste des candidats peut être longue sur les hashes courts : une réponse « possible » n'est pas une certitude, seule la comparaison avec un hash d'exemple (`hashcat --example-hashes`) tranche.

---

## References

### Official

- Page Kali officielle : https://www.kali.org/tools/hash-identifier/
- Dépôt mirror officiel (GitHub) : https://github.com/blackploit/hash-identifier
- Paquet Kali (suivi de version) : https://pkg.kali.org/pkg/hash-identifier

### Security references

- MITRE ATT&CK T1110.002 — Password Cracking : https://attack.mitre.org/techniques/T1110/002/
- MITRE ATT&CK T1003 — OS Credential Dumping : https://attack.mitre.org/techniques/T1003/
- OWASP — Password Storage Cheat Sheet : https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

### Community

- hashID (successeur communautaire) : https://github.com/psypanda/hashID
- HackTricks — Cracking : https://book.hacktricks.xyz/crypto-and-stego/cracking

---

**Liens :** [[Tools| Outils]] · [[Techniques/Password Cracking|Password Cracking]] · [[Outils/Outil - hashid|hashid]] · [[Outils/Outil - Name-That-Hash|Name-That-Hash]]
