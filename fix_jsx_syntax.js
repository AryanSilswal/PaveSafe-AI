const fs = require('fs');
const file = 'frontend/src/components/CommuterMapComponent.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix the syntax error in JSX <style> tag
code = code.replace(
    '{isDriveMode && <style>{.leaflet-control-container { display: none !important; }}</style>}',
    '{isDriveMode && <style>{\`.leaflet-control-container { display: none !important; }\`}</style>}'
);

fs.writeFileSync(file, code);
console.log('Fixed JSX syntax error');
