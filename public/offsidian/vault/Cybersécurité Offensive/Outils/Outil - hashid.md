---
title: "Outil - hashid"
type: outil
categorie: 💥 Exploitation & Cracking
tags:
  - cyber
  - outil
  - 💥 Exploitation & Cracking
statut: publie
version: 3.1.4
licence: GPLv3+
langage: Python
developpeur: psypanda (c0re)
repo: https://github.com/psypanda/hashID
site: https://psypanda.github.io/hashID/
doc: https://www.kali.org/tools/hashid/
---

# 💥 hashid — Exploitation & Cracking

> [!info] **En 1 phrase**
> hashID est un script Python qui identifie le type d'un hash à partir de signatures (longueur, caractères) et affiche directement les modes hashcat et John the Ripper correspondants.

---

## 🧾 Overview

hashID est un identifieur de hash écrit en Python (compatible Python 2 ≥ 2.7 et Python 3 ≥ 3.3), publié par psypanda sous licence GPLv3+. Sa dernière version stable, **3.1.4** (mars 2015), est disponible sur PyPI (`pip install hashid`), est empaquetée dans Kali Linux (`hashid` 3.1.4-5) et dans Debian. Le projet compte ~1 500 étoiles sur GitHub et 397 commits.

| Fait | Valeur |
|---|---|
| Version | 3.1.4 (2015-03-09), paquet Kali/Debian 3.1.4-5 |
| Licence | GPL v3 ou ultérieure (GPLv3+) |
| Langage | Python 2 ≥ 2.7.x / Python 3 ≥ 3.3 |
| Auteur | psypanda (c0re) |
| Dépôt | github.com/psypanda/hashID |
| Types de hash reconnus | 220+ (la page Kali mentionne 175+) |

> [!note] À vérifier
> Le décompte exact de formats supportés diffère selon les sources : 220+ annoncés sur GitHub/PyPI, 175+ sur la page Kali.

---

## 🎯 Concept

hashID (par psypanda) est un identifieur de hash léger, préinstallé sur Kali, qui confronte un hash à une base de signatures : longueur, alphabet (hexadécimal, base64...), préfixes (`$1$`, `$2a$`, `$P$`...) et patterns connus. Il retourne les types possibles en précisant pour chacun le **mode hashcat** (`-m`) et le **format John** (`-j`).

C'est l'outil de tri rapide du workflow de cracking : un hash tombe entre les mains, `hashid` le range dans la bonne catégorie, on vérifie avec `Name-That-Hash` si le cas est ambigu, puis on lance le crack ciblé. Contrairement à hash-identifier (interactif et sans modes), hashID s'utilise en un seul argument et produit directement les commandes prêtes pour le crack : c'est l'outil pivot entre la collecte et le lancement de hashcat/john.

Il excelle aussi dans le **traitement par lot** : on lui passe un fichier entier de hashes (`-o` pour sauvegarder), il renvoie les candidats et les modes pour chaque ligne, ce qui prépare un plan d'attaque par mode. Sa sortie est volontairement orientée vers le crack (modes hashcat + formats John) alors que Name-That-Hash, plus complet sur les formats modernes, donne un nom de format normalisé. Idéalement, on combine les deux : hashID pour la vitesse, Name-That-Hash pour l'exhaustivité.

En pratique, la sortie avec `-m -j` ressemble à : `[+] MD5 [Hashcat Mode: 0] [John Format: raw-md5]`. Ces modes correspondent exactement aux numéros attendus par hashcat (`-m`) et aux formats `--format` de John : on peut donc copier-coller directement la valeur dans la commande de crack. Les préfixes sont le meilleur indice : `$1$` (MD5 crypt), `$2a$`/`$2b$`/`$2y$` (bcrypt), `$5$` (SHA-256 crypt), `$6$` (SHA-512 crypt), `$P$`/`$H$` (phpass), `$DCC2$` (Domain Cached Credentials v2)... hashID les reconnaît et réduit le champ des possibles.

