const KEY = '8265bd1679663a7ea12ac168da84d2e8';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';
const EMBED = 'https://cdn-embed.com';

const ICONS = {"film": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4\"/>", "tv": "<rect x=\"2\" y=\"7\" width=\"20\" height=\"15\" rx=\"2\"/><path d=\"m17 2-5 5-5-5\"/>", "torii": "<path d=\"M3 5c6 1.5 12 1.5 18 0M5 9.5h14M7 6.5V21M17 6.5V21\"/>", "flame": "<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z\"/>", "play": "<path d=\"M7 4v16l13-8z\" fill=\"currentColor\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4M12 8h.01\"/>", "star": "<path fill=\"currentColor\" stroke=\"none\" d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z\"/>", "sparkles": "<path d=\"M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z\"/><path d=\"M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z\"/>", "x": "<path d=\"M18 6 6 18M6 6l12 12\"/>", "calendar": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>", "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"/>"};
function ic(n) { return `<svg class="i" viewBox="0 0 24 24">${ICONS[n]||''}</svg>`; }

let tab = 'movie';
let genre = '';
let heroData = null;
let nowPlaying = null;
let searchTimer = null;
let provider = '';

// Plataformas de streaming (IDs do TMDB, região Brasil)
const REGION = 'BR';
const providers = [
  {id:8,    name:'Netflix',     prep:'na',  color:'#e50914'},
  {id:119,  name:'Prime Video', prep:'no',  color:'#00a8e1'},
  {id:337,  name:'Disney+',     prep:'no',  color:'#2f6bff'},
  {id:1899, name:'Max',         prep:'no',  color:'#7b3cff'},
  {id:350,  name:'Apple TV+',   prep:'no',  color:'#d9d9d9'},
  {id:307,  name:'Globoplay',   prep:'no',  color:'#fb0234'},
  {id:531,  name:'Paramount+',  prep:'no',  color:'#0064ff'},
  {id:283,  name:'Crunchyroll', prep:'na',  color:'#f47521'}
];

const genreMap = {
  movie: [
    {id:'',name:'Todos'},{id:28,name:'Ação'},{id:35,name:'Comédia'},{id:18,name:'Drama'},
    {id:27,name:'Terror'},{id:878,name:'Ficção Científica'},{id:10749,name:'Romance'},
    {id:12,name:'Aventura'},{id:16,name:'Animação'},{id:53,name:'Suspense'},{id:80,name:'Crime'}
  ],
  tv: [
    {id:'',name:'Todos'},{id:18,name:'Drama'},{id:35,name:'Comédia'},{id:10765,name:'Sci-Fi'},
    {id:80,name:'Crime'},{id:10759,name:'Ação'},{id:9648,name:'Mistério'},{id:16,name:'Animação'},{id:10762,name:'Infantil'}
  ],
  anime: [
    {id:'',name:'Todos'},{id:16,name:'Animação'},{id:28,name:'Ação'},{id:18,name:'Drama'},{id:10765,name:'Fantasia'}
  ]
};

