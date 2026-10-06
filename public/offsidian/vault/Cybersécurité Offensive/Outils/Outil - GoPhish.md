---
title: "Outil - GoPhish"
type: outil
categorie: 🎭 Social Engineering & Phishing
tags:
  - cyber
  - outil
  - social-engineering
statut: publie
version: 0.12.1
licence: MIT
langage: Go, JavaScript, HTML
developpeur: Jordan Wright — The GoPhish Project
repo: https://github.com/gophish/gophish
site: https://getgophish.com
doc: https://docs.getgophish.com
---

# 🎣 GoPhish — La plateforme open source de gestion de campagnes de phishing

> [!info] **En 1 phrase**
> GoPhish est un framework web open source qui permet de créer, envoyer et suivre des campagnes de phishing réalistes avec des templates dynamiques, des groupes de cibles et des rapports statistiques.

---

## 🧾 Overview

| Champ | Valeur |
|---|---|
| Nom complet | GoPhish |
| Description | Plateforme de gestion de campagnes de phishing : cibles, templates, landing pages, envoi SMTP, tracking (ouverture/clic/soumission), API REST |
| Catégorie | 🎭 Social Engineering & Phishing |
| Sous-catégorie | Phishing Campaign Management |
| Type d'outil | Application web (binaire Go autonome) |
| Licence | MIT |
| Open source / propriétaire | Open source |
| Langage(s) | Go (61 %), JavaScript, HTML |
| Développeur / organisation | Jordan Wright & contributeurs |
| Dépôt officiel | https://github.com/gophish/gophish |
| Documentation officielle | https://docs.getgophish.com |
| Date de création | 18 novembre 2013 |
| État du projet | maintenu (releases stables) |
| Dernière version connue | v0.12.1 (2022-09-14) |
| Systèmes compatibles | Linux, macOS, Windows (binaires 64/32 bits), Docker |

---

## 🎯 Concept

GoPhish est un logiciel écrit en Go, développé par Jordan Wright, qui centralise toute la vie d'une campagne de phishing : gestion des cibles par groupes, création de templates avec variables dynamiques (`.FirstName`, `.LastName`, `.Email`, `.Position`), campagne de landing pages (pages de credential harvesting), envoi des emails via SMTP et tracking complet (ouverture, clic, soumission de formulaire, email renvoyé). Il fournit une interface web administrateur (port 3333) et un serveur de phishing (port 80 par défaut). Grâce à son API REST et à ses templates prédéfinis, il est l'outil de référence pour les campagnes de sensibilisation internes et les audits de sécurité humaine.

Dans un engagement de social engineering, GoPhish structure le travail : on définit les cibles (groupe), on prépare l'email (template), on héberge la fausse page de login (landing page), on envoie (Sending Profile SMTP) et on mesure (rapports : envoyés, ouverts, cliqués, soumis). L'API REST permet d'automatiser la création de campagnes à partir d'un script, utile pour tester la sensibilisation à l'échelle d'une entreprise entière. En complément d'Evilginx2 (phishing MFA), GoPhish reste plus simple d'usage pour les campagnes classiques de credential harvesting.

Il est essentiel de cadrer l'usage : les campagnes doivent être **autorisées par écrit** (règle de périmètre), réalisées sur des domaines contrôlés ou dédiés, et exclure toute donnée personnelle superflue. GoPhish journalise tout (ouvertures, clics, données capturées) : ces données servent uniquement au rapport d'audit et doivent être purgées après restitution. Enfin, le tracker par pixel d'ouverture étant bloqué par certains clients mail, le rapport « ouvertures » est une estimation basse : c'est le nombre de **soumissions de formulaire** qui compte réellement pour mesurer le risque.

```mermaid
flowchart LR
    A["Admin"] -->|"https :3333"| B["GoPhish Admin"]
    B --> C["Sending Profile SMTP"]
    B --> D["Template email<br>{{.FirstName}}, {{.URL}}"]
    B --> E["Landing Page<br>capture + redirect"]
    D --> F["Serveur Phishing :80"]
    E --> F
    F -->|"email"| G["Victime"]
    G -->|"clic"| F
    F -->|"soumission"| H["Credentials capturés"]
    F -->|"ouvertures / clics"| I["Tracking<br>rapports CSV / API"]
```

