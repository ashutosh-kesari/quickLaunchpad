// LaunchPad – script.js | Created by Ashutosh Kesari

// ============================================================
// LaunchPad – script.js
// Personal Web Dashboard · v1.0
// All data stored in localStorage
// ============================================================

'use strict';

/* ================================================
   STATE & PERSISTENCE
   ================================================ */

const DB_KEY = 'launchpad_v1';

let state = {
  sites: [],
  folders: ['Work', 'Social', 'AI Tools', 'Shopping'],
  settings: {
    theme: 'light',
    wallpaper: 'none',
    searchEngine: 'https://www.google.com/search?q=',
    customWallpaperUrl: '',
  },
  widgets: {
    notes: '',
    tasks: [],
    pomodoroSessions: 0,
    weather: null,
  },
  pomodoro: {
    phase: 'focus',
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    running: false,
    sessions: 0,
  }
};

// App state (not persisted)
let currentFolder = 'all';
let showHidden = false;
let sortByVisits = false;
let editingId = null;
let dragSrcId = null;
let pomodoroInterval = null;
let pwaInstallPrompt = null;

/* ================================================
   INIT
   ================================================ */

function init() {
  loadState();
  applyTheme();
  applyWallpaper();
  renderFolderNav();
  renderSiteGrid();
  startClock();
  initSearch();
  initWidgets();
  initModals();
  initKeyboard();
  initPWA();
  loadQuote();
  renderAnalytics();
  syncSettingsUI();
}

/* ================================================
   LOAD / SAVE
   ================================================ */

function loadState() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = deepMerge(state, parsed);
    } else {
      state.sites = defaultSites();
    }
  } catch (e) {
    console.warn('LaunchPad: failed to load state', e);
    state.sites = defaultSites();
  }
}

function saveState() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('LaunchPad: failed to save state', e);
  }
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultSites() {
  const sites = [
    { name: 'Google',    url: 'https://google.com',            folder: '',          shortcut: 'G', pinned: false },
    { name: 'YouTube',   url: 'https://youtube.com',           folder: 'Social',    shortcut: 'Y', pinned: false },
    { name: 'GitHub',    url: 'https://github.com',            folder: 'Work',      shortcut: 'H', pinned: false },
    { name: 'ChatGPT',   url: 'https://chat.openai.com',       folder: 'AI Tools',  shortcut: 'C', pinned: true  },
    { name: 'Claude',    url: 'https://claude.ai',             folder: 'AI Tools',  shortcut: '',  pinned: false },
    { name: 'Gemini',    url: 'https://gemini.google.com',     folder: 'AI Tools',  shortcut: '',  pinned: false },
    { name: 'Twitter',   url: 'https://twitter.com',           folder: 'Social',    shortcut: 'T', pinned: false },
    { name: 'Reddit',    url: 'https://reddit.com',            folder: 'Social',    shortcut: 'R', pinned: false },
    { name: 'LinkedIn',  url: 'https://linkedin.com',          folder: 'Work',      shortcut: 'L', pinned: false },
    { name: 'Notion',    url: 'https://notion.so',             folder: 'Work',      shortcut: 'N', pinned: false },
    { name: 'Gmail',     url: 'https://mail.google.com',       folder: 'Work',      shortcut: 'M', pinned: false },
    { name: 'Calendar',  url: 'https://calendar.google.com',   folder: 'Work',      shortcut: '',  pinned: false },
    { name: 'Amazon',    url: 'https://amazon.com',            folder: 'Shopping',  shortcut: 'A', pinned: false },
    { name: 'Spotify',   url: 'https://open.spotify.com',      folder: 'Social',    shortcut: 'S', pinned: false },
    { name: 'Wikipedia', url: 'https://wikipedia.org',         folder: '',          shortcut: 'W', pinned: false },
    { name: 'Drive',     url: 'https://drive.google.com',      folder: 'Work',      shortcut: 'D', pinned: false },
  ];
  return sites.map(s => ({ id: uid(), visits: 0, hidden: false, customIcon: null, ...s }));
}

/* ================================================
   THEME
   ================================================ */

function applyTheme(theme) {
  if (theme) state.settings.theme = theme;
  document.body.className = 'theme-' + state.settings.theme;
  document.querySelectorAll('.theme-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === state.settings.theme)
  );
  saveState();
}

/* ================================================
   WALLPAPER
   ================================================ */

function applyWallpaper(wp) {
  if (wp !== undefined) state.settings.wallpaper = wp;
  if (state.settings.wallpaper !== 'custom') {
    document.body.style.background = '';
  }
  document.body.dataset.wallpaper = state.settings.wallpaper;
  document.querySelectorAll('.wallpaper-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.wp === state.settings.wallpaper)
  );
  saveState();
}

function applyCustomWallpaper() {
  const url = document.getElementById('customWallpaperUrl').value.trim();
  if (!url) { toast('Enter a valid URL'); return; }
  state.settings.customWallpaperUrl = url;
  state.settings.wallpaper = 'custom';
  document.body.dataset.wallpaper = 'custom';
  document.body.style.background =
    `linear-gradient(rgba(15,15,15,0.82), rgba(15,15,15,0.82)), url(${url}) center/cover fixed`;
  document.querySelectorAll('.wallpaper-btn').forEach(b => b.classList.remove('active'));
  saveState();
  toast('Background applied!');
}

