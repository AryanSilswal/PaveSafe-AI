"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getSeverityColor = (severity: number) => {
  if (severity >= 8) return '#ef4444';
  if (severity >= 4) return '#f59e0b';
  return '#22c55e';
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const createHazardIcon = (severity: number, isCritical = false) => {
  const color = getSeverityColor(severity);
  const pulse = isCritical
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:3px solid ${color};opacity:0.5;animation:ps-pulse 1.5s ease-out infinite;"></div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px;">${pulse}
      <div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M12 2L12 6M12 18L12 22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12L6 12M18 12L22 12M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>
      </div></div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16]
  });
};

// ── Map sub-components ────────────────────────────────────────────────────────
function LocationUpdater({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => { if (location) map.flyTo([location.lat, location.lng], 15); }, [location, map]);
  return null;
}

function MyLocationButton({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    const btn = (L as any).control({ position: 'bottomright' });
    btn.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `<button title="My Location" style="background:white;border:none;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">📍</button>`;
      div.querySelector('button')!.addEventListener('click', () => map.flyTo([location.lat, location.lng], 16));
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    btn.addTo(map);
    return () => { try { map.removeControl(btn); } catch {} };
  }, [location, map]);
  return null;
}

function MapClickListener({ onMapClick }: { onMapClick: (latlng: { lat: number; lng: number }) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleClick = (e: any) => onMapClick(e.latlng);
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [map, onMapClick]);
  return null;
}

function RouteSafetyOverlay({ routeCoordinates, hazards }: { routeCoordinates: [number, number][], hazards: any[] }) {
  if (routeCoordinates.length < 2) return null;
  const segments: { positions: [number, number][], danger: boolean }[] = [];
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const [lat1, lon1] = routeCoordinates[i];
    const [lat2, lon2] = routeCoordinates[i + 1];
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    const nearby = hazards.some(h =>
      h.status !== 'Resolved' && h.severity >= 6 &&
      haversineDistance(midLat, midLon, h.latitude, h.longitude) < 80
    );
    segments.push({ positions: [routeCoordinates[i], routeCoordinates[i + 1]], danger: nearby });
  }
  return (
    <>
      {segments.map((seg, i) => (
        <Polyline key={i} positions={seg.positions} color={seg.danger ? '#ef4444' : '#3b82f6'} weight={5} opacity={0.75} />
      ))}
    </>
  );
}

