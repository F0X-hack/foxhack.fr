#!/bin/sh
# ============================================================================
#  Diagnostic du déploiement — répond à « foxhack.fr/offsidian est tout noir ».
#
#  Il compare ce que le serveur renvoie à ce que le build produit : page
#  servie au mauvais endroit, asset manquant, HTML servi à la place d'un .js
#  (le navigateur refuse alors le module et la page reste vide sans un mot).
#
#  Usage, sur le VPS (le serveur et les fichiers sont côte à côte) :
#      sh scripts/doctor.sh /var/www/foxhack.fr/dist https://foxhack.fr
#  Usage, en local contre un build :
#      npm run build && sh scripts/doctor.sh dist http://127.0.0.1:4173
# ============================================================================
set -eu

DIST=${1:-dist}
BASE=${2:-https://foxhack.fr}
SECTIONS="offsidian evilfox foxhid reaper tools mfkey32"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fails=0
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m⚠\033[0m %s\n' "$1"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$1"; fails=$((fails + 1)); }

# fetch <url> <fichier_de_sortie> → "code|content_type|redirect"
fetch() {
  curl -sS -o "$2" -w '%{http_code}|%{content_type}|%{redirect_url}' \
    --max-time 25 -A 'foxhack-doctor' "$1" 2>/dev/null || echo '000||'
}

printf '\n\033[1mfoxhack.fr — diagnostic\033[0m\n  build : %s\n  cible : %s\n' "$DIST" "$BASE"

# ---------------------------------------------------------------- 1. le build
printf '\n\033[1m[1] Fichiers du build\033[0m\n'
if [ ! -f "$DIST/index.html" ]; then
  bad "$DIST/index.html introuvable : ce n'est pas le dossier produit par \`npm run build\`"
  printf '      → le docroot de nginx doit pointer sur `dist/`, pas sur le dépôt ni sur `public/`.\n'
  exit 1
fi
ok "racine du build OK ($DIST)"

for section in $SECTIONS; do
  if [ -f "$DIST/$section/index.html" ]; then
    ok "/$section/ → $(wc -c <"$DIST/$section/index.html") octets de HTML"
  else
    bad "/$section/index.html absent du dossier servi"
    printf '      → %s est construit par Vite dans dist/%s/ : redéploye le contenu COMPLET de dist/.\n' "$section" "$section"
  fi
done

# --------------------------------------------------- 2. ce que renvoie le serveur
printf '\n\033[1m[2] Pages servies\033[0m\n'
home_meta=$(fetch "$BASE/" "$TMP/home.html")
if [ "${home_meta%%|*}" = 200 ]; then
  ok "accueil : $BASE/ répond ($(grep -o '<title>[^<]*' "$TMP/home.html" | head -1 | cut -c8-))"
else
  bad "accueil injoignable : HTTP ${home_meta%%|*}"
fi

for section in $SECTIONS; do
  meta=$(fetch "$BASE/$section/" "$TMP/$section.html")
  code=$(echo "$meta" | cut -d'|' -f1)
  if [ "$code" != 200 ]; then
    bad "/$section/ → HTTP $code"
    continue
  fi
  if cmp -s "$TMP/$section.html" "$TMP/home.html"; then
    bad "/$section/ sert en réalité la page d'accueil (fallback SPA de nginx)"
    printf '      → `try_files` ne trouve pas dist/%s/index.html : docroot ou upload incomplet.\n' "$section"
    printf '      → la page noire vient de là : color-scheme: dark, aucune note derrière.\n'
  else
    ok "/$section/ → $(grep -o '<title>[^<]*' "$TMP/$section.html" | head -1 | cut -c8-)"
  fi

  meta=$(fetch "$BASE/$section" "$TMP/$section-noslash.html")
  code=$(echo "$meta" | cut -d'|' -f1)
  case "$code" in
    301|302|307|308)
      ok "/$section (sans slash) → HTTP $code vers $(echo "$meta" | cut -d'|' -f3)"
      ;;
    200)
      if cmp -s "$TMP/$section-noslash.html" "$TMP/home.html"; then
        warn "/$section sans slash sert l'accueil : ajoute \`location = /$section { return 301 /$section/; }\`"
        printf '      → voir deploy/nginx-foxhack.conf ; le JS du site corrige déjà pour les visiteurs.\n'
      else
        ok "/$section (sans slash) → page servie directement"
      fi
      ;;
    *) warn "/$section sans slash → HTTP $code (prévois une redirection 301)" ;;
  esac