/* ================================================
   FOLDER NAV
   ================================================ */

function renderFolderNav() {
  const nav = document.getElementById('folderNav');
  const addBtn = document.getElementById('addFolderBtn');

  // Remove previously rendered dynamic tabs
  nav.querySelectorAll('.folder-tab.dyn').forEach(t => t.remove());

  const folders = [...new Set(state.folders)];
  folders.forEach(folder => {
    const btn = document.createElement('button');
    btn.className = 'folder-tab dyn';
    btn.dataset.folder = folder;
    btn.innerHTML = `${folder} <span class="folder-del-x" title="Delete folder">✕</span>`;
    btn.addEventListener('click', e => {
      if (e.target.classList.contains('folder-del-x')) {
        deleteFolder(folder);
        return;
      }
      setFolder(folder);
    });
    nav.insertBefore(btn, addBtn);
  });

  // Update active state on ALL tabs
  nav.querySelectorAll('.folder-tab').forEach(tab =>
    tab.classList.toggle('active', tab.dataset.folder === currentFolder)
  );
}

function setFolder(folder) {
  currentFolder = folder;
  renderFolderNav();
  renderSiteGrid();
}

function deleteFolder(folder) {
  state.sites.forEach(s => { if (s.folder === folder) s.folder = ''; });
  state.folders = state.folders.filter(f => f !== folder);
  if (currentFolder === folder) currentFolder = 'all';
  saveState();
  renderFolderNav();
  renderSiteGrid();
  toast(`"${folder}" folder deleted`);
}

/* ================================================
   SITE GRID
   ================================================ */

function renderSiteGrid() {
  const grid = document.getElementById('siteGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  let sites = [...state.sites];

  // Filter by folder
  if (currentFolder === 'pinned') {
    sites = sites.filter(s => s.pinned);
  } else if (currentFolder !== 'all') {
    sites = sites.filter(s => s.folder === currentFolder);
  }

  // Filter hidden
  if (!showHidden) {
    sites = sites.filter(s => !s.hidden);
  }

  // Sort
  if (sortByVisits) {
    sites = sites.sort((a, b) => (b.visits || 0) - (a.visits || 0));
  } else {
    // Pinned always first
    sites = [...sites.filter(s => s.pinned), ...sites.filter(s => !s.pinned)];
  }

  if (!sites.length) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  sites.forEach((site, i) => {
    const card = createSiteCard(site, i);
    grid.appendChild(card);
  });
}

function createSiteCard(site, index) {
  const card = document.createElement('div');
  card.className = 'site-card';
  card.dataset.id = site.id;
  card.tabIndex = 0;
  card.draggable = true;
  card.style.animationDelay = `${Math.min(index * 0.035, 0.4)}s`;

  if (site.pinned) card.classList.add('pinned');
  if (site.hidden) card.classList.add('hidden-card');

  // Shortcut badge
  if (site.shortcut) {
    const badge = document.createElement('span');
    badge.className = 'site-shortcut';
    badge.textContent = site.shortcut.toUpperCase();
    card.appendChild(badge);
  }

  // Favicon
  const img = document.createElement('img');
  img.className = 'site-favicon';
  img.alt = '';
  img.loading = 'lazy';
  img.src = site.customIcon || `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(site.url)}`;

  const fallback = document.createElement('span');
  fallback.className = 'site-favicon-fallback';
  fallback.textContent = site.name.charAt(0).toUpperCase();

  img.onerror = () => {
    img.style.display = 'none';
    fallback.style.display = 'flex';
  };

  card.appendChild(img);
  card.appendChild(fallback);

  // Name
  const nameEl = document.createElement('span');
  nameEl.className = 'site-name';
  nameEl.textContent = site.name;
  card.appendChild(nameEl);

  // Visit count
  if (site.visits > 0) {
    const visits = document.createElement('span');
    visits.className = 'site-visits';
    visits.textContent = site.visits + ' visits';
    card.appendChild(visits);
  }

  // Actions (shown on hover)
  const actions = document.createElement('div');
  actions.className = 'site-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'site-action-btn';
  editBtn.title = 'Edit';
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', e => { e.stopPropagation(); openEditModal(site.id); });

  const delBtn = document.createElement('button');
  delBtn.className = 'site-action-btn del';
  delBtn.title = 'Delete';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', e => { e.stopPropagation(); deleteSite(site.id); });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  card.appendChild(actions);

  // Events
  card.addEventListener('click', () => launchSite(site, card));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launchSite(site, card); }
  });

  // Drag & drop
  card.addEventListener('dragstart', e => {
    dragSrcId = site.id;
    setTimeout(() => card.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });
  card.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    card.classList.add('drag-over');
  });
  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
  card.addEventListener('drop', e => {
    e.preventDefault();
    card.classList.remove('drag-over');
    if (dragSrcId && dragSrcId !== site.id) {
      reorderSites(dragSrcId, site.id);
    }
  });

  return card;
}

