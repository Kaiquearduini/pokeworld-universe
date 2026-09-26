// Shared allowlist: browser choices and authenticated account updates use the same IDs.
export const revision = '4215a26d3fb6-v2';
const previousRevisions = ['4215a26d3fb6-v1'];
export const characters = [
  { id: 'leon', name: 'Leon', image: 'assets/img/profile/characters/leon.png', width: 2500, height: 3000, crop: [89, 61, 2366, 2889], legacy: ['assets/img/art/leon.png'] },
  { id: 'ash', name: 'Ash e Pikachu', image: 'assets/img/profile/characters/ash.png', width: 2500, height: 3000, crop: [519, 291, 1645, 2645], legacy: ['assets/img/art/ash.png'] },
  { id: 'personagem-1', name: 'Personagem 01', image: 'assets/img/profile/characters/personagem-1.png', width: 1080, height: 1350, crop: [61, 6, 996, 1305] },
  { id: 'personagem-2', name: 'Personagem 02', image: 'assets/img/profile/characters/personagem-2.png', width: 1080, height: 1350, crop: [83, 33, 967, 1278] },
  { id: 'personagem-3', name: 'Personagem 03', image: 'assets/img/profile/characters/personagem-3.png', width: 1080, height: 1350, crop: [109, 37, 901, 1242] },
  { id: 'personagem-4', name: 'Personagem 04', image: 'assets/img/profile/characters/personagem-4.png', width: 1080, height: 1350, crop: [88, 37, 946, 1249] },
  { id: 'personagem-5', name: 'Personagem 05', image: 'assets/img/profile/characters/personagem-5.png', width: 1080, height: 1350, crop: [62, 36, 959, 1250] },
  { id: 'treinadora', name: 'Treinadora', image: 'assets/img/art/player-girl.png', width: 388, height: 760, crop: [0, 0, 388, 760], legacy: ['assets/img/art/player-girl.png?v=3', 'assets/img/art/player-girl.png'] },
  { id: 'treinadora-azul', name: 'Treinadora azul', image: 'assets/img/art/trainer-azul.png', width: 386, height: 760, crop: [0, 0, 386, 760], legacy: ['assets/img/art/trainer-azul.png'] },
  { id: 'treinadora-amarela', name: 'Treinadora amarela', image: 'assets/img/art/trainer-amarela.png', width: 472, height: 760, crop: [0, 0, 472, 760], legacy: ['assets/img/art/trainer-amarela.png'] }
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
