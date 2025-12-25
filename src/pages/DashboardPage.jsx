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

  const getBestSellingProducts = () => {
    const salesMap = {};

    orders.forEach(order => {
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach(item => {
          const productId = item.product_id;
          const quantity = item.quantity || 0;
          salesMap[productId] = (salesMap[productId] || 0) + quantity;
        });
      }
    });

    return Object.entries(salesMap)
      .map(([productId, quantity]) => {
        const product = products.find(p => p.product_id === parseInt(productId));
        return {
          ...product,
          totalSold: quantity,
          totalRevenue: (product?.price || 0) * quantity
        };
      })
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
  };

  const bestSellers = getBestSellingProducts();

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

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Produk Paling Laris</h2>
        {bestSellers.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Belum ada penjualan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Nama Produk</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Kategori</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Terjual</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Harga Satuan</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Total Penjualan</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.map((product, index) => (
                  <tr key={product.product_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-lg">📦</span>
                          )}
                        </div>
                        <span className="font-medium text-slate-800">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600">{product.category || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold text-sm">
                        {product.totalSold}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      Rp {parseFloat(product.price).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      Rp {product.totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}