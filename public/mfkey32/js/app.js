/**
 * Mfkey32 — FoXhack.
 *
 * Application monopage sans framework : interface de labo inspirée de FoXhack,
 * moteur mfkey32v2 exécuté localement dans des Web Workers.
 */

import { iconSvg } from './icons.js';
import { FlipperSerial, FlipperSerialError, bytesToSize } from './flipper-serial.js';
import { parseMfkeyLog, parseNonceArgs, mergeDictionary, FIELDS } from './mfkey32.mjs';

/* -------------------------------------------------------------------------- */
/* constantes                                                                  */
/* -------------------------------------------------------------------------- */

const LOG_PATH = '/ext/nfc/.mfkey32.log';
const DICT_PATH = '/ext/nfc/assets/mf_classic_dict_user.nfc';

const MANUAL_DEFAULTS = {
  cuid: '2a234f80',
  nt0: '55721809',
  nr0: 'ce9985f6',
  ar0: '772f55be',
  nt1: 'a27173f2',
  nr1: 'e386b505',
  ar1: '5fa65203',
};

/* -------------------------------------------------------------------------- */
/* état global                                                                 */
/* -------------------------------------------------------------------------- */

const state = {
  connected: false,
  connecting: false,
  connectStatus: '',
  connectError: null,
  info: null,

  timeoutSeconds: Number(localStorage.getItem('mfkeyTimeout') ?? 15) || 15,

  logSource: null, // 'flipper' | 'local'
  logFileName: '',
  logEntries: [],
  logError: '',
  logLoading: false,

  dictText: '',
  dictKeys: new Set(),

  cracking: false,
  crackProgress: 0,
  crackMessage: '',
  timeouts: [],
  errors: [],
  foundKeys: [],
  newKeys: [],
  savedToFlipper: false,

  manual: { ...MANUAL_DEFAULTS },
  manualRunning: false,
  manualResult: null,
  manualError: '',
};

const flipper = new FlipperSerial();

/* -------------------------------------------------------------------------- */
/* petits utilitaires DOM                                                      */
/* -------------------------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* -------------------------------------------------------------------------- */
/* messages + notifications                                                   */
/* -------------------------------------------------------------------------- */

function log(level, message) {
  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : console.debug;
  target.call(console, `[mfkey32] ${message}`);
}

function notify(message, color = 'dark', timeout = 5000) {
  const stack = $('#notify-stack');
  const iconName =
    color === 'positive' ? 'mdi-check-circle-outline' : color === 'negative' ? 'mdi-alert-circle-outline' : 'mdi-information';
  const node = el(
    'div',
    { class: `q-notification q-notification--${color}`, role: 'status' },
    [
      el('span', { class: 'q-notification__icon', html: iconSvg(iconName, { size: 20 }) }),
      el('div', { class: 'q-notification__message', text: message }),
    ],
  );
  stack.append(node);
  setTimeout(() => {
    node.style.transition = 'opacity .25s, transform .25s';
    node.style.opacity = '0';
    node.style.transform = 'translateX(24px)';
    setTimeout(() => node.remove(), 260);
  }, timeout);
}

/* -------------------------------------------------------------------------- */
/* moteur mfkey32 en Web Workers                                               */
/* -------------------------------------------------------------------------- */

class MfkeyPool {
  /**
   * Une attaque = un worker. Comme sur le site d'origine, le dépassement du délai
   * se solde par la destruction du worker : c'est le seul moyen fiable d'interrompre
   * la phase de récupération d'états, qui ne rend pas la main.
   */
  constructor(size) {
    this.size = Math.max(1, size);
    this.slots = [];
    this.queue = [];
    this.busy = 0;
    this.stopped = false;
  }

  spawn() {
    const worker = new Worker(new URL('./mfkey-worker.js', import.meta.url), { type: 'module' });
    const slot = { worker, task: null };

    worker.onmessage = (event) => {
      const task = slot.task;
      if (!task) return;
      const { operation } = event.data;
      if (operation === 'progress') {
        task.onProgress?.(event.data.ratio);
        return;
      }
      if (operation === 'output') {
        this.release(slot);
        task.resolve({ key: event.data.key, elapsed: event.data.elapsed });
      } else if (operation === 'error') {
        this.release(slot);
        task.resolve({ key: null, error: event.data.message, elapsed: event.data.elapsed });
      }
      this.next();
    };

    worker.onerror = (event) => {
      const task = slot.task;
      this.release(slot);
      task?.resolve({ key: null, error: event?.message || 'erreur du worker de calcul' });
      this.next();
    };

    this.slots.push(slot);
    return slot;
  }

  release(slot) {
    slot.task = null;
    this.busy = Math.max(0, this.busy - 1);
  }

  next() {
    if (this.stopped) return;
    while (this.busy < this.size && this.queue.length) {
      const slot = this.slots.find((s) => !s.task && s.worker) ?? this.spawn();
      const task = this.queue.shift();
      slot.task = task;
      this.busy++;

      task.timer = setTimeout(() => {
        if (!slot.task) return;
        slot.task.killed = true;
        // le worker est détruit : plus aucune exécution ne peut se poursuivre
        slot.worker.terminate();
        slot.worker = null;
        const pending = slot.task;
        this.release(slot);
        pending.resolve({ key: null, error: 'timeout', elapsed: task.timeout * 1000 });
        this.next();
      }, Math.max(1, task.timeout) * 1000);

      slot.worker.postMessage({
        operation: 'start',
        id: task.id,
        args: task.args,
        timeout: Math.max(1, task.timeout),
      });
    }
  }

