---
title: "Outil - pydictor"
type: outil
categorie: 🔑 Wordlists & Générateurs
tags:
  - cyber
  - outil
  - wordlists
statut: publie
version: 3.x (master, sans releases numérotées)
licence: GPL-3.0
langage: Python 2.7 & 3.x
developpeur: LandGrey
repo: https://github.com/LandGrey/pydictor
site: https://landgrey.github.io/pydictor
doc: https://landgrey.github.io/pydictor/docs/doc/usage.html
---

# 🐍 pydictor — Générateur de wordlists Python tout-en-un

> [!info] **En 1 phrase**
> pydictor est un générateur de wordlists Python ultra-complet : jeux de caractères, social engineering (SEDB), règles d'extension, plugins (birthday, pid...) et outils de post-traitement (merge, uniq, counter) en un seul outil.

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | pydictor |
| Description | « A powerful and useful hacker dictionary builder for a brute-force attack » : générateur et atelier de post-traitement de wordlists en Python |
| Catégorie | 🔑 Wordlists & Générateurs |
| Sous-catégorie | Génération / mutation / social engineering / post-traitement (CLI) |
| Fonction principale | Construire des wordlists par 7 moteurs (base, char, chunk, conf, pattern, extend, sedb) et les nettoyer via 8 outils intégrés |
| Type d'outil | CLI (Python) |
| Licence | GPL-3.0 |
| Open source / propriétaire | Open source |
| Langage(s) de programmation | Python 2.7 et 3.x (compatible Windows / Linux / macOS) |
| Développeur / organisation | LandGrey |
| Projet officiel | https://github.com/LandGrey/pydictor |
| Dépôt officiel | https://github.com/LandGrey/pydictor |
| Documentation officielle | https://landgrey.github.io/pydictor (docs usage + API) |
| Date de création | ~2016 (copyright 2016-2017 dans les en-têtes de scripts) |
| État du projet | maintenu (commit de décembre 2024, ~3,6 k étoiles) |
| Dernière version connue | master (pas de releases numérotées) |
| Systèmes compatibles | Windows / Linux / macOS — pré-installé sur BlackArch |

> [!note] Pour vérifier / compléter
> Le projet ne publie pas de versions numérotées : le suivi se fait sur la branche `master`. Les options exactes sont à confirmer avec `python3 pydictor.py -h`.

---

## 🎯 Concept

pydictor (LandGrey) est un couteau suisse de la génération de dictionnaires : il regroupe ce que Crunch, CUPP, Mentalist et plusieurs utilitaires de nettoyage font séparément, dans un seul script Python sans dépendance externe. Sept moteurs couvrent la production de mots : `-base` (jeux de caractères : `d` chiffres, `L` minuscules, `c` majuscules, combos `dL`, `dc`, `Lc`, `dLc`), `-char` (jeu de caractères personnalisé), `-chunk` (permutations de morceaux), `--conf` (moteur de syntaxe piloté par fichier de configuration), `--pattern` (masques positionnels type hashcat), `-extend` (extension de mots-clés via des règles configurables, niveau et leet), et `--sedb` (générateur social engineering interactif façon CUPP). Huit **outils** (`-tool`) post-traitent les listes : fusion (`combiner`), comparaison (`comparer`), comptage de fréquence (`counter`), filtrage (`handler`), suppression sécurisée (`shredder`), fusion+déduplication (`uniqbiner`), déduplication (`uniqifer`) et combinaison tête/corps/queue (`hybrider`). Des **plugins** (`-plug`) ajoutent des générateurs spécialisés : `birthday` (dates dans une plage), `pid4/6/8` (fins d'identifiants), `scratch` (mots-clés extraits d'un site), etc.

Sa place dans un pentest est celle de la **préparation d'attaque** : avant le cracking (hashcat, John) ou le brute force en ligne (hydra), pydictor fabrique la liste adaptée à la cible — politique de mot de passe connue, conventions d'entreprise, informations personnelles (SEDB). Sa force est l'intégration : on génère, on filtre, on compte les fréquences, on déduplique et on efface le tout avec le même outil, ce qui limite les fuites de données sensibles en fin d'engagement.

```mermaid
flowchart LR
    A["Moteurs : -base / -char / -chunk / --conf / --pattern / -extend / --sedb"] --> B["pydictor"]
    B --> C["Wordlist brute"]
    C --> D["Outils -tool : handler, uniqifer, counter, hybrider..."]
    D --> E["Wordlist finale"]
    E --> F["hashcat / hydra / John"]
```

---

## 🧠 Concepts fondamentaux

