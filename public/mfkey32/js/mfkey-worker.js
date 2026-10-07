/**
 * Web Worker : exécute l'attaque mfkey32v2 hors du thread principal.
 *
 * Messages entrants :
 *   { operation: 'start', id, args:{cuid,nt0,nr0,ar0,nt1,nr1,ar1}, timeout }
 *   { operation: 'stop' }
 * Messages sortants :
 *   { operation: 'progress', id, ratio }
 *   { operation: 'output',   id, key }        // key = null si non trouvée
 *   { operation: 'error',    id, message }
 */

import { mfkey32v2 } from './mfkey32.mjs';

let stopRequested = false;
let timeoutId = null;
let currentId = null;

function report(ratio) {
  if (currentId !== null) self.postMessage({ operation: 'progress', id: currentId, ratio });
}

self.onmessage = (event) => {
  const { operation } = event.data;

  if (operation === 'stop') {
    stopRequested = true;
    return;
  }

  if (operation !== 'start') return;

  const { id, args, timeout = 15 } = event.data;
  currentId = id;
  stopRequested = false;

  // Filet de sécurité : comme sur lab.flipper.net, on coupe au bout de `timeout` s.
  if (timeoutId) clearTimeout(timeoutId);
  let timedOut = false;
  timeoutId = setTimeout(() => {
    timedOut = true;
    stopRequested = true;
  }, Math.max(1, timeout) * 1000);

  // Laisse le navigateur envoyer le message d'acquittement avant de saturer le CPU.
  setTimeout(() => {
    const started = Date.now();
    let key = null;
    let error = null;
    try {
      key = mfkey32v2(args, {
        shouldStop: () => stopRequested,
        onProgress: (ratio) => {
          if (Math.random() < 0.05) report(ratio);
        },
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    const elapsed = Date.now() - started;
    if (error) {
      self.postMessage({ operation: 'error', id, message: error, elapsed });
    } else if (timedOut && !key) {
      self.postMessage({ operation: 'error', id, message: 'timeout', elapsed });
    } else {
      self.postMessage({ operation: 'output', id, key, elapsed });
    }
    currentId = null;
  }, 0);
};
