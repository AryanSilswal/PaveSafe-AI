const fs = require('fs');

// 1. COMMUTER MAP COMPONENT
let map = fs.readFileSync('frontend/src/components/CommuterMapComponent.tsx', 'utf8');
// Fix propagation
map = map.replace(
  'onClick={() => onUpvote && onUpvote(hazard.id)}',
  'onClick={(e) => { e.stopPropagation(); onUpvote && onUpvote(hazard.id); }}'
);
// Fix chars using code points to bypass encoding issues
const thumbsUp = String.fromCodePoint(0x1F44D);
const mapEmoji = String.fromCodePoint(0x1F5FA);

map = map.replace(/dY-\?. Open in Google Maps/, mapEmoji + ' Open in Google Maps');
map = map.replace(/dY\`\? Verify Hazard/, thumbsUp + ' Verify Hazard');
map = map.replace(/\{hazard\.status\} A\?. \{distLabel\}/, '{hazard.status} · {distLabel}');
fs.writeFileSync('frontend/src/components/CommuterMapComponent.tsx', map);


// 2. COMMUTER PAGE
let page = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');
if (!page.includes('const handleUpvote')) {
  page = page.replace(
    'async function fetchHazards() {',
    `const handleUpvote = async (id: number) => {
    if (!user) { alert('Please sign in to verify hazards.'); return; }
    try {
      const res = await axios.post(\`\${API_URL}/api/hazards/\${id}/upvote\`);
      setHazards(prev => prev.map(h => h.id === id ? { ...h, confirmation_count: res.data.confirmation_count } : h));
    } catch (e) {
      console.error(e);
    }
  };

  async function fetchHazards() {`
  );
}
if (!page.includes('onUpvote={handleUpvote}')) {
  page = page.replace(
    'routeMode={routeMode}',
    'routeMode={routeMode}\n            onUpvote={handleUpvote}'
  );
}
fs.writeFileSync('frontend/src/app/commuter/page.tsx', page);


// 3. ADMIN PAGE
let admin = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');
// It already has the <th> for upvotes, we just need the <td>.
if (!admin.includes('👍 {hazard.confirmation_count || 0}')) {
  admin = admin.replace(
    /<td className="p-4">\s*\{hazard\.assigned_worker \? \(/,
    `<td className="p-4 font-semibold text-blue-600">👍 {hazard.confirmation_count || 0}</td>
                        <td className="p-4">
                          {hazard.assigned_worker ? (`
  );
}
fs.writeFileSync('frontend/src/app/admin/page.tsx', admin);

console.log("All clean");