| Concept | Explication |
|---|---|
| Moteur (core type) | Mode de production de mots : C1 `base`, C2 `char`, C3 `chunk`, C4 `conf`, C5 `pattern`, C6 `extend`, C7 `sedb` |
| Jeu de base (`-base`) | Lettres/caractères sources : `d` (chiffres), `L` (minuscules), `c` (majuscules), `m` (mixtes), combos `dL`, `Lc`, `dLc` |
| Fonctions (F1-F4) | Filtres appliqués aux moteurs : `--head`/`--tail`, `--len`, `--encode`, `--occur`/`--types`/`--repeat`/`--regex` |
| `--occur` | Contraint le nombre d'occurrences : `--occur [lettres] [chiffres] [spéciaux]` ex. `--occur ">=4" "<6" "==0"` |
| `--types` | Contraint les types de caractères présents : `--types "<=8" "<=4" "==0"` |
| `--repeat` | Contraint les répétitions : `--repeat "<=3" ">=3" "==0"` |
| Niveau d'extension (`--level`) | Intensité des règles dans `-extend` : plus le niveau est haut, plus il y a de variantes |
| Leet mode | Substitutions chiffrées (table par défaut `a=4 b=6 e=3 l=1 i=1 o=0 s=5`), contrôlées par `--leet` |
| Encode | Transformation de chaque candidat en sortie : `--encode b64`/`md5`/`sha1`/`url` (+ scripts custom dans `/lib/encode/`) |
| SEDB | Social Engineering Data Base : générateur interactif à partir d'informations personnelles (`set cname...`, puis `run`) |
| `-tool` | Ateliers de post-traitement : T1-T8 (combiner, comparer, counter, handler, shredder, uniqbiner, uniqifer, hybrider) |

---

## 🛠️ Installation

### Debian / Ubuntu / Kali Linux

```bash
# Installation depuis les sources (aucune dépendance externe)
git clone --depth=1 --branch=master https://github.com/LandGrey/pydictor.git
cd pydictor
chmod +x pydictor.py
python3 pydictor.py -h
```

### Arch Linux / Fedora / RHEL / macOS

```bash
# BlackArch propose un paquet (pré-installé) : sudo pacman -S pydictor
# Sinon, identique aux autres distributions :
git clone --depth=1 --branch=master https://github.com/LandGrey/pydictor.git
cd pydictor && chmod +x pydictor.py
python3 pydictor.py -h
```

### Windows

```powershell
# Python doit être dans le PATH ; pas de chmod nécessaire
git clone --depth=1 --branch=master https://github.com/LandGrey/pydictor.git
cd pydictor
python pydictor.py -h
```

### Docker

```bash
# Pas d'image officielle ; un conteneur Python suffit
docker run --rm -v "$PWD:/pydictor" -w /pydictor python:3 \
  bash -c "git clone --depth=1 https://github.com/LandGrey/pydictor.git . 2>/dev/null; python pydictor.py -h"
```

### Compilation depuis les sources

Inutile : le script s'exécute tel quel. Les plugins, outils et encodeurs custom se déposent dans `/plugins/`, `/tools/` et `/lib/encode/` — ils sont chargés automatiquement au lancement.

> [!warning] ⚠️ Prérequis & problèmes potentiels
> Python 2.7 ou 3.x suffit, aucune dépendance pip. Les chemins des fichiers de configuration (`/funcfg/build.conf`, `extend.conf`, `leet_mode.conf`, `scratch.sites`) sont **relatifs au dossier du projet** : exécuter pydictor depuis sa racine. Sur les gros volumes, Python 3 est sensiblement plus rapide que Python 2.

---

## ⚙️ Configuration

pydictor se pilote par options de ligne de commande, mais aussi par des fichiers de configuration édités à la main :

| Fichier / Paramètre | Rôle | Impact | Exemple |
|---|---|---|---|
| `/funcfg/build.conf` | Moteur `--conf` : syntaxe de construction par défaut | Définit le dictionnaire généré avec `--conf` | `[0-9]{6,6}<none>[a-f]{2,2}<none>` |
| `/funcfg/extend.conf` | Règles d'extension de `-extend` (associées au `--level`) | Plus le niveau est élevé, plus il y a de mutations | niveau 4 > niveau 2 |
| `/funcfg/leet_mode.conf` | Table de substitution leet | Remplacements appliqués avec `--leet` | `a=4`, `e=3`, `s=5` |
| `/funcfg/scratch.sites` | Liste d'URLs pour le plugin `scratch` | Mots-clés extraits de chaque page | `http://www.example.com` |
| `/wordlist/` | Dossiers de listes faibles par catégorie (App, IoT, NiP, SEDB, Sys, Web, WiFi) | Annexées aux générations qui les sollicitent | `wordlist/Web/` |
| `-o` / `--output` | Fichier de sortie | Sans `-o`, la sortie tombe dans `results/` | `-o /tmp/dict.txt` |

