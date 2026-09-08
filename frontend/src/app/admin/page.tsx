"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Map as MapIcon, List, CheckCircle, Clock } from 'lucide-react';
import Map, { Marker } from 'react-map-gl';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYm9ndXN0b2tlbiIsImEiOiJjamF6ZmJpdW40Z2M0MzJxdHhkZndzM2FhIn0.bogustoken';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const [hazards, setHazards] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    fetchHazards();
    // Poll for new hazards every 10 seconds
    const interval = setInterval(fetchHazards, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHazards = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/hazards`);
      setHazards(res.data);
    } catch (error) {
      console.error('Error fetching hazards:', error);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      // Note: In real app, we need to pass the JWT token in headers here
      await axios.put(`${API_URL}/api/hazards/${id}/status`, { status: newStatus });
      fetchHazards();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Are you logged in as admin?');
    }
  };

  const getSeverityBadge = (severity: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-semibold";
    switch(severity) {
      case 'Critical': return <span className={`${baseClasses} bg-red-100 text-red-700`}>Critical</span>;
      case 'Medium': return <span className={`${baseClasses} bg-amber-100 text-amber-700`}>Medium</span>;
      case 'Low': return <span className={`${baseClasses} bg-green-100 text-green-700`}>Low</span>;
      default: return <span className={`${baseClasses} bg-gray-100 text-gray-700`}>Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-400" />
          <h1 className="text-xl font-bold">PaveSafe Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg flex items-center gap-1 ${viewMode === 'list' ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
          >
            <List size={18} /> List
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-lg flex items-center gap-1 ${viewMode === 'map' ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
          >
            <MapIcon size={18} /> Map
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {viewMode === 'list' ? (
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">ID</th>
                  <th className="p-4 font-semibold text-gray-600">Reported</th>
                  <th className="p-4 font-semibold text-gray-600">Severity (AI)</th>
                  <th className="p-4 font-semibold text-gray-600">Location</th>
                  <th className="p-4 font-semibold text-gray-600">Status</th>
                  <th className="p-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hazards.map((hazard) => (
                  <tr key={hazard.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-gray-500">#{hazard.id}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(hazard.reported_at).toLocaleString()}
                    </td>
                    <td className="p-4">{getSeverityBadge(hazard.severity)}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {hazard.latitude.toFixed(4)}, {hazard.longitude.toFixed(4)}
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 text-sm ${
                        hazard.status === 'Resolved' ? 'text-green-600' : 
                        hazard.status === 'In Progress' ? 'text-amber-600' : 'text-gray-600'
                      }`}>
                        {hazard.status === 'Resolved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {hazard.status}
                      </span>
                    </td>
                    <td className="p-4 space-x-2">
                      <button 
                        onClick={() => updateStatus(hazard.id, 'In Progress')}
                        disabled={hazard.status === 'In Progress' || hazard.status === 'Resolved'}
                        className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200 disabled:opacity-50"
                      >
                        Dispatch Crew
                      </button>
                      <button 
                        onClick={() => updateStatus(hazard.id, 'Resolved')}
                        disabled={hazard.status === 'Resolved'}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[80vh] rounded-xl overflow-hidden shadow-md border border-gray-200">
            <Map
              initialViewState={{
                longitude: 77.2090,
                latitude: 28.6139,
                zoom: 12
              }}
              mapStyle="mapbox://styles/mapbox/light-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              {hazards.map((hazard) => (
                <Marker 
                  key={hazard.id} 
                  longitude={hazard.longitude} 
                  latitude={hazard.latitude}
                >
                  <div className={`p-2 rounded-full shadow-lg text-white text-xs font-bold ${
                    hazard.severity === 'Critical' ? 'bg-red-500' : 
                    hazard.severity === 'Medium' ? 'bg-amber-500' : 'bg-green-500'
                  }`}>
                    {hazard.id}
                  </div>
                </Marker>
              ))}
            </Map>
          </div>
        )}
      </main>
    </div>
  );
}
