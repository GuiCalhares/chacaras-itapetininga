const BRL = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0});
const NUM = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 0});
const DEC1 = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1});
const KM = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1});
const ALQ = 24200;
const DEFAULTS = {q: '', pmin: null, pmax: null, km: 15, pisc: false, qt: 0, bh: 0, imob: new Set(), inc: false};
const ORD_NATURAL = {preco: 'preco', dist: 'dist', terreno: '-terreno', construida: '-construida'};
const ORD_LABEL = {preco: 'menor preço', '-preco': 'maior preço', dist: 'mais perto', '-dist': 'mais longe', '-terreno': 'maior terreno', terreno: 'menor terreno', '-construida': 'maior área construída', construida: 'menor área construída'};
const SORT_FIELD = {preco: 'preco', dist: 'dist_km', terreno: 'area_terreno_m2', construida: 'area_construida_m2'};

const $ = (id) => document.getElementById(id);
const el = {
  q: $('q'), pmin: $('pmin'), pmax: $('pmax'), quick: $('quick'), km: $('km'), kmOut: $('km-out'),
  pisc: $('pisc'), inc: $('inc'), imobs: $('imobs'), ord: $('ord'), count: $('count'), active: $('active'),
  revealRow: $('reveal-row'), reveal: $('reveal'), wrap: $('results-wrap'), badge: $('badge'),
  sheet: $('sheet'), sheetBody: $('sheet-body'), sheetShow: $('sheet-show'), openBtn: $('open-filtros'),
  form: $('filters'), panel: $('panel'), fieldSearch: $('field-search'), slotSearch: $('slot-search-m'),
  clearPanel: $('clear-panel'),
};

