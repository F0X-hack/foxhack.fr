/**
 * Encodeur/décodeur protobuf minimal, limité au sous-ensemble du protocole RPC
 * du Flipper Zero nécessaire à cette page (PB.Main + PB_Storage + PB_System).
 *
 * Numéros de champs relevés dans le schéma protobuf officiel du firmware
 * (mêmes valeurs que le client web lab.flipper.net).
 */

/* ------------------------------------------------------------------ */
/* primitives varint                                                   */
/* ------------------------------------------------------------------ */

export function writeVarint(out, value) {
  let v = BigInt.asUintN(64, BigInt(value));
  do {
    const byte = Number(v & 0x7fn);
    v >>= 7n;
    out.push(v > 0n ? byte | 0x80 : byte);
  } while (v > 0n);
}

class Reader {
  constructor(buffer) {
    this.buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.pos = 0;
  }
  get len() {
    return this.buf.length;
  }
  varint() {
    let result = 0n;
    let shift = 0n;
    for (;;) {
      if (this.pos >= this.buf.length) throw new Error('protobuf: varint tronqué');
      const byte = this.buf[this.pos++];
      result |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7n;
    }
    return result;
  }
  uint32() {
    return Number(BigInt.asUintN(32, this.varint()));
  }
  /** uint64 : rendu en Number (exact jusqu'à 2^53, largement suffisant ici). */
  uint64() {
    return Number(this.varint());
  }
  int32() {
    return Number(BigInt.asIntN(32, this.varint()));
  }
  bool() {
    return this.varint() !== 0n;
  }
  bytes() {
    const len = this.uint32();
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }
  string() {
    return new TextDecoder().decode(this.bytes());
  }
  /** Saute un champ dont la clé (numéro + wireType) vient d'être lue. */
  skip(key) {
    switch (key & 7) {
      case 0:
        this.varint();
        break;
      case 1:
        this.pos += 8;
        break;
      case 2:
        this.pos += this.uint32(); // la longueur fait partie du champ
        break;
      case 5:
        this.pos += 4;
        break;
      default:
        throw new Error(`protobuf: wireType ${key & 7} non géré`);
    }
  }
}

/** Écrivain très simple : chaque champ pousse ses octets dans un tableau. */
class Writer {
  constructor() {
    this.out = [];
  }
  tag(field, wireType) {
    writeVarint(this.out, (field << 3) | wireType);
    return this;
  }
  uint32(field, value) {
    if (value === undefined || value === null) return this;
    this.tag(field, 0);
    writeVarint(this.out, value);
    return this;
  }
  bool(field, value) {
    if (value === undefined || value === null) return this;
    this.tag(field, 0);
    this.out.push(value ? 1 : 0);
    return this;
  }
  string(field, value) {
    if (value === undefined || value === null) return this;
    const bytes = new TextEncoder().encode(String(value));
    this.tag(field, 2);
    writeVarint(this.out, bytes.length);
    for (const b of bytes) this.out.push(b);
    return this;
  }
  bytes(field, value) {
    if (value === undefined || value === null) return this;
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    this.tag(field, 2);
    writeVarint(this.out, bytes.length);
    for (const b of bytes) this.out.push(b);
    return this;
  }
  message(field, encoded) {
    this.tag(field, 2);
    writeVarint(this.out, encoded.length);
    for (const b of encoded) this.out.push(b);
    return this;
  }
  finish() {
    return new Uint8Array(this.out);
  }
}

/* ------------------------------------------------------------------ */
/* schéma                                                              */
/* ------------------------------------------------------------------ */

/** Champs de PB.Main (numéro de champ → nom). */
export const PB_MAIN_FIELDS = {
  1: 'commandId',
  2: 'commandStatus',
  3: 'hasNext',
  4: 'empty',
  5: 'systemPingRequest',
  6: 'systemPingResponse',
  7: 'storageListRequest',
  8: 'storageListResponse',
  9: 'storageReadRequest',
  10: 'storageReadResponse',
  11: 'storageWriteRequest',
  19: 'stopSession',
  24: 'storageStatRequest',
  25: 'storageStatResponse',
  28: 'storageInfoRequest',
  29: 'storageInfoResponse',
  31: 'systemRebootRequest',
  32: 'systemDeviceInfoRequest',
  33: 'systemDeviceInfoResponse',
  39: 'systemProtobufVersionRequest',
  40: 'systemProtobufVersionResponse',
  61: 'propertyGetRequest',
  62: 'propertyGetResponse',
};

