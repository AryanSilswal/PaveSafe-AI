"use client";

import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with Next.js
const createIcon = (severity: number, id: number) => {
  let color = '#22c55e'; // 1-3 (Green)
  if (severity >= 4 && severity <= 7) color = '#f59e0b'; // 4-7 Amber
  if (severity >= 8) color = '#ef4444'; // 8-10 Red

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${id}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function AdminMapComponent({ hazards }: { hazards: any[] }) {
  useEffect(() => {
    // Leaflet throws a fit if the icon paths are broken in Next.js, this fixes it globally
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer 
      center={[28.6139, 77.2090]} 
      zoom={11} 
      style={{ height: '100%', width: '100%' }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street View">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite View">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      {hazards.map((hazard) => (
        <Marker 
          key={hazard.id} 
          position={[hazard.latitude, hazard.longitude]}
          icon={createIcon(hazard.severity, hazard.id)}
        >
          <Popup>
            <strong>Hazard #{hazard.id}</strong><br/>
            Severity: {hazard.severity}<br/>
            Status: {hazard.status}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
