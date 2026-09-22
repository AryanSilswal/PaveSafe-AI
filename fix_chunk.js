const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/CommuterMapComponent.tsx', 'utf8');

const searchChunk = `                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {hazard.image_url && <img src={hazard.image_url} alt="hazard" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>Hazard #{hazard.id}</strong>
                    <span style={{ background: getSeverityColor(hazard.severity), color: 'white', padding: '1px 8px', borderRadius: 99, fontSize: 12, fontWeight: 'bold' }}>Sev {hazard.severity}</span>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{hazard.status} A {distLabel}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{hazard.status} A {distLabel}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(hazard.reported_at).toLocaleDateString()}</div>
                  <a href={\`https://maps.google.com/?q=\${hazard.latitude},\${hazard.longitude}\`} target="_blank" rel="noreferrer"
                    dY- Open in Google Maps
                    dY- Open in Google Maps
                  </a>
                    dY\`? Verify Hazard ({hazard.confirmation_count || 0})
                    dY\`? Verify Hazard ({hazard.confirmation_count || 0})
                  </button>
                </div>
              </Popup>`;

const replacement = `                  {/* eslint-disable-next-line @next/next/no-img-element */}
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

// Due to raw encoding, it's safer to just splice it using the array of lines since `replace` might fail on the weird chars.
const lines = code.split('\\n');
const startIdx = lines.findIndex(l => l.includes('eslint-disable-next-line @next/next/no-img-element'));
const endIdx = startIdx + 20; // It spans around 16 lines

if (startIdx !== -1) {
    const pre = lines.slice(0, startIdx);
    const post = lines.slice(startIdx + 17); // 17 lines down is `</Popup>`
    
    fs.writeFileSync('frontend/src/components/CommuterMapComponent.tsx', pre.join('\\n') + '\\n' + replacement + '\\n' + post.join('\\n'));
}
