# Mfkey32 — FoXhack

Application indépendante pour lancer **Mfkey32** depuis un navigateur, inspirée du labo [FoXhack](https://foxhack.fr) et de l’outil [lab.flipper.net](https://lab.flipper.net/nfc-tools).

L’interface est un workbench compact dédié à Mfkey32 : wordmark FoXhack en haut à gauche, barre supérieure discrète et panneaux techniques denses, sans sidebar. Le thème graphite utilise un seul accent orange, sans hero marketing ni éléments décoratifs superflus. Le calcul cryptographique s’exécute localement dans le navigateur et aucun nonce ni aucune clé ne quitte la machine.

Aucune dépendance runtime : HTML, CSS et JavaScript vanilla (modules ES), servis tels quels en fichiers statiques.

---

## Démarrage

En production, l’application est servie par `dist/mfkey32/` :

```
https://foxhack.fr/mfkey32/
```

En local, n’importe quel serveur statique fait l’affaire (elle n’a ni routage client ni backend) :

```bash
npm run dev          # http://localhost:5173/mfkey32/
# ou, sans build :
python3 -m http.server 8080
# → http://localhost:8080/public/mfkey32/
```

> **Connexion au Flipper** : l’API Web Serial exige un contexte sécurisé (`https://` ou `localhost`) et un navigateur Chromium sur ordinateur (Chrome, Edge, Opera ou Brave). Safari et Firefox ne l’implémentent pas ; l’import d’un fichier et le collage d’un journal restent disponibles hors ligne.

---

## Fonctionnalités

| Fonction | Détail |
| --- | --- |
| Journal / Flipper | Connexion USB Web Serial, lecture du journal et du dictionnaire utilisateur, calcul, puis écriture des nouvelles clés sur le Flipper |
| Saisie manuelle | Sept valeurs hexadécimales pour deux authentifications, avec un vecteur de test prérempli |
| Mode hors ligne | Import ou dépôt d’un fichier `.mfkey32.log`, ou collage de son contenu |
| Résultats | Progression, clés trouvées, délais dépassés, téléchargement du dictionnaire et arrêt du calcul |
| Calcul local | Moteur `mfkey32v2` exécuté dans des Web Workers |

Le réglage du délai par nonce est conservé entre les visites. Le journal/Flipper et la saisie manuelle sont présentés dans deux panneaux côte à côte sur desktop, puis empilés sur petits écrans. Un tutoriel illustré responsive pour la capture NFC et l’import du journal de nonces apparaît sous les panneaux ; son cadrage s’adapte aux petits écrans.

---

## Arborescence

```
public/mfkey32/
├── index.html              document de la page
├── css/styles.css          workbench graphite, accent orange et responsive
├── assets/
│   ├── mfkey32-mark.svg    favicon Mfkey32
│   ├── foxhack-mark.svg    marque FoXhack conservée
│   ├── flipper-lab-logo.svg (asset conservé)
│   ├── favicon.png         (asset conservé)
│   ├── reader.png           illustration du tutoriel de récupération de nonces
│   └── exemple.mfkey32.log journal de démonstration
├── docs/mfkey32v2.md       détail de l’attaque et du protocole
└── js/
    ├── app.js              interface Mfkey32 et orchestration
    ├── mfkey32.mjs         moteur mfkey32v2 (portage JS de crapto1/crypto01)
    ├── mfkey-worker.js     Web Worker : une attaque par tâche, arrêt sur délai
    ├── protobuf.js         codec protobuf minimal
    ├── flipper-serial.js   client Web Serial et session RPC du Flipper
    └── icons.js            icônes SVG inline
```

---

## Le moteur mfkey32v2

`js/mfkey32.mjs` est un portage fidèle, en JavaScript pur (typed arrays, `BigInt`
uniquement pour la clé de 48 bits), de :

- `mfkey32v2.c` — [github.com/equipter/mfkey32v2](https://github.com/equipter/mfkey32v2)
- `include/crypto01.c` / `crypto1.c` / `bucketsort.c` — crapto1, © bla & Proxmark3 contributors, **GPL-3**

Enchaînement : `prng_successor(nt0, 64)` → `ks2 = ar0 ⊕ suc⁶⁴(nt0)` →
`lfsr_recovery32(ks2, 0)` (tables de 2²¹ états, `extend_table_simple`, tri par seaux
et intersection, recursion `recover`) → pour chaque état candidat,
`lfsr_rollback_word ×3` → `crypto1_get_lfsr` → vérification sur la seconde
authentification (`nt1`, `nr1`, `ar1`).

**Validé** contre le binaire C de référence compilé avec gcc : résultats identiques sur
le vecteur public, sur des jeux de nonces incohérents (aucune clé), et sur 7 clés
synthétisées (aller-retour clé → nonces → clé). ~0,5 à 0,9 s par attaque dans Node,
comparable au C (~0,17 s) compte tenu de l'écart d'optimisation.

Voir [`docs/mfkey32v2.md`](docs/mfkey32v2.md) pour le détail de l'attaque et du protocole.

---

## Tests

Le harnais de développement (bancs Node + DOM simulé + Flipper simulé, comparant le
moteur JS au binaire C de référence) n’est pas livré avec la page ; il reste hors de
`public/`.

---

## Mentions

Projet de reconstruction à but pédagogique, **sans lien avec Flipper Zero Inc.**
Le nom, le logo et la charte appartiennent à leurs ayants droit.

- Moteur : portage de [mfkey32v2](https://github.com/equipter/mfkey32v2) (GPL-3),
  basé sur `crypto01`/crapto1 de [Proxmark3](https://github.com/RfidResearchGroup/proxmark3) (GPL-3).
  La notice complète est servie à [`/licenses/mfkey32-NOTICE.txt`](https://foxhack.fr/licenses/mfkey32-NOTICE.txt).
- Icônes `mdi-*` : [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0).
- Documentation : <https://docs.flipper.net/nfc/mfkey32>.

N’utilisez cet outil que sur des cartes et des lecteurs dont vous êtes propriétaire ou
dont vous avez l’autorisation explicite d’auditer la sécurité.
