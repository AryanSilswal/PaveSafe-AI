const fs = require('fs');

// 1. Fix Admin Map Component (Remove upvote action from popup)
let adminMapPath = 'frontend/src/components/AdminMapComponent.tsx';
let adminMap = fs.readFileSync(adminMapPath, 'utf8');
adminMap = adminMap.replace(
  /<button onclick="window._upvote\(\${h.id}\)".*?>👍 \${h.confirmation_count \|\| 0}<\/button>/,
  `` // Just remove it entirely
);
// Make Google maps button full width since the other is gone
adminMap = adminMap.replace(
  /flex:1;(.*?🗺 Google Maps<\/a>)/,
  `flex:1; width:100%;$1`
);
fs.writeFileSync(adminMapPath, adminMap);


// 2. Fix Commuter Map Component (Move Top:12 to Top:85, Add Upvote Prop & Button)
let commuterMapPath = 'frontend/src/components/CommuterMapComponent.tsx';
let commuterMap = fs.readFileSync(commuterMapPath, 'utf8');

// Fix overlap
commuterMap = commuterMap.replace(
  `top: 12, left: 12`,
  `top: 85, left: 12`
);

// Add onUpvote to props
commuterMap = commuterMap.replace(
  `routeMode?: boolean`,
  `routeMode?: boolean,\n  onUpvote?: (id: number) => void`
);
commuterMap = commuterMap.replace(
  `routeMode\n}:`,
  `routeMode, onUpvote\n}:`
);

// Add upvote button to popup
commuterMap = commuterMap.replace(
  `🗺 Open in Google Maps
                  </a>
                </div>`,
  `🗺 Open in Google Maps
                  </a>
                  <button onClick={() => onUpvote && onUpvote(hazard.id)} style={{ display: 'block', width: '100%', marginTop: 6, padding: '5px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}>
                    👍 Verify Hazard ({hazard.confirmation_count || 0})
                  </button>
                </div>`
);
fs.writeFileSync(commuterMapPath, commuterMap);


// 3. Update Commuter Page (Pass onUpvote)
let commuterPagePath = 'frontend/src/app/commuter/page.tsx';
let commuterPage = fs.readFileSync(commuterPagePath, 'utf8');

// Inject handleUpvote
commuterPage = commuterPage.replace(
  `  const fetchHazards = async () => {`,
  `  const handleUpvote = async (id: number) => {
    if (!user) { alert('Please sign in to verify hazards.'); return; }
    try {
      const res = await axios.post(\`\${API_URL}/api/hazards/\${id}/upvote\`);
      setHazards(prev => prev.map(h => h.id === id ? { ...h, confirmation_count: res.data.confirmation_count } : h));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHazards = async () => {`
);

// Pass onUpvote to component
commuterPage = commuterPage.replace(
  `routeMode={routeMode}
          />`,
  `routeMode={routeMode}
            onUpvote={handleUpvote}
          />`
);
fs.writeFileSync(commuterPagePath, commuterPage);


// 4. Update Admin Page (Add Upvotes column)
let adminPagePath = 'frontend/src/app/admin/page.tsx';
let adminPage = fs.readFileSync(adminPagePath, 'utf8');

adminPage = adminPage.replace(
  `<th onClick={() => requestSort('status')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Status {getSortIcon('status')}</th>`,
  `<th onClick={() => requestSort('status')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Status {getSortIcon('status')}</th>
                      <th onClick={() => requestSort('confirmation_count')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Upvotes {getSortIcon('confirmation_count')}</th>`
);

adminPage = adminPage.replace(
  `{hazard.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {hazard.assigned_worker`,
  `{hazard.status}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-blue-600">👍 {hazard.confirmation_count || 0}</td>
                        <td className="p-4">
                          {hazard.assigned_worker`
);
fs.writeFileSync(adminPagePath, adminPage);

console.log("All fixes applied successfully.");
