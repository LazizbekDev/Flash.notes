// content.js - captures highlighted text and sends it to the extension

const sendHighlight = (text) => {
  if (!text?.trim()) {
    return;
  }

  try {
    chrome.runtime.sendMessage({ type: 'highlight', text: text.trim() });
  } catch (error) {
    console.error('[FlashNote][highlight]', error);
  }
};

const handleMouseUp = (e) => {
  try {
    // Prevent capturing highlights if clicking inside the floating UI
    if (e && e.composedPath) {
      const path = e.composedPath();
      if (path.some(el => el.id === 'flash-note-floating-container' || el === crosshairOverlay)) {
        return;
      }
    }
    
    const selection = window.getSelection()?.toString();
    if (selection && selection.trim().length > 2) {
      sendHighlight(selection);
    }
  } catch (error) {
    console.error('[FlashNote][selection]', error);
  }
};

const handleKeydown = (event) => {
  if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f') {
    try {
      const selection = window.getSelection()?.toString();
      if (selection?.trim()) {
        sendHighlight(selection);
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
  
  // Listen for messages from background/sidepanel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'enter-add-note-mode') {
      enterAddNoteMode();
    } else if (message.type === 'scroll-to-floating-note') {
      floatingUI.scrollToNote(message.id);
    } else if (message.type === 'toggle-floating-notes') {
      floatingUI.container.classList.toggle('hidden');
    } else if (message.type === 'floating-note-deleted-from-sidebar') {
      floatingUI.deleteNote(message.id);
    }
  });
};

const enterAddNoteMode = () => {
  if (isAddMode) return;
  isAddMode = true;
  
  // Set crosshair on body
  document.body.style.setProperty('cursor', 'crosshair', 'important');
  
  // Create dim screen overlay
  const dimOverlay = document.createElement('div');
  dimOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); z-index: 2147483645; pointer-events: none; transition: background 0.2s;';
  document.body.appendChild(dimOverlay);

  // Create highlighter element
  crosshairOverlay = document.createElement('div');
  crosshairOverlay.style.cssText = 'position: fixed; pointer-events: none; z-index: 2147483646; border: 2px solid #8b5cf6; background: rgba(139, 92, 246, 0.08); transition: all 0.1s ease-out; display: none; border-radius: 4px; box-sizing: border-box;';
  
  // Attach dimOverlay to crosshair for cleanup
  crosshairOverlay._dimOverlay = dimOverlay;

  // Create a tooltip for the tag info
  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'position: absolute; bottom: 100%; left: -2px; margin-bottom: 4px; background: #8b5cf6; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-family: monospace; white-space: nowrap; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
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
        if (firstClass) tagInfo += '.' + firstClass;
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
        // Find what's under the dim overlay by temporarily hiding it
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

  // Use capture phase to intercept all events
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  // Store cleanup function
  crosshairOverlay._cleanup = () => {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.body.style.removeProperty('cursor');
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
