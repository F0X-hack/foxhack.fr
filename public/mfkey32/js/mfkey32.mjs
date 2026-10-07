/**
 * mfkey32v2 — récupération de clé MIFARE Classic à partir de deux
 * authentifications mutuelles observées (nonces collectés par le Flipper Zero).
 *
 * Portage JavaScript fidèle de :
 *   - mfkey32v2.c            (github.com/equipter/mfkey32v2)
 *   - include/crypto01.c/.h  (crapto1 — bla <blapost@gmail.com>, Proxmark3 contributors, GPL-3)
 *   - include/crypto1.c      (idem)
 *   - include/bucketsort.c   (Proxmark3 contributors, GPL-3)
 *
 * Aucune dépendance : fonctionne dans le navigateur (Web Worker) et sous Node.
 */

/* ------------------------------------------------------------------ */
/* primitives                                                          */
/* ------------------------------------------------------------------ */

const LF_POLY_ODD = 0x29ce5c;
const LF_POLY_EVEN = 0x870804;

const BIT = (x, n) => (x >>> n) & 1;
/** BEBIT(x, n) = BIT(x, n ^ 24) en C (32 bits signés) ; ici version unsigned. */
const BEBIT = (x, n) => (x >>> (n ^ 24)) & 1;

/** Parité paire sur 32 bits (evenparity32). */
export function evenparity32(x) {
  x >>>= 0;
  x ^= x >>> 16;
  x ^= x >>> 8;
  x ^= x >>> 4;
  return (0x6996 >>> (x & 0xf)) & 1;
}

/** Fonction de filtrage non linéaire de Crypto1 (5 bits d'entrée → 1 bit). */
export function filter(x) {
  let f = (0xf22c0 >>> (x & 0xf)) & 16;
  f |= (0x6c9c0 >>> ((x >>> 4) & 0xf)) & 8;
  f |= (0x3c8b0 >>> ((x >>> 8) & 0xf)) & 4;
  f |= (0x1e458 >>> ((x >>> 12) & 0xf)) & 2;
  f |= (0x0d938 >>> ((x >>> 16) & 0xf)) & 1;
  return (0xec57e80a >>> f) & 1;
}

const SWAPENDIAN = (x) => {
  x = (((x >>> 8) & 0xff00ff) | ((x & 0xff00ff) << 8)) >>> 0;
  return ((x >>> 16) | (x << 16)) >>> 0;
};

/** PRNG 16 bits du tag MIFARE Classic. */
export function prngSuccessor(x, n) {
  x = SWAPENDIAN(x >>> 0);
  while (n--) {
    x = ((x >>> 1) | (((x >>> 16) ^ (x >>> 18) ^ (x >>> 19) ^ (x >>> 21)) << 31)) >>> 0;
  }
  return SWAPENDIAN(x);
}

export function crypto1Init(state, key) {
  const k = BigInt.asUintN(64, typeof key === 'bigint' ? key : BigInt('0x' + String(key)));
  state.odd = 0;
  state.even = 0;
  for (let i = 47; i > 0; i -= 2) {
    state.odd = ((state.odd << 1) | Number((k >> BigInt((i - 1) ^ 7)) & 1n)) >>> 0;
    state.even = ((state.even << 1) | Number((k >> BigInt(i ^ 7)) & 1n)) >>> 0;
  }
}

export function crypto1GetLfsr(state) {
  let lfsr = 0n;
  for (let i = 23; i >= 0; --i) {
    lfsr = (lfsr << 1n) | BigInt((state.odd >>> (i ^ 3)) & 1);
    lfsr = (lfsr << 1n) | BigInt((state.even >>> (i ^ 3)) & 1);
  }
  return lfsr;
}

export function crypto1Bit(s, input, isEncrypted) {
  const ret = filter(s.odd);
  let feedin = ret & (isEncrypted ? 1 : 0);
  feedin ^= input ? 1 : 0;
  feedin ^= LF_POLY_ODD & s.odd;
  feedin ^= LF_POLY_EVEN & s.even;
  s.even = ((s.even << 1) | evenparity32(feedin)) >>> 0;
  const t = s.odd;
  s.odd = s.even;
  s.even = t;
  return ret;
}

export function crypto1Word(s, input, isEncrypted) {
  let ret = 0;
  input >>>= 0;
  for (let i = 0; i < 32; i++) {
    ret = (ret | (crypto1Bit(s, BEBIT(input, i), isEncrypted) << (24 ^ i))) >>> 0;
  }
  return ret;
}