  run(args, { timeout = 15, onProgress } = {}) {
    this.stopped = false;
    if (!this.slots.some((s) => s.worker)) this.spawn();
    return new Promise((resolve) => {
      this.queue.push({
        id: Math.random().toString(36).slice(2),
        args,
        timeout,
        onProgress,
        resolve,
        timer: null,
        killed: false,
      });
      this.next();
    });
  }

  /** Interrompre toutes les attaques en cours (le pool se reconstituera au prochain run). */
  stop() {
    this.stopped = true;
    const queued = this.queue.splice(0);
    for (const task of queued) {
      clearTimeout(task.timer);
      task.resolve({ key: null, error: 'annulé' });
    }
    for (const slot of this.slots) {
      if (!slot.task) continue;
      slot.worker.postMessage({ operation: 'stop' });
      slot.worker.terminate();
      slot.worker = null;
      const task = slot.task;
      this.release(slot);
      clearTimeout(task.timer);
      task.resolve({ key: null, error: 'annulé' });
    }
    this.slots = this.slots.filter((s) => s.worker);
  }

  terminate() {
    this.stop();
    for (const slot of this.slots) slot.worker?.terminate();
    this.slots = [];
    this.busy = 0;
  }
}

const pool = new MfkeyPool(Math.min(4, navigator.hardwareConcurrency || 2));

/* -------------------------------------------------------------------------- */
/* rendu : squelette                                                           */
/* -------------------------------------------------------------------------- */

function buildShell() {
  const wordmark = el('img', {
    class: 'app-topbar__wordmark',
    src: 'https://foxhack.fr/brand/foxhack-wordmark.svg',
    alt: 'FoXhack',
    referrerpolicy: 'no-referrer',
  });
  const wordmarkFallback = el('span', { class: 'app-topbar__brand-fallback', text: 'FoXhack', hidden: true });
  wordmark.addEventListener('error', () => {
    wordmark.hidden = true;
    wordmarkFallback.hidden = false;
  });

  const topbar = el('header', { class: 'app-topbar' }, [
    el('a', {
      class: 'app-topbar__brand',
      href: 'https://foxhack.fr/',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'FoXhack — ouvrir le site principal',
    }, [wordmark, wordmarkFallback]),
    el('div', { class: 'app-topbar__breadcrumb', 'aria-label': 'Fil d’Ariane' }, [
      el('span', { text: 'LAB' }),
      el('span', { class: 'app-topbar__separator', text: '/' }),
      el('span', { text: 'NFC' }),
      el('span', { class: 'app-topbar__separator', text: '/' }),
      el('strong', { text: 'MFKey32' }),
    ]),
  ]);
  const main = el('main', { class: 'app-main', id: 'app-main' });

  document.body.append(
    el('div', { class: 'app-shell' }, [topbar, main]),
    el('div', { class: 'notify-stack', id: 'notify-stack' }),
    el('div', { id: 'dialog-root' }),
  );
}

/* -------------------------------------------------------------------------- */
/* rendu : pages                                                               */
/* -------------------------------------------------------------------------- */

function renderRoute() {
  const main = $('#app-main');
  main.innerHTML = '';
  document.title = 'Mfkey32';
  main.append(renderNfcPage());
}

function renderNfcPage() {
  const heading = el('div', { class: 'mfkey-page__heading' }, [
    el('div', { class: 'mfkey-page__title-group' }, [
      el('div', { class: 'mfkey-page__eyebrow' }, [
        el('span', { text: 'NFC' }),
        el('span', { class: 'mfkey-page__eyebrow-separator', text: '/' }),
        el('span', { text: 'MIFARE CLASSIC' }),
      ]),
      el('h1', { class: 'mfkey-page__title', text: 'Mfkey32' }),
      el('p', { class: 'mfkey-page__description', text: 'Récupération locale de clés à partir des nonces d’authentification.' }),
    ]),
  ]);
  const panels = el('div', { class: 'mfkey-panel-grid' }, [cardFlipperAttack(), cardManualAttack()]);
  const tutorial = el('section', { class: 'mfkey-tutorial', 'aria-labelledby': 'nonce-tutorial-title' }, [
    el('div', { class: 'mfkey-tutorial__header' }, [
      el('span', { class: 'mfkey-tutorial__eyebrow', text: 'CAPTURE NFC / TUTORIEL' }),
      el('h2', { class: 'mfkey-tutorial__title', id: 'nonce-tutorial-title', text: 'Récupération de nonces' }),
      el('p', { class: 'mfkey-tutorial__intro', text: 'Sur un lecteur de test autorisé, présente le Flipper comme illustré.' }),
    ]),
    el('figure', { class: 'mfkey-tutorial__figure' }, [
      el('div', { class: 'mfkey-tutorial__art' }, [
        el('img', {
          class: 'mfkey-tutorial__image',
          src: 'assets/reader.png',
          alt: 'Flipper présenté près d’un lecteur NFC ; les flèches et ondes orange indiquent leur proximité.',
          loading: 'lazy',
        }),
      ]),
      el('figcaption', { class: 'mfkey-tutorial__caption', text: 'Après la capture, charge le journal de nonces dans le panneau « Journal de nonces ».' }),
    ]),
  ]);
  return el('section', { class: 'mfkey-page' }, [heading, panels, tutorial]);
}

/* -------------------------------------------------------------------------- */
/* carte 1 : journal de nonces                                                 */
/* -------------------------------------------------------------------------- */

/** Référence vers le corps de la carte « Flipper », posée lors du rendu. */
let flipperBody = null;

