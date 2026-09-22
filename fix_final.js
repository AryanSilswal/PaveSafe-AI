const fs = require('fs');

// 1. Fix CommuterMapComponent.tsx Popup
let commuter = fs.readFileSync('frontend/src/components/CommuterMapComponent.tsx', 'utf8');

const startMarker = '<Popup>';
const endMarker = '</Popup>';
const startIndex = commuter.indexOf(startMarker);
const endIndex = commuter.indexOf(endMarker) + endMarker.length;

const cleanPopup = `<Popup>
                <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {hazard.image_url && <img src={hazard.image_url} alt="hazard" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>Hazard #{hazard.id}</strong>
                    <span style={{ background: getSeverityColor(hazard.severity), color: 'white', padding: '1px 8px', borderRadius: 99, fontSize: 12, fontWeight: 'bold' }}>Sev {hazard.severity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{hazard.status} · {distLabel}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(hazard.reported_at).toLocaleDateString()}</div>
                  <a href={\`https://maps.google.com/?q=\${hazard.latitude},\${hazard.longitude}\`} target="_blank" rel="noreferrer"
                    style={{ display: 'block', marginTop: 8, textAlign: 'center', padding: '5px', background: '#3b82f6', color: 'white', borderRadius: 6, fontSize: 11, textDecoration: 'none', fontWeight: 'bold' }}>
                    🗺 Open in Google Maps
                  </a>
                  <button onClick={(e) => { e.stopPropagation(); onUpvote && onUpvote(hazard.id); }} style={{ display: 'block', width: '100%', marginTop: 6, padding: '5px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}>
                    👍 Verify Hazard ({hazard.confirmation_count || 0})
                  </button>
                </div>
              </Popup>`;

commuter = commuter.substring(0, startIndex) + cleanPopup + commuter.substring(endIndex);
fs.writeFileSync('frontend/src/components/CommuterMapComponent.tsx', commuter);

// 2. Fix Admin Page alignment (add the missing upvote <td>)
let admin = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');

admin = admin.replace(
  /<td className="p-4">\s*\{hazard\.assigned_worker \? \(/g,
  `<td className="p-4 font-semibold text-blue-600">👍 {hazard.confirmation_count || 0}</td>
                        <td className="p-4">
                          {hazard.assigned_worker ? (`
);

// If it applied correctly, it should now have 8 columns
fs.writeFileSync('frontend/src/app/admin/page.tsx', admin);

console.log("Fixes applied successfully.");
