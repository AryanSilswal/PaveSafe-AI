const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');

const regexMap = /<CommuterMapComponent\s*hazards=\{hazards\}\s*location=\{location\}\s*routeCoordinates=\{routeCoordinates\}\s*onMapClick=\{handleMapClick\}\s*routeStart=\{routeStart\}\s*routeEnd=\{routeEnd\}\s*routeMode=\{routeMode\}\s*onUpvote=\{handleUpvote\}\s*\/>/m;

const replacementMap = `<CommuterMapComponent 
            hazards={hazards} 
            location={location} 
            routeCoordinates={routeCoordinates}
            onMapClick={handleMapClick}
            routeStart={routeStart}
            routeEnd={routeEnd}
            routeMode={routeMode}
            onUpvote={handleUpvote}
            isDriveMode={isDriveMode}
          />`;

code = code.replace(regexMap, replacementMap);

fs.writeFileSync('frontend/src/app/commuter/page.tsx', code);
console.log('Fixed Map Component Props');