function cardFlipperAttack() {
  const card = el('section', { class: 'q-card mfkey-panel mfkey-panel--journal', id: 'card-flipper', 'aria-labelledby': 'journal-panel-title' });

  card.append(
    el('div', { class: 'q-card__section mfkey-panel__header' }, [
      el('div', { class: 'mfkey-panel__heading' }, [
        el('span', { class: 'mfkey-panel__index', text: '01' }),
        el('div', { class: 'mfkey-panel__title-group' }, [
          el('span', { class: 'mfkey-panel__eyebrow', text: 'SOURCE / JOURNAL' }),
          el('h2', { class: 'section-title', id: 'journal-panel-title', text: 'Journal de nonces' }),
          el('p', { class: 'text-caption', text: 'Flipper connecté ou fichier .mfkey32.log.' }),
        ]),
      ]),
      el('div', { class: 'mfkey-timeout' }, [
        el('label', { for: 'timeout-seconds', text: 'Délai / nonce' }),
        timeoutField(),
        el('span', { class: 'mfkey-timeout__unit', text: 's' }),
      ]),
    ]),
  );

  const body = el('div', { class: 'q-card__section', id: 'flipper-body' });
  card.append(body);
  flipperBody = body;
  renderFlipperBody();
  return card;
}

function timeoutField() {
  const input = el('input', {
    class: 'q-field__native',
    type: 'text',
    inputmode: 'numeric',
    id: 'timeout-seconds',
    value: state.timeoutSeconds,
    'aria-label': 'Délai maximal par nonce, en secondes',
  });
  input.addEventListener('keypress', (e) => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
  input.addEventListener('input', () => {
    const value = Number(input.value.replace(/[^0-9]/g, ''));
    state.timeoutSeconds = Number.isFinite(value) && value > 0 ? value : 15;
    localStorage.setItem('mfkeyTimeout', String(state.timeoutSeconds));
  });
  return el('span', { class: 'q-field q-field--dense input-inline q-ml-sm' }, [
    el('span', { class: 'q-field__control' }, [input]),
  ]);
}

function renderFlipperBody() {
  const body = flipperBody ?? $('#flipper-body');
  if (!body) return;
  body.innerHTML = '';

  if (state.connected) body.append(renderDeviceCard());
  else body.append(renderConnectBlock());

  if (state.info && !state.info.storage.sdcard.isInstalled) {
    body.append(
      el('div', { class: 'q-pt-sm text-subtitle-1 text-negative row items-center q-gutter-x-sm' }, [
        el('span', { html: iconSvg('mdi-alert-circle-outline', { size: 18 }) }),
        el('span', { text: 'Carte microSD non détectée' }),
      ]),
    );
  }

  if (state.logError) {
    body.append(
      el('div', { class: 'note note--warning q-mt-md' }, [
        el('span', { class: 'note__title', text: 'Journal indisponible' }),
        el('span', { text: state.logError }),
      ]),
    );
  }

  if (state.logEntries.length) {
    body.append(
      el('div', { class: 'row items-center justify-between wrap q-mt-md q-gutter-y-sm mfkey-run-toolbar' }, [
        el('div', { class: 'row items-center wrap q-gutter-x-sm' }, [
          el('span', { class: 'status-chip status-chip--primary' }, [
            el('span', { html: iconSvg('mdi-nfc-variant', { size: 16 }) }),
            el('span', { text: `${state.logEntries.length} nonce${state.logEntries.length > 1 ? 's' : ''}` }),
          ]),
          el('span', {
            class: 'text-caption',
            text: state.logSource === 'flipper' ? `lu depuis ${LOG_PATH}` : `source : ${state.logFileName}`,
          }),
        ]),
        el('div', { class: 'row items-center wrap q-gutter-x-sm' }, [
          state.cracking
            ? el('button', { class: 'q-btn q-btn--flat q-btn--dense q-btn--color-negative', onclick: () => stopAttack() }, 'Arrêter')
            : el(
                'button',
                {
                  class: 'q-btn q-btn--unelevated q-btn--primary',
                  disabled: !state.logEntries.length || state.manualRunning ? true : null,
                  onclick: () => runAttack(),
                },
                [
                  state.cracking ? el('span', { class: 'q-btn__spinner' }) : null,
                  state.cracking ? 'Calcul…' : 'Lancer mfkey32',
                ],
              ),
        ]),
      ]),
    );
  }

  if (state.logEntries.length) {
    const previewCount = Math.min(state.logEntries.length, 12);
    body.append(
      el('section', { class: 'mfkey-nonce-preview', 'aria-label': 'Aperçu des nonces chargés' }, [
        el('div', { class: 'mfkey-data-head' }, [
          el('span', { class: 'mfkey-data-head__label', text: 'DONNÉES CAPTURÉES' }),
          el('span', { class: 'mfkey-data-head__count', text: `${previewCount} / ${state.logEntries.length}` }),
        ]),
        el('div', { class: 'mfkey-table-scroll' }, [nonceTable(state.logEntries.slice(0, previewCount))]),
        state.logEntries.length > previewCount
          ? el('div', { class: 'mfkey-data-foot', text: `Aperçu des ${previewCount} premières lignes.` })
          : null,
      ]),
    );
  }

  if (state.cracking || state.crackMessage) body.append(renderProgress());
  if (state.foundKeys.length || state.timeouts.length || state.errors.length || (!state.cracking && state.crackMessage)) {
    body.append(renderResults());
  }

  if (state.connected || state.logEntries.length) {
    body.append(
      el('div', { class: 'row items-center q-mt-md wrap q-gutter-x-sm' }, [
        state.connected
          ? el(
              'button',
              { class: 'q-btn q-btn--flat q-btn--dense', onclick: () => loadLogFromFlipper() },
              [el('span', { html: iconSvg('mdi-reload', { size: 18 }) }), 'Actualiser'],
            )
          : null,
        state.connected
          ? el(
              'button',
              { class: 'q-btn q-btn--flat q-btn--dense q-btn--color-negative', onclick: () => disconnect() },
              [el('span', { html: iconSvg('mdi-close', { size: 18 }) }), 'Déconnecter'],
            )
          : null,
      ]),
    );
  }
}

/** Bandeau de connexion (ou avertissement navigateur) + source hors ligne. */
function renderConnectBlock() {
  const unsupported = !FlipperSerial.supported;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent ?? '');
  const hint = mobile
    ? 'La connexion USB nécessite un ordinateur.'
    : unsupported
      ? 'Pour le port USB, utilise Chrome ou Edge sur ordinateur.'
      : 'Connecte le Flipper en USB.';

  return el('div', { class: 'mfkey-source' }, [
    el('div', { class: 'mfkey-connect-row' }, [
      el('button', {
        class: 'q-btn q-btn--unelevated q-btn--primary',
        disabled: unsupported || mobile || state.connecting ? true : null,
        onclick: () => connect(),
      }, [
        state.connecting ? el('span', { class: 'q-btn__spinner' }) : null,
        state.connecting ? state.connectStatus || 'Connexion…' : 'Connecter un Flipper',
      ]),
      el('span', { class: 'text-caption', text: hint }),
    ]),
    state.connectError ? el('div', { class: 'note note--danger' }, [el('span', { text: state.connectError })]) : null,
    el('div', { class: 'mfkey-or', text: 'ou' }),
    renderLocalSource(),
  ]);
}

