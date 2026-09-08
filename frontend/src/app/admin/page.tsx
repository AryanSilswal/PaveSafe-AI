"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Map as MapIcon, List, CheckCircle, Clock, Lock } from 'lucide-react';
import Map, { Marker } from 'react-map-gl/mapbox';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYm9ndXN0b2tlbiIsImEiOiJjamF6ZmJpdW40Z2M0MzJxdHhkZndzM2FhIn0.bogustoken';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const [hazards, setHazards] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  
  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Check for saved token
    const savedToken = localStorage.getItem('pavesafe_admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHazards();
      const interval = setInterval(fetchHazards, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { username, password });
      const receivedToken = res.data.token;
      setToken(receivedToken);
      setIsAuthenticated(true);
      localStorage.setItem('pavesafe_admin_token', receivedToken);
    } catch (error: any) {
      if (error.response) {
        setLoginError(error.response.data?.error || 'Invalid username or password');
      } else {
        setLoginError(`Network Error: Cannot reach backend at ${API_URL}`);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken('');
    localStorage.removeItem('pavesafe_admin_token');
  };

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
      await axios.put(
        `${API_URL}/api/hazards/${id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchHazards();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Your session may have expired.');
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        handleLogout();
      }
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <Lock className="text-blue-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-1">Authorized municipal personnel only</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter password"
                required
              />
            </div>
            
            {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
            
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-2"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>Prototype Credentials: admin / admin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-400" />
          <h1 className="text-xl font-bold">PaveSafe Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 px-3 rounded-md flex items-center gap-1 text-sm ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              <List size={16} /> List
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`p-1.5 px-3 rounded-md flex items-center gap-1 text-sm ${viewMode === 'map' ? 'bg-slate-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              <MapIcon size={16} /> Map
            </button>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-slate-300 hover:text-white underline underline-offset-2"
          >
            Logout
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
                    <td className="p-4 space-x-2 flex">
                      <button 
                        onClick={() => updateStatus(hazard.id, 'In Progress')}
                        disabled={hazard.status === 'In Progress' || hazard.status === 'Resolved'}
                        className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md font-medium hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Dispatch
                      </button>
                      <button 
                        onClick={() => updateStatus(hazard.id, 'Resolved')}
                        disabled={hazard.status === 'Resolved'}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
                {hazards.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No hazards reported yet.
                    </td>
                  </tr>
                )}
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
