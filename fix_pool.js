const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const insertion = `
// Run migrations on boot to ensure schema exists
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
pool.query(\`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS recent_reports JSONB DEFAULT '[]';
  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_url TEXT;
  ALTER TABLE hazards ADD COLUMN IF NOT EXISTS image_public_id TEXT;
\`).catch(e => console.error('Migration error:', e));

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
`;

content = content.replace(/app\.use\(express\.json\(\)\);[\s\S]*?const upload = multer/, "app.use(express.json());\n" + insertion + "\nconst upload = multer");

fs.writeFileSync('backend/server.js', content);
console.log('Fixed');