function renderLocalSource() {
  const input = el('input', { type: 'file', accept: '.log,.txt,text/plain', id: 'local-file' });
  const zone = el('label', { class: 'dropzone', for: 'local-file' }, [
    el('span', { html: iconSvg('mdi-upload', { size: 22 }) }),
    el('span', { text: 'Choisir ou déposer un fichier .mfkey32.log' }),
    input,
  ]);

  const onFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;
    const text = await file.text();
    loadLogFromText(text, `fichier local : ${file.name}`, 'local');
  };

  input.addEventListener('change', () => onFiles(input.files));
  ['dragenter', 'dragover'].forEach((evt) =>
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.add('is-dragover');
    }),
  );
  ['dragleave', 'drop'].forEach((evt) =>
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.remove('is-dragover');
    }),
  );
  zone.addEventListener('drop', (e) => onFiles(e.dataTransfer?.files));

  return el('div', { class: 'mfkey-local-source' }, [
    zone,
    el('div', { class: 'mfkey-local-actions' }, [
      el('button', {
        class: 'q-btn q-btn--flat q-btn--dense',
        onclick: () => openDialog('paste'),
      }, [el('span', { html: iconSvg('mdi-console-line', { size: 16 }) }), 'Coller un journal']),
      el('a', { class: 'text-caption', href: 'assets/exemple.mfkey32.log', download: true, text: 'Exemple' }),
      el('span', { class: 'text-caption mfkey-local-note', text: 'Le calcul reste sur cet appareil.' }),
    ]),
  ]);
}

function renderDeviceCard() {
  const info = state.info;
  return el('div', { class: 'device-card is-connected', id: 'device-card' }, [
    el('span', { class: 'device-card__dot', 'aria-hidden': 'true' }),
    el('div', { class: 'grow' }, [
      el('strong', { class: 'device-card__name', text: info?.hardware.name || 'Flipper connecté' }),
      info?.firmware.version
        ? el('span', { class: 'device-card__meta', text: `Firmware ${info.firmware.version}` })
        : null,
    ]),
  ]);
}

function renderProgress() {
  const pct = Math.round(state.crackProgress * 100);
  return el('div', { class: 'q-mt-md column q-gutter-y-sm' }, [
    el('div', { class: 'row items-center justify-between' }, [
      el('span', { class: 'text-subtitle-1', text: state.crackMessage || 'Cassage en cours…' }),
      el('span', { class: 'text-caption text-mono', text: state.cracking ? `${pct} %` : '' }),
    ]),
    el('div', { class: 'q-linear-progress' + (state.cracking && pct === 0 ? ' q-linear-progress--indeterminate' : '') }, [
      el('div', { class: 'q-linear-progress__model', style: `width:${pct}%` }),
    ]),
  ]);
}