```mermaid
flowchart LR
    A["Hash inconnu"] --> B["hashid -m -j"]
    B --> C["Candidats + modes"]
    C --> D["Recoupement / vérification"]
    D --> E["Cracking avec le bon mode"]
```

---

## 🧠 Concepts fondamentaux

### Qu'est-ce qu'un hash de mot de passe ?

Un hash est le résultat d'une fonction de hachage appliquée à un mot de passe. Suivant l'ancienneté du système, il peut s'agir d'un simple MD5/SHA-1, d'une itération (`sha512crypt`, bcrypt, argon2) ou d'une variante propre à un produit (MySQL, WordPress, DCC2). Le **type** détermine l'algorithme de cracking : se tromper de type = attaque inutile.

### Les signatures de hashID

La base de signatures de hashID repose sur des **expressions régulières** appliquées sur le hash :

- **Longueur et alphabet** : 32 hex = souvent MD5 ou NTLM ; 40 hex = SHA-1 ; 64 hex = SHA-256 ; 128 hex = SHA-512.
- **Préfixes de format** : `$1$` (md5crypt), `$5$` (sha256crypt), `$6$` (sha512crypt), `$2a$`/`$2b$`/`$2y$` (bcrypt), `$P$`/`$H$` (phpass), `$apr1$` (Apache), `$DCC2$` (DCC2), `{SHA}`, `{SSHA}` (LDAP).
- **Structure particulière** : `user:hash` (NTLM), `$racf$*...` (RACF), `$NT$...` (NT/LM), JWT (`eyJ...`), etc.

Le principe : chaque « prototype » associe une regex à un ou plusieurs types de hash. Le premier prototype qui matche produit la liste de candidats affichée.

### Modes hashcat et formats John

hashcat identifie chaque algorithme par un numéro de mode (`-m`) ; John the Ripper utilise des noms de formats (`--format`). hashID connaît les correspondances pour la plupart des types courants et peut les afficher avec `-m` et `-j` :

| Type de hash | Mode hashcat | Format John |
|---|---|---|
| MD5 | 0 | raw-md5 |
| SHA-1 | 100 | raw-sha1 |
| NTLM | 1000 | nt |
| SHA-256 | 1400 | raw-sha256 |
| SHA-512 | 1700 | raw-sha512 |
| bcrypt | 3200 | bcrypt |
| sha512crypt | 1800 | sha512crypt |
| phpass (WordPress/Joomla) | 400 | phpash |
| Kerberos 5 TGS-REP | 13100 | krb5tgs |

### Différence entre identifier et cracker

hashID **n'attaque pas** : il ne fait que classer. Le cracking (hashcat/John) est une étape séparée, lancée avec le mode fourni par l'identification.

---

## 🛠️ Installation

hashID est préinstallé sur Kali Linux et disponible dans les dépôts Debian.

```bash
# Kali / Debian / Ubuntu
sudo apt install hashid

# Via pip (installe le paquet "hashid")
pip install hashid
pip install --upgrade hashid

# Depuis les sources
git clone https://github.com/psypanda/hashID.git
cd hashID
python3 hashid.py --help
```

**Arch / Fedora / macOS** : le paquet n'est pas systématiquement dans les dépôts officiels ; on passe par pip ou le clone Git (aucune dépendance externe).

```bash
# Arch (AUR)
yay -S hashid

# Fedora / macOS
pip3 install --user hashid
```

**Windows** : compatible Python 3 ; l'exécutable est `hashid.py` et le point d'entrée pip est `hashid`.

```powershell
# Windows (invite de commandes PowerShell)
pip install hashid
hashid 'e99a18c428cb38d5f260853678922e03'
```

> [!note] À vérifier
> L'installation via pip installe le point d'entrée `hashid` ; sur les systèmes où le script est exécuté depuis le dépôt, on invoque `hashid.py`. Les deux formes sont équivalentes.

---

## ⚙️ Configuration

hashID ne possède **aucun fichier de configuration** (pas de `~/.hashidrc` ni de fichier par projet) : son comportement est entièrement piloté par les arguments de la ligne de commande.

