const fs = require('fs');
const file = 'frontend/src/components/CommuterMapComponent.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add isDriveMode to props
const targetPropsDef = `export default function CommuterMapComponent({
  hazards, location, routeCoordinates, onMapClick, routeStart, routeEnd, routeMode, onUpvote
}: {
  hazards: any[], location: { lat: number; lng: number } | null,
  routeCoordinates?: [number, number][], onMapClick?: (latlng: { lat: number; lng: number }) => void,
  routeStart?: { lat: number; lng: number } | null,
  routeEnd?: { lat: number; lng: number } | null,
  routeMode?: boolean,
  onUpvote?: (id: number) => void
}) {`;

const newPropsDef = `export default function CommuterMapComponent({
  hazards, location, routeCoordinates, onMapClick, routeStart, routeEnd, routeMode, onUpvote, isDriveMode
}: {
  hazards: any[], location: { lat: number; lng: number } | null,
  routeCoordinates?: [number, number][], onMapClick?: (latlng: { lat: number; lng: number }) => void,
  routeStart?: { lat: number; lng: number } | null,
  routeEnd?: { lat: number; lng: number } | null,
  routeMode?: boolean,
  onUpvote?: (id: number) => void,
  isDriveMode?: boolean
}) {`;

if (code.includes(targetPropsDef)) {
    code = code.replace(targetPropsDef, newPropsDef);
} else {
    // Try a more flexible replace if spacing is off
    code = code.replace(
        `routeMode?: boolean,\n  onUpvote?: (id: number) => void\n})`,
        `routeMode?: boolean,\n  onUpvote?: (id: number) => void,\n  isDriveMode?: boolean\n})`
    );
    code = code.replace(
        `routeStart, routeEnd, routeMode, onUpvote\n}: {`,
        `routeStart, routeEnd, routeMode, onUpvote, isDriveMode\n}: {`
    );
}

// 2. Hide Radius Selector
const targetRadius = `{/* Radius Ring Toggle */}
      {location && (`;
const newRadius = `{/* Radius Ring Toggle */}
      {!isDriveMode && location && (`;
code = code.replace(targetRadius, newRadius);

// 3. Hide Minimap
const targetMinimap = `<MinimapInset location={location} />`;
const newMinimap = `{!isDriveMode && <MinimapInset location={location} />}`;
code = code.replace(targetMinimap, newMinimap);

fs.writeFileSync(file, code);
console.log('Patched CommuterMapComponent.tsx for Drive Mode');
