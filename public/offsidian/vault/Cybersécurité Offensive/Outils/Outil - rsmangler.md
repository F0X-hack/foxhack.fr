---
title: "Outil - rsmangler"
type: outil
categorie: Wordlists & Générateurs
tags:
  - cyber
  - outil
  - wordlists
statut: publie
version: 1.5 (2017-09-28)
licence: CC BY-SA 2.0 UK (Creative Commons Attribution-Share Alike)
langage: Ruby (aucune gem externe)
developpeur: Robin Wood (digininja)
repo: https://github.com/digininja/RSMangler
site: https://digi.ninja/projects/rsmangler.php
doc: https://github.com/digininja/RSMangler
---

# rsmangler — Mangleur de wordlists par permutations et mutations

> [!info] **En 1 phrase**
> rsmangler prend une petite liste de mots (noms, marques, produits) et la transforme en une wordlist réaliste : permutations, casse, leet, années, nombres et suffixes — le style John the Ripper en Ruby.

---

## Overview

| Champ | Valeur |
|---|---|
| Nom complet | RSMangler |
| Description | Applique à une wordlist d'entrée des manipulations type John the Ripper, plus un mode permutations qui combine chaque mot avec les autres |
| Catégorie | Wordlists & Générateurs |
| Sous-catégorie | Mutation / mangling de wordlists (CLI) |
| Fonction principale | Transformer une petite liste de mots-clés en une wordlist de candidats réalistes (permutations, casse, leet, chiffres, années, suffixes) |
| Type d'outil | CLI (script Ruby) |
| Licence | CC BY-SA 2.0 UK |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | Ruby (100 %), aucune dépendance externe |
| Développeur / organisation | Robin Wood (digininja) |
| Projet officiel | https://github.com/digininja/RSMangler |
| Dépôt officiel | https://github.com/digininja/RSMangler |
| Documentation officielle | README du dépôt + page digi.ninja |
| Date de création | 13/07/2010 (v1.0) |
| État du projet | maintenu (dernière release v1.5, 2018 sur Kali ; ~231 étoiles) |
| Dernière version connue | 1.5 |
| Systèmes compatibles | Linux (paquet Kali/Debian), macOS, Windows avec Ruby |

> [!note] Pour vérifier / compléter
> Version confirmée par le README officiel (v1.5, 28/09/2017) et par la sortie `rsmangler v 1.5` sous Kali.

---

## Concept

rsmangler (Robin Wood, digi.ninja) est l'étape « mangling » du pipeline de cracking : là où CeWL récolte des mots sur un site et CUPP interroge un profil, rsmangler **transforme** une petite liste de mots-clés en une wordlist de candidats humains réalistes. Son fonctionnement est inspiré des règles de John the Ripper, avec un point fort unique : le **mode permutations** qui combine chaque mot avec tous les autres (l'ordre compte : ce sont des permutations, pas des combinaisons) — `freds`, `fresh`, `fish` produisent ainsi `fredsfresh`, `freshfish`, `fredsfreshfish`, etc. Un **acronyme** des mots dans leur ordre d'entrée est aussi calculé et ajouté à la matière (`proactive security management` → `psm`), puis chaque mot issu de ces étapes subit les autres mangles.

La particularité contre-intuitive de l'outil : **tous les mangles sont actifs par défaut** ; les options servent à les désactiver. Autres transformations : nombres 1-123 et 01-09 en préfixe/suffixe, années 1990 → année courante, variations de casse (capitaliser, MAJUSCULES, minuscules, swap), leetspeak basique ou complet, inversion du mot, doublement, suffixes `ed`/`ing`, ponctuation, et préfixes/suffixes `admin`, `sys`, `pw`, `pwd`. La génération est streamée : depuis la v1.5, chaque mot est haché en CRC32 pour supprimer les doublons sans tout stocker en mémoire. Place dans un pentest : entre la collecte de mots-clés et le cracking (hashcat, John) ou le test en ligne (hydra) — l'outil qui « humanise » une liste brute.

```mermaid
flowchart LR
    A["Mots-clés (CeWL, CUPP, fichier)"] --> B["rsmangler"]
    B --> C["Permutations + acronyme"]
    C --> D["Mangles : casse, leet, chiffres, années, ed/ing..."]
    D --> E["Wordlist finale (dédupliquée CRC32)"]
    E --> F["hashcat / hydra / John"]
```

---

## Concepts fondamentaux

