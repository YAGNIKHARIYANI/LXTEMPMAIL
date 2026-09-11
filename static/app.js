// LX TEMP MAIL - Client Application Logic
// Developed by Yagnik Hariyani & Vaidehi Hariyani

class LxTempMailApp {
  constructor() {
    this.token = localStorage.getItem('lx_token') || localStorage.getItem('tempmail_token') || null;
    this.mailbox = localStorage.getItem('lx_mailbox') || localStorage.getItem('tempmail_mailbox') || null;
    this.messages = [];
    this.selectedMessageId = null;
    this.pollIntervalSeconds = 10;
    this.countdown = this.pollIntervalSeconds;
    this.pollTimer = null;
    this.countdownTimer = null;
    this.soundEnabled = localStorage.getItem('lx_sound') !== 'false';
    this.theme = localStorage.getItem('lx_theme') || 'dark';

    this.initTheme();
    this.initElements();
    this.bindEvents();
    this.initApp();
  }

  initTheme() {
    if (this.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      this.theme = 'dark';
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('lx_theme', this.theme);
    this.initTheme();
    this.showToast(`Switched to ${this.theme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  initElements() {
    // Header & Controls
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.iconSound = document.getElementById('icon-sound');

    // Mailbox Hero Card
    this.emailInput = document.getElementById('email-address-input');
    this.btnCopyEmail = document.getElementById('btn-copy-email');
    this.btnCopyEmailInline = document.getElementById('btn-copy-email-inline');
    this.btnRefresh = document.getElementById('btn-refresh');
    this.btnRefreshIcon = document.getElementById('btn-refresh-icon');
    this.refreshTimerBadge = document.getElementById('refresh-timer-badge');
    this.refreshProgressBar = document.getElementById('refresh-progress-bar');
    this.btnChangeEmail = document.getElementById('btn-change-email');
    this.btnQrCode = document.getElementById('btn-qrcode');

    // Inbox elements
    this.messagesCountBadge = document.getElementById('messages-count-badge');
    this.messagesContainer = document.getElementById('messages-list-container');
    this.inboxEmptyState = document.getElementById('inbox-empty-state');
    this.searchInput = document.getElementById('search-input');
    this.syncStatus = document.getElementById('sync-status');

    // Reader elements
    this.readerPlaceholder = document.getElementById('reader-placeholder');
    this.readerContent = document.getElementById('reader-content');
    this.emailViewSubject = document.getElementById('email-view-subject');
    this.emailViewFrom = document.getElementById('email-view-from');
    this.emailViewTo = document.getElementById('email-view-to');
    this.emailViewDate = document.getElementById('email-view-date');
    this.emailSenderAvatar = document.getElementById('email-sender-avatar');
    this.emailBodyIframe = document.getElementById('email-body-iframe');
    this.emailAttachmentsSection = document.getElementById('email-attachments-section');
    this.emailAttachmentsCount = document.getElementById('email-attachments-count');
    this.emailAttachmentsList = document.getElementById('email-attachments-list');
    this.btnViewRawSource = document.getElementById('btn-view-raw-source');
    this.btnDeleteSelectedEmail = document.getElementById('btn-delete-selected-email');
    this.btnOpenEmailWindow = document.getElementById('btn-open-email-window');

    // Layout Panels & Mobile Navigation
    this.inboxPanel = document.getElementById('inbox-panel');
    this.readerPanel = document.getElementById('message-reader-panel');
    this.btnMobileBack = document.getElementById('btn-mobile-back');

    // Modals
    this.modalQrCode = document.getElementById('modal-qrcode');
    this.btnCloseQrCode = document.getElementById('btn-close-qrcode');
    this.qrcodeCanvas = document.getElementById('qrcode-canvas');
    this.modalQrCodeText = document.getElementById('modal-qrcode-text');

    this.modalRawSource = document.getElementById('modal-raw-source');
    this.btnCloseRawSource = document.getElementById('btn-close-raw-source');
    this.rawSourceText = document.getElementById('raw-source-text');
    this.btnCopyRawSource = document.getElementById('btn-copy-raw-source');

    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
    this.btnToggleSound.addEventListener('click', () => this.toggleSound());

    this.btnCopyEmail.addEventListener('click', () => this.copyEmailToClipboard());
    this.btnCopyEmailInline.addEventListener('click', () => this.copyEmailToClipboard());
    this.btnRefresh.addEventListener('click', () => this.handleManualRefresh());
    this.btnChangeEmail.addEventListener('click', () => this.handleGenerateNewMailbox());

    if (this.btnMobileBack) {
      this.btnMobileBack.addEventListener('click', () => this.backToInboxMobile());
    }

    this.btnQrCode.addEventListener('click', () => this.openQrCodeModal());
    this.btnCloseQrCode.addEventListener('click', () => this.closeQrCodeModal());
    this.modalQrCode.addEventListener('click', (e) => {
      if (e.target === this.modalQrCode) this.closeQrCodeModal();
    });

    this.btnViewRawSource.addEventListener('click', () => this.handleViewRawSource());
    this.btnCloseRawSource.addEventListener('click', () => this.closeRawSourceModal());
    this.modalRawSource.addEventListener('click', (e) => {
      if (e.target === this.modalRawSource) this.closeRawSourceModal();
    });
    this.btnCopyRawSource.addEventListener('click', () => this.copyRawSourceToClipboard());

    this.btnDeleteSelectedEmail.addEventListener('click', () => this.handleDeleteSelectedEmail());
    this.btnOpenEmailWindow.addEventListener('click', () => this.handlePopoutEmail());

    this.searchInput.addEventListener('input', () => this.renderMessagesList());

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        if (this.inboxPanel) this.inboxPanel.classList.remove('hidden');
        if (this.readerPanel) this.readerPanel.classList.remove('hidden');
      } else {
        if (!this.selectedMessageId) {
          if (this.inboxPanel) this.inboxPanel.classList.remove('hidden');
          if (this.readerPanel) this.readerPanel.classList.add('hidden');
        }
      }
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  showMobileReader() {
    if (window.innerWidth < 1024) {
      if (this.inboxPanel) this.inboxPanel.classList.add('hidden');
      if (this.readerPanel) {
        this.readerPanel.classList.remove('hidden');
        this.readerPanel.classList.add('flex');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backToInboxMobile() {
    this.selectedMessageId = null;
    this.renderMessagesList();
    if (window.innerWidth < 1024) {
      if (this.inboxPanel) this.inboxPanel.classList.remove('hidden');
      if (this.readerPanel) {
        this.readerPanel.classList.add('hidden');
        this.readerPanel.classList.remove('flex');
      }
    }
  }

  async initApp() {
    this.updateSoundIcon();

    if (this.token && this.mailbox) {
      this.emailInput.value = this.mailbox;
      try {
        await this.fetchMessages(true);
        this.startPolling();
        return;
      } catch (e) {
        console.warn('Saved token expired or invalid, creating new mailbox...', e);
      }
    }

    await this.handleGenerateNewMailbox();
  }

  async handleGenerateNewMailbox() {
    this.emailInput.value = 'Generating live email...';
    this.setLoading(true);

    try {
      const resp = await fetch('/api/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      this.token = data.token;
      this.mailbox = data.mailbox;
      this.messages = [];
      this.selectedMessageId = null;

      localStorage.setItem('lx_token', this.token);
      localStorage.setItem('lx_mailbox', this.mailbox);

      this.emailInput.value = this.mailbox;
      this.renderMessagesList();
      this.resetReader();
      this.showToast('New temporary address ready!', 'success');

      this.startPolling();
    } catch (err) {
      console.error('Error creating mailbox:', err);
      this.emailInput.value = 'Failed to generate email';
      this.showToast('Failed to create mailbox. Please retry.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdown = this.pollIntervalSeconds;
    this.updateProgressBar();

    this.countdownTimer = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        this.countdown = this.pollIntervalSeconds;
      }
      this.refreshTimerBadge.textContent = `${this.countdown}s`;
      this.updateProgressBar();
    }, 1000);

    this.pollTimer = setInterval(async () => {
      await this.fetchMessages(false);
    }, this.pollIntervalSeconds * 1000);
  }

  updateProgressBar() {
    const percentage = ((this.pollIntervalSeconds - this.countdown) / this.pollIntervalSeconds) * 100;
    this.refreshProgressBar.style.width = `${100 - percentage}%`;
  }

  async handleManualRefresh() {
    this.btnRefreshIcon.classList.add('animate-spin');
    await this.fetchMessages(true);
    setTimeout(() => {
      this.btnRefreshIcon.classList.remove('animate-spin');
    }, 500);
    this.countdown = this.pollIntervalSeconds;
    this.updateProgressBar();
  }

  async fetchMessages(isManual = false) {
    if (!this.token) return;

    try {
      this.syncStatus.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>
        <span>Syncing...</span>
      `;

      const resp = await fetch('/api/messages', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (resp.status === 401) {
        await this.handleGenerateNewMailbox();
        return;
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const newMessages = data.messages || [];
      const prevCount = this.messages.length;

      if (newMessages.length > prevCount) {
        const diff = newMessages.length - prevCount;
        this.playNotificationSound();
        this.showToast(`📩 ${diff} new email(s) received!`, 'success');
      }

      this.messages = newMessages;
      this.renderMessagesList();

      if (isManual) {
        this.showToast('Inbox updated', 'info');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      this.syncStatus.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
        <span>Live Sync</span>
      `;
    }
  }

  parseSender(rawFrom) {
    if (!rawFrom) return { name: 'Unknown Sender', email: '', initial: 'U' };
    
    let name = '';
    let email = '';

    const matchWithAngle = rawFrom.match(/^(?:"?([^"<]+)"?\s*)?<([^>]+)>/);
    if (matchWithAngle) {
      name = (matchWithAngle[1] || '').trim().replace(/^["']|["']$/g, '');
      email = (matchWithAngle[2] || '').trim();
    } else {
      name = rawFrom.replace(/^["']|["']$/g, '').trim();
      if (name.includes('@')) {
        email = name;
        name = name.split('@')[0];
      }
    }

    if (!name && email) {
      name = email.split('@')[0];
    }

    const cleanForInitial = (name || email || 'U').replace(/[^a-zA-Z0-9]/g, '');
    const initial = cleanForInitial.charAt(0).toUpperCase() || 'U';

    return {
      name: name || email || 'Unknown',
      email: email || '',
      initial: initial,
      full: rawFrom
    };
  }

  parseDate(dateVal) {
    if (!dateVal) return new Date();
    if (typeof dateVal === 'number') {
      return new Date(dateVal < 1e11 ? dateVal * 1000 : dateVal);
    }
    if (typeof dateVal === 'string') {
      const num = Number(dateVal);
      if (!isNaN(num) && num > 0) {
        return new Date(num < 1e11 ? num * 1000 : num);
      }
      return new Date(dateVal);
    }
    return new Date(dateVal);
  }

  formatDate(dateVal) {
    if (!dateVal) return '';
    try {
      const d = this.parseDate(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);

      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);

      if (diffSec < 0 || diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (diffSec < 86400 * 7) {
        return `${Math.floor(diffSec / 86400)}d ago`;
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    } catch (e) {
      return String(dateVal);
    }
  }

  formatDateFull(dateVal) {
    if (!dateVal) return '';
    try {
      const d = this.parseDate(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleString([], {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return String(dateVal);
    }
  }

  renderMessagesList() {
    const query = (this.searchInput.value || '').trim().toLowerCase();
    const filtered = this.messages.filter(m => {
      if (!query) return true;
      const from = (m.from || '').toLowerCase();
      const subject = (m.subject || '').toLowerCase();
      const bodyPreview = (m.bodyPreview || '').toLowerCase();
      return from.includes(query) || subject.includes(query) || bodyPreview.includes(query);
    });

    this.messagesCountBadge.textContent = this.messages.length;

    const existingCards = this.messagesContainer.querySelectorAll('.message-card-item');
    existingCards.forEach(c => c.remove());

    if (filtered.length === 0) {
      this.inboxEmptyState.classList.remove('hidden');
      return;
    }

    this.inboxEmptyState.classList.add('hidden');

    filtered.forEach(msg => {
      const id = msg._id || msg.id;
      const isSelected = this.selectedMessageId === id;
      const sender = this.parseSender(msg.from);
      const formattedDate = this.formatDate(msg.receivedAt || msg.createdAt);
      const attachmentsCount = msg.attachmentsCount || (msg.attachments ? msg.attachments.length : 0);
      const previewText = msg.bodyPreview || msg.subject || 'Click to inspect message';

      const card = document.createElement('div');
      card.className = `message-card-item p-3.5 rounded-xl cursor-pointer transition-all duration-150 border ${
        isSelected
          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 shadow-md ring-1 ring-indigo-500'
          : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      }`;

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2 mb-1">
          <div class="flex items-center space-x-2.5 truncate">
            <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
              ${sender.initial}
            </div>
            <div class="truncate">
              <span class="text-xs font-bold text-slate-900 dark:text-white truncate block">${this.escapeHtml(sender.name)}</span>
              ${sender.email ? `<span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block">${this.escapeHtml(sender.email)}</span>` : ''}
            </div>
          </div>
          <span class="text-[11px] font-mono text-slate-600 dark:text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60">${formattedDate}</span>
        </div>
        <div class="text-xs font-bold text-indigo-600 dark:text-indigo-300 truncate pl-9 mb-1">
          ${this.escapeHtml(msg.subject || '(No Subject)')}
        </div>
        <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-9">
          <span class="truncate text-[11px]">${this.escapeHtml(previewText)}</span>
          ${attachmentsCount > 0 ? `
            <span class="flex items-center space-x-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/40 shrink-0 ml-2">
              <i data-lucide="paperclip" class="w-3 h-3"></i>
              <span>${attachmentsCount}</span>
            </span>
          ` : ''}
        </div>
      `;

      card.addEventListener('click', () => this.selectMessage(id));
      this.messagesContainer.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  async selectMessage(messageId) {
    this.selectedMessageId = messageId;
    this.renderMessagesList();
    this.showMobileReader();

    this.readerPlaceholder.classList.add('hidden');
    this.readerContent.classList.remove('hidden');

    this.emailViewSubject.textContent = 'Loading email...';
    this.emailViewFrom.innerHTML = `<span>...</span>`;
    this.emailViewTo.textContent = this.mailbox;
    this.emailViewDate.innerHTML = `<span>...</span>`;
    this.emailBodyIframe.srcdoc = `
      <div style="font-family:sans-serif;color:#64748b;padding:30px;text-align:center;">
        <p>Loading email content securely...</p>
      </div>
    `;

    try {
      const resp = await fetch(`/api/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const msg = await resp.json();

      this.currentMessageData = msg;
      const sender = this.parseSender(msg.from);

      this.emailViewSubject.textContent = msg.subject || '(No Subject)';
      this.emailViewFrom.innerHTML = `
        <span class="font-bold text-slate-900 dark:text-white">${this.escapeHtml(sender.name)}</span>
        ${sender.email ? `<span class="text-slate-500 dark:text-slate-400 font-mono text-xs ml-1">&lt;${this.escapeHtml(sender.email)}&gt;</span>` : ''}
      `;
      this.emailSenderAvatar.textContent = sender.initial;
      this.emailViewDate.innerHTML = `
        <i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
        <span>${this.formatDateFull(msg.receivedAt || msg.createdAt)}</span>
      `;

      const bodyHtml = msg.bodyHtml || `<pre style="font-family:monospace;white-space:pre-wrap;padding:20px;">${this.escapeHtml(msg.body || msg.bodyPreview || '(No body content)')}</pre>`;
      this.emailBodyIframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 18px; margin: 0; color: #1e293b; line-height: 1.6; }
            a { color: #4f46e5; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
        </html>
      `;

      const attachments = msg.attachments || [];
      if (attachments.length > 0) {
        this.emailAttachmentsSection.classList.remove('hidden');
        this.emailAttachmentsCount.textContent = attachments.length;
        this.emailAttachmentsList.innerHTML = '';

        attachments.forEach(att => {
          const attId = att._id || att.id;
          const name = att.filename || 'attachment';
          const sizeKb = att.size ? Math.round(att.size / 1024) : 0;

          const chip = document.createElement('a');
          chip.href = `/api/messages/${messageId}/attachment/${attId}?authorization=Bearer ${this.token}`;
          chip.target = '_blank';
          chip.className = 'inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition';
          chip.innerHTML = `
            <i data-lucide="file-down" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
            <span class="font-semibold truncate max-w-[150px]">${this.escapeHtml(name)}</span>
            ${sizeKb > 0 ? `<span class="text-[10px] text-slate-500">(${sizeKb} KB)</span>` : ''}
          `;
          this.emailAttachmentsList.appendChild(chip);
        });
      } else {
        this.emailAttachmentsSection.classList.add('hidden');
      }

      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (err) {
      console.error('Error fetching message details:', err);
      this.showToast('Failed to load message body.', 'error');
    }
  }

  async handleDeleteSelectedEmail() {
    if (!this.selectedMessageId) return;
    if (!confirm('Are you sure you want to delete this email?')) return;

    try {
      const resp = await fetch(`/api/messages/${this.selectedMessageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      this.messages = this.messages.filter(m => (m._id || m.id) !== this.selectedMessageId);
      this.selectedMessageId = null;
      this.resetReader();
      this.renderMessagesList();
      this.backToInboxMobile();
      this.showToast('Email deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting message:', err);
      this.showToast('Failed to delete email.', 'error');
    }
  }

  async handleViewRawSource() {
    if (!this.selectedMessageId) return;

    this.modalRawSource.classList.remove('hidden');
    this.modalRawSource.classList.add('flex');
    this.rawSourceText.textContent = 'Fetching raw RFC822 source headers...';

    try {
      const resp = await fetch(`/api/messages/${this.selectedMessageId}/source`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const source = await resp.text();
      this.rawSourceText.textContent = source;
    } catch (err) {
      this.rawSourceText.textContent = 'Failed to load raw source.';
    }
  }

  closeRawSourceModal() {
    this.modalRawSource.classList.add('hidden');
    this.modalRawSource.classList.remove('flex');
  }

  copyRawSourceToClipboard() {
    const text = this.rawSourceText.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Raw source copied to clipboard!', 'success');
    });
  }

  handlePopoutEmail() {
    if (!this.currentMessageData) return;
    const sender = this.parseSender(this.currentMessageData.from);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.escapeHtml(this.currentMessageData.subject || 'LX Temp Mail Message')}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; line-height: 1.6; color: #1e293b; }
            .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
            .subject { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
            .meta { color: #64748b; font-size: 13px; line-height: 1.8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="subject">${this.escapeHtml(this.currentMessageData.subject || '(No Subject)')}</div>
            <div class="meta">
              <div><strong>From:</strong> ${this.escapeHtml(sender.name)} &lt;${this.escapeHtml(sender.email)}&gt;</div>
              <div><strong>Date:</strong> ${this.formatDateFull(this.currentMessageData.receivedAt || this.currentMessageData.createdAt)}</div>
            </div>
          </div>
          <div>${this.currentMessageData.bodyHtml || ''}</div>
        </body>
        </html>
      `);
      win.document.close();
    }
  }

  openQrCodeModal() {
    if (!this.mailbox) return;
    this.qrcodeCanvas.innerHTML = '';
    this.modalQrCodeText.textContent = this.mailbox;

    new QRCode(this.qrcodeCanvas, {
      text: this.mailbox,
      width: 180,
      height: 180,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    this.modalQrCode.classList.remove('hidden');
    this.modalQrCode.classList.add('flex');
  }

  closeQrCodeModal() {
    this.modalQrCode.classList.add('hidden');
    this.modalQrCode.classList.remove('flex');
  }

  copyEmailToClipboard() {
    if (!this.mailbox) return;
    navigator.clipboard.writeText(this.mailbox).then(() => {
      const copyText = document.getElementById('btn-copy-text');
      if (copyText) copyText.textContent = 'Copied!';
      this.showToast(`Copied to clipboard: ${this.mailbox}`, 'success');

      setTimeout(() => {
        if (copyText) copyText.textContent = 'Copy Address';
      }, 2000);
    });
  }

  resetReader() {
    this.readerPlaceholder.classList.remove('hidden');
    this.readerContent.classList.add('hidden');
    this.currentMessageData = null;
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.emailInput.classList.add('shimmer');
    } else {
      this.emailInput.classList.remove('shimmer');
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('lx_sound', this.soundEnabled);
    this.updateSoundIcon();
    this.showToast(this.soundEnabled ? 'Audio notification enabled' : 'Audio notification muted', 'info');
    if (this.soundEnabled) {
      this.playNotificationSound();
    }
  }

  updateSoundIcon() {
    this.iconSound.setAttribute('data-lucide', this.soundEnabled ? 'volume-2' : 'volume-x');
    this.btnToggleSound.classList.toggle('text-indigo-600', this.soundEnabled);
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  playNotificationSound() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // AudioContext fallback
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-900/90 dark:bg-emerald-950/90 border-emerald-500/50 text-white',
      error: 'bg-rose-900/90 dark:bg-rose-950/90 border-rose-500/50 text-white',
      info: 'bg-slate-900/95 dark:bg-slate-900/95 border-indigo-500/40 text-white'
    };

    toast.className = `px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center space-x-2 transition-all transform duration-200 translate-y-2 opacity-0 pointer-events-auto ${colors[type] || colors.info}`;
    toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;

    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new LxTempMailApp();
});