function launchSite(site, cardEl) {
  // Ripple effect
  const rect = cardEl.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'card-launch-ripple';
  ripple.style.left = (rect.left + rect.width / 2) + 'px';
  ripple.style.top  = (rect.top  + rect.height / 2) + 'px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);

  // Track visit
  const found = state.sites.find(s => s.id === site.id);
  if (found) found.visits = (found.visits || 0) + 1;
  saveState();
  renderAnalytics();

  setTimeout(() => window.open(site.url, '_blank'), 80);
}

function getDomain(url) {
  try { return new URL(url).hostname; }
  catch { return url; }
}

function reorderSites(srcId, targetId) {
  const si = state.sites.findIndex(s => s.id === srcId);
  const ti = state.sites.findIndex(s => s.id === targetId);
  if (si === -1 || ti === -1) return;
  const [item] = state.sites.splice(si, 1);
  state.sites.splice(ti, 0, item);
  saveState();
  renderSiteGrid();
}

/* ================================================
   ADD SITE
   ================================================ */

function openAddModal() {
  ['newSiteName','newSiteUrl','newSiteShortcut'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('newSiteIcon').value = '';
  document.getElementById('newSiteIconPreview').textContent = '';
  populateFolderSelect('newSiteFolder', '');
  openModal('addSiteModal');
  document.getElementById('newSiteName').focus();
}

function confirmAddSite() {
  const name = document.getElementById('newSiteName').value.trim();
  let url = document.getElementById('newSiteUrl').value.trim();
  const folder = document.getElementById('newSiteFolder').value;
  const shortcut = document.getElementById('newSiteShortcut').value.trim().toUpperCase().slice(0, 1);

  if (!name)  { toast('Please enter a site name'); return; }
  if (!url)   { toast('Please enter a URL'); return; }
  if (!url.match(/^https?:\/\//)) url = 'https://' + url;

  const iconInput = document.getElementById('newSiteIcon');
  const finish = customIcon => {
    const site = { id: uid(), name, url, folder, shortcut, pinned: false, hidden: false, visits: 0, customIcon: customIcon || null };
    state.sites.push(site);
    saveState();
    closeModal('addSiteModal');
    renderSiteGrid();
    renderAnalytics();
    toast(`"${name}" added!`);
  };

  if (iconInput.files && iconInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => finish(e.target.result);
    reader.readAsDataURL(iconInput.files[0]);
  } else {
    finish(null);
  }
}

function deleteSite(id) {
  const site = state.sites.find(s => s.id === id);
  state.sites = state.sites.filter(s => s.id !== id);
  saveState();
  renderSiteGrid();
  renderAnalytics();
  toast(`"${site?.name || 'Site'}" removed`);
}

/* ================================================
   EDIT SITE
   ================================================ */

function openEditModal(id) {
  editingId = id;
  const site = state.sites.find(s => s.id === id);
  if (!site) return;

  document.getElementById('editSiteName').value    = site.name;
  document.getElementById('editSiteUrl').value     = site.url;
  document.getElementById('editSiteShortcut').value = site.shortcut || '';
  document.getElementById('editSitePinned').checked = site.pinned;
  document.getElementById('editSiteHidden').checked = site.hidden;
  document.getElementById('editSiteIcon').value    = '';
  document.getElementById('editSiteIconPreview').textContent = site.customIcon ? '🖼' : '';
  populateFolderSelect('editSiteFolder', site.folder);
  openModal('editSiteModal');
}

function confirmEditSite() {
  const site = state.sites.find(s => s.id === editingId);
  if (!site) return;

  let url = document.getElementById('editSiteUrl').value.trim();
  if (!url.match(/^https?:\/\//)) url = 'https://' + url;

  site.name     = document.getElementById('editSiteName').value.trim() || site.name;
  site.url      = url;
  site.folder   = document.getElementById('editSiteFolder').value;
  site.shortcut = document.getElementById('editSiteShortcut').value.trim().toUpperCase().slice(0, 1);
  site.pinned   = document.getElementById('editSitePinned').checked;
  site.hidden   = document.getElementById('editSiteHidden').checked;

  const iconInput = document.getElementById('editSiteIcon');
  const finish = customIcon => {
    if (customIcon) site.customIcon = customIcon;
    saveState();
    closeModal('editSiteModal');
    renderSiteGrid();
    toast('Site updated');
  };

  if (iconInput.files && iconInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => finish(e.target.result);
    reader.readAsDataURL(iconInput.files[0]);
  } else {
    finish(null);
  }
}

/* ================================================
   FOLDER MANAGEMENT
   ================================================ */

function populateFolderSelect(selectId, selected) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">— None —</option>';
  state.folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    if (f === selected) opt.selected = true;
    sel.appendChild(opt);
  });
}

function confirmAddFolder() {
  const name = document.getElementById('newFolderName').value.trim();
  if (!name) { toast('Enter a folder name'); return; }
  if (state.folders.includes(name)) { toast('Folder already exists'); return; }
  state.folders.push(name);
  saveState();
  closeModal('addFolderModal');
  renderFolderNav();
  toast(`"${name}" folder created`);
}

/* ================================================
   SEARCH
   ================================================ */

const QUICK_COMMANDS = {
  '/gh':  'https://github.com',
  '/yt':  'https://youtube.com',
  '/gm':  'https://mail.google.com',
  '/gc':  'https://calendar.google.com',
  '/tw':  'https://twitter.com',
  '/rd':  'https://reddit.com',
  '/nt':  'https://notion.so',
  '/ai':  'https://claude.ai',
  '/am':  'https://amazon.com',
  '/li':  'https://linkedin.com',
  '/sp':  'https://open.spotify.com',
  '/wp':  'https://wikipedia.org',
};

function initSearch() {
  const input = document.getElementById('searchInput');
  const hint  = document.getElementById('searchHint');

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (val.startsWith('/')) hint.textContent = QUICK_COMMANDS[val.toLowerCase()] ? '→ ' + QUICK_COMMANDS[val.toLowerCase()] : 'Quick command';
    else if (val) hint.textContent = 'Enter to search';
    else hint.textContent = '';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      handleSearch(val);
      input.value = '';
      hint.textContent = '';
    }
    if (e.key === 'Escape') {
      input.value = '';
      hint.textContent = '';
      input.blur();
    }
  });
}

