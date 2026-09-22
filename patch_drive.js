const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');

const stateInjection = `
  // Drive Mode State
  const [isDriveMode, setIsDriveMode] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0); // m/s
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const watchIdRef = React.useRef<number | null>(null);
  const alertedHazardsRef = React.useRef<Set<number>>(new Set());
  const audioCtxRef = React.useRef<any>(null);
`;

// Needs React imported, but it's already there via hooks. I'll just use import React.
if (!content.includes('import React')) {
  content = content.replace("import { useState, useEffect }", "import React, { useState, useEffect, useRef }");
}

content = content.replace("const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);", "const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);\n" + stateInjection);

const logicInjection = `
  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  const toRad = (val: number) => val * Math.PI / 180;
  const toDeg = (val: number) => val * 180 / Math.PI;

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = toRad(lat1);
    const p2 = toRad(lat2);
    const dp = toRad(lat2-lat1);
    const dl = toRad(lon2-lon1);
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calcBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
    const brng = Math.atan2(y, x);
    return (toDeg(brng) + 360) % 360;
  };

  const toggleDriveMode = () => {
    if (isDriveMode) {
      setIsDriveMode(false);
      setActiveAlert(null);
      setCurrentSpeed(0);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    } else {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      setIsDriveMode(true);
      alertedHazardsRef.current.clear();
      
      if ('geolocation' in navigator) {
        let lastLat: number | null = null;
        let lastLon: number | null = null;
        let lastTime: number = Date.now();

        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            let speed = pos.coords.speed;
            let heading = pos.coords.heading;

            const currentLat = pos.coords.latitude;
            const currentLon = pos.coords.longitude;
            const currentTime = Date.now();

            if (speed === null && lastLat !== null && lastLon !== null) {
              const dist = calcDistance(lastLat, lastLon, currentLat, currentLon);
              const timeSecs = (currentTime - lastTime) / 1000;
              if (timeSecs > 0) speed = dist / timeSecs;
              else speed = 0;
            }
            if (heading === null && lastLat !== null && lastLon !== null) {
              heading = calcBearing(lastLat, lastLon, currentLat, currentLon);
            }
            
            speed = speed || 0;
            setCurrentSpeed(speed);
            setLocation({ lat: currentLat, lng: currentLon });
            
            lastLat = currentLat;
            lastLon = currentLon;
            lastTime = currentTime;

            let warningDist = 30 + (speed * 5); // 30m base + 5s reaction time
            let foundAlert = null;

            // Needs access to current hazards state. In React, stale closures might happen. 
            // We use functional state or a ref for hazards in complex setups, but here 
            // since we depend on hazards, we should grab latest. But watchPosition creates a closure.
            // Using a hack to get latest state from DOM or just accepting slight staleness for MVP.
            // Let's use the local \`hazards\` array if available, but it might be stale.
            // Actually, we can just let it be slightly stale or rely on it tracking properly.
            // Wait, for this MVP we can just use the closure \`hazards\`.
            
            for (const hazard of hazards) {
              if (hazard.status === 'Resolved' || hazard.status === 'Rejected') continue;
              const d = calcDistance(currentLat, currentLon, hazard.latitude, hazard.longitude);
              
              if (d < warningDist) {
                if (heading !== null && heading !== undefined) {
                   const hazardBearing = calcBearing(currentLat, currentLon, hazard.latitude, hazard.longitude);
                   let angleDiff = Math.abs((hazardBearing - heading + 180) % 360 - 180);
                   if (angleDiff > 45) continue; 
                }
                
                if (!foundAlert || d < foundAlert.distance) {
                  foundAlert = { ...hazard, distance: d };
                }
              }
            }

            if (foundAlert) {
              setActiveAlert(foundAlert);
              if (!alertedHazardsRef.current.has(foundAlert.id)) {
                 alertedHazardsRef.current.add(foundAlert.id);
                 playBeep();
              }
            } else {
              setActiveAlert(null);
            }
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        alert("Geolocation is not supported");
        setIsDriveMode(false);
      }
    }
  };

  // Ensure cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }, []);
`;

content = content.replace("const handleMapClick = async (latlng: {lat: number, lng: number}) => {", logicInjection + "\n  const handleMapClick = async (latlng: {lat: number, lng: number}) => {");

const uiInjection = `
           {/* Drive Mode Dashboard */}
           {isDriveMode && (
             <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
               <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg border-2 border-slate-700 pointer-events-auto">
                 <div className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Speed</div>
                 <div className="text-4xl font-black">{Math.round(currentSpeed * 3.6)} <span className="text-lg text-slate-300">km/h</span></div>
               </div>
               
               {activeAlert && (
                 <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg border-2 border-red-500 animate-pulse pointer-events-auto flex items-center gap-3">
                   <AlertTriangle size={32} />
                   <div>
                     <div className="font-black text-xl">POTHOLE AHEAD</div>
                     <div className="font-medium text-red-200">{Math.round(activeAlert.distance)} meters away</div>
                   </div>
                 </div>
               )}
             </div>
           )}

           {/* Drive Mode Toggle Button */}
           <button 
             onClick={toggleDriveMode}
             className={\`absolute bottom-6 left-6 z-[1000] p-4 rounded-full shadow-2xl flex items-center justify-center transition-all \${isDriveMode ? 'bg-red-500 text-white scale-110' : 'bg-blue-600 text-white'}\`}
           >
             {isDriveMode ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
           </button>
           
`;

content = content.replace("<CommuterMapComponent", uiInjection + "<CommuterMapComponent");

// To fix stale closure issue in watchPosition for hazards, we can use a ref.
content = content.replace("const [hazards, setHazards] = useState<any[]>([]);", "const [hazards, setHazards] = useState<any[]>([]);\n  const hazardsRef = React.useRef<any[]>([]);\n  useEffect(() => { hazardsRef.current = hazards; }, [hazards]);");
content = content.replace("for (const hazard of hazards) {", "for (const hazard of hazardsRef.current) {");

fs.writeFileSync('frontend/src/app/commuter/page.tsx', content);
console.log('Drive Mode patched');