export function lfsrRollbackBit(s, input, fb) {
  s.odd &= 0xffffff;
  const t = s.odd;
  s.odd = s.even;
  s.even = t;

  let out = s.even & 1;
  s.even >>>= 1;
  out ^= LF_POLY_EVEN & s.even;
  out ^= LF_POLY_ODD & s.odd;
  out ^= input ? 1 : 0;
  const ret = filter(s.odd);
  out ^= ret & (fb ? 1 : 0);

  s.even = (s.even | (evenparity32(out) << 23)) >>> 0;
  return ret;
}

export function lfsrRollbackWord(s, input, fb) {
  let ret = 0;
  input >>>= 0;
  for (let i = 31; i >= 0; i--) {
    ret = (ret | (lfsrRollbackBit(s, BEBIT(input, i), fb) << (24 ^ i))) >>> 0;
  }
  return ret;
}

/* ------------------------------------------------------------------ */
/* crapto1 : reconstruction d'états LFSR à partir de 32 bits de ks     */
/* ------------------------------------------------------------------ */

const ODD_LIMIT = 1 << 21; // 2 097 152
const EVEN_LIMIT = 1 << 21;
const MAX_STATES = 1 << 18; // 262 144 états (comme l’implémentation C)

function updateContribution(tbl, i, mask1, mask2) {
  let p = tbl[i] >>> 25;
  p = ((p << 1) | evenparity32(tbl[i] & mask1)) >>> 0;
  p = ((p << 1) | evenparity32(tbl[i] & mask2)) >>> 0;
  tbl[i] = ((p << 24) | (tbl[i] & 0xffffff)) >>> 0;
}

/**
 * extend_table — version C in-place avec pointeurs ; ici tableau + indices.
 * Retourne le nouvel index de fin (peut décroître si des éléments sont supprimés).
 */
function extendTable(tbl, start, end, bit, m1, m2, input) {
  const inp = (input << 24) >>> 0;
  let head = start;
  let tail = end;
  tbl[head] = (tbl[head] << 1) >>> 0;
  while (head <= tail) {
    const f0 = filter(tbl[head]);
    const f1 = filter(tbl[head] | 1);
    if (f0 ^ f1) {
      // replace
      tbl[head] = (tbl[head] | (f0 ^ bit)) >>> 0;
      updateContribution(tbl, head, m1, m2);
      tbl[head] = (tbl[head] ^ inp) >>> 0;
    } else if (f0 === bit) {
      // insert
      tail++;
      tbl[tail] = tbl[head + 1];
      head++;
      tbl[head] = (tbl[head - 1] | 1) >>> 0;
      updateContribution(tbl, head - 1, m1, m2);
      tbl[head - 1] = (tbl[head - 1] ^ inp) >>> 0;
      updateContribution(tbl, head, m1, m2);
      tbl[head] = (tbl[head] ^ inp) >>> 0;
    } else {
      // drop
      tbl[head] = tbl[tail];
      tail--;
      head--;
    }
    head++;
    if (head > tail) break;
    tbl[head] = (tbl[head] << 1) >>> 0;
  }
  return tail;
}

function extendTableSimple(tbl, start, end, bit) {
  let head = start;
  let tail = end;
  tbl[head] = (tbl[head] << 1) >>> 0;
  while (head <= tail) {
    const f0 = filter(tbl[head]);
    const f1 = filter(tbl[head] | 1);
    if (f0 ^ f1) {
      // replace
      tbl[head] = (tbl[head] | (f0 ^ bit)) >>> 0;
    } else if (f0 === bit) {
      // insert : *++*end = *++tbl; *tbl = tbl[-1] | 1;
      tail++;
      tbl[tail] = tbl[head + 1];
      head++;
      tbl[head] = (tbl[head - 1] | 1) >>> 0;
    } else {
      // drop : *tbl-- = *(*end)--;
      tbl[head] = tbl[tail];
      tail--;
      head--;
    }
    // incrémentation de la boucle C : *++tbl <<= 1
    head++;
    if (head > tail) break;
    tbl[head] = (tbl[head] << 1) >>> 0;
  }
  return tail;
}

/**
 * bucket_sort_intersect — trie les deux listes par octet de poids fort et ne
 * conserve que les buckets non vides des DEUX côtés, en réécrivant les listes
 * triées à leur emplacement d'origine (comme en C).
 */
