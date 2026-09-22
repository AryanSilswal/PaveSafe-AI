const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/CommuterMapComponent.tsx', 'utf8');

code = code.replace(/dY.?.? Open in Google Maps/, '🗺 Open in Google Maps');
code = code.replace(/dY.?.? Verify Hazard/, '👍 Verify Hazard');
code = code.replace(/\{hazard\.status\} A.? \{distLabel\}/, '{hazard.status} · {distLabel}');

fs.writeFileSync('frontend/src/components/CommuterMapComponent.tsx', code);
