import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { Leaf, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Set up axios defaults
axios.defaults.baseURL = '/api';
if (localStorage.getItem('token')) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
}

function Home() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    axios.get('/complaints/')
      .then(res => setComplaints(res.data))
      .catch(err => console.error("Error fetching complaints:", err));
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
          {complaints.map(complaint => (
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

function ReportIssue() {
  const isLoggedIn = !!localStorage.getItem('token');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    location_lat: 51.505,
    location_lng: -0.09,
    address: '',
    media_proof: null
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, media_proof: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setMessage('Please login before submitting a complaint.');
      return;
    }

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
      await axios.post('/complaints/', data);
      setMessage('Complaint submitted successfully!');
      setFormData({
        title: '',
        description: '',
        category: 'OTHER',
        location_lat: 51.505,
        location_lng: -0.09,
        address: '',
        media_proof: null
      });
    } catch (err) {
      const backendMessage = err.response?.data || err.message;
      setMessage(`Error submitting complaint: ${JSON.stringify(backendMessage)}`);
      console.error('Complaint submit error:', err.response || err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-10">
      <h2 className="text-2xl font-bold mb-6">Report a Civic Issue</h2>
      {message && <p className={`mb-4 ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
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
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          >
            <option value="ROADS">Roads & Infrastructure</option>
            <option value="WATER">Water & Sanitation</option>
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
        {/* Simplified map selector for placeholder */}
        <div className="h-48 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-center text-slate-500">
          Map component to pin location... (Using default coords for now)
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Photo Proof</label>
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <button type="submit" className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition">Submit Complaint</button>
      </form>
    </div>
  );
}

function Dashboard() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    axios.get('/complaints/')
      .then(res => setComplaints(res.data))
      .catch(err => console.error("Error fetching complaints:", err));
  }, []);

  const pending = complaints.filter(c => c.status === 'PENDING').length;
  const inProgress = complaints.filter(c => ['ACCEPTED', 'ASSIGNED'].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === 'RESOLVED').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-slate-900">Dashboard</h2>
      
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
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Issue</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
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
                    complaint.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    complaint.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {complaint.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <button className="text-primary-600 font-bold hover:text-primary-700 text-sm">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Login({ setIsLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/auth/token/', { username, password });
      localStorage.setItem('token', res.data.access);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
      setIsLoggedIn(true);
      setError('');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition">Login</button>
      </form>
    </div>
  );
}

function TopNav({ isLoggedIn, setIsLoggedIn }) {
  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setIsLoggedIn(false);
  };

  return (
    <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl">
        <Leaf size={24} /> Civic Resolve
      </Link>
      <div className="flex items-center gap-4 text-sm font-medium">
        <Link to="/" className="text-slate-600 hover:text-primary-600">Home</Link>
        <Link to="/report" className="text-slate-600 hover:text-primary-600">Report Issue</Link>
        <Link to="/dashboard" className="text-slate-600 hover:text-primary-600">Dashboard</Link>
        {isLoggedIn ? (
          <button onClick={handleLogout} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">Logout</button>
        ) : (
          <Link to="/login" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">Login</Link>
        )}
      </div>
    </nav>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <TopNav isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
