import React, { useState } from 'react';

export function LoginPage({ onLogin, onRegister, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      alert('Email dan password harus diisi!');
      return;
    }
    const success = await onLogin(email, password);
    if (!success) alert('Email atau password salah!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-3xl font-bold text-slate-800">SIPASERA</h1>
          <p className="text-slate-600 mt-2">Sistem Belanja Sembako</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="email@example.com" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="••••••••" 
            />
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400"
          >
            {loading ? 'Loading...' : 'Masuk'}
          </button>
          <button 
            onClick={onRegister} 
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200"
          >
            Daftar Akun Baru
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage({ onRegister, onBack, loading }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    phone: '', 
    address: '' 
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      alert('Nama, email, dan password harus diisi!');
      return;
    }
    
    const result = await onRegister(formData);
    if (result.success) {
      alert(result.message);
      onBack();
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-3xl font-bold text-slate-800">Daftar Akun</h1>
          <p className="text-slate-600 mt-2">Buat akun SIPASERA Anda</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Lengkap *</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="Nama Warung/Toko" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="email@example.com" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
            <input 
              type="password" 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="••••••••" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nomor Telepon</label>
            <input 
              type="tel" 
              value={formData.phone} 
              onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="08xxxxxxxxxx" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Alamat</label>
            <textarea 
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
              placeholder="Alamat lengkap" 
              rows="2" 
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p>✨ Setelah registrasi, Anda akan mendapatkan limit kredit Rp 1 yang dapat ditingkatkan dengan pengajuan ke admin.</p>
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400"
          >
            {loading ? 'Loading...' : 'Daftar Sekarang'}
          </button>
          <button 
            onClick={onBack} 
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}