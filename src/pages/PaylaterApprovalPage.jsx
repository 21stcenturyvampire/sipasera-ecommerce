import React, { useEffect } from 'react';
import { CreditCard, Check, XCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function PaylaterApprovalPage({ applications, fetchApps, fetchCreditLimits, showFlash }) {
  useEffect(() => {
    fetchApps();
  }, []);

  const handleApproval = async (appId, status) => {
    const app = applications.find(a => a.application_id === appId);
    
    const { error } = await supabase.from('paylater_applications').update({
      status: status,
      approved_at: status === 'approved' ? new Date().toISOString() : null
    }).eq('application_id', appId);

    if (error) {
      showFlash('Gagal update status!', 'error');
      return;
    }

    if (status === 'approved') {
      const { data: existingCredit } = await supabase
        .from('user_credit_limit')
        .select('*')
        .eq('user_id', app.user_id)
        .single();

      if (existingCredit) {
        await supabase.from('user_credit_limit').update({
          credit_limit: parseFloat(existingCredit.credit_limit) + parseFloat(app.requested_limit)
        }).eq('user_id', app.user_id);
      } else {
        await supabase.from('user_credit_limit').insert([{
          user_id: app.user_id,
          credit_limit: parseFloat(app.requested_limit),
          used_credit: 0,
          status: 'active'
        }]);
      }
      
      fetchCreditLimits();
    }

    fetchApps();
    showFlash(`Pengajuan ${status === 'approved' ? 'disetujui' : 'ditolak'}!`, 'success');
  };

  const pendingApps = applications.filter(a => a.status === 'pending');
  const processedApps = applications.filter(a => a.status !== 'pending');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Approval Pengajuan Paylater
      </h1>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Menunggu Approval ({pendingApps.length})
        </h2>
        <div className="space-y-4">
          {pendingApps.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <CreditCard size={64} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">Tidak ada pengajuan pending</p>
            </div>
          ) : (
            pendingApps.map(app => (
              <div key={app.application_id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{app.users?.name}</h3>
                    <p className="text-sm text-slate-600">{app.users?.email}</p>
                    <p className="text-sm text-slate-500 mt-2">
                      {new Date(app.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Jumlah Pengajuan</p>
                    <p className="text-2xl font-bold text-blue-600">
                      Rp {parseFloat(app.requested_limit).toLocaleString()}
                    </p>
                  </div>
                </div>
                {app.reason && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Alasan:</p>
                    <p className="text-sm text-slate-600">{app.reason}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApproval(app.application_id, 'approved')} 
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Setujui
                  </button>
                  <button 
                    onClick={() => handleApproval(app.application_id, 'rejected')} 
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Tolak
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Riwayat Approval</h2>
        <div className="space-y-3">
          {processedApps.map(app => (
            <div 
              key={app.application_id} 
              className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{app.users?.name}</p>
                <p className="text-sm text-slate-600">
                  Rp {parseFloat(app.requested_limit).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                app.status === 'approved' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {app.status === 'approved' ? 'Disetujui' : 'Ditolak'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}