const mq = window.matchMedia('(min-width: 900px)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let items = [], agencies = [], agencyCount = new Map();
let state = {...DEFAULTS, imob: new Set()};
let ord = 'preco';
let nodes = new Map(), tbody = null, olEl = null, view = null;
let current = {list: [], hidden: 0, hiddenIds: 0};

const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const known = (v) => v !== null && v !== undefined;
const poolVal = (it) => (it.piscina === 'sim' || it.piscina === 'não') ? it.piscina : null;
const aguaVal = (it) => (it.agua && it.agua !== 'não informado') ? it.agua.charAt(0).toUpperCase() + it.agua.slice(1) : null;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---------- formatting ---------- */
const m2 = (v) => `${NUM.format(v)} m²`;
const km = (v) => `≈ ${KM.format(v)} km`;
function compact(v) {
  return v >= 1e6 ? `${DEC1.format(v / 1e6)} mi` : `${NUM.format(Math.round(v / 1000))} mil`;
}
function alqueires(v) {
  if (v < ALQ) return '';
  const x = v / ALQ;
  return x >= 0.95 && x <= 1.05 ? '≈ 1 alqueire' : `≈ ${DEC1.format(x)} alqueires`;
}
const ni = (short) => short ? '<abbr class="ni" title="não informado">não inf.</abbr>' : '<span class="ni">não informado</span>';
const val = (v, fmt, short) => known(v) ? fmt(v) : ni(short);
const odd = (it) => it.preco >= 1e8 || (known(it.area_terreno_m2) && it.area_terreno_m2 < 10);

function plate(it, small) {
  const approx = it.dist_ref === 'U';
  const t = KM.format(it.dist_km);
  return `<span class="plate num${small ? ' sm' : ''}${approx ? ' approx' : ''}" aria-label="aproximadamente ${t} quilômetros em linha reta"${approx ? ' title="Localização aproximada (só bairro/cidade informados)"' : ''}>${km(it.dist_km)}</span>`;
}
function pool(it, small) {
  const p = poolVal(it);
  if (p === 'sim') return `<span class="pool${small ? ' sm' : ''}"><svg class="ic" aria-hidden="true"><use href="#i-waves"/></svg>Sim</span>`;
  return p === 'não' ? 'Não' : ni(small);
}

/* ---------- node builders ---------- */
function buildCard(it) {
  const li = document.createElement('li');
  li.className = 'card';
  const terr = known(it.area_terreno_m2)
    ? `${m2(it.area_terreno_m2)}${alqueires(it.area_terreno_m2) ? `<span class="sub">${alqueires(it.area_terreno_m2)}</span>` : ''}` : ni();
  const agua = aguaVal(it);
  const spec = (l, v) => `<div><dt>${l}</dt><dd>${v}</dd></div>`;
  li.innerHTML = `
    <div class="card-top"><span class="price num">${BRL.format(it.preco)}</span>${plate(it)}</div>
    <h2 class="card-title">${esc(it.local)}</h2>
    <p class="agency">${esc(it.imobiliaria)}</p>
    ${odd(it) ? '<p class="agency">Valores conforme o anúncio — podem conter erro de origem.</p>' : ''}
    <dl class="specs">
      ${spec('Terreno', terr)}${spec('Construída', val(it.area_construida_m2, m2))}${spec('Quartos', val(it.quartos, String))}
      ${spec('Banheiros', val(it.banheiros, String))}${spec('Suítes', val(it.suites, String))}${spec('Piscina', pool(it))}
    </dl>
    <p class="line"><svg class="ic" aria-hidden="true"><use href="#i-drop"/></svg><span>Água: ${agua ? `<b>${esc(agua)}</b>` : ni()}</span></p>
    ${it.obs ? `<p class="line obs"><span>Obs.: ${esc(it.obs)}</span></p>` : ''}
    <a class="btn btn-primary" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">Ver anúncio <svg class="ic" aria-hidden="true"><use href="#i-external"/></svg><span class="vh"> de ${esc(it.local)}, ${BRL.format(it.preco)}, na ${esc(it.imobiliaria)} (abre em nova aba)</span></a>`;
  return li;
}
function buildRow(it) {
  const tr = document.createElement('tr');
  const agua = aguaVal(it);
  const o = odd(it) ? ' title="Valor conforme anúncio"' : '';
  tr.innerHTML = `
    <td class="p num"${odd(it) && it.preco >= 1e8 ? o : ''}>${BRL.format(it.preco)}</td>
    <td><span class="cl" title="${esc(it.local)}">${esc(it.local)}</span></td>
    <td>${plate(it, true)}</td>
    <td class="r"${known(it.area_terreno_m2) && it.area_terreno_m2 < 10 ? o : ''}>${val(it.area_terreno_m2, m2, true)}</td>
    <td class="r">${val(it.area_construida_m2, m2, true)}</td>
    <td class="r">${val(it.quartos, String, true)}</td>
    <td class="r">${val(it.banheiros, String, true)}</td>
    <td class="r">${val(it.suites, String, true)}</td>
    <td>${pool(it, true)}</td>
    <td>${agua ? `<span class="ell" title="${esc(agua)}">${esc(agua)}</span>` : ni(true)}</td>
    <td>${esc(it.imobiliaria)}</td>
    <td class="r"><a class="btn btn-ghost" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">Ver anúncio <svg class="ic" aria-hidden="true"><use href="#i-external"/></svg><span class="vh"> de ${esc(it.local)}, ${BRL.format(it.preco)}, na ${esc(it.imobiliaria)} (abre em nova aba)</span></a></td>`;
  return tr;
}

const COLS = [
  ['Preço', 'preco', 'p'], ['Local'], ['Dist.', 'dist'], ['Terreno', 'terreno', 'r'], ['Constr.', 'construida', 'r'],
  ['Quartos', null, 'r'], ['<abbr title="Banheiros">Banh.</abbr>', null, 'r'], ['Suítes', null, 'r'], ['Piscina'], ['Água'], ['Imobiliária'], ['<span class="vh">Link</span>'],
];
function buildTable() {
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const heads = COLS.map(([label, key, cls]) => {
    const c = cls ? ` class="${cls}"` : '';
    return key ? `<th scope="col"${c} data-key="${key}" aria-sort="none"><button type="button" class="th-btn">${label}<svg class="ic" aria-hidden="true"><use href="#i-chevron-down"/></svg></button></th>` : `<th scope="col"${c}>${label}</th>`;
  }).join('');
  wrap.innerHTML = `<table><caption class="vh"></caption><thead><tr>${heads}</tr></thead><tbody></tbody></table>`;
  tbody = wrap.querySelector('tbody');
  wrap.querySelector('thead').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-key]');
    if (!th) return;
    const k = th.dataset.key, nat = ORD_NATURAL[k];
    setOrd(ord === nat ? (nat[0] === '-' ? k : '-' + k) : nat);
  });
  return wrap;
}

