import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { fetchUserProfile, type UserProfile } from './api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // 1. Cek Token & Load User Profile saat aplikasi dibuka
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Validasi token dengan cara coba ambil data user
          const userData = await fetchUserProfile();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Session expired or invalid", error);
          handleLogout(); // Kalau token tidak valid, hapus session
        }
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  // 2. Fungsi Login (Dipanggil dari component Login)
  const handleLoginSuccess = async () => {
    try {
      // Setelah login sukses (dapat token), kita ambil data profilenya
      const userData = await fetchUserProfile();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Gagal mengambil profile setelah login");
    }
  };

  // 3. Fungsi Logout (Membersihkan Session)
  const handleLogout = () => {
    localStorage.removeItem('token'); // Hapus token
    setUser(null);                    // Hapus data user di state
    setIsAuthenticated(false);        // Set status login false
  };

  if (isCheckingAuth) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;