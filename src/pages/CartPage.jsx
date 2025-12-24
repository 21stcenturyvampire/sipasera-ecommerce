import React, { useState } from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';

export function CartPage({ cart, updateCartQuantity, creditLimits, currentUser, handleCheckout }) {
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
  const availableCredit = userCredit 
    ? parseFloat(userCredit.credit_limit) - parseFloat(userCredit.used_credit) 
    : 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Keranjang Belanja</h1>
      
      {cart.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ShoppingCart size={64} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">Keranjang belanja Anda kosong</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {cart.map(item => (
              <div 
                key={item.product_id} 
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{item.name}</h3>
                  {item.category && (
                    <p className="text-xs text-slate-500 mb-1">{item.category}</p>
                  )}
                  <p className="text-blue-600 font-semibold">
                    Rp {parseFloat(item.price).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)} 
                    className="w-8 h-8 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">{item.quantity}</span>
                  <button 
                    onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)} 
                    className="w-8 h-8 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-slate-600 text-sm mb-2">
                    Rp {(parseFloat(item.price) * item.quantity).toLocaleString()}
                  </p>
                  <button 
                    onClick={() => updateCartQuantity(item.product_id, 0)} 
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Ringkasan Pesanan</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">Rp {total.toLocaleString()}</span>
              </div>
              {userCredit && paymentMethod === 'paylater' && (
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Limit Kredit</span>
                    <span>Rp {parseFloat(userCredit.credit_limit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Terpakai</span>
                    <span>Rp {parseFloat(userCredit.used_credit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-green-600">
                    <span>Tersedia</span>
                    <span>Rp {availableCredit.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Metode Pembayaran
              </label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="transfer">Transfer Bank</option>
                <option value="cod">COD (Cash On Delivery)</option>
                <option value="paylater">Paylater (30 hari)</option>
              </select>
            </div>

            <button 
              onClick={() => handleCheckout(paymentMethod)} 
              disabled={paymentMethod === 'paylater' && (!userCredit || total > availableCredit)} 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}