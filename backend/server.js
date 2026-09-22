const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Email transporter (Gmail App Password)
const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
const sendEmail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER || !to) return;
  try { await mailer.sendMail({ from: `"PaveSafe AI" <${process.env.EMAIL_USER}>`, to, subject, html }); }
  catch(e) { console.error('Email error:', e.message); }
};

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS recent_reports JSONB DEFAULT '[]';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_url TEXT;
  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;
  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS confirmation_count INTEGER DEFAULT 0;
  CREATE TABLE IF NOT EXISTS hazard_upvotes (
    hazard_id INTEGER REFERENCES hazards(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (hazard_id, user_id)
  );
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
      ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
  END $$;
`).catch(e => console.error('Migration error:', e));

const uploadToCloudinary = (buffer) => new Promise((resolve, reject) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return resolve({ secure_url: null, public_id: null });
  const stream = cloudinary.uploader.upload_stream({ folder: 'pavesafe' }, (error, result) => {
    if (error) return reject(error);
    resolve(result);
  });
  stream.end(buffer);
});

const upload = multer({ storage: multer.memoryStorage() });
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { req.user = null; return next(); }
  jwt.verify(token, JWT_SECRET, (err, user) => { req.user = err ? null : user; next(); });
};
const requireAuth = (req, res, next) => !req.user ? res.status(401).json({ error: 'Unauthorized' }) : next();
const requireAdmin = (req, res, next) => (!req.user || req.user.role !== 'admin') ? res.status(403).json({ error: 'Forbidden' }) : next();

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'pavesafe-backend' }));

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (validPassword && user.banned_until && new Date(user.banned_until) > new Date())
      return res.status(403).json({ error: `Account suspended until ${new Date(user.banned_until).toLocaleDateString()} due to repeated invalid reports.` });
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    const role = username.toLowerCase() === 'admin' ? 'admin' : 'commuter';
    const token = jwt.sign({ id: user.id, username: user.username, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, points: user.points, role, email: user.email } });
  } catch (error) { console.error('Login error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) return res.status(400).json({ error: 'Username is already taken' });
    const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, points, email',
      [username, hash, email || null]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: 'commuter' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (error) { console.error('Registration error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/auth/me', authenticateToken, requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, points, email FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const result = await pool.query("SELECT username, points FROM users WHERE username != 'admin' ORDER BY points DESC LIMIT 5");
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users/profile', authenticateToken, requireAuth, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, username, points, email, recent_reports FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    const hazardsRes = await pool.query(`
      SELECT h.id, h.severity, h.status, h.reported_at,
        ST_Y(h.location::geometry) as latitude, ST_X(h.location::geometry) as longitude
      FROM hazards h WHERE h.reporter_id = $1 ORDER BY h.reported_at DESC
    `, [req.user.id]);
    const reports = hazardsRes.rows;
    let rank = 'Rookie Scout';
    if (user.points >= 200) rank = 'Road Guardian';
    else if (user.points >= 100) rank = 'Safety Champion';
    else if (user.points >= 50) rank = 'Active Citizen';
    else if (user.points >= 20) rank = 'Safe Citizen';
    res.json({
      ...user, reports, rank,
      totalReports: reports.length,
      resolvedReports: reports.filter(r => r.status === 'Resolved').length,
      rejectedReports: reports.filter(r => r.status === 'Rejected').length,
    });
  } catch (error) { console.error('Profile error:', error); res.status(500).json({ error: 'Server error' }); }
});

// ─── Hazards ──────────────────────────────────────────────────────────────────
app.post('/api/hazards/report', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const image = req.file;
    if (!latitude || !longitude || !image) return res.status(400).json({ error: 'Missing required fields' });

    const formData = new FormData();
    formData.append('file', new Blob([image.buffer], { type: image.mimetype }), image.originalname);
    let severity = 5;
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      severity = aiResponse.data.severity || 5;
    } catch (aiError) { console.error('AI Service Error:', aiError.message); }

    let cloudUpload = { secure_url: null, public_id: null };
    try { cloudUpload = await uploadToCloudinary(image.buffer); } catch(e) { console.error('Cloudinary error', e); }

    const result = await pool.query(`
      INSERT INTO hazards (location, severity, status, reporter_id, reported_at, image_url, image_public_id)
      VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, 'Reported', $4, NOW(), $5, $6)
      RETURNING id, severity, status, reported_at;
    `, [parseFloat(longitude), parseFloat(latitude), severity, req.user?.id || null, cloudUpload.secure_url, cloudUpload.public_id]);

    res.status(201).json({ message: 'Hazard reported successfully', hazard: result.rows[0] });
  } catch (error) { console.error('Error reporting hazard:', error); res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/hazards', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.id, h.severity, h.status, h.reported_at, h.assigned_worker, h.deadline,
        h.reporter_id, h.image_url, h.confirmation_count,
        ST_Y(h.location::geometry) as latitude, ST_X(h.location::geometry) as longitude,
        u.username as reporter_name, u.email as reporter_email
      FROM hazards h LEFT JOIN users u ON h.reporter_id = u.id
      ORDER BY h.reported_at DESC;
    `);
    res.json(result.rows);
  } catch (error) { console.error('Error fetching hazards:', error); res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/hazards/trend', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT reported_at::date as date, severity, COUNT(*) as count
      FROM hazards WHERE reported_at >= NOW() - INTERVAL '30 days'
      GROUP BY reported_at::date, severity ORDER BY date ASC
    `);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/hazards/:id/upvote', authenticateToken, async (req, res) => {
    try {
      const hazardId = req.params.id;
      const userId = req.user.id;
      
      const insertVote = await pool.query(
        'INSERT INTO hazard_upvotes (hazard_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1',
        [hazardId, userId]
      );
      
      if (insertVote.rowCount === 0) {
        return res.status(400).json({ error: 'You have already verified this hazard.' });
      }

      const result = await pool.query(
        'UPDATE hazards SET confirmation_count = confirmation_count + 1 WHERE id = $1 RETURNING id, confirmation_count',
        [hazardId]
      );
      
      if (result.rowCount === 0) return res.status(404).json({ error: 'Hazard not found' });
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' }); 
    }
  });

app.put('/api/hazards/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_worker, deadline } = req.body;
    if (!['Reported', 'In Progress', 'Resolved', 'Rejected'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const currentHazard = await pool.query(`
      SELECT h.reporter_id, h.status, h.image_public_id, h.severity,
        u.email as reporter_email, u.username as reporter_name
      FROM hazards h LEFT JOIN users u ON h.reporter_id = u.id WHERE h.id = $1
    `, [id]);
    if (currentHazard.rowCount === 0) return res.status(404).json({ error: 'Hazard not found' });
    const hazardData = currentHazard.rows[0];

    const result = await pool.query(`
      UPDATE hazards SET status = $1, assigned_worker = COALESCE($2, assigned_worker),
        deadline = COALESCE($3, deadline), updated_at = NOW()
      WHERE id = $4 RETURNING *;
    `, [status, assigned_worker, deadline, id]);

    // Cloudinary cleanup on dispatch or reject
    if (['In Progress', 'Rejected'].includes(status) && hazardData.image_public_id) {
      try {
        await cloudinary.uploader.destroy(hazardData.image_public_id);
        await pool.query('UPDATE hazards SET image_url = NULL, image_public_id = NULL WHERE id = $1', [id]);
      } catch(e) { console.error('Cloudinary delete error', e); }
    }

    // Dispatch: award +5 points
    if (status === 'In Progress' && hazardData.status === 'Reported' && hazardData.reporter_id) {
      const uRes = await pool.query('SELECT recent_reports FROM users WHERE id = $1', [hazardData.reporter_id]);
      let recent = [...(uRes.rows[0].recent_reports || []), 'approved'].slice(-10);
      await pool.query('UPDATE users SET points = points + 5, recent_reports = $1 WHERE id = $2', [JSON.stringify(recent), hazardData.reporter_id]);
      await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [hazardData.reporter_id, 'Your recent report was verified and dispatched! You earned 5 points.']);
      sendEmail(hazardData.reporter_email, 'Your PaveSafe Report Was Dispatched! 🚧',
        `<h2>Great news, ${hazardData.reporter_name}!</h2><p>Your pothole report (Severity ${hazardData.severity}/10) has been <strong>verified and a repair crew has been dispatched</strong>.</p><p>You earned <strong>+5 Safe Citizen Points</strong>!</p>`);
    }

    // Reject: deduct -20 points + possible ban
    if (status === 'Rejected' && hazardData.status !== 'Rejected' && hazardData.reporter_id) {
      const uRes = await pool.query('SELECT recent_reports FROM users WHERE id = $1', [hazardData.reporter_id]);
      let recent = [...(uRes.rows[0].recent_reports || []), 'rejected'].slice(-10);
      const rejectCount = recent.filter(r => r === 'rejected').length;
      const banClause = rejectCount >= 5 ? `, banned_until = NOW() + INTERVAL '2 months'` : '';
      await pool.query(`UPDATE users SET points = GREATEST(0, points - 20), recent_reports = $1 ${banClause} WHERE id = $2`, [JSON.stringify(recent), hazardData.reporter_id]);
      await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [hazardData.reporter_id, 'Your recent hazard report was rejected. 20 points have been deducted.']);
      const banMsg = rejectCount >= 5 ? '<p><strong>⚠️ Your account has been suspended for 2 months due to repeated violations.</strong></p>' : '';
      sendEmail(hazardData.reporter_email, 'Your PaveSafe Report Was Rejected ❌',
        `<h2>Hi ${hazardData.reporter_name},</h2><p>Your report was <strong>rejected</strong>. <strong>-20 points</strong> deducted.</p>${banMsg}`);
    }

    // Resolve: award +20 points
    if (status === 'Resolved' && hazardData.status !== 'Resolved' && hazardData.reporter_id) {
      await pool.query('UPDATE users SET points = points + 20 WHERE id = $1', [hazardData.reporter_id]);
      await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [hazardData.reporter_id, 'The pothole you reported has been fully resolved! You earned 20 bonus points!']);
      sendEmail(hazardData.reporter_email, 'Road Repaired! Your Report Made a Difference 🎉',
        `<h2>Hi ${hazardData.reporter_name}!</h2><p>The pothole you reported has been <strong>fully repaired</strong>! You earned <strong>+20 bonus points</strong>. 🏆</p>`);
    }

    res.json(result.rows[0]);
  } catch (error) { console.error('Error updating status:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.get('/api/notifications', authenticateToken, requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/notifications/read', authenticateToken, requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ─── Route Safety Scoring ─────────────────────────────────────────────────────
app.post('/api/routes/score', async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!coordinates?.length) return res.status(400).json({ error: 'Invalid coordinates' });
    const lineString = `LINESTRING(${coordinates.map(c => `${c[0]} ${c[1]}`).join(', ')})`;
    const result = await pool.query(`
      SELECT id, severity FROM hazards
      WHERE ST_DWithin(location, ST_GeomFromText($1, 4326), 50, true) AND status != 'Resolved'
    `, [lineString]);
    const hazardsOnRoute = result.rows;
    const totalSeverity = hazardsOnRoute.reduce((sum, h) => sum + h.severity, 0);
    res.json({
      safetyScore: Math.max(0, 100 - totalSeverity * 2),
      hazardsCount: hazardsOnRoute.length,
      criticalHazards: hazardsOnRoute.filter(h => h.severity >= 8).length
    });
  } catch (error) { console.error('Route scoring error:', error); res.status(500).json({ error: 'Server error' }); }
});

app.listen(port, () => console.log(`Backend service running on port ${port}`));
