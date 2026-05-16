const STORAGE_KEY = 'notes';
const FLOATING_STORAGE_KEY = 'floating_notes';

let state = {
  notes: [],
  floatingNotes: [],
  activeTab: 'all',
  selectedType: 'note',
  showFloating: true,
  searchQuery: '',
  sortOrder: 'newest',
  theme: 'system' // 'system', 'light', 'dark'
};

// ── ELEMENTS ──
const elements = {
  noteText: document.getElementById('noteText'),
  saveBtn: document.getElementById('saveBtn'),
  tagGroup: document.getElementById('tagGroup'),
  tabGroup: document.getElementById('tabGroup'),
  notesList: document.getElementById('notesList'),
  searchInput: document.getElementById('searchInput'),
  sortSel: document.getElementById('sortSel'),
  noteCount: document.getElementById('noteCount'),
  toggleFloatBtn: document.getElementById('toggleFloatBtn'),
  addFloatingBtn: document.getElementById('addFloatingBtn'),
  themeBtn: document.getElementById('themeBtn'),
  toast: document.getElementById('toast')
};

// ── THEME & INIT ──
async function init() {
  await migrateFromSync();
  await hydrate();
  applyTheme();
  registerListeners();
  renderNotes();
}

async function migrateFromSync() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (res) => {
      if (res[STORAGE_KEY] && res[STORAGE_KEY].length > 0) {
        // Move to local
        chrome.storage.local.get([STORAGE_KEY], (localRes) => {
          const localNotes = localRes[STORAGE_KEY] || [];
          // Combine if needed or just replace if local is empty
          if (localNotes.length === 0) {
            chrome.storage.local.set({ [STORAGE_KEY]: res[STORAGE_KEY] }, () => {
              chrome.storage.sync.remove([STORAGE_KEY]);
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

async function hydrate() {
  return new Promise((resolve) => {
    // Both now come from local to avoid quota limits
    chrome.storage.local.get([STORAGE_KEY, FLOATING_STORAGE_KEY], (res) => {
      state.notes = res[STORAGE_KEY] || [];
      state.floatingNotes = res[FLOATING_STORAGE_KEY] || [];
      
      chrome.storage.sync.get(['theme'], (syncRes) => {
        state.theme = syncRes.theme || 'system';
        resolve();
      });
    });
  });
}

function applyTheme() {
  const root = document.documentElement;
  const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  root.classList.toggle('dark', state.theme === 'dark');
  root.classList.toggle('light', state.theme === 'light');

  const moon = elements.themeBtn.querySelector('.moon');
  const sun = elements.themeBtn.querySelector('.sun');
  
  if (isDark) {
    moon.style.display = 'none';
    sun.style.display = 'block';
  } else {
    moon.style.display = 'block';
    sun.style.display = 'none';
  }

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'theme-changed', theme: state.theme }).catch(() => {});
    });
  });
}

function registerListeners() {
  // Theme Switcher
  elements.themeBtn.addEventListener('click', () => {
    if (state.theme === 'light') state.theme = 'dark';
    else if (state.theme === 'dark') state.theme = 'system';
    else state.theme = 'light';
    
    chrome.storage.sync.set({ theme: state.theme });
    applyTheme();
    showToast(`Theme: ${state.theme}`);
  });

  // Add Floating Note Button (Header)
  elements.addFloatingBtn.addEventListener('click', () => {
    const isActive = elements.addFloatingBtn.classList.contains('active');
    if (isActive) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'exit-add-note-mode' }).catch(() => {});
      });
      elements.addFloatingBtn.classList.remove('active');
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'enter-add-note-mode' }).catch(() => {});
          elements.addFloatingBtn.classList.add('active');
          showToast('Click an element on the page.');
        }
      });
    }
  });

  // Tag Selection
  elements.tagGroup.addEventListener('click', e => {
    const btn = e.target.closest('.tag-pill');
    if (!btn) return;
    state.selectedType = btn.dataset.type;
    document.querySelectorAll('.tag-pill').forEach(b => {
      b.className = 'tag-pill';
      if (b.dataset.type === state.selectedType) b.classList.add('sel-' + state.selectedType);
    });
  });

  // Tab Selection
  elements.tabGroup.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    state.activeTab = btn.dataset.tab;
    renderNotes();
  });

  // Save Note
  elements.saveBtn.addEventListener('click', handleSave);
  elements.noteText.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
  });

  elements.noteText.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  // Toggle Floating
  elements.toggleFloatBtn.addEventListener('click', () => {
    state.showFloating = !state.showFloating;
    elements.toggleFloatBtn.classList.toggle('active', !state.showFloating);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-floating-notes' }).catch(() => {});
    });
    renderNotes();
  });

  // Sort & Search
  elements.sortSel.addEventListener('change', (e) => {
    state.sortOrder = e.target.value;
    renderNotes();
  });
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderNotes();
  });

  // External Messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'note-added') {
      state.notes.unshift(message.note);
      renderNotes();
    } else if (message.type === 'add-note-mode-exited') {
      elements.addFloatingBtn.classList.remove('active');
    } else if (message.type === 'floating-note-updated') {
      const idx = state.floatingNotes.findIndex(n => n.id === message.note.id);
      if (idx >= 0) state.floatingNotes[idx] = message.note;
      else state.floatingNotes.unshift(message.note);
      renderNotes();
    } else if (message.type === 'floating-note-deleted') {
      state.floatingNotes = state.floatingNotes.filter(n => n.id !== message.id);
      renderNotes();
    }
  });
}

