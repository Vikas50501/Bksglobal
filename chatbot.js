'use strict';

/**
 * Chatbot Widget for Bharat Kataria & Co.
 * Professional AI-powered customer support and lead generation
 * Integrated with website design system
 */

class ChatbotWidget {
  constructor(configUrl = 'chatbot-config.json', apiEndpoint = '/api/chatbot') {
    this.configUrl = configUrl;
    this.apiEndpoint = apiEndpoint;
    this.config = null;
    this.isOpen = false;
    this.messages = [];
    this.conversationId = this.generateId();
    this.messageCount = 0;
    this.leadCollected = false;
    this.userInfo = {};
    this.isLoading = false;
    this.rateLimitWarn = false;
    this.sessionStartTime = Date.now();
    this.pageUrl = window.location.href;
    
    this.init();
  }

  async init() {
    try {
      // Load configuration
      await this.loadConfig();
      
      // Inject styles
      this.injectStyles();
      
      // Create UI
      this.createUI();
      
      // Bind events
      this.bindEvents();
      
      // Add to DOM
      this.render();
      
      // Auto-show chatbot (optional delay)
      setTimeout(() => {
        console.log('Chatbot initialized successfully');
      }, 500);
    } catch (error) {
      console.error('Chatbot initialization failed:', error);
    }
  }

  async loadConfig() {
    const response = await fetch(this.configUrl);
    if (!response.ok) throw new Error('Failed to load chatbot config');
    this.config = await response.json();
  }

  injectStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'chatbot.css';
    document.head.appendChild(link);
  }

  createUI() {
    // Create chatbot button
    this.button = document.createElement('button');
    this.button.className = 'chatbot-btn';
    this.button.id = 'chatbot-btn';
    this.button.setAttribute('aria-label', 'Open chat');
    this.button.innerHTML = `
      <div class="chatbot-btn-content">
        <svg class="chatbot-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="chatbot-btn-text">Chat</span>
      </div>
    `;
    
    console.log('✅ Chatbot button created:', this.button);

    // Create chat window
    this.window = document.createElement('div');
    this.window.className = 'chatbot-window';
    this.window.id = 'chatbot-window';
    this.window.innerHTML = `
      <!-- Header -->
      <div class="chatbot-header">
        <div class="chatbot-header-info">
          <div class="chatbot-avatar">${this.config.chatbot.avatar}</div>
          <div class="chatbot-header-text">
            <h3>${this.config.chatbot.name}</h3>
            <p>${this.config.chatbot.description}</p>
          </div>
        </div>
        <button class="chatbot-close" aria-label="Close chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div class="chatbot-messages" id="chatbot-messages"></div>

      <!-- Input -->
      <div class="chatbot-input-area">
        <div class="chatbot-input-wrapper">
          <input 
            type="text" 
            class="chatbot-input" 
            id="chatbot-input" 
            placeholder="${this.config.chatbot.placeholderText}"
            autocomplete="off"
          />
        </div>
        <button class="chatbot-send" id="chatbot-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <path d="M20 8v6M23 11h-6"></path>
          </svg>
        </button>
      </div>
    `;

    this.messagesContainer = this.window.querySelector('#chatbot-messages');
    this.input = this.window.querySelector('#chatbot-input');
    this.sendBtn = this.window.querySelector('#chatbot-send');
    this.closeBtn = this.window.querySelector('.chatbot-close');
  }

  bindEvents() {
    this.button.addEventListener('click', () => this.toggle());
    this.closeBtn.addEventListener('click', () => this.close());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.input.addEventListener('focus', () => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }

  render() {
    document.body.appendChild(this.button);
    document.body.appendChild(this.window);
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.button.classList.add('hidden');
    this.window.classList.add('open');
    this.input.focus();

    if (this.messages.length === 0) {
      this.addBotMessage(this.config.chatbot.welcomeMessage);
    }

    this.trackEvent('chatbot_opened');
  }

  close() {
    this.isOpen = false;
    this.button.classList.remove('hidden');
    this.window.classList.remove('open');
    this.trackEvent('chatbot_closed');
  }

  async sendMessage() {
    const text = this.input.value.trim();
    if (!text || this.isLoading) return;

    // Rate limiting check
    if (!this.checkRateLimit()) {
      this.addBotMessage('I\m receiving many messages right now. Please try again in a moment.');
      return;
    }

    // Add user message
    this.addUserMessage(text);
    this.input.value = '';
    this.messageCount++;

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Get AI response
      const response = await this.getAIResponse(text);
      this.removeTypingIndicator();
      this.addBotMessage(response.message);

      // Check if we should collect lead info (show form after first message)
      if (!this.leadCollected && this.messageCount >= 1) {
        this.showLeadCollection();
      }
    } catch (error) {
      this.removeTypingIndicator();
      this.addBotMessage('Thank you for reaching out! Our team will contact you shortly to assist with your request.');
      console.error('Chatbot error:', error);
    }

    this.trackEvent('message_sent', { messageCount: this.messageCount });
  }

  async getAIResponse(userMessage) {
    this.isLoading = true;
    this.sendBtn.disabled = true;

    try {
      const response = await fetch(this.apiEndpoint + '/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: this.conversationId,
          message: userMessage,
          context: {
            userInfo: this.userInfo,
            messageCount: this.messageCount,
            conversationHistory: this.messages.map(m => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.text
            }))
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return { message: data.message || 'Thank you for your message. Our team will assist you shortly.' };
    } catch (error) {
      console.error('API call failed:', error);
      // Fallback response
      return { message: 'Thank you for your message! Our team has received your inquiry and will contact you shortly with more information.' };
    } finally {
      this.isLoading = false;
      this.sendBtn.disabled = false;
    }
  }

  showLeadCollection() {
    this.addBotMessage('Thank you for reaching out! Please share your details below. We will contact you shortly to discuss your requirements.');
    
    const formHtml = this.buildLeadForm();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-msg bot';
    msgDiv.innerHTML = formHtml;
    this.messagesContainer.appendChild(msgDiv);
    this.scrollToBottom();
  }

  buildLeadForm() {
    let html = '<div class="chatbot-msg-content" style="max-width: 100%;">';
    
    this.config.leadCollection.fields.forEach(field => {
      html += `
        <div class="chatbot-form-group">
          <label for="lead-${field.id}">${field.name}${field.required ? ' <span style="color: #ff6b6b;">*</span>' : ''}</label>
          ${field.type === 'textarea' 
            ? `<textarea id="lead-${field.id}" placeholder="${field.placeholder}" data-field="${field.id}"></textarea>`
            : `<input type="${field.type}" id="lead-${field.id}" placeholder="${field.placeholder}" data-field="${field.id}" />`
          }
          <div class="chatbot-form-error" id="err-${field.id}"></div>
        </div>
      `;
    });

    html += `
      <button style="
        background: linear-gradient(135deg, #2470c8 0%, #1a5499 100%);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        font-size: 14px;
        transition: all 150ms;
      " onclick="window.chatbotInstance.submitLead()" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        Submit & Get Help
      </button>
    </div>`;

    return html;
  }

  submitLead() {
    const leadData = {};
    let valid = true;

    this.config.leadCollection.fields.forEach(field => {
      const input = document.getElementById(`lead-${field.id}`);
      const errorDiv = document.getElementById(`err-${field.id}`);
      const value = input.value.trim();

      // Validation
      let error = '';
      if (field.required && !value) {
        error = `${field.name} is required`;
        valid = false;
      } else if (value && field.validation) {
        if (field.validation === 'email' && !this.validateEmail(value)) {
          error = 'Please enter a valid email address';
          valid = false;
        } else if (field.validation === 'phone' && !this.validatePhone(value)) {
          error = 'Please enter a valid phone number';
          valid = false;
        }
      }

      if (error) {
        errorDiv.textContent = error;
      } else {
        errorDiv.textContent = '';
        leadData[field.id] = value;
      }
    });

    if (!valid) return;

    // Submit lead
    this.submitLeadData(leadData);
  }

  async submitLeadData(leadData) {
    this.showTypingIndicator();

    try {
      const response = await fetch(this.apiEndpoint + '/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: this.conversationId,
          ...leadData,
          pageUrl: this.pageUrl,
          timestamp: new Date().toISOString(),
          conversationSummary: this.getConversationSummary()
        })
      });

      if (response.ok) {
        this.removeTypingIndicator();
        this.leadCollected = true;
        this.userInfo = leadData;
        
        // Clear form
        document.querySelectorAll('.chatbot-form-group').forEach(g => g.remove());
        
        this.addBotMessage(
          `Thank you, ${leadData.fullName}! 🎉 We've received your enquiry. Our team will contact you at ${leadData.email} or ${leadData.phone} shortly. We look forward to assisting you!`
        );

        this.trackEvent('lead_submitted', { leadData: leadData });
      } else {
        throw new Error('Lead submission failed');
      }
    } catch (error) {
      this.removeTypingIndicator();
      this.addBotMessage('There was an issue submitting your information. Please try again or email us directly at ' + this.config.company.email);
      console.error('Lead submission error:', error);
    }
  }

  addUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-msg user';
    msgDiv.innerHTML = `<div class="chatbot-msg-content">${this.escapeHtml(text)}</div>`;
    this.messagesContainer.appendChild(msgDiv);
    this.messages.push({ text, isUser: true, timestamp: Date.now() });
    this.scrollToBottom();
  }

  addBotMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-msg bot';
    msgDiv.innerHTML = `<div class="chatbot-msg-content">${this.escapeHtml(text)}</div>`;
    this.messagesContainer.appendChild(msgDiv);
    this.messages.push({ text, isUser: false, timestamp: Date.now() });
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chatbot-msg bot';
    msgDiv.id = 'typing-indicator';
    msgDiv.innerHTML = `
      <div class="chatbot-typing">
        <div class="chatbot-typing-dot"></div>
        <div class="chatbot-typing-dot"></div>
        <div class="chatbot-typing-dot"></div>
      </div>
    `;
    this.messagesContainer.appendChild(msgDiv);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 0);
  }

  getConversationSummary() {
    return this.messages
      .map(m => `${m.isUser ? 'User' : 'Bot'}: ${m.text}`)
      .join('\n');
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePhone(phone) {
    return /^[\d\s\-\+\(\)]{7,}$/.test(phone.replace(/\s/g, ''));
  }

  checkRateLimit() {
    const oneMinuteAgo = Date.now() - 60000;
    const messagesInLastMinute = this.messages.filter(m => m.timestamp > oneMinuteAgo && m.isUser).length;
    
    if (messagesInLastMinute > this.config.rateLimit.messagesPerMinute) {
      this.rateLimitWarn = true;
      return false;
    }
    return true;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generateId() {
    return 'conv_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  trackEvent(eventName, eventData = {}) {
    if (this.config.analytics.enabled) {
      console.log(`[Chatbot Analytics] ${eventName}`, eventData);
      // Send to analytics service if configured
    }
  }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.chatbotInstance = new ChatbotWidget('chatbot-config.json', '/api/chatbot');
});