---

## 🧠 Concepts fondamentaux

| Concept | Explication |
|---|---|
| Sending Profile | Configuration SMTP (hôte, port, TLS, From, Reply-To, identifiants) utilisée pour l'envoi des emails |
| Email Template | Gabarit HTML/texte avec variables GoPhish : `{{.FirstName}}`, `{{.LastName}}`, `{{.URL}}`, `{{.From}}`, `{{.Tracker}}` |
| Landing Page | Page hébergée par le serveur phish (port 80) ; peut capturer les soumissions de formulaire et rediriger après |
| User Group | Ensemble de cibles importées par CSV (`first_name,last_name,email,position`) ou manuellement |
| Campaign | Association d'un template + landing page + groupe + sending profile, lancée à une date/heure |
| Tracking | Pixel d'ouverture (`{{.Tracker}}`), redirections de clic (`/track?rid=`), soumissions enregistrées par cible |
| REST API | API JSON (`/api/campaigns`, `/api/users`, `/api/templates`…) authentifiée par clé API |
| SQLite / MySQL | Stockage des campagnes, résultats et données capturées (`gophish.db` par défaut, MySQL possible) |
| `rid` | Identifiant unique de tracking généré par cible, présent dans les URLs (`/?rid=<hash>`) |

---

## 🛠️ Installation

### Binaire précompilé (Linux x64)

```bash
wget https://github.com/gophish/gophish/releases/download/v0.12.1/gophish-v0.12.1-linux-64bit.zip
unzip gophish-v0.12.1-linux-64bit.zip
cd gophish-v0.12.1-linux-64bit
chmod +x gophish
sudo ./gophish
```

### Kali Linux (paquet)

```bash
sudo apt update && sudo apt install -y gophish
# Le service se lance via gophish-start (gophish est déprécié)
gophish-start
```

### Compilation depuis les sources

```bash
sudo apt install -y golang
git clone https://github.com/gophish/gophish.git
cd gophish
go build
sudo ./gophish
```

### Docker

```bash
docker run -it --rm -p 3333:3333 -p 80:80 ghcr.io/gophish/gophish
```

> [!warning] ⚠️ Prérequis & problèmes potentiels
> - Le **mot de passe admin initial est généré et affiché dans la console** au premier démarrage — le récupérer avant de fermer le terminal.
> - Les ports 3333 (admin) et 80 (phishing) doivent être libres ; `sudo` pour les ports < 1024.
> - Avant v0.10.1, le compte par défaut était `admin:gophish` — toujours le changer après upgrade.
> - Pour la personnalisation des variables de template, utiliser la double accolade `{{.FirstName}}`, pas `${FirstName}`.

---

## ⚙️ Configuration

La configuration se fait dans **`config.json`** à côté du binaire (généré au premier lancement), puis via l'interface web pour les profils, templates et campagnes.

| Paramètre | Rôle | Valeur possible | Impact | Exemple |
|---|---|---|---|---|
| `admin_server.listen_url` | Interface d'administration | `ip:port` | 0.0.0.0:3333 | `"0.0.0.0:3333"` |
| `admin_server.use_tls` | HTTPS sur l'admin | true/false | Chiffrement du panel | `true` |
| `phish_server.listen_url` | Serveur de phishing | `ip:port` | 0.0.0.0:80 | `"0.0.0.0:80"` |
| `phish_server.use_tls` | HTTPS sur le serveur phish | true/false | Landing en HTTPS | `true` |
| `db_name` | Type de base | `sqlite3` / `mysql` | Stockage | `"sqlite3"` |
| `db_path` / `db_user` / `db_host` | Connexion BDD | chaîne | Emplacement/credentials | `"gophish.db"` |
| `contact_address` | Adresse affichée sur les pages d'erreur | email | Mention de contact | `"jdoe@example.com"` |
| `trusted_origins` | Origines autorisées (proxy/TLS terminaison) | liste | Accepte les connexions upstream (v0.12.1+) | `["https://gophish.example.com"]` |

