// floating-ui.js - Handles the Shadow DOM UI for floating comments (Figma Style)

class FloatingUI {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'flash-note-floating-container';
    this.container.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483647;';

    this.shadow = this.container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

      :host {
        --fn-bg:          #FFFEFB;
        --fn-bg2:         #F5F2ED;
        --fn-bg3:         #F0EDE8;
        --fn-ink:         #1C1917;
        --fn-ink2:        #57534E;
        --fn-ink3:        #A8A29E;
        --fn-border:      #E7E3DC;
        --fn-border2:     #D6D0C8;
        --fn-amber:       #D97706;
        --fn-amber-bg:    #FEF3C7;
        --fn-amber-dim:   #92400E;
        --fn-danger:      #DC2626;
        --fn-danger-bg:   #FEE2E2;
        --fn-shadow:      0 8px 24px rgba(28, 25, 23, 0.10), 0 2px 6px rgba(28, 25, 23, 0.06);
        --fn-shadow-sm:   0 2px 8px rgba(28, 25, 23, 0.08);
        --fn-mono:        'DM Mono', 'Courier New', monospace;
        --fn-sans:        'DM Sans', system-ui, sans-serif;
        --fn-r:           6px;
        --fn-r2:          10px;
        --fn-r3:          14px;
      }

      @media (prefers-color-scheme: dark) {
        :host(:not([data-theme="light"])) {
          --fn-bg:          #18181B;
          --fn-bg2:         #09090B;
          --fn-bg3:         #27272A;
          --fn-ink:         #FAFAFA;
          --fn-ink2:        #D4D4D8;
          --fn-ink3:        #A1A1AA;
          --fn-border:      #27272A;
          --fn-border2:     #3F3F46;
          --fn-amber:       #F59E0B;
          --fn-amber-bg:    #451A03;
          --fn-amber-dim:   #FCD34D;
          --fn-danger:      #EF4444;
          --fn-danger-bg:   #450A0A;
          --fn-shadow:      0 12px 32px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25);
          --fn-shadow-sm:   0 4px 12px rgba(0, 0, 0, 0.3);
        }
      }

      :host([data-theme="dark"]) {
        --fn-bg:          #18181B;
        --fn-bg2:         #09090B;
        --fn-bg3:         #27272A;
        --fn-ink:         #FAFAFA;
        --fn-ink2:        #D4D4D8;
        --fn-ink3:        #A1A1AA;
        --fn-border:      #27272A;
        --fn-border2:     #3F3F46;
        --fn-amber:       #F59E0B;
        --fn-amber-bg:    #451A03;
        --fn-amber-dim:   #FCD34D;
        --fn-danger:      #EF4444;
        --fn-danger-bg:   #450A0A;
        --fn-shadow:      0 12px 32px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25);
        --fn-shadow-sm:   0 4px 12px rgba(0, 0, 0, 0.3);
      }

      :host([data-theme="light"]) {
        --fn-bg:          #FFFEFB;
        --fn-bg2:         #F5F2ED;
        --fn-bg3:         #F0EDE8;
        --fn-ink:         #1C1917;
        --fn-ink2:        #57534E;
        --fn-ink3:        #A8A29E;
        --fn-border:      #E7E3DC;
        --fn-border2:     #D6D0C8;
        --fn-amber:       #D97706;
        --fn-amber-bg:    #FEF3C7;
        --fn-amber-dim:   #92400E;
        --fn-danger:      #DC2626;
        --fn-danger-bg:   #FEE2E2;
        --fn-shadow:      0 8px 24px rgba(28, 25, 23, 0.10), 0 2px 6px rgba(28, 25, 23, 0.06);
        --fn-shadow-sm:   0 2px 8px rgba(28, 25, 23, 0.08);
      }

      /* ── WRAPPER ── */
      .note-wrapper {
        position: absolute;
        pointer-events: auto;
        z-index: 1;
        will-change: transform;
        transition: opacity 0.2s;
      }

      .note-wrapper.open {
        z-index: 10;
      }

      /* ── MARKER ── */
      .custom-red-marker {
        position: relative;
        width: 32px;
        height: 32px;
        cursor: grab;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: 6;
      }

      .custom-red-marker:active {
        cursor: grabbing;
      }

      .custom-red-marker:hover {
        transform: scale(1.1) translateY(-2px);
      }

      .marker-bubble {
        width: 100%;
        height: 100%;
        background: var(--fn-amber);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
        box-shadow: var(--fn-shadow-sm);
      }

      .marker-bubble svg {
        width: 14px;
        height: 14px;
        stroke: white;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      /* amber dot indicator */
      .marker-bubble::after {
        content: '';
        position: absolute;
        top: -2px;
        right: -2px;
        width: 9px;
        height: 9px;
        background: var(--fn-ink);
        border-radius: 50%;
        border: 2px solid var(--fn-bg);
      }

      /* ── DYNAMIC TAIL ── */
      .dynamic-tail-container {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        z-index: 1;
        pointer-events: none;
      }

      .dynamic-tail {
        position: absolute;
        left: 10px;
        top: -5px;
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-left: 10px solid var(--fn-ink);
        opacity: 0.5;
      }

      /* ── DRAG OVERLAY ── */
      .drag-highlight-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 4;
        display: none;
      }

      .drag-highlight-overlay.active {
        display: block;
      }

      .drag-highlight-box {
        position: absolute;
        box-shadow: 0 0 0 9999px rgba(28, 25, 23, 0.45);
        border: 1.5px solid var(--fn-amber);
        border-radius: var(--fn-r);
        transition: all 0.08s ease;
      }

      /* ── FIGMA CARD ── */
      .figma-card {
        position: absolute;
        top: 38px;
        left: 50%;
        transform: translateX(-50%) scale(0.96);
        opacity: 0;
        visibility: hidden;
        width: 320px;
        background: var(--fn-bg);
        border: 1px solid var(--fn-border);
        border-radius: var(--fn-r3);
        box-shadow: var(--fn-shadow);
        display: flex;
        flex-direction: column;
        transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                    visibility 0.18s;
        pointer-events: none;
        z-index: 10;
        overflow: hidden;
      }

      .note-wrapper.open .figma-card {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) scale(1);
        pointer-events: auto;
      }

      /* ── CARD HEADER ── */
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px 10px 14px;
        border-bottom: 1px solid var(--fn-border);
        background: var(--fn-bg2);
      }

      .header-title {
        font-family: var(--fn-mono);
        font-weight: 500;
        font-size: 11px;
        letter-spacing: 0.06em;
        color: var(--fn-ink3);
        text-transform: lowercase;
      }

      .header-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .icon-btn {
        width: 26px;
        height: 26px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--fn-r);
        color: var(--fn-ink3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.12s, color 0.12s, border-color 0.12s;
        font-family: var(--fn-sans);
      }

      .icon-btn:hover {
        background: var(--fn-bg3);
        border-color: var(--fn-border2);
        color: var(--fn-ink);
      }

      .icon-btn.resolve-btn:hover {
        background: var(--fn-danger-bg);
        border-color: #FECACA;
        color: var(--fn-danger);
      }

      .icon-btn svg {
        width: 14px;
        height: 14px;
      }

      /* ── SCROLL AREA ── */
      .card-scroll-area {
        max-height: 320px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        background: var(--fn-bg);
      }

      .card-scroll-area::-webkit-scrollbar {
        width: 3px;
      }

      .card-scroll-area::-webkit-scrollbar-track {
        background: transparent;
      }

      .card-scroll-area::-webkit-scrollbar-thumb {
        background: var(--fn-border2);
        border-radius: 2px;
      }

      /* ── COMMENT BLOCK ── */
      .comment-block {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--fn-border);
      }

      .comment-block:last-child {
        border-bottom: none;
      }

      .comment-block.is-reply {
        padding-left: 22px;
        background: var(--fn-bg2);
        border-left: 2px solid var(--fn-border2);
        margin-left: 14px;
        margin-right: 0;
        border-bottom-color: var(--fn-border);
      }

      .comment-meta {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .meta-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--fn-amber);
        flex-shrink: 0;
      }

      .comment-block.is-reply .meta-dot {
        background: var(--fn-ink3);
        width: 4px;
        height: 4px;
      }

      .time {
        font-family: var(--fn-mono);
        font-size: 10px;
        color: var(--fn-ink3);
        letter-spacing: 0.03em;
      }

      .comment-text {
        font-family: var(--fn-mono);
        font-size: 13px;
        line-height: 1.6;
        color: var(--fn-ink);
        word-break: break-word;
      }

      /* ── FOOTER INPUT ── */
      .card-footer {
        display: flex;
        flex-direction: column;
        background: var(--fn-bg);
        border-top: 1px solid var(--fn-border);
      }

      .input-container {
        display: flex;
        flex-direction: column;
        background: var(--fn-bg2);
        border: 1px solid transparent;
        margin: 10px;
        border-radius: var(--fn-r2);
        transition: border-color 0.18s;
        overflow: hidden;
      }

      .input-container:focus-within {
        border-color: var(--fn-ink);
        background: var(--fn-bg);
      }

      .input-editor {
        padding: 10px 12px 6px;
        font-family: var(--fn-mono);
        font-size: 13px;
        line-height: 1.6;
        color: var(--fn-ink);
        outline: none;
        min-height: 20px;
        max-height: 120px;
        overflow-y: auto;
        word-break: break-word;
      }

      .input-editor:empty::before {
        content: attr(data-placeholder);
        color: var(--fn-ink3);
        font-style: italic;
        pointer-events: none;
      }

      .input-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 4px 8px 8px;
        gap: 6px;
      }

      .input-hint {
        font-family: var(--fn-mono);
        font-size: 10px;
        color: var(--fn-ink3);
        margin-right: auto;
        letter-spacing: 0.02em;
      }

      .submit-btn {
        height: 26px;
        padding: 0 12px;
        border-radius: 20px;
        background: var(--fn-amber);
        border: none;
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        color: white;
        font-family: var(--fn-mono);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.04em;
        transition: opacity 0.15s;
      }

      .submit-btn:hover {
        opacity: 0.82;
      }

      .submit-btn svg {
        width: 11px;
        height: 11px;
      }

      /* ── HIDDEN ── */
      .hidden {
        display: none !important;
      }
    `;
    this.shadow.appendChild(style);

    // Drag Overlay
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
        if (node === this.container) { clickedInside = true; break; }
      }
      if (!clickedInside) this.closeAllPopups();
    });
  }

  closeAllPopups() {
    for (const note of this.notes.values()) {
      note.element.classList.remove('open');
    }
  }

  formatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  updateTailRotation(markerEl, anchorRect) {
    const tailContainer = markerEl.querySelector('.dynamic-tail-container');
    if (!tailContainer || !anchorRect) return;
    const markerRect = markerEl.getBoundingClientRect();
    const markerCX = markerRect.left + markerRect.width / 2;
    const markerCY = markerRect.top + markerRect.height / 2;
    const anchorCX = anchorRect.left + anchorRect.width / 2;
    const anchorCY = anchorRect.top + anchorRect.height / 2;
    const angle = Math.atan2(anchorCY - markerCY, anchorCX - markerCX);
    tailContainer.style.transform = `rotate(${angle}rad)`;
  }

  createNoteCard(noteData, isNew = false) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('note-wrapper');
    wrapper.dataset.id = noteData.id;
    if (isNew) wrapper.classList.add('open');

    // ── MARKER ──
    const marker = document.createElement('div');
    marker.classList.add('custom-red-marker');
    marker.innerHTML = `
      <div class="marker-bubble">
        <svg viewBox="0 0 24 24">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </div>
      <div class="dynamic-tail-container">
        <div class="dynamic-tail"></div>
      </div>
    `;

    // Drag logic
    let hasDragged = false;

    marker.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const anchorEl = window.FlashNoteAnchor.findElementByAnchor(noteData.anchor);
      if (!anchorEl) return;

      const anchorRect = anchorEl.getBoundingClientRect();

      this.dragOverlay.classList.add('active');
      this.dragBox.style.top = anchorRect.top + 'px';
      this.dragBox.style.left = anchorRect.left + 'px';
      this.dragBox.style.width = anchorRect.width + 'px';
      this.dragBox.style.height = anchorRect.height + 'px';

      const rect = wrapper.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      hasDragged = false;

      const startX = e.clientX;
      const startY = e.clientY;

      const mouseMove = (ev) => {
        if (!hasDragged) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
          hasDragged = true;
        }
        const padding = 60;
        let newLeft = ev.clientX - offsetX;
        let newTop = ev.clientY - offsetY;

        if (newLeft < anchorRect.left - padding) newLeft = anchorRect.left - padding;
        if (newLeft > anchorRect.right + padding - 30) newLeft = anchorRect.right + padding - 30;
        if (newTop < anchorRect.top - padding) newTop = anchorRect.top - padding;
        if (newTop > anchorRect.bottom + padding - 30) newTop = anchorRect.bottom + padding - 30;

        noteData.markerOffsetX = newLeft - anchorRect.right;
        noteData.markerOffsetY = newTop - anchorRect.top;

        wrapper.style.transform = `translate3d(${newLeft + window.scrollX}px, ${newTop + window.scrollY}px, 0)`;
        wrapper.style.left = '0';
        wrapper.style.top = '0';

        this.updateTailRotation(marker, anchorRect);
      };

      const mouseUp = () => {
        document.removeEventListener('mousemove', mouseMove);
        document.removeEventListener('mouseup', mouseUp);
        this.dragOverlay.classList.remove('active');
        if (hasDragged) this.saveNoteData(noteData);
      };

      document.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', mouseUp);
    });

    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hasDragged) return;
      const isOpen = wrapper.classList.contains('open');
      this.closeAllPopups();
      if (!isOpen) wrapper.classList.add('open');
    });

    // ── CARD ──
    const card = document.createElement('div');
    card.classList.add('figma-card');
    card.addEventListener('mousedown', e => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.classList.add('card-header');
    header.innerHTML = `
      <span class="header-title">comment</span>
      <div class="header-actions">
        <button class="icon-btn resolve-btn" title="Delete note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
        <button class="icon-btn close-btn" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
    header.querySelector('.close-btn').onclick = () => wrapper.classList.remove('open');
    header.querySelector('.resolve-btn').onclick = () => this.deleteNote(noteData.id);

    // Scroll area
    const scrollArea = document.createElement('div');
    scrollArea.classList.add('card-scroll-area');

    const renderThread = () => {
      scrollArea.innerHTML = '';
      if (!noteData.content) {
        scrollArea.classList.add('hidden');
        return;
      }
      scrollArea.classList.remove('hidden');
      scrollArea.appendChild(this.createCommentBlock(noteData.createdAt, noteData.content, false));
      if (noteData.replies && noteData.replies.length > 0) {
        noteData.replies.forEach(reply => {
          scrollArea.appendChild(this.createCommentBlock(reply.createdAt, reply.content, true));
        });
      }
      setTimeout(() => { scrollArea.scrollTop = scrollArea.scrollHeight; }, 50);
    };

    // Footer
    const footer = document.createElement('div');
    footer.classList.add('card-footer');

    const inputContainer = document.createElement('div');
    inputContainer.classList.add('input-container');
    inputContainer.innerHTML = `
      <div class="input-editor" contenteditable="true" data-placeholder="${isNew ? 'add a comment…' : 'reply…'}"></div>
      <div class="input-actions">
        <span class="input-hint">⌘↵ to send</span>
        <button class="submit-btn">
          send
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      </div>
    `;
    footer.appendChild(inputContainer);

    const editor = inputContainer.querySelector('.input-editor');
    const submitBtn = inputContainer.querySelector('.submit-btn');

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
        noteData.replies.push({ id: crypto.randomUUID(), content: text, createdAt: Date.now() });
      }
      editor.innerHTML = '';
      editor.dataset.placeholder = 'reply…';
      this.saveNoteData(noteData);
      renderThread();
      wrapper.classList.remove('open');
    };

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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

    // Prevent events from leaking to the website
    ['click', 'keydown', 'keyup', 'keypress', 'contextmenu', 'dblclick'].forEach(evt => {
      wrapper.addEventListener(evt, e => e.stopPropagation());
    });

    this.notes.set(noteData.id, { data: noteData, element: wrapper, renderThread });

    if (isNew) setTimeout(() => editor.focus(), 50);

    this.updatePosition(noteData.id);
  }

  createCommentBlock(timestamp, content, isReply = false) {
    const block = document.createElement('div');
    block.classList.add('comment-block');
    if (isReply) block.classList.add('is-reply');
    block.innerHTML = `
      <div class="comment-meta">
        <span class="meta-dot"></span>
        <span class="time">${this.formatTime(timestamp)}</span>
      </div>
      <div class="comment-text">${content}</div>
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
    const offsetX = note.data.markerOffsetX !== undefined ? note.data.markerOffsetX : -24;
    const offsetY = note.data.markerOffsetY !== undefined ? note.data.markerOffsetY : -36;

    const absX = rect.right + window.scrollX + offsetX;
    const absY = rect.top + window.scrollY + offsetY;

    note.element.style.transform = `translate3d(${absX}px, ${absY}px, 0)`;
    note.element.style.left = '0';
    note.element.style.top = '0';

    const marker = note.element.querySelector('.custom-red-marker');
    if (marker) {
      requestAnimationFrame(() => this.updateTailRotation(marker, rect));
    }
  }

  updateAllPositions() {
    for (const id of this.notes.keys()) this.updatePosition(id);
  }

  deleteNote(id) {
    const note = this.notes.get(id);
    if (note) {
      note.element.remove();
      this.notes.delete(id);
      chrome.storage.local.get(['floating_notes'], (res) => {
        let notes = (res.floating_notes || []).filter(n => n.id !== id);
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
      if (index >= 0) notes[index] = noteData;
      else notes.push(noteData);
      chrome.storage.local.set({ floating_notes: notes }, () => {
        chrome.runtime.sendMessage({ type: 'floating-note-updated', note: noteData });
      });
    });
  }

  loadNotesForCurrentPage() {
    const currentUrl = window.location.href.split('#')[0];
    chrome.storage.local.get(['floating_notes'], (res) => {
      const notes = (res.floating_notes || []).filter(n => n.url === currentUrl);
      notes.forEach(noteData => {
        if (!this.notes.has(noteData.id)) this.createNoteCard(noteData);
      });
    });
  }

  setTheme(theme) {
    if (theme === 'system') {
      this.container.removeAttribute('data-theme');
    } else {
      this.container.setAttribute('data-theme', theme);
    }
  }

  scrollToNote(id) {
    const note = this.notes.get(id);
    if (note) {
      this.closeAllPopups();
      note.element.classList.add('open');
      const marker = note.element.querySelector('.custom-red-marker');
      if (marker) {
        marker.style.transform = 'scale(1.4)';
        setTimeout(() => marker.style.transform = '', 350);
      }
      const anchorEl = window.FlashNoteAnchor.findElementByAnchor(note.data.anchor);
      if (anchorEl) anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

window.FlashNoteFloatingUI = FloatingUI;