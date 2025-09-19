// server.js
const express = require('express');
const dialogflow = require('@google-cloud/dialogflow');
const axios = require('axios');
const cors = require('cors');
const twilio = require('twilio');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ----------------- MIDDLEWARE -----------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for Twilio webhook

// ----------------- STATIC FRONTEND -----------------
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------- CREDENTIALS / KEYS -----------------
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;
const DIALOGFLOW_PRIVATE_KEY = process.env.DIALOGFLOW_PRIVATE_KEY;
const DIALOGFLOW_CLIENT_EMAIL = process.env.DIALOGFLOW_CLIENT_EMAIL;
const DIALOGFLOW_PROJECT_ID = process.env.DIALOGFLOW_PROJECT_ID;

// Twilio (WhatsApp)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// ----------------- USER SESSION STORAGE -----------------
const sessions = {}; // { sessionId: { userContext, profileSetupStep } }

// ----------------- PROFILE QUESTIONS -----------------
const profileQuestions = [
  "Hello! I’m Swasthya HealthBot. What’s your name?",
  "How old are you?",
  "Do you have any children? Names and ages, e.g., Aarav-8, Anika-3.",
  "Do you have any pre-existing health conditions or diseases I should know about?",
  "Where do you live? (City or village)"
];

// ----------------- HEALTH CHECK -----------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Swasthya HealthBot API is running',
    features: ['chat', 'profile creation', 'twilio_whatsapp', 'llama_fallback']
  });
});

// ----------------- DIALOGFLOW LOGIC -----------------
async function detectIntent(projectId, sessionId, query, languageCode = 'en') {
  if (!DIALOGFLOW_PRIVATE_KEY || !DIALOGFLOW_CLIENT_EMAIL) {
    throw new Error('Dialogflow credentials not configured');
  }

  const sessionClient = new dialogflow.SessionsClient({
    credentials: {
      client_email: DIALOGFLOW_CLIENT_EMAIL,
      private_key: DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, '\n')
    }
  });

  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  const request = {
    session: sessionPath,
    queryInput: { text: { text: query, languageCode } },
  };

  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;

  return {
    fulfillmentText: result.fulfillmentText,
    confidence: result.intentDetectionConfidence,
    intent: result.intent.displayName
  };
}

// ----------------- LLaMA LOGIC -----------------
async function callLlamaAPI(message, userContext = {}) {
  const modelsToTry = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-4-scout-17b-16e',
    'compound-mini'
  ];

  for (const model of modelsToTry) {
    try {
      const prompt = buildPersonalizedPrompt(message, userContext);

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages: prompt,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9
        },
        {
          headers: {
            Authorization: `Bearer ${LLAMA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return formatResponse(response.data.choices[0].message.content);
    } catch (err) {
      console.log(`Model ${model} failed: ${err.message}`);
    }
  }
  throw new Error('All models failed');
}

function buildPersonalizedPrompt(message, userContext) {
  let systemMessage = `You are Swasthya HealthBot, a helpful health assistant for rural India. Provide accurate health information in simple language. Tailor responses to the user's context. Avoid repetitive greetings. Sound confident and trustworthy.`;

  if (userContext && Object.keys(userContext).length > 0) {
    systemMessage += `\n\nUser Context:`;
    if (userContext.name) systemMessage += `\n- Name: ${userContext.name}`;
    if (userContext.age) systemMessage += `\n- Age: ${userContext.age}`;
    if (userContext.location) systemMessage += `\n- Location: ${userContext.location}`;
    if (userContext.children && userContext.children.length > 0) {
      systemMessage += `\n- Children: ${userContext.children.map(c => `${c.name} (${c.age} years)`).join(', ')}`;
    }
    if (userContext.conditions) systemMessage += `\n- Conditions: ${userContext.conditions}`;
    systemMessage += `\n\nUse this context to personalize your response when relevant.`;
  }

  systemMessage += `\n\nKeep responses clear, practical, and focused on actionable advice.`;

  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: message }
  ];
}

function formatResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function getStructuredFallback(message, userContext) {
  const lower = message.toLowerCase();
  let response = '';

  if (lower.includes('symptom')) {
    response = `<strong>Symptom Information</strong>\n\nCommon symptoms vary by disease. E.g., Dengue: High fever, headache, muscle pain; Malaria: Fever with chills, fatigue; Typhoid: Prolonged fever, stomach pain.`;
  } else if (lower.includes('prevent') || lower.includes('malaria')) {
    response = `<strong>Prevention Methods</strong>\n\n• Use mosquito nets & repellents\n• Wear long sleeves\n• Avoid stagnant water\n• Vaccinations`;
  } else if (lower.includes('vaccin')) {
    response = `<strong>Vaccination Info</strong>\n\n• Newborns: BCG, polio, hepatitis B\n• 6 weeks: Pentavalent, rotavirus\n• Children: Measles, DPT, typhoid`;
  } else {
    response = `<strong>Health Assistance</strong>\n\nI can help with symptoms, prevention, vaccines, and health alerts. What would you like to know?`;
  }

  if (userContext && userContext.location) {
    response += `\n\n<strong>Location Note:</strong> Since you're in ${userContext.location}, consider local health advisories.`;
  }

  return response;
}