Exemple de `config.json` :

```json
{
  "admin_server": {"listen_url": "0.0.0.0:3333", "use_tls": true},
  "phish_server": {"listen_url": "0.0.0.0:80", "use_tls": false},
  "db_name": "sqlite3",
  "db_path": "gophish.db",
  "migrations_prefix": "db/db_",
  "contact_address": "jdoe@example.com",
  "trusted_origins": ["https://gophish.example.com"]
}
```

---

## 🏗️ Architecture interne

GoPhish est un **binaire Go unique** composé de deux serveurs HTTP :

- **Serveur admin** (port 3333) : interface web (Go templates + Bootstrap), authentification (session cookie + anti-CSRF), configuration de l'outillage, exposition de l'API REST.
- **Serveur phishing** (port 80) : sert les landing pages, le pixel de tracking (`/track`), les redirections de clic et reçoit les soumissions de formulaire.
- **Moteur de templates** : syntaxe `{{.Field}}` (type Go `text/template`) avec champs dédiés : `FirstName`, `LastName`, `Position`, `Email`, `From`, `URL`, `Tracker`, `BaseURL`, `RId`.
- **Couche de persistance** : SQLite par défaut (fichier `gophish.db`), migrations gérées ; MySQL/MariaDB supportés.
- **API REST** : endpoints JSON (CRUD sur users/groups, templates, landing pages, sending profiles, campaigns) authentifiés par clé API (`X-Api-Key` ou basic auth).
- **Mailer** : envoi via SMTP (sending profiles), support TLS, limite d'envoi, log des erreurs par cible.

Flux d'exécution : la campagne envoie les emails via le profil SMTP → chaque cible reçoit une URL unique contenant `rid` → clic = requête au serveur phish (loggé) → landing page affichée → soumission POST = credentials enregistrés → redirection éventuelle → les événements sont horodatés et regroupés dans le rapport.

---

## ⌨️ Commandes

### Commandes principales

```bash
# Lancer le serveur (admin + phishing)
sudo ./gophish
```

| Commande | Objectif | Résultat attendu |
|---|---|---|
| `./gophish` | Démarre admin (3333) + phish (80) | Console + « password: <généré> » |
| `./gophish -config config.json` | Démarre avec un fichier de config alternatif | Respect de la config passée |
| `./gophish -disable-logs` | Désactive la journalisation (démo) | Pas de logs console |
| `./gophish --version` | Affiche la version | Numéro de version |

### Commandes avancées

```bash
# Lancer en arrière-plan
sudo nohup ./gophish > /var/log/gophish.log 2>&1 &

# Récupérer le mot de passe généré depuis les logs
grep -i password /var/log/gophish.log
```

---

## 🎚️ Options et flags

| Option | Description | Exemple | Niveau |
|---|---|---|---|
| `-config <fichier>` | Fichier de configuration | `./gophish -config config.json` | Intermediate |
| `-disable-logs` | Journalisation désactivée | `./gophish -disable-logs` | Intermediate |
| `--version` | Version | `./gophish --version` | Basic |
| Ports `3333` / `80` | Admin / phishing | `config.json` | Basic |
| `use_tls` | HTTPS admin et/ou phish | `"use_tls": true` | Intermediate |
| `trusted_origins` | Origines TLS autorisées | `["https://gophish.example.com"]` | Advanced |

> [!tip] Options les plus utiles au quotidien
> `-config` (multi-instances), `use_tls: true` pour l'admin (sécurité), `trusted_origins` si GoPhish est derrière un reverse proxy, `-disable-logs` pour les démos.

---

## 🧪 Exemples pratiques

### Beginner

```bash
# 1) Lancer GoPhish et noter le mot de passe admin généré
sudo ./gophish
# 2) Se connecter sur http://localhost:3333
# 3) Créer un profil SMTP (onglet Sending Profiles)
# 4) Créer un groupe avec une cible test jdoe@example.com
# 5) Créer un template et une landing page, lancer la campagne
```

