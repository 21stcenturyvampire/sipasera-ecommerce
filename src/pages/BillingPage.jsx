import React, { useState, useEffect } from 'react';
import { DollarSign, ChevronDown, ChevronUp, Check, Search, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function BillingPage({ orders, currentUser, creditLimits, fetchOrders, fetchCreditLimits, showFlash }) {
  const [payments, setPayments] = useState({});
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lunasiFull, setLunasiFull] = useState(false);

  const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
  
  const allUserOrders = orders.filter(o => o.user_id === currentUser.user_id && o.payment_method === 'paylater');
  
  const activeOrders = allUserOrders.filter(o => {
    try {
      const orderPayments = payments[o.order_id] || [];
      const paid = orderPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const remaining = Math.max(parseFloat(o.total_amount) - paid, 0);
      return remaining > 0;
    } catch (error) {
      return true;
    }
  });

  const paidOrders = allUserOrders.filter(o => {
    try {
      const orderPayments = payments[o.order_id] || [];
      const paid = orderPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const remaining = Math.max(parseFloat(o.total_amount) - paid, 0);
      return remaining <= 0;
    } catch (error) {
      return false;
    }
  });

  const filteredActiveOrders = activeOrders.filter(order => {
    if (!searchQuery) return true;
    return (
      order.order_id.toString().includes(searchQuery) ||
      new Date(order.created_at).toLocaleDateString('id-ID').includes(searchQuery) ||
      new Date(order.due_date).toLocaleDateString('id-ID').includes(searchQuery) ||
      parseFloat(order.total_amount).toLocaleString().includes(searchQuery)
    );
  });

  const filteredPaidOrders = paidOrders.filter(order => {
    if (!searchQuery) return true;
    return (
      order.order_id.toString().includes(searchQuery) ||
      new Date(order.created_at).toLocaleDateString('id-ID').includes(searchQuery) ||
      new Date(order.due_date).toLocaleDateString('id-ID').includes(searchQuery) ||
      parseFloat(order.total_amount).toLocaleString().includes(searchQuery)
    );
  });

  useEffect(() => {
    fetchAllPayments();
  }, [orders, currentUser.user_id]);

  useEffect(() => {
    if (selectedOrder) {
      if (lunasiFull) {
        const remaining = getRemainingAmount(selectedOrder);
        setPaymentAmount(remaining.toString());
      } else {
        setPaymentAmount('');
      }
    }
  }, [lunasiFull]);

  const fetchAllPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', currentUser.user_id);
      
      if (error) throw error;
      
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

  const handlePayment = async () => {
    if (!selectedOrder) {
      showFlash('Order tidak ditemukan!', 'error');
      return;
    }

    let finalAmount = 0;
    
    if (lunasiFull) {
      finalAmount = getRemainingAmount(selectedOrder);
    } else {
      finalAmount = parseFloat(paymentAmount);
    }

    if (!finalAmount || finalAmount <= 0) {
      showFlash('Jumlah pembayaran tidak valid!', 'error');
      return;
    }

    const remaining = getRemainingAmount(selectedOrder);
    if (finalAmount > remaining) {
      showFlash('Jumlah pembayaran melebihi tagihan!', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const methodValue = String(paymentMethod).trim().toLowerCase();
      const amountValue = Number(finalAmount);
      
      const paymentData = {
        user_id: currentUser.user_id,
        order_id: selectedOrder.order_id,
        amount: amountValue,
        method: methodValue,
        note: `Pembayaran Order #${selectedOrder.order_id}`
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData]);

      if (paymentError) {
        throw new Error(`Gagal insert payment: ${paymentError.message}`);
      }

      const { data: allPayments, error: fetchError } = await supabase
        .from('payments')
        .select('amount')
        .eq('order_id', selectedOrder.order_id);
      
      if (fetchError) {
        throw new Error(`Gagal fetch payments: ${fetchError.message}`);
      }

      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const newRemaining = parseFloat(selectedOrder.total_amount) - totalPaid;

      if (newRemaining <= 0) {
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('order_id', selectedOrder.order_id);
        
        if (updateOrderError) {
          console.log('Warning: Order status update failed, but payment was successful');
        }
      }

      if (userCredit) {
        const newUsedCredit = Math.max(0, parseFloat(userCredit.used_credit) - amountValue);

        const { error: creditError } = await supabase
          .from('user_credit_limit')
          .update({
            used_credit: newUsedCredit
          })
          .eq('user_id', currentUser.user_id);
        
        if (creditError) {
          console.log('Warning: Credit limit update failed, but payment was successful');
        }
      }

      const { error: reportError } = await supabase
        .from('financial_report')
        .insert([{
          report_type: 'income',
          description: `Pembayaran Order #${selectedOrder.order_id} - ${currentUser.name}`,
          amount: amountValue
        }]);
      
      if (reportError) {
        console.log('Warning: Financial report insertion failed, but payment was successful');
      }

      await fetchAllPayments();
      await fetchOrders();
      await fetchCreditLimits();

      showFlash('Pembayaran berhasil!', 'success');
      setSelectedOrder(null);
      setPaymentAmount('');
      setPaymentMethod('transfer');
      setLunasiFull(false);
    } catch (error) {
      showFlash(`Terjadi kesalahan: ${error.message}`, 'error');
      console.error('Payment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
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

  const getTotalPaid = (order) => {
    const orderPayments = payments[order.order_id] || [];
    return orderPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  };

  const renderOrderCard = (order, isPaid = false) => {
    const daysRemaining = getDaysRemaining(order.due_date);
    const isOverdue = daysRemaining < 0;
    const remaining = getRemainingAmount(order);
    const totalPaid = getTotalPaid(order);
    const isExpanded = expandedOrder === order.order_id;

    return (
      <div 
        key={order.order_id} 
        className={`border-2 rounded-lg p-4 ${
          isPaid 
            ? 'border-green-300 bg-green-50'
            : isOverdue ? 'border-red-300 bg-red-50' : 
            daysRemaining <= 7 ? 'border-yellow-300 bg-yellow-50' : 
            'border-slate-200'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">Order #{order.order_id}</h3>
              {isPaid && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">
                  <Check size={14} />
                  LUNAS
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600">
              Tanggal: {new Date(order.created_at).toLocaleDateString('id-ID')}
            </p>
            <p className="text-sm text-slate-600">
              Jatuh Tempo: {new Date(order.due_date).toLocaleDateString('id-ID')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              Rp {parseFloat(order.total_amount).toLocaleString()}
            </p>
            {!isPaid && (
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                isOverdue ? 'bg-red-100 text-red-700' : 
                daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {isOverdue ? `Terlambat ${Math.abs(daysRemaining)} hari` : `${daysRemaining} hari lagi`}
              </span>
            )}
          </div>
        </div>

        <div className="mb-3 space-y-1 text-sm">
          <p className="text-slate-600">
            Total Tagihan: Rp {parseFloat(order.total_amount).toLocaleString()}
          </p>
          <p className="text-slate-600">
            Sudah Dibayar: Rp {totalPaid.toLocaleString()}
          </p>
          {!isPaid && (
            <p className="text-red-600 font-medium">
              Sisa Hutang: Rp {remaining.toLocaleString()}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {isPaid && (
            <>
              <button 
                onClick={() => setExpandedOrder(isExpanded ? null : order.order_id)}
                className="w-full py-2 rounded-lg bg-green-500 text-white font-medium flex items-center justify-between px-4"
              >
                <span className="flex items-center gap-2">
                  <Check size={20} />
                  Sudah Lunas
                </span>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isExpanded && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                  <h4 className="font-semibold text-sm mb-2">Detail Pembayaran:</h4>
                  <div className="space-y-2">
                    {(payments[order.order_id] || []).map((payment, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {payment.method ? payment.method.charAt(0).toUpperCase() + payment.method.slice(1) : 'Pembayaran'} #{idx + 1}
                        </span>
                        <span className="font-medium text-green-600">
                          Rp {parseFloat(payment.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!isPaid && (
            <button 
              onClick={() => {
                setSelectedOrder(order);
                setPaymentAmount('');
                setLunasiFull(false);
              }}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
            >
              Bayar Sekarang
            </button>
          )}
        </div>
      </div>
    );
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

      <div className="mb-6 relative">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor order, tanggal, atau nominal..."
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
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Invoice Aktif</h2>
        {searchQuery && (
          <p className="text-sm text-slate-500 mb-4">
            Ditemukan {filteredActiveOrders.length} invoice aktif
          </p>
        )}
        <div className="space-y-4">
          {filteredActiveOrders.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={64} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">
                {searchQuery ? 'Tidak ada invoice yang cocok dengan pencarian' : 'Tidak ada tagihan paylater'}
              </p>
            </div>
          ) : (
            filteredActiveOrders.map(order => renderOrderCard(order, false))
          )}
        </div>
      </div>

      {paidOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between py-3 px-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition"
          >
            <span className="font-semibold text-green-700 flex items-center gap-2">
              <Check size={20} className="text-green-600" />
              Riwayat Pembayaran ({filteredPaidOrders.length})
            </span>
            {showHistory ? <ChevronUp size={20} className="text-green-600" /> : <ChevronDown size={20} className="text-green-600" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-4">
              {filteredPaidOrders.length === 0 ? (
                <p className="text-center text-slate-600 py-8">
                  {searchQuery ? 'Tidak ada riwayat yang cocok dengan pencarian' : 'Tidak ada riwayat pembayaran'}
                </p>
              ) : (
                filteredPaidOrders.map(order => renderOrderCard(order, true))
              )}
            </div>
          )}
        </div>
      )}

      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-slate-800">Bayar Tagihan</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-600 mb-2">Order #{selectedOrder.order_id}</p>
              <p className="text-3xl font-bold text-blue-600 mb-2">
                Rp {getRemainingAmount(selectedOrder).toLocaleString()}
              </p>
              <div className="space-y-1 text-sm text-slate-600">
                <p>Total Tagihan: Rp {parseFloat(selectedOrder.total_amount).toLocaleString()}</p>
                <p>Sudah Dibayar: Rp {getTotalPaid(selectedOrder).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Metode Pembayaran
                </label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="e-wallet">E-Wallet</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition"
                onClick={() => setLunasiFull(!lunasiFull)}
              >
                <input
                  type="checkbox"
                  id="lunasiFull"
                  checked={lunasiFull}
                  onChange={(e) => setLunasiFull(e.target.checked)}
                  disabled={isLoading}
                  className="w-5 h-5 text-green-600 rounded cursor-pointer"
                />
                <label htmlFor="lunasiFull" className="flex-1 cursor-pointer">
                  <p className="font-medium text-slate-800">Lunasi Hutang</p>
                  <p className="text-sm text-slate-600">
                    Rp {getRemainingAmount(selectedOrder).toLocaleString()}
                  </p>
                </label>
              </div>

              {!lunasiFull ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Jumlah Bayar (Rp)
                  </label>
                  <input 
                    type="number" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(e.target.value)} 
                    placeholder="Masukkan jumlah pembayaran"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    disabled={isLoading}
                    autoFocus
                  />
                  {paymentAmount && parseFloat(paymentAmount) > getRemainingAmount(selectedOrder) && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <span>⚠️</span> Nominal pembayaran melebihi sisa tagihan!
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Jumlah Pembayaran</p>
                  <div className="w-full px-4 py-3 border border-green-300 bg-green-100 rounded-lg text-slate-800 font-bold text-lg">
                    Rp {getRemainingAmount(selectedOrder).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handlePayment}
                disabled={
                  (lunasiFull === false && (!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > getRemainingAmount(selectedOrder))) || 
                  isLoading
                }
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium transition"
              >
                {isLoading ? 'Memproses...' : 'Bayar'}
              </button>
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                  setPaymentAmount('');
                  setPaymentMethod('transfer');
                  setLunasiFull(false);
                }}
                disabled={isLoading}
                className="flex-1 bg-slate-200 text-slate-800 py-2 px-4 rounded-lg hover:bg-slate-300 disabled:bg-slate-300 font-medium transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}