La seule « configuration » possible est la **base de signatures** `prototypes.json`, présente dans le dépôt à côté de `hashid.py` :

```json
{
  "name": "MD5",
  "hashcat": 0,
  "john": "raw-md5",
  "extended": false,
  "regex": "^[a-fA-F0-9]{32}$"
}
```

- `name` : nom affiché du type de hash.
- `hashcat` : numéro de mode hashcat correspondant.
- `john` : format John the Ripper correspondant.
- `extended` : si `true`, la signature n'est active qu'en mode `--extended`.
- `regex` : expression régulière qui matche le hash.

Pour personnaliser (ajouter un format maison), on édite `prototypes.json` puis on relance le script — aucune recompilation nécessaire.

> [!warning] ⚠️ À manipuler avec précaution
> Un `prototypes.json` modifié peut changer la fiabilité des identifications. Conserver une sauvegarde de l'original avant édition.

---

## 🏗️ Architecture interne

hashID est un **script Python unique** (`hashid.py`) accompagné de sa base de signatures (`prototypes.json`), sans dépendance externe. Le flux de traitement est le suivant :

```text
Entrée (stdin / argument / fichier / répertoire)
        │
        ▼
Lecture et nettoyage (découpe des lignes)
        │
        ▼
Chargement des prototypes (parsing JSON)
        │
        ▼
Boucle de matching regex (prototype vs hash)
        │
        ▼
Génération de la sortie [+] Type [Hashcat Mode] [JtR Format]
```

Points clés de l'implémentation :

- **Entrées multiples** : un hash seul, un fichier (une ligne par hash), un répertoire entier, ou STDIN (par défaut — permet les pipes).
- **Ordre de priorité** : les prototypes sont essayés dans l'ordre du fichier JSON ; le premier qui matche « gagne » (l'option `--extended` liste tous les candidats, salés inclus).
- **Sortie structurée** : `Analyzing '<hash>'` en en-tête, puis une ligne `[+] <Type>` par candidat, éventuellement enrichie de `[Hashcat Mode: X]` et `[JtR Format: y]`.

---

## ⌨️ Commandes

```bash
# Identifier un hash en argument
hashid 'e99a18c428cb38d5f260853678922e03'

# Depuis un fichier (une ligne = un hash)
hashid hashes.txt

# Avec les modes hashcat ET John
hashid 'e99a18c428cb38d5f260853678922e03' -m -j

# Mode étendu (signatures complètes, formats rares)
hashid --extended 'hash...'

# Sauvegarder les résultats
hashid -o resultats.txt hashes.txt

# Sortie sans couleurs (pour les pipes / logs)
hashid --no-color -m -j hashes.txt

# Mode bref (seuls les candidats prioritaires)
hashid --brief 'hash...'

# Version
hashid --version
```

---

## 🎚️ Options et flags

| Option | Effet |
|---|---|
| `INPUT` | Hash à analyser (positionnel) ; par défaut : STDIN |
| `-e`, `--extended` | Liste tous les algorithmes possibles, y compris les hachages salés |
| `-m`, `--mode` | Affiche le mode hashcat correspondant dans la sortie |
| `-j`, `--john` | Affiche le format John the Ripper correspondant dans la sortie |
| `-o FILE`, `--outfile FILE` | Écrit les résultats dans un fichier (défaut : STDOUT) |
| `--no-color` | Désactive les couleurs dans la sortie |
| `--brief` | Mode bref : ne garde que les candidats les plus probables |
| `-h`, `--help` / `--version` | Affiche l'aide / la version |

---

## 🧪 Exemples pratiques

### Identifier un hash MD5

```bash
$ hashid 'e99a18c428cb38d5f260853678922e03' -m -j
Analyzing 'e99a18c428cb38d5f260853678922e03'
[+] MD5
[+] MD5 (APR)
[+] MD5 (phpBB3)
[+] MD5 (WordPress)
[+] MD5 (Joomla)
```

Avec `-m -j`, chaque candidat est enrichi de son mode et de son format.

### Un hash de mot de passe WordPress (phpass)

