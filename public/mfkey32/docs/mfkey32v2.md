# Mfkey32v2 et protocole Flipper — notes techniques

Ce document décrit ce que la page `/nfc-tools` met en œuvre : l'attaque mfkey32v2 sur
MIFARE Classic, le format du journal produit par le Flipper Zero, et le protocole RPC
série utilisé pour dialoguer avec l'appareil depuis un navigateur.

---

## 1. Crypto1 et authentification MIFARE Classic

### 1.1 Le chiffrement

Crypto1 est un chiffrement de flot à registre à décalage (LFSR) de **48 bits**, muni
d'une fonction de filtrage non linéaire `filter()` à 20 bits d'entrée. L'état est
représenté de façon duale :

- `odd`  — les 24 bits d'indice pair du LFSR,
- `even` — les 24 bits d'indice impair.

Polynômes de rétroaction :

```
LF_POLY_ODD  = 0x29CE5C
LF_POLY_EVEN = 0x870804
```

Une étape (`crypto1_bit`) produit un bit de flux `ret = filter(odd)`, calcule le bit de
rétroaction (parité **paire** de `ret·is_encrypted ⊕ in ⊕ (LF_POLY_ODD & odd) ⊕
(LF_POLY_EVEN & even)`), puis permute `odd` et `even`.

La convention « gros boutiste » du protocole est gérée par la macro
`BEBIT(x, n) = BIT(x, n ^ 24)` : les mots de 32 bits sont traités bit de poids fort
d'abord.

### 1.2 Le générateur de nonces de la carte

```
prng_successor(x, n) :
    x ← SWAPENDIAN(x)
    n fois : x ← (x >> 1) | ((x>>16) ⊕ (x>>18) ⊕ (x>>19) ⊕ (x>>21)) << 31
    renvoyer SWAPENDIAN(x)
```

C'est un LFSR de 16 bits « dilaté » sur 32 : la carte ne tire en réalité que 16 bits
aléatoires, ce qui est au cœur de l'attaque.

### 1.3 Déroulé d'une authentification

Notations : `⊕` = XOR, `{x}` = la valeur chiffrée de `x`, `sucⁿ` = `prng_successor(·, n)`.

| Étape | Émetteur | Message |
| --- | --- | --- |
| 1 | lecteur | `AUTH (0x60/0x61) + bloc` |
| 2 | carte | `nt` **en clair** |
| 3 | lecteur | `{nr} ⊕ {ar}` (8 octets + parités) |
| 4 | carte | `{at}` (4 octets + parités) |

Calculs, avec `s = crypto1_create(clé)` :

```
ks0 = crypto1_word(s, uid ⊕ nt, 0)      // chargement en clair
ks1 = crypto1_word(s, nr, 0)            // {nr} = nr ⊕ ks1
ks2 = crypto1_word(s, 0, 0)             // {ar} = suc⁶⁴(nt) ⊕ ks2
        ← la carte reçoit {nr}{ar}, les déchiffre et vérifie ar == suc⁶⁴(nt)
ks3 = crypto1_word(s, {nr}, 1)          // la carte injecte {nr} en mode chiffré
ks4 = crypto1_word(s, 0, 0)             // {at} = suc⁹⁶(nt) ⊕ ks4
```

**Points qui prêtent à confusion** (et qui ont coûté du temps lors de cette
reconstruction) :

- le champ `nr` du journal `.mfkey32.log` contient **`{nr}`, la valeur chiffrée**, et non
  `nr` en clair — mfkey32v2 le réinjecte donc avec `is_encrypted = 1`, ce qui le
  déchiffre au passage et fait avancer le LFSR exactement comme sur la carte ;
- `{ar}` est construit avec `suc⁶⁴(nt)`, alors que la vérification de `{at}` par le
  lecteur utilise `suc⁹⁶(nt)` ;
- l'attaque n'a besoin que de **deux** authentifications ; `at` n'est jamais relevé.

---

## 2. Le journal `.mfkey32.log`

Chemin sur la carte microSD : `/ext/nfc/.mfkey32.log`. Une ligne par paire
d'authentifications capturée par l'application *Detect reader* :

```
Sec 4: cuid 2a234f80 nt0 55721809 nr0 ce9985f6 ar0 772f55be nt1 a27173f2 nr1 e386b505 ar1 5fa65203
```

Sept valeurs hexadécimales de 32 bits, dans l'ordre `cuid, nt0, nr0, ar0, nt1, nr1, ar1`.
Le parseur de cette page repère le mot `cuid`, puis lit un jeton sur deux (les noms de
champs alternent avec les valeurs), ce qui tolère les préfixes (`Sec 4:`, horodatage…).

Les clés découvertes sont ajoutées au dictionnaire utilisateur
`/ext/nfc/assets/mf_classic_dict_user.nfc` — un simple fichier texte, **une clé de 12
caractères hexadécimaux par ligne**. Les lignes `Error: …` produites par les exécutions
interrompues sont filtrées lors de la fusion.

---

## 3. L'attaque mfkey32v2

### 3.1 Principe

