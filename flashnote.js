// flashnote.js - handles UI, storage, search, syncing, and reminders

const STORAGE_KEY = 'notes';

const safeChromeCall = async (executor) => {
  try {
    return await executor();
  } catch (error) {
    console.error('[FlashNote][chrome]', error);
    throw error;
  }
};

const storageGet = (keys) =>
  safeChromeCall(
    () =>
      new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, (result) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            reject(runtimeError);
            return;
          }
          resolve(result);
        });
      }),
  );

const storageSet = (payload) =>
  safeChromeCall(
    () =>
      new Promise((resolve, reject) => {
        chrome.storage.sync.set(payload, () => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            reject(runtimeError);
            return;
          }
          resolve();
        });
      }),
  );



const createElement = (tag, options = {}) => {
  const node = document.createElement(tag);
  Object.assign(node, options);
  return node;
};

const state = {
  notes: [],
  floatingNotes: [],
  filter: '',
  activeTab: 'all',
  sortBy: 'newest',
  dateStart: null,
  dateEnd: null,
};

const elements = {};

const reminderOptions = [
  { label: '+5m', minutes: 5 },
  { label: '+1h', minutes: 60 },
  { label: 'Tmrw', minutes: 24 * 60 },
];

const formatDate = (timestamp) => {
  if (!timestamp) {
    return '';
  }
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const renderNotes = () => {
  const container = elements.notesList;
  container.innerHTML = '';

  let allNotes = [];
  
  if (state.activeTab === 'all') {
    allNotes = [...state.notes, ...state.floatingNotes];
  } else if (state.activeTab === 'comments') {
    allNotes = [...state.floatingNotes];
  } else if (state.activeTab === 'highlights') {
    allNotes = [...state.notes];
  }

  // 1. Search Filter
  let filtered = allNotes.filter((note) => {
    const text = note.type === 'floating' ? note.content : note.text;
    return text && text.toLowerCase().includes(state.filter.toLowerCase());
  });

  // 2. Date Range Filter
  if (state.dateStart) {
    const startObj = new Date(state.dateStart).setHours(0, 0, 0, 0);
    filtered = filtered.filter(n => n.createdAt >= startObj);
  }
  if (state.dateEnd) {
    const endObj = new Date(state.dateEnd).setHours(23, 59, 59, 999);
    filtered = filtered.filter(n => n.createdAt <= endObj);
  }

  // 3. Sort
  filtered.sort((a, b) => {
    if (state.sortBy === 'newest') return b.createdAt - a.createdAt;
    return a.createdAt - b.createdAt;
  });

  if (!filtered.length) {
    const empty = createElement('div', { className: 'empty-state', innerText: 'No notes found' });
    container.appendChild(empty);
    return;
  }

  filtered.forEach((note) => {
    const item = createElement('article', { className: 'note-item' });
    
    if (note.type === 'floating') {
      item.classList.add('floating-note-item');
      item.style.cursor = 'pointer';
      item.title = "Click to jump to floating note";
      
      const contentPreview = document.createElement('div');
      contentPreview.className = 'note-content';
      contentPreview.innerHTML = note.content || '<em>Empty floating note</em>';
      contentPreview.style.maxHeight = '80px';
      contentPreview.style.overflow = 'hidden';
      item.appendChild(contentPreview);
      
      item.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'scroll-to-floating-note', id: note.id }).catch(() => {});
          }
        });
      });
    } else {
      const text = createElement('div', { className: 'note-content', innerText: note.text });
      item.appendChild(text);
    }

    const meta = createElement('div', { className: 'note-meta' });
    
    const timeSpan = createElement('span', { innerText: formatDate(note.createdAt) });
    meta.appendChild(timeSpan);
    
    if (note.source === 'highlight') {
      const badge = createElement('span', { className: 'badge', innerText: 'Highlight' });
      meta.appendChild(badge);
    }
    if (note.type === 'floating') {
      try {
        const urlDomain = new URL(note.url).hostname;
        const badge = createElement('span', { className: 'badge', innerText: `Floating on ${urlDomain}` });
        meta.appendChild(badge);
      } catch(e) {}
    }
    item.appendChild(meta);

    if (note.reminderAt) {
      const reminder = createElement('div', {
        className: 'note-meta',
        innerText: `🔔 Reminder: ${formatDate(note.reminderAt)}`,
        style: 'color: var(--accent); margin-top: 4px;'
      });
      item.appendChild(reminder);
    }

    const actionRow = createElement('div', { className: 'note-actions' });

    if (note.type !== 'floating') {
      reminderOptions.forEach((option) => {
        const button = createElement('button', {
          className: 'btn-ghost',
          innerText: option.label,
          title: 'Remind me'
        });
        button.addEventListener('click', () => handleReminder(note.id, option.minutes));
        actionRow.appendChild(button);
      });

      const copyButton = createElement('button', {
        className: 'btn-ghost',
        innerText: 'Copy',
      });
      copyButton.addEventListener('click', () => navigator.clipboard.writeText(note.text).catch(console.error));
      actionRow.appendChild(copyButton);
    }

    const deleteButton = createElement('button', {
      className: 'btn-ghost btn-danger',
      innerText: 'Delete',
    });
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (note.type === 'floating') {
        deleteFloatingNote(note.id);
      } else {
        deleteNote(note.id);
      }
    });
    actionRow.appendChild(deleteButton);

    item.appendChild(actionRow);
    container.appendChild(item);
  });
};