| Concept | Explication |
|---|---|
| Mangling | Application de transformations successives à un mot (casse, ajouts, substitutions) pour produire des variantes |
| Permutations | Combinaisons de tous les mots entre eux, **l'ordre compte** : `ab`, `ba`, `aba`, `bab`... (≠ combinaisons) |
| Acronyme | Suite des premières lettres des mots dans leur ordre d'entrée, ajoutée à la matière manglee |
| CRC32 | Empreinte numérique de chaque mot généré : sert à supprimer les doublons en mémoire (stockage d'un entier par mot) |
| Déduplication | Suppression des doublons **activée par défaut** ; `--allow-duplicates` la désactive pour aller plus vite |
| Mangles ON par défaut | Tous les mangles s'appliquent par défaut ; chaque option **désactive** le mangle correspondant |
| Longueurs min/max | `-m`/`--min` et `-x`/`--max` filtrent les mots générés selon leur longueur |
| STDIN / STDOUT | Entrée par fichier ou pipe (`--file -`) ; sortie vers stdout par défaut ou fichier via `--output` |

---

## Installation

### Debian / Ubuntu / Kali Linux

```bash
# Paquet officiel Kali/Debian (dépendance : ruby)
sudo apt update && sudo apt install -y rsmangler
rsmangler --help
```

### Arch / Fedora / RHEL / macOS

```bash
# Pas de paquet officiel ; installation depuis les sources
git clone https://github.com/digininja/RSMangler.git
cd RSMangler && chmod +x rsmangler.rb && ./rsmangler.rb --help
```

### Windows

```powershell
# Ruby requis (installer RubyInstaller), puis :
git clone https://github.com/digininja/RSMangler.git
cd RSMangler
ruby rsmangler.rb --help
```

### Docker

```bash
# Pas d'image officielle ; un conteneur ruby suffit
docker run --rm -v "$PWD:/data" -w /data ruby:3 \
  bash -c "git clone https://github.com/digininja/RSMangler.git 2>/dev/null && ruby RSMangler/rsmangler.rb --file mots.txt"
```

### Compilation depuis les sources

Inutile : le script s'exécute directement (`chmod +x rsmangler.rb`). Aucune gem ou binaire externe n'est requis.

> [!warning] Prérequis & problèmes potentiels
> Ruby doit être installé (la v1.5 supporte Ruby 1.9.x et plus). Sous Kali, le paquet `rsmangler` installe la commande `rsmangler` directement. L'avertissement « plus de 5 mots » n'est pas bloquant : `--force` le supprime.

---

## Configuration

Pas de fichier de configuration : tout se passe en options de ligne de commande. La règle d'or est de **désactiver les mangles inutiles** pour contrôler le volume et la pertinence.

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `--file` / `-f` | Fichier d'entrée (ou `-` pour stdin) | Chemin ou `-` | Définit les mots de base | `--file /tmp/mots.txt` |
| `--output` / `-o` | Fichier de sortie (ou `-` pour stdout) | Chemin ou `-` | Évite de tout garder en stdout | `-o /tmp/mangled.txt` |
| `--min` / `-m`, `--max` / `-x` | Longueurs min/max | Entiers | Filtre à la génération, réduit le volume | `-m 8 -x 14` |
| `--force` | Supprime l'avertissement > 5 mots | Booléen | Permet les grosses entrées (dangereux) | `--force` |
| `--allow-duplicates` | Autorise les doublons en sortie | Booléen | Plus rapide, moins de mémoire | `--allow-duplicates` |

---

## Architecture interne

RSMangler est un **script Ruby unique** (`rsmangler.rb`, ~400 lignes) sans gem externe. Son fonctionnement interne se décompose en trois étapes logiques. **Ingestion** : lecture du fichier (`--file`) ou du flux stdin (`--file -`), une ligne par mot, nettoyage des retours à la ligne et mots vides. **Expansion** : génération des permutations de tous les mots (n! — d'où l'explosion combinatoire) et de l'acronyme, qui rejoignent la liste des mots de travail ; ces nouveaux mots passent ensuite dans les autres mangles. **Mangling et émission** : chaque mot subit successivement les transformations actives (casse, leet, chiffres, années, ed/ing, doublage, ponctuation, préfixes/suffixes communs), chaque variante est filtrée par les bornes `-m`/`-x` puis — nouveauté v1.5 suggérée par Thomas d'Otreppe — hachée en **CRC32** ; si l'empreinte est inconnue, le mot est émis immédiatement (stdout ou fichier) et son CRC est mémorisé, sinon il est abandonné. Ce streaming évite de matérialiser toute la wordlist en mémoire : avant la v1.5, l'outil bufferisait tout puis appliquait `uniq`, ce qui pouvait dépasser 3 Go de RAM sur quelques centaines de mots.

Le leetspeak est géré par une table de substitutions (`a→4`, `e→3`, `i→1`, `o→0`, `s→5`...) : le mode basique (`-t`) remplace toutes les occurrences, le mode complet (`-T`, ajouté en v1.4 par Felipe Molina) énumère toutes les possibilités de substitution. Les préfixes/suffixes numériques (`--na/--nb`, `--pna/--pnb`) et les années (`--years`, depuis 1990) sont ajoutés en début ET fin de mot. L'outil est pensé pour être alimenté en pipe (`cat mots | rsmangler`) et consommé en pipe (`rsmangler ... | sort -u | hashcat`), ce qui en fait un composant scriptable du pipeline.

---

## Commandes

### Commandes principales

```bash
rsmangler [OPTION]
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `rsmangler --file wordlist.txt` | Manger un fichier avec toutes les mutations | Wordlist complète sur stdout |
| `cat wordlist.txt \| rsmangler` | Manger depuis stdin | Wordlist complète sur stdout |
| `rsmangler --file wordlist.txt --output mangled.txt` | Écrire dans un fichier | `/tmp/mangled.txt` créé |
| `cat mots.txt \| rsmangler -m 6 -x 8 > mid.txt` | Générer avec longueurs bornées 6-8 | Fichier filtré |
| `rsmangler -f mots.txt -m 8 -x 14 -o final.txt` | Longueurs 8-14 vers fichier | Fichier cadré politique |
| `rsmangler -f mots.txt -p -d -r -t` | Désactiver perms, double, reverse, leet | Mutations ciblées uniquement |
| `rsmangler --help` | Afficher l'aide et les options | Liste complète des flags |

### Commandes avancées

```bash
# Entrée pipée et sortie redirigée (pipeline CeWL → rsmangler → hashcat)
cewl -d 2 -m 5 -w - https://www.cible-example.com | rsmangler -m 8 -x 14 | \
  sort -u > /tmp/candidats.txt

# Modes dupliqués permis (plus rapide, plus de mémoire CPU) pour très grosse entrée
rsmangler --file /tmp/mots.txt --allow-duplicates --force -m 8 -x 16 > /tmp/brut.txt

# Leet complet uniquement sur une petite liste
printf "pet\n2020\n" | rsmangler -T -m 6 -x 12 | sort -u
```

---

## Options et flags

Toutes les options de mangling sont **ON par défaut** : les passer les désactive.

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `--help, -h` | Affiche l'aide | `rsmangler -h` | Basic |
| `--file, -f` | Fichier d'entrée (ou `-` pour stdin) | `-f mots.txt` / `-f -` | Basic |
| `--output, -o` | Fichier de sortie (ou `-` pour stdout) | `-o mangled.txt` | Basic |
| `--min, -m` | Longueur minimale | `-m 6` | Basic |
| `--max, -x` | Longueur maximale | `-x 8` | Basic |
| `--perms, -p` | Désactive les permutations | `-p` | Intermediate |
| `--double, -d` | Désactive le doublement des mots | `-d` | Intermediate |
| `--reverse, -r` | Désactive l'inversion | `-r` | Basic |
| `--leet, -t` | Désactive le leetspeak basique | `-t` | Basic |
| `--full-leet, -T` | Désactive le leet complet (toutes variantes) | `-T` | Intermediate |
| `--capital, -c` | Désactive la capitalisation | `-c` | Basic |
| `--upper, -u` | Désactive le tout majuscules | `-u` | Basic |
| `--lower, -l` | Désactive le tout minuscules | `-l` | Basic |
| `--swap, -s` | Désactive le swap de casse | `-s` | Basic |
| `--ed, -e` | Désactive le suffixe `ed` | `-e` | Basic |
| `--ing, -i` | Désactive le suffixe `ing` | `-i` | Basic |
| `--punctuation` | Désactive la ponctuation finale | `--punctuation` | Intermediate |
| `--pna` / `--pnb` | Désactive 01-09 en fin / début | `--pna` | Intermediate |
| `--na` / `--nb` | Désactive 1-123 en fin / début | `--nb` | Intermediate |
| `--years` | Désactive les années 1990→courante en début/fin | `--years` | Intermediate |
| `--acronym` | Désactive l'acronyme des mots | `--acronym` | Intermediate |
| `--common` | Désactive admin/sys/pw/pwd en préfixe/suffixe | `--common` | Intermediate |
| `--force` | Supprime l'avertissement > 5 mots | `--force` | Advanced |
| `--allow-duplicates` | Autorise les doublons (moins de mémoire) | `--allow-duplicates` | Advanced |

> [!tip] Options les plus utiles au quotidien
> `-f` + `-o` couvre l'usage de base. Toujours cadrer `-m`/`-x` (ex. `-m 8 -x 14`) pour respecter une politique et réduire le volume. Sur une entrée dépassant 5 mots, restreindre les mangles (`-p -d` par exemple) et passer `--force` en connaissance de cause. `-T` (leet complet) est précieux pour les cibles « leet typique ».

---

## Exemples pratiques

### Beginner

```bash
# Objectif : première wordlist mangée depuis un fichier
printf "acme\nsecurity\nadmin\n" > /tmp/mots.txt
rsmangler --file /tmp/mots.txt > /tmp/mangled.txt
wc -l /tmp/mangled.txt

# Objectif : générer depuis stdin
cat /tmp/mots.txt | rsmangler -m 6 -x 12 > /tmp/cadre.txt
```

### Intermediate

```bash
# Objectif : respecter une politique 8-14 caractères, vers fichier
rsmangler -f /tmp/mots.txt -m 8 -x 14 -o /tmp/final.txt

# Objectif : ne garder que les mutations utiles (désactiver le reste)
rsmangler -f /tmp/mots.txt -p -d -r -t -c -u -l -s -e -i -o /tmp/cibles.txt
```

### Advanced

```bash
# Objectif : leet complet sur une petite liste (toutes les variantes)
printf "pet\n2020\n" | rsmangler -T -m 6 -x 12 | sort -u > /tmp/leet.txt

# Objectif : croiser deux listes de mots-clés en amont (CeWL + noms)
cat /tmp/prenoms.txt /tmp/produits.txt > /tmp/melange.txt
rsmangler -f /tmp/melange.txt -m 8 -x 16 -o /tmp/croise.txt
```

### Expert

```bash
# Objectif : pipeline complet contexte → mangle → filtre → crack
cewl -d 2 -m 5 -w /tmp/site.txt https://www.cible-example.com
rsmangler -f /tmp/site.txt -m 8 -x 14 -o /tmp/mangled.txt
sort -u /tmp/mangled.txt | awk 'length($0)>=8 && length($0)<=14' > /tmp/final.txt
hashcat -m 1000 ntlm.txt /tmp/final.txt
# Astuce : réinjecter les cracks dans une seconde passe rsmangler
hashcat -m 1000 ntlm.txt --show | awk -F: '{print $NF}' > /tmp/crackes.txt
rsmangler -f /tmp/crackes.txt -m 8 -x 16 -o /tmp/etendus.txt
```

---

## Workflow complet (scénario pas à pas)

1. **Préparer une petite liste de mots-clés** (5 mots max recommandé, sinon les permutations explosent) :
   ```bash
   printf "acme\nsecurity\n2024\nadmin\n" > /tmp/mots.txt
   ```
2. **Générer avec toutes les mutations**, longueurs cadrées :
   ```bash
   rsmangler --file /tmp/mots.txt -m 4 -x 16 > /tmp/mangled.txt
   ```
3. **Vérifier la taille** — 3 mots → 5 345 lignes ; 5 mots → 108 557 ; au-delà, attention :
   ```bash
   wc -l /tmp/mangled.txt
   ```
4. **Filtrer doublons et longueur** (défense en profondeur sur la politique) :
   ```bash
   sort -u /tmp/mangled.txt | awk 'length($0)>=8 && length($0)<=15' > /tmp/final.txt
   ```
5. **Utiliser avec hashcat** (ou hydra en ligne, avec autorisation) :
   ```bash
   hashcat -m 1000 ntlm.txt /tmp/final.txt -r OneRuleToRuleThemAll.rule
   ```
6. **Itérer** : récupérer les cracks (`--show`) et les remanger pour élargir la couverture.

---

## Scénarios avancés

### Scénario 1 : wordlist d'entreprise à partir des mots du site

```bash
# 1. Collecter les mots du site avec CeWL
cewl -d 2 -m 5 -w /tmp/site.txt http://www.cible-example.com
# 2. Manger avec cadrage 8-14 caractères (politique typique)
rsmangler --file /tmp/site.txt -m 8 -x 14 -o /tmp/entreprise.txt
# 3. Cracker NTLM / NetNTLMv2
hashcat -m 5600 netntlmv2.txt /tmp/entreprise.txt -O
```

### Scénario 2 : leet complet ciblé

```bash
# Leet "complet" énumère toutes les combinaisons de substitution
printf "pet\n2020\n" | rsmangler -T -m 6 -x 12 | sort -u > /tmp/leet.txt
head -20 /tmp/leet.txt
# Ex. attendus : p3t, p3t2020, p3t2020!, pet2020!...
```

### Scénario 3 : liste croisée prénoms × produits (passphrases)

```bash
cat /tmp/prenoms.txt /tmp/produits.txt > /tmp/melange.txt
rsmangler -f /tmp/melange.txt -m 8 -x 16 -o /tmp/croise.txt
# Les permutations produisent "alexvpn", "vpnalex", "alexvpn2024"...
```

### Scénario 4 : seconde passe sur les mots déjà crackés

```bash
# Réutiliser les plaintext trouvés comme matière de remangling
hashcat -m 1000 ntlm.txt --show | awk -F: '{print $NF}' > /tmp/crackes.txt
rsmangler -f /tmp/crackes.txt -m 8 -x 16 -o /tmp/etendus.txt
hashcat -m 1000 ntlm.txt /tmp/etendus.txt
```

---

## Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Préparation d'attaque | Transformation des mots-clés (CeWL, CUPP, OSINT) en candidats mutés avant cracking (T1110) |
| Cracking hors-ligne | Wordlists pour hashcat / John (T1110.002) |
| Accès initial | Password guessing / spraying sur comptes humains (T1110.001 / .003) |
| Attaques Wi-Fi | Wordlists PSK mutées pour WPA/WPA2-PMKID |
| Post-exploitation | Réutilisation des patterns mutés entre services, tests de politique (T1110.004) |

---

## MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Credential Access | Brute Force: Password Guessing | T1110.001 | Candidats mangés testés en ligne | Échecs 4625 répétés par source | Verrouillage progressif, MFA |
| Credential Access | Brute Force: Password Cracking | T1110.002 | Wordlists crackées hors-ligne | Volume de logins anormal après fuite | MFA, rotation, politique robuste |
| Credential Access | Brute Force: Password Spraying | T1110.003 | Un candidat muté par compte | Échecs distribués sur comptes variés | MFA, alertes UEBA, seuils |
| Credential Access | Brute Force: Credential Stuffing | T1110.004 | Réutilisation des mutations découvertes | Logins réussis depuis IP/UA inhabituels | MFA, détection de creds recyclés |

> [!note] Ne renseigner que si l'association est réellement pertinente.

---

## Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Génération locale | Script Ruby en CLI, sans trafic réseau : invisible pour les sondes réseau |
| Traces sur poste | `rsmangler.rb`, wordlists `*.txt`, scripts de pipeline |
| Mots dérivés du contexte | Noms/marques + chiffres/années + leet dans les audits et logs d'échecs |
| Échecs de logon en rafale | Vagues de tentatives avec des variantes proches (mêmes bases mutées) |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Exemple Sigma — échecs d'authentification distribués (spraying)
title: Password Spraying - Multiple Failed Logon Types
status: experimental
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4625
    LogonType:
      - 3
      - 10
  timeframe: 15m
  condition:
    selection | count() by SourceNetworkAddress > 20
    and TargetUserName | count() distinct > 5
falsepositives:
  - Scripts de test d'intégration
level: medium
```

```bash
# Exemple Suricata — rafale d'échecs HTTP 401 depuis une source
alert tcp $EXTERNAL_NET any -> $HOME_NET 80 (msg:"Potential password spray - HTTP 401 storm"; flow:to_server,established; content:"HTTP/1.1 401"; threshold:type both, track by_src, count 30, seconds 300; classtype:attempted-recon; sid:1000047; rev:1;)
```

---

## Automatisation

```bash
# Bash — pipeline : CeWL → rsmangler → filtre → hashcat
cewl -d 2 -m 5 -w /tmp/site.txt https://www.cible-example.com
rsmangler -f /tmp/site.txt -m 8 -x 14 -o /tmp/mangled.txt
sort -u /tmp/mangled.txt | awk 'length($0)>=8 && length($0)<=14' > /tmp/final.txt
hashcat -m 1000 ntlm.txt /tmp/final.txt

# Bash — boucle d'itération : remanger les cracks pour élargir la couverture
for i in 1 2 3; do
  hashcat -m 1000 ntlm.txt /tmp/final.txt --show | awk -F: '{print $NF}' > /tmp/crackes.txt
  rsmangler -f /tmp/crackes.txt -m 8 -x 16 -o /tmp/etendus.txt
  sort -u /tmp/etendus.txt /tmp/final.txt > /tmp/final.txt
done
```

```python
# Python — orchestration : générer, filtrer, puis parser les résultats
import subprocess

def mangle(mots, min_len=8, max_len=14):
    proc = subprocess.run(
        ["rsmangler", "-f", "-", "-m", str(min_len), "-x", str(max_len)],
        input="\n".join(mots), text=True, capture_output=True)
    return sorted(set(l for l in proc.stdout.splitlines() if l))

candidats = mangle(["acme", "security", "admin"])
print(len(candidats), candidats[:10])

# Parser le potfile hashcat pour alimenter la passe suivante
with open("acme.pot") as f:
    cracks = [line.rstrip("\n").split(":", 1)[1] for line in f]
nouveaux = mangle(cracks)
print("cracks :", len(cracks), "-> étendus :", len(nouveaux))
```

---

## Output et parsing

La sortie est du **texte brut, un candidat par ligne** : stdout par défaut, ou fichier via `--output`. La déduplication CRC32 est active par défaut (désactivable).

```bash
# Afficher, compter, filtrer
rsmangler -f /tmp/mots.txt | head -20
rsmangler -f /tmp/mots.txt | wc -l
rsmangler -f /tmp/mots.txt | awk 'length($0)>=8 && length($0)<=14' | sort -u > /tmp/clean.txt

# Exemple d'entrée/sortie documenté (README) :
# freds fresh fish → freds, fresh, fish, fredsfresh, fredsfish, freshfreds, fishfreshfreds...
```

```python
# Python — parsing de la sortie et analyse des patterns
import collections
with open("/tmp/clean.txt") as f:
    mots = [l.strip() for l in f if l.strip()]
longueurs = collections.Counter(len(m) for m in mots)
fin_annee = sum(1 for m in mots if m[-4:].isdigit())
leet = sum(1 for m in mots if any(c in m for c in "@35$"))
print("total :", len(mots))
print("longueurs :", dict(longueurs))
print("fins par 4 chiffres :", fin_annee, "| avec leet :", leet)
```

---

## Intégrations

```text
CeWL / CUPP / SecLists → rsmangler (mangling) → wordlist → hashcat / hydra / John
rsmangler --stdin → pipelines : cat mots | rsmangler -m 8 -x 14 | sort -u | hashcat
rsmangler (remangle des cracks) → itération d'élargissement de la couverture
```

- [[Tools| Outils]]
- [[Outil - CeWL|CeWL]] et [[Outil - CUPP|CUPP]] — production des mots-clés en amont
- [[Outil - hashcat|hashcat]] et [[Outil - John the Ripper|John the Ripper]] — consommation des wordlists
- [[Outil - Mentalist|Mentalist]] — GUI et export de règles hashcat/John (alternative visuelle)
- [[Outil - pydictor|pydictor]] — alternative plus riche (plugins, outils de post-traitement)
- [[Outil - OneRuleToRuleThemAll|OneRuleToRuleThemAll]] — règles de mutation à la volée (complément)
- [[Techniques/Password Cracking| Password Cracking]] · [[Techniques/Password Spraying|Password Spraying]]

---

## Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| [[Outil - Mentalist|Mentalist]] | GUI, export de règles hashcat/John | GUI uniquement, contenus US | Prototypage visuel de patterns |
| [[Outil - pydictor|pydictor]] | Plugins, SEDB, outils de post-traitement | Config plus complexe | Automatisation scriptée complète |
| [[Outil - CUPP|CUPP]] | Profil OSINT de la victime | Pas de permutations de mots | Cible identifiée personnellement |
| hashcat `-r` (OneRule...) | Mutations à la volée, zéro fichier | Syntaxe à maîtriser | Cracking direct depuis un dico |
| [[Outil - Crunch|Crunch]] | Masques de position, très rapide | Pas de mangling humain | Bruteforce exhaustif |

> **Quand utiliser rsmangler plutôt que pydictor ou Mentalist ?** Quand on a une **petite liste de mots-clés** (≤5 mots) à transformer rapidement en CLI, avec le mode permutations comme valeur ajoutée. pydictor couvre plus de terrain (plugins, filtres, post-traitement) mais demande plus de configuration ; Mentalist apporte la visualisation et l'export de règles hashcat.

---

## Performance

Le coût est dominé par les **permutations** : le README documente 3 mots d'entrée → 5 345 mots de sortie, 5 mots → 108 557. Quelques centaines de mots font dépasser **3 Go de RAM** en mode bufferisé — d'où l'avertissement au-delà de 5 mots et l'option `--force` pour l'outrepasser. La v1.5 a changé l'architecture mémoire : au lieu de stocker toutes les chaînes puis de dédupliquer, chaque mot généré est émis immédiatement après vérification d'un **CRC32**, ce qui limite la RAM à un entier par mot unique et permet de streamer vers un fichier. La CPU reste le goulot (génération des permutations, substitutions leet) ; `--allow-duplicates` accélère en sautant la vérification de doublons. Les bornes `-m`/`-x` filtrent à l'émission (elles ne réduisent pas l'énumération des permutations). Pour des entrées importantes, restreindre les mangles (`-p -d -r`) et utiliser `--force` avec prudence.

---

## Troubleshooting

### Common problems

#### Problème : l'avertissement « plus de 5 mots » s'affiche

- **Cause** : la liste d'entrée dépasse 5 mots et les permutations exploseront.
- **Solution** : réduire l'entrée, désactiver `-p` (permutations), ou passer `--force` en connaissance de cause.
- **Vérification** : `wc -l` sur le fichier d'entrée avant lancement.

#### Problème : la sortie est vide ou minuscule

- **Cause** : les bornes `-m`/`-x` excluent tous les mots générés, ou le fichier d'entrée est vide.
- **Solution** : élargir les bornes, vérifier `-f` (chemin correct), tester sans `-m`/`-x`.
- **Vérification** : `wc -l` sur l'entrée, puis une passe sans bornes sur un échantillon.

#### Problème : la sortie contient des doublons

- **Cause** : `--allow-duplicates` a été passé (déduplication désactivée).
- **Solution** : retirer l'option, ou dédupliquer après coup (`sort -u`).
- **Vérification** : `sort -u fichier | wc -l` vs `wc -l fichier`.

#### Problème : « command not found: rsmangler »

- **Cause** : paquet non installé ou script non exécutable.
- **Solution** : `sudo apt install rsmangler` (Kali/Debian) ou `chmod +x rsmangler.rb && ./rsmangler.rb`.
- **Vérification** : `which rsmangler` ou `ruby rsmangler.rb --help`.

#### Problème : erreur Ruby « Gem not found » / syntax error

- **Cause** : version de Ruby trop ancienne (la v1.5 requiert Ruby 1.9+).
- **Solution** : mettre à jour Ruby, ou récupérer une version récente du script depuis GitHub.
- **Vérification** : `ruby --version`.

---

## Sécurité de l'outil

rsmangler est un script local sans réseau ni télémétrie : pas de collecte de données. Ses risques sont liés à l'usage : générer des candidats de mots de passe et les utiliser sans autorisation est illégal — l'outil ne doit servir que dans un cadre autorisé (audit mandaté, lab, CTF). Les wordlists produites contiennent des dérivés de données réelles (noms, dates, marques) : les considérer comme sensibles, les chiffrer au repos et les effacer après l'engagement. Côté supply chain, privilégier le dépôt officiel `digininja/RSMangler` ou le paquet Kali, et vérifier l'intégrité du script (petit, lisible, sans obfuscation). Aucune fonctionnalité de vol de données n'existe dans l'outil ; la licence CC BY-SA 2.0 UK impose d'attribuer l'auteur en cas de redistribution.

---

## Limitations

- **Explosion combinatoire** : les permutations deviennent vite ingérables (3 mots → 5 345 mots ; centaines de mots → 3 Go RAM avant v1.5, avertissement > 5 mots).
- **Avertissement > 5 mots** : entrées importantes nécessitent `--force` (danger de mémoire/CPU).
- **Pas de règles hashcat** : rsmangler produit des wordlists, pas des fichiers `.rule` (contrairement à Mentalist).
- **Options contre-intuitives** : tous les mangles actifs par défaut, chaque flag les désactive — risque de surprises.
- **Pas de plugins ni outils de post-traitement** : déduplication simple (CRC32), pas de comptage de fréquence ni fusion (voir pydictor).
- **Leet anglo-saxon** : table de substitution pensée pour l'anglais ; à compléter pour d'autres langues.

---

## Cheatsheet

```bash
# Installation
sudo apt install -y rsmangler          # Kali / Debian
git clone https://github.com/digininja/RSMangler.git && cd RSMangler
chmod +x rsmangler.rb && ./rsmangler.rb --help

# Usage de base
rsmangler --file wordlist.txt > /tmp/mangled.txt
cat wordlist.txt | rsmangler -m 6 -x 8 > /tmp/mid.txt
rsmangler -f mots.txt -m 8 -x 14 -o /tmp/final.txt

# Désactiver des mangles (tous ON par défaut)
rsmangler -f mots.txt -p -d -r -t -c -u -l -s -e -i -o /tmp/cibles.txt

# Leet complet
printf "pet\n2020\n" | rsmangler -T -m 6 -x 12 | sort -u

# Pipeline complet
cewl -d 2 -m 5 -w /tmp/site.txt https://www.cible-example.com
rsmangler -f /tmp/site.txt -m 8 -x 14 -o /tmp/mangled.txt
sort -u /tmp/mangled.txt | awk 'length($0)>=8 && length($0)<=14' > /tmp/final.txt
hashcat -m 1000 ntlm.txt /tmp/final.txt
```

---

## Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Manger une petite liste de mots-clés (permutations, casse, leet, chiffres, années, suffixes) en wordlist réaliste |
| **Quand l'utiliser ?** | Après CeWL/CUPP, avant hashcat/hydra : la transformation qui « humanise » les mots de base |
| **Commande principale** | `rsmangler --file mots.txt -m 8 -x 14 -o final.txt` |
| **Alternative principale** | pydictor (riche, plugins), Mentalist (GUI + règles), hashcat `-r` (mutations à la volée) |
| **Concepts importants** | Permutations (ordre compte), acronyme, déduplication CRC32, mangles ON par défaut, bornes `-m`/`-x` |
| **Liens associés** | [[Techniques/Password Cracking| Password Cracking]] · [[Outil - CeWL|CeWL]] · [[Outil - hashcat|hashcat]] |

---

## Détection & Défense

| Signe | Défense |
|---|---|
| Mots dérivés de noms/marques/années | Passphrases aléatoires multi-mots, gestionnaire de mots de passe |
| Réutilisation des mêmes bases mutées | MFA + rotation, détection de creds recyclés |
| Génération locale invisible en réseau | Mots de passe aléatoires 15+ caractères |
| Vagues d'échecs avec variantes proches | Verrouillage progressif, corrélation UEBA, règles Sigma |
| Wordlists retrouvées sur poste | Chiffrement, purge des données OSINT, surveillance EDR |

---

## Tips & Pièges

> [!tip] **Tips**
> Reste en dessous de **5 mots d'entrée** : les permutations explosent (3 mots → 5 345 lignes, 5 mots → 108 557). Cadre les longueurs dès la génération avec `-m`/`-x` pour coller à la politique et réduire le volume. Enchaîne CeWL → rsmangler → hashcat en pipeline. Réutilise les mots déjà crackés (`--show`) comme matière d'une seconde passe. Déduplique après coup avec `sort -u` pour un fichier propre.

> [!warning] **Pièges**
> Tous les mangles sont actifs par défaut : les options les **désactivent** — vérifie `rsmangler --help` avant de lancer. `-f` attend un fichier : pour stdin, précise `-f -` ou pipe sans argument. La sortie par défaut est stdout : redirige-la ou utilise `-o` (sinon un terminal sature). Les bornes `-m`/`-x` filtrent à l'émission mais ne réduisent pas l'énumération des permutations : le coût CPU/RAM est payé quand même. `--force` sur une grosse entrée peut faire exploser la mémoire.

---

## References

### Official

- Dépôt GitHub officiel : https://github.com/digininja/RSMangler
- Page du projet sur digi.ninja : https://digi.ninja/projects/rsmangler.php
- Page Kali Tools (paquet `rsmangler`) : https://www.kali.org/tools/rsmangler/

### Security references

- MITRE ATT&CK — Brute Force (T1110) : https://attack.mitre.org/techniques/T1110/
- MITRE ATT&CK — Password Cracking (T1110.002) : https://attack.mitre.org/techniques/T1110/002/
- OWASP Authentication Cheat Sheet : https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- NIST SP 800-63B (politiques de mots de passe) : https://pages.nist.gov/800-63-3/sp800-63b.html

### Community

- Licence CC BY-SA 2.0 UK : http://creativecommons.org/licenses/by-sa/2.0/uk/
- Crédits : Thomas d'Otreppe (streaming CRC32), Felipe Molina (leet complet), Gavin Watson (idée originale)
- Guides d'usage rsmangler (Kali Tools, blogs de wordlist mangling)

---

**Liens :** [[Tools| Outils]] · [[Outil - CeWL|CeWL]] · [[Techniques/Password Cracking| Password Cracking]] · [[Outil - hashcat|hashcat]] · [[Outil - Mentalist|Mentalist]] · [[Outil - pydictor|pydictor]] · [[Outil - OneRuleToRuleThemAll|OneRuleToRuleThemAll]]
