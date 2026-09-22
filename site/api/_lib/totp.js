/**
 * TOTP (RFC 6238) com HMAC-SHA1, 6 dígitos, 30 s — o padrão que o Google
 * Authenticator, Authy, Microsoft Authenticator e afins usam.
 */
import crypto from 'crypto';

const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0, valor = 0, out = '';
  for (const byte of buf) {
    valor = (valor << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALFA[(valor >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALFA[(valor << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const limpo = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, valor = 0; const out = [];
  for (const ch of limpo) {
    valor = (valor << 5) | ALFA.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((valor >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function novoSegredo() {
  return base32Encode(crypto.randomBytes(20));
}

export function codigoTotp(segredo, passo = Math.floor(Date.now() / 30000)) {
  const contador = Buffer.alloc(8);
  contador.writeUInt32BE(Math.floor(passo / 0x100000000), 0);
  contador.writeUInt32BE(passo >>> 0, 4);
  const h = crypto.createHmac('sha1', base32Decode(segredo)).update(contador).digest();
  const off = h[h.length - 1] & 15;
  const bin = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 1000000).padStart(6, '0');
}

/** Aceita o código atual e os vizinhos (±30 s) para tolerar relógio atrasado. */
export function confereTotp(segredo, codigo) {
  const c = String(codigo || '').replace(/\D/g, '');
  if (c.length !== 6 || !segredo) return false;
  const agora = Math.floor(Date.now() / 30000);
  for (let d = -1; d <= 1; d++) {
    const esperado = Buffer.from(codigoTotp(segredo, agora + d));
    if (crypto.timingSafeEqual(esperado, Buffer.from(c))) return true;
  }
  return false;
}

export function otpauthUrl(segredo, conta, emissor = 'PokeWorld Universe') {
  return `otpauth://totp/${encodeURIComponent(emissor)}:${encodeURIComponent(conta)}?secret=${segredo}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=6&period=30`;
}