function handleSearch(query) {
  const cmd = QUICK_COMMANDS[query.toLowerCase()];
  if (cmd) { window.open(cmd, '_blank'); return; }

  // Site shortcut letter match
  const shortcutSite = state.sites.find(s => s.shortcut && s.shortcut.toUpperCase() === query.toUpperCase() && query.length === 1);
  if (shortcutSite) {
    const card = document.querySelector(`[data-id="${shortcutSite.id}"]`);
    launchSite(shortcutSite, card || document.body);
    return;
  }

  const engine = state.settings.searchEngine || 'https://www.google.com/search?q=';
  window.open(engine + encodeURIComponent(query), '_blank');
}

/* ================================================
   KEYBOARD SHORTCUTS
   ================================================ */

function initKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Focus search
    if (e.key === '/' || e.key === 'f') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
      return;
    }

    // Focus mode
    if (e.key === 'F' || e.key === 'Escape' && document.getElementById('focusOverlay').classList.contains('open')) {
      if (e.key === 'F') toggleFocusMode();
      if (e.key === 'Escape') {
        if (document.getElementById('focusOverlay').classList.contains('open')) {
          toggleFocusMode();
          return;
        }
        closePanels();
      }
      return;
    }

    if (e.key === 'Escape') { closePanels(); return; }

    // Arrow key navigation
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      navigateCards(e.key);
      return;
    }

    // Site keyboard shortcuts (single letters)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const key = e.key.toUpperCase();
      const site = state.sites.find(s => s.shortcut && s.shortcut.toUpperCase() === key);
      if (site) {
        e.preventDefault();
        const card = document.querySelector(`[data-id="${site.id}"]`);
        launchSite(site, card || document.body);
      }
    }
  });
}

function navigateCards(dir) {
  const cards = [...document.querySelectorAll('.site-card')];
  if (!cards.length) return;
  const focused = document.activeElement;
  let idx = cards.indexOf(focused);
  if (idx === -1) { cards[0].focus(); return; }
  const cols = window.innerWidth > 1100 ? 6 : window.innerWidth > 680 ? 4 : 3;
  if (dir === 'ArrowRight') idx = Math.min(idx + 1, cards.length - 1);
  if (dir === 'ArrowLeft')  idx = Math.max(idx - 1, 0);
  if (dir === 'ArrowDown')  idx = Math.min(idx + cols, cards.length - 1);
  if (dir === 'ArrowUp')    idx = Math.max(idx - cols, 0);
  cards[idx]?.focus();
}

function renderShortcutsList() {
  const container = document.getElementById('shortcutsList');
  container.innerHTML = '';

  const userShortcuts = state.sites.filter(s => s.shortcut);

  if (!userShortcuts.length) {
    container.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">No shortcuts set. Edit any site to assign a letter key.</p>';
  } else {
    userShortcuts.forEach(s => {
      const row = document.createElement('div');
      row.className = 'shortcut-item';
      row.innerHTML = `<span>${s.name}</span><span class="shortcut-key">${s.shortcut}</span>`;
      container.appendChild(row);
    });
  }

  // Built-in commands
  const builtins = [
    { name: 'Focus search', key: '/' },
    { name: 'GitHub', key: '/gh' },
    { name: 'YouTube', key: '/yt' },
    { name: 'Gmail', key: '/gm' },
    { name: 'Claude AI', key: '/ai' },
    { name: 'Focus Mode', key: 'F' },
    { name: 'Navigate cards', key: '↑↓←→' },
    { name: 'Close / Clear', key: 'Esc' },
  ];

  const hdr = document.createElement('p');
  hdr.style.cssText = 'font-size:10.5px;color:var(--text-muted);margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.9px;font-weight:700;';
  hdr.textContent = 'Built-in Commands';
  container.appendChild(hdr);

  builtins.forEach(b => {
    const row = document.createElement('div');
    row.className = 'shortcut-item';
    row.innerHTML = `<span>${b.name}</span><span class="shortcut-key">${b.key}</span>`;
    container.appendChild(row);
  });
}

