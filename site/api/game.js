/**
 * Dados públicos do servidor do jogo, lidos do banco `poke`.
 *
 * GET /api/game?resource=status   -> jogadores online, recorde
 *              ?resource=ranking&cat=experiencia|ganho|mortes|guildas
 *              ?resource=news     -> notícias publicadas
 *              ?resource=shop     -> pacotes da loja
 *              ?resource=links    -> downloads e redes sociais
 */
import { gameConfigured, q, one, tableExists } from './_lib/gamedb.js';

const LIMITE = 20;

function parseTeam(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 6).map((p) => ({ name: String(p.name || '').trim(), level: Number(p.level || 0) })).filter((p) => p.name);
  } catch (e) { return []; }
}

async function status() {
  const on = await one('SELECT COUNT(*) AS n FROM players_online');
  const rec = await one("SELECT value FROM server_config WHERE config = 'players_record' LIMIT 1");
  const contas = await one('SELECT COUNT(*) AS n FROM accounts');
  const chars = await one('SELECT COUNT(*) AS n FROM players WHERE deletion = 0');
  return {
    online: Number((on && on.n) || 0),
    record: Number((rec && rec.value) || 0),
    accounts: Number((contas && contas.n) || 0),
    trainers: Number((chars && chars.n) || 0)
  };
}

async function ranking(cat) {
  if (cat === 'mortes') {
    const rows = await q(
      `SELECT p.id, p.name, COUNT(d.player_id) AS valor, p.level, p.pokemons,
              (SELECT g.name FROM guild_members m JOIN guilds g ON g.id = m.guild_id WHERE m.player_id = p.id LIMIT 1) AS guild
         FROM player_deaths d
         JOIN players p ON p.id = d.player_id AND p.deletion = 0
        GROUP BY p.id, p.name, p.level, p.pokemons
        ORDER BY valor DESC
        LIMIT ${LIMITE}`
    );
    return { cat, unit: 'Mortes', rows: rows.map(mapPlayer) };
  }

  if (cat === 'guildas') {
    const rows = await q(
      `SELECT g.id, g.name, g.level AS valor, g.wars_won, g.gold,
              (SELECT COUNT(*) FROM guild_members m WHERE m.guild_id = g.id) AS membros,
              (SELECT p.name FROM players p WHERE p.id = g.ownerid) AS lider
         FROM guilds g
        ORDER BY g.level DESC, g.wars_won DESC
        LIMIT ${LIMITE}`
    );
    return {
      cat, unit: 'Nível',
      rows: rows.map((r, i) => ({
        pos: i + 1, name: r.name, value: Number(r.valor || 0),
        guild: r.lider ? 'Líder: ' + r.lider : 'Sem líder',
        members: Number(r.membros || 0), team: []
      }))
    };
  }

  if (cat === 'ganho') {
    // Precisa de um retrato diário da experiência (tabela opcional criada por
    // sql/site-tables.sql + cron em /api/game?resource=snapshot).
    if (!(await tableExists('site_exp_snapshots'))) {
      return { cat, unit: 'XP hoje', rows: [], missing: 'snapshot' };
    }
    const rows = await q(
      `SELECT p.id, p.name, p.level, p.pokemons,
              (p.experience - s.experience) AS valor,
              (SELECT g.name FROM guild_members m JOIN guilds g ON g.id = m.guild_id WHERE m.player_id = p.id LIMIT 1) AS guild
         FROM players p
         JOIN site_exp_snapshots s ON s.player_id = p.id
        WHERE p.deletion = 0 AND s.taken_on = (SELECT MAX(taken_on) FROM site_exp_snapshots)
          AND (p.experience - s.experience) > 0
        ORDER BY valor DESC
        LIMIT ${LIMITE}`
    );
    return { cat, unit: 'XP hoje', rows: rows.map(mapPlayer) };
  }

  // padrão: experiência (level)
  const rows = await q(
    `SELECT p.id, p.name, p.level AS valor, p.experience, p.pokemons, p.level,
            (SELECT g.name FROM guild_members m JOIN guilds g ON g.id = m.guild_id WHERE m.player_id = p.id LIMIT 1) AS guild
       FROM players p
      WHERE p.deletion = 0 AND p.group_id < 5
      ORDER BY p.level DESC, p.experience DESC
      LIMIT ${LIMITE}`
  );
  return { cat: 'experiencia', unit: 'Level', rows: rows.map(mapPlayer) };
}

function mapPlayer(r, i) {
  return {
    pos: i + 1,
    name: r.name,
    value: Number(r.valor || 0),
    level: Number(r.level || 0),
    guild: r.guild || 'Sem guilda',
    team: parseTeam(r.pokemons)
  };
}

async function news() {
  const rows = await q(
    `SELECT id, titulo, texto, date_created FROM noticias WHERE status = '1' ORDER BY date_created DESC LIMIT 20`
  );
  return rows.map((n) => ({
    slug: 'n-' + n.id,
    title: n.titulo,
    body: String(n.texto || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
    date: n.date_created ? new Date(n.date_created).toISOString().slice(0, 10) : null
  }));
}

async function shop() {
  const rows = await q(
    `SELECT id, nome, valor, valor_cortado, cor_pacote, caminho_tag FROM pacotes WHERE status = '1' ORDER BY valor ASC`
  );
  return rows.map((p) => ({
    id: String(p.id), name: p.nome,
    price: Number(p.valor || 0), priceFrom: Number(p.valor_cortado || 0),
    color: p.cor_pacote || null, tag: p.caminho_tag || null
  }));
}

async function links() {
  const c = await one("SELECT pc, mobile32, mobile64, discord, instagram, youtube, facebook FROM config_inicio WHERE status = '1' LIMIT 1");
  const d = await one("SELECT pc, mobile FROM download WHERE status = '1' LIMIT 1");
  return {
    pc: (c && c.pc) || (d && d.pc) || null,
    mobile32: (c && c.mobile32) || null,
    mobile64: (c && c.mobile64) || (d && d.mobile) || null,
    discord: (c && c.discord) || null,
    instagram: (c && c.instagram) || null,
    youtube: (c && c.youtube) || null
  };
}

export default async function handler(req, res) {
  if (!gameConfigured()) return res.status(503).json({ error: 'banco do jogo não configurado no servidor' });
  const resource = req.query.resource || 'status';

  try {
    // retrato diário da experiência (para o ranking de ganho). Proteja com CRON_SECRET.
    if (resource === 'snapshot') {
      if (!process.env.CRON_SECRET || req.query.key !== process.env.CRON_SECRET) return res.status(401).json({ error: 'não autorizado' });
      if (!(await tableExists('site_exp_snapshots'))) return res.status(412).json({ error: 'rode sql/site-tables.sql antes' });
      const r = await q(
        `INSERT INTO site_exp_snapshots (player_id, taken_on, experience)
         SELECT id, CURDATE(), experience FROM players WHERE deletion = 0
         ON DUPLICATE KEY UPDATE experience = VALUES(experience)`
      );
      return res.status(200).json({ ok: true, rows: r.affectedRows || 0 });
    }

    let data;
    if (resource === 'status') data = await status();
    else if (resource === 'ranking') data = await ranking(String(req.query.cat || 'experiencia'));
    else if (resource === 'news') data = await news();
    else if (resource === 'shop') data = await shop();
    else if (resource === 'links') data = await links();
    else return res.status(400).json({ error: 'recurso inválido' });

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[game]', resource, err);
    return res.status(500).json({ error: 'erro ao consultar o banco do jogo' });
  }
}
