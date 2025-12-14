import React, { useState, useEffect } from 'react';
import { Plus, Users, Truck, Package, Briefcase } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function OperationalPage({ expenses, fetchExpenses, currentUser, showFlash }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    expense_type: 'gaji', 
    description: '', 
    amount: 0, 
    expense_date: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async () => {
    const { error } = await supabase.from('operational_expenses').insert([{
      ...formData,
      created_by: currentUser.user_id
    }]);

    if (error) {
      showFlash('Gagal menambah data operasional!', 'error');
    } else {
      await supabase.from('financial_report').insert([{
        report_type: 'expense',
        description: `${formData.expense_type.toUpperCase()} - ${formData.description}`,
        amount: formData.amount
      }]);

      showFlash('Data operasional berhasil ditambahkan!', 'success');
      fetchExpenses();
      setShowModal(false);
      setFormData({ 
        expense_type: 'gaji', 
        description: '', 
        amount: 0, 
        expense_date: new Date().toISOString().split('T')[0] 
      });
    }
  };

  const totalByType = {
    gaji: expenses.filter(e => e.expense_type === 'gaji').reduce((sum, e) => sum + parseFloat(e.amount), 0),
    bbm: expenses.filter(e => e.expense_type === 'bbm').reduce((sum, e) => sum + parseFloat(e.amount), 0),
    pembelian_stok: expenses.filter(e => e.expense_type === 'pembelian_stok').reduce((sum, e) => sum + parseFloat(e.amount), 0),
    lainnya: expenses.filter(e => e.expense_type === 'lainnya').reduce((sum, e) => sum + parseFloat(e.amount), 0)
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Operasional</h1>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Tambah Pengeluaran
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-600" size={24} />
            <span className="text-sm font-medium text-slate-700">Gaji Karyawan</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            Rp {totalByType.gaji.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="text-green-600" size={24} />
            <span className="text-sm font-medium text-slate-700">BBM</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            Rp {totalByType.bbm.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-purple-600" size={24} />
            <span className="text-sm font-medium text-slate-700">Stok Produk</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            Rp {totalByType.pembelian_stok.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="text-orange-600" size={24} />
            <span className="text-sm font-medium text-slate-700">Lainnya</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            Rp {totalByType.lainnya.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                  Deskripsi
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">
                  Jumlah
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {expenses.map(expense => (
                <tr key={expense.expense_id}>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(expense.expense_date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {expense.expense_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
                    Rp {parseFloat(expense.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full" 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Tambah Pengeluaran Operasional</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipe Pengeluaran
                </label>
                <select 
                  value={formData.expense_type} 
                  onChange={(e) => setFormData({...formData, expense_type: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="gaji">Gaji Karyawan</option>
                  <option value="bbm">BBM/Pengantaran</option>
                  <option value="pembelian_stok">Pembelian Stok</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi</label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="Contoh: Gaji bulan Desember" 
                  className="w-full px-4 py-2 border rounded-lg" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Jumlah (Rp)
                </label>
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                  placeholder="5000000" 
                  className="w-full px-4 py-2 border rounded-lg" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal</label>
                <input 
                  type="date" 
                  value={formData.expense_date} 
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg" 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSubmit} 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Simpan
                </button>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 bg-slate-200 py-2 rounded-lg hover:bg-slate-300"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}