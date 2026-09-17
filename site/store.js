/* =====================================================================
   POKEWORLD UNIVERSE — camada de dados (CMS)
   - Com PWU_CONFIG.SUPABASE_URL/ANON_KEY: lê e grava nas tabelas
     news, pokemon e site_texts (e imagens no bucket "media").
   - Sem Supabase: usa os dados de data.js + alterações salvas no
     localStorage (chave pwu_cms). Mesma API nos dois modos.
   ===================================================================== */
(function () {
  window.PWU = window.PWU || {};
  var cfg = window.PWU_CONFIG || {};
  var LS_KEY = 'pwu_cms';
  var useSupabase = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  var sb = useSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  var state = { news: [], pokemon: [], texts: {}, loaded: false };

  /* ---------- modo local ---------- */
  function readLocal() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; } }
  function writeLocal(o) { localStorage.setItem(LS_KEY, JSON.stringify(o)); }
  function mergeLocal() {
    var o = readLocal(); o.news = o.news || {}; o.pokemon = o.pokemon || {}; o.texts = o.texts || {};
    var news = {}, pk = {};
    (PWU.news || []).forEach(function (n, i) { news[n.slug] = Object.assign({ sort: i, hidden: false, featured: !!n.featured }, n); });
    Object.keys(o.news).forEach(function (k) { if (o.news[k]._deleted) delete news[k]; else news[k] = Object.assign({}, news[k] || { sort: 999 }, o.news[k]); });
    (PWU.pokedex || []).forEach(function (p, i) { pk[p.id] = Object.assign({ sort: i, hidden: false }, p); });
    Object.keys(o.pokemon).forEach(function (k) { if (o.pokemon[k]._deleted) delete pk[k]; else pk[k] = Object.assign({}, pk[k] || { sort: 999 }, o.pokemon[k]); });
    state.news = Object.keys(news).map(function (k) { return news[k]; });
    state.pokemon = Object.keys(pk).map(function (k) { return pk[k]; });
    state.texts = Object.assign({}, PWU.texts || {}, o.texts);
    sortAll();
  }
  function sortAll() {
    state.news.sort(function (a, b) { return (b.featured - a.featured) || (b.date > a.date ? 1 : b.date < a.date ? -1 : 0); });
    state.pokemon.sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
  }

  /* ---------- modo supabase ---------- */
  function fromRow(t, r) {
    if (t === 'news') return Object.assign({}, r, { body: Array.isArray(r.body) ? r.body : [] });
    if (t === 'pokemon') return Object.assign({}, r, { stats: r.stats || {} });
    return r;
  }
  function loadSupabase() {
    return Promise.all([
      sb.from('news').select('*'),
      sb.from('pokemon').select('*'),
      sb.from('site_texts').select('*')
    ]).then(function (res) {
      res.forEach(function (r) { if (r.error) throw r.error; });
      state.news = res[0].data.map(function (r) { return fromRow('news', r); });
      state.pokemon = res[1].data.map(function (r) { return fromRow('pokemon', r); });
      state.texts = Object.assign({}, PWU.texts || {});
      res[2].data.forEach(function (t) { state.texts[t.key] = t.value; });
      // sem dados ainda? cai para os padrões do data.js (até rodar seed.sql)
      if (!state.news.length) state.news = (PWU.news || []).map(function (n, i) { return Object.assign({ sort: i, hidden: false }, n); });
      if (!state.pokemon.length) state.pokemon = (PWU.pokedex || []).map(function (p, i) { return Object.assign({ sort: i, hidden: false }, p); });
      sortAll();
    });
  }

  function upload(file) {
    if (!useSupabase) {
      return new Promise(function (resolve, reject) {
        if (file.size > 900 * 1024) return reject(new Error('Em modo local, envie imagens de até 900 KB (ou informe uma URL).'));
        var fr = new FileReader(); fr.onload = function () { resolve(fr.result); }; fr.onerror = reject; fr.readAsDataURL(file);
      });
    }
    var path = Date.now() + '-' + file.name.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
    return sb.storage.from('media').upload(path, file, { upsert: false }).then(function (r) {
      if (r.error) throw r.error;
      return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
    });
  }

  function saveItem(table, key, item) {
    if (useSupabase) {
      var row = Object.assign({}, item); delete row._deleted;
      return sb.from(table).upsert(row, { onConflict: key }).then(function (r) { if (r.error) throw r.error; return load(); });
    }
    var o = readLocal(); o[table] = o[table] || {};
    var cur = o[table][item[key]] || {};
    o[table][item[key]] = Object.assign({}, cur, item, { _deleted: false });
    writeLocal(o); mergeLocal(); return Promise.resolve();
  }
  function deleteItem(table, key, id) {
    if (useSupabase) return sb.from(table).delete().eq(key, id).then(function (r) { if (r.error) throw r.error; return load(); });
    var o = readLocal(); o[table] = o[table] || {}; o[table][id] = { _deleted: true }; writeLocal(o); mergeLocal(); return Promise.resolve();
  }
  function saveText(k, v) {
    if (useSupabase) return sb.from('site_texts').upsert({ key: k, value: v }).then(function (r) { if (r.error) throw r.error; state.texts[k] = v; });
    var o = readLocal(); o.texts = o.texts || {}; o.texts[k] = v; writeLocal(o); state.texts[k] = v; return Promise.resolve();
  }

  function load() {
    var p = useSupabase ? loadSupabase().catch(function (e) { console.warn('[PWU] Supabase indisponível, usando dados locais:', e.message); mergeLocal(); }) : Promise.resolve(mergeLocal());
    return p.then(function () { state.loaded = true; applyTexts(); document.dispatchEvent(new CustomEvent('store:ready')); return state; });
  }

  /* ---------- aplica textos editáveis em [data-text] ---------- */
  function applyTexts(scope) {
    (scope || document).querySelectorAll('[data-text]').forEach(function (el) {
      var v = state.texts[el.dataset.text];
      if (v != null) el.innerHTML = v;
    });
  }

  PWU.store = {
    mode: useSupabase ? 'supabase' : 'local',
    client: sb,
    ready: load(),
    reload: load,
    news: function (all) { return state.news.filter(function (n) { return all || !n.hidden; }); },
    pokemon: function (all) { return state.pokemon.filter(function (p) { return all || !p.hidden; }); },
    texts: function () { return state.texts; },
    text: function (k) { return state.texts[k]; },
    saveNews: function (n) { return saveItem('news', 'slug', n); },
    deleteNews: function (slug) { return deleteItem('news', 'slug', slug); },
    savePokemon: function (p) { return saveItem('pokemon', 'id', p); },
    deletePokemon: function (id) { return deleteItem('pokemon', 'id', id); },
    saveText: saveText,
    upload: upload,
    applyTexts: applyTexts,
    resetLocal: function () { localStorage.removeItem(LS_KEY); mergeLocal(); }
  };
})();
