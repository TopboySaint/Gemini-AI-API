const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require('./models/Chat');
const Conversation = require('./models/Conversation');

const port = process.env.PORT || 8080
const uri = process.env.URI

app.use(express.json());
app.use(cors());

mongoose.connect(uri)
.then(()=>{
  console.log(`MongoDB connected`);
})
.catch((err)=>{
  console.log(`Error connecting to mongoDB`, err);
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get all conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find().sort({ createdAt: -1 });
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Create a new conversation
app.post('/api/conversations', async (req, res) => {
  try {
    const conversation = await Conversation.create({});
    res.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get messages for a specific conversation
app.get('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Chat.find({ conversationId: id }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const newConversation = await Conversation.create({ title: message.substring(0, 30) + '...' });
      currentConversationId = newConversation._id;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    // Save user message
    await Chat.create({ role: 'user', content: message, conversationId: currentConversationId });
    // Save AI response
    await Chat.create({ role: 'ai', content: text, conversationId: currentConversationId });

    res.json({ response: text, conversationId: currentConversationId });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.get('/', (req, res) => {
  res.send('Gemini AI Server is running');
});

app.listen(port, ()=>{
  console.log(`If everything seems under control, youre just not going fast enough - ${port} is running`);
})

module.exports = app;