---

## 🏗️ Architecture interne

pydictor est une suite de scripts Python organisée en modules. `lib/data/data.py` centralise les options globales (`pyoptions`), les chemins (`paths`) et les structures de sortie ; `lib/fun/fun.py` fournit les utilitaires (parcours de fichiers, affichage coloré `cool`) et `lib/fun/decorator.py` expose le décorateur `@magic` qui connecte un plugin/outil au pipeline global. Les moteurs produisent des **générateurs Python** (`yield`) : chaque candidat est filtré à la volée par les fonctions `--len`, `--occur`, `--types`, `--repeat`, `--regex`, `--head`, `--tail`, puis éventuellement encodé (`lib/encode/`) avant écriture, ce qui évite de matérialiser des listes gigantesques en mémoire. La sortie par défaut est le dossier `results/`.

L'extensibilité est l'ADN du projet : un plugin est un simple script dans `/plugins/` qui définit une fonction `nom_magic(*args)` décorée `@magic` et peut `yield` des valeurs ou les agréger dans une liste ; un outil suit le même contrat dans `/tools/` ; un encodeur est un module `nom_encode.py` dans `/lib/encode/` exposant `def nom_encode(item)`. Le CLI (`pydictor.py`) dispatche ensuite vers le moteur/outil/plugin demandé via les drapeaux `-base`, `-char`, `-chunk`, `--conf`, `--pattern`, `-extend`, `--sedb`, `-plug`, `-tool`, `--encode`. Enfin, les en-têtes de scripts confirment le modèle de licence GPL-3.0 et un disclaimer légal explicite (« Usage ... without prior mutual consent is illegal »).

---

## ⌨️ Commandes

### Commandes principales

```bash
python3 pydictor.py [moteur] [options] [-o fichier]
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `python3 pydictor.py -base dL --len 4 6 -o /tmp/base.txt` | Wordlist alphanumérique 4-6 caractères | Fichier `/tmp/base.txt` |
| `python3 pydictor.py -char "asdf123._@ " --len 1 3 --tail @site.com` | Mots sur un jeu custom avec suffixe | Liste `[jeu]{1-3}@site.com` |
| `python3 pydictor.py -chunk abc 123 "!@#" --head a --tail pass` | Permutations de morceaux | Combinaisons de chunks |
| `python3 pydictor.py --conf` | Dictionnaire via `/funcfg/build.conf` | Wordlist du fichier de config |
| `python3 pydictor.py --pattern "[0-9]{1,1}<none>[a-z]{1,1}<none>"` | Masque positionnel rapide | Motifs type `0a1b...` |
| `python3 pydictor.py -extend admin --level 4 --len 4 16 --leet 0 1 2` | Extension par règles + leet | Variantes d'`admin` |
| `python3 pydictor.py --sedb` | Social engineering interactif | Wordlist du profil (`set ...` puis `run`) |
| `python3 pydictor.py -plug birthday 19800101 20001231 --len 6 8` | Dates de naissance sur une plage | Liste de dates formatées |
| `python3 pydictor.py -tool counter s huge.txt 1000` | Fréquence des mots | Top 1000 par fréquence |

---

## 🎚️ Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `-base TYPE` | Jeu de base : `d` chiffres, `L` minuscules, `c` majuscules, combos `dL`, `dc`, `Lc`, `dLc` | `-base dL` | Basic |
| `--len min max` | Bornes de longueur | `--len 4 8` | Basic |
| `--head` / `--tail` | Préfixe / suffixe fixe | `--head Pa5sw0rd --tail @acme.com` | Basic |
| `-o` / `--output` | Fichier de sortie (sinon `results/`) | `-o /tmp/dict.txt` | Basic |
| `-char "jeu"` | Jeu de caractères personnalisé | `-char "asdf123._@ "` | Basic |
| `-chunk m1 m2 ...` | Permutations de morceaux | `-chunk abc 123 "!@#"` | Intermediate |
| `--conf [fichier]` | Moteur syntaxe depuis un fichier ou une chaîne | `--conf "[0-9]{6,6}<none>"` | Intermediate |
| `--pattern "..."` | Masque positionnel (éléments `{1,1}` uniquement) | `--pattern "[0-9]{1,1}<none>[a-z]{1,1}<none>"` | Intermediate |
| `-extend mots...` | Extension par règles (`--level`, `--leet`, `--more`) | `-extend admin --level 4` | Intermediate |
| `--occur "a" "d" "s"` | Occurrences lettres/chiffres/spéciaux | `--occur ">=4" "<=6" "==0"` | Advanced |
| `--regex "..."` | Filtre par expression régulière | `--regex "^z.*?g$"` | Advanced |
| `--leet codes` | Codes de substitution leet | `--leet 0 1 2 11 21` | Advanced |
| `--encode enc` | Encode chaque candidat | `--encode md5` | Intermediate |
| `--sedb` | Générateur social engineering interactif | `--sedb` | Intermediate |
| `-plug nom` | Plugin (birthday, pid4/6/8, scratch, ftp...) | `-plug pid6 --encode b64` | Advanced |
| `-tool nom` | Outil (combiner, comparer, counter, handler, shredder, uniqbiner, uniqifer, hybrider) | `-tool uniqifer /tmp/dicts.txt` | Intermediate |

> [!tip] Options les plus utiles au quotidien
> `-base dL` + `--len` + `--head/--tail` couvre 80 % des besoins simples. `-extend` avec `--level 2` puis `--leet` donne des variantes humaines réalistes. `-tool handler` avec `--occur`/`--len` affûte une liste brute ; `-tool uniqifer` élimine les doublons. Sans `-o`, vérifie `results/`.

---

## 🧪 Exemples pratiques

### Beginner

```bash
# Objectif : première wordlist numérique en 5 caractères
python3 pydictor.py --len 5 5 -base d -o /tmp/digits.txt

