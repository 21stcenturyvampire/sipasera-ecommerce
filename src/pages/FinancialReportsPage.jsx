import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export function FinancialReportsPage({ reports, orders, fetchReports }) {
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount-asc', 'amount-desc'

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    if (filter !== 'all' && r.report_type !== filter) return false;
    
    // Convert dates to start of day for accurate comparison
    const reportDate = new Date(r.created_at);
    reportDate.setHours(0, 0, 0, 0);
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (reportDate < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set to end of day to include the end date
      if (reportDate > end) return false;
    }
    
    return true;
  });

  // Sort reports based on selected option
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === 'amount-asc') {
      return parseFloat(a.amount) - parseFloat(b.amount);
    } else if (sortBy === 'amount-desc') {
      return parseFloat(b.amount) - parseFloat(a.amount);
    }
    // Default: sort by date (newest first)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Calculate totals from FILTERED reports
  const totalIncome = filteredReports
    .filter(r => r.report_type === 'income')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  
  const totalExpense = filteredReports
    .filter(r => r.report_type === 'expense')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  
  const netProfit = totalIncome - totalExpense;

  // Calculate COGS (Cost of Goods Sold) from operational expenses
  const cogs = filteredReports
    .filter(r => r.report_type === 'expense' && 
                 (r.description.includes('PEMBELIAN_STOK') || 
                  r.description.toLowerCase().includes('stok') ||
                  r.description.toLowerCase().includes('pembelian')))
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

  // Gross Profit = Total Income - COGS
  const grossProfit = totalIncome - cogs;

  // Operating Expenses (non-COGS expenses)
  const operatingExpenses = totalExpense - cogs;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Laporan Keuangan</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-medium">Laba Kotor</p>
              <p className="text-2xl font-bold text-purple-800 mt-1">
                Rp {grossProfit.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Margin: {totalIncome > 0 ? ((grossProfit / totalIncome) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <DollarSign className="text-purple-600" size={32} />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-medium">Laba Bersih</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                Rp {netProfit.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Margin: {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <DollarSign className="text-blue-600" size={32} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Filter Laporan</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sampai Tanggal (inklusif)
            </label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Urutkan Berdasarkan</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            >
              <option value="date">Tanggal (Terbaru)</option>
              <option value="amount-desc">Nominal Terbesar</option>
              <option value="amount-asc">Nominal Terkecil</option>
            </select>
          </div>
        </div>
        {(startDate || endDate || filter !== 'all' || sortBy !== 'date') && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Menampilkan {sortedReports.length} transaksi
                {startDate && endDate && ` dari ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`}
              </p>
              <button
                onClick={() => {
                  setFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setSortBy('date');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
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
              {sortedReports.map(report => (
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