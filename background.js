// background.js - manages alarms, notifications, and highlight sync (no backend/api for now, offline first)

const STORAGE_KEY = 'notes';
// backend API yo‘q: hozircha offline, faqat local storage asosida ishlaydi
const BACKEND_BASE_URL = null;

// Executes a provided async function and logs chrome-related errors in a standardized way.
const safeChromeCall = async (executor) => {
  try {
    return await executor();
  } catch (error) {
    console.error('[FlashNote][chrome]', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

const readStorage = (keys) =>
  safeChromeCall(
    () =>
      new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            reject(runtimeError);
            return;
          }
          resolve(result);
        });
      }),
  );

const writeStorage = (payload) =>
  safeChromeCall(
    () =>
      new Promise((resolve, reject) => {
        chrome.storage.local.set(payload, () => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            reject(runtimeError);
            return;
          }
          resolve();
        });
      }),
  );



const pushHighlightNote = async (text) => {
  if (!text?.trim()) {
    return;
  }

  const { [STORAGE_KEY]: notes = [] } =
    await readStorage([STORAGE_KEY]);

  const newNote = {
    id: crypto.randomUUID(),
    text: text.trim(),
    createdAt: Date.now(),
    source: 'highlight',
  };

  const updatedNotes = [newNote, ...notes];
  await writeStorage({ [STORAGE_KEY]: updatedNotes });

  try {
    chrome.runtime.sendMessage({ type: 'note-added', note: newNote }, () => {
      // Suppress unhandled error
      const err = chrome.runtime.lastError;
    });
  } catch (error) {
    console.warn('[FlashNote][notify]', error);
  }
};

// Listenerlarni global tashqarida declare qilish Chrome MV3 uchun to‘g‘ri (bir marta ishlaydi)
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  // async funksiyani event listenerda bevosita qo‘llash mumkin emas, shuning uchun .then/catch
  if (message?.type === 'highlight') {
    pushHighlightNote(message.text).catch((error) =>
      console.error('[FlashNote][pushHighlightNote]', error),
    );
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    const noteId = alarm?.name;
    if (!noteId) {
      return;
    }

    const { [STORAGE_KEY]: notes = [] } = await readStorage([STORAGE_KEY]);
    const note = notes.find((item) => item.id === noteId);

    if (!note) {
      return;
    }

    await safeChromeCall(
      () =>
        new Promise((resolve, reject) => {
          chrome.notifications.create(
            noteId,
            {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Flash Note Reminder',
              message: note.text.slice(0, 125),
              priority: 2,
            },
            () => {
              const runtimeError = chrome.runtime.lastError;
              if (runtimeError) {
                reject(runtimeError);
                return;
              }
              resolve();
            },
          );
        }),
    );

    const refreshedNotes = notes.map((item) =>
      item.id === noteId ? { ...item, reminderAt: null } : item,
    );
    await writeStorage({ [STORAGE_KEY]: refreshedNotes });
  } catch (error) {
    console.error('[FlashNote][alarm]', error);
  }
});

// ENG MUHIM QISM – Action bosilganda majburan ochish
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Bu qator eng kuchli: agar boshqa usullar ishlamasa ham shu ishlaydi
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.log("sidePanel.open ishlamadi, fallback ishlatilyapti");
    // Fallback: window fokus qilish
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