function bucketSortIntersect(even, estart, estop, odd, ostart, ostop) {
  const buckets = [[], []];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j <= 0xff; j++) buckets[i].push([]);
  }
  const lists = [
    [even, estart, estop],
    [odd, ostart, ostop],
  ];
  for (let i = 0; i < 2; i++) {
    const [arr, s, e] = lists[i];
    for (let p = s; p <= e; p++) {
      buckets[i][(arr[p] & 0xff000000) >>> 24].push(arr[p]);
    }
  }
  const info = [[], []];
  let numbuckets = 0;
  for (let i = 0; i < 2; i++) {
    const [arr, s] = lists[i];
    let p1 = s;
    numbuckets = 0;
    for (let j = 0; j <= 0xff; j++) {
      if (buckets[0][j].length !== 0 && buckets[1][j].length !== 0) {
        const head = p1;
        for (let k = 0; k < buckets[i][j].length; k++) arr[p1++] = buckets[i][j][k];
        info[i].push({ head, tail: p1 - 1 });
        numbuckets++;
      }
    }
  }
  return { info, numbuckets };
}

function recover(o_head, o_tail, oks, e_head, e_tail, eks, rem, states, in_, onProgress) {
  if (states.count >= MAX_STATES - 1) return states;

  if (rem === -1) {
    for (let e = e_head; e <= e_tail; e++) {
      const ev = ((even[e] << 1) ^ evenparity32(even[e] & LF_POLY_EVEN) ^ ((in_ & 4) ? 1 : 0)) >>> 0;
      for (let o = o_head; o <= o_tail; o++) {
        if (states.count >= MAX_STATES - 1) return states;
        states.even[states.count] = odd[o];
        states.odd[states.count] = (ev ^ evenparity32(odd[o] & LF_POLY_ODD)) >>> 0;
        states.count++;
      }
    }
    states.odd[states.count] = 0;
    states.even[states.count] = 0;
    return states;
  }

  let oksL = oks;
  let eksL = eks;
  let inL = in_;
  let oh = o_head;
  let ot = o_tail;
  let eh = e_head;
  let et = e_tail;
  let remL = rem;

  for (let i = 0; i < 4 && remL--; i++) {
    oksL >>>= 1;
    eksL >>>= 1;
    inL >>>= 2;
    ot = extendTable(odd, oh, ot, oksL & 1, (LF_POLY_EVEN << 1) | 1, LF_POLY_ODD << 1, 0);
    if (oh > ot) return states;
    et = extendTable(even, eh, et, eksL & 1, LF_POLY_ODD, (LF_POLY_EVEN << 1) | 1, inL & 3);
    if (eh > et) return states;
  }

  const bi = bucketSortIntersect(even, eh, et, odd, oh, ot);
  for (let i = bi.numbuckets - 1; i >= 0; i--) {
    recover(bi.info[1][i].head, bi.info[1][i].tail, oksL, bi.info[0][i].head, bi.info[0][i].tail, eksL, remL, states, inL, onProgress);
    if (states.count >= MAX_STATES - 1) return states;
  }
  return states;
}

let odd = null;
let even = null;

/**
 * lfsr_recovery32 — tous les états LFSR capables de produire `ks2` (32 bits de
 * keystream) alors que `in` était injecté dans le registre.
 */
export function lfsrRecovery32(ks2, in_, onProgress) {
  if (!odd) {
    odd = new Uint32Array(ODD_LIMIT);
    even = new Uint32Array(EVEN_LIMIT);
  }
  const states = {
    odd: new Uint32Array(MAX_STATES),
    even: new Uint32Array(MAX_STATES),
    count: 0,
  };

  let oks = 0;
  let eks = 0;
  for (let i = 31; i >= 0; i -= 2) oks = ((oks << 1) | BEBIT(ks2, i)) >>> 0;
  for (let i = 30; i >= 0; i -= 2) eks = ((eks << 1) | BEBIT(ks2, i)) >>> 0;

  let oddHead = 0;
  let oddTail = -1;
  let evenHead = 0;
  let evenTail = -1;

  for (let i = 1 << 20; i >= 0; --i) {
    const f = filter(i);
    if (f === (oks & 1)) odd[++oddTail] = i;
    if (f === (eks & 1)) even[++evenTail] = i;
  }
  if (onProgress) onProgress(0.15);

  for (let i = 0; i < 4; i++) {
    oddTail = extendTableSimple(odd, oddHead, oddTail, (oks >>>= 1) & 1);
    evenTail = extendTableSimple(even, evenHead, evenTail, (eks >>>= 1) & 1);
  }
  if (onProgress) onProgress(0.45);

  let inS = ((in_ >>> 16) & 0xff) | ((in_ << 16) >>> 0) | (in_ & 0xff00);
  inS >>>= 0;
  recover(oddHead, oddTail, oks, evenHead, evenTail, eks, 11, states, (inS << 1) >>> 0, onProgress);
  if (onProgress) onProgress(1);
  return states;
}

