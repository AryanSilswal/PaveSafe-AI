"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ShieldCheck, Map as MapIcon, List, CheckCircle, Clock, Lock, User, Calendar, AlertTriangle, Download, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const AdminMapComponent = dynamic(() => import('../../components/AdminMapComponent'), { ssr: false });
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

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<number | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverityMin, setFilterSeverityMin] = useState<number>(1);
  const [filterSeverityMax, setFilterSeverityMax] = useState<number>(10);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  
  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('pavesafe_admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
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
      if (res.data.user.role !== 'admin') throw new Error("Not an admin");
      
      const receivedToken = res.data.token;
      setToken(receivedToken);
      setIsAuthenticated(true);
      localStorage.setItem('pavesafe_admin_token', receivedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
    } catch (error: any) {
      if (error.response) {
        setLoginError(error.response.data?.error || 'Invalid credentials');
      } else {
        setLoginError(`Network Error: Cannot reach backend at ${API_URL}`);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken('');
    localStorage.removeItem('pavesafe_admin_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const fetchHazards = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/hazards`);
      setHazards(res.data);
    } catch (error) {
      console.error('Error fetching hazards:', error);
    }
  };

  const openAssignModal = (id: number) => {
    setSelectedHazard(id);
    setShowAssignModal(true);
  };

  const rejectHazard = async (id: number) => {
    if (!confirm('Are you sure you want to reject this report? This will deduct 20 points from the user. 5 consecutive rejections will ban them for 2 months.')) return;
    try {
      await axios.put(`${API_URL}/api/hazards/${id}/status`, { 
        status: 'Rejected'
      }, { headers: { Authorization: `Bearer ${token}` }});
      fetchHazards();
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject hazard.');
    }
  };

  const submitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHazard) return;
    setIsSubmitting(true);
    try {
      await axios.put(`${API_URL}/api/hazards/${selectedHazard}/status`, { 
        status: 'In Progress',
        assigned_worker: workerName,
        deadline: deadline
      }, { headers: { Authorization: `Bearer ${token}` }});
      setShowAssignModal(false);
      setWorkerName('');
      setDeadline('');
      fetchHazards();
    } catch (error) {
      console.error('Error assigning:', error);
      alert('Failed to assign worker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markResolved = async (id: number) => {
    try {
      await axios.put(`${API_URL}/api/hazards/${id}/status`, { status: 'Resolved' }, { headers: { Authorization: `Bearer ${token}` }});
      fetchHazards();
    } catch (error) {
      console.error('Error resolving:', error);
      alert('Failed to resolve.');
    }
  };

  const getSeverityBadge = (severity: number) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-semibold flex items-center justify-center w-8 h-8";
    if (severity >= 8) return <span className={`${baseClasses} bg-red-100 text-red-700 ring-2 ring-red-400`}>{severity}</span>;
    if (severity >= 4) return <span className={`${baseClasses} bg-amber-100 text-amber-700 ring-2 ring-amber-400`}>{severity}</span>;
    return <span className={`${baseClasses} bg-green-100 text-green-700 ring-2 ring-green-400`}>{severity}</span>;
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      setSortConfig(null);
      return;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span className="w-4 inline-block"></span>;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="inline ml-1" />;
    return <ArrowDown size={14} className="inline ml-1" />;
  };

  const resetFilters = () => {
    setFilterStatus('All');
    setFilterSeverityMin(1);
    setFilterSeverityMax(10);
    setFilterDateFrom('');
    setFilterDateTo('');
    setSortConfig(null);
  };

  const processedHazards = useMemo(() => {
    let filtered = hazards;
    
    // Status Filter
    if (filterStatus !== 'All') {
      filtered = filtered.filter(h => h.status === filterStatus);
    }
    // Severity Filter
    filtered = filtered.filter(h => h.severity >= filterSeverityMin && h.severity <= filterSeverityMax);
    
    // Date Filter
    if (filterDateFrom) {
      filtered = filtered.filter(h => new Date(h.reported_at) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(h => new Date(h.reported_at) <= toDate);
    }

    // Sorting
    if (sortConfig !== null) {
      filtered = [...filtered].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'reporter') valA = a.reporter_name || 'Anonymous';
        if (sortConfig.key === 'reporter') valB = b.reporter_name || 'Anonymous';
        if (sortConfig.key === 'assignment') valA = a.assigned_worker || 'Unassigned';
        if (sortConfig.key === 'assignment') valB = b.assigned_worker || 'Unassigned';

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [hazards, sortConfig, filterStatus, filterSeverityMin, filterSeverityMax, filterDateFrom, filterDateTo]);

  const handleExport = (type: 'all' | 'filtered') => {
    const dataToExport = type === 'all' ? hazards : processedHazards;
    const headers = ['ID', 'Severity', 'Status', 'Reported At', 'Assigned Worker', 'Deadline', 'Reporter Username', 'Reporter ID', 'Latitude', 'Longitude'];
    const rows = dataToExport.map(h => [
      h.id, h.severity, h.status, new Date(h.reported_at).toLocaleString(),
      h.assigned_worker || 'Unassigned', h.deadline ? new Date(h.deadline).toLocaleDateString() : 'None',
      h.reporter_name || 'Anonymous', h.reporter_id || 'N/A', h.latitude, h.longitude
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pavesafe_hazards_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full mb-4"><Lock className="text-blue-600" size={32} /></div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-1">Authorized municipal personnel only</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" required />
            </div>
            {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg">Sign In</button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400"><p>Prototype Credentials: admin / admin</p></div>
        </div>
      </div>
    );
  }

  const total = hazards.length;
  const critical = hazards.filter(h => h.severity >= 8 && h.status !== 'Resolved').length;
  const resolved = hazards.filter(h => h.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70"><X size={24}/></button>
          <img src={previewImage} alt="Hazard Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-gray-500"><X size={20}/></button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Download className="text-emerald-600"/> Export Data</h3>
            <p className="text-sm text-gray-600 mb-6">Would you like to export all records, or only the ones matching your current filters and sorting?</p>
            <div className="space-y-3">
              <button onClick={() => handleExport('filtered')} className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700">
                Export Current View ({processedHazards.length})
              </button>
              <button onClick={() => handleExport('all')} className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-lg font-semibold hover:bg-gray-300">
                Export All Data ({hazards.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowAssignModal(false)} className="absolute top-4 right-4 text-gray-500"><X size={20}/></button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="text-blue-600"/> Assign Repair Crew</h3>
            <form onSubmit={submitAssignment} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Worker/Contractor Name</label>
                <input type="text" required value={workerName} onChange={e=>setWorkerName(e.target.value)} className="w-full mt-1 p-2 border rounded" placeholder="e.g. John Doe - Unit 4" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Resolution Deadline</label>
                <input type="datetime-local" required value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full mt-1 p-2 border rounded" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold mt-4">
                {isSubmitting ? 'Assigning...' : 'Dispatch Crew'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="bg-slate-900 text-white p-4 flex flex-col md:flex-row justify-between items-center shadow-md z-10 gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-400" size={28}/>
          <h1 className="text-xl font-bold">PaveSafe Admin</h1>
        </div>
        <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center">
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-1.5 rounded-lg font-medium transition-colors border border-emerald-500/30 text-sm"
          >
            <Download size={16} /> Export CSV
          </button>
          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setViewMode('list')} className={`p-1.5 px-3 rounded-md flex items-center gap-1 text-sm ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-300'}`}><List size={16} /> List</button>
            <button onClick={() => setViewMode('map')} className={`p-1.5 px-3 rounded-md flex items-center gap-1 text-sm ${viewMode === 'map' ? 'bg-slate-600 text-white' : 'text-slate-300'}`}><MapIcon size={16} /> Map</button>
          </div>
          <button onClick={handleLogout} className="text-sm text-slate-300 hover:text-white underline">Logout</button>
        </div>
      </header>

      <main className="flex-1 p-6">
        
        {/* Analytics Header */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Total Hazards</p><h2 className="text-2xl font-bold">{total}</h2></div>
            <div className="bg-blue-100 p-3 rounded-full"><List className="text-blue-600" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Active Critical Hazards</p><h2 className="text-2xl font-bold text-red-600">{critical}</h2></div>
            <div className="bg-red-100 p-3 rounded-full"><AlertTriangle className="text-red-600" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Total Resolved</p><h2 className="text-2xl font-bold text-green-600">{resolved}</h2></div>
            <div className="bg-green-100 p-3 rounded-full"><CheckCircle className="text-green-600" /></div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border p-2 rounded-lg text-sm bg-gray-50">
                  <option value="All">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Min Severity</label>
                <input type="number" min="1" max="10" value={filterSeverityMin} onChange={e => setFilterSeverityMin(Number(e.target.value))} className="border p-2 rounded-lg text-sm bg-gray-50 w-24" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Max Severity</label>
                <input type="number" min="1" max="10" value={filterSeverityMax} onChange={e => setFilterSeverityMax(Number(e.target.value))} className="border p-2 rounded-lg text-sm bg-gray-50 w-24" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date From</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="border p-2 rounded-lg text-sm bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date To</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="border p-2 rounded-lg text-sm bg-gray-50" />
              </div>
              <div className="flex-1 flex justify-end">
                <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-800 underline">Reset Filters</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap select-none">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th onClick={() => requestSort('id')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">ID {getSortIcon('id')}</th>
                      <th onClick={() => requestSort('severity')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Severity {getSortIcon('severity')}</th>
                      <th onClick={() => requestSort('status')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Status {getSortIcon('status')}</th>
                      <th onClick={() => requestSort('assignment')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Assignment {getSortIcon('assignment')}</th>
                      <th onClick={() => requestSort('reporter')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Reporter {getSortIcon('reporter')}</th>
                      <th onClick={() => requestSort('reported_at')} className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-100">Date {getSortIcon('reported_at')}</th>
                      <th className="p-4 font-semibold text-gray-600 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedHazards.map((hazard) => (
                      <tr key={hazard.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-4 text-sm text-gray-500">#{hazard.id}</td>
                        <td className="p-4">{getSeverityBadge(hazard.severity)}</td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1 text-sm font-medium ${
                            hazard.status === 'Resolved' ? 'text-green-600' : 
                            hazard.status === 'In Progress' ? 'text-amber-600' : 
                            hazard.status === 'Rejected' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {hazard.status === 'Resolved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                            {hazard.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {hazard.assigned_worker ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-800">{hazard.assigned_worker}</span>
                              <span className="text-xs text-red-500 flex items-center gap-1"><Calendar size={10}/> {new Date(hazard.deadline).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {hazard.reporter_id ? (
                            <>
                              <span className="font-semibold">@{hazard.reporter_name}</span>
                              <div className="text-xs text-gray-400">UID: {hazard.reporter_id}</div>
                            </>
                          ) : (
                            <span className="italic">Anonymous (System)</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          <div className="text-sm">{new Date(hazard.reported_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">{new Date(hazard.reported_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-4 space-x-2 flex flex-wrap gap-y-2 items-center">
                            {hazard.image_url && (
                              <button 
                                onClick={() => { alert('Opening image: ' + hazard.image_url); setPreviewImage(hazard.image_url); }}
                                className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                              >
                                Photo
                              </button>
                            )}
                            <button 
                              onClick={() => openAssignModal(hazard.id)}
                              disabled={hazard.status === 'Resolved' || hazard.status === 'Rejected'}
                              className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors"
                            >
                              {hazard.status === 'In Progress' ? 'Reassign' : 'Dispatch'}
                            </button>
                            <button 
                              onClick={() => markResolved(hazard.id)}
                              disabled={hazard.status === 'Resolved' || hazard.status === 'Reported' || hazard.status === 'Rejected'}
                              className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
                            >
                              Resolve
                            </button>
                            {hazard.status === 'Reported' && (
                              <button 
                                onClick={() => rejectHazard(hazard.id)}
                                className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-md font-medium hover:bg-red-200 transition-colors"
                              >
                                Reject
                              </button>
                            )}
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {processedHazards.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No records found matching your filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[75vh] max-w-7xl mx-auto rounded-xl overflow-hidden shadow-md border border-gray-200 relative z-0">
            <AdminMapComponent hazards={processedHazards} />
          </div>
        )}
      </main>
    </div>
  );
}
