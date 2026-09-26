// Shared allowlist: browser choices and authenticated account updates use the same IDs.
export const revision = '4215a26d3fb6-v3';
const previousRevisions = ['4215a26d3fb6-v1', '4215a26d3fb6-v2'];
export const characters = [
  { id: 'personagem-1', name: 'Wattson', face: [280, 0, 680, 680], image: 'assets/img/profile/characters/personagem-1.png', width: 1080, height: 1350, crop: [61, 6, 996, 1305] },
  { id: 'personagem-2', name: 'Koga', face: [320, 0, 760, 760], image: 'assets/img/profile/characters/personagem-2.png', width: 1080, height: 1350, crop: [83, 33, 967, 1278] },
  { id: 'personagem-3', name: 'Giovanni', face: [270, 5, 520, 520], image: 'assets/img/profile/characters/personagem-3.png', width: 1080, height: 1350, crop: [109, 37, 901, 1242] },
  { id: 'personagem-4', name: 'Acerola', face: [215, 0, 630, 630], image: 'assets/img/profile/characters/personagem-4.png', width: 1080, height: 1350, crop: [88, 37, 946, 1249] },
  { id: 'personagem-5', name: 'Bruno', face: [300, 0, 620, 620], image: 'assets/img/profile/characters/personagem-5.png', width: 1080, height: 1350, crop: [62, 36, 959, 1250] },
];
export const cards = [
  { id: 'agua', name: 'Água', color: '#5976f1', image: 'assets/img/profile/cards/card-1.png' },
  { id: 'luta', name: 'Luta', color: '#ff9b19', image: 'assets/img/profile/cards/card-2.png' },
  { id: 'pedra', name: 'Pedra', color: '#bbb083', image: 'assets/img/profile/cards/card-3.png' },
  { id: 'psiquico', name: 'Psíquico', color: '#f34688', image: 'assets/img/profile/cards/card-4.png' },
  { id: 'planta', name: 'Planta', color: '#5cbe37', image: 'assets/img/profile/cards/card-5.png' },
  { id: 'sem-card', name: 'Sem card', color: '#203762', image: null }
];
export function selection(characterId, cardId) {
  if (typeof characterId !== 'string' || typeof cardId !== 'string') return null;
  const character = characters.find(item => item.id === characterId);
  const card = cards.find(item => item.id === cardId);
  return character && card ? { character, card } : null;
}
export function appearanceUrl(characterId, cardId) {
  if (!selection(characterId, cardId)) throw new Error('Escolha um personagem e um card disponíveis.');
  return `assets/img/profile/portraits/${revision}/${characterId}--${cardId}.svg`;
}
export function fromAvatar(avatar) {
  for (const character of characters) for (const card of cards) {
    const urls = [appearanceUrl(character.id, card.id), ...previousRevisions.map(version => `assets/img/profile/portraits/${version}/${character.id}--${card.id}.svg`)];
    if (urls.includes(avatar)) return { characterId: character.id, cardId: card.id };
  }
  const legacy = characters.find(item => item.image === avatar || (item.legacy || []).includes(avatar));
  return legacy ? { characterId: legacy.id, cardId: 'sem-card' } : null;
}
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
// A code-native SVG composes the original artwork without changing its pixels or proportions.
export function portraitMarkup(characterId, cardId, source = value => value) {
  const value = selection(characterId, cardId);
  if (!value) throw new Error('Aparência inválida.');
  const { character, card } = value;
  const background = card.image ? `<svg width="600" height="800" viewBox="53 23 989 1296" preserveAspectRatio="xMidYMid slice"><image href="${esc(source(card.image))}" width="1080" height="1350"/></svg>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-label="${esc(character.name + ' · ' + card.name)}"><rect width="600" height="800" fill="#13254d"/>${background}<svg x="24" y="24" width="552" height="752" viewBox="${character.crop.join(' ')}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href="${esc(source(character.image))}" width="${character.width}" height="${character.height}"/></svg></svg>`;
}

// Small header portrait: same original art and background, with a face-specific viewBox.
export function faceUrl(characterId, cardId) {
  if (!selection(characterId, cardId)) throw new Error('Aparência inválida.');
  return `assets/img/profile/faces/${revision}/${characterId}--${cardId}.svg`;
}
export function headerAvatarUrl(avatar) {
  const chosen = fromAvatar(avatar);
  return chosen ? faceUrl(chosen.characterId, chosen.cardId) : avatar;
}
export function faceMarkup(characterId, cardId, source = value => value) {
  const chosen = selection(characterId, cardId);
  if (!chosen) throw new Error('Aparência inválida.');
  const { character, card } = chosen;
  const background = card.image ? `<svg width="160" height="160" viewBox="53 23 989 1296" preserveAspectRatio="xMidYMid slice"><image href="${esc(source(card.image))}" width="1080" height="1350"/></svg>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="${esc(character.name)}"><rect width="160" height="160" fill="#13254d"/>${background}<svg width="160" height="160" viewBox="${character.face.join(' ')}" overflow="hidden"><image href="${esc(source(character.image))}" width="${character.width}" height="${character.height}"/></svg></svg>`;
}
