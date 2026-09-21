"use client";

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Camera, AlertTriangle, CheckCircle, Navigation, Bell, LogOut, MapPin, Search, Lock } from 'lucide-react';
import axios from 'axios';

const CommuterMapComponent = dynamic(() => import('../../components/CommuterMapComponent'), { ssr: false });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function CommuterPage() {
  const [hazards, setHazards] = useState<any[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Route Planning State
  const [routeMode, setRouteMode] = useState(false);
  const [routeStart, setRouteStart] = useState<{lat: number, lng: number} | null>(null);
  const [routeEnd, setRouteEnd] = useState<{lat: number, lng: number} | null>(null);
  const [selectingPoint, setSelectingPoint] = useState<'start' | 'end'>('end');
  
  // Search State
  const [startSearchQuery, setStartSearchQuery] = useState('');
  const [endSearchQuery, setEndSearchQuery] = useState('');
  const [startResults, setStartResults] = useState<any[]>([]);
  const [endResults, setEndResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<'start' | 'end' | null>(null);

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeSafety, setRouteSafety] = useState<{safetyScore: number, hazardsCount: number, criticalHazards: number} | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    fetchHazards();
    fetchLeaderboard();
    
    // Check for saved token
    const token = localStorage.getItem('pavesafe_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
      fetchNotifications();
    }
    
    // Get user location for reporting
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        // Set default route start to GPS location if not already set
        setRouteStart(prev => prev || { lat: position.coords.latitude, lng: position.coords.longitude });
      }, (err) => {
        console.error("GPS Error:", err);
      }, { enableHighAccuracy: true });
    }
  }, []);

  // Poll for notifications if logged in
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        fetchNotifications();
        fetchLeaderboard();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function fetchLeaderboard() {
    try {
      const res = await axios.get(`${API_URL}/api/users/leaderboard`);
      setLeaderboard(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchUserProfile() {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`);
      setUser(res.data);
    } catch (e) {
      handleLogout(); // Invalid token
    }
  }

  async function fetchNotifications() {
    try {
      const res = await axios.get(`${API_URL}/api/notifications`);
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function markNotificationsRead() {
    try {
      await axios.put(`${API_URL}/api/notifications/read`);
      setNotifications(prev => prev.map(n => ({...n, is_read: true})));
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchHazards() {
    try {
      const res = await axios.get(`${API_URL}/api/hazards`);
      // Hide resolved potholes from the commuter map
      setHazards(res.data.filter((h: any) => h.status !== 'Resolved'));
    } catch (error) {
      console.error('Error fetching hazards:', error);
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const res = await axios.post(`${API_URL}${endpoint}`, { username, password });
      localStorage.setItem('pavesafe_token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data.user);
      setShowLogin(false);
      fetchNotifications();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pavesafe_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
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
      await axios.post(`${API_URL}/api/hazards/report`, formData);
      setPhoto(null);
      fetchHazards(); // Refresh map
      if (user) fetchUserProfile(); // Points might have updated
      alert('Hazard reported successfully! Thank you for keeping the city safe.');
    } catch (error) {
      console.error('Report failed', error);
      alert('Failed to report hazard.');
    } finally {
      setIsReporting(false);
    }
  };

  const calculateRoute = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    setIsRouting(true);
    try {
      // 1. Fetch Route from public OSRM server
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson`);
      if (!osrmRes.ok) throw new Error("Failed to fetch route from OSRM");
      const osrmData = await osrmRes.json();
      
      if (!osrmData.routes || osrmData.routes.length === 0) throw new Error("No route found");
      
      const coords = osrmData.routes[0].geometry.coordinates;
      // OSRM returns [lon, lat], Leaflet expects [lat, lon] for drawing
      const leafletCoords = coords.map((c: any[]) => [c[1], c[0]]);
      setRouteCoordinates(leafletCoords);

      // 2. Fetch Safety Score from backend
      const scoreRes = await axios.post(`${API_URL}/api/routes/score`, { coordinates: coords });
      setRouteSafety(scoreRes.data);
    } catch (e) {
      console.error(e);
      alert('Failed to calculate route.');
    } finally {
      setIsRouting(false);
    }
  };

  const searchAddress = async (query: string, type: 'start' | 'end') => {
    if (!query.trim()) return;
    setIsSearching(type);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Delhi, India')}&format=json&limit=4`, {
        headers: { 'User-Agent': 'PaveSafe-AI-Prototype/1.0' }
      });
      const data = await res.json();
      if (type === 'start') setStartResults(data);
      else setEndResults(data);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsSearching(null);
    }
  };

  const selectSearchResult = (result: any, type: 'start' | 'end') => {
    const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    const shortName = result.display_name.split(',').slice(0, 2).join(',');

    if (type === 'start') {
      setRouteStart(latlng);
      setStartSearchQuery(shortName);
      setStartResults([]);
      if (routeEnd) calculateRoute(latlng, routeEnd);
    } else {
      setRouteEnd(latlng);
      setEndSearchQuery(shortName);
      setEndResults([]);
      if (routeStart) calculateRoute(routeStart, latlng);
    }
  };

  const handleMapClick = async (latlng: {lat: number, lng: number}) => {
    if (!routeMode) return;

    if (selectingPoint === 'start') {
      setRouteStart(latlng);
      setSelectingPoint('end'); // Auto switch back to end
      if (routeEnd) calculateRoute(latlng, routeEnd);
    } else {
      setRouteEnd(latlng);
      if (routeStart) calculateRoute(routeStart, latlng);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="h-screen w-full flex flex-col md:flex-row font-sans">
      
      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">X</button>
            <h2 className="text-2xl font-bold mb-2">{isRegistering ? 'Create Alias' : 'Commuter Login'}</h2>
            <p className="text-sm text-gray-500 mb-6">Use a pseudonym to protect your identity.</p>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="text" placeholder="Username / Alias" required value={username} onChange={e => setUsername(e.target.value)}
                className="w-full border p-3 rounded-lg"
              />
              <input 
                type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border p-3 rounded-lg"
              />
              <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg">
                {isRegistering ? 'Register' : 'Login'}
              </button>
            </form>
            <p className="mt-4 text-sm text-center text-gray-600">
              {isRegistering ? 'Already have an account?' : 'No account?'} 
              <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-600 ml-1 font-semibold">
                {isRegistering ? 'Login' : 'Create one'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white shadow-xl z-10 flex flex-col p-6 overflow-y-auto space-y-6">
        
        {/* Header & Auth */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Navigation className="text-blue-600" /> PaveSafe
            </h2>
            <p className="text-xs text-gray-500 mt-1">Commuter Module</p>
          </div>
          
          <div className="relative">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setShowNotifications(!showNotifications); if(unreadCount > 0) markNotificationsRead(); }}
                  className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>}
                </button>
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                Sign In
              </button>
            )}
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-64 bg-white shadow-lg border rounded-lg overflow-hidden z-50">
                <div className="p-3 bg-gray-50 border-b font-semibold text-sm">Notifications</div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? <p className="p-4 text-xs text-gray-500">No notifications.</p> : null}
                  {notifications.map(n => (
                    <div key={n.id} className="p-3 border-b text-sm text-gray-700 bg-green-50">
                      {n.message}
                      <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gamification Stats */}
        {user && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-md">
            <p className="text-sm opacity-80">Hello, {user.username}</p>
            <div className="flex justify-between items-end mt-1">
              <h3 className="text-2xl font-bold">{user.points} <span className="text-sm font-normal opacity-80">pts</span></h3>
              <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Safe Citizen</span>
            </div>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button 
            onClick={() => setRouteMode(false)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md ${!routeMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            Report Hazard
          </button>
          <button 
            onClick={() => setRouteMode(true)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md ${routeMode ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
          >
            Safe Routes
          </button>
        </div>

        {/* Dynamic Content Area */}
        {!routeMode ? (
          // REPORT HAZARD UI
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex-1 flex flex-col">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Report New Hazard
            </h3>
            
            {!user ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center bg-white rounded-lg border p-6 space-y-4 shadow-sm">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Lock className="text-blue-500" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Authentication Required</h4>
                  <p className="text-sm text-gray-500 mt-1">For security and to earn Safe Citizen Points, please sign in before reporting a hazard.</p>
                </div>
                <button 
                  onClick={() => setShowLogin(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600">Take a photo of the pothole</label>
                  <div className="relative">
                    <input 
                      type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload}
                      className="hidden" id="camera-input"
                      disabled={!location}
                    />
                    <label 
                      htmlFor="camera-input" 
                      className={`flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed rounded-lg transition-colors ${!location ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : 'border-gray-300 cursor-pointer hover:bg-gray-100'}`}
                    >
                      {photo ? <CheckCircle className="text-green-500" /> : <Camera className={!location ? "text-gray-300" : "text-gray-400"} />}
                      <span className="text-sm font-medium text-gray-600">
                        {!location ? 'Waiting for GPS lock...' : photo ? 'Photo Captured' : 'Open Camera'}
                      </span>
                    </label>
                  </div>
                </div>

                {location ? (
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> GPS Locked</p>
                ) : (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} /> Waiting for GPS...</p>
                )}

                <button 
                  onClick={submitReport} disabled={!photo || !location || isReporting}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isReporting ? 'Analyzing & Reporting...' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        ) : (
          // SAFE ROUTE UI
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex-1 flex flex-col">
            <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <MapPin size={18} /> Plan Safe Route
            </h3>
            
            <div className="space-y-3 mb-4 mt-2">
              <div className={`p-3 rounded-lg border-2 transition-colors ${selectingPoint === 'start' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Point</div>
                  <button onClick={() => setSelectingPoint('start')} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">
                    {selectingPoint === 'start' ? 'Click Map Now' : 'Select on Map'}
                  </button>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={routeStart ? (routeStart.lat === location?.lat ? 'Current GPS Location' : 'Custom Map Location') : 'Type address...'}
                      value={startSearchQuery}
                      onChange={(e) => setStartSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchAddress(startSearchQuery, 'start'); }}
                      className="w-full p-2 border rounded text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={() => searchAddress(startSearchQuery, 'start')}
                      disabled={isSearching === 'start'}
                      className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                  {startResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                      {startResults.map(res => (
                        <div key={res.place_id} onClick={() => selectSearchResult(res, 'start')} className="p-2 hover:bg-gray-100 text-sm cursor-pointer border-b last:border-b-0 truncate">
                          {res.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`p-3 rounded-lg border-2 transition-colors ${selectingPoint === 'end' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</div>
                  <button onClick={() => setSelectingPoint('end')} className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200">
                    {selectingPoint === 'end' ? 'Click Map Now' : 'Select on Map'}
                  </button>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={routeEnd ? 'Selected on Map' : 'Type destination...'}
                      value={endSearchQuery}
                      onChange={(e) => setEndSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchAddress(endSearchQuery, 'end'); }}
                      className="w-full p-2 border rounded text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                    <button 
                      onClick={() => searchAddress(endSearchQuery, 'end')}
                      disabled={isSearching === 'end'}
                      className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                  {endResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                      {endResults.map(res => (
                        <div key={res.place_id} onClick={() => selectSearchResult(res, 'end')} className="p-2 hover:bg-gray-100 text-sm cursor-pointer border-b last:border-b-0 truncate">
                          {res.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-purple-600 mb-4 bg-purple-100 p-2 rounded-md italic">
              {selectingPoint === 'start' ? 'Click anywhere on the map to set your Custom Start Point.' : 'Click anywhere on the map to set your Destination.'}
            </p>
            
            {isRouting && <p className="text-sm text-purple-600 animate-pulse font-medium text-center">Calculating route safety...</p>}
            
            {routeSafety && !isRouting && (
              <div className="bg-white p-4 rounded-lg shadow-sm border mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-600">Safety Score:</span>
                  <span className={`text-xl font-bold ${routeSafety.safetyScore > 70 ? 'text-green-500' : routeSafety.safetyScore > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {routeSafety.safetyScore.toFixed(0)}/100
                  </span>
                </div>
                <div className="space-y-1 mt-3">
                  <p className="text-xs text-gray-500">Total Hazards on Route: <strong className="text-gray-800">{routeSafety.hazardsCount}</strong></p>
                  <p className="text-xs text-gray-500">Critical Hazards (8-10): <strong className="text-red-600">{routeSafety.criticalHazards}</strong></p>
                </div>
                {routeSafety.safetyScore < 50 && (
                  <div className="mt-3 bg-red-50 p-2 rounded text-xs text-red-700 border border-red-200">
                    Warning: This route passes through highly hazardous zones. Proceed with extreme caution.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD UI */}
        <div className="mt-4 bg-gray-50 border rounded-xl p-4 flex flex-col">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
            🏆 Top Safe Citizens
          </h3>
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No rankings yet.</p>
            ) : (
              leaderboard.map((u, index) => (
                <div key={u.username} className={`flex justify-between items-center p-2 rounded-lg border ${index === 0 ? 'bg-yellow-50 border-yellow-200' : index === 1 ? 'bg-gray-100 border-gray-300' : index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-gray-500 font-bold w-4">{index + 1}.</span>
                    <span className="text-gray-800">@{u.username}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{u.points} pts</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <CommuterMapComponent 
          hazards={hazards} 
          location={location} 
          routeCoordinates={routeCoordinates}
          onMapClick={handleMapClick}
          routeStart={routeStart}
          routeEnd={routeEnd}
          routeMode={routeMode}
        />
      </div>
    </div>
  );
}
