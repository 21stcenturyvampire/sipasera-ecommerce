import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Search, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function OrdersPage({ orders, users, currentUser, fetchOrders, showFlash }) {
  const [orderItems, setOrderItems] = useState({});
  const [payments, setPayments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllOrderItems();
    fetchAllPayments();
  }, [orders]);

  const fetchAllOrderItems = async () => {
    const items = {};
    for (const order of orders) {
      const { data } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('order_id', order.order_id);
      items[order.order_id] = data || [];
    }
    setOrderItems(items);
  };

  const fetchAllPayments = async () => {
    try {
      const { data } = await supabase
        .from('payments')
        .select('*');
      
      if (data) {
        const paymentMap = {};
        data.forEach(p => {
          if (!paymentMap[p.order_id]) {
            paymentMap[p.order_id] = [];
          }
          paymentMap[p.order_id].push(p);
        });
        setPayments(paymentMap);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const userOrders = currentUser?.role === 'admin' 
    ? orders 
    : orders.filter(o => o.user_id === currentUser.user_id);

  // Filter orders berdasarkan search query (termasuk item/produk)
  const filteredOrders = userOrders.filter(order => {
    if (!searchQuery) return true;
    
    const user = users.find(u => u.user_id === order.user_id);
    const userName = user?.name || '';
    const searchLower = searchQuery.toLowerCase();
    
    // Cek search di order properties
    const orderMatch = (
      order.order_id.toString().includes(searchQuery) ||
      userName.toLowerCase().includes(searchLower) ||
      new Date(order.created_at).toLocaleDateString('id-ID').includes(searchQuery) ||
      order.status.toLowerCase().includes(searchLower)
    );

    // Cek search di item/produk
    const items = orderItems[order.order_id] || [];
    const itemMatch = items.some(item => 
      item.products?.name?.toLowerCase().includes(searchLower)
    );

    return orderMatch || itemMatch;
  });

  const getPaymentLabel = (method) => {
    if (method === 'transfer') return 'Transfer Bank';
    if (method === 'cod') return 'COD';
    if (method === 'paylater') return 'Paylater';
    return 'Tunai';
  };

  const getRemainingAmount = (order) => {
    try {
      const orderPayments = payments[order.order_id] || [];
      const paid = orderPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      return Math.max(parseFloat(order.total_amount) - paid, 0);
    } catch (error) {
      console.error('getRemainingAmount error:', error);
      return parseFloat(order.total_amount);
    }
  };

  const isOrderPaid = (order) => {
    // Cek apakah order adalah paylater dan sudah lunas
    if (order.payment_method === 'paylater') {
      return getRemainingAmount(order) <= 0;
    }
    // Untuk non-paylater, anggap sudah lunas jika status completed atau paid
    return order.status === 'completed' || order.status === 'paid';
  };

  // Highlight item yang match dengan search query
  const highlightMatchingItems = (items, query) => {
    if (!query) return items;
    return items.map(item => ({
      ...item,
      isMatched: item.products?.name?.toLowerCase().includes(query.toLowerCase())
    }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {currentUser?.role === 'admin' ? 'Semua Pesanan' : 'Pesanan Saya'}
        </h1>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor order, nama, tanggal, status, atau nama item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-slate-500 mt-2">
            Ditemukan {filteredOrders.length} pesanan
          </p>
        )}
      </div>
      
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ShoppingCart size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">
              {searchQuery ? 'Tidak ada pesanan yang cocok dengan pencarian' : 'Belum ada pesanan'}
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const user = users.find(u => u.user_id === order.user_id);
            const items = orderItems[order.order_id] || [];
            const isPaid = isOrderPaid(order);
            const highlightedItems = highlightMatchingItems(items, searchQuery);
            
            return (
              <div 
                key={order.order_id} 
                className={`rounded-xl shadow-sm p-6 transition-all ${
                  isPaid 
                    ? 'bg-green-50 border-2 border-green-300' 
                    : 'bg-white border border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg text-slate-800">
                        Order #{order.order_id}
                      </h3>
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">
                          <Check size={14} />
                          LUNAS
                        </span>
                      )}
                    </div>
                    {currentUser?.role === 'admin' && (
                      <p className="text-slate-600">{user?.name}</p>
                    )}
                    <p className="text-sm text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('id-ID')}
                    </p>
                    <p className="text-sm text-blue-600 mt-1 font-medium">
                      Pembayaran via: {getPaymentLabel(order.payment_method)}
                    </p>
                    {order.due_date && (
                      <p className={`text-sm mt-1 font-medium ${
                        isPaid ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        Jatuh Tempo: {new Date(order.due_date).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">
                      Rp {parseFloat(order.total_amount).toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                {items.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Item Pesanan:</p>
                    {highlightedItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`flex justify-between text-sm mb-1 p-2 rounded ${
                          searchQuery && item.isMatched 
                            ? 'bg-yellow-100 text-slate-800 font-semibold' 
                            : 'text-slate-600'
                        }`}
                      >
                        <span>{item.products?.name} x{item.quantity}</span>
                        <span>
                          Rp {(parseFloat(item.price) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {order.payment_method === 'paylater' && !isPaid && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-red-600">
                      Sisa Hutang: Rp {getRemainingAmount(order).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}