/** Nom de champ PB.Main → numéro (pour l'encodage). */
export const PB_MAIN_TAGS = Object.fromEntries(Object.entries(PB_MAIN_FIELDS).map(([k, v]) => [v, Number(k)]));

export const COMMAND_STATUS = {
  0: 'OK',
  1: 'ERROR',
  2: 'ERROR_DECODE',
  3: 'ERROR_NOT_IMPLEMENTED',
  4: 'ERROR_BUSY',
  5: 'ERROR_STORAGE_NOT_READY',
  6: 'ERROR_STORAGE_EXIST',
  7: 'ERROR_STORAGE_NOT_EXIST',
  8: 'ERROR_STORAGE_INVALID_PARAMETER',
  9: 'ERROR_STORAGE_DENIED',
  10: 'ERROR_STORAGE_INVALID_NAME',
  11: 'ERROR_STORAGE_INTERNAL',
  12: 'ERROR_STORAGE_NOT_IMPLEMENTED',
  13: 'ERROR_STORAGE_ALREADY_OPEN',
  14: 'ERROR_CONTINUOUS_COMMAND_INTERRUPTED',
  15: 'ERROR_INVALID_PARAMETERS',
  16: 'ERROR_APP_CANT_START',
  17: 'ERROR_APP_SYSTEM_LOCKED',
  18: 'ERROR_STORAGE_DIR_NOT_EMPTY',
  21: 'ERROR_APP_NOT_RUNNING',
  22: 'ERROR_APP_CMD_ERROR',
};

export const FILE_TYPE = { 0: 'DIR', 1: 'FILE' };

/* ------------------------------------------------------------------ */
/* sous-messages                                                       */
/* ------------------------------------------------------------------ */

function decodeFile(reader) {
  const file = { type: 0, name: '', size: 0, data: new Uint8Array(0), md5sum: '' };
  while (reader.pos < reader.len) {
    const key = reader.uint32();
    const field = key >>> 3;
    switch (field) {
      case 1:
        file.type = reader.int32();
        break;
      case 2:
        file.name = reader.string();
        break;
      case 3:
        file.size = reader.uint32();
        break;
      case 4:
        file.data = reader.bytes();
        break;
      case 5:
        file.md5sum = reader.string();
        break;
      default:
        reader.skip(key);
    }
  }
  file.typeName = FILE_TYPE[file.type] ?? String(file.type);
  return file;
}

function encodeFile(file) {
  const w = new Writer();
  if (file.type !== undefined) w.uint32(1, file.type);
  if (file.name !== undefined) w.string(2, file.name);
  if (file.size !== undefined) w.uint32(3, file.size);
  if (file.data !== undefined) w.bytes(4, file.data);
  if (file.md5sum !== undefined) w.string(5, file.md5sum);
  return w.finish();
}

