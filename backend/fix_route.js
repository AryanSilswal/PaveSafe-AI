const fs = require('fs');
let serverCode = fs.readFileSync('server.js', 'utf8');

const regex = /app\.post\('\/api\/hazards\/:id\/upvote', authenticateToken, async \(req, res\) => \{[\s\S]*?\}\);/;
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

serverCode = serverCode.replace(regex, newEndpoint);
fs.writeFileSync('server.js', serverCode);
console.log('Replaced route via regex');
