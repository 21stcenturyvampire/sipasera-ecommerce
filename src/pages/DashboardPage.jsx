import React from 'react';
import { TrendingUp, Users, Package, ShoppingCart } from 'lucide-react';

export function DashboardPage({ products, orders, users, reports }) {
  const totalIncome = reports
    .filter(r => r.report_type === 'income')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  
  const totalExpense = reports
    .filter(r => r.report_type === 'expense')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  
  const totalRevenue = totalIncome - totalExpense;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalCustomers = users.filter(u => u.role === 'user').length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Total Pendapatan</p>
              <p className="text-2xl font-bold text-slate-800">
                Rp {totalRevenue.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="text-purple-600" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Total Customer</p>
              <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
            </div>
            <Users className="text-orange-600" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Total Produk</p>
              <p className="text-2xl font-bold text-slate-800">{products.length}</p>
            </div>
            <Package className="text-blue-600" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Total Pesanan</p>
              <p className="text-2xl font-bold text-slate-800">{orders.length}</p>
              <p className="text-xs text-slate-500 mt-1">
                Selesai: {completedOrders} | Pending: {pendingOrders}
              </p>
            </div>
            <ShoppingCart className="text-green-600" size={32} />
          </div>
        </div>
      </div>
    </div>
  );
}