### Intermediate

```bash
# Import CSV des cibles (colonnes exactes)
# first_name,last_name,email,position
echo "Jean,Dupont,jean.dupont@corp.local,Directeur" > cibles.csv
echo "Marie,Martin,marie.martin@corp.local,Comptabilité" >> cibles.csv
# Onglet Users & Groups → Import → cibles.csv
```

### Advanced

```bash
# Créer une campagne entièrement via l'API REST
curl -s -X POST -H "Content-Type: application/json" \
  -u admin:APIKEY \
  -d '{"name":"Campagne H1","template":{"name":"alerte-securite"},"url":"http://10.10.20.15:80","page":{"name":"login-vpn"},"smtp":{"name":"smtp-corp"},"groups":[{"name":"Direction"}]}' \
  https://localhost:3333/api/campaigns/ --insecure | jq .
```

### Expert

```bash
# Automatiser le reporting : récupérer les résultats d'une campagne
curl -s -u admin:APIKEY https://localhost:3333/api/campaigns/1/results/ --insecure \
  | jq '.[] | {first_name, last_name, email, status, opened_at, clicked_at, submitted_data}'
```

---

## 🧪 Workflow complet (scénario pas à pas)

1. **Étape 1 — Lancer GoPhish et récupérer les identifiants** — le mot de passe admin est affiché en console au premier démarrage.
   ```bash
   sudo ./gophish
   # → login: admin | mot de passe: loggé dans la console
   ```
2. **Étape 2 — Configurer un profil SMTP** — onglet *Sending Profiles* : serveur SMTP, `From`, `Reply To` (SPF/DKIM pour éviter le spam).
3. **Étape 3 — Créer un groupe de cibles** — onglet *Users & Groups* : import CSV (`first_name,last_name,email,position`) ou ajout manuel.
   ```bash
   # Format CSV attendu : first_name,last_name,email,position
   echo "Jean,Dupont,jean.dupont@corp.local,Directeur" > cibles.csv
   ```
4. **Étape 4 — Créer le template et la landing page** — onglet *Email Templates* (variables `{{.FirstName}}`, `{{.URL}}`) puis *Landing Pages* : cocher `Capture Submitted Data`, capture des mots de passe, redirection vers le vrai site.
   ```html
   <!-- Template : utiliser {{.FirstName}} et {{.URL}} pour la personnalisation -->
   <p>Bonjour {{.FirstName}},</p><p><a href="{{.URL}}">Cliquez ici</a></p>
   ```
5. **Étape 5 — Créer et lancer la campagne** — onglet *Campaigns* : associer template + landing + groupe + profil SMTP.
6. **Étape 6 — Analyser les résultats** — le rapport montre ouvertures, clics, soumissions et emails renvoyés ; export CSV pour le rapport d'audit.
   ```bash
   # Récupérer les résultats par l'API pour automatiser le reporting
   curl -s -u admin:APIKEY https://localhost:3333/api/campaigns/1/results/ --insecure | jq .
   ```

---

## 🎬 Scénarios avancés

### Scénario 1 : phishing automatisé via l'API REST

```bash
# Récupérer une clé API dans les paramètres
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test Campagne","template":{"name":"phish1"},"url":"http://192.168.1.10:80","page":{"name":"login"},"smtp":{"name":"smtp1"},"groups":[{"name":"Direction"}]}' \
  https://admin:APIKEY@localhost:3333/api/campaigns/ --insecure
```

L'API permet aussi de lister campagnes et événements (`GET /api/campaigns/`, `GET /api/campaigns/<id>/results/`) pour automatiser le reporting.

### Scénario 2 : MFA phishing avec page clonée + redirection

```bash
# La landing page capture les identifiants ET le token 2FA (champ OTP ajouté)
# Configurez la redirection "Redirect to: https://comptes.google.com" pour
# laisser la victime entrer le code 2FA une fois sur le vrai site.
# Dans la console GoPhish : voir le token capturé en temps réel.
```

### Scénario 3 : campagne récurrente de sensibilisation (best practices)

