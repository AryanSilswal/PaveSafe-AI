const fs = require('fs');
const file = 'frontend/src/app/commuter/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Hide the Sidebar when in Drive Mode
const sidebarTarget = `      {/* Sidebar */}
      <div className="w-full min-h-[100dvh] lg:min-h-0 lg:h-[100dvh] lg:w-96 bg-white shadow-xl z-10 flex flex-col p-6 space-y-8 shrink-0 border-b-2 lg:border-b-0 border-gray-200 lg:overflow-y-auto">`;
const sidebarReplacement = `      {/* Sidebar */}
      <div className={\`w-full min-h-[100dvh] lg:min-h-0 lg:h-[100dvh] lg:w-96 bg-white shadow-xl z-10 flex-col p-6 space-y-8 shrink-0 border-b-2 lg:border-b-0 border-gray-200 lg:overflow-y-auto \${isDriveMode ? 'hidden' : 'flex'}\`}>`;

code = code.replace(sidebarTarget, sidebarReplacement);

// 2. Hide Mobile scroll handle in Drive Mode
const mobileScrollTarget = `<div className="lg:hidden w-full bg-slate-800 text-blue-100 p-3 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md z-10 select-none">`;
const mobileScrollReplacement = `<div className={\`lg:hidden w-full bg-slate-800 text-blue-100 p-3 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md z-10 select-none \${isDriveMode ? 'hidden' : 'flex'}\`}>`;
code = code.replace(mobileScrollTarget, mobileScrollReplacement);

// 3. Pass isDriveMode prop to CommuterMapComponent
const mapTarget = `<CommuterMapComponent 
            hazards={hazards} 
            location={location} 
            routeCoordinates={routeCoordinates}
            onMapClick={handleMapClick}
            routeStart={routeStart}
            routeEnd={routeEnd}
            routeMode={routeMode}
            selectingPoint={selectingPoint}
          />`;
const mapReplacement = `<CommuterMapComponent 
            hazards={hazards} 
            location={location} 
            routeCoordinates={routeCoordinates}
            onMapClick={handleMapClick}
            routeStart={routeStart}
            routeEnd={routeEnd}
            routeMode={routeMode}
            selectingPoint={selectingPoint}
            isDriveMode={isDriveMode}
          />`;
code = code.replace(mapTarget, mapReplacement);

fs.writeFileSync(file, code);
console.log('Patched commuter page.tsx');
