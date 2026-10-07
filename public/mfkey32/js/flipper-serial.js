/**
 * Client Web Serial pour le Flipper Zero (session RPC protobuf).
 *
 * Même approche que le client web officiel :
 *   - port série CDC ouvert à 1 baud (le Flipper ignore ce paramètre),
 *   - envoi de « start_rpc_session\r » en mode CLI texte,
 *   - puis échange de trames PB.Main préfixées de leur longueur.
 */

import { encodeMainDelimited, drainDelimited } from './protobuf.js';

/** Ramène un champ protobuf (éventuellement répété) à une liste. */
const asList = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
const lastOf = (value) => {
  const list = asList(value);
  return list.length ? list[list.length - 1] : undefined;
};

export const USB_FILTERS = [{ usbVendorId: 0x0483, usbProductId: 0x5740 }]; // STMicroelectronics / Flipper Zero

export class FlipperSerialError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FlipperSerialError';
    this.code = code;
  }
}

export class FlipperSerial {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.connected = false;
    this.rpcActive = false;
    this.chunks = new Uint8Array(0);
    this.pending = new Map();
    this.nextCommandId = 1;
    this.info = null;
    this.listeners = new Set();
    this.readLoopPromise = null;
  }

  static get supported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  on(event, handler) {
    this.listeners.add({ event, handler });
    return () => this.listeners.delete({ event, handler });
  }

  emit(event, payload) {
    for (const l of this.listeners) if (l.event === event) l.handler(payload);
  }

  /* ---------------- connexion ---------------- */

  async connect({ onStatus = () => {} } = {}) {
    if (!FlipperSerial.supported) {
      throw new FlipperSerialError(
        "Ce navigateur ne prend pas en charge l'API Web Serial. Utilisez Chrome, Edge ou Opera sur ordinateur.",
        'UNSUPPORTED_BROWSER',
      );
    }
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      throw new FlipperSerialError(
        'Le port série Web ne fonctionne pas dans les navigateurs mobiles. Branchez le Flipper à un ordinateur.',
        'MOBILE_BROWSER',
      );
    }

    onStatus('Choisissez votre Flipper Zero dans la fenêtre du navigateur…');
    const known = await navigator.serial.getPorts().catch(() => []);
    let port =
      known.find((p) => {
        const i = p.getInfo();
        return i.usbVendorId === USB_FILTERS[0].usbVendorId && i.usbProductId === USB_FILTERS[0].usbProductId;
      }) ?? null;
    if (!port) {
      port = await navigator.serial.requestPort({ filters: USB_FILTERS }).catch((e) => {
        throw new FlipperSerialError(
          'Aucun port série sélectionné. Rebranchez le Flipper (câble USB-C données) et réessayez.',
          'NO_PORT',
        );
      });
    }

    onStatus('Ouverture du port série…');
    await port.open({ baudRate: 1 }).catch((e) => {
      throw new FlipperSerialError(
        e?.message?.includes('already open') || e?.message?.includes('already connected')
          ? 'Le port série est déjà utilisé (fermez qFlipper, le CLI ou un autre onglet).'
          : `Impossible d'ouvrir le port série : ${e?.message ?? e}`,
        'OPEN_FAILED',
      );
    });

    this.port = port;
    this.connected = true;
    this.emit('connected', true);
    this.readLoopPromise = this.readLoop();

    onStatus('Démarrage de la session RPC…');
    await this.startRpcSession();

    onStatus('Lecture des informations du Flipper…');
    await this.readInfo();
    onStatus('Prêt');
    return this.info;
  }

  async disconnect() {
    try {
      if (this.rpcActive) await this.rpc('stopSession', {}, { timeout: 3000 }).catch(() => {});
    } finally {
      this.rpcActive = false;
      this.connected = false;
      this.rejectPending(new FlipperSerialError('Connexion fermée', 'DISCONNECTED'));
      try {
        if (this.reader) await this.reader.cancel().catch(() => {});
      } catch {
        /* déjà fermé */
      }
      try {
        if (this.port) await this.port.close();
      } catch {
        /* déjà fermé */
      }
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.chunks = new Uint8Array(0);
      this.info = null;
      this.emit('connected', false);
    }
  }

  /* ---------------- session RPC ---------------- */

  async startRpcSession() {
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode('start_rpc_session\r'));
    } finally {
      writer.releaseLock();
    }
    // Le Flipper répond « start_rpc_session\r » en écho puis passe en protobuf.
    const ok = await this.waitForRpcEcho(4000).catch(() => false);
    this.chunks = new Uint8Array(0);
    this.rpcActive = true;
    this.emit('rpc', true);
    // ping de validation
    try {
      await this.rpc('systemPingRequest', { data: new Uint8Array(0) }, { timeout: 4000 });
    } catch (e) {
      if (!ok) throw new FlipperSerialError('La session RPC ne répond pas. Relancez la connexion.', 'RPC_DEAD');
    }
    return true;
  }

  async waitForRpcEcho(timeout = 2000) {
    const decoder = new TextDecoder();
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (decoder.decode(this.chunks).includes('start_rpc_session')) return true;
      await new Promise((r) => setTimeout(r, 25));
    }
    return false;
  }

  /**
   * Le Flipper renvoie l'écho de la commande CLI (« start_rpc_session\r ») avant
   * de basculer en protobuf ; il peut rester du texte d'invite qui casserait le
   * cadrage des trames.
   *
   * Attention : 0x0a et 0x0d sont aussi des préfixes de longueur valides (10 et
   * 13 octets). On ne coupe donc que devant une vraie ligne de texte, c'est-à-dire
   * au moins quatre caractères imprimables terminés par CR/LF.
   */
  stripLeadingText() {
    const chunks = this.chunks;
    if (!chunks.length) return;
    const limit = Math.min(chunks.length, 512);
    let runStart = -1;
    for (let i = 0; i < limit; i++) {
      const byte = chunks[i];
      const printable = byte >= 0x20 && byte < 0x7f;
      if (printable) {
        if (runStart === -1) runStart = i;
        continue;
      }
      if ((byte === 0x0d || byte === 0x0a) && runStart !== -1 && i - runStart >= 4) {
        let end = i + 1;
        while (end < chunks.length && (chunks[end] === 0x0d || chunks[end] === 0x0a)) end++;
        this.chunks = chunks.slice(end);
      }
      return; // le premier octet non imprimable marque le début d'une trame
    }
  }

  /* ---------------- lecture / écriture ---------------- */

  async readLoop() {
    this.reader = this.port.readable?.getReader?.() ?? null;
    if (!this.reader) return;
    try {
      for (;;) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (!value || !value.length) continue;

        const merged = new Uint8Array(this.chunks.length + value.length);
        merged.set(this.chunks);
        merged.set(value, this.chunks.length);
        this.chunks = merged;

        if (!this.rpcActive) {
          // avant la session RPC on ne fait qu'accumuler du texte (garde-fou mémoire)
          if (this.chunks.length > 4096) this.chunks = this.chunks.slice(-4096);
          continue;
        }

        this.stripLeadingText();
        const { messages, rest } = drainDelimited(this.chunks);
        this.chunks = rest;
        for (const msg of messages) this.dispatch(msg);
      }
    } catch (error) {
      this.emit('error', error);
    } finally {
      if (this.connected) {
        this.connected = false;
        this.rpcActive = false;
        this.rejectPending(new FlipperSerialError('Le Flipper a été déconnecté', 'DISCONNECTED'));
        this.emit('connected', false);
        this.emit('disconnected', true);
      }
    }
  }

  /** Refuse toutes les requêtes RPC encore en attente (déconnexion, fermeture). */
  rejectPending(error) {
    for (const [commandId, entry] of this.pending) {
      clearTimeout(entry.timer);
      this.pending.delete(commandId);
      entry.reject(error);
    }
  }

  dispatch(msg) {
    const entry = this.pending.get(msg.commandId);
    if (!entry) return;
    if (msg.commandStatus !== 0) {
      this.pending.delete(msg.commandId);
      clearTimeout(entry.timer);
      entry.reject(new FlipperSerialError(`Erreur Flipper : ${msg.commandStatusName}`, msg.commandStatusName));
      return;
    }
    entry.chunks.push(msg);
    if (!msg.hasNext) {
      this.pending.delete(msg.commandId);
      clearTimeout(entry.timer);
      entry.resolve(entry.chunks);
    }
  }

  async send(frame) {
    if (!this.port?.writable) throw new FlipperSerialError('Port série fermé', 'CLOSED');
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(frame);
    } finally {
      writer.releaseLock();
    }
  }

  /** Envoie une requête RPC et attend la réponse (éventuellement multi-trames). */
  rpc(fieldName, payload = {}, { timeout = 15000 } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.rpcActive) {
        reject(new FlipperSerialError('Session RPC inactive', 'NO_RPC'));
        return;
      }
      const commandId = this.nextCommandId++;
      const entry = { chunks: [], resolve, reject };
      entry.timer = setTimeout(() => {
        if (this.pending.has(commandId)) {
          this.pending.delete(commandId);
          reject(new FlipperSerialError(`Délai dépassé pour ${fieldName}`, 'TIMEOUT'));
        }
      }, timeout);
      this.pending.set(commandId, entry);
      const frame = encodeMainDelimited({ commandId, hasNext: false, [fieldName]: payload });
      this.send(frame).catch((e) => {
        clearTimeout(entry.timer);
        this.pending.delete(commandId);
        reject(e);
      });
    });
  }

  /* ---------------- API de haut niveau ---------------- */

  async storageRead(path, { onProgress } = {}) {
    const chunks = await this.rpc('storageReadRequest', { path }, { timeout: 60000 });
    const parts = [];
    let total = 0;
    for (const msg of chunks) {
      for (const response of asList(msg.storageReadResponse)) {
        const data = response?.file?.data;
        if (data && data.length) {
          parts.push(data);
          total += data.length;
          if (onProgress) onProgress(total);
        }
      }
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const p of parts) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  }

  /**
   * Écrit un fichier par trames de 2 Ko. Toute la séquence partage le même
   * `commandId`, avec `hasNext = true` jusqu'à la dernière trame (commande
   * « continue » au sens du protocole RPC du Flipper).
   */
  async storageWrite(path, data, { onProgress } = {}) {
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const CHUNK = 2048;
    const total = Math.max(bytes.length, 1); // un fichier vide envoie quand même une trame
    const commandId = this.nextCommandId++;

    for (let offset = 0; offset < total; offset += CHUNK) {
      const slice = bytes.subarray(offset, offset + CHUNK);
      const hasNext = offset + CHUNK < bytes.length;
      await new Promise((resolve, reject) => {
        if (!this.rpcActive) {
          reject(new FlipperSerialError('Session RPC inactive', 'NO_RPC'));
          return;
        }
        const entry = { chunks: [], resolve, reject, timer: null };
        entry.timer = setTimeout(() => {
          this.pending.delete(commandId);
          reject(new FlipperSerialError(`Délai dépassé pendant l’écriture de ${path}`, 'TIMEOUT'));
        }, 30000);
        this.pending.set(commandId, entry);
        const frame = encodeMainDelimited({
          commandId,
          hasNext,
          storageWriteRequest: { path, file: { type: 1, data: slice } },
        });
        this.send(frame).catch((e) => {
          clearTimeout(entry.timer);
          this.pending.delete(commandId);
          reject(e);
        });
      });
      if (onProgress) onProgress(Math.min(offset + CHUNK, bytes.length), bytes.length);
      if (!hasNext) break;
    }
    return true;
  }

  async storageInfo(path) {
    const chunks = await this.rpc('storageInfoRequest', { path });
    const response = lastOf(chunks.flatMap((m) => asList(m.storageInfoResponse)));
    return response ?? { totalSpace: 0, freeSpace: 0 };
  }

  async storageList(path) {
    const chunks = await this.rpc('storageListRequest', { path, includeMd5: false });
    const files = [];
    for (const msg of chunks) {
      for (const response of asList(msg.storageListResponse)) files.push(...(response?.file ?? []));
    }
    return files;
  }

  async storageStat(path) {
    const chunks = await this.rpc('storageStatRequest', { path });
    const response = lastOf(chunks.flatMap((m) => asList(m.storageStatResponse)));
    return response?.file ?? null;
  }

  async systemDeviceInfo() {
    const chunks = await this.rpc('systemDeviceInfoRequest', {}, { timeout: 20000 });
    const pairs = {};
    for (const msg of chunks) {
      for (const response of asList(msg.systemDeviceInfoResponse)) {
        if (response && response.key !== undefined) pairs[response.key] = response.value;
      }
    }
    return pairs;
  }

  async systemProtobufVersion() {
    const chunks = await this.rpc('systemProtobufVersionRequest', {});
    return lastOf(chunks.flatMap((m) => asList(m.systemProtobufVersionResponse))) ?? {};
  }

  /* ---------------- infos appareil ---------------- */

  async readInfo() {
    const deviceInfo = await this.systemDeviceInfo().catch(() => ({}));
    const protobuf = await this.systemProtobufVersion().catch(() => ({}));

    let sdcard = { isInstalled: false, label: 'missing', totalSpace: 0, freeSpace: 0 };
    try {
      const files = await this.storageList('/ext');
      if (files && files.length) {
        const info = await this.storageInfo('/ext').catch(() => ({}));
        sdcard = { isInstalled: true, label: 'installed', totalSpace: info.totalSpace ?? 0, freeSpace: info.freeSpace ?? 0 };
      }
    } catch {
      /* pas de carte microSD */
    }

    this.info = {
      doneReading: true,
      hardware: {
        name: deviceInfo['hardware.name'] ?? 'Flipper Zero',
        model: deviceInfo['hardware.model'] ?? '',
        color: Number(deviceInfo['hardware.color'] ?? 0),
        region: deviceInfo['hardware.region'] ?? '',
        uid: deviceInfo['hardware.uid'] ?? '',
        otp: deviceInfo['hardware.otp.ver'] ?? '',
      },
      firmware: {
        version: deviceInfo['firmware.version'] ?? '',
        build: deviceInfo['firmware.build'] ?? '',
        target: deviceInfo['hardware.target'] ?? '',
        branch: deviceInfo['firmware.branch'] ?? '',
      },
      radio: {
        version: deviceInfo['radio.stack.version'] ?? '',
        type: deviceInfo['radio.type'] ?? '',
      },
      protobuf: { major: protobuf.major ?? 0, minor: protobuf.minor ?? 0 },
      storage: { sdcard },
      raw: deviceInfo,
    };
    this.emit('info', this.info);
    return this.info;
  }
}

export function bytesToSize(bytes, decimals = 1) {
  if (!bytes) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}
