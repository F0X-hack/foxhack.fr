---
title: "API Key Leaks"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# API Key Leaks

> [!info] **En 1 phrase**
> API Key Leaks = retrouver des **clés d'API / tokens** (déjà exposés ou mal configurés) dans
> les dépôts publics, l'historique Git, le JS, les fichiers `.env`, les configs ou les backups
> → et les exploiter pour accéder à des **services privés** (S3, e-mail, BDD, API payantes).
>
> Source principale : **[PayloadsAllTheThings (swisskyrepo)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/API%20Key%20Leaks/README.md)**

---

## Concept

```mermaid
flowchart LR
    A[Clé exposée<br>repo public / JS / .env] --> B[Recherche<br>dorking + regex]
    B --> C[Clé trouvée]
    C --> D[Validation<br>curl endpoint officiel]
    D --> E[Exploitation<br>S3 / mail / API / BDD]
    E --> F[Impact<br>fuite de données / $$]
    D --> G[Clé invalide<br>poursuivre la recherche]
```

> [!info] **Pourquoi ça marche**
> Les devs **hardcodent** leurs clés dans le code, commitent des `.env` par accident ou poussent
> des secrets dans des repos **publics / historiques**. GitHub indexe tout → une simple recherche
> par pattern suffit à retrouver des clés **valides et exploitables**.

---

## Définition & causes de fuite

- **API Key** : identifiant unique qui authentifie les requêtes d'une application (Google, AWS, Stripe...).
- **Token** : jeton d'accès (OAuth, Bearer, JWT) qui donne accès à des ressources protégées.

> [!warning] **Ne pas confondre** : une clé dans un **repo public** n'est pas toujours
> exploitable (clé révoquée, sandbox, IP whitelistée). **Toujours valider avant de rapporter.**

### Où les clés fuient

| Vecteur | Exemple |
|---|---|
| **Hardcoding dans le code source** | `api_key = "1234567890abcdef"` directement dans le code |
| **Repos publics (GitHub)** | Commit accidentel d'une clé dans un repo visible |
| **Historique Git** | Clé supprimée du code... mais encore dans l'historique des commits |
| **Images Docker** | Clés hardcodées dans une image DockerHub / registre privé |
| **Fichiers de config** | `.env`, `config.json`, `settings.py`, `.aws/credentials` |
| **JS minifié / bundles** | Clés embarquées dans le JS front (SPA, webpack, Next.js) |
| **Packages npm** | `package.json` / `.npmrc` / package publié avec un secret |
| **Logs & debug** | Clés imprimées dans les logs, stacktraces, réponses d'erreur |
| **Backups & dumps** | Sauvegardes exposées, dumps de BDD, anciens `.zip`/`.tar` |
| **Rapports / documents** | Wiki, README, tickets JIRA/Confluence accessibles |

```py
# Exemple typique de clé hardcodée (source)
api_key = "1234567890abcdef"
```

```yaml
# Exemple de config exposée : .env commité par erreur
# Fichier : .env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SLACK_BOT_TOKEN=xoxb-<TEAM_ID>-<BOT_ID>-<REDACTED_TOKEN>
```

---

## Regex / patterns de détection

### Patterns officiels de la source

