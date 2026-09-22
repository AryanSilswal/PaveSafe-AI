const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');

// 1. Add cloudinary
if (!content.includes('cloudinary')) {
  content = content.replace(
    'require(\'dotenv\').config();',
    `require('dotenv').config();\nconst { v2: cloudinary } = require('cloudinary');\n\ncloudinary.config({\n  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,\n  api_key: process.env.CLOUDINARY_API_KEY,\n  api_secret: process.env.CLOUDINARY_API_SECRET\n});`
  );
  
  // Run schema update on boot
  content = content.replace(
    'const pool = new Pool({\n  connectionString: process.env.DATABASE_URL,\n});',
    `// Run migrations on boot to ensure schema exists\nconst pool = new Pool({\n  connectionString: process.env.DATABASE_URL,\n});\npool.query(\`\n  ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;\n  ALTER TABLE users ADD COLUMN IF NOT EXISTS recent_reports JSONB DEFAULT '[]';\n  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_url TEXT;\n  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;\n\`).catch(e => console.error('Migration error:', e));\n\nconst uploadToCloudinary = (buffer) => {\n  return new Promise((resolve, reject) => {\n    if (!process.env.CLOUDINARY_CLOUD_NAME) return resolve({secure_url: null, public_id: null});\n    const stream = cloudinary.uploader.upload_stream({ folder: 'pavesafe' }, (error, result) => {\n      if (error) return reject(error);\n      resolve(result);\n    });\n    stream.end(buffer);\n  });\n};\n`
  );
  content = content.replace(
    'const pool = new Pool({\r\n  connectionString: process.env.DATABASE_URL,\r\n});',
    ''
  );
}

// 2. Modify Login
if (!content.includes('Account suspended')) {
  content = content.replace(
    'const validPassword = await bcrypt.compare(password, user.password_hash);',
    `const validPassword = await bcrypt.compare(password, user.password_hash);\n      if (validPassword && user.banned_until && new Date(user.banned_until) > new Date()) {\n        return res.status(403).json({ error: \`Account suspended until \${new Date(user.banned_until).toLocaleDateString()} due to repeated invalid reports.\` });\n      }`
  );
}

// 3. Modify Report Endpoint
if (content.includes('INSERT INTO hazards (location, severity, status, reporter_id, reported_at)')) {
  content = content.replace('INSERT INTO hazards (location, severity, status, reporter_id, reported_at)', 'INSERT INTO hazards (location, severity, status, reporter_id, reported_at, image_url, image_public_id)');
  content = content.replace("VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, 'Reported', $4, NOW())", "VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, 'Reported', $4, NOW(), $5, $6)");
  content = content.replace('const result = await pool.query(query, [parseFloat(longitude), parseFloat(latitude), severity, reporter_id]);', `let cloudUpload = { secure_url: null, public_id: null };\n      if (image && image.buffer) {\n        try { cloudUpload = await uploadToCloudinary(image.buffer); } catch(e) { console.error('Cloudinary error', e); }\n      }\n      const result = await pool.query(query, [parseFloat(longitude), parseFloat(latitude), severity, reporter_id, cloudUpload.secure_url, cloudUpload.public_id]);`);
}

// 4. Modify Status Endpoint
content = content.replace("if (!['Reported', 'In Progress', 'Resolved'].includes(status)) {", "if (!['Reported', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {");
content = content.replace("const currentHazard = await pool.query('SELECT reporter_id, status FROM hazards WHERE id = $1', [id]);", "const currentHazard = await pool.query('SELECT reporter_id, status, image_public_id FROM hazards WHERE id = $1', [id]);");

if (!content.includes('Handling Rejection')) {
  const replacement = `
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
            banQuery = \`, banned_until = NOW() + INTERVAL '2 months'\`;
         }
         
         await pool.query(\`UPDATE users SET points = GREATEST(0, points - 20), recent_reports = $1 \${banQuery} WHERE id = $2\`, [JSON.stringify(recent), hazardData.reporter_id]);
         await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [hazardData.reporter_id, 'Your recent hazard report was rejected. 20 points have been deducted.']);
      }

      if (status === 'Resolved' && hazardData.status !== 'Resolved' && hazardData.reporter_id) {`;
      
  content = content.replace("if (status === 'Resolved' && hazardData.status !== 'Resolved' && hazardData.reporter_id) {", replacement);
}

content = content.replace('h.id, h.severity, h.status, h.reported_at, h.assigned_worker, h.deadline, h.reporter_id,', 'h.id, h.severity, h.status, h.reported_at, h.assigned_worker, h.deadline, h.reporter_id, h.image_url,');

fs.writeFileSync('backend/server.js', content);
console.log('Patch complete');
