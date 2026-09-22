const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');

// 1. Add profile state + fetch after audioCtxRef declaration
c = c.replace(
  `  const audioCtxRef = useRef<any>(null);`,
  `  const audioCtxRef = useRef<any>(null);

  // Profile Drawer
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(\`\${API_URL}/api/users/profile\`);
      setProfileData(res.data);
    } catch {}
  };`
);

// 2. Compute upcoming hazards ahead of the user (in drive mode) - add after unreadCount
c = c.replace(
  `  const unreadCount = notifications.filter(n => !n.is_read).length;`,
  `  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Compute upcoming hazards in ±45° forward cone for drive mode
  const upcomingHazards = (() => {
    if (!isDriveMode || !location) return [];
    return hazards
      .filter(h => h.status !== 'Resolved' && h.status !== 'Rejected')
      .map(h => {
        const dist = calcDistance(location.lat, location.lng, h.latitude, h.longitude);
        return { ...h, distance: dist };
      })
      .filter(h => h.distance < 2000)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  })();`
);

// 3. Add profile drawer modal before Login Modal comment
c = c.replace(
  `      {/* Login Modal */}`,
  `      {/* Profile Drawer */}
      {showProfile && profileData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white mb-4">
              <div className="text-lg font-bold">@{profileData.username}</div>
              <div className="text-sm opacity-80 mt-1">{profileData.rank}</div>
              <div className="text-3xl font-black mt-2">{profileData.points} <span className="text-base font-normal opacity-80">pts</span></div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-white/20 rounded-lg p-2"><div className="text-xl font-bold">{profileData.totalReports}</div><div className="text-xs opacity-80">Reports</div></div>
                <div className="bg-white/20 rounded-lg p-2"><div className="text-xl font-bold text-green-300">{profileData.resolvedReports}</div><div className="text-xs opacity-80">Resolved</div></div>
                <div className="bg-white/20 rounded-lg p-2"><div className="text-xl font-bold text-red-300">{profileData.rejectedReports}</div><div className="text-xs opacity-80">Rejected</div></div>
              </div>
            </div>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wider">Report History</h3>
            <div className="space-y-2">
              {profileData.reports.length === 0 && <p className="text-sm text-gray-400 italic">No reports yet.</p>}
              {profileData.reports.map((r: any) => (
                <div key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Hazard #{r.id}</span>
                    <span className="ml-2 text-xs text-gray-400">{new Date(r.reported_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{color: r.severity >= 8 ? '#ef4444' : r.severity >= 4 ? '#f59e0b' : '#22c55e'}}>Sev {r.severity}</span>
                    <span className={\`text-xs px-2 py-0.5 rounded-full font-semibold \${r.status === 'Resolved' ? 'bg-green-100 text-green-700' : r.status === 'Rejected' ? 'bg-red-100 text-red-700' : r.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}\`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}`
);

// 4. Make the gamification card clickable to open profile
c = c.replace(
  `        {/* Gamification Stats */}
        {user && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-md">
            <p className="text-sm opacity-80">Hello, {user.username}</p>
            <div className="flex justify-between items-end mt-1">
              <h3 className="text-2xl font-bold">{user.points} <span className="text-sm font-normal opacity-80">pts</span></h3>
              <span className="text-sm font-semibold bg-white/20 px-2 py-1 rounded-full">Safe Citizen</span>
            </div>
          </div>
        )}`,
  `        {/* Gamification Stats - clickable to open profile */}
        {user && (
          <button onClick={() => { setShowProfile(true); fetchProfile(); }} className="w-full text-left bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-md hover:from-blue-700 hover:to-indigo-800 transition-all">
            <p className="text-sm opacity-80">Hello, {user.username} · <span className="underline text-xs">View Profile</span></p>
            <div className="flex justify-between items-end mt-1">
              <h3 className="text-2xl font-bold">{user.points} <span className="text-sm font-normal opacity-80">pts</span></h3>
              <span className="text-sm font-semibold bg-white/20 px-2 py-1 rounded-full">Safe Citizen</span>
            </div>
          </button>
        )}`
);

// 5. Add upcoming hazard list + countdown bar to drive mode dashboard
c = c.replace(
  `           {/* Drive Mode Toggle Button */}`,
  `           {/* Upcoming Hazards List */}
           {isDriveMode && upcomingHazards.length > 0 && (
             <div className="absolute top-28 left-4 z-[1000] w-56 space-y-2 pointer-events-none">
               <div className="bg-slate-800/90 backdrop-blur rounded-lg p-2">
                 <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 px-1">⚠ Ahead</div>
                 {upcomingHazards.map((h, i) => (
                   <div key={h.id} className={\`flex items-center justify-between px-2 py-1.5 rounded-md \${i === 0 ? 'bg-red-500/80' : 'bg-slate-700/80'}\`}>
                     <span className="text-white font-bold text-xs">Sev {h.severity}</span>
                     <span className="text-white/80 text-xs">{Math.round(h.distance)}m</span>
                   </div>
                 ))}
               </div>
               {/* Countdown bar for closest hazard */}
               {activeAlert && (
                 <div className="bg-slate-800/90 backdrop-blur rounded-lg p-2">
                   <div className="text-xs text-red-400 font-bold mb-1">Proximity</div>
                   <div className="w-full bg-slate-700 rounded-full h-2">
                     <div
                       className="bg-red-500 h-2 rounded-full transition-all duration-500"
                       style={{ width: \`\${Math.min(100, Math.max(0, 100 - (activeAlert.distance / (30 + currentSpeed * 5)) * 100))}%\` }}
                     />
                   </div>
                   <div className="text-xs text-white mt-1 text-right">{Math.round(activeAlert.distance)}m</div>
                 </div>
               )}
             </div>
           )}

           {/* Drive Mode Toggle Button */}`
);

fs.writeFileSync('frontend/src/app/commuter/page.tsx', c);
console.log("Commuter page patched!");
