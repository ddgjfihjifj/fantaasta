/* ============================================================================
   FANTAASTA LIVE — script.js
   Cyberpunk Auction Suite (Carmi & Il Tattico Dual-Vision + Slot Strategy AI)
   ============================================================================ */

// Percorsi candidati per la lettura dei file JSON
const DATA_CANDIDATES = {
  P: ['data/portierimisto.json', 'data/portieri.json'],
  D: ['data/difensorimisto.json', 'data/difensori.json'],
  C: ['data/centrocampistimisto.json', 'data/centrocampisti.json'],
  A: ['data/attaccantimisto.json', 'data/attaccanti.json'],
};

const ROLE_CONFIG = {
  P: { label: 'Portieri', short: 'POR', slots: 3, text: 'text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500', hex: '#06b6d4' },
  D: { label: 'Difensori', short: 'DIF', slots: 8, text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500', hex: '#10b981' },
  C: { label: 'Centrocampisti', short: 'CEN', slots: 8, text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500', hex: '#f59e0b' },
  A: { label: 'Attaccanti', short: 'ATT', slots: 6, text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500', hex: '#f43f5e' },
};
const ROLE_ORDER = ['P', 'D', 'C', 'A'];

const TEAM_COUNT = 10;
const STARTING_BUDGET = 500;
const STORAGE_KEY = 'fantaAstaLive_dual_v8_slots';
const DEFAULT_BUDGET_TARGETS = { P: 7, D: 16, C: 32, A: 45 }; // Somma: 100%

// Strategie di Default Slot per Slot (Preimpostate all'avvio)
const DEFAULT_SLOT_STRATEGIES = {
  P: {
    activeId: 'p_top',
    list: [
      { id: 'p_top', name: 'Porta Top (1 Big + 2 Coperture)', slots: [40, 1, 1] },
      { id: 'p_incrocio', name: 'Griglia Portieri Low Cost', slots: [15, 10, 1] }
    ]
  },
  D: {
    activeId: 'd_top',
    list: [
      { id: 'd_top', name: 'Difesa Top (Dimarco + Titolari)', slots: [70, 15, 10, 5, 1, 1, 1, 1] },
      { id: 'd_mod', name: 'Difesa 4 Equilibrata (Modificatore)', slots: [25, 25, 20, 15, 1, 1, 1, 1] },
      { id: 'd_low', name: 'Difesa Low Cost (Tutti a 1cr)', slots: [10, 5, 2, 1, 1, 1, 1, 1] }
    ]
  },
  C: {
    activeId: 'c_balanced',
    list: [
      { id: 'c_balanced', name: 'Centrocampo 2 Top + 2 Semitop', slots: [60, 50, 25, 20, 10, 5, 1, 1] },
      { id: 'c_equil', name: 'Centrocampo Spalmato 4 Titolari', slots: [35, 35, 30, 30, 15, 5, 1, 1] }
    ]
  },
  A: {
    activeId: 'a_supertop',
    list: [
      { id: 'a_supertop', name: 'Tridente Pesante (1 SuperTop + 2 Secondi)', slots: [160, 50, 40, 10, 2, 1] },
      { id: 'a_3top', name: 'Attacco 3 Punte Equilibrate', slots: [90, 80, 75, 10, 5, 1] },
      { id: 'a_coppia', name: 'Doppio Top + Tappabuchi', slots: [130, 110, 10, 5, 2, 1] }
    ]
  }
};

const FORMATIONS = {
  '3-4-3': { D: 3, C: 4, A: 3 },
  '3-5-2': { D: 3, C: 5, A: 2 },
  '4-3-3': { D: 4, C: 3, A: 3 },
  '4-4-2': { D: 4, C: 4, A: 2 },
  '4-5-1': { D: 4, C: 5, A: 1 },
  '5-3-2': { D: 5, C: 3, A: 2 },
  '5-4-1': { D: 5, C: 4, A: 1 },
};

/* --- DEFINIZIONE COLORI E STILI DELLE FASCE (CARMI & TATTICO) --- */
const FASCIA_DEFINITIONS = [
  // TATTICO
  { match: /TOP\s*"FRANCO"/i, vision: 'tattico', grad: 'from-red-600 to-rose-700', text: 'text-white', ring: 'ring-red-500', hex: '#ef4444', label: 'TOP "FRANCO"', order: 1 },
  { match: /SEMI\s*"FRANCO"/i, vision: 'tattico', grad: 'from-amber-400 to-yellow-500', text: 'text-slate-950 font-800', ring: 'ring-yellow-400', hex: '#eab308', label: 'SEMI "FRANCO"', order: 2 },
  { match: /NOI\s*\(\s*SI\s*PRENDONO\s*\)/i, vision: 'tattico', grad: 'from-emerald-500 to-teal-600', text: 'text-white', ring: 'ring-emerald-400', hex: '#10b981', label: 'NOI (SI PRENDONO)', order: 3 },
  { match: /VOI\s*\(\s*SI\s*LASCIANO\s*\)/i, vision: 'tattico', grad: 'from-pink-900 via-purple-950 to-slate-900', text: 'text-pink-300 font-bold', ring: 'ring-pink-500 border border-pink-500/40', hex: '#ec4899', label: 'VOI (SI LASCIANO)', order: 4 },
  { match: /FRANCO\s*"LOW\s*COST"/i, vision: 'tattico', grad: 'from-fuchsia-600 to-pink-600', text: 'text-white', ring: 'ring-fuchsia-400', hex: '#d946ef', label: 'FRANCO "LOW COST"', order: 5 },
  { match: /SEMPRE\s*IN\s*BALLOTTAGGIO/i, vision: 'tattico', grad: 'from-orange-500 to-amber-600', text: 'text-white', ring: 'ring-orange-400', hex: '#f97316', label: 'SEMPRE IN BALLOTTAGGIO', order: 6 },
  { match: /NESSUNA\s*FASCIA/i, vision: 'tattico', grad: 'from-indigo-950 via-slate-900 to-purple-950', text: 'text-indigo-300 font-bold', ring: 'ring-indigo-500 border border-indigo-500/40', hex: '#8b5cf6', label: 'NESSUNA FASCIA', order: 7 },

  // CARMI
  { match: /^Top$/i, vision: 'carmi', grad: 'from-red-600 to-rose-700', text: 'text-white', ring: 'ring-red-500', hex: '#ef4444', label: 'TOP', order: 1 },
  { match: /^Semi-Top$/i, vision: 'carmi', grad: 'from-amber-400 to-yellow-500', text: 'text-slate-950 font-800', ring: 'ring-yellow-400', hex: '#eab308', label: 'SEMI-TOP', order: 2 },
  { match: /^Terza$/i, vision: 'carmi', grad: 'from-cyan-500 to-sky-600', text: 'text-white', ring: 'ring-cyan-400', hex: '#06b6d4', label: 'TERZA FASCIA', order: 3 },
  { match: /^(Quarta|Quota)$/i, vision: 'carmi', grad: 'from-emerald-500 to-teal-600', text: 'text-white', ring: 'ring-emerald-400', hex: '#10b981', label: 'QUARTA FASCIA', order: 4 },
  { match: /^Scomm\.?$/i, vision: 'carmi', grad: 'from-fuchsia-600 to-pink-600', text: 'text-white', ring: 'ring-fuchsia-400', hex: '#d946ef', label: 'SCOMMESSE', order: 5 },
  { match: /^Outsider$/i, vision: 'carmi', grad: 'from-indigo-950 via-slate-900 to-purple-950', text: 'text-indigo-300 font-bold', ring: 'ring-indigo-500 border border-indigo-500/40', hex: '#6366f1', label: 'OUTSIDER', order: 6 },
];

const DEFAULT_FASCIA = { grad: 'from-slate-800 to-slate-900', text: 'text-slate-300', ring: 'ring-slate-700', hex: '#475569', label: 'NON CLASSIFICATO', order: 99 };

/* ============================== STATO APPLICAZIONE ============================== */

let state = {
  vision: 'carmi', // 'carmi' | 'tattico'
  pricesLocked: true, // Modalità asta: true = prezzi congelati; false = modificabili
  players: [],
  favorites: new Set(),
  sold: {}, // playerId -> { teamId, price }
  teams: [],
  myTeamId: 0,
  currentPlayerId: null,
  budgetTargets: { ...DEFAULT_BUDGET_TARGETS },
  slotStrategies: JSON.parse(JSON.stringify(DEFAULT_SLOT_STRATEGIES)),
  activeStrategyRoleView: 'P', // Reparto selezionato nel configuratore slot
  budgetViewTeamId: null,
  formTeamId: null,
  formModule: '4-3-3',
  activeTab: 'asta',
  listFilters: { role: 'ALL', search: '', onlyFav: false, sort: 'price_desc' },
  fasciaMedie: { carmi: {}, tattico: {} },
  accordionState: {}, // "teamId_role" -> boolean
  customPrices: {}, // playerId -> { carmi?: number, tattico?: number }
  playerNotes: {}, // playerId -> string
};

const byId = new Map();

/* ============================== UTILITIES ============================== */

function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function fmtNum(n, fallback = '-') {
  if (n === undefined || n === null || n === '' || Number.isNaN(Number(n))) return fallback;
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- Normalizzazione Ruolo ---------------- */
function normalizeRole(roleRaw) {
  if (!roleRaw) return 'C';
  const str = String(roleRaw).toUpperCase().trim();
  if (str.startsWith('P') || str === 'POR') return 'P';
  if (str.startsWith('D') || str === 'DIF') return 'D';
  if (str.startsWith('C') || str === 'CEN' || str.startsWith('CENTRO')) return 'C';
  if (str.startsWith('A') || str === 'ATT' || str.startsWith('ATTAC')) return 'A';
  return 'C';
}

/* ---------------- Percentuale di Titolarità & Integrità ---------------- */
function playerTit(p) {
  if (p.tit !== undefined && p.tit !== null && p.tit !== '') return Number(p.tit);
  if (p.titolarita !== undefined && p.titolarita !== null && p.titolarita !== '') return Number(p.titolarita);
  return 100;
}

function playerInteg(p) {
  if (p.integ !== undefined && p.integ !== null && p.integ !== '') return Number(p.integ);
  if (p.integrita !== undefined && p.integrita !== null && p.integrita !== '') return Number(p.integrita);
  return 100;
}

/* ---------------- Dati Visione Giocatore & Prezzi Modificabili ---------------- */
function getPlayerVisionBlock(p, vision = state.vision) {
  return p && p[vision] ? p[vision] : (p?.carmi || p?.tattico || {});
}

function playerPrice(p, vision = state.vision) {
  if (state.customPrices[p.id] && state.customPrices[p.id][vision] !== undefined) {
    return Number(state.customPrices[p.id][vision]);
  }
  const block = getPlayerVisionBlock(p, vision);
  if (block.price !== null && block.price !== undefined && !Number.isNaN(Number(block.price))) {
    return Number(block.price);
  }
  return 1;
}

function playerFasciaInfo(p, vision = state.vision) {
  const block = getPlayerVisionBlock(p, vision);
  const rawLabel = block.fascia || 'NON CLASSIFICATO';

  for (const f of FASCIA_DEFINITIONS) {
    if (f.vision === vision && f.match.test(rawLabel)) {
      return { ...f };
    }
  }
  return { ...DEFAULT_FASCIA, label: rawLabel.toUpperCase() };
}

/* ---------------- Prezzo d'Asta Medio Previsto (PMAA) ---------------- */
function playerPmaa(p) {
  const raw = Number(p.pmaa);
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw);
  const avg = Math.round((playerPrice(p, 'carmi') + playerPrice(p, 'tattico')) / 2);
  return Math.max(1, avg);
}

/* ---------------- Loghi Squadre Serie A ---------------- */
function teamLogoHtml(teamName, sizeClass = 'h-7 w-7') {
  const clean = normalize(teamName).replace(/[^a-z0-9]/g, '');
  const initials = String(teamName || '?').trim().slice(0, 3).toUpperCase();
  if (!clean) {
    return `<span class="${sizeClass} shrink-0 rounded-md bg-card2 border border-edge flex items-center justify-center font-display font-700 text-[9px] text-slate-400">${escapeHtml(initials)}</span>`;
  }
  return `<img src="image/${clean}.png" data-initials="${escapeHtml(initials)}"
    class="${sizeClass} shrink-0 rounded-md bg-white/5 object-contain p-0.5" loading="lazy"
    onerror="handleLogoError(this)" alt="${escapeHtml(teamName)}" />`;
}

window.handleLogoError = function(img) {
  const span = document.createElement('span');
  span.className = img.className.replace('object-contain', '').replace('bg-white/5', 'bg-card2 border border-edge') + ' flex items-center justify-center font-display font-700 text-[9px] text-slate-400';
  span.textContent = img.dataset.initials || '?';
  img.replaceWith(span);
};

/* ---------------- Medie Fascia Dinamiche ---------------- */
function computeAllFasciaMedie() {
  const medie = { carmi: {}, tattico: {} };

  ['carmi', 'tattico'].forEach((vis) => {
    const buckets = {};
    state.players.forEach((p) => {
      const fInfo = playerFasciaInfo(p, vis);
      const key = `${p.role}|${fInfo.label}`;
      if (!buckets[key]) buckets[key] = [];
      const pr = playerPrice(p, vis);
      if (pr > 0) buckets[key].push(pr);
    });

    Object.keys(buckets).forEach((k) => {
      const list = buckets[k];
      medie[vis][k] = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 1;
    });
  });

  state.fasciaMedie = medie;
}

function getFasciaAvg(role, fasciaLabel, vision = state.vision) {
  const key = `${role}|${fasciaLabel}`;
  return state.fasciaMedie[vision]?.[key] ?? '-';
}

/* ---------------- Helper Squadre & Asta ---------------- */
function isSold(playerId) { return !!state.sold[playerId]; }
function soldInfo(playerId) { return state.sold[playerId]; }
function teamById(id) { return state.teams.find((t) => t.id === id); }

function remainingSlots(team, role) {
  return ROLE_CONFIG[role].slots - (team.roster[role]?.length || 0);
}

function totalRemainingSlots(team) {
  return ROLE_ORDER.reduce((sum, r) => sum + remainingSlots(team, r), 0);
}

function totalAcquired(team) {
  return ROLE_ORDER.reduce((sum, r) => sum + (team.roster[r]?.length || 0), 0);
}

/* ============================== LOGICA SLOT STRATEGIES & ALERT SFORAMENTO ============================== */

function getActiveStrategy(role) {
  const roleStrat = state.slotStrategies[role];
  if (!roleStrat) return null;
  return roleStrat.list.find(s => s.id === roleStrat.activeId) || roleStrat.list[0] || null;
}

function evaluateSlotStrategyStatus(team, role) {
  const strat = getActiveStrategy(role);
  if (!strat) return { ok: true, alerts: [] };

  const rosterList = team.roster[role] || [];
  const paidSorted = [...rosterList].map(r => r.price).sort((a, b) => b - a);
  const plannedSlots = [...strat.slots].sort((a, b) => b - a);

  const totalPlanned = plannedSlots.reduce((a, b) => a + b, 0);
  const totalSpent = paidSorted.reduce((a, b) => a + b, 0);

  const alerts = [];

  // Confronto spesa slot per slot
  for (let i = 0; i < paidSorted.length; i++) {
    const paid = paidSorted[i];
    const target = plannedSlots[i] !== undefined ? plannedSlots[i] : 1;
    if (paid > target) {
      alerts.push({
        slotIndex: i + 1,
        paid,
        target,
        diff: paid - target,
        msg: `Slot ${i + 1} (${strat.name}): pagato 🪙${paid}cr vs target max 🪙${target}cr (+${paid - target}cr)`
      });
    }
  }

  // Sforamento totale reparto
  if (totalSpent > totalPlanned) {
    alerts.push({
      totalOver: true,
      totalSpent,
      totalPlanned,
      diff: totalSpent - totalPlanned,
      msg: `Reparto ${ROLE_CONFIG[role].label} in overbudget: spesi 🪙${totalSpent}cr su 🪙${totalPlanned}cr previsti.`
    });
  }

  return {
    strategyName: strat.name,
    totalPlanned,
    totalSpent,
    paidSorted,
    plannedSlots,
    alerts,
    isOver: alerts.length > 0
  };
}

function assignPlayer(playerId, teamId, price) {
  const player = byId.get(playerId);
  const team = teamById(teamId);
  if (!player || !team) return { ok: false, msg: 'Dati non validi.' };
  if (isSold(playerId)) return { ok: false, msg: 'Giocatore già assegnato!' };
  if (remainingSlots(team, player.role) <= 0) return { ok: false, msg: `${team.name} ha già esaurito gli slot per ${ROLE_CONFIG[player.role].label}!` };
  
  price = Math.max(1, Math.round(Number(price) || 1));
  if (price > team.budget) return { ok: false, msg: `Crediti insufficienti! ${team.name} possiede solo 🪙 ${team.budget}.` };

  team.roster[player.role].push({ id: playerId, price });
  team.budget -= price;
  state.sold[playerId] = { teamId, price };
  
  persist();

  // Controllo scostamento strategia attiva (notifica non bloccante)
  if (teamId === state.myTeamId) {
    const stratEval = evaluateSlotStrategyStatus(team, player.role);
    if (stratEval.isOver) {
      const firstAlert = stratEval.alerts[0];
      toast(`⚠️ ATTENZIONE: ${firstAlert.msg}`, 'warn');
    }
  }

  return { ok: true };
}

function unassignPlayer(playerId) {
  const info = soldInfo(playerId);
  if (!info) return;
  const player = byId.get(playerId);
  const team = teamById(info.teamId);
  if (team && player) {
    team.roster[player.role] = team.roster[player.role].filter((r) => r.id !== playerId);
    team.budget += info.price;
  }
  delete state.sold[playerId];
  persist();
  renderAll();
  toast(`${player.name} è stato svincolato. Crediti restituiti a ${team?.name}.`, 'info');
}

function toggleFavorite(playerId) {
  if (state.favorites.has(playerId)) {
    state.favorites.delete(playerId);
  } else {
    state.favorites.add(playerId);
  }
  persist();
}

function setPlayerCustomPrice(playerId, vision, newPrice) {
  if (state.pricesLocked) {
    toast("Modalità Asta attiva: sblocca i prezzi dall'interruttore in alto per modificarli.", "warn");
    return;
  }
  const val = Math.max(1, Math.round(Number(newPrice) || 1));
  if (!state.customPrices[playerId]) state.customPrices[playerId] = {};
  state.customPrices[playerId][vision] = val;
  persist();
  computeAllFasciaMedie();
}

function setPlayerNote(playerId, text) {
  state.playerNotes[playerId] = text.trim();
  if (!state.playerNotes[playerId]) delete state.playerNotes[playerId];
  persist();
}

/* ---------------- Toast & Burst FX ---------------- */
function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const palette = {
    success: { border: 'border-emerald-500/50', icon: '✅', text: 'text-emerald-300' },
    error: { border: 'border-rose-500/50', icon: '⚠️', text: 'text-rose-300' },
    warn: { border: 'border-amber-500/60', icon: '⚡', text: 'text-amber-300' },
    info: { border: 'border-violet-500/50', icon: 'ℹ️', text: 'text-violet-300' },
    star: { border: 'border-gold/60', icon: '⭐', text: 'text-goldBright' },
  }[type] || {};

  const el = document.createElement('div');
  el.className = `glass border ${palette.border} rounded-xl px-4 py-3 shadow-card animate-toastIn flex items-start gap-2.5`;
  el.innerHTML = `<span class="text-base leading-none mt-0.5">${palette.icon}</span><p class="text-xs ${palette.text} font-semibold leading-snug">${escapeHtml(message)}</p>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    setTimeout(() => el.remove(), 300);
  }, 3400);
}

function burstEffect(originEl, emoji = '🪙') {
  if (!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const layer = document.getElementById('burstLayer');
  for (let i = 0; i < 8; i++) {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.className = 'absolute text-xl animate-burst';
    span.style.left = `${rect.left + rect.width / 2 + (Math.random() * 40 - 20)}px`;
    span.style.top = `${rect.top + rect.height / 2}px`;
    span.style.animationDelay = `${Math.random() * 0.15}s`;
    layer.appendChild(span);
    setTimeout(() => span.remove(), 750);
  }
}

/* ============================== PERSISTENZA LOCALSTORAGE ============================== */

function persist() {
  try {
    const payload = {
      vision: state.vision,
      pricesLocked: state.pricesLocked,
      sold: state.sold,
      teams: state.teams,
      favorites: Array.from(state.favorites),
      myTeamId: state.myTeamId,
      budgetTargets: state.budgetTargets,
      slotStrategies: state.slotStrategies,
      formModule: state.formModule,
      accordionState: state.accordionState,
      customPrices: state.customPrices,
      playerNotes: state.playerNotes,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) { /* noop */ }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.teams && data.teams.length === TEAM_COUNT) {
      state.vision = data.vision || 'carmi';
      state.pricesLocked = data.pricesLocked !== undefined ? data.pricesLocked : true;
      state.teams = data.teams;
      state.sold = data.sold || {};
      state.favorites = new Set(data.favorites || []);
      state.myTeamId = data.myTeamId ?? 0;
      state.budgetTargets = data.budgetTargets || { ...DEFAULT_BUDGET_TARGETS };
      state.slotStrategies = data.slotStrategies || JSON.parse(JSON.stringify(DEFAULT_SLOT_STRATEGIES));
      state.formModule = data.formModule || '4-3-3';
      state.accordionState = data.accordionState || {};
      state.customPrices = data.customPrices || {};
      state.playerNotes = data.playerNotes || {};
      return true;
    }
  } catch (e) { /* noop */ }
  return false;
}

function initTeams() {
  state.teams = Array.from({ length: TEAM_COUNT }, (_, i) => ({
    id: i,
    name: i === 0 ? 'La Mia Squadra' : `Team ${i + 1}`,
    budget: STARTING_BUDGET,
    roster: { P: [], D: [], C: [], A: [] },
  }));
}

/* ============================== CARICAMENTO DATI JSON ============================== */

async function tryFetchJson(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) { /* continua con il prossimo candidato */ }
  }
  return [];
}

async function loadAllData() {
  const statusEl = document.getElementById('dataStatus');
  statusEl.textContent = 'Caricamento listini in corso…';

  const [pList, dList, cList, aList] = await Promise.all([
    tryFetchJson(DATA_CANDIDATES.P),
    tryFetchJson(DATA_CANDIDATES.D),
    tryFetchJson(DATA_CANDIDATES.C),
    tryFetchJson(DATA_CANDIDATES.A),
  ]);

  let unified = [];
  const datasets = [
    { list: pList, fallbackRole: 'P' },
    { list: dList, fallbackRole: 'D' },
    { list: cList, fallbackRole: 'C' },
    { list: aList, fallbackRole: 'A' },
  ];

  datasets.forEach(({ list, fallbackRole }) => {
    if (Array.isArray(list)) {
      list.forEach((item, idx) => {
        const role = normalizeRole(item.role || item.ruolo || fallbackRole);
        const id = item.id !== undefined ? String(item.id) : `${role}-${idx}`;
        unified.push({ ...item, id, role });
      });
    }
  });

  state.players = unified;
  byId.clear();
  unified.forEach((p) => byId.set(p.id, p));

  computeAllFasciaMedie();

  document.getElementById('statTotal').textContent = unified.length;
  statusEl.textContent = `Caricati ${unified.length} giocatori · Strategie e doppio listino attivi.`;
}

/* ============================== SWITCH CREATOR VISION & LOCK MODE ============================== */

function setVision(newVision) {
  state.vision = newVision;

  const carmiBtn = document.getElementById('visionCarmiBtn');
  const tatticoBtn = document.getElementById('visionTatticoBtn');
  if (newVision === 'carmi') {
    carmiBtn.className = 'vision-btn px-2.5 py-1 rounded-lg text-xs font-display font-800 transition-all bg-amber-500 text-slate-950 shadow-glow-carmi';
    tatticoBtn.className = 'vision-btn px-2.5 py-1 rounded-lg text-xs font-display font-700 transition-all text-slate-400 hover:text-white';
    document.getElementById('activeVisionTag').textContent = 'VISIONE: CARMI';
    document.getElementById('activeVisionTag').className = 'text-[10px] px-2 py-0.5 rounded font-display font-800 bg-amber-500/20 text-amber-300 border border-amber-500/40';
  } else {
    tatticoBtn.className = 'vision-btn px-2.5 py-1 rounded-lg text-xs font-display font-800 transition-all bg-cyan-500 text-slate-950 shadow-glow-tattico';
    carmiBtn.className = 'vision-btn px-2.5 py-1 rounded-lg text-xs font-display font-700 transition-all text-slate-400 hover:text-white';
    document.getElementById('activeVisionTag').textContent = 'VISIONE: IL TATTICO';
    document.getElementById('activeVisionTag').className = 'text-[10px] px-2 py-0.5 rounded font-display font-800 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
  }

  document.querySelectorAll('.vision-grid-btn').forEach((btn) => {
    const isTarget = btn.dataset.vision === newVision;
    btn.classList.toggle('bg-amber-500', isTarget && newVision === 'carmi');
    btn.classList.toggle('bg-cyan-500', isTarget && newVision === 'tattico');
    btn.classList.toggle('text-slate-950', isTarget);
    btn.classList.toggle('font-800', isTarget);
    btn.classList.toggle('text-slate-400', !isTarget);
  });

  persist();
  renderAll();
  if (state.currentPlayerId) renderPlayerDetail();
  toast(`Visione impostata: ${newVision === 'carmi' ? 'CARMI SPECIAL' : 'IL TATTICO / DIDDI'}`, 'info');
}

function updatePriceLockUI() {
  const icon = document.getElementById('priceLockIcon');
  const label = document.getElementById('priceLockLabel');
  const btn = document.getElementById('togglePriceLockBtn');
  if (state.pricesLocked) {
    icon.textContent = '🔒';
    label.textContent = 'Prezzi: Bloccati';
    btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all bg-card2 border-edge text-slate-300 hover:border-violet-400';
  } else {
    icon.textContent = '🔓';
    label.textContent = 'Prezzi: Modificabili';
    btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-glow-emerald';
  }
}

function togglePriceLock() {
  state.pricesLocked = !state.pricesLocked;
  persist();
  updatePriceLockUI();
  if (state.currentPlayerId) renderPlayerDetail();
  toast(state.pricesLocked ? '🔒 Prezzi e fasce BLOCCATI (Modalità Asta Live attiva)' : '🔓 Prezzi SBLOCCATI (Puoi modificare i valori personalizzati)', state.pricesLocked ? 'warn' : 'info');
}

/* ============================== SEZIONE 1: TOOL ASTA LIVE ============================== */

function searchPlayers(query) {
  const q = normalize(query);
  if (!q) return [];
  return state.players
    .filter((p) => normalize(p.name).includes(q) || normalize(p.team).includes(q))
    .sort((a, b) => playerPrice(b) - playerPrice(a))
    .slice(0, 10);
}

function renderSearchResults(query) {
  const box = document.getElementById('searchResults');
  const matches = searchPlayers(query);
  if (!matches.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }

  box.innerHTML = matches.map((p) => {
    const sold = isSold(p.id);
    const isFav = state.favorites.has(p.id);
    const hasNote = !!state.playerNotes[p.id];
    const rc = ROLE_CONFIG[p.role];
    const prCarmi = playerPrice(p, 'carmi');
    const prTattico = playerPrice(p, 'tattico');
    const titVal = playerTit(p);
    const favClasses = isFav ? 'border-l-4 border-gold bg-yellow-400/10' : 'hover:bg-violet-600/15';

    return `
      <button data-player-id="${p.id}" class="search-item w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${favClasses} ${sold ? 'opacity-50' : ''}">
        <span class="text-[10px] font-bold ${rc.text} bg-card px-1.5 py-0.5 rounded border border-edge shrink-0">${rc.short}</span>
        <span class="flex-1 min-w-0 flex items-center gap-2">
          <span class="truncate block">
            <span class="text-sm font-bold ${isFav ? 'text-goldBright font-display' : 'text-white'} truncate block">${escapeHtml(p.name)}</span>
            <span class="text-[11px] text-slate-400 truncate block">${escapeHtml(p.team)} · <b class="text-emerald-400">${titVal}% tit.</b></span>
          </span>
          ${isFav ? '<span class="text-base leading-none drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]">⭐</span>' : ''}
          ${hasNote ? '<span class="text-xs text-violet-300" title="Ha note personali">📝</span>' : ''}
        </span>
        <div class="flex items-center gap-2 font-mono text-xs shrink-0">
          <span class="text-amber-400 font-bold" title="Prezzo Carmi">🔥 🪙${prCarmi}</span>
          <span class="text-cyan-400 font-bold" title="Prezzo Tattico">👔 🪙${prTattico}</span>
        </div>
        ${sold ? '<span class="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30 shrink-0">ASSEGNATO</span>' : ''}
      </button>`;
  }).join('');
  box.classList.remove('hidden');
}

function selectPlayer(playerId, { fromGriglia = false } = {}) {
  state.currentPlayerId = playerId;
  document.getElementById('searchResults').classList.add('hidden');
  document.getElementById('searchInput').value = '';
  renderPlayerDetail();
  if (fromGriglia) {
    setActiveTab('asta');
    setTimeout(() => document.getElementById('playerDetail').scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
}

function renderPlayerDetail() {
  const wrap = document.getElementById('playerDetail');
  const empty = document.getElementById('playerEmptyState');
  const p = byId.get(state.currentPlayerId);
  if (!p) { wrap.classList.add('hidden'); empty.classList.remove('hidden'); return; }
  wrap.classList.remove('hidden');
  empty.classList.add('hidden');

  const rc = ROLE_CONFIG[p.role];
  const sold = isSold(p.id);
  const isFav = state.favorites.has(p.id);

  // Dati Carmi
  const priceCarmi = playerPrice(p, 'carmi');
  const fasciaCarmi = playerFasciaInfo(p, 'carmi');
  const avgCarmi = getFasciaAvg(p.role, fasciaCarmi.label, 'carmi');

  // Dati Tattico
  const priceTattico = playerPrice(p, 'tattico');
  const fasciaTattico = playerFasciaInfo(p, 'tattico');
  const avgTattico = getFasciaAvg(p.role, fasciaTattico.label, 'tattico');

  // Prezzo Medio d'Asta Previsto (PMAA)
  const pmaaVal = playerPmaa(p);

  // Indici di Titolarità e Integrità
  const titVal = playerTit(p);
  const integVal = playerInteg(p);

  // Note Personali
  const noteText = state.playerNotes[p.id] || '';

  const teamOptions = state.teams.map((t) => {
    const left = remainingSlots(t, p.role);
    return `<option value="${t.id}" ${left <= 0 ? 'disabled' : ''} ${t.id === state.myTeamId ? 'selected' : ''}>${escapeHtml(t.name)} ${t.id === state.myTeamId ? '(TU)' : ''} · ${left} slot ${rc.short} liberi (Budget: 🪙${t.budget})</option>`;
  }).join('');

  const readonlyAttr = state.pricesLocked ? 'readonly disabled title="Sblocca i prezzi dal pulsante in alto a destra per modificare"' : '';

  wrap.className = `glass border rounded-2xl p-5 shadow-card animate-popIn ${isFav ? 'border-gold shadow-glow-gold bg-yellow-950/15' : 'border-edge'}`;

  wrap.innerHTML = `
    <!-- Top Header Giocatore -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
      <div class="flex items-center gap-3.5">
        <div class="relative shrink-0">
          ${teamLogoHtml(p.team, 'h-16 w-16 rounded-2xl border ' + rc.border + '/50 bg-card2 p-1')}
          <span class="absolute -bottom-1 -right-1 text-[10px] font-display font-800 ${rc.text} bg-card border ${rc.border} px-1.5 py-0.5 rounded-md">${rc.short}</span>
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-display font-800 text-xl sm:text-2xl ${isFav ? 'text-goldBright drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'text-white'}">${escapeHtml(p.name)}</h3>
            <button id="favBtnDetail" class="text-2xl leading-none transition-transform hover:scale-125" title="Aggiungi/Rimuovi Preferito">${isFav ? '⭐' : '☆'}</button>
          </div>
          <p class="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
            <span>${escapeHtml(p.team)}</span> · <span class="font-semibold ${rc.text}">${rc.label}</span> · <span class="font-mono text-slate-400">Quotazione: <b>${p.quot ?? '-'}</b></span> · <span class="font-mono text-violet-bright font-bold">M.Asta PMAA: 🪙${pmaaVal}</span>
          </p>
        </div>
      </div>

      <!-- Box Fascia Ingrandito in Alto a Destra -->
      <div class="flex flex-col items-end gap-1 shrink-0">
        <span class="px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-900 bg-gradient-to-r ${state.vision === 'carmi' ? fasciaCarmi.grad : fasciaTattico.grad} ${state.vision === 'carmi' ? fasciaCarmi.text : fasciaTattico.text} ring-2 ${state.vision === 'carmi' ? fasciaCarmi.ring : fasciaTattico.ring} shadow-lg">
          ${state.vision === 'carmi' ? fasciaCarmi.label : fasciaTattico.label}
        </span>
        <span class="text-[10px] font-mono text-slate-400 font-semibold">Fascia Primaria (${state.vision.toUpperCase()})</span>
      </div>
    </div>

    ${sold ? `
      <div class="mb-4 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-between gap-2">
        <span>🔒 Assegnato a <b>${escapeHtml(teamById(soldInfo(p.id).teamId)?.name)}</b> per 🪙 <b>${soldInfo(p.id).price} crediti</b></span>
        <button id="unassignBtn" class="text-rose-200 underline underline-offset-2 hover:text-white">Svincola</button>
      </div>` : ''}

    <!-- DOPPIA VISIONE SIMULTANEA (CARMI vs TATTICO) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
      
      <!-- BOX VISIONE CARMI -->
      <div class="bg-gradient-to-br from-amber-950/50 via-card to-panel border-2 border-amber-500/60 rounded-2xl p-4 shadow-glow-carmi relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <span class="px-2.5 py-0.5 rounded-md text-[10px] font-display font-900 bg-amber-500 text-slate-950 uppercase tracking-wider">🔥 VISIONE CARMI</span>
          <span class="text-xs font-display font-bold text-amber-200">${fasciaCarmi.label}</span>
        </div>
        <div class="flex items-baseline justify-between mt-1">
          <div>
            <p class="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Prezzo Consigliato ${state.pricesLocked ? '(Bloccato 🔒)' : '(Modificabile ✏️)'}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-amber-400 font-mono font-900 text-2xl">🪙</span>
              <input type="number" min="1" step="1" value="${priceCarmi}" data-vision="carmi" ${readonlyAttr} class="custom-price-input w-20 bg-card2/90 border ${state.pricesLocked ? 'border-edge text-amber-400 opacity-90 cursor-not-allowed' : 'border-amber-500/80 text-amber-300 focus:border-amber-400'} rounded-lg px-2 py-0.5 font-mono font-900 text-2xl focus:outline-none" />
              <span class="text-xs font-normal text-slate-300">cr (${((priceCarmi / STARTING_BUDGET) * 100).toFixed(1)}%)</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-wider text-white font-bold">Media Fascia</p>
            <p class="font-mono font-bold text-base text-white">🪙 ~${avgCarmi} cr</p>
          </div>
        </div>
      </div>

      <!-- BOX VISIONE IL TATTICO -->
      <div class="bg-gradient-to-br from-cyan-950/50 via-card to-panel border-2 border-cyan-500/60 rounded-2xl p-4 shadow-glow-tattico relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <span class="px-2.5 py-0.5 rounded-md text-[10px] font-display font-900 bg-cyan-500 text-slate-950 uppercase tracking-wider">👔 VISIONE TATTICO</span>
          <span class="text-xs font-display font-bold text-cyan-200">${fasciaTattico.label}</span>
        </div>
        <div class="flex items-baseline justify-between mt-1">
          <div>
            <p class="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Prezzo Consigliato ${state.pricesLocked ? '(Bloccato 🔒)' : '(Modificabile ✏️)'}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-cyan-400 font-mono font-900 text-2xl">🪙</span>
              <input type="number" min="1" step="1" value="${priceTattico}" data-vision="tattico" ${readonlyAttr} class="custom-price-input w-20 bg-card2/90 border ${state.pricesLocked ? 'border-edge text-cyan-400 opacity-90 cursor-not-allowed' : 'border-cyan-500/80 text-cyan-300 focus:border-cyan-400'} rounded-lg px-2 py-0.5 font-mono font-900 text-2xl focus:outline-none" />
              <span class="text-xs font-normal text-slate-300">cr (${((priceTattico / STARTING_BUDGET) * 100).toFixed(1)}%)</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-[10px] uppercase tracking-wider text-white font-bold">Media Fascia</p>
            <p class="font-mono font-bold text-base text-white">🪙 ~${avgTattico} cr</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Statistiche Giocatore -->
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3 text-center">
      ${statBox('FM Exp', fmtNum(p.fmExp))}
      ${statBox('MV', fmtNum(p.mv))}
      ${statBox('FMV', fmtNum(p.fmv))}
      ${statBox('Presenze', fmtNum(p.pres))}
      ${p.role === 'P' || p.role === 'D' ? statBox('Gol Subiti', fmtNum(p.golSub)) : statBox('Gol Fatti', fmtNum(p.gol))}
      ${statBox('M.Asta PMAA', `🪙 ${pmaaVal}`)}
    </div>

    <!-- INDICI DI TITOLARITÀ E INTEGRITÀ -->
    <div class="bg-card2/70 border border-edge rounded-xl p-3 mb-4 space-y-2.5">
      <div>
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-bold text-emerald-300 flex items-center gap-1.5">
            <span>🛡️</span> Titolarità Garantita
          </span>
          <span class="font-mono font-bold text-emerald-400">${titVal}%</span>
        </div>
        <div class="h-2 rounded-full bg-base overflow-hidden">
          <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: ${titVal}%"></div>
        </div>
        <p class="text-[10px] text-slate-400 mt-1">Percentuale di affidabilità come titolare fisso nella formazione tipo.</p>
      </div>

      <div class="border-t border-edge/40 pt-2">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-bold text-cyan-300 flex items-center gap-1.5">
            <span>❤️</span> Integrità Fisica &amp; Tenuta
          </span>
          <span class="font-mono font-bold text-cyan-400">${integVal}%</span>
        </div>
        <div class="h-2 rounded-full bg-base overflow-hidden">
          <div class="h-full bg-cyan-500 rounded-full transition-all duration-500" style="width: ${integVal}%"></div>
        </div>
        <p class="text-[10px] text-slate-400 mt-1">Resistenza agli infortuni muscolari e continuità di rendimento.</p>
      </div>
    </div>

    <!-- SEZIONE NOTE PERSONALI GIOCATORE -->
    <div class="bg-panel border border-edge rounded-xl p-3 mb-4 space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-violet-bright flex items-center gap-1.5">
          <span>📝</span> Note &amp; Appunti Personali
        </label>
        <span class="text-[10px] text-slate-500 font-mono">Salvataggio automatico</span>
      </div>
      <textarea id="playerNoteInput" rows="2" placeholder="Es. Primo slot a centrocampo; rigorista designato; prendere in coppia con..."
        class="w-full bg-card border border-edge focus:border-violet rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none transition-colors">${escapeHtml(noteText)}</textarea>
    </div>

    <!-- Assegnazione Squadra & Offerta con Default Minimo FISSO A 1 CREDITO -->
    <div class="border-t border-edge pt-4">
      <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2.5 flex items-center gap-1.5">
        <span>🔨</span> Assegna a Squadra &amp; Offerta Crediti
      </p>
      
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <select id="assignTeamSelect" class="bg-card border border-edge focus:border-violet rounded-xl px-3 py-2.5 text-xs text-slate-200 ${sold ? 'opacity-50 pointer-events-none' : ''}">
          ${teamOptions}
        </select>
        <div class="flex items-center gap-1.5 bg-card border border-edge rounded-xl px-3 ${sold ? 'opacity-50 pointer-events-none' : ''}">
          <span class="text-gold text-xs">🪙</span>
          <input id="assignPriceInput" type="number" min="1" step="1" value="1" class="w-24 bg-transparent py-2.5 text-sm font-mono font-bold text-white focus:outline-none" />
          <span class="text-xs text-slate-500">cr</span>
        </div>
      </div>

      <!-- Quick Bid Buttons -->
      <div class="flex flex-wrap gap-2 mt-2.5">
        ${quickBidBtn(1, 'Base 1cr')}
        ${quickBidBtn(priceCarmi, `Carmi (${priceCarmi}cr)`)}
        ${quickBidBtn(priceTattico, `Tattico (${priceTattico}cr)`)}
        ${quickBidBtn(Math.round(priceCarmi * 1.2) || 2, '+20% 🔥')}
      </div>

      <button id="assignBtn" ${sold ? 'disabled' : ''}
        class="mt-3.5 w-full py-3 rounded-xl font-display font-800 text-xs tracking-wider transition-all ${sold
          ? 'bg-card2 text-slate-600 border border-edge cursor-not-allowed'
          : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-glow animate-pulseGlow'}">
        ${sold ? '✔ GIOCATORE GIÀ ASSEGNATO' : '🔨 CONFERMA ASSEGNAZIONE GIOCATORE (🪙)'}
      </button>
      <p id="assignError" class="hidden mt-2 text-xs text-rose-400 font-bold"></p>
    </div>
  `;

  // Eventi scheda
  document.getElementById('favBtnDetail').onclick = (e) => {
    toggleFavorite(p.id);
    if (state.favorites.has(p.id)) burstEffect(e.currentTarget, '⭐');
    renderPlayerDetail();
    renderAll();
    toast(`${p.name} ${state.favorites.has(p.id) ? 'aggiunto ai' : 'rimosso dai'} preferiti.`, 'star');
  };

  document.getElementById('playerNoteInput').oninput = (e) => {
    setPlayerNote(p.id, e.target.value);
  };

  wrap.querySelectorAll('.custom-price-input').forEach((input) => {
    input.onchange = (e) => {
      const vis = e.target.dataset.vision;
      setPlayerCustomPrice(p.id, vis, e.target.value);
      renderPlayerDetail();
      renderAll();
    };
  });

  if (sold) {
    document.getElementById('unassignBtn').onclick = () => { unassignPlayer(p.id); renderPlayerDetail(); };
  } else {
    document.getElementById('assignBtn').onclick = (e) => {
      const teamId = Number(document.getElementById('assignTeamSelect').value);
      const rawBid = document.getElementById('assignPriceInput').value;
      const bid = Math.max(1, Number(rawBid) || 1);
      const errEl = document.getElementById('assignError');

      const res = assignPlayer(p.id, teamId, bid);
      if (!res.ok) {
        errEl.textContent = res.msg;
        errEl.classList.remove('hidden');
        toast(res.msg, 'error');
        return;
      }

      errEl.classList.add('hidden');
      burstEffect(e.currentTarget, '🪙');
      toast(`${p.name} assegnato a ${teamById(teamId).name} per 🪙 ${bid} cr!`, 'success');
      renderPlayerDetail();
      renderAll();
    };
  }
}

function statBox(label, val) {
  return `
    <div class="bg-card2/80 border border-edge rounded-xl p-2">
      <p class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">${label}</p>
      <p class="font-mono font-bold text-xs text-slate-200 mt-0.5">${val}</p>
    </div>`;
}

function quickBidBtn(val, label) {
  const safeVal = Math.max(1, Number(val) || 1);
  return `<button class="quick-bid-btn px-2.5 py-1 rounded-lg bg-card2 border border-edge text-[11px] font-mono text-slate-300 hover:border-violet hover:text-white transition-colors" data-value="${safeVal}">${label}</button>`;
}

/* ---------------- Sidebar: Strategia Attiva & Alert Sforamento Live ---------------- */

function renderActiveStrategyAlertBox() {
  const box = document.getElementById('activeStrategyAlertBox');
  if (!box) return;

  const team = teamById(state.myTeamId);
  if (!team) return;

  // Analisi scostamenti su tutti i 4 reparti
  const evaluations = ROLE_ORDER.map(r => ({ role: r, ...evaluateSlotStrategyStatus(team, r) }));
  const hasAnyAlert = evaluations.some(e => e.isOver);

  box.innerHTML = `
    <div class="flex items-center justify-between">
      <p class="text-xs uppercase tracking-wider text-violet-bright font-bold flex items-center gap-1.5">
        <span>🎯</span> CONTROLLO STRATEGIE ATTIVE
      </p>
      <span class="text-[10px] font-mono text-slate-400 font-bold">${hasAnyAlert ? '⚠️ Scostamenti Rilevati' : '✅ In Linea con i Piani'}</span>
    </div>

    <!-- Quick Switcher Strategie per ogni Ruolo direttamente in Asta Live -->
    <div class="grid grid-cols-2 gap-2 text-xs font-mono">
      ${ROLE_ORDER.map(r => {
        const rc = ROLE_CONFIG[r];
        const stratGroup = state.slotStrategies[r];
        const currentStrat = getActiveStrategy(r);
        const evalObj = evaluations.find(e => e.role === r);
        const isOver = evalObj?.isOver;

        return `
          <div class="bg-card2/90 border ${isOver ? 'border-amber-500/70 shadow-glow-carmi' : 'border-edge'} rounded-xl p-2 space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold ${rc.text}">${rc.short}</span>
              <span class="${isOver ? 'text-amber-400 font-bold' : 'text-slate-400'}">🪙 ${evalObj.totalSpent}/${evalObj.totalPlanned}cr</span>
            </div>
            <select data-role-strat="${r}" class="quick-strat-select w-full bg-base border border-edge rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:border-violet">
              ${stratGroup.list.map(s => `<option value="${s.id}" ${s.id === stratGroup.activeId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>`;
      }).join('')}
    </div>

    ${hasAnyAlert ? `
      <div class="bg-amber-950/40 border border-amber-500/50 rounded-xl p-2.5 space-y-1 text-xs">
        <p class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
          <span>⚠️</span> Notifiche di Sforamento Slot:
        </p>
        <div class="space-y-1 text-[10px] font-mono text-slate-300 max-h-24 overflow-y-auto pr-1">
          ${evaluations.flatMap(e => e.alerts.map(a => `<div class="bg-card2/80 p-1.5 rounded border border-edge">• ${a.msg}</div>`)).join('')}
        </div>
      </div>` : `
      <p class="text-[10px] text-slate-400 italic">Tutti gli acquisti attuali rientrano perfettamente nei tetti di spesa pianificati.</p>
    `}
  `;

  box.querySelectorAll('.quick-strat-select').forEach(sel => {
    sel.onchange = (e) => {
      const r = e.target.dataset.roleStrat;
      state.slotStrategies[r].activeId = e.target.value;
      persist();
      renderAll();
      toast(`Strategia ${ROLE_CONFIG[r].label} cambiata in: ${getActiveStrategy(r).name}`, 'info');
    };
  });
}

/* ---------------- Sidebar: Mia Squadra & Mini Classifica ---------------- */

function renderMySquad() {
  const team = teamById(state.myTeamId);
  const panel = document.getElementById('mySquadPanel');
  if (!team || !panel) return;

  const budgetPct = clamp(((STARTING_BUDGET - team.budget) / STARTING_BUDGET) * 100, 0, 100);
  const allPurchases = ROLE_ORDER.flatMap((r) => team.roster[r].map((entry) => ({ ...entry, role: r })));

  panel.innerHTML = `
    <div class="glass border border-edge rounded-2xl p-4 shadow-card space-y-3.5">
      <div class="flex items-center justify-between gap-2">
        <input id="myTeamNameInput" value="${escapeHtml(team.name)}" class="bg-transparent font-display font-800 text-base text-white focus:outline-none focus:border-b focus:border-violet w-full" title="Rinomina la tua squadra" />
        <select id="myTeamSelect" class="text-xs bg-card2 border border-edge rounded-lg px-2 py-1 text-slate-300 shrink-0">
          ${state.teams.map((t) => `<option value="${t.id}" ${t.id === state.myTeamId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
        </select>
      </div>

      <!-- Crediti Residui -->
      <div>
        <div class="flex justify-between items-baseline mb-1">
          <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Crediti Residui</span>
          <span class="font-mono font-900 text-2xl ${team.budget < 30 ? 'text-rose-400' : 'text-gold'}">🪙 ${team.budget} <span class="text-xs text-slate-500 font-normal">/ 500</span></span>
        </div>
        <div class="h-2 rounded-full bg-card2 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500" style="width:${budgetPct}%"></div>
        </div>
      </div>

      <!-- Slot per Reparto -->
      <div class="grid grid-cols-2 gap-2">
        ${ROLE_ORDER.map((r) => {
          const rc = ROLE_CONFIG[r];
          const cur = team.roster[r].length;
          const max = rc.slots;
          const spent = team.roster[r].reduce((a, b) => a + b.price, 0);
          return `
            <div class="bg-card2/90 border ${cur >= max ? rc.border + '/50' : 'border-edge'} rounded-xl p-2">
              <div class="flex items-center justify-between text-[11px] mb-1">
                <span class="font-bold ${rc.text}">${rc.short}</span>
                <span class="font-mono text-slate-300">${cur}/${max}</span>
              </div>
              <p class="text-[10px] font-mono text-slate-400">🪙 ${spent} cr spesi</p>
            </div>`;
        }).join('')}
      </div>

      <!-- Ultimi Acquisti -->
      <div class="border-t border-edge pt-3">
        <p class="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2">Ultimi Acquisti (${allPurchases.length}/25)</p>
        ${allPurchases.length ? `
          <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            ${allPurchases.slice().reverse().map((item) => {
              const p = byId.get(item.id);
              if (!p) return '';
              const rc = ROLE_CONFIG[item.role];
              return `
                <div class="flex items-center justify-between bg-card2 border border-edge rounded-lg px-2.5 py-1.5 text-xs">
                  <div class="flex items-center gap-1.5 min-w-0">
                    ${teamLogoHtml(p.team, 'h-4 w-4 rounded')}
                    <span class="text-[9px] font-bold ${rc.text}">${rc.short}</span>
                    <span class="text-slate-200 truncate font-semibold">${escapeHtml(p.name)}</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-mono font-bold text-gold">🪙 ${item.price}cr</span>
                    <button class="svincola-btn text-slate-500 hover:text-rose-400 text-xs" data-player-id="${p.id}" title="Svincola">✕</button>
                  </div>
                </div>`;
            }).join('')}
          </div>` : '<p class="text-xs text-slate-500 italic">Nessun acquisto ancora.</p>'}
      </div>
    </div>
  `;

  document.getElementById('myTeamNameInput').onchange = (e) => {
    team.name = e.target.value.trim() || team.name;
    persist(); renderAll();
  };
  document.getElementById('myTeamSelect').onchange = (e) => {
    state.myTeamId = Number(e.target.value);
    persist(); renderAll();
  };
  panel.querySelectorAll('.svincola-btn').forEach((btn) => {
    btn.onclick = () => unassignPlayer(btn.dataset.playerId);
  });
}

function renderMiniLeaderboard() {
  const card = document.getElementById('miniLeaderboardCard');
  if (!card) return;

  const sortedTeams = [...state.teams].sort((a, b) => b.budget - a.budget);

  card.innerHTML = `
    <div class="flex items-center justify-between mb-2.5">
      <p class="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
        <span>🏆</span> CLASSIFICA CREDITI (10 SQUADRE)
      </p>
    </div>
    <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
      ${sortedTeams.map((t, idx) => {
        const acquired = totalAcquired(t);
        const missing = 25 - acquired;
        const isMine = t.id === state.myTeamId;
        return `
          <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${isMine ? 'bg-violet-950/40 border-violet-500/50' : 'bg-card2/80 border-edge'}">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-mono text-[10px] text-slate-500 w-3.5">${idx + 1}.</span>
              <span class="truncate font-semibold ${isMine ? 'text-violet-bright' : 'text-slate-200'}">${escapeHtml(t.name)} ${isMine ? '(TU)' : ''}</span>
            </div>
            <div class="flex items-center gap-2.5 shrink-0 font-mono text-[11px]">
              <span class="text-slate-400">${acquired}/25 <span class="text-[10px] text-slate-500">(${missing} manc.)</span></span>
              <span class="font-bold text-gold">🪙 ${t.budget}</span>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

/* ============================== SEZIONE 2: TABELLONE A 10 SQUADRE ============================== */

function renderTabellone() {
  const overview = document.getElementById('tabelloneOverview');
  const grid = document.getElementById('tabelloneGrid');
  if (!grid) return;

  const totalSlots = TEAM_COUNT * 25;
  const filledSlots = state.teams.reduce((s, t) => s + totalAcquired(t), 0);
  const pct = Math.round((filledSlots / totalSlots) * 100);
  const totalSpent = Object.values(state.sold).reduce((s, r) => s + r.price, 0);

  if (overview) {
    overview.innerHTML = `
      <div class="glass border border-edge rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div class="flex items-center gap-2">
          <span class="text-slate-400 font-bold">AVANZAMENTO ASTA:</span>
          <span class="text-violet-bright font-bold">${filledSlots} / ${totalSlots} slot coperti (${pct}%)</span>
        </div>
        <div class="text-slate-400">
          Totale speso: <b class="text-gold">🪙 ${totalSpent}</b> / 🪙 5000 cr
        </div>
      </div>`;
  }

  grid.innerHTML = state.teams.map((team) => {
    const isMine = team.id === state.myTeamId;
    return `
      <div class="glass border ${isMine ? 'border-violet-500 shadow-glow-sm' : 'border-edge'} rounded-2xl p-3 flex flex-col space-y-2 h-auto self-start">
        
        <!-- Header Squadra -->
        <div>
          <div class="flex items-center justify-between gap-1 mb-1">
            <input class="tabellone-name-input bg-transparent font-display font-800 text-sm text-white focus:outline-none focus:border-b focus:border-violet truncate w-full" value="${escapeHtml(team.name)}" data-team-id="${team.id}" title="Clicca per rinominare" />
            ${isMine ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-600 text-white shrink-0">TU</span>' : ''}
          </div>
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-slate-400">Residui: <b class="text-gold">🪙 ${team.budget}</b></span>
            <span class="text-slate-500">${totalAcquired(team)}/25 slot</span>
          </div>
        </div>

        <!-- Accordion Reparti Compatti a Cascata -->
        <div class="space-y-1.5 border-t border-edge/60 pt-2">
          ${ROLE_ORDER.map((r) => tabelloneRoleAccordion(team, r)).join('')}
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.tabellone-name-input').forEach((inp) => {
    inp.onchange = (e) => {
      const id = Number(e.target.dataset.teamId);
      const team = teamById(id);
      if (team) {
        team.name = e.target.value.trim() || team.name;
        persist(); renderAll();
        toast(`Squadra aggiornata in "${team.name}".`, 'info');
      }
    };
  });

  grid.querySelectorAll('.accordion-header').forEach((btn) => {
    btn.onclick = () => {
      const key = `${btn.dataset.teamId}_${btn.dataset.role}`;
      state.accordionState[key] = !state.accordionState[key];
      persist();
      renderTabellone();
    };
  });

  grid.querySelectorAll('.remove-player-btn').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      unassignPlayer(btn.dataset.playerId);
    };
  });

  document.getElementById('expandAllAccordionBtn').onclick = () => {
    state.teams.forEach((t) => ROLE_ORDER.forEach((r) => { state.accordionState[`${t.id}_${r}`] = true; }));
    persist(); renderTabellone();
  };
  document.getElementById('collapseAllAccordionBtn').onclick = () => {
    state.accordionState = {};
    persist(); renderTabellone();
  };
}

function tabelloneRoleAccordion(team, role) {
  const rc = ROLE_CONFIG[role];
  const list = team.roster[role] || [];
  const spent = list.reduce((a, b) => a + b.price, 0);
  const key = `${team.id}_${role}`;
  const isOpen = state.accordionState[key] ?? true;

  let playersHtml = '';
  for (let i = 0; i < rc.slots; i++) {
    const item = list[i];
    if (item) {
      const p = byId.get(item.id);
      playersHtml += `
        <div class="group flex items-center justify-between text-[11px] py-1 px-1.5 rounded hover:bg-card2 transition-colors">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            ${teamLogoHtml(p?.team, 'h-4 w-4 rounded shrink-0')}
            <span class="text-slate-200 truncate font-medium">${escapeHtml(p?.name || 'Sconosciuto')}</span>
          </div>
          <span class="font-mono text-gold shrink-0 ml-1.5 text-[10px]">🪙 ${item.price}cr</span>
          <button class="remove-player-btn hidden group-hover:inline ml-1 text-rose-400 hover:text-rose-200 font-bold" data-player-id="${item.id}" title="Svincola">✕</button>
        </div>`;
    } else {
      playersHtml += `<div class="text-[10px] text-slate-600 py-0.5 px-1.5 italic">— vuoto —</div>`;
    }
  }

  return `
    <div class="bg-card2/80 border border-edge rounded-xl overflow-hidden">
      <button class="accordion-header w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-card2 transition-colors" data-team-id="${team.id}" data-role="${role}">
        <span class="text-xs font-bold ${rc.text} flex items-center gap-1.5">
          <span class="text-[10px]">${isOpen ? '▼' : '▶'}</span> ${rc.label} (${list.length}/${rc.slots})
        </span>
        <span class="text-[11px] font-mono text-gold font-bold">🪙 ${spent} cr</span>
      </button>
      ${isOpen ? `<div class="px-2 py-1 border-t border-edge/40 divide-y divide-edge/30 bg-base/40">${playersHtml}</div>` : ''}
    </div>`;
}

/* ============================== SEZIONE 3: GRIGLIA FASCE COMPATTA 2 COLONNE ============================== */

function groupPlayersForGriglia() {
  const f = state.listFilters;
  let list = state.players.filter((p) => {
    if (f.role !== 'ALL' && p.role !== f.role) return false;
    if (f.onlyFav && !state.favorites.has(p.id)) return false;
    if (f.search) {
      const q = normalize(f.search);
      if (!normalize(p.name).includes(q) && !normalize(p.team).includes(q)) return false;
    }
    return true;
  });

  const sorters = {
    price_desc: (a, b) => playerPrice(b) - playerPrice(a),
    price_asc: (a, b) => playerPrice(a) - playerPrice(b),
    tit_desc: (a, b) => playerTit(b) - playerTit(a),
    tit_asc: (a, b) => playerTit(a) - playerTit(b),
    fmv_desc: (a, b) => (Number(b.fmv) || 0) - (Number(a.fmv) || 0),
    name_asc: (a, b) => a.name.localeCompare(b.name),
  };
  list.sort(sorters[f.sort] || sorters.price_desc);

  const grouped = {};
  ROLE_ORDER.forEach((r) => (grouped[r] = {}));

  list.forEach((p) => {
    const fInfo = playerFasciaInfo(p);
    const key = fInfo.label;
    if (!grouped[p.role][key]) grouped[p.role][key] = { info: fInfo, players: [] };
    grouped[p.role][key].players.push(p);
  });

  return grouped;
}

function renderListone() {
  const container = document.getElementById('listoneContainer');
  if (!container) return;

  const grouped = groupPlayersForGriglia();
  const rolesToRender = state.listFilters.role === 'ALL' ? ROLE_ORDER : [state.listFilters.role];

  let html = '';
  let totalCount = 0;

  rolesToRender.forEach((role) => {
    const rc = ROLE_CONFIG[role];
    const fascePresenti = Object.values(grouped[role]).sort((a, b) => a.info.order - b.info.order);
    if (!fascePresenti.length) return;

    html += `
      <div class="glass border border-edge rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
        
        <!-- Intestazione Reparto -->
        <div class="flex items-center justify-between border-b border-edge pb-2.5">
          <h3 class="font-display font-800 text-lg ${rc.text} flex items-center gap-2">
            <span class="w-3 h-3 rounded-full ${rc.bg}"></span> ${rc.label.toUpperCase()}
          </h3>
          <div class="flex items-center gap-2 text-xs font-mono">
            <span class="text-slate-400">Guida primaria: <b class="text-white">${state.vision.toUpperCase()}</b></span>
            <span class="text-slate-600">|</span>
            <span class="text-violet-bright">Confronto simultaneo Carmi/Tattico attivo</span>
          </div>
        </div>

        <div class="space-y-5">`;

    fascePresenti.forEach((group) => {
      totalCount += group.players.length;
      const fasciaAvg = getFasciaAvg(role, group.info.label);

      html += `
        <div>
          <!-- Badge Fascia & Media Fascia -->
          <div class="flex items-center gap-2.5 mb-2.5 flex-wrap">
            <span class="px-3.5 py-1.5 rounded-full text-xs font-display font-900 bg-gradient-to-r ${group.info.grad} ${group.info.text} ring-1 ${group.info.ring} shadow-md">
              ${group.info.label}
            </span>
            <span class="text-xs font-mono text-slate-400 font-bold">(${group.players.length} giocatori)</span>
            <span class="text-xs font-mono text-white font-bold bg-card2 border border-edge2 px-2.5 py-1 rounded-lg">
              Media Fascia: 🪙 ~${fasciaAvg} cr
            </span>
          </div>

          <!-- Griglia Ariosa e Compatta su 2 Colonne Principali -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            ${group.players.map((p) => grigliaPlayerCard(p, rc, fasciaAvg)).join('')}
          </div>
        </div>`;
    });

    html += `</div></div>`;
  });

  container.innerHTML = totalCount ? html : `
    <div class="glass border border-dashed border-edge rounded-2xl p-12 text-center text-slate-500">
      <div class="text-4xl mb-2">🕵️</div>
      <p class="font-bold text-slate-300">Nessun giocatore corrisponde ai filtri selezionati.</p>
    </div>`;

  container.querySelectorAll('.griglia-card').forEach((card) => {
    card.onclick = (e) => {
      if (e.target.closest('.star-griglia-btn')) return;
      selectPlayer(card.dataset.playerId, { fromGriglia: true });
    };
  });

  container.querySelectorAll('.star-griglia-btn').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.playerId;
      toggleFavorite(id);
      if (state.favorites.has(id)) burstEffect(btn, '⭐');
      renderListone();
      if (state.currentPlayerId === id) renderPlayerDetail();
    };
  });
}

function grigliaPlayerCard(p, rc, fasciaAvg) {
  const isFav = state.favorites.has(p.id);
  const sold = isSold(p.id);
  const info = sold ? soldInfo(p.id) : null;
  const hasNote = !!state.playerNotes[p.id];
  const titVal = playerTit(p);

  // Dati Carmi & Tattico
  const prCarmi = playerPrice(p, 'carmi');
  const fCarmi = playerFasciaInfo(p, 'carmi');

  const prTattico = playerPrice(p, 'tattico');
  const fTattico = playerFasciaInfo(p, 'tattico');

  // Calcolo Delta Differenza Prezzo
  const delta = prCarmi - prTattico;
  let diffBadge = '';
  if (Math.abs(delta) >= 3) {
    if (delta > 0) {
      diffBadge = `<span class="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Carmi valuta +${delta}cr rispetto al Tattico">Carmi +${delta}</span>`;
    } else {
      diffBadge = `<span class="text-[9px] font-mono px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" title="Tattico valuta +${Math.abs(delta)}cr rispetto a Carmi">Tattico +${Math.abs(delta)}</span>`;
    }
  }

  // Prezzo d'Asta Medio Previsto
  const pmaaVal = playerPmaa(p);

  const cardBorder = isFav
    ? 'border-gold shadow-glow-gold bg-yellow-950/20 ring-1 ring-gold'
    : 'border-edge hover:border-violet-500/60 bg-card';

  return `
    <div data-player-id="${p.id}" class="griglia-card cursor-pointer border ${cardBorder} rounded-xl px-3 py-2.5 min-h-[72px] flex items-center justify-between gap-2.5 transition-all hover:bg-card2/80 ${sold ? 'opacity-55' : ''}">
      
      <!-- Info Giocatore & Club -->
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <button class="star-griglia-btn text-lg leading-none transition-transform hover:scale-125 shrink-0 ${isFav ? 'text-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' : 'text-slate-500'}" data-player-id="${p.id}">
          ${isFav ? '⭐' : '☆'}
        </button>
        ${teamLogoHtml(p.team, 'h-8 w-8 rounded-lg shrink-0')}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <p class="text-xs sm:text-sm font-bold ${isFav ? 'text-goldBright' : 'text-white'} truncate leading-tight">${escapeHtml(p.name)}</p>
            ${hasNote ? '<span class="text-xs text-violet-300" title="Presenti note personali">📝</span>' : ''}
            ${diffBadge}
          </div>
          <p class="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
            ${escapeHtml(p.team)} · <span class="font-mono text-emerald-400 font-bold">${titVal}% tit.</span> · <span class="font-mono text-slate-300 font-semibold">FM Exp: <b>${fmtNum(p.fmExp)}</b></span> · <span class="font-mono text-slate-400">${fmtNum(p.pres)}p</span>
            ${sold ? `· <b class="text-rose-400">🔒 ${escapeHtml(teamById(info.teamId)?.name)} (🪙${info.price})</b>` : ''}
          </p>
        </div>
      </div>

      <!-- Statistiche e Box Doppia Visione -->
      <div class="hidden sm:flex items-center gap-2 text-center font-mono text-[11px] text-slate-300 shrink-0">
        
        <!-- Prezzo Medio Asta PMAA -->
        <div class="w-16 bg-card2/90 border border-edge rounded-lg px-1.5 py-1 text-center" title="Prezzo medio d'asta previsto (storico)">
          <span class="text-[8px] uppercase font-bold text-slate-400 block leading-none">M.ASTA</span>
          <span class="font-mono font-bold text-violet-bright text-xs">🪙${pmaaVal}</span>
        </div>

        <!-- Box Carmi -->
        <div class="w-28 bg-amber-950/40 border border-amber-500/50 rounded-lg px-2 py-1 flex items-center justify-between text-left shadow-sm">
          <div class="truncate">
            <span class="text-[8px] uppercase font-bold text-amber-400 block leading-none">CARMI</span>
            <span class="text-[9px] font-bold text-amber-200 truncate block mt-0.5">${fCarmi.label}</span>
          </div>
          <span class="font-mono font-900 text-amber-400 text-xs shrink-0 ml-1">🪙${prCarmi}</span>
        </div>

        <!-- Box Tattico -->
        <div class="w-28 bg-cyan-950/40 border border-cyan-500/50 rounded-lg px-2 py-1 flex items-center justify-between text-left shadow-sm">
          <div class="truncate">
            <span class="text-[8px] uppercase font-bold text-cyan-400 block leading-none">TATTICO</span>
            <span class="text-[9px] font-bold text-cyan-200 truncate block mt-0.5">${fTattico.label}</span>
          </div>
          <span class="font-mono font-900 text-cyan-400 text-xs shrink-0 ml-1">🪙${prTattico}</span>
        </div>
      </div>

      <!-- Versione Mobile Compatta -->
      <div class="sm:hidden flex flex-col items-end shrink-0 text-right font-mono text-[10px] gap-0.5">
        <span class="text-amber-400 font-bold leading-tight">🔥 🪙${prCarmi}</span>
        <span class="text-cyan-400 font-bold leading-tight">👔 🪙${prTattico}</span>
        <span class="text-emerald-400 font-bold text-[9px]">${titVal}% tit.</span>
      </div>
    </div>`;
}

/* ============================== SEZIONE 4: GESTIONE BUDGET & STRATEGIE SLOT ============================== */

function renderBudget() {
  const teamSelect = document.getElementById('budgetTeamSelect');
  if (!teamSelect.options.length) {
    if (state.budgetViewTeamId === null) state.budgetViewTeamId = state.myTeamId;
    teamSelect.innerHTML = state.teams.map((t) => `<option value="${t.id}" ${t.id === state.budgetViewTeamId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('');
  } else {
    teamSelect.value = state.budgetViewTeamId ?? state.myTeamId;
  }

  renderBudgetTargetsCard();
  renderBudgetPieBox();
  renderBudgetRealCard();
  renderStrategyAdvisor();
  renderSlotStrategyManager();
}

function renderBudgetTargetsCard() {
  const card = document.getElementById('budgetTargetsCard');
  if (!card) return;

  const totalTarget = ROLE_ORDER.reduce((a, r) => a + (state.budgetTargets[r] || 0), 0);
  const isPerfect = totalTarget === 100;

  card.innerHTML = `
    <div>
      <h3 class="font-display font-800 text-sm text-white uppercase tracking-wider flex items-center gap-2">
        <span>⚙️</span> Ripartizione Teorica Macro
      </h3>
      <p class="text-xs text-slate-400 mt-1">Trascina il cursore o digita la percentuale numerica da tastiera.</p>
    </div>

    <div class="space-y-4 pt-2">
      ${ROLE_ORDER.map((r) => {
        const rc = ROLE_CONFIG[r];
        const pct = state.budgetTargets[r] || 0;
        const cr = Math.round((STARTING_BUDGET * pct) / 100);
        return `
          <div class="budget-row flex items-center gap-3">
            <span class="w-10 font-display font-800 text-xs ${rc.text}">${rc.short}</span>
            <input type="range" min="0" max="100" value="${pct}" data-role="${r}" class="budget-slider flex-1 accent-violet-500 cursor-pointer" />
            <div class="flex items-center gap-1 w-16 justify-end">
              <input type="number" min="0" max="100" value="${pct}" data-role="${r}" class="budget-num-input w-12 bg-card2 border border-edge rounded px-1.5 py-0.5 text-right font-mono text-xs font-bold text-white focus:border-violet" />
              <span class="text-xs text-slate-400 font-mono">%</span>
            </div>
            <span class="w-16 font-mono text-xs text-gold font-bold text-right">🪙 ${cr}cr</span>
          </div>`;
      }).join('')}
    </div>

    <div class="border-t border-edge pt-3 flex items-center justify-between text-xs font-mono">
      <span class="text-slate-400">Somma Percentuali:</span>
      <span class="font-bold ${isPerfect ? 'text-emerald-400' : 'text-rose-400'}">${totalTarget}% ${isPerfect ? '✅ 100% OK' : '(deve fare 100%)'}</span>
    </div>
  `;

  card.querySelectorAll('.budget-slider, .budget-num-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const role = e.target.dataset.role;
      let val = clamp(Number(e.target.value) || 0, 0, 100);
      state.budgetTargets[role] = val;
      persist();
      renderBudget();
    });
  });
}

function renderBudgetPieBox() {
  const box = document.getElementById('budgetPieBox');
  if (!box) return;

  const pPct = state.budgetTargets.P || 0;
  const dPct = state.budgetTargets.D || 0;
  const cPct = state.budgetTargets.C || 0;
  const aPct = state.budgetTargets.A || 0;

  const slices = [
    { role: 'P', label: 'POR', pct: pPct, color: ROLE_CONFIG.P.hex },
    { role: 'D', label: 'DIF', pct: dPct, color: ROLE_CONFIG.D.hex },
    { role: 'C', label: 'CEN', pct: cPct, color: ROLE_CONFIG.C.hex },
    { role: 'A', label: 'ATT', pct: aPct, color: ROLE_CONFIG.A.hex },
  ];

  let cumulativeAngle = 0;
  const svgElements = [];
  const radius = 80;
  const cx = 110;
  const cy = 110;

  slices.forEach((s) => {
    if (s.pct <= 0) return;
    const sliceAngle = (s.pct / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const x1 = cx + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = cy + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = cx + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y2 = cy + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const midAngle = startAngle + sliceAngle / 2;
    const textRadius = radius * 0.65;
    const tx = cx + textRadius * Math.cos((Math.PI * (midAngle - 90)) / 180);
    const ty = cy + textRadius * Math.sin((Math.PI * (midAngle - 90)) / 180);

    svgElements.push(`
      <path d="${d}" fill="${s.color}" class="cursor-pointer hover:opacity-85 transition-opacity" data-role="${s.role}" />
      <text x="${tx}" y="${ty + 4}" fill="#000000" font-weight="900" font-size="11px" font-family="'JetBrains Mono', monospace" text-anchor="middle" pointer-events="none">${s.pct}%</text>
    `);
  });

  box.innerHTML = `
    <div>
      <h3 class="font-display font-800 text-sm text-white uppercase tracking-wider flex items-center gap-2">
        <span>📊</span> Grafico a Torta Budget
      </h3>
      <p class="text-xs text-slate-400 mt-1">Percentuali stampate sopra gli spicchi</p>
    </div>

    <div class="my-3 flex flex-col items-center justify-center">
      <svg width="220" height="220" viewBox="0 0 220 220" class="drop-shadow-lg">
        ${svgElements.join('')}
        <circle cx="${cx}" cy="${cy}" r="34" fill="#140b28" stroke="#29184d" stroke-width="2" />
        <text x="${cx}" y="${cy - 3}" fill="#94a3b8" font-size="8px" font-family="'Orbitron', sans-serif" text-anchor="middle" font-weight="bold">BUDGET</text>
        <text x="${cx}" y="${cy + 11}" fill="#facc15" font-size="11px" font-family="'JetBrains Mono', monospace" text-anchor="middle" font-weight="bold">500cr</text>
      </svg>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs font-mono border-t border-edge pt-3">
      ${ROLE_ORDER.map((r) => {
        const rc = ROLE_CONFIG[r];
        const pct = state.budgetTargets[r] || 0;
        return `
          <div class="flex items-center justify-between bg-card2/80 border border-edge rounded-lg p-2">
            <span class="flex items-center gap-1.5 text-slate-300 font-bold">
              <span class="w-3 h-3 rounded" style="background: ${rc.hex};"></span>
              ${rc.label}
            </span>
            <span class="font-bold text-white">${pct}%</span>
          </div>`;
      }).join('')}
    </div>
  `;
}

function renderBudgetRealCard() {
  const card = document.getElementById('budgetRealCard');
  if (!card) return;

  const team = teamById(state.budgetViewTeamId ?? state.myTeamId);
  if (!team) return;

  card.innerHTML = `
    <h3 class="font-display font-800 text-sm text-white uppercase tracking-wider mb-3 flex items-center gap-2">
      <span>🪙</span> Spesa Reale vs Target · ${escapeHtml(team.name)}
    </h3>
    <div class="space-y-3">
      ${ROLE_ORDER.map((r) => {
        const rc = ROLE_CONFIG[r];
        const targetPct = state.budgetTargets[r] || 0;
        const targetCr = Math.round((STARTING_BUDGET * targetPct) / 100);
        const spentCr = team.roster[r].reduce((a, b) => a + b.price, 0);
        const ratio = targetCr > 0 ? spentCr / targetCr : 0;
        const isOver = spentCr > targetCr;

        return `
          <div class="bg-card2/80 border border-edge rounded-xl p-2.5 space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold ${rc.text}">${rc.label}</span>
              <span class="font-mono ${isOver ? 'text-rose-400 font-bold' : 'text-slate-300'}">
                Spesi: 🪙 ${spentCr} / ${targetCr} cr (${((spentCr / STARTING_BUDGET) * 100).toFixed(1)}%)
              </span>
            </div>
            <div class="h-2 rounded-full bg-base overflow-hidden">
              <div class="h-full ${isOver ? 'bg-rose-500' : rc.bg} rounded-full transition-all duration-500" style="width: ${clamp(ratio * 100, 0, 100)}%"></div>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

function renderStrategyAdvisor() {
  const box = document.getElementById('strategyAdvisorBox');
  if (!box) return;

  const team = teamById(state.budgetViewTeamId ?? state.myTeamId);
  if (!team) return;

  const tips = [];
  ROLE_ORDER.forEach(r => {
    const evalObj = evaluateSlotStrategyStatus(team, r);
    if (evalObj.isOver) {
      evalObj.alerts.forEach(a => tips.push(`⚠️ <b>${ROLE_CONFIG[r].label}</b>: ${a.msg}`));
    }
  });

  if (!tips.length) {
    tips.push(`✅ <b>Strategie Rispettate</b>: Tutti gli acquisti attuali sono in perfetto allineamento con i tetti di spesa degli slot pianificati.`);
  }

  box.innerHTML = `
    <p class="text-xs uppercase tracking-wider text-violet-bright font-bold flex items-center gap-1.5 mb-2">
      <span>🤖</span> ADVISOR STRATEGICO REALTIME
    </p>
    <div class="space-y-2 text-xs text-slate-200 leading-relaxed">
      ${tips.map((t) => `<div class="bg-panel border border-edge rounded-lg p-2">${t}</div>`).join('')}
    </div>
  `;
}

/* ---------------- GESTIONE COMPLETA STRATEGIE SLOT (TAB BUDGET) ---------------- */

function renderSlotStrategyManager() {
  const container = document.getElementById('slotStrategyManagerContent');
  if (!container) return;

  const role = state.activeStrategyRoleView;
  const rc = ROLE_CONFIG[role];
  const roleStrat = state.slotStrategies[role];
  const activeStrat = getActiveStrategy(role);
  const team = teamById(state.budgetViewTeamId ?? state.myTeamId);

  // Valutazione scostamenti
  const evalObj = evaluateSlotStrategyStatus(team, role);
  const totalSlotsCr = activeStrat.slots.reduce((a, b) => a + b, 0);
  const totalSlotsPct = ((totalSlotsCr / STARTING_BUDGET) * 100).toFixed(1);

  // Lista acquisti effettivi del reparto (ordinati decrescenti)
  const paidList = [...(team.roster[role] || [])].sort((a, b) => b.price - a.price);

  container.innerHTML = `
    <div class="bg-card2/70 border border-edge rounded-2xl p-4 sm:p-5 space-y-4">
      
      <!-- Barra Selezione Strategia + Azioni (Crea, Rinomina, Cancella) -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-panel p-3.5 rounded-xl border border-edge">
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <span class="text-xs font-bold text-slate-300 shrink-0">Strategia Attiva ${rc.short}:</span>
          <select id="strategySelectDropdown" class="bg-card border border-edge2 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:border-violet flex-1 max-w-xs truncate">
            ${roleStrat.list.map(s => `<option value="${s.id}" ${s.id === activeStrat.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
          </select>
          <input id="renameStrategyInput" type="text" value="${escapeHtml(activeStrat.name)}" class="bg-card border border-edge rounded-lg px-2.5 py-1 text-xs text-slate-200 font-bold focus:border-violet hidden sm:block w-48" title="Rinomina strategia" />
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button id="saveRenameStratBtn" class="px-2.5 py-1.5 rounded-lg bg-card border border-edge hover:border-violet text-xs font-bold text-slate-300">💾 Salva Nome</button>
          <button id="addNewStratBtn" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-glow">➕ Nuova Strategia</button>
          ${roleStrat.list.length > 1 ? `<button id="deleteStratBtn" class="px-2.5 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-bold">🗑️</button>` : ''}
        </div>
      </div>

      <!-- Sommario Totale Budget Strategia -->
      <div class="flex items-center justify-between text-xs font-mono bg-card p-3 rounded-xl border border-edge flex-wrap gap-2">
        <span class="text-slate-300">Budget Pianificato (${activeStrat.name}): <b class="text-gold">🪙 ${totalSlotsCr} cr</b> (${totalSlotsPct}% dei 500cr)</span>
        <span class="text-slate-300">Spesa Reale Attuale: <b class="${evalObj.totalSpent > totalSlotsCr ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}">🪙 ${evalObj.totalSpent} cr</b></span>
      </div>

      <!-- Griglia Input Budget per Singolo Slot -->
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">Allocazione Tetti di Spesa per Slot (${rc.slots} Giocatori):</p>
        
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          ${activeStrat.slots.map((slotBudget, idx) => {
            const paidItem = paidList[idx] || null;
            const paidCr = paidItem ? paidItem.price : 0;
            const pObj = paidItem ? byId.get(paidItem.id) : null;
            const isOver = paidCr > slotBudget;

            return `
              <div class="bg-panel border ${isOver ? 'border-rose-500/80 shadow-glow-carmi' : (paidItem ? 'border-emerald-500/60' : 'border-edge')} rounded-xl p-2.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between text-[11px] font-mono">
                    <span class="font-bold text-slate-400">Slot ${idx + 1}</span>
                    <span class="text-[10px] ${isOver ? 'text-rose-400 font-bold' : (paidItem ? 'text-emerald-400 font-bold' : 'text-slate-500')}">
                      ${paidItem ? `🪙${paidCr}cr` : 'Libero'}
                    </span>
                  </div>
                  
                  ${paidItem ? `
                    <p class="text-[10px] text-slate-200 font-bold truncate mt-0.5" title="${escapeHtml(pObj?.name)}">
                      ${escapeHtml(pObj?.name || 'Acquistato')}
                    </p>
                  ` : `<p class="text-[10px] text-slate-600 italic mt-0.5">— vuoto —</p>`}
                </div>

                <div>
                  <label class="text-[9px] uppercase font-mono text-slate-500 block leading-tight">Target Slot:</label>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span class="text-gold text-xs">🪙</span>
                    <input type="number" min="1" step="1" value="${slotBudget}" data-slot-idx="${idx}" class="slot-budget-input w-full bg-card2 border border-edge rounded px-1.5 py-0.5 text-xs font-mono font-bold text-white focus:border-violet" />
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Tabella comparativa Scostamenti Slot -->
      ${evalObj.isOver ? `
        <div class="bg-rose-950/30 border border-rose-500/50 rounded-2xl p-3.5 space-y-1 text-xs">
          <p class="font-bold text-rose-300 flex items-center gap-1.5">
            <span>🚨</span> Rilevati Sforamenti rispetto alla Strategia "${activeStrat.name}":
          </p>
          <div class="space-y-1 text-[11px] font-mono text-slate-200">
            ${evalObj.alerts.map(a => `<div>• ${a.msg}</div>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Eventi Gestore Slot Strategy
  document.querySelectorAll('.strat-role-btn').forEach(btn => {
    btn.onclick = () => {
      state.activeStrategyRoleView = btn.dataset.stratRole;
      document.querySelectorAll('.strat-role-btn').forEach(b => {
        b.className = 'strat-role-btn px-3 py-1 rounded-lg text-xs font-display font-800 text-slate-400 hover:text-white';
      });
      btn.className = `strat-role-btn px-3 py-1 rounded-lg text-xs font-display font-800 bg-${ROLE_CONFIG[state.activeStrategyRoleView].hex} text-slate-950`;
      renderSlotStrategyManager();
    };
  });

  const stratSelect = document.getElementById('strategySelectDropdown');
  if (stratSelect) {
    stratSelect.onchange = (e) => {
      roleStrat.activeId = e.target.value;
      persist();
      renderAll();
      toast(`Strategia ${rc.label} cambiata in "${getActiveStrategy(role).name}".`, 'info');
    };
  }

  // Modifica Tetto Slot
  container.querySelectorAll('.slot-budget-input').forEach(inp => {
    inp.onchange = (e) => {
      const idx = Number(e.target.dataset.slotIdx);
      const val = Math.max(1, Number(e.target.value) || 1);
      activeStrat.slots[idx] = val;
      persist();
      renderAll();
    };
  });

  // Salva Rinomina
  const renameBtn = document.getElementById('saveRenameStratBtn');
  if (renameBtn) {
    renameBtn.onclick = () => {
      const newName = document.getElementById('renameStrategyInput').value.trim();
      if (newName) {
        activeStrat.name = newName;
        persist();
        renderAll();
        toast(`Strategia rinominata in "${newName}".`, 'info');
      }
    };
  }

  // Aggiungi Nuova Strategia
  const addBtn = document.getElementById('addNewStratBtn');
  if (addBtn) {
    addBtn.onclick = () => {
      const name = prompt(`Inserisci il nome della nuova strategia per ${rc.label}:`, `${rc.label} Piano B`);
      if (name && name.trim()) {
        const newId = `strat_${Date.now()}`;
        const newSlots = Array.from({ length: rc.slots }, () => 1);
        roleStrat.list.push({ id: newId, name: name.trim(), slots: newSlots });
        roleStrat.activeId = newId;
        persist();
        renderAll();
        toast(`Nuova strategia "${name.trim()}" creata con successo!`, 'success');
      }
    };
  }

  // Elimina Strategia
  const delBtn = document.getElementById('deleteStratBtn');
  if (delBtn) {
    delBtn.onclick = () => {
      if (confirm(`Sei sicuro di voler eliminare la strategia "${activeStrat.name}"?`)) {
        roleStrat.list = roleStrat.list.filter(s => s.id !== activeStrat.id);
        roleStrat.activeId = roleStrat.list[0].id;
        persist();
        renderAll();
        toast(`Strategia eliminata.`, 'info');
      }
    };
  }
}

/* ============================== SEZIONE 5: GENERATORE 11 TITOLARE ============================== */

function buildLineup(team, modulo) {
  const pick = (role, count) => {
    const players = (team.roster[role] || []).map((entry) => byId.get(entry.id)).filter(Boolean);
    return players
      .map((p) => {
        const fm = Number(p.fmExp) || Number(p.fmv) || 6;
        const tit = playerTit(p);
        const score = (fm * 0.6) + ((tit / 100) * 10 * 0.4);
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((x) => x.p);
  };

  return {
    gk: pick('P', 1),
    def: pick('D', modulo.D),
    mid: pick('C', modulo.C),
    att: pick('A', modulo.A),
  };
}

function renderFormazione() {
  const teamSelect = document.getElementById('formTeamSelect');
  if (!teamSelect.options.length) {
    if (state.formTeamId === null) state.formTeamId = state.myTeamId;
    teamSelect.innerHTML = state.teams.map((t) => `<option value="${t.id}" ${t.id === state.formTeamId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('');
  } else {
    teamSelect.value = state.formTeamId ?? state.myTeamId;
  }

  const moduleSelect = document.getElementById('formModuleSelect');
  if (!moduleSelect.options.length) {
    moduleSelect.innerHTML = Object.keys(FORMATIONS).map((k) => `<option value="${k}" ${k === state.formModule ? 'selected' : ''}>${k}</option>`).join('');
  } else {
    moduleSelect.value = state.formModule;
  }

  const team = teamById(state.formTeamId ?? state.myTeamId);
  const modulo = FORMATIONS[state.formModule] || FORMATIONS['4-3-3'];
  const lineup = buildLineup(team, modulo);

  const rows = [
    { role: 'A', players: lineup.att, count: modulo.A, y: 16 },
    { role: 'C', players: lineup.mid, count: modulo.C, y: 42 },
    { role: 'D', players: lineup.def, count: modulo.D, y: 68 },
    { role: 'P', players: lineup.gk, count: 1, y: 88 },
  ];

  let pitchHtml = '';
  rows.forEach((row) => {
    for (let i = 0; i < row.count; i++) {
      const p = row.players[i] || null;
      const x = ((i + 1) / (row.count + 1)) * 100;
      pitchHtml += pitchPlayerPin(p, row.role, x, row.y);
    }
  });

  document.getElementById('pitchContainer').innerHTML = `
    <div class="relative w-full aspect-[3/4] max-w-xl mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-card"
      style="background: radial-gradient(ellipse at 50% 30%, #0d3b26 0%, #082116 65%, #040d09 100%);">
      <div class="absolute inset-4 border-2 border-emerald-400/20 rounded-2xl"></div>
      <div class="absolute left-1/2 top-4 bottom-4 w-px bg-emerald-400/20"></div>
      <div class="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/20"></div>
      <div class="absolute left-1/2 top-4 w-40 h-16 -translate-x-1/2 border-2 border-t-0 border-emerald-400/20"></div>
      <div class="absolute left-1/2 bottom-4 w-40 h-16 -translate-x-1/2 border-2 border-b-0 border-emerald-400/20"></div>
      ${pitchHtml}
    </div>`;

  const starters = [...lineup.gk, ...lineup.def, ...lineup.mid, ...lineup.att];
  const avgFm = starters.length
    ? starters.reduce((s, p) => s + (Number(p.fmExp) || Number(p.fmv) || 6), 0) / starters.length
    : 0;

  let verdict = { label: 'Rosa Incompleta', color: 'text-slate-400' };
  if (starters.length === 11) {
    if (avgFm >= 7.0) verdict = { label: '🔥 FORMAZIONE DA SCUDETTO', color: 'text-emerald-400 font-bold' };
    else if (avgFm >= 6.4) verdict = { label: '💪 FORMAZIONE MOLTO COMPETITIVA', color: 'text-yellow-400 font-bold' };
    else verdict = { label: '⚙️ FORMAZIONE DA RINFORZARE', color: 'text-rose-400 font-bold' };
  }

  const startersIds = new Set(starters.map((p) => p.id));
  const bench = ROLE_ORDER.flatMap((r) => (team.roster[r] || []).map((e) => byId.get(e.id)).filter((p) => p && !startersIds.has(p.id)));

  document.getElementById('formazioneSummary').innerHTML = `
    <div class="glass border border-edge rounded-2xl p-4 text-center space-y-1.5 shadow-card">
      <p class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Voto Stimato 11 Titolare</p>
      <p class="font-mono font-900 text-4xl text-violet-bright">${avgFm ? avgFm.toFixed(2) : '-'}</p>
      <p class="text-xs ${verdict.color}">${verdict.label}</p>
      <p class="text-[11px] text-slate-500">Modulo: <b>${state.formModule}</b> · Squadra: <b>${escapeHtml(team.name)}</b></p>
    </div>

    <div class="glass border border-edge rounded-2xl p-4 shadow-card">
      <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center justify-between">
        <span>Panchina &amp; Riserve</span>
        <span class="font-mono text-slate-500">${bench.length} giocatori</span>
      </p>
      ${bench.length ? `
        <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          ${bench.map((p) => `
            <div class="flex items-center justify-between bg-card2 border border-edge rounded-lg px-2.5 py-1 text-xs">
              <span class="font-medium text-slate-200 truncate">${escapeHtml(p.name)}</span>
              <span class="text-[9px] font-bold ${ROLE_CONFIG[p.role].text}">${ROLE_CONFIG[p.role].short}</span>
            </div>`).join('')}
        </div>` : '<p class="text-xs text-slate-500 italic">Nessun giocatore in panchina.</p>'}
    </div>
  `;
}

function pitchPlayerPin(p, role, x, y) {
  const rc = ROLE_CONFIG[role];
  if (!p) {
    return `
      <div class="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2" style="left:${x}%; top:${y}%;">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-emerald-400/30 bg-black/40 flex items-center justify-center text-slate-500 text-xs">?</div>
        <span class="text-[8px] text-slate-500 bg-base/70 px-1 rounded">Slot</span>
      </div>`;
  }

  const fm = p.fmExp || p.fmv || 6;
  return `
    <div class="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2" style="left:${x}%; top:${y}%;">
      <div class="relative">
        ${teamLogoHtml(p.team, 'w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ' + rc.border + ' bg-card p-0.5 shadow-md')}
        <span class="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold ${rc.text} bg-card border ${rc.border} px-1 rounded">${fmtNum(fm)}</span>
      </div>
      <span class="text-[9px] sm:text-[10px] font-bold text-white bg-base/80 border border-edge px-1.5 py-0.5 rounded truncate max-w-[70px] sm:max-w-[85px] text-center">
        ${escapeHtml(p.name)}
      </span>
    </div>`;
}

/* ============================== RENDER GLOBALE & NAVIGAZIONE ============================== */

function setActiveTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach((el) => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`)?.classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const isAct = btn.dataset.tab === tab;
    btn.classList.toggle('active-tab', isAct);
    btn.classList.toggle('bg-violet-600', isAct);
    btn.classList.toggle('text-white', isAct);
    btn.classList.toggle('shadow-glow-sm', isAct);
    btn.classList.toggle('text-slate-400', !isAct);
  });

  if (tab === 'asta') { renderMySquad(); renderActiveStrategyAlertBox(); renderMiniLeaderboard(); }
  if (tab === 'tabellone') renderTabellone();
  if (tab === 'griglia') renderListone();
  if (tab === 'budget') renderBudget();
  if (tab === 'formazione') renderFormazione();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderGlobalStats() {
  const assigned = Object.keys(state.sold).length;
  const spent = Object.values(state.sold).reduce((s, r) => s + r.price, 0);
  document.getElementById('statAssigned').textContent = assigned;
  document.getElementById('statCreditsSpent').textContent = spent;
}

function renderAll() {
  computeAllFasciaMedie();
  renderGlobalStats();
  if (state.activeTab === 'asta') { renderMySquad(); renderActiveStrategyAlertBox(); renderMiniLeaderboard(); }
  if (state.activeTab === 'tabellone') renderTabellone();
  if (state.activeTab === 'griglia') renderListone();
  if (state.activeTab === 'budget') renderBudget();
  if (state.activeTab === 'formazione') renderFormazione();
}

/* ============================== EVENT LISTENERS ============================== */

function setupEvents() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  // Switch Visione
  document.getElementById('visionCarmiBtn').addEventListener('click', () => setVision('carmi'));
  document.getElementById('visionTatticoBtn').addEventListener('click', () => setVision('tattico'));

  document.querySelectorAll('.vision-grid-btn').forEach((btn) => {
    btn.addEventListener('click', () => setVision(btn.dataset.vision));
  });

  // Switch Blocco/Sblocco Prezzi Asta Live
  document.getElementById('togglePriceLockBtn').addEventListener('click', togglePriceLock);

  // Search Tool Asta
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));
  searchInput.addEventListener('focus', (e) => { if (e.target.value) renderSearchResults(e.target.value); });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchResults') && !e.target.closest('#searchInput')) {
      document.getElementById('searchResults').classList.add('hidden');
    }
  });

  document.getElementById('searchResults').addEventListener('click', (e) => {
    const item = e.target.closest('.search-item');
    if (item) selectPlayer(item.dataset.playerId);
  });

  document.getElementById('playerDetail').addEventListener('click', (e) => {
    const quick = e.target.closest('.quick-bid-btn');
    if (quick) {
      document.getElementById('assignPriceInput').value = Math.max(1, Number(quick.dataset.value) || 1);
    }
  });

  // Griglia Filtri & Ricerca
  document.getElementById('listSearch').addEventListener('input', (e) => {
    state.listFilters.search = e.target.value;
    renderListone();
  });
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.listFilters.sort = e.target.value;
    renderListone();
  });
  document.getElementById('favToggle').addEventListener('click', () => {
    state.listFilters.onlyFav = !state.listFilters.onlyFav;
    document.getElementById('favToggle').classList.toggle('border-gold', state.listFilters.onlyFav);
    document.getElementById('favToggle').classList.toggle('text-gold', state.listFilters.onlyFav);
    document.getElementById('favToggleIcon').textContent = state.listFilters.onlyFav ? '⭐' : '☆';
    renderListone();
  });

  document.querySelectorAll('.role-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.listFilters.role = btn.dataset.roleFilter;
      document.querySelectorAll('.role-filter-btn').forEach((b) => {
        b.classList.remove('active-filter', 'bg-violet-600', 'text-white', 'border-violet-600');
        b.classList.add('border-edge');
      });
      btn.classList.add('active-filter', 'bg-violet-600', 'text-white', 'border-violet-600');
      renderListone();
    });
  });

  document.getElementById('budgetTeamSelect').addEventListener('change', (e) => {
    state.budgetViewTeamId = Number(e.target.value);
    renderBudgetRealCard();
    renderStrategyAdvisor();
    renderSlotStrategyManager();
  });

  document.getElementById('formTeamSelect').addEventListener('change', (e) => {
    state.formTeamId = Number(e.target.value);
    renderFormazione();
  });
  document.getElementById('formModuleSelect').addEventListener('change', (e) => {
    state.formModule = e.target.value;
    persist();
    renderFormazione();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.griglia-link')) {
      setActiveTab('griglia');
    }
  });

  // Reset Prezzi Modificati
  document.getElementById('resetCustomPricesBtn').addEventListener('click', () => {
    if (confirm('Vuoi ripristinare tutti i prezzi modificati ai valori originali del listino?')) {
      state.customPrices = {};
      persist();
      computeAllFasciaMedie();
      renderAll();
      if (state.currentPlayerId) renderPlayerDetail();
      toast('Prezzi originali dei listini ripristinati!', 'info');
    }
  });

  // Reset Totale Asta
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Vuoi davvero azzerare l\'intera asta (acquisti, prezzi modificati e rose)?')) {
      localStorage.removeItem(STORAGE_KEY);
      initTeams();
      state.sold = {};
      state.favorites = new Set();
      state.currentPlayerId = null;
      state.budgetTargets = { ...DEFAULT_BUDGET_TARGETS };
      state.slotStrategies = JSON.parse(JSON.stringify(DEFAULT_SLOT_STRATEGIES));
      state.customPrices = {};
      state.playerNotes = {};
      persist();
      renderAll();
      renderPlayerDetail();
      toast('Asta azzerata con successo!', 'info');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      setActiveTab('asta');
      setTimeout(() => document.getElementById('searchInput')?.focus(), 50);
    }
    if (e.key === 'Escape') {
      document.getElementById('searchResults')?.classList.add('hidden');
    }
  });
}

/* ============================== AVVIO ============================== */

async function init() {
  const restored = restore();
  if (!restored) initTeams();

  setupEvents();
  updatePriceLockUI();
  await loadAllData();

  if (state.vision === 'tattico') {
    document.getElementById('visionTatticoBtn')?.click();
  }

  renderAll();
}

init();
