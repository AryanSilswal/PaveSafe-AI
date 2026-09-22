const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

// 1. Case-insensitive username check + unique constraint
c = c.replace(
  /WHERE username = \$1/g,
  'WHERE LOWER(username) = LOWER($1)'
);
c = c.replace(
  'ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;',
  'ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;\n  ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username) DEFERRABLE INITIALLY IMMEDIATE; /* May fail if duplicates exist, but postgres handles it if we use IF NOT EXISTS conceptually or we can skip raw alter if it crashes */'
);

// We need a safe ALTER that doesn't crash if constraint exists
c = c.replace(
  'ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;',
  `ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;
  DO $$
  BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
  END $$;`
);

// 2. Remove immediate points on report
c = c.replace(
  `      // Reward points for reporting if logged in
      if (reporter_id) {
        await pool.query('UPDATE users SET points = points + 5 WHERE id = $1', [reporter_id]);
      }`,
  ''
);

// 3. Add points on Dispatch (In Progress) instead
const approvalLogic = `// Handling Approval Window
      if ((status === 'In Progress' || status === 'Resolved') && hazardData.status === 'Reported' && hazardData.reporter_id) {
         const uRes = await pool.query('SELECT recent_reports FROM users WHERE id = $1', [hazardData.reporter_id]);
         let recent = uRes.rows[0].recent_reports || [];
         recent.push('approved');
         if (recent.length > 10) recent.shift();
         
         // Award 5 points on dispatch!
         await pool.query('UPDATE users SET points = points + 5, recent_reports = $1 WHERE id = $2', [JSON.stringify(recent), hazardData.reporter_id]);
         await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [hazardData.reporter_id, 'Your recent report was verified and dispatched! You earned 5 points.']);
      }`;

c = c.replace(
  `// Handling Approval Window
      if ((status === 'In Progress' || status === 'Resolved') && hazardData.status === 'Reported' && hazardData.reporter_id) {
         const uRes = await pool.query('SELECT recent_reports FROM users WHERE id = $1', [hazardData.reporter_id]);
         let recent = uRes.rows[0].recent_reports || [];
         recent.push('approved');
         if (recent.length > 10) recent.shift();
         await pool.query('UPDATE users SET recent_reports = $1 WHERE id = $2', [JSON.stringify(recent), hazardData.reporter_id]);
      }`,
  approvalLogic
);

// Also remove it if they do duplicate username check
c = c.replace('if (userCheck.rows.length > 0) return res.status(400).json({ error: \'Username taken\' });', 
'if (userCheck.rows.length > 0) return res.status(400).json({ error: \'Username is already taken\' });');

fs.writeFileSync('backend/server.js', c);
console.log("Backend patched!");