```bash
$ hashid '$P$8ohUJ.1sdFw09/bMaAQPTGDNi2BIUt1'
Analyzing '$P$8ohUJ.1sdFw09/bMaAQPTGDNi2BIUt1'
[+] Wordpress ≥ v2.6.2
[+] Joomla ≥ v2.5.18
[+] PHPass' Portable Hash
```

### Traitement d'un fichier

```bash
$ hashid hashes.txt
--File 'hashes.txt'--
Analyzing '*85ADE5DDF71E348162894C71D73324C043838751'
[+] MySQL5.x
[+] MySQL4.1
Analyzing '$2a$08$VPzNKPAY60FsAbnq.c.h5.XTCZtC1z.j3hnlDFGImN9FcpfR1QnLq'
[+] Blowfish(OpenBSD)
[+] Woltlab Burning Board 4.x
[+] bcrypt
--End of file 'hashes.txt'--
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Récupérer le hash** — ex. un hash de mot de passe depuis `/etc/shadow` (`$6$...`) ou une fuite (`2d7116...`).
2. **Identifier** :
   ```bash
   hashid '$6$f3f8d0a3c3c4e5f6$4f8d0a3c3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1' -m -j
   ```
3. **Lire la sortie** — les candidats (ex. SHA-512 crypt) sont listés avec le mode hashcat (`-m 1800`) et le format John (`sha512crypt`).
   ```text
   Analyzing '$6$f3f8d0a3c3c4e5f6$4f8d0a3c3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1'
   [+] SHA-512 Crypt   [Hashcat Mode: 1800]
   ```
4. **Vérifier** — croiser avec `Name-That-Hash` sur les cas ambigus, confirmer le format avec `--example-hashes` de hashcat.
   ```bash
   hashcat --example-hashes -m 1800 | head -20
   ```
5. **Cracker** :
   ```bash
   hashcat -m 1800 -a 0 hash.txt wordlist.txt
   ```
6. **Repli sur John si besoin** (mode différent, format moins bien supporté par hashcat) :
   ```bash
   john --format=sha512crypt --wordlist=wordlist.txt hash.txt
   ```

---

## 🎬 Scénarios avancés

### Scénario 1 : Traitement par lot
```bash
hashid -m -j -o rapport.txt liste_hashes.txt
```
Tout un fichier de hashes d'une fuite trié en une passe, avec les modes prêts à l'emploi pour hashcat.

### Scénario 2 : Cas Web (cookies, JWT, tokens)
Un cookie qui ressemble à du base64 avec des points (`eyJhbGciOi...`) est identifié comme JWT (JSON Web Token) : ne pas se lancer dans du cracking de hash, mais dans du décodage JWT et de la manipulation d'algorithme (voir [[Techniques/Attaques JWT|Attaques JWT]]).

### Scénario 3 : plan d'attaque généré par lot depuis une fuite
```bash
# Tri de tout le fichier avec modes hashcat + John
hashid -m -j fuite.txt | tee tri.txt
# Extraire les hashes NTLM (mode 1000) pour lancer le crack ciblé
grep "NTLM" tri.txt | cut -d: -f1 > ntlm.txt
hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt
```

---

## 🛡️ Cybersecurity use cases

### Pentest / Red team
- **Tri des identifiants récupérés** : après un dump NTDS.dit, un dump LSASS ou une fuite de base, `hashid` classe chaque matériau pour choisir l'algorithme de crack, avec les modes hashcat sortis directement par `-m -j`.
- **Analyse de cookies/tokens** : identifier un JWT ou un format propriétaire avant toute tentative.

### CTF
Les flags sont souvent des hashes : identifier le type (MD5, SHA, bcrypt...) est la première étape avant déchiffrement.

### SOC / Blue team (utilisation défensive)
- **Analyse de fichiers suspects** : identifier le type de hash utilisé dans des artefacts (ex. hash de mot de passe dans un script malveillant).
- **Recherche d'occurrences** : croiser les hashes trouvés dans des logs avec des bases d'indicators.

---

## 🎯 MITRE ATT&CK

hashID n'est pas une technique à part entière mais un **outil de support** du vol d'identifiants et du cracking. Il intervient en aval des techniques de collecte de credentials :

| Technique | ID | Rôle de hashID |
|---|---|---|
| Brute Force / Password Cracking | T1110.002 | Fournit le type de hash et le mode d'attaque pour le cracking offline |
| Password Guessing | T1110.001 | Aide à trier les matériaux issus de guessing (logs, fuites) |
| OS Credential Dumping: LSASS | T1003.001 | Tri des hashes NTLM/LM extraits de mémoires LSASS |
| OS Credential Dumping: NTDS | T1003.003 | Tri des hashes NTLM/AES extraits d'un dump NTDS.dit |
| OS Credential Dumping: /etc/passwd & /etc/shadow | T1003.008 | Tri des hashs Unix (`$6$`, `$1$`, bcrypt...) |
| Valid Accounts | T1078 | Corrélation du hash avec le contexte du compte avant usage |

> [!note] À vérifier
> hashID ne correspond à aucun logiciel référencé dans ATT&CK (le plus proche, hashcat, est S0488). Le tableau décrit son rôle de support dans la chaîne de cracking, pas un mapping officiel.

---

## 🛡️ Defensive Security

### Indicateurs d'usage malveillant

La présence de hashID sur une machine n'est pas en soi malveillante (outil légitime, préinstallé sur Kali), mais son usage dans une chaîne d'attaque est corrélé à la collecte de credentials :

| Signe | Indicateur |
|---|---|
| Exécution après un dump LSASS/SAM/NTDS | `hashid` est exécuté juste après la collecte de hashes |
| Téléchargement de wordlists | Combinaison `hashid` + `rockyou.txt` + hashcat |

### Règles de détection (principes)

```text
sigma : exécution de hashid suivie d'un hashcat dans la même session
sigma : hashid exécuté depuis /tmp ou un dossier utilisateur récent
yara  : script Python "hashid.py" accompagné de "prototypes.json"
```

> [!note] À vérifier
> Pas de règles Sigma/YARA officielles pour hashID : fragments à adapter à son SIEM.

### Bonnes pratiques défensives

- Hachage fort (argon2id, bcrypt) + sel unique par utilisateur ; mots de passe longs, MFA, listes noires.
- Rotation des secrets de signature (cookies, tokens) et surveillance des fuites (Have I Been Pwned).

---

## 🤖 Automatisation

### Intégration dans un pipeline de cracking

```bash
# 1. Identifier tous les hashes d'un dump
hashid --no-color -m -j dump.txt -o resultat.txt

