/**
 * Acesso ao Supabase pelo servidor (PostgREST + Auth), com a service_role key.
 * Sem SDK: só fetch. A service_role NUNCA sai do servidor.
 */
export function dbConfigured() { return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }

function base() { return process.env.SUPABASE_URL.replace(/\/+$/, ''); }
function headers(extra) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Object.assign({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, extra || {});
}

export async function rest(path, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${base()}/rest/v1/${path}`, {
    method, headers: headers(prefer ? { Prefer: prefer } : null), body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(`Supabase ${method} ${path} -> ${r.status}: ${data && (data.message || data.error) || text}`);
  return data;
}

/** Valida o JWT do jogador (enviado pelo site) e devolve o usuário do Supabase Auth. */
export async function getUserFromToken(jwt) {
  if (!jwt) return null;
  const r = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${jwt}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: u.email } : null;
}
