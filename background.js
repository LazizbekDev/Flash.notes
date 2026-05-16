const STORAGE_KEY = 'notes';
const FLOATING_STORAGE_KEY = 'floating_notes';

const safeChromeCall = async (executor) => {
  try {
    return await executor();
  } catch (error) {
    console.error('[FlashNote][chrome]', error);
    throw error;
  }
};

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

const pushHighlightNote = async (text) => {
  if (!text?.trim()) return;

  const res = await getStorage('sync', [STORAGE_KEY]);
  const notes = res[STORAGE_KEY] || [];

  const newNote = {
    id: crypto.randomUUID(),
    text: text.trim(),
    createdAt: Date.now(),
    source: 'highlight',
    type: 'note'
  };

  const updatedNotes = [newNote, ...notes];
  await chrome.storage.sync.set({ [STORAGE_KEY]: updatedNotes });

  chrome.runtime.sendMessage({ type: 'note-added', note: newNote }, () => {
    const err = chrome.runtime.lastError;
  });
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'highlight') {
    pushHighlightNote(message.text).catch(console.error);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    const noteId = alarm?.name;
    if (!noteId) return;

    // Check Sync Storage first (manual/highlights)
    const resSync = await getStorage('sync', [STORAGE_KEY]);
    let notes = resSync[STORAGE_KEY] || [];
    let note = notes.find(n => n.id === noteId);
    chrome.storage.local.get(['notes', 'floating_notes'], (res) => {
      const allNotes = [...(res.notes || []), ...(res.floating_notes || [])];
      const note = allNotes.find(n => n.id === alarm.name);

      if (note) {
        chrome.notifications.create(note.id, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Flash Note Reminder',
          message: note.text || note.content || 'Time to check your note!',
          priority: 2
        });

        // Mark reminder as triggered/removed in UI
        if (note.anchor) {
          // It's a floating note
          const idx = res.floating_notes.findIndex(n => n.id === alarm.name);
          if (idx >= 0) {
            delete res.floating_notes[idx].reminderAt;
            chrome.storage.local.set({ floating_notes: res.floating_notes });
          }
        } else {
          // It's a manual note
          const idx = res.notes.findIndex(n => n.id === alarm.name);
          if (idx >= 0) {
            delete res.notes[idx].reminderAt;
            chrome.storage.local.set({ notes: res.notes });
          }
        }
      }
    });
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
