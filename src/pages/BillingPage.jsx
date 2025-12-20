import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function BillingPage({ orders, currentUser, creditLimits, fetchOrders, fetchCreditLimits, showFlash }) {
  const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
  const paylaterOrders = orders.filter(
    o => o.user_id === currentUser.user_id && 
    o.payment_method === 'paylater' && 
    o.status !== 'paid'
  );
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handlePayment = async () => {
    if (!selectedOrder || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      showFlash('Jumlah pembayaran tidak valid!', 'error');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const remaining = getRemainingAmount(selectedOrder);

    if (amount > remaining) {
      showFlash('Jumlah pembayaran melebihi tagihan!', 'error');
      return;
    }

    await supabase.from('payments').insert([{
      user_id: currentUser.user_id,
      order_id: selectedOrder.order_id,
      amount: amount,
      method: paymentMethod,
      note: `Pembayaran Order #${selectedOrder.order_id}`
    }]);

    const { data: paid } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', selectedOrder.order_id);
    
    const totalPaid = paid.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    if (totalPaid >= parseFloat(selectedOrder.total_amount)) {
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('order_id', selectedOrder.order_id);
    }

    if (userCredit) {
      await supabase.from('user_credit_limit').update({
        used_credit: Math.max(0, parseFloat(userCredit.used_credit) - amount)
      }).eq('user_id', currentUser.user_id);
    }

    await supabase.from('financial_report').insert([{
      report_type: 'income',
      description: `Pembayaran Order #${selectedOrder.order_id} - ${currentUser.name}`,
      amount: amount
    }]);

    fetchOrders();
    fetchCreditLimits();
    showFlash('Pembayaran berhasil!', 'success');
    setSelectedOrder(null);
    setPaymentAmount('');
    setPaymentMethod('transfer');
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getRemainingAmount = (order) => {
    const paid = order.payments
      ? order.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      : 0;
    return Math.max(Number(order.total_amount) - paid, 0);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Penagihan Paylater</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 text-sm font-medium">Total Tagihan</p>
          <p className="text-3xl font-bold text-red-800 mt-2">
            Rp {userCredit ? parseFloat(userCredit.used_credit).toLocaleString() : '0'}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <p className="text-blue-700 text-sm font-medium">Limit Tersedia</p>
          <p className="text-3xl font-bold text-blue-800 mt-2">
            Rp {userCredit ? (parseFloat(userCredit.credit_limit) - parseFloat(userCredit.used_credit)).toLocaleString() : '0'}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <p className="text-purple-700 text-sm font-medium">Total Limit</p>
          <p className="text-3xl font-bold text-purple-800 mt-2">
            Rp {userCredit ? parseFloat(userCredit.credit_limit).toLocaleString() : '0'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Daftar Tagihan</h2>
        <div className="space-y-4">
          {paylaterOrders.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={64} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">Tidak ada tagihan paylater</p>
            </div>
          ) : (
            paylaterOrders.map(order => {
              const daysRemaining = getDaysRemaining(order.due_date);
              const isOverdue = daysRemaining < 0;
              const remaining = getRemainingAmount(order);
              const isPaid = remaining <= 0 || order.status === 'paid';
              
              return (
                <div 
                  key={order.order_id} 
                  className={`border-2 rounded-lg p-4 ${
                    isOverdue ? 'border-red-300 bg-red-50' : 
                    daysRemaining <= 7 ? 'border-yellow-300 bg-yellow-50' : 
                    'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">Order #{order.order_id}</h3>
                      <p className="text-sm text-slate-600">
                        Tanggal: {new Date(order.created_at).toLocaleDateString('id-ID')}
                      </p>
                      <p className="text-sm text-slate-600">
                        Jatuh Tempo: {new Date(order.due_date).toLocaleDateString('id-ID')}
                      </p>
                      <p className={`text-sm font-medium ${isPaid ? 'text-green-700' : 'text-red-600'}`}>
                        {isPaid
                          ? 'LUNAS'
                          : `Sisa Hutang: Rp ${Math.max(remaining, 0).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        Rp {parseFloat(order.total_amount).toLocaleString()}
                      </p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                        isOverdue ? 'bg-red-100 text-red-700' : 
                        daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {isOverdue ? `Terlambat ${Math.abs(daysRemaining)} hari` : `${daysRemaining} hari lagi`}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => !isPaid && setSelectedOrder(order)}
                    disabled={isPaid}
                    className={`w-full py-2 rounded-lg text-white ${
                      isPaid
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isPaid ? 'Sudah Lunas' : 'Bayar Sekarang'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
          onClick={() => {
            setSelectedOrder(null);
            setPaymentMethod('transfer');
          }}
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Bayar Tagihan</h2>
            <div className="mb-4">
              <p className="text-sm text-slate-600">Order #{selectedOrder.order_id}</p>
              <p className="text-2xl font-bold text-blue-600">
                Rp {getRemainingAmount(selectedOrder).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">
                Total Tagihan: Rp {parseFloat(selectedOrder.total_amount).toLocaleString()}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Metode Pembayaran
                </label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)} 
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="e-wallet">E-Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Jumlah Bayar (Rp)
                </label>
                <input 
                  type="number" 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)} 
                  placeholder={getRemainingAmount(selectedOrder).toLocaleString()} 
                  className="w-full px-4 py-2 border rounded-lg" 
                />
                {paymentAmount && parseFloat(paymentAmount) > getRemainingAmount(selectedOrder) && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span> Nominal pembayaran melebihi sisa tagihan!
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > getRemainingAmount(selectedOrder)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  Bayar
                </button>
                <button 
                  onClick={() => {
                    setSelectedOrder(null);
                    setPaymentMethod('transfer');
                  }} 
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