// ── ACTIONS ──
async function handleSave() {
  const text = elements.noteText.value.trim();
  if (!text) return;

  if (state.selectedType === 'float') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'enter-add-note-mode' }).catch(() => {});
        showToast('Click an element on the page.');
      }
    });
    return;
  }

  const newNote = {
    id: crypto.randomUUID(),
    text: text,
    createdAt: Date.now(),
    source: state.selectedType === 'highlight' ? 'highlight' : 'manual',
    type: 'note'
  };

  state.notes.unshift(newNote);
  await chrome.storage.local.set({ [STORAGE_KEY]: state.notes });
  elements.noteText.value = '';
  elements.noteText.style.height = '';
  renderNotes();
  showToast('Saved.');
}

async function deleteNote(id, isFloating) {
  if (isFloating) {
    state.floatingNotes = state.floatingNotes.filter(n => n.id !== id);
    await chrome.storage.local.set({ [FLOATING_STORAGE_KEY]: state.floatingNotes });
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'floating-note-deleted-from-sidebar', id }).catch(() => {}));
    });
  } else {
    state.notes = state.notes.filter(n => n.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: state.notes });
  }
  chrome.alarms.clear(id);
  renderNotes();
  showToast('Deleted.');
}

async function scheduleReminder(id, isFloating, dateStr) {
  const time = new Date(dateStr).getTime();
  if (isNaN(time) || time < Date.now()) {
    showToast('Invalid date or time in past.');
    return;
  }

  const delayInMinutes = Math.max(1, Math.round((time - Date.now()) / 60000));
  
  if (isFloating) {
    const idx = state.floatingNotes.findIndex(n => n.id === id);
    if (idx >= 0) {
      state.floatingNotes[idx].reminderAt = time;
      await chrome.storage.local.set({ [FLOATING_STORAGE_KEY]: state.floatingNotes });
    }
  } else {
    const idx = state.notes.findIndex(n => n.id === id);
    if (idx >= 0) {
      state.notes[idx].reminderAt = time;
      await chrome.storage.local.set({ [STORAGE_KEY]: state.notes });
    }
  }

  chrome.alarms.create(id, { delayInMinutes });
  renderNotes();
  showToast(`Reminder set for ${new Date(time).toLocaleString()}`);
}

function copyNote(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied.'));
  }
}