function renderResults() {
  const box = el('div', { class: 'q-mt-lg column q-gutter-y-md' });

  if (!state.cracking && state.crackMessage) {
    const tone = state.foundKeys.length ? 'note--tip' : 'note--info';
    box.append(
      el('div', { class: `note ${tone}` }, [
        el('span', { class: 'note__title', text: state.foundKeys.length ? 'Cassage terminé' : 'Cassage terminé — aucune clé' }),
        el('span', { class: 'text-mono', text: state.crackMessage }),
        state.foundKeys.length
          ? null
          : el('div', { class: 'q-mt-sm', text: 'Ces nonces ne proviennent probablement pas de deux authentifications réussies sur la même clé, ou le délai maximal était trop court.' }),
      ]),
    );
  }

  if (state.foundKeys.length) {
    box.append(
      el('div', {}, [
        el('div', { class: 'text-weight-bold q-mb-sm', text: `Clés uniques (${state.foundKeys.length}) :` }),
        el(
          'div',
          { class: 'keys-grid' },
          state.foundKeys.map((key) =>
            el('div', { class: 'key-chip' + (state.newKeys.includes(key) ? ' is-new' : '') }, [
              el('span', { text: key }),
              el('span', { class: 'key-chip__actions' }, [
                el('button', { class: 'icon-btn', title: 'Copier', html: iconSvg('mdi-content-save', { size: 16 }), onclick: () => copyText(key) }),
              ]),
            ]),
          ),
        ),
        el('div', { class: 'row items-center q-gutter-x-sm q-mt-md wrap' }, [
          el('button', { class: 'q-btn q-btn--flat q-btn--dense', onclick: () => downloadDictionary() },
            [el('span', { html: iconSvg('mdi-download', { size: 18 }) }), 'Télécharger le dictionnaire']),
          state.connected && state.info?.storage.sdcard.isInstalled
            ? el('button', {
                class: 'q-btn q-btn--unelevated q-btn--primary',
                disabled: !state.newKeys.length || state.cracking ? true : null,
                onclick: () => saveDictionaryToFlipper(),
              }, [el('span', { html: iconSvg('mdi-upload', { size: 18 }) }), state.savedToFlipper ? 'Ré-enregistrer sur le Flipper' : 'Enregistrer sur le Flipper'])
            : null,
        ]),
        state.savedToFlipper
          ? el('div', { class: 'note note--tip q-mt-md', html: `Dictionnaire mis à jour sur le Flipper : <code>${DICT_PATH}</code> (${state.newKeys.length} nouvelle(s) clé(s)).` })
          : null,
      ]),
    );
  }

  if (state.errors.length) {
    box.append(
      el('div', { class: 'note note--danger' }, [
        el('span', { class: 'note__title', text: `${state.errors.length} erreur(s)` }),
        el('span', { text: state.errors.slice(0, 5).join(' · ') }),
      ]),
    );
  }

  if (state.timeouts.length) {
    box.append(
      el('div', {}, [
        el('div', { class: 'text-weight-bold q-mb-sm', text: `Délais dépassés (${state.timeouts.length}) :` }),
        nonceTable(state.timeouts),
        el('div', { class: 'text-caption q-mt-sm', text: 'Augmentez le délai maximal puis relancez, ou traitez ces nonces un par un dans le formulaire manuel.' }),
      ]),
    );
  }

  return box;
}

function nonceTable(rows) {
  return el('div', { class: 'q-markup-table' }, [
    el('table', { class: 'q-table' }, [
      el('thead', {}, [el('tr', {}, FIELDS.map((f) => el('th', { text: f }))), ]),
      el(
        'tbody',
        {},
        rows.map((row) => {
          const args = row.args ?? row;
          return el('tr', {}, FIELDS.map((f) => el('td', { text: (args[f] >>> 0).toString(16).padStart(8, '0') })));
        }),
      ),
    ]),
  ]);
}

/* -------------------------------------------------------------------------- */
/* carte 2 : saisie manuelle                                                   */
/* -------------------------------------------------------------------------- */

function cardManualAttack() {
  const card = el('section', { class: 'q-card mfkey-panel mfkey-panel--manual', id: 'card-manual', 'aria-labelledby': 'manual-panel-title' });

  const inputs = {};
  const container = el('div', { class: 'args-inputs-container' });
  for (const field of FIELDS) {
    const input = el('input', {
      class: 'q-field__native',
      value: state.manual[field],
      spellcheck: 'false',
      autocomplete: 'off',
      maxlength: 10,
      'aria-label': field,
      dataset: { field },
    });
    const wrap = el('span', { class: 'q-field q-field--float' }, [
      el('span', { class: 'q-field__control' }, [input]),
      el('label', { class: 'q-field__label', text: field }),
      el('span', { class: 'q-field__message' }),
    ]);
    input.addEventListener('focus', () => wrap.classList.add('q-field--focused'));
    input.addEventListener('blur', () => wrap.classList.remove('q-field--focused'));
    input.addEventListener('input', () => {
      state.manual[field] = input.value.trim().toLowerCase();
      validateManualField(wrap, state.manual[field]);
      updateManualSubmit();
    });
    inputs[field] = { input, wrap };
    container.append(wrap);
  }

  const submit = el('button', { class: 'q-btn q-btn--unelevated q-btn--primary', type: 'submit' }, [
    el('span', { html: iconSvg('mdi-key-variant', { size: 18 }) }),
    'Lancer mfkey32',
  ]);

  const form = el('form', { class: 'column q-gutter-y-md', onsubmit: (e) => { e.preventDefault(); runManual(); } }, [
    container,
    el('div', { class: 'row justify-start q-mt-lg' }, [submit]),
  ]);

  const resultBox = el('div', { id: 'manual-result' });

  card.append(
    el('div', { class: 'q-card__section mfkey-panel__header' }, [
      el('div', { class: 'mfkey-panel__heading' }, [
        el('span', { class: 'mfkey-panel__index', text: '02' }),
        el('div', { class: 'mfkey-panel__title-group' }, [
          el('span', { class: 'mfkey-panel__eyebrow', text: 'SOURCE / DIRECT' }),
          el('h2', { class: 'section-title', id: 'manual-panel-title', text: 'Saisie manuelle' }),
          el('p', { class: 'text-caption', text: 'Sept valeurs hexadécimales, deux authentifications.' }),
        ]),
      ]),
    ]),
    el('div', { class: 'q-card__section mfkey-panel__content' }, [form, resultBox]),
  );

  FIELDS.forEach((f) => validateManualField(inputs[f].wrap, state.manual[f]));
  updateManualSubmit();
  renderManualResult();
  return card;
}

function validateManualField(wrap, value) {
  const ok = /^[0-9a-fA-F]{1,8}$/.test(String(value).replace(/^0x/, ''));
  wrap.classList.toggle('q-field--error', !ok);
  const msg = $('.q-field__message', wrap);
  if (msg) msg.textContent = ok ? '' : 'hexadécimal attendu (8 chiffres max)';
  return ok;
}

function manualValid() {
  return FIELDS.every((f) => /^[0-9a-fA-F]{1,8}$/.test(String(state.manual[f]).replace(/^0x/, '')));
}

