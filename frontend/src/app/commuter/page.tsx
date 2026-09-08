"use client";

import { useState, useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import { Camera, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';
import axios from 'axios';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYm9ndXN0b2tlbiIsImEiOiJjamF6ZmJpdW40Z2M0MzJxdHhkZndzM2FhIn0.bogustoken';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function CommuterPage() {
  const [viewState, setViewState] = useState({
    longitude: 77.2090, // Default to New Delhi
    latitude: 28.6139,
    zoom: 14
  });
  const [hazards, setHazards] = useState<any[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    fetchHazards();
    
    // Get user location for reporting
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setViewState(prev => ({
          ...prev,
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        }));
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

  const fetchHazards = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/hazards`);
      setHazards(res.data);
    } catch (error) {
      console.error('Error fetching hazards:', error);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const submitReport = async () => {
    if (!photo || !location) return;
    setIsReporting(true);
    
    const formData = new FormData();
    formData.append('image', photo);
    formData.append('latitude', location.lat.toString());
    formData.append('longitude', location.lng.toString());

    try {
      await axios.post(`${API_URL}/api/hazards/report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setPhoto(null);
      fetchHazards(); // Refresh map
      alert('Hazard reported successfully!');
    } catch (error) {
      console.error('Report failed', error);
      alert('Failed to report hazard.');
    } finally {
      setIsReporting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'Critical': return '#ef4444'; // red
      case 'Medium': return '#f59e0b'; // amber
      case 'Low': return '#22c55e'; // green
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row">
      {/* Sidebar for reporting */}
      <div className="w-full md:w-96 bg-white shadow-xl z-10 flex flex-col p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Navigation className="text-blue-600" />
            Commuter Mode
          </h2>
          <p className="text-sm text-gray-500 mt-2">Drive safely. Report hazards.</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Report New Hazard
          </h3>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600">Take a photo of the pothole</label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden" 
                  id="camera-input"
                />
                <label 
                  htmlFor="camera-input" 
                  className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {photo ? <CheckCircle className="text-green-500" /> : <Camera className="text-gray-400" />}
                  <span className="text-sm font-medium text-gray-600">
                    {photo ? 'Photo Captured' : 'Open Camera'}
                  </span>
                </label>
              </div>
            </div>

            {location ? (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle size={12} /> GPS Location Locked
              </p>
            ) : (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle size={12} /> Waiting for GPS...
              </p>
            )}

            <button 
              onClick={submitReport}
              disabled={!photo || !location || isReporting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isReporting ? 'Analyzing & Reporting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/navigation-day-v1"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
        >
          <GeolocateControl position="top-left" />
          <NavigationControl position="top-left" />
          
          {hazards.map((hazard) => (
            <Marker 
              key={hazard.id} 
              longitude={hazard.longitude} 
              latitude={hazard.latitude}
              anchor="bottom"
            >
              <div className="bg-white p-1 rounded-full shadow-md cursor-pointer transform hover:scale-110 transition-transform">
                <AlertTriangle size={24} color={getSeverityColor(hazard.severity)} />
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}
