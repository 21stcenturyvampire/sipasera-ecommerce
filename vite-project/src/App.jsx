import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Users, CreditCard, FileText, LogOut, Menu, X, Plus, Edit2, Trash2, Check, XCircle, Search } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function SipaseraApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [creditLimits, setCreditLimits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data dari Supabase saat pertama kali load
  useEffect(() => {
    fetchProducts();
    fetchUsers();
    fetchCreditLimits();
  }, []);

  // Fetch products dari Supabase
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('product_id', { ascending: true });
    
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
  };

  // Fetch users dari Supabase
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('user_id', { ascending: true });
    
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
  };

  // Fetch credit limits dari Supabase
  const fetchCreditLimits = async () => {
    const { data, error } = await supabase
      .from('user_credit_limit')
      .select('*');
    
    if (error) {
      console.error('Error fetching credit limits:', error);
    } else {
      setCreditLimits(data || []);
    }
  };

  // Fetch orders dari Supabase
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    setLoading(false);
    
    if (error || !data) {
      return false;
    }
    
    setCurrentUser(data);
    setCurrentPage(data.role === 'admin' ? 'dashboard' : 'products');
    if (data.role !== 'admin') {
      fetchOrders();
    } else {
      fetchOrders();
    }
    return true;
  };

  const addToCart = (product) => {
    const existing = cart.find(c => c.product_id === product.product_id);
    if (existing) {
      setCart(cart.map(c => c.product_id === product.product_id ? {...c, quantity: c.quantity + 1} : c));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(c => c.product_id !== productId));
    } else {
      setCart(cart.map(c => c.product_id === productId ? {...c, quantity} : c));
    }
  };

  const handleCheckout = async (paymentMethod) => {
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
    
    if (paymentMethod === 'paylater') {
      if (!userCredit) {
        alert('Anda belum memiliki limit kredit!');
        return;
      }
      const availableCredit = userCredit.credit_limit - userCredit.used_credit;
      if (totalAmount > availableCredit) {
        alert('Limit kredit tidak mencukupi!');
        return;
      }
    }

    setLoading(true);

    // Insert order ke Supabase
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: currentUser.user_id,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        status: paymentMethod === 'cash' ? 'completed' : 'pending'
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      alert('Gagal membuat pesanan!');
      setLoading(false);
      return;
    }

    // Insert order items
    const orderItems = cart.map(item => ({
      order_id: orderData.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }));

    await supabase.from('order_items').insert(orderItems);

    // Update stock produk
    for (const item of cart) {
      const product = products.find(p => p.product_id === item.product_id);
      await supabase
        .from('products')
        .update({ stock: product.stock - item.quantity })
        .eq('product_id', item.product_id);
    }

    // Update credit jika paylater
    if (paymentMethod === 'paylater' && userCredit) {
      await supabase
        .from('user_credit_limit')
        .update({ used_credit: userCredit.used_credit + totalAmount })
        .eq('user_id', currentUser.user_id);
      
      fetchCreditLimits();
    }

    // Insert financial report
    await supabase.from('financial_report').insert([{
      report_type: 'income',
      description: `Order #${orderData.order_id} - ${currentUser.name}`,
      amount: totalAmount
    }]);

    setCart([]);
    fetchProducts();
    fetchOrders();
    setLoading(false);
    alert('Pesanan berhasil dibuat!');
    setCurrentPage('orders');
  };

  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} loading={loading} />;
  }

  const menuItems = currentUser?.role === 'admin' ? [
    { id: 'dashboard', icon: FileText, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Produk' },
    { id: 'orders', icon: ShoppingCart, label: 'Pesanan' }
  ] : [
    { id: 'products', icon: Package, label: 'Produk' },
    { id: 'cart', icon: ShoppingCart, label: 'Keranjang', badge: cart.length },
    { id: 'orders', icon: ShoppingCart, label: 'Pesanan Saya' }
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          {sidebarOpen && <h2 className="text-xl font-bold text-slate-800">SIPASERA</h2>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-4">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${currentPage === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}>
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
              {item.badge > 0 && sidebarOpen && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button onClick={() => { setCurrentUser(null); setCurrentPage('login'); setCart([]); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition">
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Keluar</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading...</p>
            </div>
          </div>
        )}
        {currentPage === 'dashboard' && <DashboardPage products={products} orders={orders} creditLimits={creditLimits} />}
        {currentPage === 'products' && <ProductsPage products={products} currentUser={currentUser} searchTerm={searchTerm} setSearchTerm={setSearchTerm} addToCart={addToCart} fetchProducts={fetchProducts} />}
        {currentPage === 'cart' && <CartPage cart={cart} updateCartQuantity={updateCartQuantity} creditLimits={creditLimits} currentUser={currentUser} handleCheckout={handleCheckout} />}
        {currentPage === 'orders' && <OrdersPage orders={orders} users={users} currentUser={currentUser} fetchOrders={fetchOrders} />}
      </div>
    </div>
  );
}

function LoginPage({ onLogin, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      alert('Email dan password harus diisi!');
      return;
    }
    const success = await onLogin(email, password);
    if (!success) {
      alert('Email atau password salah!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-3xl font-bold text-slate-800">SIPASERA</h1>
          <p className="text-slate-600 mt-2">Sistem Belanja Sembako</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSubmit()} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSubmit()} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400">
            {loading ? 'Loading...' : 'Masuk'}
          </button>
        </div>
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>Demo: admin@sipasera.com / admin</p>
          <p>Demo: warung1@example.com / user</p>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ products, orders, creditLimits }) {
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalCredit = creditLimits.reduce((sum, c) => sum + parseFloat(c.used_credit || 0), 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            </div>
            <ShoppingCart className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Total Pendapatan</p>
              <p className="text-2xl font-bold text-slate-800">Rp {totalRevenue.toLocaleString()}</p>
            </div>
            <FileText className="text-purple-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Kredit Terpakai</p>
              <p className="text-2xl font-bold text-slate-800">Rp {totalCredit.toLocaleString()}</p>
            </div>
            <CreditCard className="text-orange-600" size={32} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsPage({ products, currentUser, searchTerm, setSearchTerm, addToCart, fetchProducts }) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async (formData) => {
    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(formData)
        .eq('product_id', editingProduct.product_id);
      
      if (error) {
        alert('Gagal update produk!');
        console.error(error);
      } else {
        alert('Produk berhasil diupdate!');
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([formData]);
      
      if (error) {
        alert('Gagal menambah produk!');
        console.error(error);
      } else {
        alert('Produk berhasil ditambahkan!');
      }
    }
    
    fetchProducts();
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Hapus produk ini?')) return;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('product_id', productId);
    
    if (error) {
      alert('Gagal menghapus produk!');
      console.error(error);
    } else {
      alert('Produk berhasil dihapus!');
      fetchProducts();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Produk Sembako</h1>
        {currentUser?.role === 'admin' && (
          <button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Plus size={20} /> Tambah Produk
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input type="text" placeholder="Cari produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(product => (
          <div key={product.product_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
            <div className="text-6xl p-6 bg-slate-50 text-center">{product.image_url}</div>
            <div className="p-4">
              <h3 className="font-semibold text-lg text-slate-800 mb-1">{product.name}</h3>
              <p className="text-sm text-slate-600 mb-3">{product.description}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xl font-bold text-blue-600">Rp {parseFloat(product.price).toLocaleString()}</span>
                <span className="text-sm text-slate-500">Stok: {product.stock}</span>
              </div>
              {currentUser?.role === 'admin' ? (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(product); setShowModal(true); }} className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2">
                    <Edit2 size={16} /> Edit
                  </button>
                  <button onClick={() => handleDelete(product.product_id)} className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2">
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              ) : (
                <button onClick={() => addToCart(product)} disabled={product.stock === 0} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300">
                  {product.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && <ProductModal product={editingProduct} onSave={handleSave} onClose={() => { setShowModal(false); setEditingProduct(null); }} />}
    </div>
  );
}

function ProductModal({ product, onSave, onClose }) {
  const [formData, setFormData] = useState(product || { name: '', description: '', price: 0, stock: 0, image_url: '📦' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
        <div className="space-y-4">
          <input type="text" placeholder="Nama Produk" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
          <textarea placeholder="Deskripsi" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          <input type="number" placeholder="Harga" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" required />
          <input type="number" placeholder="Stok" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" required />
          <input type="text" placeholder="Emoji Icon" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          <div className="flex gap-2">
            <button onClick={() => onSave(formData)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Simpan</button>
            <button onClick={onClose} className="flex-1 bg-slate-200 py-2 rounded-lg hover:bg-slate-300">Batal</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ cart, updateCartQuantity, creditLimits, currentUser, handleCheckout }) {
  const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
  const availableCredit = userCredit ? parseFloat(userCredit.credit_limit) - parseFloat(userCredit.used_credit) : 0;

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
              <div key={item.product_id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                <div className="text-4xl">{item.image_url}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{item.name}</h3>
                  <p className="text-blue-600 font-semibold">Rp {parseFloat(item.price).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)} className="w-8 h-8 bg-slate-100 rounded-lg hover:bg-slate-200">-</button>
                  <span className="w-12 text-center font-semibold">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)} className="w-8 h-8 bg-slate-100 rounded-lg hover:bg-slate-200">+</button>
                </div>
                <button onClick={() => updateCartQuantity(item.product_id, 0)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg">
                  <Trash2 size={20} />
                </button>
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
              {userCredit && (
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
            <div className="space-y-2">
              <button onClick={() => handleCheckout('cash')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700">Bayar Tunai</button>
              <button onClick={() => handleCheckout('paylater')} disabled={!userCredit || total > availableCredit} className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-slate-300">Bayar Paylater</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersPage({ orders, users, currentUser, fetchOrders }) {
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

  const handleUpdateStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('order_id', orderId);
    
    if (error) {
      alert('Gagal update status!');
      console.error(error);
    } else {
      alert('Status berhasil diupdate!');
      fetchOrders();
    }
  };

  const userOrders = currentUser?.role === 'admin' ? orders : orders.filter(o => o.user_id === currentUser.user_id);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{currentUser?.role === 'admin' ? 'Semua Pesanan' : 'Pesanan Saya'}</h1>
      
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
                    <h3 className="font-semibold text-lg text-slate-800">Order #{order.order_id}</h3>
                    {currentUser?.role === 'admin' && <p className="text-slate-600">{user?.name}</p>}
                    <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">Rp {parseFloat(order.total_amount).toLocaleString()}</p>
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
                        <span>Rp {(parseFloat(item.price) * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {currentUser?.role === 'admin' && order.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleUpdateStatus(order.order_id, 'approved')} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                      <Check size={16} /> Setujui
                    </button>
                    <button onClick={() => handleUpdateStatus(order.order_id, 'rejected')} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                      <XCircle size={16} /> Tolak
                    </button>
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