function jumpToFloatingNote(id) {
  const note = state.floatingNotes.find(n => n.id === id);
  if (!note) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab) return;

    const targetUrl = note.url.split('#')[0];
    const currentUrl = activeTab.url.split('#')[0];

    if (targetUrl === currentUrl) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'scroll-to-floating-note', id }).catch(() => {});
    } else {
      chrome.storage.local.set({ pending_scroll_id: id }, () => {
        chrome.tabs.create({ url: note.url });
      });
    }
  });
}

// ── RENDER ──
function renderNotes() {
  const list = elements.notesList;
  const q = state.searchQuery;

  let data = [];
  if (state.activeTab === 'all') {
    data = [
      ...state.notes.map(n => ({ ...n, _isFloating: false })),
      ...state.floatingNotes.map(n => ({ ...n, _isFloating: true }))
    ];
  } else if (state.activeTab === 'highlight') {
    data = state.notes.map(n => ({ ...n, _isFloating: false }));
  } else if (state.activeTab === 'float') {
    data = state.floatingNotes.map(n => ({ ...n, _isFloating: true }));
  }

  if (q) {
    data = data.filter(n => (n._isFloating ? n.content : n.text).toLowerCase().includes(q));
  }

  data.sort((a, b) => state.sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
  elements.noteCount.textContent = `${data.length} ${data.length === 1 ? 'note' : 'notes'}`;

  if (!data.length) {
    list.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" stroke-width="1.2" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><p>No notes found.</p></div>`;
    return;
  }

  list.innerHTML = data.map(n => {
    const text = n._isFloating ? (n.content || '<em>Empty</em>') : n.text;
    const type = n._isFloating ? 'float' : (n.source === 'highlight' ? 'highlight' : 'note');
    return `
    <div class="note-item ${type}-type" data-id="${n.id}" data-floating="${n._isFloating}">
      <div class="note-text">${esc(text)}</div>
      <div class="note-bottom">
        <div class="note-meta">
          <span class="type-badge ${type}">${type}</span>
          <span class="note-date">${fmtDate(n.createdAt)}</span>
          ${n.reminderAt ? `<span class="note-date" style="color:var(--amber)">🔔 ${new Date(n.reminderAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>` : ''}
          ${n._isFloating ? `<span class="note-date">· ${new URL(n.url).hostname}</span>` : ''}
        </div>
        <div class="note-acts">
          ${n._isFloating ? `<button class="act-btn" title="Jump to" data-action="jump"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></button>` : ''}
          <button class="act-btn" title="Set Reminder" data-action="remind"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></button>
          <button class="act-btn" title="Copy" data-action="copy"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <button class="act-btn del" title="Delete" data-action="delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      </div>
      <div class="remind-form" style="display:none; margin-top:8px;">
        <input type="datetime-local" class="remind-input" style="width:100%; font-size:11px; padding:4px; border:1px solid var(--border); border-radius:4px; background:var(--bg);">
      </div>
    </div>`;
  }).join('');
}

function esc(s) {
  const t = document.createElement('div');
  t.textContent = s;
  return t.innerHTML;
}

function fmtDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

let toastTimer;
function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2000);
}

elements.notesList.addEventListener('click', e => {
  const btn = e.target.closest('button');
  const item = e.target.closest('.note-item');
  if (!item) return;

  const id = item.dataset.id;
  const isFloating = item.dataset.floating === 'true';

  if (!btn) {
    if (isFloating) jumpToFloatingNote(id);
    return;
  }
  
  const action = btn.dataset.action;
  if (action === 'copy') {
    const txt = isFloating ? state.floatingNotes.find(x => x.id === id)?.content : state.notes.find(x => x.id === id)?.text;
    if (txt) copyNote(txt);
  } else if (action === 'delete') {
    deleteNote(id, isFloating);
  } else if (action === 'jump') {
    jumpToFloatingNote(id);
  } else if (action === 'remind') {
    const form = item.querySelector('.remind-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }
});

elements.notesList.addEventListener('change', e => {
  if (e.target.classList.contains('remind-input')) {
    const item = e.target.closest('.note-item');
    const id = item.dataset.id;
    const isFloating = item.dataset.floating === 'true';
    scheduleReminder(id, isFloating, e.target.value);
  }
});

init();
