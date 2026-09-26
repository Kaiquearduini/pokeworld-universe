import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { characters, cards, appearanceUrl, portraitMarkup, faceUrl, faceMarkup } from '../site/profile-catalog.js';
const root = fileURLToPath(new URL('../site/', import.meta.url));
const sources = new Map();
for (const item of [...characters, ...cards]) if (item.image && !sources.has(item.image)) {
  sources.set(item.image, 'data:image/png;base64,' + (await readFile(path.join(root, item.image))).toString('base64'));
}
let count = 0, bytes = 0;
for (const character of characters) for (const card of cards) {
  const file = path.join(root, appearanceUrl(character.id, card.id));
  await mkdir(path.dirname(file), { recursive: true });
  const svg = portraitMarkup(character.id, card.id, image => sources.get(image));
  await writeFile(file, svg); count++; bytes += Buffer.byteLength(svg);
  const face = path.join(root, faceUrl(character.id, card.id));
  await mkdir(path.dirname(face), { recursive: true });
  await writeFile(face, faceMarkup(character.id, card.id, image => sources.get(image)));
}
console.log(JSON.stringify({ portraits: count, bytes, sourceImages: sources.size }));
