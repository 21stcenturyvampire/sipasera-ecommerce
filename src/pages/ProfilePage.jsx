import React, { useState } from 'react';
import { Edit2, Plus } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function ProfilePage({ currentUser, setCurrentUser, creditLimits, fetchCreditLimits, showFlash }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...currentUser });
  const [showPaylaterForm, setShowPaylaterForm] = useState(false);
  const [paylaterAmount, setPaylaterAmount] = useState('');
  const [paylaterReason, setPaylaterReason] = useState('');

  const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
  const availableCredit = userCredit 
    ? parseFloat(userCredit.credit_limit) - parseFloat(userCredit.used_credit) 
    : 0;

  const handleUpdateProfile = async () => {
    const { error } = await supabase.from('users').update({
      name: formData.name,
      phone: formData.phone,
      address: formData.address
    }).eq('user_id', currentUser.user_id);

    if (error) {
      showFlash('Gagal update profile!', 'error');
    } else {
      setCurrentUser({ ...currentUser, ...formData });
      setIsEditing(false);
      showFlash('Profile berhasil diupdate!', 'success');
    }
  };

  const handleSubmitPaylater = async () => {
    if (!paylaterAmount || parseFloat(paylaterAmount) <= 0) {
      showFlash('Jumlah limit tidak valid!', 'error');
      return;
    }

    const { error } = await supabase.from('paylater_applications').insert([{
      user_id: currentUser.user_id,
      requested_limit: parseFloat(paylaterAmount),
      reason: paylaterReason,
      status: 'pending'
    }]);

    if (error) {
      showFlash('Gagal mengajukan paylater!', 'error');
    } else {
      showFlash('Pengajuan paylater berhasil dikirim!', 'success');
      setShowPaylaterForm(false);
      setPaylaterAmount('');
      setPaylaterReason('');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Profile Saya</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Informasi Personal</h2>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                <Edit2 size={16} /> Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nama</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                disabled={!isEditing} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg disabled:bg-slate-50" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                disabled 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nomor Telepon</label>
              <input 
                type="tel" 
                value={formData.phone || ''} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                disabled={!isEditing} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg disabled:bg-slate-50" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Alamat</label>
              <textarea 
                value={formData.address || ''} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
                disabled={!isEditing} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg disabled:bg-slate-50" 
                rows="3" 
              />
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleUpdateProfile} 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Simpan
                </button>
                <button 
                  onClick={() => { setIsEditing(false); setFormData({ ...currentUser }); }} 
                  className="flex-1 bg-slate-200 py-2 rounded-lg hover:bg-slate-300"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-sm font-medium mb-2 opacity-90">Limit Kredit</h3>
            <div className="text-3xl font-bold mb-1">
              Rp {availableCredit.toLocaleString()}
            </div>
            <div className="text-sm opacity-90 mb-4">
              dari Rp {userCredit ? parseFloat(userCredit.credit_limit).toLocaleString() : '0'}
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div 
                className="bg-white rounded-full h-2" 
                style={{ 
                  width: `${userCredit ? ((parseFloat(userCredit.credit_limit) - parseFloat(userCredit.used_credit)) / parseFloat(userCredit.credit_limit)) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <div className="text-xs opacity-90">
              Terpakai: Rp {userCredit ? parseFloat(userCredit.used_credit).toLocaleString() : '0'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Ajukan Peningkatan Limit
            </h3>
            {!showPaylaterForm ? (
              <button 
                onClick={() => setShowPaylaterForm(true)} 
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Ajukan Limit
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Jumlah Limit (Rp)
                  </label>
                  <input 
                    type="number" 
                    value={paylaterAmount} 
                    onChange={(e) => setPaylaterAmount(e.target.value)} 
                    placeholder="1000000" 
                    className="w-full px-4 py-2 border rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Alasan</label>
                  <textarea 
                    value={paylaterReason} 
                    onChange={(e) => setPaylaterReason(e.target.value)} 
                    placeholder="Jelaskan alasan pengajuan" 
                    className="w-full px-4 py-2 border rounded-lg" 
                    rows="3" 
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSubmitPaylater} 
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Kirim
                  </button>
                  <button 
                    onClick={() => setShowPaylaterForm(false)} 
                    className="flex-1 bg-slate-200 py-2 rounded-lg hover:bg-slate-300"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}