// ----------------- EXTRACT PROFILE INFO -----------------
function extractProfileInfo(message, userContext) {
  const info = { ...userContext };
  const lower = message.toLowerCase();

  if (!info.name && message.trim().length < 50) info.name = message.trim();

  if (!info.age) {
    const ageMatch = message.match(/\b(\d{1,2})\s*(years?|yrs?)?\b/i);
    if (ageMatch) info.age = parseInt(ageMatch[1]);
  }

  if (!info.children && (lower.includes('child') || lower.includes('son') || lower.includes('daughter'))) {
    const childrenMatches = message.match(/(\w+)[-\s](\d+)/g);
    if (childrenMatches) {
      info.children = childrenMatches.map(c => {
        const [name, age] = c.split(/[-\s]/);
        return { name, age: parseInt(age) };
      });
    }
  }

  if (!info.conditions && (lower.includes('diabetes') || lower.includes('malaria') || lower.includes('asthma'))) {
    info.conditions = message.trim();
  }

  if (!info.location && lower.length < 30) info.location = message.trim();

  return info;
}

// ----------------- GET NEXT PROFILE QUESTION -----------------
function getNextProfileQuestion(step) {
  if (step < profileQuestions.length) return profileQuestions[step];
  return null;
}

// ----------------- CHAT HANDLER -----------------
async function handleChatLogic(message, sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = { userContext: {}, profileSetupStep: 0, profileComplete: false };
  }

  const session = sessions[sessionId];

  // -------- PROFILE CREATION FLOW --------
  if (!session.profileComplete) {
    if (session.profileSetupStep > 0) {
      session.userContext = extractProfileInfo(message, session.userContext);
    }

    const nextQuestion = getNextProfileQuestion(session.profileSetupStep);
    session.profileSetupStep += 1;

    if (nextQuestion) {
      return { response: nextQuestion, userContext: session.userContext };
    } else {
      session.profileComplete = true;
      return { response: "Profile creation complete! You can now ask me health questions.", userContext: session.userContext };
    }
  }

  // -------- REGULAR CHAT FLOW --------
  const projectId = DIALOGFLOW_PROJECT_ID || 'default-project';

  try {
    const dialogflowResponse = await detectIntent(projectId, sessionId, message);
    if (dialogflowResponse && dialogflowResponse.confidence > 0.3) {
      return { response: dialogflowResponse.fulfillmentText, userContext: session.userContext };
    }
  } catch (err) {
    console.log('Dialogflow failed, using LLaMA fallback:', err.message);
  }

  try {
    const llamaResponse = await callLlamaAPI(message, session.userContext);
    return { response: llamaResponse, userContext: session.userContext };
  } catch (err) {
    console.log('LLaMA failed:', err.message);
    return { response: getStructuredFallback(message, session.userContext), userContext: session.userContext };
  }
}

// ----------------- API ENDPOINT -----------------
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  try {
    const chatResponse = await handleChatLogic(message, sessionId);
    res.json(chatResponse);
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Internal server error', response: "I'm experiencing technical difficulties. Please try again later." });
  }
});

// ----------------- TWILIO WHATSAPP -----------------
app.post('/api/whatsapp', async (req, res) => {
  if (!twilioClient) return res.status(500).send('Twilio not configured.');

  const incomingMsg = req.body.Body;
  const from = req.body.From;
  const sessionId = from.replace(/[^0-9]/g, '');

  try {
    const chatResponse = await handleChatLogic(incomingMsg, sessionId);
    await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: chatResponse.response
    });
    res.send('<Response></Response>');
  } catch (err) {
    console.error('Twilio WhatsApp error:', err);
    res.send('<Response><Message>Bot error occurred.</Message></Response>');
  }
});

// ----------------- OPTIONAL STATUS CALLBACK -----------------
app.post('/api/whatsapp-status', (req, res) => {
  console.log('WhatsApp status update:', req.body);
  res.sendStatus(200);
});

// ----------------- START SERVER -----------------
app.listen(PORT, () => {
  console.log(`🚀 Swasthya HealthBot Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