/* ================================================
   CLOCK
   ================================================ */

function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timeStr  = `${hh}:${mm}`;
  const fullTime = `${hh}:${mm}:${ss}`;
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const mini = document.getElementById('clockMini');
  if (mini) mini.textContent = timeStr;

  const wTime = document.getElementById('widgetTime');
  const wDate = document.getElementById('widgetDate');
  if (wTime) wTime.textContent = fullTime;
  if (wDate) wDate.textContent = dateStr;

  const fClock = document.getElementById('focusClock');
  const fDate  = document.getElementById('focusDate');
  if (fClock) fClock.textContent = timeStr;
  if (fDate)  fDate.textContent  = dateStr;
}

/* ================================================
   WIDGETS INIT
   ================================================ */

function initWidgets() {
  // Notes persistence
  const notesEl = document.getElementById('notesArea');
  notesEl.value = state.widgets.notes || '';
  notesEl.addEventListener('input', () => {
    state.widgets.notes = notesEl.value;
    saveState();
  });

  // Tasks
  renderTasks();
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  // Pomodoro
  initPomodoro();

  // Quote
  loadQuote();
  document.getElementById('quoteRefresh').addEventListener('click', loadQuote);

  // Weather
  document.getElementById('getWeatherBtn').addEventListener('click', fetchWeather);
  document.getElementById('weatherRefresh').addEventListener('click', fetchWeather);

  // Restore cached weather
  if (state.widgets.weather) renderWeather(state.widgets.weather);
}

/* ================================================
   TASKS
   ================================================ */

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';

  const tasks = state.widgets.tasks || [];
  const done  = tasks.filter(t => t.done).length;
  document.getElementById('taskCount').textContent = `${done}/${tasks.length}`;

  tasks.forEach((task, i) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = task.done;
    check.addEventListener('change', () => {
      state.widgets.tasks[i].done = check.checked;
      saveState();
      renderTasks();
    });

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const del = document.createElement('button');
    del.className = 'task-del-btn';
    del.textContent = '✕';
    del.title = 'Remove';
    del.addEventListener('click', () => {
      state.widgets.tasks.splice(i, 1);
      saveState();
      renderTasks();
    });

    li.append(check, text, del);
    list.appendChild(li);
  });
}

function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) return;
  if (!state.widgets.tasks) state.widgets.tasks = [];
  state.widgets.tasks.push({ text, done: false });
  input.value = '';
  saveState();
  renderTasks();
}

/* ================================================
   POMODORO
   ================================================ */

const PHASES = {
  focus: { label: 'Focus',        duration: 25 * 60, next: 'short' },
  short: { label: 'Short Break',  duration:  5 * 60, next: 'focus' },
  long:  { label: 'Long Break',   duration: 15 * 60, next: 'focus' },
};

function initPomodoro() {
  state.pomodoro.sessions = state.pomodoro.sessions || 0;
  updatePomodoroUI();

  document.getElementById('pomodoroStart').addEventListener('click', togglePomodoro);
  document.getElementById('pomodoroReset').addEventListener('click', resetPomodoro);
  document.getElementById('pomodoroSkip').addEventListener('click',  skipPhase);
  document.getElementById('focusPomoStart').addEventListener('click', togglePomodoro);
  document.getElementById('focusPomoReset').addEventListener('click', resetPomodoro);
}

function togglePomodoro() {
  if (state.pomodoro.running) {
    clearInterval(pomodoroInterval);
    state.pomodoro.running = false;
    setBtn('▶');
  } else {
    state.pomodoro.running = true;
    setBtn('⏸');
    pomodoroInterval = setInterval(() => {
      state.pomodoro.timeLeft--;
      updatePomodoroUI();
      if (state.pomodoro.timeLeft <= 0) completePhase();
    }, 1000);
  }
}

function setBtn(label) {
  document.getElementById('pomodoroStart').textContent   = label;
  document.getElementById('focusPomoStart').textContent  = label;
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  state.pomodoro.running = false;
  state.pomodoro.phase = 'focus';
  state.pomodoro.timeLeft = PHASES.focus.duration;
  state.pomodoro.totalTime = PHASES.focus.duration;
  setBtn('▶');
  updatePomodoroUI();
}

function skipPhase() {
  clearInterval(pomodoroInterval);
  state.pomodoro.running = false;
  setBtn('▶');
  completePhase();
}

function completePhase() {
  clearInterval(pomodoroInterval);
  state.pomodoro.running = false;
  setBtn('▶');

  const current = state.pomodoro.phase;

  if (current === 'focus') {
    state.pomodoro.sessions++;
    state.widgets.pomodoroSessions = state.pomodoro.sessions;
    // Every 4 focus sessions → long break
    const nextPhase = state.pomodoro.sessions % 4 === 0 ? 'long' : 'short';
    state.pomodoro.phase = nextPhase;
    toast(nextPhase === 'long' ? '🎉 Long break! 15 min' : '☕ Short break! 5 min');
  } else {
    state.pomodoro.phase = 'focus';
    toast('🎯 Focus time! 25 min');
  }

  state.pomodoro.timeLeft = PHASES[state.pomodoro.phase].duration;
  state.pomodoro.totalTime = PHASES[state.pomodoro.phase].duration;
  saveState();
  updatePomodoroUI();

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification('LaunchPad Pomodoro', {
      body: PHASES[state.pomodoro.phase].label + ' session starting!',
      icon: 'icons/icon-192.png'
    });
  }
}

