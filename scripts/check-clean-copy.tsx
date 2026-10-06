import { strict as assert } from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import Home from '../src/pages/Home'

const html = renderToStaticMarkup(<Home />)
for (const text of [
  'The file behind the handle.', 'channel open', 'no scan, no probe',
  '0x7F3A', 'access granted', 'LAYER 00', 'cat whoami.txt',
  'cat profile.txt', 'ls -la ~/lab', 'git status', '>ONLINE<',
]) {
  assert(!html.includes(text), `Decorative copy still rendered: ${text}`)
}
for (const id of ['top', 'about', 'skills', 'projects', 'github', 'ctf', 'socials', 'contact']) {
  assert(html.includes(`id="${id}"`), `Missing section: ${id}`)
}
assert(html.includes('Flipper Zero'), 'Hardware content preserved')
assert(html.includes('FoX-HID'), 'Project content preserved')
assert(html.includes('href="https://github.com/F0X-hack"'), 'GitHub link preserved')
console.log('✓ Decorative copy removed; sections, project content and links preserved')
