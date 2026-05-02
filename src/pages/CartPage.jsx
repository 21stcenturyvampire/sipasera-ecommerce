import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Tag, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

async function fetchCartRecommendations(cartProductIds, allProducts, limit = 4) {
  if (!cartProductIds || cartProductIds.length === 0) return [];

  const { data: relatedItems } = await supabase
    .from('order_items')
    .select('order_id, product_id')
    .in('product_id', cartProductIds);

  if (!relatedItems || relatedItems.length === 0) return [];

  const relatedOrderIds = [...new Set(relatedItems.map(i => i.order_id))];

  const { data: coItems } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .in('order_id', relatedOrderIds)
    .not('product_id', 'in', `(${cartProductIds.join(',')})`);

  if (!coItems || coItems.length === 0) return [];

  const freqMap = {};
  coItems.forEach(({ product_id, quantity }) => {
    freqMap[product_id] = (freqMap[product_id] || 0) + quantity;
  });

  return Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => allProducts.find(p => p.product_id === parseInt(id)))
    .filter(p => p && p.stock > 0)
    .slice(0, limit);
}

export function CartPage({ cart, updateCartQuantity, creditLimits, currentUser, handleCheckout, products, addToCart }) {
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [recommendations, setRecommendations] = useState([]);
  const [discountRules, setDiscountRules] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [nextDiscount, setNextDiscount] = useState(null);

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
  const availableCredit = userCredit
    ? parseFloat(userCredit.credit_limit) - parseFloat(userCredit.used_credit)
    : 0;

  const discountAmount = appliedDiscount ? parseFloat(appliedDiscount.discount_amount) : 0;
  const finalTotal = Math.max(subtotal - discountAmount, 0);

  useEffect(() => {
    const fetchDiscountRules = async () => {
      const { data } = await supabase
        .from('discount_rules')
        .select('*')
        .eq('is_active', true)
        .order('min_amount', { ascending: true });
      if (data) setDiscountRules(data);
    };
    fetchDiscountRules();
  }, []);

  useEffect(() => {
    if (discountRules.length === 0) return;
    const applicable = discountRules
      .filter(r => subtotal >= parseFloat(r.min_amount))
      .sort((a, b) => b.discount_amount - a.discount_amount);
    setAppliedDiscount(applicable[0] || null);
    const next = discountRules.find(r => subtotal < parseFloat(r.min_amount));
    setNextDiscount(next || null);
  }, [subtotal, discountRules]);

  useEffect(() => {
    if (cart.length === 0 || !products || products.length === 0) {
      setRecommendations([]);
      return;
    }
    const cartProductIds = cart.map(c => c.product_id);
    fetchCartRecommendations(cartProductIds, products).then(setRecommendations);
  }, [cart, products]);

  const onCheckout = () => {
    // discountAmount dikirim ke App.jsx → handleCheckout → dicatat ke DB sebagai finalTotal
    handleCheckout(paymentMethod, discountAmount);
  };

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

          {/* ── KIRI ── */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map(item => (
              <div key={item.product_id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{item.name}</h3>
                  {item.category && <p className="text-xs text-slate-500 mb-1">{item.category}</p>}
                  <p className="text-blue-600 font-semibold">Rp {parseFloat(item.price).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)} className="w-8 h-8 bg-slate-100 rounded-lg hover:bg-slate-200 font-bold">-</button>
                  <span className="w-12 text-center font-semibold">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)} className="w-8 h-8 bg-slate-100 rounded-lg hover:bg-slate-200 font-bold">+</button>
                </div>
                <div className="text-right">
                  <p className="text-slate-700 font-medium text-sm mb-2">
                    Rp {(parseFloat(item.price) * item.quantity).toLocaleString()}
                  </p>
                  <button onClick={() => updateCartQuantity(item.product_id, 0)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {/* Rekomendasi Keranjang */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5 border border-purple-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                    <Sparkles size={12} /> Sering Dibeli Bersama
                  </span>
                  <span className="text-xs text-slate-400">Produk yang cocok ditambahkan</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {recommendations.map(product => (
                    <div key={product.product_id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-purple-300 hover:shadow-sm transition-all group">
                      <div className="w-full h-20 bg-slate-50 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2 mb-1 leading-tight">{product.name}</p>
                        <p className="text-blue-600 font-bold text-xs mb-2">Rp {parseFloat(product.price).toLocaleString()}</p>
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full text-xs bg-purple-600 text-white py-1.5 rounded-lg hover:bg-purple-700 transition font-medium"
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── KANAN ── */}
          <div className="space-y-4">
            {/* Banner Diskon */}
            {discountRules.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-orange-200 bg-white shadow-sm">
                {appliedDiscount && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-white flex items-center gap-2">
                    <Tag size={16} className="flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold">🎉 Diskon berlaku!</p>
                      <p className="text-sm font-semibold">Hemat Rp {discountAmount.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {nextDiscount && (
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Tag size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-orange-700">
                          Tambah Rp {(parseFloat(nextDiscount.min_amount) - subtotal).toLocaleString()} lagi
                        </p>
                        <p className="text-xs text-orange-500 mb-2">
                          → dapat diskon Rp {parseFloat(nextDiscount.discount_amount).toLocaleString()}
                        </p>
                        <div className="w-full bg-orange-100 rounded-full h-1.5">
                          <div
                            className="bg-orange-400 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((subtotal / parseFloat(nextDiscount.min_amount)) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-orange-400 mt-1">
                          <span>Rp {subtotal.toLocaleString()}</span>
                          <span>Rp {parseFloat(nextDiscount.min_amount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!nextDiscount && !appliedDiscount && (
                  <div className="px-4 py-3 flex items-center gap-2">
                    <Tag size={14} className="text-orange-400" />
                    <p className="text-xs text-orange-600">
                      Belanja min Rp {parseFloat(discountRules[0]?.min_amount || 0).toLocaleString()} untuk dapat diskon
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ringkasan */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">Rp {subtotal.toLocaleString()}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1 text-sm"><Tag size={13} /> Diskon</span>
                    <span className="font-semibold">- Rp {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span className="text-slate-800">Total Bayar</span>
                  <span className="text-blue-600">Rp {finalTotal.toLocaleString()}</span>
                </div>
                {userCredit && paymentMethod === 'paylater' && (
                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Limit Kredit</span>
                      <span>Rp {parseFloat(userCredit.credit_limit).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cod">COD (Cash On Delivery)</option>
                  <option value="paylater">Paylater (30 hari)</option>
                </select>
              </div>

              <button
                onClick={onCheckout}
                disabled={paymentMethod === 'paylater' && (!userCredit || finalTotal > availableCredit)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 transition"
              >
                Checkout — Rp {finalTotal.toLocaleString()}
              </button>

              {appliedDiscount && (
                <p className="text-center text-xs text-green-600 mt-2 font-medium">
                  🎉 Kamu hemat Rp {discountAmount.toLocaleString()}!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}