/* ---------- filtering & sorting ---------- */
function compute() {
  const terms = norm(state.q).split(/\s+/).filter(Boolean);
  const out = [], pending = [];
  for (const it of items) {
    if (terms.length && !terms.every((t) => it._hay.includes(t))) continue;
    if (state.pmin !== null && it.preco < state.pmin) continue;
    if (state.pmax !== null && it.preco > state.pmax) continue;
    if (it.dist_km > state.km) continue;
    if (state.imob.size && !state.imob.has(it.imobiliaria)) continue;
    let fail = false, missing = false;
    const chk = (active, v, ok) => { if (!active) return; if (!known(v)) missing = true; else if (!ok(v)) fail = true; };
    chk(state.pisc, poolVal(it), (v) => v === 'sim');
    chk(state.qt, it.quartos, (v) => v >= state.qt);
    chk(state.bh, it.banheiros, (v) => v >= state.bh);
    if (fail) continue;
    (missing ? pending : out).push(it);
  }
  const list = state.inc ? out.concat(pending) : out;
  const dir = ord[0] === '-' ? -1 : 1, field = SORT_FIELD[ord.replace('-', '')];
  list.sort((a, b) => {
    const x = a[field], y = b[field];
    if (known(x) !== known(y)) return known(x) ? -1 : 1;
    if (known(x) && x !== y) return (x - y) * dir;
    return (a.preco - b.preco) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
  return {list, hidden: pending.length};
}

/* ---------- rendering ---------- */
function ensureView() {
  const v = mq.matches ? 'table' : 'cards';
  if (v === view && el.wrap.firstElementChild && !el.wrap.querySelector('.sk,.error,.empty')) return;
  view = v;
  nodes = new Map();
  el.wrap.replaceChildren();
  if (v === 'table') el.wrap.appendChild(buildTable());
  else { olEl = document.createElement('ol'); olEl.id = 'results'; olEl.className = 'cards'; el.wrap.appendChild(olEl); }
}
function chipsData() {
  const c = [];
  if (state.q.trim()) c.push(['q', `Busca: ${state.q.trim()}`]);
  const {pmin, pmax} = state;
  if (pmin !== null || pmax !== null) {
    c.push(['preco', pmin === null ? `Até R$ ${compact(pmax)}` : pmax === null ? `A partir de R$ ${compact(pmin)}` : `R$ ${compact(pmin)} – ${compact(pmax)}`]);
  }
  if (state.km < 15) c.push(['km', `Até ${state.km} km`]);
  if (state.pisc) c.push(['pisc', 'Com piscina']);
  if (state.qt) c.push(['qt', `${state.qt}+ quartos`]);
  if (state.bh) c.push(['bh', `${state.bh}+ banheiros`]);
  if (state.imob.size) c.push(['imob', [...state.imob].join(', ')]);
  return c;
}
const chipsHTML = (c) => c.map(([k, l]) => `<button type="button" class="pill" data-k="${k}" aria-label="Remover filtro: ${esc(l)}">${esc(l)}<svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button>`).join('') +
  '<button type="button" class="link-btn small" data-k="all">Limpar filtros</button>';

function render() {
  const {list, hidden} = compute();
  current = {list, hidden};
  ensureView();
  const frag = document.createDocumentFragment();
  const build = view === 'table' ? buildRow : buildCard;
  for (const it of list) {
    let n = nodes.get(it.id);
    if (!n) nodes.set(it.id, n = build(it));
    frag.appendChild(n);
  }
  const chips = chipsData();
  const filtered = chips.length > 0 || state.inc || state.pisc;
  const n = list.length;
  el.count.innerHTML = (n === 0 ? 'Nenhuma chácara' : n === 1 ? '1 chácara' : `${NUM.format(n)} chácaras`) + (filtered ? `<small>de ${NUM.format(items.length)}</small>` : '');
  el.wrap.setAttribute('aria-busy', 'false');
  if (view === 'table') {
    el.wrap.querySelector('caption').textContent = `Chácaras à venda, ordenadas por ${ORD_LABEL[ord]}`;
    el.wrap.querySelectorAll('th[data-key]').forEach((th) => {
      const k = th.dataset.key, cur = ord.replace('-', '') === k;
      th.setAttribute('aria-sort', cur ? (ord[0] === '-' ? 'descending' : 'ascending') : 'none');
    });
  }
  const host = view === 'table' ? tbody : olEl;
  if (n === 0) {
    el.wrap.replaceChildren(emptyState(chips, hidden));
    view = null;
  } else host.replaceChildren(frag);
  // toolbar
  el.active.hidden = chips.length === 0;
  el.active.innerHTML = chips.length ? chipsHTML(chips) : '';
  el.revealRow.hidden = hidden === 0 && !state.inc;
  const nInc = hidden;
  el.reveal.textContent = state.inc ? `Ocultar os ${nInc} sem informação` : `+ ${nInc} sem essa informação — mostrar`;
  el.revealRow.hidden = nInc === 0;
  el.clearPanel.hidden = !(chips.length || state.inc);
  const nActive = chips.filter(([k]) => k !== 'q').length;
  el.badge.hidden = nActive === 0;
  el.badge.textContent = nActive;
  el.openBtn.setAttribute('aria-label', nActive ? `Filtros, ${nActive} ativo${nActive > 1 ? 's' : ''}` : 'Filtros');
  el.sheetShow.textContent = n === 0 ? 'Nenhuma chácara — ajuste os filtros' : n === 1 ? 'Mostrar 1 chácara' : `Mostrar ${NUM.format(n)} chácaras`;
  syncControls();
  writeUrl();
}
function emptyState(chips, hidden) {
  const d = document.createElement('div');
  d.className = 'empty';
  d.innerHTML = `<h2>Nenhuma chácara com esses filtros</h2><p>Tente aumentar a distância ou o preço máximo, ou remover algum filtro.</p>
    ${chips.length ? `<div class="active-chips">${chipsHTML(chips)}</div>` : ''}
    ${hidden && !state.inc ? `<button type="button" class="btn btn-ghost big" data-k="inc">Mostrar ${hidden} anúncio${hidden > 1 ? 's' : ''} sem essa informação</button>` : ''}
    <button type="button" class="btn btn-primary" data-k="all">Limpar filtros</button>`;
  return d;
}
function showSkeleton() {
  el.count.textContent = 'Carregando anúncios…';
  el.wrap.setAttribute('aria-busy', 'true');
  view = null;
  if (mq.matches) {
    const rows = Array.from({length: 8}, () => `<tr class="sk">${'<td><span class="skb"></span></td>'.repeat(5)}</tr>`).join('');
    el.wrap.innerHTML = `<div class="table-wrap sk"><table><tbody>${rows}</tbody></table></div>`;
  } else {
    el.wrap.innerHTML = '<ol class="cards sk">' + '<li class="card sk"><span class="skb" style="width:50%;height:26px"></span><span class="skb" style="width:80%"></span><span class="skb" style="width:30%"></span><span class="skb" style="height:90px"></span><span class="skb" style="height:48px;margin-top:auto"></span></li>'.repeat(6) + '</ol>';
  }
}
function showError() {
  el.count.textContent = 'Anúncios indisponíveis';
  el.wrap.setAttribute('aria-busy', 'false');
  view = null;
  el.wrap.innerHTML = '<div class="error" role="alert"><svg class="ic" aria-hidden="true"><use href="#i-alert"/></svg><div><strong>Não foi possível carregar os anúncios.</strong><p>Verifique a conexão e tente de novo.</p><button type="button" class="btn btn-ghost alert" id="retry">Tentar de novo</button></div></div>';
  $('retry').addEventListener('click', load);
}

/* ---------- controls <-> state ---------- */
function syncControls() {
  if (document.activeElement !== el.q) el.q.value = state.q;
  const fmt = (v) => v === null ? '' : NUM.format(v);
  if (document.activeElement !== el.pmin) el.pmin.value = fmt(state.pmin);
  if (document.activeElement !== el.pmax) el.pmax.value = fmt(state.pmax);
  el.quick.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(state.pmax === +b.dataset.v)));
  el.km.value = state.km;
  el.kmOut.textContent = `até ${state.km} km`;
  el.km.setAttribute('aria-valuetext', `até ${state.km} quilômetros`);
  el.pisc.checked = state.pisc;
  el.inc.checked = state.inc;
  for (const k of ['qt', 'bh']) {
    const r = el.form.querySelector(`input[name=${k}][value="${state[k]}"]`);
    if (r) r.checked = true;
  }
  el.imobs.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(state.imob.has(b.dataset.name))));
}
const parseMoney = (s) => { const d = String(s).replace(/\D/g, ''); return d ? parseInt(d, 10) : null; };
function setOrd(o) {
  ord = o;
  const opt = [...el.ord.options].find((x) => x.value === o);
  if (opt) { opt.hidden = false; el.ord.value = o; }
  render();
}
function resetFilters() {
  state = {...DEFAULTS, imob: new Set()};
}
function removeFilter(k) {
  if (k === 'all') resetFilters();
  else if (k === 'q') state.q = '';
  else if (k === 'preco') { state.pmin = state.pmax = null; }
  else if (k === 'km') state.km = 15;
  else if (k === 'pisc') state.pisc = false;
  else if (k === 'qt') state.qt = 0;
  else if (k === 'bh') state.bh = 0;
  else if (k === 'imob') state.imob.clear();
  else if (k === 'inc') state.inc = true;
  render();
}

