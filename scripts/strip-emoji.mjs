/**
 * Retire les emoji du vault Offsidian.
 *
 * Pourquoi : un titre « 🎯 Objectif » ou une puce « 💡 Astuce » sur chaque note
 * donne un rendu générique. Les notes restent lisibles sans décoration, donc on
 * supprime les emoji et on garde la typographie (flèches →, symboles math ≥ ≠,
 * puces, tableaux).
 *
 * Règles :
 *  - les commentaires des blocs de code (bash, python, sql…) sont nettoyés eux
 *    aussi, sauf sur les schémas ASCII alignés à la main (bordures │ ─ ●) où
 *    retirer un caractère décalerait tout le dessin ;
 *  - l'espace laissé par un emoji supprimé est refermé proprement (pas de
 *    double espace, pas de `** **` vide, pas de puce orpheline).
 *
 * Usage : node scripts/strip-emoji.mjs [--check]
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vaultDir = path.join(root, 'public', 'offsidian', 'vault')
const checkOnly = process.argv.includes('--check')

/* Schémas ASCII alignés à la main : toucher une ligne décalerait les bordures.
   On les laisse telles quelles, emoji compris. */
const ASCII_ART = /[\u2500-\u259F\u25CF\u25CB\u25B2\u25BC\u25C4\u25BA]/

/* Emoji et caractères de composition (sélecteur de variante, ZWJ, keycap). */
const EMOJI_SOURCE = [
  '[\\u{1F000}-\\u{1FAFF}]',
  '[\\u{2600}-\\u{27BF}]',
  '[\\u{2300}-\\u{23FF}]',
  '[\\u{2B00}-\\u{2BFF}]',
  '[\\u{25A0}-\\u{25FF}]',
  '[\\u{FE0F}\\u{200D}\\u{20E3}]',
].join('|')

/* Deux instances : une globale pour remplacer, une sans `g` pour tester.
   Un RegExp global garde son `lastIndex` entre deux `.test()`, ce qui ferait
   sauter des emoji d'une ligne à l'autre. */
const EMOJI = new RegExp(EMOJI_SOURCE, 'gu')
const HAS_EMOJI = new RegExp(EMOJI_SOURCE, 'u')

const SENTINEL = '\u0000'

/** Retire les emoji d'un segment et referme l'espace qu'ils laissaient. */
function cleanSegment(segment) {
  if (!HAS_EMOJI.test(segment)) return segment

  let cleaned = segment.replace(EMOJI, SENTINEL)
  cleaned = cleaned
    // « **🎯 Titre** » → « **Titre** »
    .replace(/(\*{1,3}|_{2})\u0000+\s*/g, '$1')
    .replace(/\s*\u0000+(\*{1,3}|_{2})/g, '$1')
    // « ## 🎯 Titre », « - 🎯 puce », « 1. 🎯 étape »
    .replace(/^(\s*#{1,6}\s+)\u0000+\s*/, '$1')
    .replace(/^(\s*(?:[-*+]|\d+\.)\s+)\u0000+\s*/, '$1')
    // « | 🎯 cellule | » → « | cellule | »
    .replace(/\|\s*\u0000+\s*/g, '| ')
    .replace(/\s*\u0000+\|/g, ' |')
    // « > [!warning] ⚠️ Attention » → « > [!warning] Attention »
    .replace(/\u0000+\s*/g, '')
    .replace(/\s*\u0000+/g, '')
    // emphase vidée de son contenu
    .replace(/\*{2}\s*\*{2}/g, '')
    .replace(/(^|[\s(])\*\s*\*(?=$|[\s).,;:!?])/g, '$1')

  return cleaned
}

/** Retire les emoji d'un segment de code inline, sans toucher au reste. */
function cleanInlineCode(segment) {
  return segment
    .replace(EMOJI, SENTINEL)
    .replace(/\u0000+\s?/g, '')
    .replace(/\s\u0000+/g, '')
}

/** Nettoie une ligne, code inline compris. */
function cleanLine(line) {
  if (!HAS_EMOJI.test(line)) return line
  const cleaned = line
    .split(/(`+[^`]*`+)/g)
    .map((segment, index) => (index % 2 ? cleanInlineCode(segment) : cleanSegment(segment)))
    .join('')
    .replace(/[ \t]+$/, '')
  // « - » ou « ## » seul après suppression : la ligne ne porte plus rien.
  if (/^\s*(?:[-*+]|\d+\.|#{1,6})\s*$/.test(cleaned)) return null
  return cleaned
}

function stripSource(source) {
  let fence = null
  let removed = 0
  const lines = source.split(/\r?\n/).map((line) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[0].trim()[0].repeat(3)
      if (!fence) fence = marker
      else if (marker.startsWith(fence)) fence = null
      return line
    }

    const strip = !fence || !ASCII_ART.test(line)
    if (!strip) return line

    const before = (line.match(EMOJI) || []).length
    if (!before) return line
    const cleaned = cleanLine(line)
    removed += before
    return cleaned
  })

  return { text: lines.filter((line) => line !== null).join('\n'), removed }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(fullPath)))
    else files.push(fullPath)
  }
  return files
}

const files = (await walk(vaultDir)).filter((file) => file.toLowerCase().endsWith('.md'))
let totalRemoved = 0
let touched = 0

for (const file of files.sort()) {
  const source = await readFile(file, 'utf8')
  const { text, removed } = stripSource(source)
  if (!removed) continue
  totalRemoved += removed
  touched += 1
  if (!checkOnly && text !== source) await writeFile(file, text, 'utf8')
}

console.log(
  `${checkOnly ? 'Détectés' : 'Supprimés'} : ${totalRemoved} emoji dans ${touched} notes sur ${files.length}.`,
)
if (checkOnly && totalRemoved) process.exitCode = 1