# Objectif : minuscules 4-6 caractères
python3 pydictor.py -base L --len 4 6 -o /tmp/alpha.txt
```

### Intermediate

```bash
# Objectif : préfixe + chiffres + suffixe (convention d'entreprise)
python3 pydictor.py -base d --len 4 4 --head Acme --tail ! -o /tmp/acme.txt

# Objectif : permutation de morceaux avec suffixe
python3 pydictor.py -chunk admin root "!@#" @ . _ --head a --tail pass -o /tmp/chunk.txt
```

### Advanced

```bash
# Objectif : extension d'un mot-clé avec règles et leet
python3 pydictor.py -extend admin support --level 3 --len 4 16 --leet 0 1 2 11 -o /tmp/ext.txt
python3 pydictor.py -tool handler /tmp/brute.txt --len 8 16 --occur ">=4" ">0" "==0" -o /tmp/filtre.txt
```
### Expert

```bash
# Objectif : pipeline complet — scratch → extend → handler → uniqifer → hashcat
python3 pydictor.py -plug scratch http://www.cible-example.com -o /tmp/scrape.txt
python3 pydictor.py -extend /tmp/scrape.txt --level 4 --leet 0 1 2 -o /tmp/expand.txt
python3 pydictor.py -tool handler /tmp/expand.txt --len 8 16 --occur ">=4" ">0" "==0" -o /tmp/propre.txt
python3 pydictor.py -tool uniqifer /tmp/propre.txt --output /tmp/final.txt
wc -l /tmp/final.txt
hashcat -m 1000 ntlm.txt /tmp/final.txt
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Comprendre la cible** — politique de mot de passe, convention d'entreprise, infos OSINT (prénoms, dates, produits) :
   ```bash
   # Ex. : société acme, mots de passe type "Acme<4 chiffres>!" : 8-9 caractères
   ```
2. **Générer le cœur de la liste** (préfixe + chiffres + suffixe) :
   ```bash
   python3 pydictor.py -base d --len 4 4 --head Acme --tail ! -o /tmp/acme.txt
   ```
3. **Étendre les mots-clés** (prénoms, services) avec règles + leet :
   ```bash
   python3 pydictor.py -extend alex marie admin vpn --level 3 --len 4 16 --leet 0 1 2 -o /tmp/ext.txt
   ```
4. **Ajouter une passe social engineering** (SEDB) si des infos personnelles sont connues :
   ```bash
   python3 pydictor.py --sedb
   # set cname alex ; set birth 19850312 ; set usedpwd alex123. ; run
   ```
5. **Fusionner et filtrer** selon la politique (longueur, occurrence) :
   ```bash
   python3 pydictor.py -tool handler /tmp/ext.txt --len 8 16 --occur ">=4" ">0" "==0" -o /tmp/propre.txt
   ```
6. **Dédupliquer** la liste finale :
   ```bash
   python3 pydictor.py -tool uniqifer /tmp/propre.txt --output /tmp/final_uniq.txt
   ```
7. **Utiliser la liste** dans hashcat (hors-ligne) ou hydra (en ligne, avec prudence et autorisation).

---

## 🎬 Scénarios avancés

### Scénario 1 : dates de naissance sur une plage

```bash
# Plugin birthday : toutes les dates entre 1980 et 2000, longueur 6-8
python3 pydictor.py -plug birthday 19800101 20001231 --len 6 8 -o /tmp/birth.txt
# Variante encodée en MD5 (utile pour des hashes MD5 non salés)
python3 pydictor.py -plug birthday 19800101 20001231 --len 8 8 --encode md5 -o /tmp/birth_md5.txt
```