async function tmdb(path, extra='') {
  const url = `${BASE}${path}?api_key=${KEY}&language=pt-BR${extra}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function imgSrc(p, size='w342') { return p ? `${IMG}${size}${p}` : null; }

function card(item, type) {
  const title = item.title || item.name || 'Sem título';
  const year = (item.release_date || item.first_air_date || '').slice(0,4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';
  const poster = imgSrc(item.poster_path);
  const div = document.createElement('div');
  div.className = 'card';
  div.title = title;
  div.onclick = () => openPlayer(item, type || tab);
  const kind = type || tab;
  div.innerHTML = poster
    ? `<img class="card-img" src="${poster}" alt="${title}" loading="lazy" onerror="this.parentNode.querySelector('.card-no-img') && (this.style.display='none')">`
    : `<div class="card-no-img">${ic('film')}</div>`;
  div.innerHTML += `
    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-sub">
        <span class="card-year">${year}</span>
        <span class="card-rating">${ic('star')} ${rating}</span>
      </div>
    </div>`;
  div.appendChild(favButton(item, kind));
  return div;
}

function fillRow(id, items, type) {
  const r = document.getElementById(id);
  r.innerHTML = '';
  if (!(items||[]).length) {
    r.innerHTML = '<p class="empty-msg" style="text-align:left;padding:10px 0">Nada encontrado nesta plataforma com esse filtro.</p>';
    addArrows(r);
    return;
  }
  (items||[]).forEach(i => r.appendChild(card(i, type||tab)));
  r.scrollLeft = 0;
  addArrows(r);
}

async function loadHome() {
  const gpBase = genre ? `&with_genres=${genre}` : '';
  const pv = provider ? `&watch_region=${REGION}&with_watch_providers=${provider}` : '';
  const gp = gpBase + pv;
  let ep = tab === 'movie' ? 'movie' : 'tv';
  let animeExtra = tab === 'anime' ? '&with_genres=16&with_original_language=ja' : '';
  loadProviderRows(ep, gpBase, animeExtra);

  const [pop, top, fresh] = await Promise.all([
    tmdb(`/discover/${ep}`, `&sort_by=popularity.desc${gp}${animeExtra}`),
    tmdb(`/discover/${ep}`, `&sort_by=vote_average.desc&vote_count.gte=300${gp}${animeExtra}`),
    tmdb(`/discover/${ep}`, `&sort_by=primary_release_date.desc&vote_count.gte=30${gp}${animeExtra}`)
  ]);
  fillRow('row-pop', (pop.results||[]).slice(0,20));
  fillRow('row-top', (top.results||[]).slice(0,20));
  fillRow('row-new', (fresh.results||[]).slice(0,20));
  renderFavRow();
  if ((pop.results||[]).length) setHero(pop.results[0]);
}

function setHero(item) {
  heroData = item;
  const title = item.title || item.name || '';
  const year = (item.release_date || item.first_air_date || '').slice(0,4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';
  document.getElementById('hero-title').textContent = title;
  document.getElementById('hero-desc').textContent = (item.overview||'').slice(0,200) + ((item.overview||'').length > 200 ? '…' : '');
  document.getElementById('hero-meta').innerHTML = `
    <span>${year}</span>
    <span class="star">${ic('star')} ${rating}</span>
    <span style="background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">${tab==='movie'?'Filme':tab==='anime'?'Anime':'Série'}</span>
  `;
  if (item.backdrop_path) {
    document.getElementById('hero-bg').style.backgroundImage = `url(${imgSrc(item.backdrop_path,'w1280')})`;
  }
  document.getElementById('hero-play').onclick = () => openPlayer(item, tab);
  bindFav(document.getElementById('hero-fav'), item, tab);
  document.getElementById('hero-more').onclick = () => {
    const url = tab==='movie'
      ? `https://www.themoviedb.org/movie/${item.id}`
      : `https://www.themoviedb.org/tv/${item.id}`;
    window.open(url, '_blank');
  };
}