> [!tip] Pour identifier le service d'origine d'un token, consulte
> **[mazen160/secrets-patterns-db](https://github.com/mazen160/secrets-patterns-db)** —
> la plus grande base open-source de patterns de secrets (clés, mots de passe, tokens).

```yaml
patterns:
  - pattern:
      name: AWS API Gateway
      regex: '[0-9a-z]+.execute-api.[0-9a-z._-]+.amazonaws.com'
      confidence: low
  - pattern:
      name: AWS API Key
      regex: AKIA[0-9A-Z]{16}
      confidence: high
```

### Patterns courants (complement — secrets-patterns-db)

```regex
# Google API key / OAuth
AIza[0-9A-Za-z\-_]{35}
ya29\.[0-9A-Za-z\-_]+

# AWS Access Key ID
AKIA[0-9A-Z]{16}
ASIA[0-9A-Z]{16}

# Slack tokens
xox[baprs]-[0-9A-Za-z-]{10,250}
xoxe.xox[baprs]-[0-9A-Za-z-]{10,250}

# GitHub
ghp_[0-9A-Za-z]{36}                          # Personal Access Token
github_pat_[0-9A-Za-z_]{22,}                 # Fine-grained PAT
gho_[0-9A-Za-z]{36}                          # OAuth access token

# Stripe
sk_live_[0-9a-zA-Z]{24}                      # Secret key
sk_test_[0-9a-zA-Z]{24}
pk_live_[0-9a-zA-Z]{24}                      # Publishable (moins sensible)

# Twilio
SK[0-9a-fA-F]{32}
AC[0-9a-fA-F]{32}                            # Account SID

# Telegram bot
[0-9]{8,10}:[A-Za-z0-9_-]{35}

# Slack webhook / generic
https://hooks.slack.com/services/T[a-zA-Z0-9_]{8,}/B[a-zA-Z0-9_]{8,}/[a-zA-Z0-9_]{24,}

# OpenAI / Anthropic
sk-[0-9A-Za-z]{48}                           # OpenAI
sk-ant-api03-[0-9A-Za-z_-]{50,}              # Anthropic

# Generic Bearer / Authorization
(api[_-]?key|secret|token)['"\s:=]+[0-9a-zA-Z_\-]{16,}

# Private keys
-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----
```

---

## Outils

| Outil | Rôle | Lien |
|---|---|---|
| **trufflehog** | Scan git / Docker / filesystem / S3 / GCS pour secrets **vérifiés** | [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) |
| **gitleaks** | Scan de repos et historique Git (pré-commit possible) | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) |
| **gitrob** | Scan l'organisation GitHub + ses repos publics | [michenriksen/gitrob](https://github.com/michenriksen/gitrob) |
| **git-dumper** | Dump un repo Git exposé (`.git/` accessible) | [arthaud/git-dumper](https://github.com/arthaud/git-dumper) |
| **nuclei + token-spray** | Teste un token contre de nombreux endpoints d'API | [projectdiscovery/nuclei-templates](https://github.com/projectdiscovery/nuclei-templates) |
| **trivy** | Scanner vulns + configs, détecte aussi clés/secrets | [aquasecurity/trivy](https://github.com/aquasecurity/trivy) |
| **keyhacks** | Vérifie la validité de clés trouvées (bug bounty) | [streaak/keyhacks](https://github.com/streaak/keyhacks) |
| **secrets-patterns-db** | Base de regex pour identifier le service d'une clé | [mazen160/secrets-patterns-db](https://github.com/mazen160/secrets-patterns-db) |
| **badsecrets** | Détecte les secrets connus/faibles multi-plateformes | [blacklanternsecurity/badsecrets](https://github.com/blacklanternsecurity/badsecrets) |
| **crapsecrets** | Détection de secrets connus pour frameworks web | [irsdl/crapsecrets](https://github.com/irsdl/crapsecrets) |
| **KeyFinder** | Extensions navigateur pour repérer les clés en surfant | [momenbasel/KeyFinder](https://github.com/momenbasel/KeyFinder) |
| **SignSaboteur** | Extension Burp pour forger/vérifier des tokens signés | [d0ge/sign-saboteur](https://github.com/d0ge/sign-saboteur) |

### trufflehog

```powershell
## Scan une organisation GitHub
docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --org=trufflesecurity

## Scan un repo GitHub + ses Issues et Pull Requests
docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --repo https://github.com/trufflesecurity/test_keys --issue-comments --pr-comments

## Scan une image Docker pour des secrets vérifiés
docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest docker --image trufflesecurity/secrets

## Scan en local (filesystem / git)
trufflehog filesystem /path/to/repo
trufflehog git https://github.com/user/repo.git
```

### gitleaks

```bash
# Scan rapide du repo courant (toutes les branches + historique)
gitleaks detect -v
# Scan ciblé d'un repo distant
gitleaks git --remote https://github.com/org/repo.git
# Rechercher seulement un type de secret
gitleaks detect --report-format sarif
```

### nuclei — token spray

```powershell
## Teste une liste de tokens contre les templates API
nuclei -t token-spray/ -var token=token_list.txt
```

> [!tip] Les templates `token-spray` de nuclei-templates testent un token fourni
> contre des dizaines de services (Slack, GitHub, AWS, Stripe, Twilio...) en une passe.

---

## Techniques de recherche

### GitHub dorking (queries exactes)

```bash
# Rechercher des clés par pattern dans le code
"AKIA[0-9A-Z]{16}"
AIza[0-9A-Za-z\-_]{35}
xox[baprs]-

# Rechercher des fichiers sensibles
filename:.env
filename:.env extension:env
filename:config.json "api_key"
filename:settings.py "secret"
filename:.npmrc "token"

# Rechercher des mots-clés dans le code
"api_key" "api_secret"
"aws_access_key_id" "aws_secret_access_key"
"BEGIN PRIVATE KEY"
"password" extension:env

# Rechercher dans les issues / PR / descriptions
"-----BEGIN RSA PRIVATE KEY-----" in:file
"api_key" in:description
```

### Repos, historique Git et fichiers exposés

```bash
# 1. Dump d'un repo Git exposé (si .git/ est accessible en HTTP)
git-dumper https://target.com/.git/ ./repo
# Puis extraire les secrets de l'historique
git log --all --oneline
git grep -iE "AKIA|api_key|secret" $(git rev-list --all)

# 2. Clone + scan de tout l'historique avec trufflehog
docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --org=ORGANIZATION

# 3. Rechercher dans l'historique Git directement
git log -p --all -S "api_key" --oneline          # -S : apparition/disparition d'une chaîne
git log -G "AKIA[0-9A-Z]{16}" --all --oneline     # -G : regex
git show <commit-hash>                            # lire l'ancien commit
```

### JS minifié / bundles front

```bash
# Télécharger les bundles puis regex dessus (variantes)
curl -s https://target.com/app.js -o app.js
grep -oE "AIza[0-9A-Za-z\-_]{35}" app.js
grep -oE "(sk_live|pk_live|AKIA|xoxb)[A-Za-z0-9_\-]{10,}" app.js
# Sur tous les assets d'une page
python3 -c "import re;print(re.findall(r'AIza[0-9A-Za-z\-_]{35}', open('app.js').read()))"

# Déminifier pour lire les clés en contexte
npx prettier --write app.js
```

### Wayback machine & web dorks

```bash
# Anciennes versions du site (scripts, .env, backups)
curl "http://web.archive.org/cdx/search/cdx?url=target.com/*&output=text&fl=original&collapse=urlkey" | grep -iE "\.(env|json|bak|zip|sql)$"

# Dorks Google / Bing
site:target.com ext:env OR ext:sql OR ext:bak
site:target.com inurl:config.php OR inurl:.git
"target.com" "api_key" OR "secret_key" OR "aws_access_key_id"
site:pastebin.com "target.com" "api_key"
```

### npm / package.json / registres

```bash
# Clés dans les packages npm publics / .npmrc
grep -rE "//registry.npmjs.org/:_authToken|NPM_TOKEN" .
# Recherche de .npmrc / .pypirc / .gem credentials exposés
filename:.npmrc filename:.pypirc filename:.netrc
```

---

## Exploitation

> [!warning] **Valider AVANT d'exploiter** : tester la clé sur l'endpoint officiel,
> sans effectuer d'action destructive. Une clé invalide = mauvais rapport.

```bash
# Valider un token Telegram (exemple de la source)
curl https://api.telegram.org/bot<TOKEN>/getMe

# Valider une clé GitHub
curl -H "Authorization: token ghp_..." https://api.github.com/user

# Valider Slack
curl -H "Authorization: Bearer xoxb-..." https://slack.com/api/auth.test

# Valider Stripe (mode test / live)
curl -u sk_test_xxx: https://api.stripe.com/v1/charges?limit=1

# Valider AWS (identité + accès)
aws sts get-caller-identity --profile pwn
aws s3 ls --profile pwn
```

### Clés de services & impact

| Service | Clé | Validation | Impact / monétisation |
|---|---|---|---|
| **AWS S3** | `AKIA...` | `aws s3 ls` | Lecture/écriture de buckets, dump de données, chiffrement = ransom |
| **E-mail (SendGrid, Mailgun)** | `SG.xxxx` | envoi via l'API | Spam massif, phishing à grande échelle |
| **Twilio** | `SK...` / `AC...` | appel SMS via l'API | Envoi de SMS payants, fraudes téléphoniques |
| **Slack** | `xoxb-...` | `auth.test` | Lecture de conversations, post dans les channels |
| **GitHub PAT** | `ghp_...` | `GET /user` | Vol de repos privés, push de backdoors |
| **Google Maps/Cloud** | `AIza...` | appel d'un endpoint | Quota facturé au propriétaire du compte |
| **Stripe** | `sk_live_...` | `GET /v1/customers` | Lecture des cartes (si scope), remboursements frauduleux |
| **OpenAI / Anthropic** | `sk-...` | `GET /v1/models` | Consommation du quota ($$) au détriment du propriétaire |

> [!tip] **Keyhacks** ([streaak/keyhacks](https://github.com/streaak/keyhacks)) fournit la
> méthode de validation rapide pour chaque service — à utiliser en bug bounty pour prouver
> l'impact sans nuire.

---

## Détection & Défense

| Réponse | Détail |
|---|---|
| **Rotation immédiate** | Toute clé potentiellement fuite = révoquer + regénérer. Ne jamais attendre. |
| **Ne jamais committer** | Clés dans un **secrets manager** (Vault, AWS Secrets Manager, 1Password...) |
| **`.gitignore`** | Bloquer `.env`, `*.pem`, `config` sensibles, `.aws/credentials` |
| **Scan des dépôts** | CI + scan continu : trufflehog / gitleaks sur chaque push et PR |
| **Pré-commit hooks** | Bloque le commit si un secret est détecté (voir source) |
| **Moindre privilège** | Clé limitée à un service/ressource, IP whitelist, expiration courte |
| **Détection de fuite** | Monitorer GitHub pour son propre nom/domaine (dorking automatisé) |
| **Alertes provider** | AWS/Google/GitHub ont des alertes de secret scan sur les repos |

### Pré-commit hook (source)

```yml
# .pre-commit-config.yaml
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v3.2.0
    hooks:
    -   id: detect-aws-credentials
    -   id: detect-private-key
```

---

## Tips & Pièges

> [!tip] **Ordre d'investigation optimal**
> 1. **Repo public** (dorking GitHub + clone) → 2. **Historique Git** (commits supprimés !)
> → 3. **JS / bundles front** → 4. **Wayback machine & anciennes versions** → 5. Logs & backups.
> L'historique Git est LA source la plus rentable : une clé "supprimée" y reste toujours.

> [!warning] **Pièges classiques**
> - Une clé dans un repo public ≠ **exploitable** : révoquée, sandbox, IP restreinte → **valider**.
> - Les clés **publishable** (Stripe `pk_`, Google Maps `AIza` public) sont faites pour être
>   publiques : les lister comme "fuite" sans impact = **faux positif**.
> - Les tokens d'**un seul commit** se retrouvent souvent dans les **forks** ou les PR.
> - Ne **jamais** déclencher d'action destructrice/coûteuse (envoi de mail, suppression S3,
>   appel de quotas) pendant la validation.
> - Une clé AWS `AKIA` **sans secret** ne donne rien : il faut la paire
>   (`aws_access_key_id` + `aws_secret_access_key`).
> - Vérifier le **scope** avant de rapporter : un PAT GitHub "repo" vs "admin:org" n'a pas
>   le même impact.
> - En bug bounty : **minimum impact** pour prouver la validité, puis **rapporter** — ne pas
>   dump intégralement la ressource.

---

## Liens

- [[Password Cracking| Password Cracking]]
- [[Hidden Parameters| Hidden Parameters]]
- [[Virtual Hosts| Virtual Hosts]]
- → Note complète : [[03 - Exploitation Web| Exploitation Web]]
- Source : [PayloadsAllTheThings — API Key Leaks](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/API%20Key%20Leaks/README.md)
