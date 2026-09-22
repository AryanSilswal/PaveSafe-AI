const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Run migrations on boot to ensure schema exists
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS recent_reports JSONB DEFAULT '[]';
  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_url TEXT;
  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;
  DO $
  BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
  END $;
  ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username) DEFERRABLE INITIALLY IMMEDIATE; /* May fail if duplicates exist, but postgres handles it if we use IF NOT EXISTS conceptually or we can skip raw alter if it crashes */
`).catch(e => console.error('Migration error:', e));

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) return resolve({secure_url: null, public_id: null});
    const stream = cloudinary.uploader.upload_stream({ folder: 'pavesafe' }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

const upload = multer({ storage: multer.memoryStorage() });
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) req.user = null;
    else req.user = user;
    next();
  });
};

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// --- Routes ---

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'pavesafe-backend' }));

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
      if (validPassword && user.banned_until && new Date(user.banned_until) > new Date()) {
        return res.status(403).json({ error: `Account suspended until ${new Date(user.banned_until).toLocaleDateString()} due to repeated invalid reports.` });
      }
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role = username === 'admin' ? 'admin' : 'commuter';
    const token = jwt.sign({ id: user.id, username: user.username, role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, username: user.username, points: user.points, role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) return res.status(400).json({ error: 'Username is already taken' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, points',
      [username, hash]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: 'commuter' }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, points FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Leaderboard Route ---
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const result = await pool.query("SELECT username, points FROM users WHERE username != 'admin' ORDER BY points DESC LIMIT 5");
    res.json(result.rows);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Hazard Routes ---
app.post('/api/hazards/report', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const image = req.file;

    if (!latitude || !longitude || !image) return res.status(400).json({ error: 'Missing required fields' });

    // Send image to AI Microservice
    const formData = new FormData();
    const blob = new Blob([image.buffer], { type: image.mimetype });
    formData.append('file', blob, image.originalname);

    let severity = 5; // Default fallback
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      severity = aiResponse.data.severity || 5;
    } catch (aiError) {
      console.error('AI Service Error:', aiError.message);
    }

    const reporter_id = req.user ? req.user.id : null;

    const query = `
      INSERT INTO hazards (location, severity, status, reporter_id, reported_at, image_url, image_public_id)
      VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, 'Reported', $4, NOW(), $5, $6)
      RETURNING id, severity, status, reported_at;
    `;
    let cloudUpload = { secure_url: null, public_id: null };
      if (image && image.buffer) {
        try { cloudUpload = await uploadToCloudinary(image.buffer); } catch(e) { console.error('Cloudinary error', e); }
      }
      const result = await pool.query(query, [parseFloat(longitude), parseFloat(latitude), severity, reporter_id, cloudUpload.secure_url, cloudUpload.public_id]);
    
    // Reward points for reporting if logged in
    if (reporter_id) {
      await pool.query('UPDATE users SET points = points + 5 WHERE id = $1', [reporter_id]);
    }

    res.status(201).json({ message: 'Hazard reported successfully', hazard: result.rows[0] });
  } catch (error) {
    console.error('Error reporting hazard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hazards', async (req, res) => {
  try {
    const query = `
      SELECT 
        h.id, h.severity, h.status, h.reported_at, h.assigned_worker, h.deadline, h.reporter_id, h.image_url,
        ST_Y(h.location::geometry) as latitude, 
        ST_X(h.location::geometry) as longitude,
        u.username as reporter_name
      FROM hazards h
      LEFT JOIN users u ON h.reporter_id = u.id
      ORDER BY h.reported_at DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hazards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/hazards/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_worker, deadline } = req.body;
    
    if (!['Reported', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current hazard to check reporter
    const currentHazard = await pool.query('SELECT reporter_id, status, image_public_id FROM hazards WHERE id = $1', [id]);
    if (currentHazard.rowCount === 0) return res.status(404).json({ error: 'Hazard not found' });
    
    const hazardData = currentHazard.rows[0];

    const query = `
      UPDATE hazards
      SET status = $1, assigned_worker = COALESCE($2, assigned_worker), deadline = COALESCE($3, deadline), updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(query, [status, assigned_worker, deadline, id]);
    
    // Notifications and Gamification
    
      // Clean up Cloudinary Image on Dispatch or Reject
      if (['In Progress', 'Rejected'].includes(status) && hazardData.image_public_id) {
        try {
          await cloudinary.uploader.destroy(hazardData.image_public_id);
          await pool.query('UPDATE hazards SET image_url = NULL, image_public_id = NULL WHERE id = $1', [id]);
        } catch(e) { console.error('Cloudinary delete error', e); }
      }

      // Handling Approval Window
      if ((status === 'In Progress' || status === 'Resolved') && hazardData.status === 'Reported' && hazardData.reporter_id) {
         const uRes = await pool.query('SELECT recent_reports FROM users WHERE id = $1', [hazardData.reporter_id]);
         let recent = uRes.rows[0].recent_reports || [];
         recent.push('approved');
         if (recent.length > 10) recent.shift();
         await pool.query('UPDATE users SET recent_reports = $1 WHERE id = $2', [JSON.stringify(recent), hazardData.reporter_id]);
      }

      // Handling Rejection
      if (status === 'Rejected' && hazardData.status !== 'Rejected' && hazardData.reporter_id) {
         const uRes = await pool.query('SELECT points, recent_reports FROM users WHERE id = $1', [hazardData.reporter_id]);
         let recent = uRes.rows[0].recent_reports || [];
         recent.push('rejected');
         if (recent.length > 10) recent.shift();
         
         const rejectCount = recent.filter(r => r === 'rejected').length;
         let banQuery = '';
         if (rejectCount >= 5) {
            banQuery = `, banned_until = NOW() + INTERVAL '2 months'`;
         }
         
         await pool.query(`UPDATE users SET points = GREATEST(0, points - 20), recent_reports = $1 ${banQuery} WHERE id = $2`, [JSON.stringify(recent), hazardData.reporter_id]);
         await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [hazardData.reporter_id, 'Your recent hazard report was rejected. 20 points have been deducted.']);
      }

      if (status === 'Resolved' && hazardData.status !== 'Resolved' && hazardData.reporter_id) {
      await pool.query('UPDATE users SET points = points + 20 WHERE id = $1', [hazardData.reporter_id]);
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [hazardData.reporter_id, `Good news! The pothole you reported on ${new Date().toLocaleDateString()} has been resolved by the city. You earned 20 points!`]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Notification Routes ---
app.get('/api/notifications', authenticateToken, requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/read', authenticateToken, requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Route Safety Scoring ---
app.post('/api/routes/score', async (req, res) => {
  try {
    const { coordinates } = req.body; // Array of [lon, lat] pairs from OSRM
    if (!coordinates || coordinates.length === 0) return res.status(400).json({ error: 'Invalid coordinates' });

    // Convert coordinates to a PostGIS LineString
    const lineString = `LINESTRING(${coordinates.map(c => `${c[0]} ${c[1]}`).join(', ')})`;

    // Find hazards within ~50 meters (0.0005 degrees roughly) of the route
    const query = `
      SELECT id, severity FROM hazards 
      WHERE ST_DWithin(location, ST_GeomFromText($1, 4326), 50, true)
      AND status != 'Resolved'
    `;
    const result = await pool.query(query, [lineString]);
    
    const hazardsOnRoute = result.rows;
    const totalSeverity = hazardsOnRoute.reduce((sum, h) => sum + h.severity, 0);
    
    let score = 100 - (totalSeverity * 2); // Base score 100, drops quickly with critical hazards
    if (score < 0) score = 0;

    res.json({
      safetyScore: score,
      hazardsCount: hazardsOnRoute.length,
      criticalHazards: hazardsOnRoute.filter(h => h.severity >= 8).length
    });
  } catch (error) {
    console.error('Route scoring error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend service running on port ${port}`);
});
