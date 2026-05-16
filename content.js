// content.js - captures highlighted text and sends it to the extension

const sendHighlight = (text, html) => {
  if (!text?.trim()) return;

  try {
    chrome.runtime.sendMessage({ type: 'highlight', text: text.trim(), html: html });
  } catch (error) {
    console.error('[FlashNote][highlight]', error);
  }
};

const handleMouseUp = (e) => {
  try {
    if (e && e.composedPath) {
      const path = e.composedPath();
      if (path.some(el => el.id === 'flash-note-floating-container' || el === crosshairOverlay)) return;
    }
    
    const selection = window.getSelection();
    const text = selection.toString();
    if (text && text.trim().length > 2) {
      const range = selection.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      sendHighlight(text, container.innerHTML);
    }
  } catch (error) {
    console.error('[FlashNote][selection]', error);
  }
};

const handleKeydown = (event) => {
  if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f') {
    try {
      const selection = window.getSelection();
      const text = selection.toString();
      if (text?.trim()) {
        const range = selection.getRangeAt(0);
        const container = document.createElement("div");
        container.appendChild(range.cloneContents());
        sendHighlight(text, container.innerHTML);
      }
    } catch (error) {
      console.error('[FlashNote][shortcut]', error);
    }
  }
};

document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('keydown', handleKeydown);

// --- Floating Comments Logic ---

let floatingUI = null;
let isAddMode = false;
let crosshairOverlay = null;

const initFloatingComments = () => {
  if (!window.FlashNoteFloatingUI) return; // Not loaded yet
  
  floatingUI = new window.FlashNoteFloatingUI();
  floatingUI.loadNotesForCurrentPage();

  // Check for auto-scroll request from sidepanel
  chrome.storage.local.get(['pending_scroll_id'], (res) => {
    if (res.pending_scroll_id) {
      // Short delay to ensure markers are placed
      setTimeout(() => {
        floatingUI.scrollToNote(res.pending_scroll_id);
        chrome.storage.local.remove('pending_scroll_id');
      }, 800);
    }
  });
  
  // Listen for messages from background/sidepanel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'enter-add-note-mode') {
      enterAddNoteMode();
    } else if (message.type === 'exit-add-note-mode') {
      exitAddNoteMode();
    } else if (message.type === 'scroll-to-floating-note') {
      floatingUI.scrollToNote(message.id);
    } else if (message.type === 'toggle-floating-notes') {
      floatingUI.container.classList.toggle('hidden');
    } else if (message.type === 'floating-note-deleted-from-sidebar') {
      floatingUI.deleteNote(message.id);
    } else if (message.type === 'theme-changed') {
      floatingUI.setTheme(message.theme);
    }
  });

  // Sync initial theme
  chrome.storage.sync.get(['theme'], (res) => {
    if (res.theme) floatingUI.setTheme(res.theme);
  });
};

const enterAddNoteMode = () => {
  if (isAddMode) return;
  isAddMode = true;
  
  // Set crosshair on body
  document.body.style.setProperty('cursor', 'crosshair', 'important');
  
  // Create dim screen overlay
  const dimOverlay = document.createElement('div');
  dimOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); z-index: 2147483645; pointer-events: none; transition: background 0.3s;';
  document.body.appendChild(dimOverlay);

  // Create highlighter element
  crosshairOverlay = document.createElement('div');
  crosshairOverlay.style.cssText = 'position: fixed; pointer-events: none; z-index: 2147483646; border: 2px solid #D97706; background: rgba(217, 119, 6, 0.1); transition: all 0.08s ease-out; display: none; border-radius: 6px; box-sizing: border-box; box-shadow: 0 0 20px rgba(217, 119, 6, 0.2);';
  
  // Attach dimOverlay to crosshair for cleanup
  crosshairOverlay._dimOverlay = dimOverlay;

  // Create a tooltip for the tag info
  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'position: absolute; bottom: 100%; left: -2px; margin-bottom: 6px; background: #D97706; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-family: "DM Mono", monospace; white-space: nowrap; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-transform: lowercase; letter-spacing: 0.05em;';
  crosshairOverlay.appendChild(tooltip);
  document.body.appendChild(crosshairOverlay);

  const onMouseMove = (e) => {
    // Hide highlighter temporarily to find element underneath
    crosshairOverlay.style.display = 'none';
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    
    if (targetElement && targetElement !== document.body && targetElement !== document.documentElement && targetElement !== dimOverlay) {
      const rect = targetElement.getBoundingClientRect();
      crosshairOverlay.style.display = 'block';
      crosshairOverlay.style.top = rect.top + 'px';
      crosshairOverlay.style.left = rect.left + 'px';
      crosshairOverlay.style.width = rect.width + 'px';
      crosshairOverlay.style.height = rect.height + 'px';
      
      let tagInfo = targetElement.tagName.toLowerCase();
      if (targetElement.id) tagInfo += '#' + targetElement.id;
      else if (targetElement.className && typeof targetElement.className === 'string') {
        const firstClass = targetElement.className.split(' ')[0];
        if (firstClass && !firstClass.includes('flash-note')) tagInfo += '.' + firstClass;
      }
      tooltip.textContent = tagInfo;
    } else {
      crosshairOverlay.style.display = 'none';
    }
  };

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    crosshairOverlay.style.display = 'none';
    let targetElement = document.elementFromPoint(e.clientX, e.clientY);
    if (targetElement === dimOverlay) {
        dimOverlay.style.display = 'none';
        targetElement = document.elementFromPoint(e.clientX, e.clientY);
        dimOverlay.style.display = 'block';
    }
    
    if (targetElement) {
      const anchor = window.FlashNoteAnchor.createAnchor(targetElement, e);
      
      const newNote = {
        id: crypto.randomUUID(),
        type: 'floating',
        content: '',
        anchor,
        x: e.clientX,
        y: e.clientY,
        url: anchor.url,
        createdAt: Date.now()
      };
      
      floatingUI.createNoteCard(newNote, true);
    }
    
    exitAddNoteMode();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      exitAddNoteMode();
    }
  };

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  crosshairOverlay._cleanup = () => {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.body.style.removeProperty('cursor');
    chrome.runtime.sendMessage({ type: 'add-note-mode-exited' });
  };
};

const exitAddNoteMode = () => {
  if (!isAddMode) return;
  isAddMode = false;
  if (crosshairOverlay) {
    if (crosshairOverlay._cleanup) crosshairOverlay._cleanup();
    if (crosshairOverlay._dimOverlay) crosshairOverlay._dimOverlay.remove();
    crosshairOverlay.remove();
    crosshairOverlay = null;
  }
};

// Initialize after a short delay to ensure DOM is ready
setTimeout(initFloatingComments, 500);

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking && floatingUI) {
    window.requestAnimationFrame(() => {
      floatingUI.updateAllPositions();
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (floatingUI) floatingUI.updateAllPositions();
});