# 2. Extraire les modes uniques présents
grep "Hashcat Mode" resultat.txt | grep -oP 'Mode: \K[0-9]+' | sort -un

# 3. Lancer hashcat sur chaque mode
for mode in $(grep -oP 'Mode: \K[0-9]+' resultat.txt | sort -un); do
  hashcat -m "$mode" dump.txt wordlist.txt || true
done
```

> [!tip] 💡 **CI / logs**
> Dans un pipeline, `--no-color` évite les codes ANSI dans les logs ; `-o` produit un rapport stable analysable par un script.

---

## 📤 Output et parsing

### Format de sortie

```text
Analyzing '<hash>'
[+] <Type de hash> [Hashcat Mode: <N>] [JtR Format: <format>]
[+] <Type de hash 2>
```

Pour un fichier, la sortie est encadrée par `--File '<nom>'--` et `--End of file '<nom>'--`.

### Parsing en shell

```bash
# Ne garder que les modes hashcat
hashid -m hashes.txt | grep -oP 'Mode: \K[0-9]+' | sort -un

# Compter les types identifiés
hashid hashes.txt | grep "^\[+\]" | sort | uniq -c | sort -rn
```

---

## 🔗 Intégrations

| Outil | Intégration |
|---|---|
| hashcat | hashID fournit le numéro de mode `-m` à utiliser directement |
| John the Ripper | hashID fournit le format `--format` (ex. `raw-md5`, `sha512crypt`) |
| Name-That-Hash | Recoupement sur les formats modernes et ambigus |
| hash-identifier | Ancêtre interactif remplacé par hashID |

Exemple de chaîne complète : `dump NTDS` → `hashid -m -j` → `hashcat -m 1000` (NTLM) → vérification des cracks.

---

## 🔄 Alternatives

| Outil | Différence avec hashID |
|---|---|
| Name-That-Hash | Base plus récente (300+ formats), sortie normalisée, actif |
| hash-identifier | Interactif, vieillissant, sans modes hashcat/John |
| hashcat `--example-hashes` | Vérification des formats par exemple, mais pas d'identification |
| Services en ligne (CrackStation, hashes.org) | Identification + résolution de hashes connus, mais exfiltration du hash vers un tiers |

> [!warning] ⚠️ Confidentiel
> En contexte de pentest sur des données clients ou sensibles, privilégier une identification **locale** (hashID, Name-That-Hash) plutôt que des services en ligne, pour ne pas exfiltrer des hashes hors du périmètre.

---

## ⚡ Performance

- **Rapidité** : hashID applique des regex sur des chaînes courtes ; l'identification d'un hash est quasi instantanée (de l'ordre de la milliseconde), même sur des fichiers de plusieurs milliers de hashes.
- **Comparaison** : bien plus rapide en batch que l'interactif hash-identifier ; sans commune mesure avec le coût réel du cracking (hashID ne cracke pas).

> [!note] À vérifier
> Aucun benchmark officiel n'existe pour hashID. Ordres de grandeur reposant sur la nature regex du traitement et l'usage communautaire.

---

## 🛠️ Troubleshooting

| Problème | Cause probable | Solution |
|---|---|---|
| `bash: $... unexpected token` | Le `$` du hash est interprété par le shell | Utiliser des **guillemets simples** : `hashid '$6$...'` |
| Aucun candidat trouvé | Format non couvert par la base de signatures | Essayer `--extended`, puis Name-That-Hash |
| Sortie pleine de codes `\x1b` | Couleurs activées dans un pipe | Ajouter `--no-color` |
| `hashid` introuvable | binaire pip absent du PATH | Vérifier le PATH Python (`pip install --user` puis `~/.local/bin`) |
| Faux positif (ex. NTLM identifié MD5) | Longueur identique entre deux formats | Croiser avec le contexte (dump AD = NTLM) et Name-That-Hash |

---

## 🔐 Sécurité de l'outil

- **Licence** : GPLv3+ — libre, source ouverte, aucune dépendance (stdlib uniquement) : surface d'attaque minimale.
- **Maintenance** : dernière version 3.1.4 (2015) ; projet **peu actif** depuis — la base de signatures peut être obsolète sur les formats récents.
- **Données** : hashID ne contacte aucun serveur — les hashes restent en local (contrairement aux services d'identification en ligne).
- **Risque** : analyser un fichier non fiable ne présente pas de risque d'exécution de code, mais la fausse identification est le vrai danger (temps perdu, mauvais choix de mode).

---

## ⚠️ Limitations

- **Base de signatures vieillissante** (2015) : les formats récents (argon2, KDFs custom) peuvent manquer ou être mal classés.
- **Identification ≠ vérité** : la longueur et l'alphabet ne suffisent pas toujours ; un hash de 32 hex peut être MD5 **ou** NTLM — le contexte est décisif.
- **Pas un cracker** : hashID ne devine jamais le mot de passe ; il prépare uniquement le cracking.
- **Pas de mise à jour de la base en CLI** : il faut éditer `prototypes.json` ou attendre une nouvelle version.

---

## 📋 Cheatsheet

```bash
# Identifier un hash
hashid '<hash>'

