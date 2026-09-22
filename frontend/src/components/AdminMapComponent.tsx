"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ── Severity helpers ──────────────────────────────────────────────────────────
const getSeverityColor = (severity: number) => {
  if (severity >= 8) return '#ef4444';
  if (severity >= 4) return '#f59e0b';
  return '#22c55e';
};

const createIcon = (severity: number, id: number, critical = false) => {
  const color = getSeverityColor(severity);
  const pulse = critical
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:3px solid ${color};opacity:0.5;animation:ps-pulse 1.5s ease-out infinite;"></div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:32px;height:32px;">
      ${pulse}
      <div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M9 3H15M3 9V15M21 9V15M9 21H15M5 5L8 8M19 5L16 8M5 19L8 16M19 19L16 16"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

// ── Heatmap Layer ─────────────────────────────────────────────────────────────
function HeatmapLayer({ hazards, visible }: { hazards: any[], visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet.heat' as any).then(() => {
      const points = hazards.map(h => [h.latitude, h.longitude, h.severity / 10]);
      const heat = (L as any).heatLayer(points, { radius: 35, blur: 25, maxZoom: 17, max: 1.0,
        gradient: { 0.2: '#22c55e', 0.5: '#f59e0b', 0.8: '#ef4444', 1.0: '#7f1d1d' } });
      if (visible) { heat.addTo(map); }
      return () => { try { map.removeLayer(heat); } catch {} };
    }).catch(() => {});
  }, [hazards, visible, map]);
  return null;
}

// ── Cluster Layer ─────────────────────────────────────────────────────────────
function ClusterLayer({ hazards, statusFilter, onUpvote }: { hazards: any[], statusFilter: string[], onUpvote: (id: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet.markercluster').then(() => {
      const filtered = hazards.filter(h => statusFilter.includes(h.status));
      const clusterGroup = (L as any).markerClusterGroup({
        iconCreateFunction: (cluster: any) => {
          const markers = cluster.getAllChildMarkers();
          const maxSev = Math.max(...markers.map((m: any) => m.options._severity || 0));
          const color = getSeverityColor(maxSev);
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="background:${color};width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:13px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);">${count}</div>`,
            className: '', iconSize: [38, 38], iconAnchor: [19, 19]
          });
        },
        maxClusterRadius: 50, showCoverageOnHover: false
      });

      filtered.forEach(h => {
        const isCritical = h.severity >= 8;
        const marker = L.marker([h.latitude, h.longitude], {
          icon: createIcon(h.severity, h.id, isCritical),
          _severity: h.severity
        } as any);
        const statusColor = h.status === 'Resolved' ? '#22c55e' : h.status === 'In Progress' ? '#f59e0b' : h.status === 'Rejected' ? '#ef4444' : '#3b82f6';
        const imgHtml = h.image_url
          ? `<img src="${h.image_url}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />`
          : '';
        marker.bindPopup(`
          <div style="min-width:200px;font-family:sans-serif;">
            ${imgHtml}
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <strong style="font-size:14px;">Hazard #${h.id}</strong>
              <span style="background:${getSeverityColor(h.severity)};color:white;padding:2px 8px;border-radius:99px;font-size:12px;font-weight:bold;">Sev ${h.severity}</span>
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">
              <span style="background:${statusColor};color:white;padding:1px 6px;border-radius:4px;font-size:11px;">${h.status}</span>
              ${h.reporter_name ? ` · @${h.reporter_name}` : ''}
            </div>
            <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">${new Date(h.reported_at).toLocaleDateString()}</div>
            <div style="display:flex;gap:6px;">
              <a href="https://maps.google.com/?q=${h.latitude},${h.longitude}" target="_blank" style="flex:1; width:100%;text-align:center;padding:5px;background:#3b82f6;color:white;border-radius:6px;font-size:11px;text-decoration:none;font-weight:bold;">🗺 Google Maps</a>
              
            </div>
          </div>
        `);
        clusterGroup.addLayer(marker);
      });

      (window as any)._upvote = (id: number) => onUpvote(id);
      map.addLayer(clusterGroup);
      return () => { try { map.removeLayer(clusterGroup); } catch {} };
    }).catch(() => {});
  }, [hazards, statusFilter, map, onUpvote]);
  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminMapComponent({ hazards }: { hazards: any[] }) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [statusFilter, setStatusFilter] = useState(['Reported', 'In Progress', 'Resolved', 'Rejected']);
  const [localHazards, setLocalHazards] = useState(hazards);

  useEffect(() => { setLocalHazards(hazards); }, [hazards]);

  useEffect(() => {
    // Inject pulse keyframe CSS once
    if (!document.getElementById('ps-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'ps-pulse-style';
      style.textContent = `@keyframes ps-pulse { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.2);opacity:0} }`;
      document.head.appendChild(style);
    }
  }, []);

  const toggleStatus = (s: string) =>
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleUpvote = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/hazards/${id}/upvote`, { method: 'POST' });
      const data = await res.json();
      setLocalHazards(prev => prev.map(h => h.id === id ? { ...h, confirmation_count: data.confirmation_count } : h));
    } catch {}
  };

  const statusOptions = [
    { label: 'Reported', color: '#3b82f6' },
    { label: 'In Progress', color: '#f59e0b' },
    { label: 'Resolved', color: '#22c55e' },
    { label: 'Rejected', color: '#ef4444' },
  ];

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Floating Controls */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Heatmap Toggle */}
        <button
          onClick={() => setShowHeatmap(v => !v)}
          style={{ background: showHeatmap ? '#ef4444' : 'white', color: showHeatmap ? 'white' : '#374151', padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          🔥 {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>
        {/* Status Filters */}
        <div style={{ background: 'white', borderRadius: 8, padding: '8px 10px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', border: '1px solid #d1d5db' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Filter by Status</div>
          {statusOptions.map(s => (
            <label key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <input type="checkbox" checked={statusFilter.includes(s.label)} onChange={() => toggleStatus(s.label)} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }}></span>
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street View">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite View">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <HeatmapLayer hazards={localHazards} visible={showHeatmap} />
        <ClusterLayer hazards={localHazards} statusFilter={statusFilter} onUpvote={handleUpvote} />
      </MapContainer>
    </div>
  );
}
