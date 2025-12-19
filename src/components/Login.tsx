// src/Login.tsx
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { loginService } from '../api'; // Import service yang baru dibuat

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State untuk UX (Loading & Error)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Panggil API
      const data = await loginService(email, password);
      
      // 2. Simpan token di localStorage (supaya persist saat reload)
      localStorage.setItem('token', data.access_token);
      
      // 3. Update state di parent
      onLogin();
    } catch (err: any) {
      // Handle error login
      console.error(err);
      setError("Email atau password salah. Coba 'admin@mbg.com' pass '123'");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        
        {/* Header Logo Section - Sama seperti sebelumnya */}
        <div className="flex justify-center items-center gap-4 mb-8">
           <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xs font-bold text-center leading-tight shadow-md">
            eco<br/>digitus
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <div className="border-2 border-yellow-400 text-yellow-600 rounded-full w-12 h-12 flex items-center justify-center text-[10px] font-bold text-center">
            BGN<br/>RI
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Selamat Datang</h2>
          <p className="text-sm text-gray-500 mt-1">Sistem Monitoring Kualitas Dapur MBG</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                placeholder="admin@mbg.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                placeholder="123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Masuk ke Dashboard
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          Powered by Odoo ERP & Machine Learning
        </p>
      </div>
    </div>
  );
};