# Avec modes hashcat + John
hashid -m -j '<hash>'

# Fichier / répertoire
hashid hashes.txt

# Mode étendu (formats rares, salés)
hashid -e '<hash>'

# Sortie propre pour pipeline
hashid --no-color -m -j -o rapport.txt hashes.txt
```

## ⚡ Quick reference

| Hash | Mode hashcat | Format John |
|---|---|---|
| MD5 | 0 | raw-md5 |
| SHA-1 | 100 | raw-sha1 |
| NTLM | 1000 | nt |
| bcrypt | 3200 | bcrypt |
| sha512crypt | 1800 | sha512crypt |
| phpass (`$P$`/`$H$`) | 400 | phpash |
| Apache (`$apr1$`) | 1600 | apr-md5 |
| Kerberos 5 TGS-REP | 13100 | krb5tgs |
| Kerberos 5 AS-REP | 18200 | krb5asrep |
| RACF | 8500 | racf |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Hashes récupérables (fichiers, cookies) | Hachage fort (argon2id, bcrypt) + sel unique par utilisateur |
| Mots de passe faibles crackables en ligne | Longueur minimale, listes noires de mots de passe |
| Fuite réutilisée sur d'autres services | MFA + surveillance des fuites (Have I Been Pwned) |
| Hachage réversible (encodage) | Ne jamais stocker de mot de passe en clair/encodé |
| Cookies signés avec des secrets faibles | Renforcer les secrets de signature, rotation périodique, algorithmes reconnus |
| Identifiants au format `user:hash` dans les bases | Séparer les identifiants des hashes dans le stockage, loguer les accès suspects |
| Exécution de hashid après un dump | Détection de chaîne : collecte → tri → cracking (corrélation Sigma) |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> - Utilise systématiquement `-m -j` pour avoir directement les commandes de crack prêtes à l'emploi.
> - Pour les formats ambigus, recoupe avec `Name-That-Hash` : deux outils valent mieux qu'un sur un hash qui rapporte gros.
> - Le mode `--extended` est utile sur les formats rares (crypt() Unix, formats applicatifs custom).
> - Passe un fichier entier plutôt qu'un hash isolé : `hashid -o` te donne un rapport exploitable par script.
> - En script/CI, ajoute `--no-color` pour éviter les codes ANSI dans les logs et les pipes.
> - Croise toujours avec le contexte : un hash de 32 hex venant d'un dump Active Directory est plus probablement NTLM que MD5 — l'algorithme seul ne fait pas le verdict.
> - `--brief` ne garde que les candidats « certain » (le reste est masqué) : utile dans un pipeline pour trancher vite entre deux formats.
> - Sur les systèmes Unix, mets le hash entre **guillemets simples** : le `$` des préfixes (`$6$`, `$P$`) est interprété par le shell sinon.

> [!warning] ⚠️ **Pièges**
> - La base de signatures de hashID est **ancienne** : certains formats récents (ex. bcrypt-PBKDF2 modernes, KDFs custom) peuvent manquer ou être mal classés.
> - L'outil est **100 % interactif/argumentaire simple** : pas de fuzzing ; il ne cracke pas, il identifie.
> - Ne fais pas confiance aveuglément : un candidat unique mais faux (ex. identifié MD5 alors que c'est un NTLM) te fera perdre du temps — vérifie toujours avec le contexte.
> - Une longueur identique entre deux formats n'est **jamais** une preuve : utilise le préfixe (quand il existe) et l'origine du hash.

---

## 📚 References

### Official
> [!info] 📚 **Sources**
> - [GitHub psypanda/hashID](https://github.com/psypanda/hashID)
> - [Page Kali hashid](https://www.kali.org/tools/hashid/)
> - [Site officiel psypanda.github.io/hashID](https://psypanda.github.io/hashID/)
> - [PyPI hashID](https://pypi.org/project/hashID/)

### Security & Community
> [!info] 📚 **Ressources complémentaires**
> - [hashcat example hashes (vérification des modes)](https://hashcat.net/wiki/doku.php?id=example_hashes)
> - [Openwall John wiki — sample hashes](https://openwall.info/wiki/john/sample-hashes)
> - [passlib (contexte des formats)](https://pythonhosted.org/passlib/)

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Techniques/Password Cracking|Password Cracking]] · [[Outils/Outil - Name-That-Hash|Name-That-Hash]] · [[Outils/Outil - hashcat|hashcat]]