async function openPlayer(item, type) {
  nowPlaying = { item, type };
  const title = item.title || item.name || '';
  const year = (item.release_date || item.first_air_date || '').slice(0,4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';

  document.getElementById('modal-head-title').textContent = title;
  bindFav(document.getElementById('fav-modal-btn'), item, type);
  document.getElementById('modal-info').innerHTML = `
    <span>${ic('calendar')} ${year}</span>
    <span>${ic('star')} ${rating}</span>
    <span>${type==='movie'?ic('film')+' Filme':type==='anime'?ic('torii')+' Anime':ic('tv')+' Série'}</span>
    ${item.original_language ? `<span>${ic('globe')} ${item.original_language.toUpperCase()}</span>` : ''}
  `;

  const epArea = document.getElementById('ep-area');

  if (type === 'movie') {
    epArea.style.display = 'none';
    setEmbed(`${EMBED}/filme/${item.id}`);
  } else {
    epArea.style.display = 'block';
    setEmbed(`${EMBED}/serie/${item.id}/1/1`);
    try {
      const det = await tmdb(`/tv/${item.id}`);
      const total = det.number_of_seasons || 1;
      const sel = document.getElementById('season-sel');
      sel.innerHTML = '';
      for (let s = 1; s <= total; s++) {
        sel.innerHTML += `<option value="${s}">Temporada ${s}</option>`;
      }
      loadEpisodes(1);
    } catch(e) {
      document.getElementById('ep-grid').innerHTML = '<span style="color:var(--muted);font-size:13px">Episódios não disponíveis</span>';
    }
  }

  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function setEmbed(url) {
  document.getElementById('player-area').innerHTML = `<iframe src="${url}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen *" allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>`;
}

async function loadEpisodes(s) {
  const { item } = nowPlaying;
  const season = s || parseInt(document.getElementById('season-sel').value);
  const grid = document.getElementById('ep-grid');
  grid.innerHTML = '<span style="color:var(--muted);font-size:12px">Carregando...</span>';
  try {
    const data = await tmdb(`/tv/${item.id}/season/${season}`);
    grid.innerHTML = '';
    (data.episodes||[]).forEach((ep, i) => {
      const btn = document.createElement('button');
      btn.className = 'ep-btn' + (i===0?' active':'');
      btn.textContent = `E${ep.episode_number}`;
      btn.title = ep.name || `Episódio ${ep.episode_number}`;
      btn.onclick = () => {
        document.querySelectorAll('.ep-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        setEmbed(`${EMBED}/serie/${item.id}/${season}/${ep.episode_number}`);
      };
      grid.appendChild(btn);
    });
  } catch(e) {
    grid.innerHTML = '<span style="color:var(--muted);font-size:12px">Não foi possível carregar episódios</span>';
  }
}

function changeSeason() {
  const s = parseInt(document.getElementById('season-sel').value);
  const { item } = nowPlaying;
  setEmbed(`${EMBED}/serie/${item.id}/${s}/1`);
  loadEpisodes(s);
}

function closeModal() {
  exitFullscreen();
  document.getElementById('modal').classList.remove('open');
  document.getElementById('player-area').innerHTML = '';
  document.body.style.overflow = '';
}

function modalBgClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function setTab(t, el) {
  tab = t; genre = '';
  goHome();
  document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  renderPills();
  loadHome();
}

function goHome() {
  document.getElementById('search-view').style.display = 'none';
  document.getElementById('fav-view').style.display = 'none';
  document.getElementById('fav-nav').classList.remove('active');
  document.getElementById('main-view').style.display = 'block';
  document.getElementById('q').value = '';
}

function renderPills() {
  const wrap = document.getElementById('genre-pills');
  wrap.innerHTML = '';
  (genreMap[tab]||[]).forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (String(g.id)===String(genre)?' active':'');
    btn.textContent = g.name;
    btn.onclick = () => { genre = g.id; renderPills(); loadHome(); };
    wrap.appendChild(btn);
  });
}

function renderProviders() {
  const wrap = document.getElementById('provider-pills');
  wrap.innerHTML = '<span class="providers-label">Plataformas</span>';
  const all = [{id:'', name:'Todas', color:'#ff3d5a'}, ...providers];
  all.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'prov' + (String(p.id)===String(provider)?' active':'');
    btn.style.setProperty('--c', p.color);
    btn.innerHTML = `<span class="prov-dot"></span>${p.name}`;
    btn.onclick = () => { provider = p.id; renderProviders(); loadHome(); };
    wrap.appendChild(btn);
  });
}

let provReq = 0;
async function loadProviderRows(ep, gp, animeExtra) {
  const box = document.getElementById('provider-rows');
  const req = ++provReq;
  box.innerHTML = '';
  // Com uma plataforma escolhida, as fileiras de cima já estão filtradas
  if (provider) return;
  const results = await Promise.all(providers.map(p =>
    tmdb(`/discover/${ep}`, `&sort_by=popularity.desc&watch_region=${REGION}&with_watch_providers=${p.id}${gp}${animeExtra}`)
      .then(d => ({ p, items: (d.results||[]).slice(0,20) }))
      .catch(() => ({ p, items: [] }))
  ));
  if (req !== provReq) return; // troca de aba/filtro durante o carregamento
  results.forEach(({ p, items }) => {
    if (!items.length) return;
    const sec = document.createElement('div');
    sec.className = 'section';
    sec.innerHTML = `
      <div class="section-title prov-title" style="--c:${p.color}">
        ${tab==='movie'?'Filmes':tab==='anime'?'Animes':'Séries'} ${p.prep} ${p.name}
        <button class="prov" style="--c:${p.color};margin-left:auto;padding:5px 12px;font-size:12px">Ver tudo</button>
      </div>
      <div class="row"></div>`;
    sec.querySelector('button').onclick = () => {
      provider = p.id; renderProviders(); loadHome();
      document.getElementById('genre-pills').scrollIntoView({ behavior: 'smooth' });
    };
    items.forEach(i => sec.querySelector('.row').appendChild(card(i, tab)));
    box.appendChild(sec);
    addArrows(sec.querySelector('.row'));
  });
}