### Scénario 2 : scraper un site puis étendre les mots

```bash
# 1. Extraire les mots-clés des pages (plugin scratch)
python3 pydictor.py -plug scratch http://www.cible-example.com -o /tmp/scrape.txt
# 2. Étendre chaque mot avec règles, leet et niveaux
python3 pydictor.py -extend /tmp/scrape.txt --level 4 --leet 0 1 2 -o /tmp/expand.txt
# 3. Filtrer puis cracker
python3 pydictor.py -tool handler /tmp/expand.txt --len 8 16 --occur ">=4" ">0" "==0" -o /tmp/final.txt
```

### Scénario 3 : wordlist « politique de sécurité » connue

```bash
# Contrainte type : 8 caractères, au moins une majuscule, un chiffre, un symbole
python3 pydictor.py -base Lc --len 8 8 --tail "!" -o /tmp/pattern.txt
python3 pydictor.py -tool handler /tmp/pattern.txt --occur ">=1" ">=1" ">=1" -o /tmp/conformes.txt
# Les mots conformes sont les plus probables sous cette politique
```

### Scénario 4 : analyse de fréquence pour hiérarchiser les candidats

```bash
# Compter les fréquences d'une liste brute (fuite, historique) et garder le top
python3 pydictor.py -tool counter vs /tmp/brute.txt 100 --encode url -o /tmp/freq.txt
# Puis filtrer par longueur pour nourrir hashcat dans l'ordre de probabilité
python3 pydictor.py -tool handler /tmp/freq.txt --len 6 16 -o /tmp/top.txt
```

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Préparation d'attaque | Génération de wordlists sur mesure (politique, conventions, infos OSINT) avant cracking (T1110) |
| Cracking hors-ligne | Production de candidats pour hashcat / John (T1110.002) |
| Accès initial | Password guessing / spraying sur comptes humains (T1110.001 / .003) |
| Attaques Wi-Fi | Wordlists PSK mutées (plugins + extend) pour WPA/WPA2-PMKID |
| Post-exploitation | Réutilisation des patterns mutés entre services, tests de politique (T1110.004) |
| Nettoyage opérationnel | `-tool shredder` pour effacer les listes sensibles après usage |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Credential Access | Brute Force: Password Guessing | T1110.001 | Wordlists générées testées en ligne | Échecs 4625 répétés par source | Verrouillage progressif, MFA |
| Credential Access | Brute Force: Password Cracking | T1110.002 | Wordlists crackées hors-ligne | Volume de logins anormal après fuite | MFA, rotation, politique robuste |
| Credential Access | Brute Force: Password Spraying | T1110.003 | Un candidat muté par compte | Échecs distribués sur comptes variés | MFA, alertes UEBA, seuils |
| Credential Access | Brute Force: Credential Stuffing | T1110.004 | Réutilisation des mutations découvertes | Logins réussis depuis IP/UA inhabituels | MFA, détection de creds recyclés |

> [!note] Ne renseigner que si l'association est réellement pertinente.

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Génération locale | S'exécute en CLI, sans trafic réseau : difficile à détecter depuis le réseau |
| Traces sur poste | Scripts `pydictor.py`, dossiers `results/`, fichiers `.txt` de wordlists |
| Mots dérivés du contexte | Prénom + date + symbole, leet `a→4`, noms de produits dans les logs/audits |
| Échecs de logon en rafale | Vagues de tentatives sur de nombreux comptes (guessing/spraying) |

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
alert tcp $EXTERNAL_NET any -> $HOME_NET 80 (msg:"Potential password spray - HTTP 401 storm"; flow:to_server,established; content:"HTTP/1.1 401"; threshold:type both, track by_src, count 30, seconds 300; classtype:attempted-recon; sid:1000046; rev:1;)
```

---

## 🤖 Automatisation

```bash
# Bash — pipeline complet de génération → filtrage → cracking
python3 pydictor.py -plug scratch http://www.cible-example.com -o /tmp/scrape.txt
python3 pydictor.py -extend /tmp/scrape.txt --level 4 --leet 0 1 2 -o /tmp/expand.txt
python3 pydictor.py -tool handler /tmp/expand.txt --len 8 16 --occur ">=4" ">0" "==0" -o /tmp/propre.txt
python3 pydictor.py -tool uniqifer /tmp/propre.txt --output /tmp/final.txt
hashcat -m 1000 ntlm.txt /tmp/final.txt

# Bash — boucle sur plusieurs mots-clés
for mot in admin support vpn; do
  python3 pydictor.py -extend $mot --level 2 --len 6 16 -o /tmp/ext_$mot.txt
