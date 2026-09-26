// Shared allowlist: browser choices and authenticated account updates use the same IDs.
export const revision = '4215a26d3fb6-v1';
export const characters = [
  { id: 'leon', name: 'Leon', image: 'assets/img/profile/characters/leon.png', width: 2500, height: 3000, crop: [310, 0, 1770, 1770], legacy: ['assets/img/art/leon.png'] },
  { id: 'ash', name: 'Ash e Pikachu', image: 'assets/img/profile/characters/ash.png', width: 2500, height: 3000, crop: [420, 240, 1570, 1570], legacy: ['assets/img/art/ash.png'] },
  { id: 'personagem-1', name: 'Personagem 01', image: 'assets/img/profile/characters/personagem-1.png', width: 1080, height: 1350, crop: [0, 0, 1080, 1080] },
  { id: 'personagem-2', name: 'Personagem 02', image: 'assets/img/profile/characters/personagem-2.png', width: 1080, height: 1350, crop: [0, 0, 1080, 1080] },
  { id: 'personagem-3', name: 'Personagem 03', image: 'assets/img/profile/characters/personagem-3.png', width: 1080, height: 1350, crop: [0, 0, 1080, 1080] },
  { id: 'personagem-4', name: 'Personagem 04', image: 'assets/img/profile/characters/personagem-4.png', width: 1080, height: 1350, crop: [0, 0, 1080, 1080] },
  { id: 'personagem-5', name: 'Personagem 05', image: 'assets/img/profile/characters/personagem-5.png', width: 1080, height: 1350, crop: [0, 0, 1080, 1080] },
  { id: 'treinadora', name: 'Treinadora', image: 'assets/img/art/player-girl.png', width: 388, height: 760, crop: [-25, 0, 440, 440], legacy: ['assets/img/art/player-girl.png?v=3', 'assets/img/art/player-girl.png'] },
  { id: 'treinadora-azul', name: 'Treinadora azul', image: 'assets/img/art/trainer-azul.png', width: 386, height: 760, crop: [-50, 0, 430, 430], legacy: ['assets/img/art/trainer-azul.png'] },
  { id: 'treinadora-amarela', name: 'Treinadora amarela', image: 'assets/img/art/trainer-amarela.png', width: 472, height: 760, crop: [0, 0, 475, 475], legacy: ['assets/img/art/trainer-amarela.png'] }
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
    if (avatar === appearanceUrl(character.id, card.id)) return { characterId: character.id, cardId: card.id };
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
  const background = card.image ? `<image href="${esc(source(card.image))}" x="-33" y="-14" width="660" height="825"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" role="img" aria-label="${esc(character.name + ' · ' + card.name)}"><rect width="600" height="600" fill="#13254d"/>${background}<svg x="15" y="16" width="570" height="584" viewBox="${character.crop.join(' ')}" preserveAspectRatio="xMidYMin slice" overflow="hidden"><image href="${esc(source(character.image))}" width="${character.width}" height="${character.height}"/></svg></svg>`;
}
