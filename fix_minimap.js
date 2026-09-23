const fs = require('fs');
const file = 'frontend/src/components/CommuterMapComponent.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = "bottom: 16, left: 16, zIndex: 1000";
const replacement = "bottom: 100, left: 24, zIndex: 1000";

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
console.log('Fixed minimap overlap');
