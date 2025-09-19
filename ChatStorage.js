class ChatStorage {
  constructor() {
    this.MAX_CHATS = 15;
    this.chats = this.loadChats();
  }

  // Load chats from localStorage
  loadChats() {
    try {
      return JSON.parse(localStorage.getItem('swasthya_chats')) || [];
    } catch {
      return [];
    }
  }

  // Save new chat session
  // in ChatStorage (client-side)
saveChat(sessionId, messages, summary = '') {
  const chat = {
    id: sessionId,
    timestamp: new Date().toISOString(),
    title: summary || this.generateTitle(messages),
    messageCount: messages.length,
    preview: messages.slice(-2).map(m => (m.content||'').substring(0,30) + ((m.content||'').length>30 ? '...' : '')).join(' | '),
    summary: summary || (messages[0] && messages[0].content) || 'Chat'
  };

  // refresh local array, remove any existing same-id
  this.chats = this.loadChats().filter(c => c.id !== sessionId);
  this.chats.unshift(chat);
  this.chats = this.chats.slice(0, this.MAX_CHATS);
  localStorage.setItem('swasthya_chats', JSON.stringify(this.chats));

  // store full message array under a unique key
  localStorage.setItem(`swasthya_chat_${sessionId}`, JSON.stringify(messages));

  this.renderChatHistory();
}


  // Generate chat title from messages
  generateTitle(messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0].content;
      return firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
    }
    return 'Health Consultation';
  }

  // Delete specific chat
  deleteChat(chatId) {
  this.chats = this.loadChats().filter(chat => chat.id !== chatId);
  localStorage.setItem('swasthya_chats', JSON.stringify(this.chats));
  localStorage.removeItem(`swasthya_chat_${chatId}`);
  this.renderChatHistory();
}

saveCurrentChat() {
  if (currentMessages.length > 0) {
    const summary = this.generateChatSummary(currentMessages);
    this.chatStorage.saveChat(this.currentSessionId, currentMessages, summary);
  }
}
  // Get full chat by ID
  getChatById(chatId) {
    try {
      return JSON.parse(localStorage.getItem(`swasthya_chat_${chatId}`)) || [];
    } catch {
      return [];
    }
  }

  // Render chat history in sidebar
  renderChatHistory() {
    const historyContainer = document.getElementById('chat-history');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';
    this.chats.forEach(chat => {
      const chatDiv = document.createElement('div');
      chatDiv.className = 'chat-item';
      chatDiv.dataset.chatId = chat.id;
      chatDiv.innerHTML = `
        <strong>${chat.title}</strong><br>
        <small>${new Date(chat.timestamp).toLocaleString()}</small><br>
        <small>${chat.preview}</small>
        <button class="delete-chat" data-chat-id="${chat.id}">Delete</button>
      `;
      chatDiv.addEventListener  ('click', (e) => {
        if (e.target.classList.contains('delete-chat')) {
          e.stopPropagation();
          this.deleteChat(chat.id);
        } else {
          loadChatSession(chat.id);
        }
      });
      historyContainer.appendChild(chatDiv);
    });
  } 
  
  // Clear all chats
  clearAll() {
    this.chats = [];
    localStorage.removeItem('swasthya_chats');
  }

  // Get chat statistics
  getStats() {
    return {
      totalChats: this.chats.length,
      maxChats: this.MAX_CHATS,
      oldestChat: this.chats.length > 0 ? this.chats[this.chats.length - 1].timestamp : null
    };
  }
}