const SUB_DECODERS = {
  storageListResponse: (r) => {
    const files = [];
    while (r.pos < r.len) {
      const key = r.uint32();
      if ((key >>> 3) === 1 && (key & 7) === 2) files.push(decodeFile(new Reader(r.bytes())));
      else r.skip(key);
    }
    return { file: files };
  },
  storageReadResponse: (r) => ({ file: decodeNestedFile(r, 1) }),
  storageStatResponse: (r) => ({ file: decodeNestedFile(r, 1) }),
  storageInfoResponse: (r) => {
    const out = { totalSpace: 0, freeSpace: 0 };
    while (r.pos < r.len) {
      const key = r.uint32();
      const field = key >>> 3;
      if (field === 1) out.totalSpace = r.uint64();
      else if (field === 2) out.freeSpace = r.uint64();
      else r.skip(key);
    }
    return out;
  },
  // réponse répétée : chaque occurrence porte une paire clé/valeur
  systemDeviceInfoResponse: (r) => {
    const out = { key: undefined, value: undefined };
    while (r.pos < r.len) {
      const key = r.uint32();
      const field = key >>> 3;
      if (field === 1) out.key = r.string();
      else if (field === 2) out.value = r.string();
      else r.skip(key);
    }
    return out;
  },
  systemProtobufVersionResponse: (r) => {
    const out = { major: 0, minor: 0 };
    while (r.pos < r.len) {
      const key = r.uint32();
      const field = key >>> 3;
      if (field === 1) out.major = r.uint32();
      else if (field === 2) out.minor = r.uint32();
      else r.skip(key);
    }
    return out;
  },
  systemPingResponse: (r) => {
    const out = { data: new Uint8Array(0) };
    while (r.pos < r.len) {
      const key = r.uint32();
      if ((key >>> 3) === 1 && (key & 7) === 2) out.data = r.bytes();
      else r.skip(key);
    }
    return out;
  },
  /* --- requêtes (décodées pour symétrie : utile aux tests et au débogage) --- */
  storageReadRequest: (r) => decodePathOnly(r),
  storageStatRequest: (r) => decodePathOnly(r),
  storageInfoRequest: (r) => decodePathOnly(r),
  systemDeviceInfoRequest: () => ({}),
  systemProtobufVersionRequest: () => ({}),
  systemRebootRequest: () => ({}),
  empty: () => ({}),
  stopSession: () => ({}),
  storageListRequest: (r) => {
    const out = { path: '', includeMd5: false, filterMaxSize: 0 };
    while (r.pos < r.len) {
      const key = r.uint32();
      const field = key >>> 3;
      if (field === 1) out.path = r.string();
      else if (field === 2) out.includeMd5 = r.bool();
      else if (field === 3) out.filterMaxSize = r.uint32();
      else r.skip(key);
    }
    return out;
  },
  storageWriteRequest: (r) => {
    const out = { path: '', file: null };
    while (r.pos < r.len) {
      const key = r.uint32();
      const field = key >>> 3;
      if (field === 1) out.path = r.string();
      else if (field === 2) out.file = decodeFile(new Reader(r.bytes()));
      else r.skip(key);
    }
    return out;
  },
  systemPingRequest: (r) => {
    const out = { data: new Uint8Array(0) };
    while (r.pos < r.len) {
      const key = r.uint32();
      if ((key >>> 3) === 1 && (key & 7) === 2) out.data = r.bytes();
      else r.skip(key);
    }
    return out;
  },
  propertyGetRequest: (r) => {
    const out = { key: '' };
    while (r.pos < r.len) {
      const key = r.uint32();
      if ((key >>> 3) === 1) out.key = r.string();
      else r.skip(key);
    }
    return out;
  },
  propertyGetResponse: (r) => {
    const out = { items: [] };
    while (r.pos < r.len) {
      const key = r.uint32();
      if ((key >>> 3) === 1 && (key & 7) === 2) {
        const sub = new Reader(r.bytes());
        const item = { key: '', value: [] };
        while (sub.pos < sub.len) {
          const k2 = sub.uint32();
          const f2 = k2 >>> 3;
          if (f2 === 1) item.key = sub.string();
          else if (f2 === 2) item.value.push(sub.string());
          else sub.skip(k2);
        }
        out.items.push(item);
      } else r.skip(key);
    }
    return out;
  },
};

/** Décode un sous-message ne portant qu'un chemin (champ 1). */
function decodePathOnly(reader) {
  const out = { path: '' };
  while (reader.pos < reader.len) {
    const key = reader.uint32();
    if ((key >>> 3) === 1 && (key & 7) === 2) out.path = reader.string();
    else reader.skip(key);
  }
  return out;
}

/** Décode un sous-message PB_Storage.File porté par le champ `fieldNo`. */
function decodeNestedFile(reader, fieldNo) {
  let file = null;
  while (reader.pos < reader.len) {
    const key = reader.uint32();
    if ((key >>> 3) === fieldNo && (key & 7) === 2) file = decodeFile(new Reader(reader.bytes()));
    else reader.skip(key);
  }
  return file;
}

/* ------------------------------------------------------------------ */
/* PB.Main                                                             */
/* ------------------------------------------------------------------ */

/** Décode un message PB.Main complet (sans le préfixe de longueur). */
export function decodeMain(buffer) {
  const reader = new Reader(buffer);
  const msg = {
    commandId: 0,
    commandStatus: 0,
    hasNext: false,
    commandStatusName: 'OK',
  };
  while (reader.pos < reader.len) {
    const key = reader.uint32();
    const field = key >>> 3;
    const wireType = key & 7;
    const name = PB_MAIN_FIELDS[field];
    if (!name) {
      reader.skip(key);
      continue;
    }
    if (wireType === 0) {
      const v = reader.uint32();
      msg[name] = name === 'hasNext' ? v !== 0 : v;
    } else if (wireType === 2) {
      const payload = reader.bytes();
      const decoder = SUB_DECODERS[name];
      const decoded = decoder ? decoder(new Reader(payload)) : { raw: payload };
      // Un même champ peut apparaître plusieurs fois (réponses multi-trames,
      // paires clé/valeur de systemDeviceInfo, listes de fichiers…) : on accumule.
      if (Object.prototype.hasOwnProperty.call(msg, name)) {
        if (!Array.isArray(msg[name])) msg[name] = [msg[name]];
        msg[name].push(decoded);
      } else {
        msg[name] = decoded;
      }
    } else {
      reader.skip(key);
    }
  }
  msg.commandStatusName = COMMAND_STATUS[msg.commandStatus] ?? `ERROR_${msg.commandStatus}`;
  return msg;
}

