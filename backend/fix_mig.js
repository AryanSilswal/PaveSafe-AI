const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');
server = server.replace('DO $', () => 'DO $$');
server = server.replace('END $;', () => 'END $$;');
fs.writeFileSync('server.js', server);
console.log('Fixed migration syntax');