async function doSearch(q) {
  q = q.trim();
  if (!q) { goHome(); return; }
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('fav-view').style.display = 'none';
  document.getElementById('fav-nav').classList.remove('active');
  document.getElementById('search-view').style.display = 'block';
  document.getElementById('search-head').textContent = `Resultados para "${q}"`;
  document.getElementById('search-grid').innerHTML = '<div class="loader-wrap"><div class="loader"></div></div>';
  try {
    const data = await tmdb('/search/multi', `&query=${encodeURIComponent(q)}`);
    const results = (data.results||[]).filter(r=>r.media_type==='movie'||r.media_type==='tv');
    const grid = document.getElementById('search-grid');
    grid.innerHTML = '';
    if (!results.length) {
      grid.innerHTML = '<p class="empty-msg">Nenhum resultado encontrado.</p>';
      return;
    }
    results.forEach(r => grid.appendChild(card(r, r.media_type)));
  } catch(e) {
    document.getElementById('search-grid').innerHTML = '<p class="empty-msg">Erro ao buscar. Verifique sua conexão.</p>';
  }
}

document.getElementById('q').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => doSearch(e.target.value), 380);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('modal-box').classList.contains('fake-fs')) { exitFullscreen(); return; }
    closeModal();
  }
});

// ---------- FAVORITOS (salvos no navegador) ----------
const FAV_KEY = 'cinestream:favoritos';
const HEART = '<svg class="i" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
let favFilter = 'all';
function loadFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch(_) { return []; }
}
let favs = loadFavs();
function saveFavs() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); }
  catch(_) { toast('Não foi possível salvar (o navegador bloqueou o armazenamento)'); }
}
function favKey(item, kind) { return (kind === 'movie' ? 'movie' : 'tv') + ':' + item.id; }
function isFav(key) { return favs.some(f => f.key === key); }
function kindOfFav(f) { return f.kind === 'movie' ? 'movie' : f.kind === 'anime' ? 'anime' : 'tv'; }
function toggleFav(item, kind) {
  const key = favKey(item, kind);
  const title = item.title || item.name || '';
  if (isFav(key)) {
    favs = favs.filter(f => f.key !== key);
    toast(`Removido dos favoritos: ${title}`);
  } else {
    favs.unshift({
      key, kind, addedAt: Date.now(),
      item: {
        id: item.id, title: item.title, name: item.name, poster_path: item.poster_path,
        backdrop_path: item.backdrop_path, release_date: item.release_date, first_air_date: item.first_air_date,
        vote_average: item.vote_average, overview: item.overview, original_language: item.original_language
      }
    });
    toast(`Adicionado aos favoritos: ${title}`);
  }
  saveFavs();
  refreshFavUI();
}
function favButton(item, kind) {
  const b = document.createElement('button');
  b.className = 'fav-btn';
  b.innerHTML = HEART;
  bindFav(b, item, kind);
  return b;
}
function bindFav(btn, item, kind) {
  btn.dataset.favKey = favKey(item, kind);
  btn.onclick = (e) => { e.stopPropagation(); toggleFav(item, kind); };
  paintFav(btn);
}
function paintFav(btn) {
  const on = isFav(btn.dataset.favKey);
  btn.classList.toggle('on', on);
  const label = on ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  btn.title = label; btn.setAttribute('aria-label', label);
  const txt = btn.querySelector('span');
  if (txt) txt.textContent = on ? 'Na Minha Lista' : 'Minha Lista';
}
function refreshFavUI() {
  document.querySelectorAll('[data-fav-key]').forEach(b => { if (b.dataset.favKey) paintFav(b); });
  const c = document.getElementById('fav-count');
  c.textContent = favs.length;
  c.style.display = favs.length ? '' : 'none';
  renderFavRow();
  if (document.getElementById('fav-view').style.display === 'block') renderFavs();
}
// fileira "Minha Lista" na página inicial, só do tipo da aba atual
function renderFavRow() {
  const list = favs.filter(f => kindOfFav(f) === tab);
  const sec = document.getElementById('fav-section');
  sec.style.display = list.length ? '' : 'none';
  const row = document.getElementById('row-fav');
  row.innerHTML = '';
  if (!list.length) return;
  list.forEach(f => row.appendChild(card(f.item, f.kind)));
  addArrows(row);
}
function renderFavFilters() {
  const opts = [['all','Todos'],['movie','Filmes'],['tv','Séries'],['anime','Animes']];
  const wrap = document.getElementById('fav-filters');
  wrap.innerHTML = '';
  opts.forEach(([k, label]) => {
    const n = k === 'all' ? favs.length : favs.filter(f => kindOfFav(f) === k).length;
    const b = document.createElement('button');
    b.className = 'pill' + (favFilter === k ? ' active' : '');
    b.textContent = `${label} (${n})`;
    b.onclick = () => { favFilter = k; renderFavs(); };
    wrap.appendChild(b);
  });
}
function renderFavs() {
  renderFavFilters();
  const grid = document.getElementById('fav-grid');
  const list = favs.filter(f => favFilter === 'all' || kindOfFav(f) === favFilter);
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = `<div class="fav-empty">${HEART}<p>${favs.length ? 'Nada nesta categoria ainda.' : 'Você ainda não tem favoritos.'}</p><span>Toque no coração de um filme, série ou anime para guardar aqui.</span></div>`;
    return;
  }
  list.forEach(f => grid.appendChild(card(f.item, f.kind)));
}
function showFavs() {
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('search-view').style.display = 'none';
  document.getElementById('fav-view').style.display = 'block';
  document.getElementById('fav-nav').classList.add('active');
  document.getElementById('q').value = '';
  renderFavs();
  window.scrollTo(0, 0);
}
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
// favoritos alterados em outra aba
window.addEventListener('storage', e => { if (e.key === FAV_KEY) { favs = loadFavs(); refreshFavUI(); } });

