import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function OrdersPage({ orders, users, currentUser, fetchOrders, showFlash }) {
  const [orderItems, setOrderItems] = useState({});

  useEffect(() => {
    fetchAllOrderItems();
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

  const userOrders = currentUser?.role === 'admin' 
    ? orders 
    : orders.filter(o => o.user_id === currentUser.user_id);

  const getPaymentLabel = (method) => {
    if (method === 'transfer') return 'Transfer Bank';
    if (method === 'cod') return 'COD';
    if (method === 'paylater') return 'Paylater';
    return 'Tunai';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {currentUser?.role === 'admin' ? 'Semua Pesanan' : 'Pesanan Saya'}
      </h1>
      
      <div className="space-y-4">
        {userOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ShoppingCart size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">Belum ada pesanan</p>
          </div>
        ) : (
          userOrders.map(order => {
            const user = users.find(u => u.user_id === order.user_id);
            const items = orderItems[order.order_id] || [];
            
            return (
              <div key={order.order_id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">
                      Order #{order.order_id}
                    </h3>
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
                      <p className="text-sm text-orange-600">
                        Jatuh Tempo: {new Date(order.due_date).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">
                      Rp {parseFloat(order.total_amount).toLocaleString()}
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                {items.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Item Pesanan:</p>
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>{item.products?.name} x{item.quantity}</span>
                        <span>
                          Rp {(parseFloat(item.price) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
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