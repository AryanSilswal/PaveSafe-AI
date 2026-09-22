
const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');

c = c.replace(
  'onClick={() => setPreviewImage(hazard.image_url)}',
  'onClick={() => { alert(\Opening image: \\); setPreviewImage(hazard.image_url); }}'
);

fs.writeFileSync('frontend/src/app/admin/page.tsx', c);