// ---------- SETAS DAS FILEIRAS ----------
const CHEV_L = '<svg class="i" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>';
const CHEV_R = '<svg class="i" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
function updateArrows(row) {
  const wrap = row.parentNode;
  if (!wrap || !wrap.classList.contains('row-wrap')) return;
  const max = row.scrollWidth - row.clientWidth;
  wrap.classList.toggle('at-start', row.scrollLeft <= 5);
  wrap.classList.toggle('at-end', row.scrollLeft >= max - 5);
}
function addArrows(row) {
  if (row.parentNode.classList.contains('row-wrap')) { requestAnimationFrame(() => updateArrows(row)); return; }
  const wrap = document.createElement('div');
  wrap.className = 'row-wrap at-start';
  row.parentNode.insertBefore(wrap, row);
  wrap.appendChild(row);
  [['prev', CHEV_L, -1, 'Voltar'], ['next', CHEV_R, 1, 'Avançar']].forEach(([cls, icon, dir, label]) => {
    const b = document.createElement('button');
    b.className = 'row-arrow ' + cls;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = `<span>${icon}</span>`;
    b.onclick = () => row.scrollBy({ left: dir * row.clientWidth * 0.85, behavior: 'smooth' });
    wrap.appendChild(b);
  });
  row.addEventListener('scroll', () => updateArrows(row), { passive: true });
  requestAnimationFrame(() => updateArrows(row));
}
window.addEventListener('resize', () => document.querySelectorAll('.row-wrap > .row').forEach(updateArrows));

// ---------- TELA CHEIA ----------
const FS_MAX = '<svg class="i" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
const FS_MIN = '<svg class="i" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';
function isNativeFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function setFsIcon(on) {
  const b = document.getElementById('fs-btn');
  b.innerHTML = on ? FS_MIN : FS_MAX;
  b.title = on ? 'Sair da tela cheia' : 'Tela cheia';
}
async function toggleFullscreen() {
  const box = document.getElementById('modal-box');
  if (isNativeFs() || box.classList.contains('fake-fs')) { exitFullscreen(); return; }
  const el = box;
  box.classList.add('is-fs');
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else throw new Error('sem suporte');
  } catch(e) {
    // Navegador bloqueou (ex.: iPhone ou página aberta numa prévia): tela cheia simulada
    box.classList.add('fake-fs');
    document.getElementById('modal').classList.add('fake-fs-on');
  }
  // Tenta deitar a tela (funciona no Android em tela cheia)
  let locked = false;
  try { await screen.orientation.lock('landscape'); locked = true; } catch(_) {}
  // Se não deu (iPhone, etc.), gira o vídeo por CSS quando o celular estiver em pé
  const touch = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (!locked && touch) box.classList.add('rotate');
  setFsIcon(true);
}
function exitFullscreen() {
  const box = document.getElementById('modal-box');
  box.classList.remove('fake-fs', 'is-fs', 'rotate');
  document.getElementById('modal').classList.remove('fake-fs-on');
  if (isNativeFs()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
  try { screen.orientation.unlock(); } catch(_) {}
  setFsIcon(false);
}
['fullscreenchange','webkitfullscreenchange'].forEach(ev =>
  document.addEventListener(ev, () => {
    const box = document.getElementById('modal-box');
    // saiu da tela cheia pelo Esc / gesto do sistema
    if (!isNativeFs() && !box.classList.contains('fake-fs')) { box.classList.remove('is-fs', 'rotate'); setFsIcon(false); }
  })
);

renderPills();
renderProviders();
refreshFavUI();
loadHome();