const persistNotes = async (notes) => {
  state.notes = notes;
  await storageSet({ [STORAGE_KEY]: notes });
  renderNotes();
};

const handleReminder = async (noteId, minutes) => {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) {
    return;
  }

  const triggerAt = Date.now() + minutes * 60 * 1000;

  try {
    chrome.alarms.create(noteId, { delayInMinutes: minutes });
  } catch (error) {
    console.error('[FlashNote][alarms]', error);
  }

  const updatedNotes = state.notes.map((item) =>
    item.id === noteId ? { ...item, reminderAt: triggerAt } : item,
  );
  await persistNotes(updatedNotes);
};

const deleteNote = async (noteId) => {
  const updated = state.notes.filter((note) => note.id !== noteId);
  await persistNotes(updated);
};

const deleteFloatingNote = (id) => {
  state.floatingNotes = state.floatingNotes.filter(n => n.id !== id);
  chrome.storage.local.set({ floating_notes: state.floatingNotes }, () => {
    renderNotes();
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'floating-note-deleted-from-sidebar', id }).catch(() => {});
      });
    });
  });
};

const addNote = async (text, meta = {}) => {
  if (!text?.trim()) {
    return;
  }

  const newNote = {
    id: crypto.randomUUID(),
    text: text.trim(),
    createdAt: Date.now(),
    ...meta,
  };

  const updated = [newNote, ...state.notes];
  await persistNotes(updated);
};

const hydrate = async () => {
  const { [STORAGE_KEY]: notes = [] } =
    await storageGet([STORAGE_KEY]);
  state.notes = notes;
  
  chrome.storage.local.get(['floating_notes'], (res) => {
    state.floatingNotes = res.floating_notes || [];
    renderNotes();
  });
};

const handleNewNoteSubmit = async (event) => {
  event.preventDefault();
  const text = elements.noteInput.value;
  await addNote(text);
  elements.noteInput.value = '';
};

const registerEvents = () => {
  elements.form.addEventListener('submit', handleNewNoteSubmit);
  elements.searchInput.addEventListener('input', (event) => {
    state.filter = event.target.value;
    renderNotes();
  });

  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.activeTab = e.target.dataset.tab;
      renderNotes();
    });
  });

  // Filters
  elements.sortBy.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderNotes();
  });
  elements.dateStart.addEventListener('change', (e) => {
    state.dateStart = e.target.value;
    renderNotes();
  });
  elements.dateEnd.addEventListener('change', (e) => {
    state.dateEnd = e.target.value;
    renderNotes();
  });

  elements.addFloatingNoteBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'enter-add-note-mode' }).catch(() => {});
      }
    });
  });

  elements.toggleFloatingNotesBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-floating-notes' }).catch(() => {});
      }
    });
  });

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'note-added' && message.note) {
        state.notes = [message.note, ...state.notes];
        renderNotes();
      } else if (message?.type === 'floating-note-updated') {
        const index = state.floatingNotes.findIndex(n => n.id === message.note.id);
        if (index >= 0) {
          state.floatingNotes[index] = message.note;
        } else {
          state.floatingNotes.push(message.note);
        }
        renderNotes();
      } else if (message?.type === 'floating-note-deleted') {
        state.floatingNotes = state.floatingNotes.filter(n => n.id !== message.id);
        renderNotes();
      }
    });
  } catch (error) {
    console.error('[FlashNote][listener]', error);
  }

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', ({ matches }) => toggleTheme(matches));
};

const toggleTheme = (isDark = window.matchMedia('(prefers-color-scheme: dark)').matches) => {
  document.body.dataset.theme = isDark ? 'dark' : 'light';
};

const mount = () => {
  elements.form = document.querySelector('#note-form');
  elements.noteInput = document.querySelector('#note-text');
  elements.notesList = document.querySelector('#notes-list');
  elements.searchInput = document.querySelector('#note-search');
  elements.addFloatingNoteBtn = document.querySelector('#add-floating-note');
  elements.toggleFloatingNotesBtn = document.querySelector('#toggle-floating-notes');
  
  elements.tabs = document.querySelectorAll('.tab-btn');
  elements.sortBy = document.querySelector('#sort-by');
  elements.dateStart = document.querySelector('#date-start');
  elements.dateEnd = document.querySelector('#date-end');

  registerEvents();
  toggleTheme();
  hydrate();
};

document.addEventListener('DOMContentLoaded', mount);