```bash
# 1. Repartir d'une campagne précédente en cliquant "Duplicate" (versions conservées)
# 2. Mettre à jour le template (nouveau prétexte : télétravail, RTT, etc.)
# 3. Lancer un "dry run" sur 5% des cibles, analyser le rapport, ajuster le timing d'envoi
# 4. Lancer la campagne complète et exporter le rapport CSV dans le rapport d'audit
```

### Scénario 4 : évasion des filtres anti-spam

```bash
# 1. Utiliser un domaine contrôlé avec SPF + DKIM + DMARC corrects
# 2. Envoyer par lots limités (rate limiting SMTP) pour éviter la liste noire
# 3. Personnaliser From avec un prénom réaliste ({{.FirstName}})
# 4. Tester la délivrabilité sur une boîte contrôlée avant le lancement
```

---

## 🛡️ Cybersecurity use cases

| Phase | Utilisation |
|---|---|
| Initial Access | Envoi du leurre et hébergement de la landing (T1566.002) |
| Credential Access | Capture des soumissions de formulaire (T1539 / T1111 si OTP) |
| Collection | Récupération structurée des credentials par cible |
| Persistence (démo) | Campagnes récurrentes pour mesurer la résilience humaine |
| Reporting | Export CSV / API pour le rapport d'audit de sensibilisation |
| Red team | Intégration avec Evilginx2 (lures) pour les campagnes 2FA |

---

## 🎯 MITRE ATT&CK

| Tactique | Technique / Sub-technique | ID | Raison | Détection | Mitigation |
|---|---|---|---|---|---|
| Initial Access | Phishing: Spearphishing Link | T1566.002 | Emails avec lien vers la landing GoPhish | Analyse URL, sandbox | SPF/DKIM/DMARC, filtrage web |
| Initial Access | Phishing: Spearphishing Attachment | T1566.001 | Templates avec pièce jointe .html | Blocage des pièces jointes | Filtrage des pièces jointes |
| Credential Access | Steal Web Session Cookie | T1539 | Landing pages capturant cookies | Détection de replay | Cookies HttpOnly, rotation |
| Credential Access | Multi-Factor Authentication Interception | T1111 | Champs OTP ajoutés aux landing | Double saisie anormale | FIDO2/WebAuthn |
| Collection | Data from Local System | T1005 | Données soumises stockées en base | Accès base de données surveillé | Contrôle d'accès, chiffrement |

> [!note] Ne renseigner que si l'association est réellement pertinente.
> GoPhish est l'archétype T1566.002 : campagne de phishing automatisée avec landing page de capture.

---

## 🛡️ Defensive Security

### Signes observables

| Indicateur | Détail |
|---|---|
| Email avec domaine ou nom d'affichage inconnu | Spoofing de l'expéditeur |
| URLs contenant `rid=` ou `/track` | Tracking GoPhish dans les liens |
| Pixel d'ouverture distant (`{{.Tracker}}`) | Image invisible chargée depuis le serveur phish |
| Landing page avec URL ne correspondant pas au certificat | Serveur phish sur IP brute ou domaine neuf |
| Masses d'emails depuis une même IP | Envoi SMTP groupé (rate limit) |
| Soumissions de formulaire vers un domaine inconnu | POST vers la landing page |

### Règles de détection (Sigma / Suricata / Snort / YARA)

```yaml
# Sigma — proxy : accès aux URLs de tracking GoPhish
title: GoPhish Tracking URI Access
id: c3d4e5f6-0123-4567-89ab-cdef01234567
status: experimental
logsource:
    category: proxy
detection:
    selection:
        url|contains:
            - '/track'
            - '?rid='
    condition: selection
falsepositives:
    - Other URL shorteners using similar patterns
level: medium
```

```bash
# Suricata — détection d'un serveur GoPhish (pattern login + POST)
alert tcp any any -> any 80 (msg:"ET GoPhish campaign POST to landing page"; \
  content:"POST"; http_method; content:"first_name"; http_client_body; nocase; \
  classtype:attempted-user; sid:20260004; rev:1;)
```

---

