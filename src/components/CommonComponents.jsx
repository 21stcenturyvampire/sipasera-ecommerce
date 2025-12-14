import React from 'react';
import { Bell, X, Check, XCircle, AlertCircle } from 'lucide-react';

export function NotificationBanner({ notifications, onClose }) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
      {notifications.map(notif => (
        <div 
          key={notif.application_id} 
          className={`mb-2 ${notif.status === 'approved' ? 'bg-green-500' : 'bg-red-500'} text-white p-4 rounded-lg shadow-lg flex items-start gap-3`}
        >
          <Bell size={20} className="mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Pengajuan Limit Paylater</p>
            <p className="text-sm">
              Pengajuan Anda sebesar Rp {parseFloat(notif.requested_limit).toLocaleString()} telah{' '}
              <strong>{notif.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}</strong>!
            </p>
          </div>
          <button 
            onClick={() => onClose(notif.application_id)} 
            className="hover:bg-white/20 p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function FlashMessage({ message, type, onClose }) {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md`}>
        {type === 'success' && <Check size={20} />}
        {type === 'error' && <XCircle size={20} />}
        {type === 'info' && <AlertCircle size={20} />}
        <span className="flex-1">{message}</span>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    </div>
  );
}