// EduMate Simple Server - No Database Required!
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'edumate-simple-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory Storage (replaces database)
const storage = {
  users: [],
  projects: [],
  notes: [],
  nextUserId: 1,
  nextProjectId: 1,
  nextNoteId: 1
};

// Sample Gemini API Keys (from original project)
const GEMINI_API_KEYS = [
  'AIzaSyAtRJvydFU-UZUDnK3Eq3Zx5WE_XKax8Z4',
  'AIzaSyAQT5usx8_0dOvg68fFjFxrIjPCXBQ9Gmw',
  'AIzaSyDu-C7YYqZ8oZsyXOi5S8qEAG5kECm_qJk'
];
let currentKeyIndex = 0;

// Helper: Get current API key (rotate through keys)
function getGeminiApiKey() {
  const key = GEMINI_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key;
}

// Helper: Verify JWT Token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user exists
    if (storage.users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: storage.nextUserId++,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    storage.users.push(user);
    
    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'User registered successfully',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = storage.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Verify Token
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true });
});

// ==================== PROJECT ROUTES ====================

// Get all projects for user
app.get('/api/projects', verifyToken, (req, res) => {
  const userProjects = storage.projects.filter(p => p.userId === req.userId);
  res.json(userProjects);
});

// Create project
app.post('/api/projects', verifyToken, (req, res) => {
  const { name, description } = req.body;
  
  const project = {
    id: storage.nextProjectId++,
    userId: req.userId,
    name,
    description,
    createdAt: new Date().toISOString()
  };
  
  storage.projects.push(project);
  res.status(201).json(project);
});

// Get single project
app.get('/api/projects/:id', verifyToken, (req, res) => {
  const project = storage.projects.find(
    p => p.id === parseInt(req.params.id) && p.userId === req.userId
  );
  
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  
  res.json(project);
});

// Update project
app.put('/api/projects/:id', verifyToken, (req, res) => {
  const projectIndex = storage.projects.findIndex(
    p => p.id === parseInt(req.params.id) && p.userId === req.userId
  );
  
  if (projectIndex === -1) {
    return res.status(404).json({ message: 'Project not found' });
  }
  
  storage.projects[projectIndex] = {
    ...storage.projects[projectIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json(storage.projects[projectIndex]);
});

// Delete project
app.delete('/api/projects/:id', verifyToken, (req, res) => {
  const projectIndex = storage.projects.findIndex(
    p => p.id === parseInt(req.params.id) && p.userId === req.userId
  );
  
  if (projectIndex === -1) {
    return res.status(404).json({ message: 'Project not found' });
  }
  
  storage.projects.splice(projectIndex, 1);
  res.json({ message: 'Project deleted successfully' });
});

// ==================== NOTE ROUTES ====================

// Get all notes for user
app.get('/api/notes', verifyToken, (req, res) => {
  const userNotes = storage.notes.filter(n => n.userId === req.userId);
  res.json(userNotes);
});

// Create note
app.post('/api/notes', verifyToken, (req, res) => {
  const { title, content, projectId } = req.body;
  
  const note = {
    id: storage.nextNoteId++,
    userId: req.userId,
    projectId: projectId || null,
    title,
    content,
    createdAt: new Date().toISOString()
  };
  
  storage.notes.push(note);
  res.status(201).json(note);
});

// Get notes by project
app.get('/api/notes/project/:projectId', verifyToken, (req, res) => {
  const projectNotes = storage.notes.filter(
    n => n.projectId === parseInt(req.params.projectId) && n.userId === req.userId
  );
  res.json(projectNotes);
});

// Delete note
app.delete('/api/notes/:id', verifyToken, (req, res) => {
  const noteIndex = storage.notes.findIndex(
    n => n.id === parseInt(req.params.id) && n.userId === req.userId
  );
  
  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found' });
  }
  
  storage.notes.splice(noteIndex, 1);
  res.json({ message: 'Note deleted successfully' });
});

// ==================== AI ROUTES ====================

// Generate AI Summary (using Gemini API)
app.post('/api/ai/generate-summary', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    
    const apiKey = getGeminiApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const prompt = `Summarize the following text in a clear and concise way:\n\n${content}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }
    
    const data = await response.json();
    const summary = data.candidates[0]?.content?.parts[0]?.text || 'Could not generate summary';
    
    res.json({ summary });
  } catch (error) {
    console.error('AI Summary Error:', error);
    res.status(500).json({ 
      message: 'Failed to generate summary', 
      error: error.message 
    });
  }
});

// Generate AI Quiz
app.post('/api/ai/generate-quiz', verifyToken, async (req, res) => {
  try {
    const { content, numberOfQuestions = 5 } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    
    const apiKey = getGeminiApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const prompt = `Generate ${numberOfQuestions} multiple choice quiz questions based on the following content. Format as JSON array with structure: [{"question": "...", "options": ["a", "b", "c", "d"], "correctAnswer": 0}]\n\nContent:\n${content}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }
    
    const data = await response.json();
    const quizText = data.candidates[0]?.content?.parts[0]?.text || '[]';
    
    // Try to parse JSON from response
    let quiz;
    try {
      const jsonMatch = quizText.match(/\[[\s\S]*\]/);
      quiz = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      quiz = [];
    }
    
    res.json({ quiz });
  } catch (error) {
    console.error('AI Quiz Error:', error);
    res.status(500).json({ 
      message: 'Failed to generate quiz', 
      error: error.message 
    });
  }
});

// Generate AI Flashcards
app.post('/api/ai/generate-flashcards', verifyToken, async (req, res) => {
  try {
    const { content, numberOfCards = 5 } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    
    const apiKey = getGeminiApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const prompt = `Generate ${numberOfCards} flashcards based on the following content. Format as JSON array with structure: [{"front": "question", "back": "answer"}]\n\nContent:\n${content}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }
    
    const data = await response.json();
    const flashcardsText = data.candidates[0]?.content?.parts[0]?.text || '[]';
    
    // Try to parse JSON from response
    let flashcards;
    try {
      const jsonMatch = flashcardsText.match(/\[[\s\S]*\]/);
      flashcards = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      flashcards = [];
    }
    
    res.json({ flashcards });
  } catch (error) {
    console.error('AI Flashcards Error:', error);
    res.status(500).json({ 
      message: 'Failed to generate flashcards', 
      error: error.message 
    });
  }
});

// ==================== SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   EduMate Simple Server Running! 🚀   ║
╚════════════════════════════════════════╝

✅ Server: http://localhost:${PORT}
✅ No database needed!
✅ In-memory storage active

📊 Current Storage:
   Users: ${storage.users.length}
   Projects: ${storage.projects.length}
   Notes: ${storage.notes.length}

Press Ctrl+C to stop the server
  `);
});
