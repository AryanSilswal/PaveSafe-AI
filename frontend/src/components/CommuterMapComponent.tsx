"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

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

// Click listener to set destination
function MapClickListener({ onMapClick }: { onMapClick: (latlng: {lat: number, lng: number}) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleClick = (e: any) => {
      onMapClick(e.latlng);
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);
  return null;
}

const createIcon = (severity: number) => {
  let color = '#22c55e'; // 1-3 (Green)
  if (severity >= 4 && severity <= 7) color = '#f59e0b'; // 4-7 Amber
  if (severity >= 8) color = '#ef4444'; // 8-10 Red

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">!</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function CommuterMapComponent({ hazards, location, routeCoordinates, onMapClick, destination }: { hazards: any[], location: {lat: number, lng: number} | null, routeCoordinates?: [number, number][], onMapClick?: (latlng: {lat: number, lng: number}) => void, destination?: {lat: number, lng: number} | null }) {
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
      zoom={11} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
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
      <LocationUpdater location={location} />
      {onMapClick && <MapClickListener onMapClick={onMapClick} />}
      
      {/* Route Line */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline positions={routeCoordinates} color="#3b82f6" weight={5} opacity={0.7} />
      )}

      {/* Destination Marker */}
      {destination && (
        <Marker 
          position={[destination.lat, destination.lng]}
          icon={L.divIcon({
            className: 'dest-location',
            html: '<div style="background-color: #8b5cf6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(139, 92, 246, 0.8);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })}
        >
          <Popup>Destination</Popup>
        </Marker>
      )}

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
