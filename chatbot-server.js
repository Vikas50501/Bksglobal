/**
 * Chatbot Backend API
 * Node.js + Express
 * Handles AI responses, lead submission, email notifications, and lead storage
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Load configuration
let config = null;
async function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'chatbot-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    config = JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load chatbot config:', error);
    process.exit(1);
  }
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Email transporter setup
let transporter;
async function setupEmailTransporter() {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Test connection
  try {
    await transporter.verify();
    console.log('Email transporter configured successfully');
  } catch (error) {
    console.error('Email transporter error:', error);
  }
}

// MongoDB connection (optional, for lead storage)
async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.log('MongoDB URI not set. Using file-based storage.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
}

// Lead Schema (MongoDB)
const leadSchema = new mongoose.Schema({
  conversationId: String,
  fullName: String,
  email: String,
  phone: String,
  enquiry: String,
  pageUrl: String,
  timestamp: Date,
  conversationSummary: String,
  status: { type: String, default: 'new' },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model('Lead', leadSchema);

// Rate limiting
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many messages. Please wait before sending another.'
});

const leadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many lead submissions. Please try again later.'
});

// Conversation storage (in-memory, replace with database for production)
const conversations = new Map();

// Mock AI Response Function (for testing without OpenAI API key)
function getMockAIResponse(userMessage, config) {
  const message = userMessage.toLowerCase();
  
  // Greeting responses
  if (message.match(/^(hi|hello|hey|greetings)/)) {
    return `Hello! 👋 Welcome to ${config.chatbot.name}. Thank you for reaching out. Our team will get back to you shortly with the information you need.`;
  }
  
  // Service queries
  for (const service of config.services) {
    if (message.includes(service.name.toLowerCase())) {
      return `Great question about **${service.name}**! \n\n${service.description}\n\nWould you like to know more about this service or any other area we cover?`;
    }
  }
  
  // FAQ responses
  for (const faq of config.faqs) {
    if (message.includes(faq.question.toLowerCase().substring(0, 10))) {
      return `${faq.answer}\n\nDo you have any other questions?`;
    }
  }
  
  // Company info queries
  if (message.match(/(about|who|company|business)/)) {
    return `We are **${config.company.name}**, a team of dedicated professionals serving clients across ${config.company.countriesServed.length}+ countries. We specialize in:\n\n${config.services.slice(0, 3).map(s => `• ${s.name}`).join('\n')}\n\nWould you like to learn more about any specific service?`;
  }
  
  // Contact queries
  if (message.match(/(contact|phone|email|reach|call)/)) {
    return `You can reach us at:\n\n📧 **Email:** ${config.company.email}\n📞 **Phone:** ${config.company.phone}\n\nWe're happy to discuss your requirements. Would you like to provide your contact details so we can follow up?`;
  }
  
  // Location queries
  if (message.match(/(location|office|where|based)/)) {
    const locations = config.company.locations.slice(0, 3);
    return `We have offices in:\n\n${locations.map(loc => `📍 ${loc}`).join('\n')}\n\nWe also serve clients worldwide. Which location is nearest to you?`;
  }
  
  // Pricing/cost queries
  if (message.match(/(price|cost|fee|budget|rate)/)) {
    return `Our pricing is customized based on your specific requirements. Each client has unique needs, so we provide tailored solutions. I'd recommend connecting with our team to discuss your needs and provide an accurate quote. Would you like to share your requirements?`;
  }
  
  // Default helpful response
  return `Thanks for your inquiry! We appreciate your interest in our services. Please provide your contact details on the form, and our team will reach out to you within 24 hours with a personalized solution.`;
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chatbot message endpoint
app.post('/api/chatbot/message', messageRateLimit, async (req, res) => {
  try {
    const { conversationId, message, context = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Get or create conversation
    let conversation = conversations.get(conversationId) || {
      id: conversationId,
      messages: [],
      createdAt: Date.now(),
      metadata: context
    };

    // Add user message to history
    conversation.messages.push({
      role: 'user',
      content: message
    });

    // Get AI response (OpenAI or mock)
    let assistantMessage;
    
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-api-key-here') {
      // Use OpenAI API
      const systemMessage = {
        role: 'system',
        content: config.ai.systemPrompt
      };

      const chatMessages = [
        systemMessage,
        ...conversation.messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];

      const completion = await openai.chat.completions.create({
        model: config.ai.model,
        messages: chatMessages,
        temperature: config.ai.temperature,
        max_tokens: config.ai.maxTokens,
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      });

      assistantMessage = completion.choices[0].message.content;
    } else {
      // Use mock AI (knowledge base responses)
      assistantMessage = getMockAIResponse(message, config);
    }

    // Add assistant response to history
    conversation.messages.push({
      role: 'assistant',
      content: assistantMessage
    });

    // Store conversation
    conversations.set(conversationId, conversation);

    // Keep only recent conversations (prevent memory leak)
    if (conversations.size > 1000) {
      const oldestKey = [...conversations.keys()][0];
      conversations.delete(oldestKey);
    }

    res.json({
      message: assistantMessage,
      conversationId: conversationId
    });
  } catch (error) {
    console.error('Chatbot message error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: 'I encountered an error. Please try again or contact us directly.'
    });
  }
});

// Lead submission endpoint
app.post('/api/chatbot/lead', leadRateLimit, async (req, res) => {
  try {
    const { conversationId, fullName, email, phone, enquiry, pageUrl, timestamp, conversationSummary } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !enquiry) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone format
    if (!/^[\d\s\-\+\(\)]{7,}$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    // Create lead object
    const leadData = {
      conversationId,
      fullName,
      email,
      phone,
      enquiry,
      pageUrl,
      timestamp: new Date(timestamp),
      conversationSummary,
      status: 'new'
    };

    // Save to database
    let savedLead = null;
    try {
      if (mongoose.connection.readyState === 1) {
        const lead = new Lead(leadData);
        savedLead = await lead.save();
        console.log('Lead saved to MongoDB:', savedLead._id);
      }
    } catch (dbError) {
      console.error('Database save failed:', dbError);
      // Continue with file-based backup
    }

    // Save to file-based storage (backup)
    try {
      const leadsDir = path.join(__dirname, 'leads');
      await fs.mkdir(leadsDir, { recursive: true });
      const filePath = path.join(leadsDir, `lead_${conversationId}.json`);
      await fs.writeFile(filePath, JSON.stringify(leadData, null, 2));
      console.log('Lead backed up to file:', filePath);
    } catch (fileError) {
      console.error('File backup failed:', fileError);
    }

    // Send email notification
    if (config.email.enabled) {
      await sendLeadEmail(leadData);
    }

    res.json({
      success: true,
      message: 'Lead submitted successfully',
      leadId: savedLead?._id || conversationId
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    res.status(500).json({
      error: 'Failed to submit lead',
      message: 'There was an error processing your submission. Please try again.'
    });
  }
});

// Send lead notification email
async function sendLeadEmail(leadData) {
  try {
    if (!transporter) {
      console.warn('Email transporter not configured');
      return;
    }

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .header { background: #2470c8; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: 600; color: #2470c8; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .value { padding: 10px; background: #f5f5f5; border-left: 3px solid #2470c8; border-radius: 4px; }
    .transcript { background: #f0f0f0; padding: 15px; border-radius: 4px; max-height: 300px; overflow-y: auto; font-size: 13px; font-family: 'Courier New', monospace; }
    .footer { background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Website Chatbot Lead</h2>
      <p>Submitted at ${new Date(leadData.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="content">
      <div class="field">
        <div class="label">Full Name</div>
        <div class="value">${escapeHtml(leadData.fullName)}</div>
      </div>
      
      <div class="field">
        <div class="label">Email Address</div>
        <div class="value"><a href="mailto:${escapeHtml(leadData.email)}">${escapeHtml(leadData.email)}</a></div>
      </div>
      
      <div class="field">
        <div class="label">Contact Number / WhatsApp</div>
        <div class="value"><a href="tel:${escapeHtml(leadData.phone)}">${escapeHtml(leadData.phone)}</a></div>
      </div>
      
      <div class="field">
        <div class="label">Enquiry / Requirement</div>
        <div class="value">${escapeHtml(leadData.enquiry).replace(/\n/g, '<br>')}</div>
      </div>
      
      <div class="field">
        <div class="label">Source Page</div>
        <div class="value"><a href="${escapeHtml(leadData.pageUrl)}" target="_blank">${escapeHtml(leadData.pageUrl)}</a></div>
      </div>
      
      <div class="field">
        <div class="label">Conversation ID</div>
        <div class="value">${escapeHtml(leadData.conversationId)}</div>
      </div>

      ${leadData.conversationSummary ? `
      <div class="field">
        <div class="label">Conversation Transcript</div>
        <div class="transcript">${escapeHtml(leadData.conversationSummary).replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Lead submitted via Bharat Kataria & Co. Chatbot</p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"${config.email.senderName}" <${process.env.EMAIL_USER}>`,
      to: config.email.sendToEmail,
      subject: config.email.subjectLine,
      html: emailBody
    });

    console.log(`Lead email sent to ${config.email.sendToEmail}`);
  } catch (error) {
    console.error('Failed to send lead email:', error);
  }
}

// Admin endpoints (secured with API key)
const adminApiKey = process.env.ADMIN_API_KEY || 'admin-key-change-this';

app.get('/api/chatbot/leads', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Return leads from database or file storage
  res.json({ message: 'Leads endpoint. Implement database query here.' });
});

// Configuration endpoint
app.get('/api/chatbot/config', (req, res) => {
  // Return non-sensitive config (filtered)
  const safeConfig = {
    chatbot: config.chatbot,
    services: config.services,
    faqs: config.faqs,
    appearance: config.appearance
  };
  res.json(safeConfig);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// HTML escape function
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Start server
async function start() {
  await loadConfig();
  await setupEmailTransporter();
  await connectDatabase();

  app.listen(port, () => {
    console.log(`Chatbot API server running on http://localhost:${port}`);
    console.log('Endpoints:');
    console.log('- POST /api/chatbot/message - Send chat message');
    console.log('- POST /api/chatbot/lead - Submit lead');
    console.log('- GET /api/chatbot/config - Get public configuration');
  });
}

start().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});

module.exports = app;
