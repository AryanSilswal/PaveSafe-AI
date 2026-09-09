"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fly to location component
function LocationUpdater({ location }: { location: {lat: number, lng: number} | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 15);
    }
  }, [location, map]);
  return null;
}

const createIcon = (severity: string) => {
  let color = '#22c55e'; // Low (Green)
  if (severity === 'Medium') color = '#f59e0b'; // Amber
  if (severity === 'Critical') color = '#ef4444'; // Red

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">!</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function CommuterMapComponent({ hazards, location }: { hazards: any[], location: {lat: number, lng: number} | null }) {
  useEffect(() => {
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
      zoom={14} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationUpdater location={location} />
      
      {/* Current User Location Marker */}
      {location && (
        <Marker 
          position={[location.lat, location.lng]}
          icon={L.divIcon({
            className: 'user-location',
            html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })}
        >
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* Hazard Markers */}
      {hazards.map((hazard) => (
        <Marker 
          key={hazard.id} 
          position={[hazard.latitude, hazard.longitude]}
          icon={createIcon(hazard.severity)}
        />
      ))}
    </MapContainer>
  );
}
