const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');

c = c.replace(
  /const fetchHazards = async \(\) => {[\s\S]*?console\.error\('Error fetching hazards:', error\);\s*}\s*};\s*/,
  `$&

  const fetchTrend = async () => {
    try {
      const res = await axios.get(\`\${API_URL}/api/hazards/trend\`);
      const byDate = {};
      for (const row of res.data) {
        const d = row.date;
        if (!byDate[d]) byDate[d] = { date: d };
        const tier = row.severity >= 8 ? 'Critical' : row.severity >= 4 ? 'Moderate' : 'Low';
        byDate[d][tier] = (byDate[d][tier] || 0) + parseInt(row.count);
      }
      setTrendData(Object.values(byDate));
    } catch {}
  };

  const chronicHotspots = useMemo(() => {
    const hotspots = [];
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
`
);

fs.writeFileSync('frontend/src/app/admin/page.tsx', c);