## 🤖 Automatisation

```bash
# Bash — lancer une campagne et attendre les résultats
curl -s -u admin:APIKEY -H "Content-Type: application/json" \
  -d '{"name":"Auto","template":{"name":"t1"},"url":"http://10.10.20.15:80","page":{"name":"p1"},"smtp":{"name":"s1"},"groups":[{"name":"g1"}]}' \
  https://localhost:3333/api/campaigns/ --insecure > /tmp/camp.json
CID=$(jq -r '.id' /tmp/camp.json)
sleep 3600
curl -s -u admin:APIKEY "https://localhost:3333/api/campaigns/$CID/results/" --insecure \
  | jq -r '.[] | [.email,.status] | @tsv' > /tmp/results.tsv
```

```python
# Python — orchestrer des campagnes GoPhish via l'API
import requests

BASE = "https://localhost:3333"
APIKEY = "votre-cle-api"
s = requests.Session()
s.auth = ("admin", APIKEY)
s.verify = False

r = s.post(f"{BASE}/api/campaigns/", json={
    "name": "Sensibilisation H1",
    "template": {"name": "phish-rh"},
    "url": "http://10.10.20.15:80",
    "page": {"name": "login-rh"},
    "smtp": {"name": "smtp-corp"},
    "groups": [{"name": "RH"}],
})
campaign_id = r.json()["id"]
results = s.get(f"{BASE}/api/campaigns/{campaign_id}/results/").json()
print(f"Soumissions : {sum(1 for x in results if x['status'] == 'success')}")
```

---

## 📤 Output et parsing

GoPhish expose les résultats par l'**API REST** (JSON) et par l'**export CSV** de l'interface. Chaque événement est horodaté : envoi, ouverture, clic, soumission, échec.

```bash
# Export via l'API puis conversion en tableau
curl -s -u admin:APIKEY https://localhost:3333/api/campaigns/1/results/ --insecure \
  | jq -r '.[] | "\(.first_name)\t\(.last_name)\t\(.email)\t\(.status)\t\(.opened_at)\t\(.clicked_at)"'
```

```python
# Python — calcul des taux d'une campagne
import requests
r = requests.get("https://localhost:3333/api/campaigns/1/results/", auth=("admin", "APIKEY"), verify=False)
rows = r.json()
total = len(rows)
opened = sum(1 for x in rows if x.get("opened_at"))
clicked = sum(1 for x in rows if x.get("clicked_at"))
submitted = sum(1 for x in rows if x.get("submitted_data"))
print(f"Taux clic : {clicked/total*100:.1f}%  Taux soumission : {submitted/total*100:.1f}%")
```

---

## 🔗 Intégrations

- [[Tools|🧰 Outils]] global
- [[Outil - Evilginx2]] — intégration officielle des lures (fork `kgretzky/gophish`, v3.3.0)
- [[Outil - SET]] — vecteurs d'email alternatifs (payloads, HTA)
- [[Outil - BeEF]] — hook du navigateur après clic sur la landing
- [[Outil - SocialFish]] / [[Outil - CredSniper]] — landing pages de capture simples
- [[Outil - Metasploit]] — exploitation des accès capturés
- [[Outil - Nmap]] — vérification que les ports 3333/80 sont joignables

---

## 🔄 Alternatives

| Outil | Avantages | Inconvénients | Cas d'usage |
|---|---|---|---|
| [[Outil - King-Phisher]] | Client GTK, multi-serveurs | Non maintenu | Anciennes infrastructures |
| [[Outil - SET]] | Intégré Metasploit, multi-vecteurs | Interface lourde | Campagnes multi-vecteurs |
| [[Outil - Evilginx2]] | Bypass 2FA, session réelle | Infrastructure lourde | Red team MFA |
| [[Outil - SocialFish]] | Rapide, tunneling intégré | Peu de tracking | Démo |
| PhishDeck / uPhish | GUI riches | Moins éprouvés | Alternatives commerciales |

---

## ⚡ Performance