done

# --------------------------------------------------------- 3. assets du vault
printf '\n\033[1m[3] Assets de la page Offsidian\033[0m\n'
if [ -f "$DIST/offsidian/index.html" ]; then
  for asset in $(grep -oE '/assets/[A-Za-z0-9._-]+\.(js|css)' "$DIST/offsidian/index.html" | sort -u); do
    if [ ! -f "$DIST$asset" ]; then
      bad "$asset absent du dossier servi"
      printf '      → HTML et assets désynchronisés (déploiement partiel) : rsync -a --delete dist/ …\n'
      continue
    fi
    meta=$(fetch "$BASE$asset" "$TMP/asset.bin")
    code=$(echo "$meta" | cut -d'|' -f1)
    type=$(echo "$meta" | cut -d'|' -f2)
    case "$type" in
      *text/html*) bad "$asset → HTTP $code servi en « $type »"
        printf '      → nginx renvoie /index.html au lieu d un 404 : le module est refusé, page noire.\n'
        printf '      → `location /assets/ { try_files $uri =404; }`\n' ;;
      *) [ "$code" = 200 ] && ok "$asset → $code $(echo "$type" | cut -d';' -f1)" || bad "$asset → HTTP $code" ;;
    esac
  done
fi

# ------------------------------------------------------- 4. assets de Mfkey32
printf '\n\033[1m[4] Assets de la page Mfkey32\033[0m\n'
for asset in js/app.js js/mfkey32.mjs js/mfkey-worker.js css/styles.css assets/mfkey32-mark.svg; do
  if [ ! -f "$DIST/mfkey32/$asset" ]; then
    bad "/mfkey32/$asset absent du dossier servi"
    printf '      → la page mfkey32 a besoin de ses six modules JS servis tels quels.\n'
    continue
  fi
  meta=$(fetch "$BASE/mfkey32/$asset" "$TMP/mfkey-asset.bin")
  code=$(echo "$meta" | cut -d'|' -f1)
  type=$(echo "$meta" | cut -d'|' -f2)
  case "$type" in
    *text/html*) bad "/mfkey32/$asset → HTTP $code servi en « $type »"
      printf '      → l hôte renvoie une page à la place du fichier : le module est refusé.\n' ;;
    *) [ "$code" = 200 ] && ok "/mfkey32/$asset → $code $(echo "$type" | cut -d';' -f1)" || bad "/mfkey32/$asset → HTTP $code" ;;
  esac
done

for json in manifest.json outline.json search-index.json; do
  meta=$(fetch "$BASE/offsidian/$json" "$TMP/$json")
  code=$(echo "$meta" | cut -d'|' -f1)
  if [ "$code" = 200 ]; then
    ok "/offsidian/$json → $code, $(wc -c <"$TMP/$json") octets"
  else
    bad "/offsidian/$json → HTTP $code : le lecteur n'a aucune note à ouvrir"
  fi
done

printf '\n'
if [ "$fails" -eq 0 ]; then
  printf '\033[32m✓ RAS\033[0m — si la page est encore noire : F12 → Console/Réseau, et Ctrl+Maj+R.\n\n'
else
  printf '\033[31m%d point(s) à corriger\033[0m — la config nginx commentée est dans deploy/nginx-foxhack.conf.\n\n' "$fails"
  exit 1
fi