function updatePomodoroUI() {
  const mm = String(Math.floor(state.pomodoro.timeLeft / 60)).padStart(2, '0');
  const ss = String(state.pomodoro.timeLeft % 60).padStart(2, '0');
  const timeStr = `${mm}:${ss}`;
  const pct = (state.pomodoro.timeLeft / (state.pomodoro.totalTime || 1)) * 100;
  const label = PHASES[state.pomodoro.phase]?.label || 'Focus';

  document.getElementById('pomodoroDisplay').textContent   = timeStr;
  document.getElementById('focusPomoDisplay').textContent  = timeStr;
  document.getElementById('pomodoroPhase').textContent     = label;
  document.getElementById('focusPomoLabel').textContent    = label;
  document.getElementById('pomodoroSessions').textContent  = `Sessions: ${state.pomodoro.sessions}`;
  document.getElementById('pomodoroProgressFill').style.width = pct + '%';

  // Tab title
  document.title = state.pomodoro.running ? `${timeStr} · LaunchPad` : 'LaunchPad';
}

/* ================================================
   WEATHER (Open-Meteo – no API key required)
   ================================================ */

async function fetchWeather() {
  const content = document.getElementById('weatherContent');
  content.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Detecting location…</span>';

  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: false })
    );
    const { latitude: lat, longitude: lon } = pos.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature&forecast_days=1&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('API error');
    const data = await resp.json();

    const weather = {
      temp:       Math.round(data.current_weather.temperature),
      windspeed:  Math.round(data.current_weather.windspeed),
      code:       data.current_weather.weathercode,
      humidity:   data.hourly?.relativehumidity_2m?.[0] ?? '--',
      feelsLike:  Math.round(data.hourly?.apparent_temperature?.[0] ?? data.current_weather.temperature),
    };

    state.widgets.weather = weather;
    saveState();
    renderWeather(weather);
  } catch (err) {
    content.innerHTML = `<span style="font-size:12px;color:var(--text-muted)">
      Could not get location.<br/>
      <button class="btn-secondary small" id="weatherRetryBtn" style="margin-top:8px">↻ Retry</button>
    </span>`;
    document.getElementById('weatherRetryBtn')?.addEventListener('click', fetchWeather);
  }
}

function weatherIcon(code) {
  if (code === 0)         return '☀️';
  if (code <= 3)          return '⛅';
  if (code <= 49)         return '🌫️';
  if (code <= 67)         return '🌧️';
  if (code <= 77)         return '❄️';
  if (code <= 82)         return '🌦️';
  if (code <= 99)         return '⛈️';
  return '🌡️';
}

function weatherDesc(code) {
  if (code === 0)         return 'Clear sky';
  if (code <= 3)          return 'Partly cloudy';
  if (code <= 49)         return 'Foggy';
  if (code <= 67)         return 'Rainy';
  if (code <= 77)         return 'Snowy';
  if (code <= 82)         return 'Showers';
  if (code <= 99)         return 'Thunderstorm';
  return 'Unknown';
}

function renderWeather(w) {
  const icon = weatherIcon(w.code);
  document.getElementById('weatherContent').innerHTML = `
    <div class="weather-main">
      <span style="font-size:34px;line-height:1">${icon}</span>
      <div>
        <div class="weather-temp">${w.temp}°C</div>
        <div class="weather-desc">${weatherDesc(w.code)}</div>
      </div>
    </div>
    <div class="weather-details">
      <span>💧 Humidity: ${w.humidity}%</span>
      <span>💨 Wind: ${w.windspeed} km/h</span>
      <span>🌡 Feels like: ${w.feelsLike}°C</span>
    </div>
  `;
}

/* ================================================
   QUOTES
   ================================================ */

