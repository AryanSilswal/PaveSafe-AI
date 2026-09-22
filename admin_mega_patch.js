const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');

// 1. Add recharts import
c = c.replace(
  `import axios from 'axios';`,
  `import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';`
);

// 2. Add trendData + hotspots state after showExportModal state
c = c.replace(
  `  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);`,
  `  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Analytics
  const [trendData, setTrendData] = useState<any[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);`
);

// 3. Add fetchTrend function and call it after fetchHazards
c = c.replace(
  `  const fetchHazards = async () => {
    try {
      const res = await axios.get(\`\${API_URL}/api/hazards\`);
      setHazards(res.data);
    } catch (error) {
      console.error('Error fetching hazards:', error);
    }
  };`,
  `  const fetchHazards = async () => {
    try {
      const res = await axios.get(\`\${API_URL}/api/hazards\`);
      setHazards(res.data);
    } catch (error) {
      console.error('Error fetching hazards:', error);
    }
  };

  const fetchTrend = async () => {
    try {
      const res = await axios.get(\`\${API_URL}/api/hazards/trend\`);
      // Group by date, create a chart-friendly format
      const byDate: Record<string, any> = {};
      for (const row of res.data) {
        const d = row.date;
        if (!byDate[d]) byDate[d] = { date: d };
        const tier = row.severity >= 8 ? 'Critical' : row.severity >= 4 ? 'Moderate' : 'Low';
        byDate[d][tier] = (byDate[d][tier] || 0) + parseInt(row.count);
      }
      setTrendData(Object.values(byDate));
    } catch {}
  };`
);

// 4. Call fetchTrend when auth succeeds
c = c.replace(
  `    if (isAuthenticated) {
      fetchHazards();
      const interval = setInterval(fetchHazards, 10000);`,
  `    if (isAuthenticated) {
      fetchHazards();
      fetchTrend();
      const interval = setInterval(fetchHazards, 10000);`
);

// 5. Compute chronic hotspots (client-side)
c = c.replace(
  `  const handleExport = (type: 'all' | 'filtered') => {`,
  `  // Compute chronic hotspots: locations with 2+ reports within 100m of each other
  const chronicHotspots = useMemo(() => {
    const hotspots: any[] = [];
    for (let i = 0; i < hazards.length; i++) {
      const cluster = hazards.filter((h, j) => {
        if (j === i) return false;
        const R = 6371e3;
        const dLat = (h.latitude - hazards[i].latitude) * Math.PI / 180;
        const dLon = (h.longitude - hazards[i].longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(hazards[i].latitude * Math.PI/180) * Math.cos(h.latitude * Math.PI/180) * Math.sin(dLon/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return dist < 100;
      });
      if (cluster.length >= 1 && !hotspots.find(h => Math.abs(h.latitude - hazards[i].latitude) < 0.001)) {
        hotspots.push({ ...hazards[i], clusterCount: cluster.length + 1 });
      }
    }
    return hotspots.sort((a, b) => b.clusterCount - a.clusterCount).slice(0, 5);
  }, [hazards]);

  const handleExport = (type: 'all' | 'filtered') => {`
);

// 6. Add Analytics toggle button in the header next to Export CSV
c = c.replace(
  `          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-1.5 rounded-lg font-medium transition-colors border border-emerald-500/30 text-sm"
          >
            <Download size={16} /> Export CSV
          </button>`,
  `          <button
            onClick={() => { setShowAnalytics(v => !v); if (!trendData.length) fetchTrend(); }}
            className={\`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-colors text-sm border \${showAnalytics ? 'bg-purple-600/30 text-purple-300 border-purple-500/30' : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border-purple-500/30'}\`}
          >
            📊 Analytics
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-1.5 rounded-lg font-medium transition-colors border border-emerald-500/30 text-sm"
          >
            <Download size={16} /> Export CSV
          </button>`
);

// 7. Add Analytics panel below the stats cards but above the table
c = c.replace(
  `        {viewMode === 'list' ? (`,
  `        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">📈 Severity Trend (Last 30 Days)</h3>
              {trendData.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">No data yet. Reports will appear here.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Critical" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Moderate" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Low" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chronic Hotspots */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">🔁 Chronic Problem Areas</h3>
              {chronicHotspots.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">No recurring hotspots detected yet.</p>
              ) : (
                <div className="space-y-2">
                  {chronicHotspots.map(h => (
                    <div key={h.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Near #{h.id}</span>
                        <span className="text-xs text-gray-400 ml-2">{parseFloat(h.latitude).toFixed(4)}, {parseFloat(h.longitude).toFixed(4)}</span>
                      </div>
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">{h.clusterCount} reports</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'list' ? (`
);

fs.writeFileSync('frontend/src/app/admin/page.tsx', c);
console.log("Admin page patched!");
