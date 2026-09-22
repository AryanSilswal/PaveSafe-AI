const fs = require('fs');

// 1. UPDATE BACKEND SERVER.JS
let serverCode = fs.readFileSync('backend/server.js', 'utf8');

// A. Inject the table creation migration
const migrationTarget = "ALTER TABLE hazards ADD COLUMN IF NOT EXISTS confirmation_count INTEGER DEFAULT 0;";
const migrationReplacement = `ALTER TABLE hazards ADD COLUMN IF NOT EXISTS confirmation_count INTEGER DEFAULT 0;
  CREATE TABLE IF NOT EXISTS hazard_upvotes (
    hazard_id INTEGER REFERENCES hazards(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (hazard_id, user_id)
  );`;
if (!serverCode.includes('CREATE TABLE IF NOT EXISTS hazard_upvotes')) {
    serverCode = serverCode.replace(migrationTarget, migrationReplacement);
}

// B. Rewrite the upvote endpoint
const oldEndpoint = `app.post('/api/hazards/:id/upvote', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        'UPDATE hazards SET confirmation_count = confirmation_count + 1 WHERE id = $1 RETURNING id, confirmation_count',
        [req.params.id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Hazard not found' });
      res.json(result.rows[0]);
    } catch { res.status(500).json({ error: 'Server error' }); }
  });`;

const newEndpoint = `app.post('/api/hazards/:id/upvote', authenticateToken, async (req, res) => {
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
  });`;

serverCode = serverCode.replace(oldEndpoint, newEndpoint);
fs.writeFileSync('backend/server.js', serverCode);

// 2. UPDATE FRONTEND PAGE.TSX
let frontendCode = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');

const oldHandleUpvote = `  const handleUpvote = async (id: number) => {
    if (!user) { alert('Please sign in to verify hazards.'); return; }
    try {
      const res = await axios.post(\`\${API_URL}/api/hazards/\${id}/upvote\`);
      setHazards(prev => prev.map(h => h.id === id ? { ...h, confirmation_count: res.data.confirmation_count } : h));
    } catch (e) {
      console.error(e);
    }
  };`;

const newHandleUpvote = `  const handleUpvote = async (id: number) => {
    if (!user) { alert('Please sign in to verify hazards.'); return; }
    try {
      const res = await axios.post(\`\${API_URL}/api/hazards/\${id}/upvote\`);
      setHazards(prev => prev.map(h => h.id === id ? { ...h, confirmation_count: res.data.confirmation_count } : h));
      alert('Hazard verified! Thank you.');
    } catch (e: any) {
      if (e.response && e.response.status === 400) {
        alert('You have already verified this hazard!');
      } else {
        console.error(e);
      }
    }
  };`;

// Use regex matching spaces for safety if indentation differs slightly
const handleRegex = /const handleUpvote = async \(id: number\) => \{[\s\S]*?catch \(e\) \{\s*console\.error\(e\);\s*\}\s*\};/;
frontendCode = frontendCode.replace(handleRegex, newHandleUpvote);
fs.writeFileSync('frontend/src/app/commuter/page.tsx', frontendCode);

console.log("Upvote deduplication logic applied");
