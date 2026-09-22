
const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
c = c.replace(/\\\\n/g, '\\n');
c = c.replace(/\\\\\$/g, '$');
c = c.replace(/\\\\\/g, '\');
fs.writeFileSync('src/app/admin/page.tsx', c);