done
cat /tmp/ext_*.txt | sort -u > /tmp/all.txt
```

```python
# Python — plugin maison via le décorateur @magic
# Fichier /plugins/societe.py : python3 pydictor.py -plug societe acme
from lib.fun.fun import cool
from lib.fun.decorator import magic
from lib.data.data import pyoptions

def societe_magic(*args):
    """[mot_cle]..."""
    args = list(args[0])
    if len(args) == 1:
        exit(pyoptions.CRLF + cool.fuchsia("[!] Usage: {}".format(pyoptions.plugins_info.get(args[0]))))

    @magic
    def societe():
        for mot in args[1:]:
            for annee in ["2020", "2021", "2022", "2023", "2024"]:
                yield mot + annee + "!"
    return societe
```

---

## 📤 Output et parsing

La sortie par défaut va dans `results/` ; `-o`/`--output` la redirige dans un fichier. Les candidats peuvent être encodés (`--encode b64|md5|sha1|url`) et les outils `counter`/`handler`/`uniqifer` produisent des fichiers prêts à parser.

```bash
# Afficher et compter la sortie
cat /tmp/final.txt | head -20
wc -l /tmp/final.txt

# Compter les fréquences (top 100) et écrire dans un fichier trié
python3 pydictor.py -tool counter s /tmp/brute.txt 100 -o /tmp/top100.txt

# Comparer deux listes (différences)
python3 pydictor.py -tool comparer /tmp/big.txt /tmp/small.txt
```

```python
# Python — parser un potfile hashcat après crack avec la liste pydictor
import collections
with open("acme.pot") as f:
    plains = [line.rstrip("\n").split(":", 1)[1] for line in f]
