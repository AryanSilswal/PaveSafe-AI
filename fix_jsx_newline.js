const fs = require('fs');
const file = 'frontend/src/components/CommuterMapComponent.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix the literal '\n' text issue
code = code.replace(
    '{isDriveMode && <style>{`.leaflet-control-container { display: none !important; }`}</style>}\\n      {/* Radius Ring Toggle */}',
    '{isDriveMode && <style>{`.leaflet-control-container { display: none !important; }`}</style>}\n      {/* Radius Ring Toggle */}'
);

fs.writeFileSync(file, code);
console.log('Fixed literal newline in JSX');
