import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { Leaf, AlertCircle, CheckCircle, Clock, LogIn } from 'lucide-react';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Axios base URL — Vite proxies /api → http://127.0.0.1:8000
axios.defaults.baseURL = '/api';

// Helper: sync the axios auth header from localStorage
function syncAuthHeader() {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}
// Apply on page load
syncAuthHeader();

// Helper: Map location picker component
function LocationPicker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position ? <Marker position={position}></Marker> : null;
}

// ─────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────
function Home() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    axios.get('/complaints/')
      .then(res => setComplaints(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => console.error('Error fetching complaints:', err));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
        Civic <span className="text-primary-600">Resolve</span>
      </h1>
      <p className="text-xl text-slate-600 mb-8 max-w-2xl">
        Connecting citizens with NGOs and volunteers to rapidly resolve community and civic issues.
      </p>

      <div className="w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden mb-8 border border-slate-200">
        <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '500px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {complaints
            .filter(c => c.location_lat && c.location_lng)
            .map(complaint => (
              <Marker key={complaint.id} position={[complaint.location_lat, complaint.location_lng]}>
                <Popup>
                  <div className="p-1">
                    <h3 className="font-bold text-slate-900">{complaint.title}</h3>
                    <p className="text-sm text-slate-600 mb-1">{complaint.description}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      complaint.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {complaint.status}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>

      <div className="flex gap-4">
        <Link to="/report" className="px-8 py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition shadow-lg hover:shadow-primary-500/40">
          Report an Issue
        </Link>
        <Link to="/dashboard" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 transition shadow">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ReportIssue
// ─────────────────────────────────────────────
function ReportIssue() {
  const navigate = useNavigate();
  // Derive login state freshly on each render
  const isLoggedIn = !!localStorage.getItem('token');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    location_lat: 51.505,
    location_lng: -0.09,
    address: '',
    media_proof: null,
  });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, media_proof: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      setMessage('Please login before submitting a complaint.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    // Make sure token is in the header before sending
    syncAuthHeader();

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('location_lat', formData.location_lat);
    data.append('location_lng', formData.location_lng);
    data.append('address', formData.address);
    if (formData.media_proof) {
      data.append('media_proof', formData.media_proof);
    }

    try {
      await axios.post('/complaints/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('✅ Complaint submitted successfully! Redirecting to dashboard...');
      setFormData({
        title: '',
        description: '',
        category: 'OTHER',
        location_lat: 51.505,
        location_lng: -0.09,
        address: '',
        media_proof: null,
      });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const backendMessage = err.response?.data || err.message;
      setMessage(`Error: ${JSON.stringify(backendMessage)}`);
      console.error('Complaint submit error:', err.response || err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-10">
      <h2 className="text-2xl font-bold mb-6">Report a Civic Issue</h2>

      {!isLoggedIn && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <LogIn size={20} className="text-yellow-600 shrink-0" />
          <p className="text-yellow-800 text-sm font-medium">
            You must be <Link to="/login" className="underline font-bold">logged in</Link> to submit a complaint.
          </p>
        </div>
      )}

      {message && (
        <p className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            placeholder="e.g. Pothole on Main St"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition h-32"
            placeholder="Provide details..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          >
            <option value="ROADS">Roads &amp; Infrastructure</option>
            <option value="WATER">Water &amp; Sanitation</option>
            <option value="WASTE">Waste Management</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            placeholder="Location address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location on Map</label>
          <div className="h-64 rounded-lg overflow-hidden border border-slate-300 z-0 relative">
            <MapContainer center={[formData.location_lat, formData.location_lng]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker 
                position={{ lat: formData.location_lat, lng: formData.location_lng }} 
                setPosition={(latlng) => setFormData(prev => ({ ...prev, location_lat: latlng.lat, location_lng: latlng.lng }))} 
              />
            </MapContainer>
          </div>
          <p className="text-xs text-slate-500 mt-1">Click on the map to set the exact location.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Photo Proof</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !isLoggedIn}
          className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
function Dashboard() {
  const [complaints, setComplaints] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('token')) {
      axios.get('/auth/me/').then(res => setCurrentUser(res.data)).catch(console.error);
    }
  }, []);

  const fetchComplaints = useCallback(() => {
    setLoading(true);
    syncAuthHeader();
    axios.get('/complaints/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setComplaints(data);
        setError('');
      })
      .catch(err => {
        console.error('Error fetching complaints:', err);
        setError('Failed to load complaints. ' + (err.response?.data?.detail || err.message));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = async (id) => {
    try {
      await axios.post(`/complaints/${id}/resolve_admin/`);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert('Error resolving complaint (must be admin).');
    }
  };

  const handleRead = async (id) => {
    try {
      await axios.post(`/complaints/${id}/read_admin/`);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert('Error marking complaint as read.');
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const pending    = complaints.filter(c => c.status === 'PENDING').length;
  const inProgress = complaints.filter(c => ['ACCEPTED', 'ASSIGNED'].includes(c.status)).length;
  const resolved   = complaints.filter(c => c.status === 'RESOLVED').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <button
          onClick={fetchComplaints}
          className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6">
          <div className="p-4 bg-yellow-50 rounded-xl text-yellow-600">
            <Clock size={32} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending</h3>
            <p className="text-4xl font-black text-slate-900">{pending}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6">
          <div className="p-4 bg-primary-50 rounded-xl text-primary-600">
            <AlertCircle size={32} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">In Progress</h3>
            <p className="text-4xl font-black text-primary-600">{inProgress}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6">
          <div className="p-4 bg-green-50 rounded-xl text-green-600">
            <CheckCircle size={32} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Resolved</h3>
            <p className="text-4xl font-black text-green-600">{resolved}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-lg">Recent Complaints</h3>
        </div>

        {loading && (
          <div className="p-12 text-center text-slate-500">Loading complaints...</div>
        )}

        {error && !loading && (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        )}

        {!loading && !error && complaints.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No complaints found. <Link to="/report" className="text-primary-600 font-medium underline">Report one!</Link>
          </div>
        )}

        {!loading && complaints.length > 0 && (
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Issue</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reported By</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map(complaint => (
                <tr key={complaint.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-5 font-medium text-slate-900">{complaint.title}</td>
                  <td className="px-6 py-5 text-slate-600 text-sm">{complaint.category}</td>
                  <td className="px-6 py-5 text-slate-500 text-sm">{complaint.address || 'Unknown'}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      complaint.status === 'PENDING'  ? 'bg-yellow-100 text-yellow-800' :
                      complaint.status === 'RESOLVED' ? 'bg-green-100 text-green-800'  :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {complaint.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-slate-500 text-sm">
                    {complaint.citizen?.username || '—'}
                  </td>
                  <td className="px-6 py-5">
                    {currentUser?.role === 'ADMIN' && (
                      <div className="flex gap-2">
                        {complaint.status === 'PENDING' && (
                          <button 
                            onClick={() => handleRead(complaint.id)}
                            className="text-xs bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-600 transition"
                          >
                            Mark Read
                          </button>
                        )}
                        {complaint.status !== 'RESOLVED' && (
                          <button 
                            onClick={() => handleResolve(complaint.id)}
                            className="text-xs bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
function Login({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/auth/token/', { username, password });
      localStorage.setItem('token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      // Immediately sync header so subsequent calls work
      syncAuthHeader();
      setIsLoggedIn(true);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Invalid credentials. Please try again.';
      setError(detail);
      console.error('Login error:', err.response || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-sm border border-slate-200 mt-16">
      <div className="flex items-center justify-center mb-6">
        <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
          <LogIn size={28} />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-center text-slate-900">Welcome back</h2>
      <p className="text-center text-slate-500 text-sm mb-6">Login to submit and track complaints</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input
            type="text"
            id="login-username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            placeholder="e.g. citizen1"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-slate-500">
        Don't have an account? <Link to="/register" className="text-primary-600 font-bold hover:underline">Sign up</Link>
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
        <p className="font-semibold mb-1 text-slate-700">Demo credentials:</p>
        <p>citizen1 / pass123</p>
        <p>citizen2 / pass123</p>
        <p>admin / admin123</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────
function Register({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/auth/register/', { username, password });
      const res = await axios.post('/auth/token/', { username, password });
      localStorage.setItem('token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      syncAuthHeader();
      setIsLoggedIn(true);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.error || err.response?.data?.detail || 'Registration failed. Try a different username.';
      setError(detail);
      console.error('Register error:', err.response || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-sm border border-slate-200 mt-16">
      <h2 className="text-2xl font-bold mb-2 text-center text-slate-900">Create an Account</h2>
      <p className="text-center text-slate-500 text-sm mb-6">Sign up to report civic issues</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-slate-500">
        Already have an account? <Link to="/login" className="text-primary-600 font-bold hover:underline">Log in</Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TopNav
// ─────────────────────────────────────────────
function TopNav({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    syncAuthHeader();
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between sticky top-0 z-50 shadow-sm">
      <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl">
        <Leaf size={24} /> Civic Resolve
      </Link>
      <div className="flex items-center gap-4 text-sm font-medium">
        <Link to="/" className="text-slate-600 hover:text-primary-600 transition">Home</Link>
        <Link to="/report" className="text-slate-600 hover:text-primary-600 transition">Report Issue</Link>
        <Link to="/dashboard" className="text-slate-600 hover:text-primary-600 transition">Dashboard</Link>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Logout
          </button>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('token');
    if (token) syncAuthHeader();
    return !!token;
  });

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <TopNav isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/report"    element={<ReportIssue />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login"     element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/register"  element={<Register setIsLoggedIn={setIsLoggedIn} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
