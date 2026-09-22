const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');
c = c.replace(
  "pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);",
  "pool.query('SELECT id FROM users WHERE username = $1', [username]);"
);
fs.writeFileSync('backend/server.js', c);
console.log("Patched case-sensitive username!");
