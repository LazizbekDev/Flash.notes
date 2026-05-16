const STORAGE_KEY = 'notes';
const FLOATING_STORAGE_KEY = 'floating_notes';

const getStorage = (area, keys) =>
  new Promise((resolve) => {
    chrome.storage[area].get(keys, (res) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        resolve({});
      } else {
        resolve(res);
      }
    });
  });

const pushHighlightNote = async (text, html) => {
  if (!text?.trim()) return;

  // Use LOCAL storage to avoid quota limits
  const res = await getStorage('local', [STORAGE_KEY]);
  const notes = res[STORAGE_KEY] || [];

  const newNote = {
    id: crypto.randomUUID(),
    text: text.trim(),
    html: html, // Store rich text
    createdAt: Date.now(),
    source: 'highlight',
    type: 'note'
  };

  const updatedNotes = [newNote, ...notes];
  await chrome.storage.local.set({ [STORAGE_KEY]: updatedNotes });

  chrome.runtime.sendMessage({ type: 'note-added', note: newNote }).catch(() => {});
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'highlight') {
    pushHighlightNote(message.text, message.html).catch(console.error);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    const noteId = alarm?.name;
    if (!noteId) return;

    // Both manual and floating notes are now in local storage
    const res = await getStorage('local', [STORAGE_KEY, FLOATING_STORAGE_KEY]);
    const allNotes = [...(res[STORAGE_KEY] || []), ...(res[FLOATING_STORAGE_KEY] || [])];
    const note = allNotes.find(n => n.id === noteId);

    if (note) {
      chrome.notifications.create(note.id, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Flash Note Reminder',
        message: (note.text || note.content || 'Time to check your note!').slice(0, 120),
        priority: 2
      });

      // Clear reminderAt in storage
      if (note.anchor) {
        // Floating note
        const updated = (res[FLOATING_STORAGE_KEY] || []).map(n => n.id === noteId ? { ...n, reminderAt: null } : n);
        await chrome.storage.local.set({ [FLOATING_STORAGE_KEY]: updated });
      } else {
        // Manual note
        const updated = (res[STORAGE_KEY] || []).map(n => n.id === noteId ? { ...n, reminderAt: null } : n);
        await chrome.storage.local.set({ [STORAGE_KEY]: updated });
      }
    }
  } catch (error) {
    console.error('[FlashNote][alarm]', error);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-flash-note',
    title: 'Add Flash Note here',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-flash-note') {
    chrome.tabs.sendMessage(tab.id, { type: 'enter-add-note-mode' }).catch(() => {});
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'add_floating_note') {
    chrome.tabs.sendMessage(tab.id, { type: 'enter-add-note-mode' }).catch(() => {});
  }
});