function buildStaticControls() {
  for (const [name, id] of [['qt', 'seg-qt'], ['bh', 'seg-bh']]) {
    $(id).innerHTML = ['Qualquer', '1+', '2+', '3+', '4+'].map((l, i) =>
      `<label><input type="radio" name="${name}" value="${i}"${i === 0 ? ' checked' : ''}><span>${l}</span></label>`).join('');
  }
  el.imobs.innerHTML = agencies.map((a) => `<button type="button" class="chip" data-name="${esc(a)}" aria-pressed="false">${esc(a)}<span class="n">${agencyCount.get(a)}</span></button>`).join('');
}

function bind() {
  const onText = debounce(() => { state.q = el.q.value; render(); }, 150);
  el.q.addEventListener('input', onText);
  for (const [inp, key] of [[el.pmin, 'pmin'], [el.pmax, 'pmax']]) {
    inp.addEventListener('input', debounce(() => { state[key] = parseMoney(inp.value); render(); }, 150));
    inp.addEventListener('blur', () => {
      state[key] = parseMoney(inp.value);
      if (state.pmin !== null && state.pmax !== null && state.pmin > state.pmax) [state.pmin, state.pmax] = [state.pmax, state.pmin];
      render();
    });
  }
  el.quick.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = +b.dataset.v;
    state.pmax = state.pmax === v ? null : v;
    if (state.pmin !== null && state.pmax !== null && state.pmin > state.pmax) state.pmin = null;
    render();
  });
  el.km.addEventListener('input', () => { state.km = +el.km.value; render(); });
  el.pisc.addEventListener('change', () => { state.pisc = el.pisc.checked; render(); });
  el.inc.addEventListener('change', () => { state.inc = el.inc.checked; render(); });
  el.form.addEventListener('change', (e) => {
    if (e.target.type === 'radio') { state[e.target.name] = +e.target.value; render(); }
  });
  el.imobs.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const n = b.dataset.name;
    state.imob.has(n) ? state.imob.delete(n) : state.imob.add(n);
    render();
  });
  el.form.addEventListener('submit', (e) => e.preventDefault());
  el.ord.addEventListener('change', () => setOrd(el.ord.value));
  el.reveal.addEventListener('click', () => { state.inc = !state.inc; render(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b && (b.closest('#active') || b.closest('.empty'))) removeFilter(b.dataset.k);
  });
  el.clearPanel.addEventListener('click', () => removeFilter('all'));
  $('clear-sheet').addEventListener('click', () => removeFilter('all'));
  // sheet
  el.openBtn.addEventListener('click', () => { el.sheet.showModal(); document.documentElement.style.overflow = 'hidden'; });
  $('close-sheet').addEventListener('click', closeSheet);
  el.sheetShow.addEventListener('click', () => { closeSheet(); document.getElementById('results-wrap').scrollIntoView({block: 'start', behavior: 'auto'}); });
  el.sheet.addEventListener('click', (e) => { if (e.target === el.sheet) closeSheet(); });
  el.sheet.addEventListener('close', () => { document.documentElement.style.overflow = ''; el.sheet.classList.remove('closing'); el.openBtn.focus(); });
  mq.addEventListener('change', () => { place(); if (items.length) render(); });
}
function closeSheet() {
  if (!el.sheet.open) return;
  if (reduceMotion.matches) { el.sheet.close(); return; }
  el.sheet.classList.add('closing');
  setTimeout(() => el.sheet.close(), 200);
}
/* single form + single search input: relocate by breakpoint */
function place() {
  if (mq.matches) {
    if (el.sheet.open) el.sheet.close();
    el.panel.appendChild(el.form);
    el.form.querySelector('.fgrid').prepend(el.fieldSearch);
  } else {
    el.slotSearch.appendChild(el.fieldSearch);
    el.sheetBody.appendChild(el.form);
  }
}

