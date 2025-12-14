import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export function FinancialReportsPage({ reports, orders, fetchReports }) {
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    if (filter !== 'all' && r.report_type !== filter) return false;
    if (startDate && new Date(r.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(r.created_at) > new Date(endDate)) return false;
    return true;
  });

  const totalIncome = filteredReports
    .filter(r => r.report_type === 'income')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  
  const totalExpense = filteredReports
    .filter(r => r.report_type === 'expense')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Laporan Keuangan</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-medium">Total Pemasukan</p>
              <p className="text-2xl font-bold text-green-800 mt-1">
                Rp {totalIncome.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 text-sm font-medium">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-red-800 mt-1">
                Rp {totalExpense.toLocaleString()}
              </p>
            </div>
            <TrendingDown className="text-red-600" size={32} />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-medium">Laba Bersih</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                Rp {netProfit.toLocaleString()}
              </p>
            </div>
            <DollarSign className="text-blue-600" size={32} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Filter Laporan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipe</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            >
              <option value="all">Semua</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Dari Tanggal</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sampai Tanggal</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg" 
            />
          </div>
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
              {filteredReports.map(report => (
                <tr key={report.report_id}>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(report.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      report.report_type === 'income' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {report.report_type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800">{report.description}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">
                    <span className={report.report_type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      Rp {parseFloat(report.amount).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}