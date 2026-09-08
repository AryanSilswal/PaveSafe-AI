const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// DB Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configure Multer for in-memory file uploads
const upload = multer({ storage: multer.memoryStorage() });

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Routes ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'pavesafe-backend' });
});

// Mock Login (for demonstration)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  // In a real app, verify against database
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ username: 'admin', role: 'admin' }, process.env.JWT_SECRET || 'supersecretkey');
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Report Hazard (Commuter Module)
app.post('/api/hazards/report', upload.single('image'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const image = req.file;

    if (!latitude || !longitude || !image) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Send image to AI Microservice for analysis
    const formData = new FormData();
    const blob = new Blob([image.buffer], { type: image.mimetype });
    formData.append('file', blob, image.originalname);

    let severity = 'Low';
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      severity = aiResponse.data.severity;
    } catch (aiError) {
      console.error('AI Service Error:', aiError.message);
      // Fallback severity if AI service is down
      severity = 'Unknown';
    }

    // 2. Save to database using PostGIS
    const query = `
      INSERT INTO hazards (location, severity, status, reported_at)
      VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, 'Reported', NOW())
      RETURNING id, severity, status, reported_at;
    `;
    // PostGIS expects Longitude, Latitude
    const values = [parseFloat(longitude), parseFloat(latitude), severity];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({ message: 'Hazard reported successfully', hazard: result.rows[0] });

  } catch (error) {
    console.error('Error reporting hazard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all hazards (Admin Module / Commuter Proximity)
app.get('/api/hazards', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        severity, 
        status, 
        reported_at,
        ST_Y(location::geometry) as latitude, 
        ST_X(location::geometry) as longitude
      FROM hazards
      ORDER BY reported_at DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hazards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update hazard status (Admin Module)
app.put('/api/hazards/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['Reported', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const query = `
      UPDATE hazards
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [status, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hazard not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend service running on port ${port}`);
});