- Un binaire Go autonome : **très économe** (quelques dizaines de Mo de RAM).
- SQLite convient jusqu'à quelques dizaines de milliers de cibles ; au-delà, passer à **MySQL**.
- L'envoi SMTP séquentiel limite le débit : pour de gros volumes, multiplier les sending profiles et espacer les lancements.
- Le pixel de tracking peut être bloqué par les clients mail (images distantes) : le taux d'ouverture est une **borne basse**.

---

## 🛠️ Troubleshooting

### Common problems

#### Problème : le mot de passe admin n'est plus affiché

- **Cause** : premier démarrage déjà effectué, la base contient le hash.
- **Solution** : réinitialiser en supprimant `gophish.db` (attention : perd les données) ou recréer l'utilisateur via l'API.
- **Vérification** : `curl -s http://localhost:3333/api/users/ --insecure`.

#### Problème : les emails partent en spam

- **Cause** : pas de SPF/DKIM/DMARC sur le domaine d'envoi.
- **Solution** : aligner SPF/DKIM, utiliser un domaine dédié, tester la délivrabilité.
- **Vérification** : envoyé depuis une boîte contrôlée et inspection des headers.

#### Problème : la landing page affiche une erreur 404

- **Cause** : le serveur phish (port 80) ne tourne pas ou l'URL de campagne pointe sur le mauvais port.
- **Solution** : vérifier que `phish_server.listen_url` est joignable et que l'URL de la campagne utilise le bon port.
- **Vérification** : `curl -I http://10.10.20.15:80`.

#### Problème : 404 lors des appels API

- **Cause** : clé API absente ou endpoint mal orthographié.
- **Solution** : générer une clé dans Paramètres et vérifier la documentation des endpoints.
- **Vérification** : `curl -s -u admin:APIKEY https://localhost:3333/api/campaigns/ --insecure`.

---

## 🔐 Sécurité de l'outil

- **Panel admin** : activer `use_tls` sur le serveur admin et ne jamais l'exposer sur Internet (accès réseau d'engagement uniquement).
- **Clé API** : la protéger ; elle donne accès à toutes les campagnes et données capturées.
- **Données capturées** : credentials stockés en base — chiffrer le serveur, purger après restitution.
- **Certificats** : en production réelle, servir la landing en HTTPS avec un certificat pour le domaine dédié (`use_tls: true` + certs).
- **Légal** : campagnes autorisées par écrit, périmètre défini, exclusion des données personnelles superflues.
- **Journalisation** : désactivable (`-disable-logs`) mais utile pour l'audit — conserver les logs pendant la mission puis les purger.

---

## ⚠️ Limitations

- Pas de phishing 2FA persistant : la capture d'un OTP ne donne pas une session rejouable (utiliser Evilginx2).
- Le tracking d'ouverture est faussé par les clients qui bloquent les images distantes.
- Pas de gestion de géolocalisation native (IP seulement dans les événements).
- La personnalisation avancée des templates nécessite de connaître la syntaxe Go `text/template`.
- Un seul serveur de phishing par instance (ports 80/443) — pour du scale-out, multiplier les instances.
- La version 0.12.1 n'est pas récente : certaines fonctionnalités manquent par rapport aux forks commerciaux.

---

## 📋 Cheatsheet

```bash
# Lancer GoPhish
sudo ./gophish

# Créer un groupe depuis un CSV
# first_name,last_name,email,position (via l'UI Users & Groups → Import)

# Créer une campagne via l'API
curl -s -u admin:APIKEY -H "Content-Type: application/json" \
  -d '{"name":"C1","template":{"name":"t1"},"url":"http://10.10.20.15:80","page":{"name":"p1"},"smtp":{"name":"s1"},"groups":[{"name":"g1"}]}' \
  https://localhost:3333/api/campaigns/ --insecure

# Lister les campagnes
curl -s -u admin:APIKEY https://localhost:3333/api/campaigns/ --insecure | jq '.[].name'

# Résultats d'une campagne
curl -s -u admin:APIKEY https://localhost:3333/api/campaigns/1/results/ --insecure | jq '.'

# Variables de template
# {{.FirstName}} {{.LastName}} {{.Email}} {{.Position}} {{.URL}} {{.Tracker}}
```