function updateManualSubmit() {
  const btn = $('#card-manual button[type="submit"]');
  if (!btn) return;
  btn.disabled = !(manualValid() && !state.manualRunning);
  btn.innerHTML = '';
  if (state.manualRunning) btn.append(el('span', { class: 'q-btn__spinner' }));
  else btn.append(el('span', { html: iconSvg('mdi-key-variant', { size: 18 }) }));
  btn.append(document.createTextNode(state.manualRunning ? 'Cassage en cours…' : 'Lancer mfkey32'));
}

function renderManualResult() {
  const box = $('#manual-result');
  if (!box) return;
  box.innerHTML = '';
  if (state.manualError) {
    box.append(el('div', { class: 'note note--danger q-pt-lg' }, [el('span', { text: state.manualError })]));
    return;
  }
  if (state.manualResult) {
    const { key, elapsed, args } = state.manualResult;
    box.append(
      el('div', { class: 'q-pt-lg column q-gutter-y-sm' }, [
        key
          ? el('div', { class: 'row items-center q-gutter-x-sm wrap' }, [
              el('span', { class: 'text-subtitle1 q-mr-sm', text: 'Clé :' }),
              el('b', { class: 'text-mono', style: 'font-size:18px;color:var(--q-primary-deep)', text: key }),
              el('button', { class: 'icon-btn', title: 'Copier la clé', html: iconSvg('mdi-content-save', { size: 18 }), onclick: () => copyText(key) }),
              el('button', { class: 'icon-btn', title: 'Ajouter au dictionnaire local', html: iconSvg('mdi-key-variant', { size: 18 }), onclick: () => addKeyToDictionary(key) }),
            ])
          : el('div', { class: 'note note--warning' }, [
              el('span', { text: 'Aucune clé trouvée pour ce jeu de nonces (les deux authentifications ne correspondent probablement pas à la même clé).' }),
            ]),
        el('div', { class: 'text-caption', text: `Calculé en ${elapsed} ms · ${state.timeoutSeconds}s de délai maximal` }),
        args ? nonceTable([args]) : null,
      ]),
    );
  }
}

function addKeyToDictionary(key) {
  const merged = mergeDictionary(state.dictText, [key]);
  state.dictText = merged.text;
  state.dictKeys = new Set(merged.text.trim().split('\n').filter(Boolean));
  if (!state.foundKeys.includes(key)) state.foundKeys.push(key);
  if (!state.newKeys.includes(key)) state.newKeys.push(key);
  notify(`Clé ${key} ajoutée au dictionnaire local`, 'positive');
  renderFlipperBody();
}

/* -------------------------------------------------------------------------- */
/* connexion Flipper                                                           */
/* -------------------------------------------------------------------------- */

async function connect() {
  if (state.connecting) return;
  state.connecting = true;
  state.connectError = null;
  state.connectStatus = 'Connexion…';
  renderFlipperBody();

  try {
    await flipper.connect({
      onStatus: (text) => {
        state.connectStatus = text;
        renderFlipperBody();
      },
    });
    state.connected = true;
    state.connecting = false;
    state.info = flipper.info;
    log('info', `Connecté à ${state.info.hardware.name} (firmware ${state.info.firmware.version})`);
    notify(`Connecté à ${state.info.hardware.name}`, 'positive');
    await loadLogFromFlipper();
  } catch (error) {
    state.connecting = false;
    state.connected = false;
    state.connectError = error instanceof FlipperSerialError ? error.message : `Erreur inattendue : ${error?.message ?? error}`;
    log('error', state.connectError);
    if (error instanceof FlipperSerialError && error.code === 'UNSUPPORTED_BROWSER') openDialog('unsupported');
    else if (error instanceof FlipperSerialError && error.code === 'MOBILE_BROWSER') openDialog('mobile');
  }
  renderFlipperBody();
}

async function disconnect() {
  await flipper.disconnect();
  state.connected = false;
  state.info = null;
  log('info', 'Déconnecté du Flipper');
  notify('Déconnecté', 'dark', 2500);
  renderFlipperBody();
}

flipper.on('disconnected', () => {
  if (!state.connected) return;
  state.connected = false;
  state.info = null;
  log('warn', 'Le Flipper a été débranché');
  notify('Flipper débranché', 'negative');
  renderFlipperBody();
});

/* -------------------------------------------------------------------------- */
/* lecture du journal                                                          */
/* -------------------------------------------------------------------------- */

async function loadLogFromFlipper() {
  if (!state.connected) return;
  state.logLoading = true;
  state.logError = '';
  state.crackMessage = 'Lecture du journal';
  renderFlipperBody();

  try {
    if (!state.info?.storage.sdcard.isInstalled) {
      state.logError = 'Carte microSD absente : impossible de lire le journal.';
      openDialog('microsd');
      return;
    }
    const bytes = await flipper.storageRead(LOG_PATH);
    const text = new TextDecoder().decode(bytes);
    loadLogFromText(text, LOG_PATH, 'flipper');
    if (!state.logEntries.length) {
      const stat = await flipper.storageStat(LOG_PATH).catch(() => null);
      state.logError = stat?.size ? 'Aucun nonce dans le journal.' : 'Journal introuvable.';
    }
  } catch (error) {
    const message = error?.code === 'ERROR_STORAGE_NOT_EXIST' ? 'Fichier journal introuvable' : error?.message ?? String(error);
    state.logError = message;
    state.logEntries = [];
    log('warn', `Lecture du journal : ${message}`);
  } finally {
    state.logLoading = false;
    state.crackMessage = '';
    renderFlipperBody();
  }
}