/* ------------------------------------------------------------------ */
/* attaque mfkey32v2                                                   */
/* ------------------------------------------------------------------ */

/**
 * @param {{cuid:number,nt0:number,nr0:number,ar0:number,nt1:number,nr1:number,ar1:number}} args
 * @returns {string|null} clé hex sur 12 caractères, ou null
 */
export function mfkey32v2(args, opts = {}) {
  const { cuid, nt0, nr0, ar0, nt1, nr1, ar1 } = args;
  const onProgress = opts.onProgress || null;
  const shouldStop = opts.shouldStop || null;

  const p64 = prngSuccessor(nt0, 64);
  const p64b = prngSuccessor(nt1, 64);
  const ks2 = (ar0 ^ p64) >>> 0;

  // La récupération d'états représente l'essentiel du temps : on lui réserve
  // les 60 premiers pourcents de la progression, la vérification les 40 restants.
  const states = lfsrRecovery32(ks2, 0, onProgress ? (ratio) => onProgress(ratio * 0.6) : null);

  const s = { odd: 0, even: 0 };
  const total = states.count;
  for (let idx = 0; idx < total; idx++) {
    if (shouldStop && shouldStop()) return null;
    s.odd = states.odd[idx];
    s.even = states.even[idx];
    if ((s.odd | s.even) === 0) break;

    const t = { odd: s.odd, even: s.even };
    lfsrRollbackWord(t, 0, 0);
    lfsrRollbackWord(t, nr0, 1);
    lfsrRollbackWord(t, (cuid ^ nt0) >>> 0, 0);
    const key = crypto1GetLfsr(t);

    crypto1Word(t, (cuid ^ nt1) >>> 0, 0);
    crypto1Word(t, nr1, 1);
    if (ar1 === ((crypto1Word(t, 0, 0) ^ p64b) >>> 0)) {
      return key.toString(16).padStart(12, '0');
    }
    if (onProgress && idx % 64 === 0) onProgress(0.6 + 0.4 * (idx / Math.max(total, 1)));
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* helpers de parsing                                                  */
/* ------------------------------------------------------------------ */

const FIELDS = ['cuid', 'nt0', 'nr0', 'ar0', 'nt1', 'nr1', 'ar1'];

export function parseNonceArgs(values) {
  const arr = Array.isArray(values) ? values : FIELDS.map((k) => values[k]);
  const out = {};
  FIELDS.forEach((k, i) => {
    const v = String(arr[i] ?? '')
      .trim()
      .replace(/^0x/i, '')
      .replace(/[\s_-]/g, '');
    if (!/^[0-9a-fA-F]{1,8}$/.test(v)) {
      throw new Error(`« ${k} » : valeur hexadécimale invalide (${JSON.stringify(arr[i])})`);
    }
    out[k] = parseInt(v.padStart(8, '0'), 16) >>> 0;
  });
  return out;
}

/** Parse un fichier .mfkey32.log généré par le Flipper Zero. */
export function parseMfkeyLog(text) {
  const entries = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((raw, lineNo) => {
    const line = raw.trim();
    if (!line) return;
    const idx = line.indexOf('cuid');
    if (idx === -1) return;
    const parts = line
      .slice(idx)
      .split(/\s+/)
      .filter((_, i) => i % 2 === 1);
    if (parts.length < 7) return;
    try {
      entries.push({ args: parseNonceArgs(parts.slice(0, 7)), line, lineNo: lineNo + 1 });
    } catch {
      /* ligne corrompue : ignorée */
    }
  });
  return entries;
}

/** Fusionne des clés au format dictionnaire Flipper (une clé hex par ligne). */
export function mergeDictionary(existingText, newKeys) {
  const lines = String(existingText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && /^[0-9a-fA-F]{12}$/.test(l) && !l.startsWith('Error'));
  const set = new Set(lines);
  const before = set.size;
  for (const k of newKeys) set.add(String(k).toLowerCase());
  return { text: Array.from(set).join('\n') + '\n', added: set.size - before, total: set.size };
}

export { FIELDS };