/* ---------- URL ---------- */
const ORD_URL = ['preco', '-preco', 'dist', '-dist', '-terreno', 'terreno', '-construida', 'construida'];
function writeUrl() {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set('q', state.q.trim());
  if (state.pmin !== null) p.set('pmin', state.pmin);
  if (state.pmax !== null) p.set('pmax', state.pmax);
  if (state.km < 15) p.set('km', state.km);
  if (state.pisc) p.set('pisc', '1');
  if (state.qt) p.set('qt', state.qt);
  if (state.bh) p.set('bh', state.bh);
  if (state.imob.size) p.set('imob', [...state.imob].join(','));
  if (state.inc) p.set('inc', '1');
  if (ord !== 'preco') p.set('ord', ord);
  const s = p.toString();
  history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
}
function readUrl() {
  const p = new URLSearchParams(location.search);
  const int = (k, lo, hi) => { const v = parseInt(p.get(k), 10); return Number.isFinite(v) && v >= lo && v <= hi ? v : null; };
  state.q = p.get('q') || '';
  state.pmin = int('pmin', 0, 1e12);
  state.pmax = int('pmax', 0, 1e12);
  state.km = int('km', 2, 15) ?? 15;
  state.pisc = p.get('pisc') === '1';
  state.qt = int('qt', 1, 4) ?? 0;
  state.bh = int('bh', 1, 4) ?? 0;
  state.inc = p.get('inc') === '1';
  state.imob = new Set((p.get('imob') || '').split(',').filter((n) => agencyCount.has(n)));
  const o = p.get('ord');
  if (ORD_URL.includes(o)) { ord = o; const opt = [...el.ord.options].find((x) => x.value === o); opt.hidden = false; el.ord.value = o; }
}

/* ---------- boot ---------- */
async function load() {
  showSkeleton();
  try {
    const r = await fetch('data.json');
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('formato');
    items = data;
  } catch (e) { showError(); return; }
  for (const it of items) it._hay = norm([it.local, it.titulo, it.imobiliaria, it.agua, it.obs].filter(Boolean).join(' '));
  agencyCount = new Map();
  for (const it of items) agencyCount.set(it.imobiliaria, (agencyCount.get(it.imobiliaria) || 0) + 1);
  agencies = [...agencyCount.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  $('subtitle').textContent = `${items.length} anúncios de ${agencies.length} imobiliárias, do mais barato ao mais caro. Distâncias estimadas em linha reta a partir de Itapetininga — o trajeto de carro é maior.`;
  $('sources').textContent = `Fontes: ${agencies.join(', ')}.`;
  buildStaticControls();
  readUrl();
  render();
}
bind();
place();
load();