function loadLogFromText(text, label, source) {
  const entries = parseMfkeyLog(text);
  state.logEntries = entries;
  state.logSource = source;
  state.logFileName = label;
  state.logError = entries.length ? '' : 'Aucun nonce exploitable dans ce fichier.';
  state.foundKeys = [];
  state.newKeys = [];
  state.timeouts = [];
  state.errors = [];
  state.savedToFlipper = false;
  log('info', `${entries.length} nonce(s) chargé(s) depuis ${label}`);
  renderFlipperBody();
}

async function loadDictionary() {
  if (!state.connected) return '';
  try {
    const bytes = await flipper.storageRead(DICT_PATH);
    state.dictText = new TextDecoder().decode(bytes);
  } catch (error) {
    state.dictText = '';
    log('debug', `Dictionnaire utilisateur absent (${error?.code ?? error?.message})`);
  }
  state.dictKeys = new Set(
    state.dictText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[0-9a-fA-F]{12}$/.test(l)),
  );
  return state.dictText;
}

/* -------------------------------------------------------------------------- */
/* attaque                                                                     */
/* -------------------------------------------------------------------------- */

async function runAttack() {
  if (state.cracking || !state.logEntries.length) return;
  state.cracking = true;
  state.crackProgress = 0;
  state.foundKeys = [];
  state.newKeys = [];
  state.timeouts = [];
  state.errors = [];
  state.savedToFlipper = false;
  state.dictText = state.connected ? await loadDictionary() : state.dictText;

  const total = state.logEntries.length;
  let done = 0;
  const found = new Set();
  const started = Date.now();

  log('info', `Cassage de ${total} nonce(s), délai maximal ${state.timeoutSeconds}s chacun`);
  state.crackMessage = `Nonce 1 / ${total}`;
  renderFlipperBody();

  const tasks = state.logEntries.map((entry, index) =>
    pool
      .run(entry.args, {
        timeout: state.timeoutSeconds,
        onProgress: (ratio) => {
          if (total === 1) {
            state.crackProgress = Math.max(state.crackProgress, ratio * 0.99);
            state.crackMessage = `Cassage du nonce 1 / 1 — ${Math.round(ratio * 100)} %`;
          }
        },
      })
      .then((result) => {
        done++;
        if (result.error === 'timeout') {
          state.timeouts.push(entry);
        } else if (result.error) {
          state.errors.push(`${entry.line ?? '?'}: ${result.error}`);
          log('error', `mfkey32v2 : ${result.error} (ligne ${entry.line})`);
        } else if (result.key) {
          found.add(result.key);
        }
        state.crackProgress = done / total;
        state.crackMessage = done < total ? `Nonce ${done + 1} / ${total}` : 'Finalisation…';
        renderFlipperBody();
      }),
  );

  await Promise.all(tasks);

  state.foundKeys = Array.from(found).sort();
  const existing = new Set(state.dictKeys);
  state.newKeys = state.foundKeys.filter((k) => !existing.has(k));
  const merged = mergeDictionary(state.dictText, state.newKeys);
  state.dictText = merged.text;
  state.dictKeys = new Set(merged.text.trim().split('\n').filter(Boolean));

  state.cracking = false;
  state.crackProgress = 1;
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const parts = [`Nonces : ${total}`, `Clés uniques : ${state.foundKeys.length}`, `Nouvelles clés : ${merged.added}`];
  if (state.errors.length) parts.push(`Erreurs : ${state.errors.length}`);
  if (state.timeouts.length) parts.push(`Délais dépassés : ${state.timeouts.length}`);
  state.crackMessage = `${parts.join(' | ')} | ${elapsed}s`;
  log('info', state.crackMessage);
  notify(state.foundKeys.length ? `${state.foundKeys.length} clé(s) retrouvée(s)` : 'Aucune clé retrouvée', state.foundKeys.length ? 'positive' : 'warning');
  renderFlipperBody();
}

function stopAttack() {
  pool.stop();
  state.cracking = false;
  state.crackMessage = 'Cassage interrompu';
  renderFlipperBody();
}

async function runManual() {
  if (state.manualRunning || !manualValid()) return;
  state.manualRunning = true;
  state.manualError = '';
  state.manualResult = null;
  updateManualSubmit();
  renderManualResult();

  try {
    const args = parseNonceArgs(state.manual);
    const result = await pool.run(args, { timeout: state.timeoutSeconds });
    if (result.error && result.error !== 'timeout') {
      state.manualError = result.error;
    } else if (result.error === 'timeout') {
      state.manualError = `Aucune clé trouvée en ${state.timeoutSeconds} s (délai dépassé). Augmentez le délai et réessayez.`;
    } else {
      state.manualResult = { key: result.key, elapsed: result.elapsed, args };
      if (result.key) {
        log('info', `clé trouvée manuellement : ${result.key}`);
        notify(`Clé trouvée : ${result.key}`, 'positive');
      }
    }
  } catch (error) {
    state.manualError = error?.message ?? String(error);
  } finally {
    state.manualRunning = false;
    updateManualSubmit();
    renderManualResult();
  }
}

/* -------------------------------------------------------------------------- */
/* dictionnaire : export / écriture sur le Flipper                             */
/* -------------------------------------------------------------------------- */

function downloadDictionary() {
  const text = state.dictText.trim() ? state.dictText : state.foundKeys.join('\n') + '\n';
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'mf_classic_dict_user.nfc' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Dictionnaire téléchargé', 'positive', 2500);
}

