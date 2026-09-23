const fs = require('fs');

// 1. Patch Landing Page (page.tsx)
let lp = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');
lp = lp.replace(
  '<ShieldAlert size={64} className="text-blue-600" />',
  '<img src="/logo.svg" alt="PaveSafe Logo" className="w-16 h-16 drop-shadow-md" />'
);
fs.writeFileSync('frontend/src/app/page.tsx', lp);

// 2. Patch Commuter Module (commuter/page.tsx)
let cp = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');
cp = cp.replace(
  '<Navigation className="text-blue-600" />',
  '<img src="/logo.svg" alt="PaveSafe Logo" className="w-8 h-8 drop-shadow-sm" />'
);
fs.writeFileSync('frontend/src/app/commuter/page.tsx', cp);

// 3. Patch Admin Dashboard (admin/page.tsx)
let ap = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');
ap = ap.replace(
  '<ShieldCheck className="text-blue-400" size={28}/>',
  '<img src="/logo.svg" alt="PaveSafe Logo" className="w-8 h-8 drop-shadow-sm" />'
);
fs.writeFileSync('frontend/src/app/admin/page.tsx', ap);

console.log('Successfully replaced all brand icons with the new logo.svg');
