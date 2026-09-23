const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');

const regex = /\{\/\* Sidebar \*\/\}\s*<div className="w-full min-h-\[100dvh\] lg:min-h-0 lg:h-\[100dvh\] lg:w-96 bg-white shadow-xl z-10 flex flex-col p-6 space-y-8 shrink-0 border-b-2 lg:border-b-0 border-gray-200 lg:overflow-y-auto">/;
const replacement = `{/* Sidebar */}
      <div className={\`w-full min-h-[100dvh] lg:min-h-0 lg:h-[100dvh] lg:w-96 bg-white shadow-xl z-10 flex-col p-6 space-y-8 shrink-0 border-b-2 lg:border-b-0 border-gray-200 lg:overflow-y-auto \${isDriveMode ? 'hidden' : 'flex'}\`}>`;

code = code.replace(regex, replacement);

fs.writeFileSync('frontend/src/app/commuter/page.tsx', code);
console.log('Fixed Sidebar visibility logic');