async function saveDictionaryToFlipper() {
  if (!state.connected) return;
  try {
    state.crackMessage = 'Écriture du dictionnaire sur le Flipper…';
    renderFlipperBody();
    const bytes = new TextEncoder().encode(state.dictText);
    await flipper.storageWrite(DICT_PATH, bytes, {
      onProgress: (done, total) => {
        state.crackProgress = total ? done / total : 1;
        state.crackMessage = `Écriture du dictionnaire… ${Math.round(state.crackProgress * 100)} %`;
        renderFlipperBody();
      },
    });
    state.savedToFlipper = true;
    state.crackMessage = `Dictionnaire enregistré (${bytesToSize(bytes.length)})`;
    notify(`Dictionnaire enregistré sur le Flipper`, 'positive');
    log('info', `storageWrite : ${DICT_PATH} (${bytes.length} octets)`);
  } catch (error) {
    state.crackMessage = '';
    notify(`Échec de l'écriture : ${error?.message ?? error}`, 'negative', 7000);
    log('error', `storageWrite : ${error?.message ?? error}`);
  }
  renderFlipperBody();
}

/* -------------------------------------------------------------------------- */
/* divers                                                                      */
/* -------------------------------------------------------------------------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify(`« ${text} » copié`, 'positive', 2000);
  } catch {
    notify('Copie impossible dans ce contexte', 'negative', 3000);
  }
}

/* -------------------------------------------------------------------------- */
/* boîtes de dialogue                                                          */
/* -------------------------------------------------------------------------- */

const DIALOGS = {
  microsd: () => ({
    title: 'Carte microSD introuvable',
    small: true,
    body: [
      el('p', { text: 'Le Flipper ne détecte pas de carte microSD. Le journal de nonces et le dictionnaire utilisateur y sont stockés.' }),
      el('ul', {}, [
        el('li', { text: 'Éteignez le Flipper, insérez une microSD (FAT32), rallumez-le.' }),
        el('li', { text: 'Vérifiez que la carte est bien formatée et non corrompue.' }),
      ]),
    ],
    actions: [
      el('button', { class: 'q-btn q-btn--flat q-btn--no-caps', onclick: () => { closeDialog(); loadLogFromFlipper(); } },
        [el('span', { html: iconSvg('mdi-reload', { size: 18 }) }), 'Réessayer']),
    ],
  }),

  unsupported: () => ({
    title: 'Navigateur non pris en charge',
    small: true,
    body: [
      el('p', { text: 'La connexion au Flipper repose sur l’API Web Serial, disponible uniquement dans Chrome, Edge, Opera et les navigateurs Chromium sur ordinateur (Windows, macOS, Linux).' }),
      el('p', { text: 'Safari et Firefox ne l’implémentent pas. Vous pouvez néanmoins casser des nonces en mode hors ligne : déposez un fichier .mfkey32.log, ou collez son contenu.' }),
    ],
  }),

  mobile: () => ({
    title: 'Appareil mobile détecté',
    small: true,
    body: [el('p', { text: 'Le port série Web n’est pas accessible depuis un navigateur mobile. Branchez le Flipper à un ordinateur, ou utilisez le mode hors ligne (dépôt d’un fichier .mfkey32.log).' })],
  }),

  paste: () => {
    const area = el('textarea', {
      class: 'q-field__native',
      style: 'width:100%;min-height:160px;font-family:var(--font-mono);font-size:12px;padding:10px;border-radius:8px;border:1px solid var(--grey-4);background:var(--grey-1);text-transform:none',
      placeholder: 'cuid 2a234f80 nt0 55721809 nr0 ce9985f6 ar0 772f55be nt1 a27173f2 nr1 e386b505 ar1 5fa65203',
      spellcheck: 'false',
    });
    return {
      title: 'Coller un journal de nonces',
      body: [
        el('p', { class: 'text-caption', text: 'Une ligne par nonce, au format du fichier .mfkey32.log du Flipper.' }),
        area,
      ],
      actions: [
        el('button', {
          class: 'q-btn q-btn--unelevated q-btn--primary',
          onclick: () => {
            const text = area.value.trim();
            if (!text) { notify('Rien à analyser', 'warning'); return; }
            loadLogFromText(text, 'journal collé', 'local');
            closeDialog();
          },
        }, ['Analyser']),
      ],
    };
  },


};

let dialogCleanup = null;

function openDialog(name) {
  closeDialog();
  const factory = DIALOGS[name];
  if (!factory) return;
  const { title, body, actions, small } = factory();

  const panel = el('div', { class: 'q-dialog' + (small ? ' q-dialog--small' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('button', { class: 'q-btn q-btn--flat q-btn--round q-dialog__close', 'aria-label': 'Fermer', html: iconSvg('mdi-close', { size: 20 }), onclick: () => closeDialog() }),
    el('h6', { class: 'q-mt-none q-mb-sm text-h6', text: title }),
    ...[].concat(body).filter(Boolean),
    actions?.length ? el('div', { class: 'dialog-actions' }, actions) : null,
  ]);

  const backdrop = el('div', { class: 'q-dialog__backdrop', onclick: (e) => { if (e.target === backdrop) closeDialog(); } }, [panel]);
  $('#dialog-root').append(backdrop);

  const onKey = (e) => {
    if (e.key === 'Escape') closeDialog();
  };
  document.addEventListener('keydown', onKey);
  dialogCleanup = () => {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    dialogCleanup = null;
  };
  document.body.style.overflow = 'hidden';
  const focusable = panel.querySelector('button, textarea, input, a[href]');
  focusable?.focus();
}

function closeDialog() {
  dialogCleanup?.();
  document.body.style.overflow = '';
}

/* -------------------------------------------------------------------------- */
/* démarrage                                                                   */
/* -------------------------------------------------------------------------- */

function boot() {
  buildShell();
  renderRoute();
  log('debug', 'Mfkey32 prêt');
  log('debug', `Workers mfkey32 : ${pool.size}`);
}

boot();