---

## ⚡ Quick reference

| | |
|---|---|
| **À quoi sert-il ?** | Créer, envoyer et suivre des campagnes de phishing (awareness / audits) |
| **Quand l'utiliser ?** | Toute campagne de social engineering structurée avec reporting |
| **Commande principale** | `sudo ./gophish` puis configuration via http://localhost:3333 |
| **Alternative principale** | [[Outil - King-Phisher]] (ancien) / [[Outil - SET]] |
| **Concepts importants** | Sending profile, template `{{.}}`, landing page, tracking `rid`, API REST |
| **Liens associés** | [[Outil - Evilginx2]] · [[Outil - SET]] · [[Outil - BeEF]] · [[Outil - King-Phisher]] |

---

## 🔍 Détection & Défense

| Signe | Défense |
|---|---|
| Email avec domaine ou nom d'affichage inconnu, .html en pièce jointe | Vérifier l'expéditeur, SPF/DKIM/DMARC |
| URL sur un domaine non corporate ou une IP brute | Hover pour vérifier le lien réel, passer par le proxy filtrant |
| Page de login avec URL ne correspondant pas au certificat | Contrôler l'URL et le cadenas HTTPS |
| Masses d'emails provenant d'une même IP/serveur | Filtrage anti-spam, limites d'envoi et listes noires IP |
| Lien court ou domaine récemment enregistré | Détection de nouveaux domaines (DNS de type "domain alerting") |
| Pixel de tracking d'ouverture détecté dans l'email | Bloquer le chargement d'images distantes par défaut dans le client mail |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Tips**
> - Utilisez les variables dynamiques `{{.FirstName}}` et `{{.Position}}` : un email personnalisé passe 5 à 10 fois mieux les filtres anti-spam et attire plus de clics.
> - Mettez en place le **tracking d'ouverture** via un pixel : analysez les horaires de lecture pour cibler vos tests de sensibilisation.
> - Importez vos cibles en CSV avec les colonnes `first_name,last_name,email,position` : la personnalisation fonctionne immédiatement.
> - Pour un rendu réaliste, clonez la page de login de l'entreprise avec l'outil *Import* de la landing page (URL source) puis masquez la bannière GoPhish.

> [!warning] ⚠️ **Pièges**
> - Le serveur d'admin `:3333` ne doit jamais être exposé publiquement : activez `use_tls` et limitez l'accès au réseau interne.
> - Sans **Sending Profile** avec DKIM configuré, les emails partent en spam et la campagne est faussée.
> - La redirection après capture est essentielle : sans elle, la victime sait immédiatement qu'elle a été piégée.
> - `use_tls: false` sur le serveur phish laisse les credentials circuler en clair : en production réelle, servez la landing en HTTPS (certificat pour votre domaine dédié).

---

## 📚 References

### Official

- Site officiel : https://getgophish.com
- Dépôt GitHub : https://github.com/gophish/gophish
- Documentation officielle : https://docs.getgophish.com
- Releases : https://github.com/gophish/gophish/releases

### Security references

- MITRE ATT&CK T1566.002 — Spearphishing Link : https://attack.mitre.org/techniques/T1566/002/
- MITRE ATT&CK T1111 — Multi-Factor Authentication Interception : https://attack.mitre.org/techniques/T1111/
- OWASP — Phishing : https://owasp.org/www-community/attacks/Phishing
- NIST SP 800-53 — Security Awareness Training (AT-2) : https://csrc.nist.gov/

### Community

- Blog — GoPhish + Evilginx 3.3 integration (Kuba Gretzky) : https://breakdev.org/evilginx-3-3-go-phish/
- Tutorial GoPhish (PhishSpark) : https://phishspark.com/blog/gophish-tutorial-setup-guide

---

➡️ **Liens :** [[Tools|🧰 Outils]] · [[Outil - Evilginx2|Evilginx2]] · [[Outil - SET|SET]] · [[Outil - King-Phisher|King-Phisher]] · [[Outil - BeEF|BeEF]]