/** Encode un message PB.Main. `content` = { nomDuChamp: valeur }. */
export function encodeMain({ commandId = 0, commandStatus = 0, hasNext = false, ...content }) {
  const w = new Writer();
  w.uint32(1, commandId);
  w.uint32(2, commandStatus);
  w.bool(3, hasNext);
  for (const [name, value] of Object.entries(content)) {
    const field = PB_MAIN_TAGS[name];
    if (!field) throw new Error(`encodeMain: champ inconnu « ${name} »`);
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) w.message(field, encodeSub(name, item));
  }
  return w.finish();
}

function encodeSub(name, value) {
  const w = new Writer();
  switch (name) {
    case 'empty':
    case 'stopSession':
    case 'systemDeviceInfoRequest':
    case 'systemProtobufVersionRequest':
    case 'systemRebootRequest':
      return w.finish();
    case 'systemPingRequest':
      return w.bytes(1, value?.data ?? new Uint8Array(0)).finish();
    case 'storageReadRequest':
    case 'storageStatRequest':
    case 'storageInfoRequest':
      return w.string(1, value.path).finish();
    case 'storageListRequest':
      w.string(1, value.path);
      if (value.includeMd5 !== undefined) w.bool(2, value.includeMd5);
      return w.finish();
    case 'storageWriteRequest':
      w.string(1, value.path);
      return w.message(2, encodeFile(value.file ?? {})).finish();
    case 'propertyGetRequest':
      return w.string(1, value.key).finish();

    /* --- réponses (utilisées par le simulateur de Flipper et les tests) --- */
    case 'storageReadResponse':
    case 'storageStatResponse':
      return w.message(1, encodeFile(value.file ?? value ?? {})).finish();
    case 'storageListResponse':
      for (const file of value.file ?? value ?? []) w.message(1, encodeFile(file));
      return w.finish();
    case 'storageInfoResponse':
      w.uint32(1, value?.totalSpace ?? 0);
      return w.uint32(2, value?.freeSpace ?? 0).finish();
    case 'systemDeviceInfoResponse':
      w.string(1, value?.key ?? '');
      return w.string(2, value?.value ?? '').finish();
    case 'systemProtobufVersionResponse':
      w.uint32(1, value?.major ?? 0);
      return w.uint32(2, value?.minor ?? 0).finish();
    case 'systemPingResponse':
      return w.bytes(1, value?.data ?? new Uint8Array(0)).finish();
    case 'propertyGetResponse':
      return w.message(1, encodePropertyItem(value)).finish();
    default:
      throw new Error(`encodeSub: champ non géré « ${name} »`);
  }
}

function encodePropertyItem(item) {
  const w = new Writer();
  w.string(1, item.key ?? '');
  for (const value of item.value ?? []) w.string(2, value);
  return w.finish();
}

/** Préfixe un message PB.Main de sa longueur (trame « delimited »). */
export function encodeMainDelimited(payload) {
  const msg = encodeMain(payload);
  const out = [];
  writeVarint(out, msg.length);
  return new Uint8Array([...out, ...msg]);
}

/**
 * Extrait les trames PB.Main complètes d'un buffer accumulé.
 * @returns {{messages: object[], rest: Uint8Array}}
 */
export function drainDelimited(chunks) {
  const messages = [];
  let offset = 0;
  for (;;) {
    const header = new Reader(chunks.subarray(offset));
    let length;
    try {
      length = header.uint32();
    } catch {
      break;
    }
    const start = offset + header.pos;
    if (start + length > chunks.length) break;
    try {
      messages.push(decodeMain(chunks.subarray(start, start + length)));
    } catch {
      /* trame corrompue : on la saute */
    }
    offset = start + length;
  }
  return { messages, rest: chunks.slice(offset) };
}