longueurs = collections.Counter(len(p) for p in plains)
fin_annee = sum(1 for p in plains if p[-4:].isdigit())
print("longueurs :", dict(longueurs))
print("fins par 4 chiffres :", fin_annee, "/", len(plains))
```

---

## 🔗 Intégrations

```text
OSINT / CeWL / CUPP → pydictor (-extend / --sedb) → wordlist → hashcat / hydra / John
pydictor (-plug scratch) → mots-clés du site → -extend → candidats contextuels
pydictor (-tool handler/uniqifer/counter) → nettoyage de n'importe quelle wordlist
pydictor (-plug birthday / pid4-8) → listes spécialisées (dates, identifiants)
```

- [[Tools|🧰 Outils]]
- [[Outil - CUPP|CUPP]] — profil social engineering alternatif (interactif, profils OSINT)
- [[Outil - Crunch|Crunch]] et [[Outil - kwprocessor|kwprocessor]] — génération par masques / clavier
- [[Outil - Mentalist|Mentalist]] — GUI et export de règles hashcat/John
- [[Outil - rsmangler|rsmangler]] — mutations de mots en CLI (alternative légère)
- [[Outil - hashcat|hashcat]] et [[Outil - John the Ripper|John the Ripper]] — consommation des wordlists
- [[Outil - SecLists|SecLists]] — wordlists prêtes à l'emploi, complémentaires
- [[Techniques/Password Cracking|🔐 Password Cracking]] · [[Techniques/Password Spraying|Password Spraying]]

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| [[Outil - CUPP|CUPP]] | Spécialisé profil OSINT, simple | Pas de post-traitement ni plugins | Cible identifiée personnellement |
| [[Outil - Crunch|Crunch]] | Masques de position, très rapide | Pas de social engineering ni outils | Bruteforce exhaustif |
| [[Outil - Mentalist|Mentalist]] | GUI, export de règles hashcat/John | GUI uniquement, contenus US | Prototypage visuel de patterns |
| [[Outil - rsmangler|rsmangler]] | CLI minimal, mutations variées | Peu d'options de filtrage | Linux/automatisation rapide |
| hashcat `-r` | Mutations à la volée, zéro stockage | Syntaxe à maîtriser, pas de génération | Cracking direct depuis un dico |
| OneRuleToRuleThemAll | Règle éprouvée sur fuites réelles | Ne génère pas depuis le vide | Cracking hors-ligne massif |

> **Quand utiliser pydictor plutôt que Crunch ou CUPP ?** Quand le besoin combine plusieurs étapes (génération → filtrage → fréquence → dédup → effacement) dans un seul outil Python, ou quand on veut des plugins spécialisés (birthday, pid, scratch) et une API d'extension. Pour une simple génération par masques, Crunch reste plus rapide ; pour un profil OSINT pur, CUPP est plus direct.

---

## ⚡ Performance

pydictor est du Python pur : la génération est **flottante** via générateurs (`yield`), ce qui limite la mémoire même sur de gros volumes, mais le CPU reste le facteur limitant — Python 3 est nettement plus rapide que Python 2 (indiqué dans la doc officielle). Le coût réel est combinatoire : `-base dLc --len 8 8` représente 218 340 105 584 896 candidats (62^8), une impossibilité ; `-base d --len 8 8` (100 M) est déjà volumineux. Les filtres `--occur`/`--types`/`--repeat`/`--regex` ne réduisent pas l'énumération (ils s'appliquent après génération), contrairement à `--len` et `--head/--tail` qui bornent le travail. `--encode` ajoute un coût CPU par candidat (pertinent surtout sur des listes courtes). Pour de très gros volumes, le **masque hashcat** (`-a 3`) en C/GPU reste des ordres de grandeur plus rapide que l'énumération Python ; pydictor excelle sur les volumes « humains » (milliers à millions de candidats) et le post-traitement.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : « No module named ... » au lancement

- **Cause** : les chemins relatifs (`lib/`, `funcfg/`) sont cassés car pydictor est lancé depuis un autre dossier.
- **Solution** : se placer à la racine du dépôt pydictor avant `python3 pydictor.py`.
- **Vérification** : `ls lib/ funcfg/` depuis le répertoire de travail.

#### Problème : sortie introuvable

- **Cause** : aucune `-o`/`--output` fournie, la wordlist va dans `results/`.
- **Solution** : `ls -la results/` ou préciser `-o /tmp/dict.txt`.
- **Vérification** : la fin de l'exécution affiche le chemin d'écriture.

#### Problème : volume explosif / génération trop lente

- **Cause** : jeu de caractères trop large pour la longueur demandée.
- **Solution** : réduire `--len`, restreindre `-base`, ou passer par masques hashcat pour l'exhaustif.
- **Vérification** : `python3 pydictor.py --len 5 5 -base d -o /tmp/test.txt && wc -l` sur un échantillon.

#### Problème : `-extend` génère trop de variantes

- **Cause** : `--level` trop élevé pour le nombre de mots-clés.
- **Solution** : commencer par `--level 2`, augmenter progressivement, utiliser `--occur` pour filtrer.
- **Vérification** : `wc -l` sur une première sortie avant de généraliser.

#### Problème : `--sedb` ne démarre pas

- **Cause** : l'interactif attend des entrées (`set`, `run`) et un terminal ; certaine configs manquent.
- **Solution** : relancer dans un terminal interactif et suivre le format : `set cname X`, puis `run`.
- **Vérification** : l'écran affiche la configuration courante avant génération.

---

## 🔐 Sécurité de l'outil

pydictor s'exécute localement sans télémétrie ni réseau (sauf le plugin `scratch` qui **interroge les URLs** listées dans `/funcfg/scratch.sites` ou passées en argument). Le README porte un disclaimer explicite : l'utilisation sans consentement mutuel préalable est illégale ; la responsabilité incombe à l'utilisateur. Points de vigilance : les wordlists générées contiennent des données personnelles reconstruites (SEDB) ou des candidats sensibles — les protéger et les **effacer proprement** avec `-tool shredder` après usage (d'où son existence). Le plugin `scratch` génère du trafic HTTP vers la cible : prévoir un proxy et une autorisation. Enfin, en environnement professionnel, l'installation depuis le dépôt officiel est préférable à tout binaire ou copie non vérifiée (risque de supply chain). Aucune fonctionnalité de vol de données n'existe dans l'outil.

---

## ⚠️ Limitations

- **Python pur, CPU-bound** : lent sur les volumes exhaustifs — préférer les masques hashcat (`-a 3`) pour l'énumération massive.
- **Pas de GUI** : tout se passe en CLI (contrairement à Mentalist).
- **Filtres post-génération** : `--occur`/`--types`/`--repeat`/`--regex` ne réduisent pas l'énumération, ils filtrent après coup — la génération reste coûteuse.
- **Documentation en chinois en priorité** : la doc d'usage officielle est principalement en chinois (une doc anglaise historique existe sur une ancienne branche).
- **Config par fichiers locaux** : `build.conf`, `extend.conf`, `leet_mode.conf` sont sensibles au répertoire de lancement.
- **Leet anglo-saxon** : table par défaut pensée pour l'anglais ; à adapter pour d'autres langues.
- **Pas de sortie de règles hashcat** : pydictor produit des wordlists, pas des `.rule` (contrairement à Mentalist).

---

## 📋 Cheatsheet

```bash
# Génération basique
python3 pydictor.py -base dL --len 4 6 -o /tmp/base.txt
python3 pydictor.py -char "asdf123._@ " --len 1 3 --tail @site.com
python3 pydictor.py -chunk abc 123 "!@#" @ . _ --head a --tail pass

# Masque / pattern
python3 pydictor.py --pattern "[0-9]{1,1}<none>[a-z]{1,1}<none>" -o /tmp/patt.txt