// ── Minimap Inset ─────────────────────────────────────────────────────────────
function MinimapInset({ location }: { location: { lat: number; lng: number } | null }) {
  const miniRef = useRef<L.Map | null>(null);
  const dotRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = document.getElementById('pavesafe-minimap');
    if (!container || miniRef.current) return;
    const mini = L.map(container, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mini);
    mini.setView([28.6139, 77.2090], 9);
    miniRef.current = mini;
  }, []);

  useEffect(() => {
    if (!miniRef.current || !location) return;
    miniRef.current.setView([location.lat, location.lng], 11);
    if (dotRef.current) dotRef.current.remove();
    dotRef.current = L.circleMarker([location.lat, location.lng], { radius: 6, fillColor: '#3b82f6', color: 'white', weight: 2, fillOpacity: 1 }).addTo(miniRef.current);
  }, [location]);

  return (
    <div style={{ position: 'absolute', bottom: 100, left: 24, zIndex: 1000, width: 130, height: 130, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.35)', border: '2px solid white' }}>
      <div id="pavesafe-minimap" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function CommuterMapComponent({
  hazards, location, routeCoordinates, onMapClick, routeStart, routeEnd, routeMode, onUpvote, isDriveMode }: {
  hazards: any[], location: { lat: number; lng: number } | null,
  routeCoordinates?: [number, number][], onMapClick?: (latlng: { lat: number; lng: number }) => void,
  routeStart?: { lat: number; lng: number } | null,
  routeEnd?: { lat: number; lng: number } | null,
  routeMode?: boolean,
  onUpvote?: (id: number) => void, isDriveMode?: boolean }) {
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  useEffect(() => {
    if (!document.getElementById('ps-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'ps-pulse-style';
      style.textContent = `@keyframes ps-pulse { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.5);opacity:0} }`;
      document.head.appendChild(style);
    }
  }, []);

  const radiusOptions = [null, 500, 1000, 2000];

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {isDriveMode && <style>{`.leaflet-control-container { display: none !important; }`}</style>}
      {/* Radius Ring Toggle */}
      {!isDriveMode && location && (
        <div style={{ position: 'absolute', top: 85, left: 12, zIndex: 1000, background: 'white', borderRadius: 8, padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', border: '1px solid #d1d5db', display: 'flex', gap: 4 }}>
          {radiusOptions.map(r => (
            <button key={r ?? 'off'} onClick={() => setRadiusKm(r)}
              style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: radiusKm === r ? '#3b82f6' : '#f3f4f6', color: radiusKm === r ? 'white' : '#374151' }}>
              {r === null ? 'Off' : r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>
      )}

      <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%', zIndex: 0 }}>
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

        {!routeMode && <LocationUpdater location={location} />}
        {onMapClick && <MapClickListener onMapClick={onMapClick} />}
        <MyLocationButton location={location} />

        {/* Radius Ring */}
        {location && radiusKm && (
          <Circle center={[location.lat, location.lng]} radius={radiusKm}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, weight: 2, dashArray: '6 4' }} />
        )}

        {/* Route Safety Overlay (colored segments) */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <RouteSafetyOverlay routeCoordinates={routeCoordinates} hazards={hazards} />
        )}

        {/* Start marker */}
        {routeStart && (
          <Marker position={[routeStart.lat, routeStart.lng]}
            icon={L.divIcon({ className: '', html: '<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.8);"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })}>
            <Popup>Route Start</Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {routeEnd && (
          <Marker position={[routeEnd.lat, routeEnd.lng]}
            icon={L.divIcon({ className: '', html: '<div style="background:#8b5cf6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(139,92,246,0.8);"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* User location marker */}
        {location && (!routeStart || location.lat !== routeStart.lat || location.lng !== routeStart.lng) && (
          <Marker position={[location.lat, location.lng]}
            icon={L.divIcon({ className: '', html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(34,197,94,0.8);"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Hazard Markers with rich popups */}
        {hazards.map(hazard => {
          const isCritical = hazard.severity >= 8;
          const distM = location ? haversineDistance(location.lat, location.lng, hazard.latitude, hazard.longitude) : null;
          const distLabel = distM !== null ? (distM >= 1000 ? `${(distM / 1000).toFixed(1)} km away` : `${Math.round(distM)} m away`) : '';
          const imgHtml = hazard.image_url
            ? `<img src="${hazard.image_url}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />`
            : '';
          return (
            <Marker key={hazard.id} position={[hazard.latitude, hazard.longitude]} icon={createHazardIcon(hazard.severity, isCritical)}>
              <Popup>
                <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {hazard.image_url && <img src={hazard.image_url} alt="hazard" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>Hazard #{hazard.id}</strong>
                    <span style={{ background: getSeverityColor(hazard.severity), color: 'white', padding: '1px 8px', borderRadius: 99, fontSize: 12, fontWeight: 'bold' }}>Sev {hazard.severity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{hazard.status} · {distLabel}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(hazard.reported_at).toLocaleDateString()}</div>
                  <a href={`https://maps.google.com/?q=${hazard.latitude},${hazard.longitude}`} target="_blank" rel="noreferrer"
                    style={{ display: 'block', marginTop: 8, textAlign: 'center', padding: '5px', background: '#3b82f6', color: 'white', borderRadius: 6, fontSize: 11, textDecoration: 'none', fontWeight: 'bold' }}>
                    🗺 Open in Google Maps
                  </a>
                  <button onClick={(e) => { e.stopPropagation(); onUpvote && onUpvote(hazard.id); }} style={{ display: 'block', width: '100%', marginTop: 6, padding: '5px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}>
                    👍 Verify Hazard ({hazard.confirmation_count || 0})
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {!isDriveMode && <MinimapInset location={location} />}
    </div>
  );
}
