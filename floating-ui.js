// floating-ui.js - Handles the Shadow DOM UI for floating comments (Figma Style)

class FloatingUI {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'flash-note-floating-container';
    this.container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 2147483647;';

    this.shadow = this.container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        --fn-bg: #ffffff;
        --fn-text-main: #111827;
        --fn-text-muted: #6b7280;
        --fn-border: #e5e7eb;
        --fn-accent: #0ea5e9;
        --fn-accent-hover: #0284c7;
        --fn-danger: #ef4444;
        --fn-input-bg: #f3f4f6;
        --fn-shadow-card: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0,0,0,0.04);
        --fn-shadow-marker: 0 8px 16px rgba(255, 65, 84, 0.35);
        font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      .note-wrapper {
        position: absolute;
        pointer-events: auto;
        z-index: 1;
      }
      
      .note-wrapper.open {
        z-index: 10;
      }

      /* 3D Red Envelope Marker */
      .custom-red-marker {
        position: relative;
        width: 32px;
        height: 24px;
        cursor: grab;
        filter: var(--fn-shadow-marker);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: 6; /* above drag overlay */
      }
      
      .custom-red-marker:active {
        cursor: grabbing;
      }
      
      .custom-red-marker:hover {
        transform: scale(1.05) translateY(-2px);
      }

      .marker-bubble {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #ff6b77, #ff4154);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
        box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.69);
      }

      .marker-bubble svg {
        width: 16px;
        height: 16px;
        color: white;
      }

      /* Dynamic Tail */
      .dynamic-tail-container {
        position: absolute;
        top: 50%; left: 50%;
        width: 0; height: 0;
        z-index: 1; /* behind the bubble */
        pointer-events: none;
      }
      
      .dynamic-tail {
        position: absolute;
        left: 10px; /* start at edge of bubble */
        top: -6px; /* center vertically */
        width: 0; height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 12px solid #ff6372ff;
      }

      /* Dim Overlay for Dragging */
      .drag-highlight-overlay {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 4;
        display: none;
      }
      
      .drag-highlight-overlay.active {
        display: block;
      }
      
      .drag-highlight-box {
        position: absolute;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
        border: 2px solid var(--fn-accent);
        border-radius: 4px;
        transition: all 0.1s ease;
      }

      /* Figma-style Popup Card */
      .figma-card {
        position: absolute;
        top: 36px;
        left: 50%;
        transform: translateX(-50%) scale(0.95);
        opacity: 0;
        visibility: hidden;
        width: 340px;
        background: var(--fn-bg);
        border: 1px solid var(--fn-border);
        border-radius: 16px;
        box-shadow: var(--fn-shadow-card);
        display: flex;
        flex-direction: column;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        z-index: 10;
      }

      .note-wrapper.open .figma-card {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) scale(1);
        pointer-events: auto;
      }

      /* Card Header */
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--fn-border);
      }

      .header-title {
        font-weight: 600;
        font-size: 14px;
        color: var(--fn-text-main);
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .icon-btn {
        background: none;
        border: none;
        color: var(--fn-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }

      .icon-btn:hover {
        background: var(--fn-input-bg);
        color: var(--fn-text-main);
      }
      
      .icon-btn svg {
        width: 18px;
        height: 18px;
      }

      /* Scroll Area */
      .card-scroll-area {
        max-height: 400px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      /* Comment Block */
      .comment-block {
        display: flex;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid var(--fn-border);
      }
      
      .comment-block:last-child {
        border-bottom: none;
      }

      .comment-content {
        flex: 1;
        min-width: 0;
      }

      .comment-meta {
        display: flex;
        align-items: baseline;
        margin-bottom: 8px;
      }

      .time {
        font-size: 12px;
        color: var(--fn-text-muted);
        font-weight: 500;
      }

      .comment-text {
        font-size: 14px;
        line-height: 1.5;
        color: var(--fn-text-main);
        word-break: break-word;
      }

      /* Reply Input Footer */
      .card-footer {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: var(--fn-bg);
        border-top: 1px solid var(--fn-border);
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 16px;
      }

      .input-container {
        flex: 1;
        background: var(--fn-input-bg);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        border: 1px solid transparent;
        transition: border-color 0.2s;
      }
      
      .input-container:focus-within {
        border-color: #cbd5e1;
      }

      .input-editor {
        padding: 12px 12px 8px 12px;
        font-size: 14px;
        line-height: 1.5;
        color: var(--fn-text-main);
        outline: none;
        min-height: 24px;
        max-height: 150px;
        overflow-y: auto;
      }

      .input-editor:empty:before {
        content: attr(data-placeholder);
        color: #9ca3af;
        pointer-events: none;
      }

      .input-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 4px 8px 8px 12px;
      }

      .submit-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--fn-accent);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        transition: background 0.15s;
        box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
      }

      .submit-btn:hover {
        background: var(--fn-accent-hover);
      }
      
      .submit-btn svg {
        width: 16px;
        height: 16px;
      }

      .hidden {
        display: none !important;
      }
    `;
    this.shadow.appendChild(style);

    // Dim Overlay for Drag
    this.dragOverlay = document.createElement('div');
    this.dragOverlay.classList.add('drag-highlight-overlay');
    this.dragOverlay.innerHTML = '<div class="drag-highlight-box"></div>';
    this.shadow.appendChild(this.dragOverlay);
    this.dragBox = this.dragOverlay.querySelector('.drag-highlight-box');

    document.body.appendChild(this.container);

    this.notes = new Map();

    window.addEventListener('resize', () => this.updateAllPositions());
    window.addEventListener('scroll', () => this.updateAllPositions(), { passive: true });

    document.addEventListener('mousedown', (e) => {
      if (this.container.classList.contains('hidden')) return;

      let clickedInside = false;
      const path = e.composedPath();
      for (const node of path) {
        if (node === this.container) {
          clickedInside = true;
          break;
        }
      }

      if (!clickedInside) {
        this.closeAllPopups();
      }
    });
  }

  closeAllPopups() {
    for (const note of this.notes.values()) {
      if (note.element.classList.contains('open')) {
        note.element.classList.remove('open');
      }
    }
  }

  formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleString('uz-UZ', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  updateTailRotation(markerEl, anchorRect) {
    const tailContainer = markerEl.querySelector('.dynamic-tail-container');
    if (!tailContainer || !anchorRect) return;

    const markerRect = markerEl.getBoundingClientRect();
    const markerCX = markerRect.left + markerRect.width / 2;
    const markerCY = markerRect.top + markerRect.height / 2;

    const anchorCX = anchorRect.left + anchorRect.width / 2;
    const anchorCY = anchorRect.top + anchorRect.height / 2;

    // Calculate angle towards anchor center
    const angle = Math.atan2(anchorCY - markerCY, anchorCX - markerCX);
    tailContainer.style.transform = `rotate(${angle}rad)`;
  }

  createNoteCard(noteData, isNew = false) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('note-wrapper');
    wrapper.dataset.id = noteData.id;

    if (isNew) wrapper.classList.add('open');

    // 1. Red Envelope Marker
    const marker = document.createElement('div');
    marker.classList.add('custom-red-marker');
    marker.innerHTML = `
      <div class="marker-bubble">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </div>
      <div class="dynamic-tail-container">
        <div class="dynamic-tail"></div>
      </div>
    `;

    // Drag and Drop Logic
    let hasDragged = false;

    marker.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault(); // Prevent text selection

      const anchorEl = window.FlashNoteAnchor.findElementByAnchor(noteData.anchor);
      if (!anchorEl) return;

      const anchorRect = anchorEl.getBoundingClientRect();

      // Show Drag Overlay & Highlight Element
      this.dragOverlay.classList.add('active');
      this.dragBox.style.top = anchorRect.top + 'px';
      this.dragBox.style.left = anchorRect.left + 'px';
      this.dragBox.style.width = anchorRect.width + 'px';
      this.dragBox.style.height = anchorRect.height + 'px';

      // Calculate start offset relative to wrapper's top/left
      const rect = wrapper.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      hasDragged = false;

      const mouseMove = (ev) => {
        hasDragged = true;
        let newLeft = ev.clientX - offsetX;
        let newTop = ev.clientY - offsetY;

        const markerWidth = 32;
        const markerHeight = 24;
        const padding = 60; // Allow dragging outside element slightly

        // Bound to the element + padding
        if (newLeft < anchorRect.left - padding) newLeft = anchorRect.left - padding;
        if (newLeft > anchorRect.right + padding - markerWidth) newLeft = anchorRect.right + padding - markerWidth;
        if (newTop < anchorRect.top - padding) newTop = anchorRect.top - padding;
        if (newTop > anchorRect.bottom + padding - markerHeight) newTop = anchorRect.bottom + padding - markerHeight;

        noteData.markerOffsetX = newLeft - anchorRect.right;
        noteData.markerOffsetY = newTop - anchorRect.top;

        wrapper.style.left = newLeft + 'px';
        wrapper.style.top = newTop + 'px';

        // Update tail direction while dragging
        this.updateTailRotation(marker, anchorRect);
      };

      const mouseUp = () => {
        document.removeEventListener('mousemove', mouseMove);
        document.removeEventListener('mouseup', mouseUp);

        this.dragOverlay.classList.remove('active');

        if (hasDragged) {
          this.saveNoteData(noteData);
        }
      };

      document.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', mouseUp);
    });

    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hasDragged) return; // Prevent opening popup if we just dragged the marker

      const isOpen = wrapper.classList.contains('open');
      this.closeAllPopups();
      if (!isOpen) wrapper.classList.add('open');
    });

    // 2. Figma-Style Card
    const card = document.createElement('div');
    card.classList.add('figma-card');
    card.addEventListener('mousedown', e => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.classList.add('card-header');
    header.innerHTML = `
      <div class="header-title">Comment</div>
      <div class="header-actions">
        <button class="icon-btn resolve-btn" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </button>
        <button class="icon-btn close-btn" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;

    header.querySelector('.close-btn').onclick = () => wrapper.classList.remove('open');
    header.querySelector('.resolve-btn').onclick = () => this.deleteNote(noteData.id);

    // Scroll Area for Comments/Replies
    const scrollArea = document.createElement('div');
    scrollArea.classList.add('card-scroll-area');

    const renderThread = () => {
      scrollArea.innerHTML = '';
      if (!noteData.content) {
        scrollArea.classList.add('hidden');
        return;
      }
      scrollArea.classList.remove('hidden');

      const mainBlock = this.createCommentBlock(noteData.createdAt, noteData.content);
      scrollArea.appendChild(mainBlock);

      if (noteData.replies && noteData.replies.length > 0) {
        noteData.replies.forEach(reply => {
          const replyBlock = this.createCommentBlock(reply.createdAt, reply.content);
          scrollArea.appendChild(replyBlock);
        });
      }

      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 50);
    };

    // Footer Input Area
    const footer = document.createElement('div');
    footer.classList.add('card-footer');
    footer.innerHTML = `
      <div class="input-container">
        <div class="input-editor" contenteditable="true" data-placeholder="Reply..."></div>
        <div class="input-actions">
          <button class="submit-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </button>
        </div>
      </div>
    `;

    const editor = footer.querySelector('.input-editor');
    if (isNew) editor.dataset.placeholder = "Add a comment...";

    const submitBtn = footer.querySelector('.submit-btn');
    submitBtn.onclick = () => {
      const text = editor.innerHTML.trim();
      if (!text) {
        if (isNew) this.deleteNote(noteData.id);
        return;
      }

      if (!noteData.content) {
        noteData.content = text;
      } else {
        if (!noteData.replies) noteData.replies = [];
        noteData.replies.push({
          id: crypto.randomUUID(),
          content: text,
          createdAt: Date.now()
        });
      }

      editor.innerHTML = '';
      editor.dataset.placeholder = "Reply...";

      this.saveNoteData(noteData);
      renderThread();
      wrapper.classList.remove('open'); // Close after sending reply just to be clean
    };

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitBtn.click();
      }
    });

    // Assemble
    renderThread();
    card.appendChild(header);
    card.appendChild(scrollArea);
    card.appendChild(footer);

    wrapper.appendChild(marker);
    wrapper.appendChild(card);

    this.shadow.appendChild(wrapper);

    this.notes.set(noteData.id, {
      data: noteData,
      element: wrapper,
      renderThread: renderThread
    });

    if (isNew) {
      setTimeout(() => editor.focus(), 50);
    }

    this.updatePosition(noteData.id);
  }

  createCommentBlock(timestamp, content) {
    const block = document.createElement('div');
    block.classList.add('comment-block');

    block.innerHTML = `
      <div class="comment-content">
        <div class="comment-meta">
          <span class="time">${this.formatTime(timestamp)}</span>
        </div>
        <div class="comment-text">${content}</div>
      </div>
    `;

    return block;
  }

  updatePosition(id) {
    const note = this.notes.get(id);
    if (!note || !note.data.anchor) return;

    const anchorEl = window.FlashNoteAnchor.findElementByAnchor(note.data.anchor);
    if (!anchorEl) {
      note.element.style.display = 'none';
      return;
    }

    note.element.style.display = '';

    const rect = anchorEl.getBoundingClientRect();

    let offsetX = note.data.markerOffsetX !== undefined ? note.data.markerOffsetX : -24;
    let offsetY = note.data.markerOffsetY !== undefined ? note.data.markerOffsetY : -36;

    let posX = rect.right + offsetX;
    let posY = rect.top + offsetY;

    note.element.style.left = posX + 'px';
    note.element.style.top = posY + 'px';

    // Also update tail rotation natively
    const marker = note.element.querySelector('.custom-red-marker');
    if (marker) {
      // Need to wait for next frame to ensure marker has updated bounding rect
      requestAnimationFrame(() => {
        this.updateTailRotation(marker, rect);
      });
    }
  }

  updateAllPositions() {
    for (const id of this.notes.keys()) {
      this.updatePosition(id);
    }
  }

  deleteNote(id) {
    const note = this.notes.get(id);
    if (note) {
      note.element.remove();
      this.notes.delete(id);

      chrome.storage.local.get(['floating_notes'], (res) => {
        let notes = res.floating_notes || [];
        notes = notes.filter(n => n.id !== id);
        chrome.storage.local.set({ floating_notes: notes });
        chrome.runtime.sendMessage({ type: 'floating-note-deleted', id });
      });
    }
  }

  saveNoteData(noteData) {
    chrome.storage.local.get(['floating_notes'], (res) => {
      let notes = res.floating_notes || [];
      const index = notes.findIndex(n => n.id === noteData.id);

      noteData.updatedAt = Date.now();

      if (index >= 0) {
        notes[index] = noteData;
      } else {
        notes.push(noteData);
      }

      chrome.storage.local.set({ floating_notes: notes }, () => {
        chrome.runtime.sendMessage({ type: 'floating-note-updated', note: noteData });
      });
    });
  }

  loadNotesForCurrentPage() {
    const currentUrl = window.location.href.split('#')[0];
    chrome.storage.local.get(['floating_notes'], (res) => {
      const notes = res.floating_notes || [];
      const pageNotes = notes.filter(n => n.url === currentUrl);

      pageNotes.forEach(noteData => {
        if (!this.notes.has(noteData.id)) {
          this.createNoteCard(noteData);
        }
      });
    });
  }

  scrollToNote(id) {
    const note = this.notes.get(id);
    if (note) {
      this.closeAllPopups();
      note.element.classList.add('open');

      const marker = note.element.querySelector('.custom-red-marker');
      if (marker) {
        marker.style.transform = 'scale(1.5)';
        setTimeout(() => marker.style.transform = '', 300);
      }

      const anchorEl = window.FlashNoteAnchor.findElementByAnchor(note.data.anchor);
      if (anchorEl) {
        anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

window.FlashNoteFloatingUI = FloatingUI;