const QUOTES = [
  { text: "Simplicity is the ultimate sophistication.",                          author: "Leonardo da Vinci" },
  { text: "The secret of getting ahead is getting started.",                     author: "Mark Twain" },
  { text: "Do what you can, with what you have, where you are.",                 author: "Theodore Roosevelt" },
  { text: "The only way to do great work is to love what you do.",               author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.",                  author: "Albert Einstein" },
  { text: "Focus on being productive instead of busy.",                           author: "Tim Ferriss" },
  { text: "Energy and persistence conquer all things.",                           author: "Benjamin Franklin" },
  { text: "It does not matter how slowly you go as long as you do not stop.",    author: "Confucius" },
  { text: "Don't watch the clock; do what it does. Keep going.",                 author: "Sam Levenson" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Work smarter, not harder.",                                            author: "Allan F. Mogensen" },
  { text: "The best preparation for tomorrow is doing your best today.",          author: "H. Jackson Brown Jr." },
  { text: "Small steps every day lead to massive results over time.",             author: "Unknown" },
  { text: "An investment in knowledge pays the best interest.",                   author: "Benjamin Franklin" },
  { text: "You are never too old to set another goal or dream a new dream.",      author: "C.S. Lewis" },
];

function loadQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('quoteText').textContent   = `"${q.text}"`;
  document.getElementById('quoteAuthor').textContent = `— ${q.author}`;
}

/* ================================================
   ANALYTICS
   ================================================ */

function renderAnalytics() {
  const content = document.getElementById('analyticsContent');
  const top = [...state.sites]
    .filter(s => (s.visits || 0) > 0)
    .sort((a, b) => (b.visits || 0) - (a.visits || 0))
    .slice(0, 12);

  if (!top.length) {
    content.innerHTML = '<p style="font-size:12px;color:var(--text-muted);line-height:1.6">No visits tracked yet.<br>Click any site to start tracking.</p>';
    return;
  }

  const max = top[0].visits;
  content.innerHTML = top.map((s, i) => `
    <div class="analytics-item">
      <span class="analytics-rank">#${i + 1}</span>
      <img class="analytics-favicon" src="https://www.google.com/s2/favicons?sz=32&domain=${getDomain(s.url)}" alt="" />
      <span class="analytics-name">${s.name}</span>
      <span class="analytics-count">${s.visits}</span>
    </div>
    <div class="analytics-bar" style="width:${Math.round((s.visits / max) * 100)}%"></div>
  `).join('');
}

/* ================================================
   FOCUS MODE
   ================================================ */

function toggleFocusMode() {
  const overlay = document.getElementById('focusOverlay');
  overlay.classList.toggle('open');

  if (overlay.classList.contains('open') && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/* ================================================
   IMPORT / EXPORT
   ================================================ */

function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sites: state.sites,
    folders: state.folders,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `launchpad-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Data exported successfully!');
}

function triggerImport() {
  document.getElementById('importFile').click();
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data.sites)) throw new Error('Invalid format');
      state.sites   = data.sites;
      if (Array.isArray(data.folders)) state.folders = data.folders;
      saveState();
      renderFolderNav();
      renderSiteGrid();
      renderAnalytics();
      toast(`Imported ${data.sites.length} sites!`);
    } catch {
      toast('Invalid backup file');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Clear all LaunchPad data? This cannot be undone.')) return;
  localStorage.removeItem(DB_KEY);
  location.reload();
}

/* ================================================
   PWA
   ================================================ */

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('LaunchPad SW registered'))
      .catch(err => console.warn('LaunchPad SW error', err));
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    pwaInstallPrompt = e;
    document.getElementById('installPwaBtn').style.display = 'inline-block';
  });

  window.addEventListener('appinstalled', () => {
    pwaInstallPrompt = null;
    toast('App installed!');
  });
}

/* ================================================
   MODALS & PANELS
   ================================================ */

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function closePanels() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  document.getElementById('widgetPanel').classList.remove('open');
  document.getElementById('analyticsPanel').classList.remove('open');
}

function syncSettingsUI() {
  const sel = document.getElementById('searchEngine');
  if (sel) sel.value = state.settings.searchEngine || 'https://www.google.com/search?q=';

  const wp = document.getElementById('customWallpaperUrl');
  if (wp) wp.value = state.settings.customWallpaperUrl || '';

  // Re-apply theme + wallpaper visuals
  applyTheme();
  applyWallpaper();

  if (state.settings.wallpaper === 'custom' && state.settings.customWallpaperUrl) {
    document.body.style.background =
      `linear-gradient(rgba(15,15,15,0.82), rgba(15,15,15,0.82)), url(${state.settings.customWallpaperUrl}) center/cover fixed`;
  }
}

function initModals() {
  // Overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Close buttons
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });

  // ---- Add site ----
  document.getElementById('addSiteBtn').addEventListener('click', openAddModal);
  document.getElementById('emptyAddBtn').addEventListener('click', openAddModal);
  document.getElementById('confirmAddSite').addEventListener('click', confirmAddSite);
  // Icon preview
  document.getElementById('newSiteIcon').addEventListener('change', e => {
    document.getElementById('newSiteIconPreview').textContent = e.target.files[0] ? '🖼' : '';
  });

  // ---- Edit site ----
  document.getElementById('confirmEditSite').addEventListener('click', confirmEditSite);
  document.getElementById('editSiteIcon').addEventListener('change', e => {
    document.getElementById('editSiteIconPreview').textContent = e.target.files[0] ? '🖼' : '';
  });

  // ---- Add folder ----
  document.getElementById('addFolderBtn').addEventListener('click', () => {
    document.getElementById('newFolderName').value = '';
    openModal('addFolderModal');
    document.getElementById('newFolderName').focus();
  });
  document.getElementById('confirmAddFolder').addEventListener('click', confirmAddFolder);
  document.getElementById('newFolderName').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAddFolder();
  });

  // ---- Settings ----
  document.getElementById('settingsBtn').addEventListener('click', () => {
    renderShortcutsList();
    openModal('settingsModal');
  });

  // Theme
  document.querySelectorAll('.theme-btn').forEach(btn =>
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme))
  );

  // Wallpaper
  document.querySelectorAll('.wallpaper-btn').forEach(btn =>
    btn.addEventListener('click', () => applyWallpaper(btn.dataset.wp))
  );
  document.getElementById('applyCustomWp').addEventListener('click', applyCustomWallpaper);

  // Search engine
  document.getElementById('searchEngine').addEventListener('change', e => {
    state.settings.searchEngine = e.target.value;
    saveState();
  });

  // Import/Export
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', triggerImport);
  document.getElementById('importFile').addEventListener('change', e => importData(e.target.files[0]));
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

  // PWA install
  document.getElementById('installPwaBtn').addEventListener('click', () => {
    if (pwaInstallPrompt) {
      pwaInstallPrompt.prompt();
      pwaInstallPrompt.userChoice.then(result => {
        if (result.outcome === 'accepted') toast('App installing…');
        pwaInstallPrompt = null;
        document.getElementById('installPwaBtn').style.display = 'none';
      });
    }
  });

  // ---- Focus mode ----
  document.getElementById('focusModeBtn').addEventListener('click', toggleFocusMode);
  document.getElementById('focusClose').addEventListener('click', toggleFocusMode);

  // ---- Analytics panel ----
  document.getElementById('analyticsBtn').addEventListener('click', () => {
    document.getElementById('analyticsPanel').classList.toggle('open');
    document.getElementById('widgetPanel').classList.remove('open');
  });
  document.getElementById('analyticsPanelClose').addEventListener('click', () => {
    document.getElementById('analyticsPanel').classList.remove('open');
  });

  // ---- Widget panel ----
  document.getElementById('widgetsBtn').addEventListener('click', () => {
    document.getElementById('widgetPanel').classList.toggle('open');
    document.getElementById('analyticsPanel').classList.remove('open');
  });
  document.getElementById('widgetPanelClose').addEventListener('click', () => {
    document.getElementById('widgetPanel').classList.remove('open');
  });

  // ---- Sorting & filter ----
  document.getElementById('sortVisitsBtn').addEventListener('click', () => {
    sortByVisits = true;
    renderSiteGrid();
    toast('Sorted by most visited');
  });
  document.getElementById('sortDefaultBtn').addEventListener('click', () => {
    sortByVisits = false;
    renderSiteGrid();
    toast('Default order restored');
  });
  document.getElementById('toggleHiddenBtn').addEventListener('click', () => {
    showHidden = !showHidden;
    document.getElementById('toggleHiddenBtn').textContent = showHidden ? 'Hide Hidden' : 'Show Hidden';
    renderSiteGrid();
    toast(showHidden ? 'Showing hidden sites' : 'Hidden sites concealed');
  });

  // ---- Folder tabs (static) ----
  document.querySelectorAll('.folder-tab:not(.dyn)').forEach(tab => {
    tab.addEventListener('click', () => setFolder(tab.dataset.folder));
  });
}

/* ================================================
   TOAST
   ================================================ */

function toast(msg, duration = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

/* ================================================
   BOOT
   ================================================ */

document.addEventListener('DOMContentLoaded', init);

/* ================================================
   MACOS DOCK MAGNIFICATION
   ================================================ */
(function initDock() {
  const SCALE_MAX  = 1.72;
  const SCALE_MID  = 1.35;
  const SCALE_NEAR = 1.12;
  const REACH      = 2;

  function getScale(dist) {
    if (dist === 0) return SCALE_MAX;
    if (dist === 1) return SCALE_MID;
    if (dist === 2) return SCALE_NEAR;
    return 1;
  }
  function getLift(dist) {
    if (dist === 0) return '-8px';
    if (dist === 1) return '-4px';
    if (dist === 2) return '-1px';
    return '0px';
  }

  function applyDock(grid, hoveredCard) {
    const cards = [...grid.querySelectorAll('.site-card')];
    const hi = cards.indexOf(hoveredCard);
    cards.forEach((card, i) => {
      const dist  = Math.abs(i - hi);
      const scale = getScale(dist);
      if (dist <= REACH) {
        card.style.transform = `scale(${scale}) translateY(${getLift(dist)})`;
        card.style.zIndex    = String(10 - dist);
      } else {
        card.style.transform = '';
        card.style.zIndex    = '';
      }
    });
  }

  function resetDock(grid) {
    grid.querySelectorAll('.site-card').forEach(c => {
      c.style.transform = '';
      c.style.zIndex    = '';
    });
  }

  function attachDock(grid) {
    if (grid._dockAttached) return;
    grid._dockAttached = true;
    grid.querySelectorAll('.site-card').forEach(card => {
      card.addEventListener('mouseenter', () => applyDock(grid, card));
    });
    grid.addEventListener('mouseleave', () => resetDock(grid));
  }

  document.querySelectorAll('.site-grid').forEach(attachDock);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.classList?.contains('site-grid')) attachDock(node);
        node.querySelectorAll?.('.site-grid').forEach(attachDock);
        if (node.classList?.contains('site-card')) {
          const grid = node.closest('.site-grid');
          if (grid) { grid._dockAttached = false; attachDock(grid); }
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

