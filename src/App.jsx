import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import DosenDashboard from './pages/dosen/Dashboard';
import MahasiswaList from './pages/dosen/MahasiswaList';
import MahasiswaDashboard from './pages/mahasiswa/Dashboard';

// Komponen untuk melindungi route Dosen
const DosenRoute = ({ children }) => {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'dosen_wali') return <Navigate to="/mahasiswa" replace />;
  return children;
};

// Komponen untuk melindungi route Mahasiswa
const MahasiswaRoute = ({ children }) => {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'mahasiswa') return <Navigate to="/dosen" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Landing />} />
      
      {/* Dosen Wali Routes */}
      <Route path="/dosen" element={<DosenRoute><Layout /></DosenRoute>}>
        <Route index element={<DosenDashboard />} />
        <Route path="mahasiswa" element={<MahasiswaList />} />
        <Route path="alert" element={<div className="p-6">Halaman Alert (Sedang Dikembangkan)</div>} />
        <Route path="jadwal" element={<div className="p-6">Halaman Jadwal (Sedang Dikembangkan)</div>} />
      </Route>

      {/* Mahasiswa Routes */}
      <Route path="/mahasiswa" element={<MahasiswaRoute><Layout /></MahasiswaRoute>}>
        <Route index element={<MahasiswaDashboard />} />
        <Route path="jadwal" element={<div className="p-6">Jadwal Mahasiswa (Sedang Dikembangkan)</div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