Deux authentifications avec la même clé et le même `uid` donnent accès à 32 bits de flux
connu (`ks2 = {ar0} ⊕ suc⁶⁴(nt0)`). À partir de ces 32 bits, on reconstruit les états
LFSR compatibles, puis on « déroule à l'envers » jusqu'à la clé et on valide sur la
seconde authentification.

### 3.2 Étapes

```
p64  = prng_successor(nt0, 64)
p64b = prng_successor(nt1, 64)
ks2  = ar0 ⊕ p64

s = lfsr_recovery32(ks2, 0)                    // tous les états compatibles

pour chaque état t de s (jusqu'au terminateur {0,0}) :
    lfsr_rollback_word(t, 0,        0)         // annule ks2
    lfsr_rollback_word(t, nr0,      1)         // annule l'injection de {nr0}
    lfsr_rollback_word(t, uid ⊕ nt0, 0)        // annule le chargement initial
    clé = crypto1_get_lfsr(t)

    crypto1_word(t, uid ⊕ nt1, 0)
    crypto1_word(t, nr1,         1)
    si ar1 == crypto1_word(t, 0, 0) ⊕ p64b :   // validation
        renvoyer clé
```

### 3.3 `lfsr_recovery32`

1. Séparer `ks2` en deux sous-flux de 16 bits, `oks` (bits d'indice pair) et `eks`
   (bits d'indice impair).
2. Amorcer deux tables de 2²⁰ + 1 entrées avec tous les états de 21 bits dont
   `filter(état)` vaut le premier bit de flux attendu.
3. Quatre passes de `extend_table_simple` : chaque état est décalé à gauche, puis
   **remplacé** (`f0 ≠ f1`), **dupliqué** (`f0 = f1 = bit`) ou **supprimé** — d'où la
   contraction rapide des tables (~500 000 entrées chacune).
4. Permutation d'octets de `in`, puis `recover(…, rem = 11, …)` :
   - 4 passes de `extend_table` (qui ajoute la *contribution* — parités des deux
     polynômes — dans les 8 bits de poids fort de chaque entrée),
   - `bucket_sort_intersect` : tri des deux tables par octet de poids fort et
     **conservation des seuls seaux non vides des deux côtés** (c'est l'élagage crucial :
     un état `odd` ne peut se combiner qu'à un `even` de même préfixe),
   - récursion sur chaque seau jusqu'à `rem = -1`, où les paires `(odd, even)`
     survivantes sont émises dans la liste d'états (capacité 2¹⁸, terminateur `{0,0}`).

Pour le vecteur de test public : 68 282 états candidats, clé trouvée en tête de liste.

### 3.4 Pièges de portage rencontrés

| Piège | Explication |
| --- | --- |
| `*tbl-- = *(*end)--` | En C, la valeur est écrite **avant** la décrémentation du pointeur. Traduit naïvement (`head--` avant écriture), l'algorithme diverge dès la première passe : les tables ne se contractent plus et la liste d'états sature. |
| `*++*end = *++tbl; *tbl = tbl[-1] \| 1;` | L'insertion consomme **deux** positions : l'élément suivant est déplacé en fin de liste sans être examiné, puis le pointeur avance de 2. |
| Parité | Crypto1 utilise la parité **paire** (`evenparity32`), alors que le protocole ISO 14443-A transmet une parité **impaire** sur les octets en clair. |
| `filter()` | Il existe deux implémentations historiques (table LUT à 6×5 bits version libnfc, et shifts version crapto1) qui **ne coïncident pas**. Seule celle de crapto1 (`0xf22c0`, `0x6c9c0`, `0x3c8b0`, `0x1e458`, `0x0d938`, puis `BIT(0xEC57E80A, f)`) est correcte ici — vérifiée octet par octet sur 2²⁰ entrées contre le binaire C. |
| 32 bits non signés | En JS, chaque `<<`, `^`, `|` doit être suivi de `>>> 0`, sinon les valeurs passent en négatif et `filter()`/`BEBIT()` dérivent. |

---

## 4. Dialoguer avec le Flipper depuis le navigateur

### 4.1 Liaison

1. `navigator.serial.requestPort({ filters: [{ usbVendorId: 0x0483, usbProductId: 0x5740 }] })`
   (0x0483 = STMicroelectronics, 0x5740 = CDC virtuel du Flipper).
2. `port.open({ baudRate: 1 })` — le débit est ignoré par le CDC-ACM du Flipper ; le
   client officiel utilise `1`.
3. Écrire `start_rpc_session\r` en mode texte. Le Flipper répond par l'écho de la
   commande puis bascule en protobuf binaire.
4. Échanger des messages `PB.Main` **préfixés de leur longueur** (varint), dans les deux
   sens.

> **Piège de cadrage** : l'écho texte et un préfixe de longueur sont ambigus — `0x0a`
> est à la fois LF et la longueur 10. Ne « nettoyer » le flux texte que devant une vraie
> ligne (≥ 4 caractères imprimables suivis de CR/LF), sinon on ampute les trames courtes.

### 4.2 `PB.Main`

```
1 commandId      uint32     identifiant de requête (le client l'incrémente)
2 commandStatus  int32      0 = OK ; voir codes d'erreur ci-dessous
3 hasNext        bool       true = la réponse continue sur une autre trame
4..N oneof       content    un sous-message par commande
```

Sous-ensemble utilisé par cette page :

| Champ | Nom | Requête | Réponse |
| --- | --- | --- | --- |
| 5 / 6 | `systemPingRequest` / `…Response` | `data: bytes` | `data: bytes` |
| 7 / 8 | `storageListRequest` / `…Response` | `path` | `file[]` répété |
| 9 / 10 | `storageReadRequest` / `…Response` | `path` | `file` (données découpées) |
| 11 | `storageWriteRequest` | `path`, `file.data` | — |
| 19 | `stopSession` | — | — |
| 24 / 25 | `storageStatRequest` / `…Response` | `path` | `file` |
| 28 / 29 | `storageInfoRequest` / `…Response` | `path` | `totalSpace`, `freeSpace` (uint64) |
| 32 / 33 | `systemDeviceInfoRequest` / `…Response` | — | `key`, `value` **répétés** |
| 39 / 40 | `systemProtobufVersionRequest` / `…Response` | — | `major`, `minor` |

`PB_Storage.File` : `1 type` (0 = DIR, 1 = FILE), `2 name`, `3 size`, `4 data`,
`5 md5sum`.

Codes `PB_CommandStatus` utiles : `0 OK`, `1 ERROR`, `3 ERROR_NOT_IMPLEMENTED`,
`4 ERROR_BUSY`, `5 ERROR_STORAGE_NOT_READY`, `7 ERROR_STORAGE_NOT_EXIST`,
`9 ERROR_STORAGE_DENIED`, `15 ERROR_INVALID_PARAMETERS`.

> Un même champ de sous-message peut apparaître **plusieurs fois** dans une trame
> (`systemDeviceInfoResponse` envoie une paire clé/valeur par occurrence,
> `storageListResponse` envoie un fichier par occurrence). Un décodeur qui écrase au
> lieu d'accumuler perd silencieusement des données.

### 4.3 Séquence de la page

```
connect()
├─ requestPort + open(baudRate 1)
├─ write "start_rpc_session\r"   → attendre l'écho, purger le buffer
├─ systemPingRequest             → valider la session
└─ readInfo()
   ├─ systemDeviceInfoRequest    → hardware.name / firmware.version / …
   ├─ systemProtobufVersionRequest
   ├─ storageListRequest "/ext"  → non vide ⇒ microSD installée
   └─ storageInfoRequest "/ext"  → espace total / libre

runAttack()
├─ storageReadRequest  "/ext/nfc/.mfkey32.log"       (réponse multi-trames)
├─ storageReadRequest  "/ext/nfc/assets/mf_classic_dict_user.nfc"
├─ N × mfkey32v2 en Web Workers (délai par nonce, défaut 15 s)
├─ fusion des clés (déduplication, lignes "Error:" écartées)
└─ storageWriteRequest "/ext/nfc/assets/mf_classic_dict_user.nfc" (trames de 2 Ko)
```

---

## 5. Vecteurs de test

| cuid | nt0 | nr0 | ar0 | nt1 | nr1 | ar1 | clé |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `2a234f80` | `55721809` | `ce9985f6` | `772f55be` | `a27173f2` | `e386b505` | `5fa65203` | `a0a1a2a3a4a5` |
| `162a2785` | `3b42af56` | `e4b043b5` | `b55989ff` | `45d1dfc0` | `90a75b74` | `943c009d` | — (nonces incohérents) |
| `d92e333a` | `66f2f387` | `e48e5936` | `f126635e` | `d5b3406c` | `fcf383f9` | `69441f81` | — (nonces incohérents) |

Le premier jeu est celui pré-rempli dans le formulaire « saisie manuelle » du site
d'origine. Les deux suivants sont des tirages aléatoires : le binaire C de référence et
ce portage renvoient tous deux « aucune clé », ce qui en fait de bons cas de non-régression
contre les faux positifs.

Pour fabriquer des vecteurs **positifs** supplémentaires, générer les nonces côté carte
(§ 1.3) à partir d'une clé connue — attention à journaliser `{nr}` et non `nr`.

---

## 6. Sources

- [equipter/mfkey32v2](https://github.com/equipter/mfkey32v2) — `mfkey32v2.c`,
  `include/crypto01.c`, `include/crypto1.c`, `include/bucketsort.c`, GPL-3.
- [RfidResearchGroup/proxmark3](https://github.com/RfidResearchGroup/proxmark3) —
  crapto1, `mifare_classic_authex` (séquence d'authentification côté lecteur).
- C. Meijer & R. Verdult, *Ciphertext-only Cryptanalysis on Hardened Mifare Classic
  Cards* — le cadre théorique de l'attaque.
- [eprint 2024/1275](https://eprint.iacr.org/2024/1275) — tables pas à pas du protocole
  d'authentification et de sa variante imbriquée.
- [docs.flipper.net/nfc/mfkey32](https://docs.flipper.net/nfc/mfkey32) — documentation
  utilisateur officielle.