# Extension + leet
python3 pydictor.py -extend admin --level 4 --len 4 16 --leet 0 1 2 11 -o /tmp/ext.txt

# Social engineering interactif
python3 pydictor.py --sedb

# Plugins
python3 pydictor.py -plug birthday 19800101 20001231 --len 6 8
python3 pydictor.py -plug scratch http://www.cible-example.com
python3 pydictor.py -plug pid6 --encode b64

# Outils de post-traitement
python3 pydictor.py -tool combiner /tmp/dir
python3 pydictor.py -tool comparer big.txt small.txt
python3 pydictor.py -tool counter s huge.txt 1000
python3 pydictor.py -tool handler raw.txt --len 6 16 --occur ">=4" ">0" "==0"
python3 pydictor.py -tool shredder
python3 pydictor.py -tool uniqifer /tmp/dicts.txt --output /tmp/uniq.txt
python3 pydictor.py -tool hybrider heads.txt bodies.txt tails.txt
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Générer, étendre, encoder, filtrer, fusionner et effacer des wordlists en un seul outil Python |
| **Quand l'utiliser ?** | Préparation d'attaque : wordlists sur mesure (politique, OSINT, Wi-Fi) avant cracking ou spray |
| **Commande principale** | `python3 pydictor.py -base dL --len 4 8 -o dict.txt` puis `-tool handler/uniqifer` |
| **Alternative principale** | CUPP (profil OSINT), Crunch (masques), Mentalist (GUI), rsmangler (mutations) |
| **Concepts importants** | 7 moteurs C1-C7, 8 outils T1-T8, filtres `--occur`/`--types`/`--repeat`/`--regex`, plugins, `--encode` |
| **Liens associés** | [[Techniques/Password Cracking|🔐 Password Cracking]] · [[Outil - CUPP|CUPP]] · [[Outil - hashcat|hashcat]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Mots de passe dérivés d'infos perso (SEDB) | Passphrases non-prédictibles, gestionnaire de mots de passe |
| Réutilisation des schémas entre services | MFA + rotation, détection de creds recyclés |
| Génération locale invisible en réseau | Mots de passe aléatoires 15+ caractères |
| Politique trop permissive (8 caractères) | Complexité minimale, blacklist des patterns, contrôle d'entropie |
| Traces `pydictor`/`results/` sur poste | Chiffrement, purge des données OSINT, surveillance EDR |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> Les codes `-base` sont sensibles à la casse : `L` = minuscules, `c` = majuscules — vérifie avec `-h`. Chaîne `-base` + `--head/--tail` + `--len` pour coller à une politique connue. Combine `-tool counter` (fréquence) puis `-tool handler` (filtre) pour affûter une liste brute. Sans `-o`, la sortie tombe dans `results/`. Termine toujours par `-tool shredder` pour effacer les listes sensibles.

> [!warning] ⚠️ **Pièges**
> Le volume explose vite : `-base dLc --len 8 8` est irréaliste — borne `--len` et le jeu de caractères. `--sedb` et `-plug scratch` supposent des réponses interactives ou des URLs valides : prépare-les avant. `-extend` génère énormément de variantes selon `--level` — commence par `--level 2`. `--occur`/`--types` filtrent **après** génération : le coût CPU reste payé. Exécute pydictor depuis sa racine (chemins relatifs de `lib/` et `funcfg/`).

---

## 📚 References

### Official

- Dépôt GitHub officiel : https://github.com/LandGrey/pydictor
- Site officiel / documentation : https://landgrey.github.io/pydictor
- Documentation d'usage (usage.md) : https://landgrey.github.io/pydictor/docs/doc/usage.html
- Documentation API développeurs (api.md) : https://landgrey.github.io/pydictor/docs/doc/api.html

### Security references

- MITRE ATT&CK — Brute Force (T1110) : https://attack.mitre.org/techniques/T1110/
- MITRE ATT&CK — Password Spraying (T1110.003) : https://attack.mitre.org/techniques/T1110/003/
- OWASP Authentication Cheat Sheet : https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- NIST SP 800-63B (politiques de mots de passe) : https://pages.nist.gov/800-63-3/sp800-63b.html

### Community

- Hacking Articles — « Comprehensive Guide on Pydictor » : https://www.hackingarticles.in/comprehensive-guide-on-pydictor-a-wordlist-generating-tool/
- kali.tools — fiche pydictor : https://en.kali.tools/?p=1320
- BlackArch — paquet `pydictor` : https://blackarch.org/

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Outil - CUPP|CUPP]] · [[Techniques/Password Cracking|🔐 Password Cracking]] · [[Techniques/Brute Force Rate Limit|Brute Force Rate Limit]] · [[Outil - Crunch|Crunch]] · [[Outil - Mentalist|Mentalist]] · [[Outil - hashcat|hashcat]]
