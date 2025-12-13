import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Users, CreditCard, FileText, LogOut, Menu, X, Plus, Edit2, Trash2, Check, XCircle, Search, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function SipaseraApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [creditLimits, setCreditLimits] = useState([]);
  const [financialReports, setFinancialReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchUsers();
    fetchCreditLimits();
  }, []);

  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setFlashMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  const showFlash = (message, type = 'success') => {
    setFlashMessage({ message, type });
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('product_id', { ascending: true });
    if (!error) setProducts(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('user_id', { ascending: true });
    if (!error) setUsers(data || []);
  };

  const fetchCreditLimits = async () => {
    const { data, error } = await supabase.from('user_credit_limit').select('*');
    if (!error) setCreditLimits(data || []);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!error) setOrders(data || []);
  };

  const fetchFinancialReports = async () => {
    const { data, error } = await supabase.from('financial_report').select('*').order('created_at', { ascending: false });
    if (!error) setFinancialReports(data || []);
  };

  const handleRegister = async (formData) => {
    setLoading(true);
    
    const { data: existingUser } = await supabase.from('users').select('email').eq('email', formData.email).single();
    
    if (existingUser) {
      setLoading(false);
      return { success: false, message: 'Email sudah terdaftar!' };
    }

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([{
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'user',
        phone: formData.phone,
        address: formData.address
      }])
      .select()
      .single();

    if (userError) {
      setLoading(false);
      return { success: false, message: 'Gagal registrasi!' };
    }

    await supabase.from('user_credit_limit').insert([{
      user_id: newUser.user_id,
      credit_limit: 1,
      used_credit: 0,
      status: 'active'
    }]);

    setLoading(false);
    return { success: true, message: 'Registrasi berhasil! Silakan login.' };
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
    
    setLoading(false);
    
    if (error || !data) {
      return false;
    }
    
    setCurrentUser(data);
    setCurrentPage(data.role === 'admin' ? 'dashboard' : 'products');
    fetchOrders();
    if (data.role === 'admin') {
      fetchFinancialReports();
    }
    showFlash(`Selamat datang, ${data.name}!`, 'success');
    return true;
  };

  const addToCart = (product) => {
    const existing = cart.find(c => c.product_id === product.product_id);
    if (existing) {
      setCart(cart.map(c => c.product_id === product.product_id ? {...c, quantity: c.quantity + 1} : c));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showFlash(`${product.name} ditambahkan ke keranjang`, 'success');
  };

  const removeFromCart = (productName) => {
    showFlash(`${productName} dihapus dari keranjang`, 'info');
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      const product = cart.find(c => c.product_id === productId);
      if (product) removeFromCart(product.name);
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
        showFlash('Anda belum memiliki limit kredit!', 'error');
        return;
      }
      const availableCredit = userCredit.credit_limit - userCredit.used_credit;
      if (totalAmount > availableCredit) {
        showFlash('Limit kredit tidak mencukupi!', 'error');
        return;
      }
    }

    setLoading(true);

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
      showFlash('Gagal membuat pesanan!', 'error');
      setLoading(false);
      return;
    }

    const orderItems = cart.map(item => ({
      order_id: orderData.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }));

    await supabase.from('order_items').insert(orderItems);

    for (const item of cart) {
      const product = products.find(p => p.product_id === item.product_id);
      await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('product_id', item.product_id);
    }

    if (paymentMethod === 'paylater' && userCredit) {
      await supabase.from('user_credit_limit').update({ used_credit: userCredit.used_credit + totalAmount }).eq('user_id', currentUser.user_id);
      fetchCreditLimits();
    }

    await supabase.from('financial_report').insert([{
      report_type: 'income',
      description: `Order #${orderData.order_id} - ${currentUser.name}`,
      amount: totalAmount
    }]);

    setCart([]);
    fetchProducts();
    fetchOrders();
    setLoading(false);
    showFlash(`Pesanan berhasil dibuat! Total: Rp ${totalAmount.toLocaleString()}`, 'success');
    setCurrentPage('orders');
  };

  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} onRegister={() => setCurrentPage('register')} loading={loading} />;
  }

  if (currentPage === 'register') {
    return <RegisterPage onRegister={handleRegister} onBack={() => setCurrentPage('login')} loading={loading} />;
  }

  const menuItems = currentUser?.role === 'admin' ? [
    { id: 'dashboard', icon: FileText, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Produk' },
    { id: 'orders', icon: ShoppingCart, label: 'Pesanan' },
    { id: 'reports', icon: TrendingUp, label: 'Laporan Keuangan' }
  ] : [
    { id: 'products', icon: Package, label: 'Produk' },
    { id: 'cart', icon: ShoppingCart, label: 'Keranjang', badge: cart.length },
    { id: 'orders', icon: ShoppingCart, label: 'Pesanan Saya' }
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {flashMessage && <FlashMessage message={flashMessage.message} type={flashMessage.type} onClose={() => setFlashMessage(null)} />}
      
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
          <button onClick={() => { setCurrentUser(null); setCurrentPage('login'); setCart([]); showFlash('Berhasil logout', 'info'); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition">
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Keluar</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <LoadingOverlay />}
        {currentPage === 'dashboard' && <DashboardPage products={products} orders={orders} creditLimits={creditLimits} />}
        {currentPage === 'products' && <ProductsPage products={products} currentUser={currentUser} searchTerm={searchTerm} setSearchTerm={setSearchTerm} addToCart={addToCart} fetchProducts={fetchProducts} showFlash={showFlash} />}
        {currentPage === 'cart' && <CartPage cart={cart} updateCartQuantity={updateCartQuantity} creditLimits={creditLimits} currentUser={currentUser} handleCheckout={handleCheckout} />}
        {currentPage === 'orders' && <OrdersPage orders={orders} users={users} currentUser={currentUser} fetchOrders={fetchOrders} showFlash={showFlash} />}
        {currentPage === 'reports' && <FinancialReportsPage reports={financialReports} orders={orders} fetchReports={fetchFinancialReports} />}
      </div>
    </div>
  );
}

function FlashMessage({ message, type, onClose }) {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md`}>
        {type === 'success' && <Check size={20} />}
        {type === 'error' && <XCircle size={20} />}
        {type === 'info' && <AlertCircle size={20} />}
        <span className="flex-1">{message}</span>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, onRegister, loading }) {
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
          <button onClick={onRegister} className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200">
            Daftar Akun Baru
          </button>
        </div>
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>Demo: admin@sipasera.com / admin</p>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ onRegister, onBack, loading }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', address: '' });

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      alert('Nama, email, dan password harus diisi!');
      return;
    }
    
    const result = await onRegister(formData);
    if (result.success) {
      alert(result.message);
      onBack();
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-3xl font-bold text-slate-800">Daftar Akun</h1>
          <p className="text-slate-600 mt-2">Buat akun SIPASERA Anda</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Lengkap *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nama Warung/Toko" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nomor Telepon</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="08xxxxxxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Alamat</label>
            <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Alamat lengkap" rows="2" />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p>✨ Setelah registrasi, Anda akan mendapatkan limit kredit Rp 1 yang dapat ditingkatkan dengan pengajuan ke admin.</p>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400">
            {loading ? 'Loading...' : 'Daftar Sekarang'}
          </button>
          <button onClick={onBack} className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200">
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ products, orders, creditLimits }) {
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalCredit = creditLimits.reduce((sum, c) => sum + parseFloat(c.used_credit || 0), 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <p className="text-xs text-slate-500 mt-1">Selesai: {completedOrders} | Pending: {pendingOrders}</p>
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
            <TrendingUp className="text-purple-600" size={32} />
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

function FinancialReportsPage({ reports, orders, fetchReports }) {
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    if (filter !== 'all' && r.report_type !== filter) return false;
    if (startDate && new Date(r.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(r.created_at) > new Date(endDate)) return false;
    return true;
  });

  const totalIncome = filteredReports.filter(r => r.report_type === 'income').reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const totalExpense = filteredReports.filter(r => r.report_type === 'expense').reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Laporan Keuangan</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-medium">Total Pemasukan</p>
              <p className="text-2xl font-bold text-green-800 mt-1">Rp {totalIncome.toLocaleString()}</p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 text-sm font-medium">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-red-800 mt-1">Rp {totalExpense.toLocaleString()}</p>
            </div>
            <TrendingDown className="text-red-600" size={32} />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-medium">Laba Bersih</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">Rp {netProfit.toLocaleString()}</p>
            </div>
            <DollarSign className="text-blue-600" size={32} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Filter Laporan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipe</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
              <option value="all">Semua</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Dari Tanggal</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sampai Tanggal</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReports.map(report => (
                <tr key={report.report_id}>
                  <td className="px-6 py-4 text-sm text-slate-600">{new Date(report.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${report.report_type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

function ProductsPage({ products, currentUser, searchTerm, setSearchTerm, addToCart, fetchProducts, showFlash }) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async (formData) => {
    if (editingProduct) {
      const { error } = await supabase.from('products').update(formData).eq('product_id', editingProduct.product_id);
      if (error) {
        showFlash('Gagal update produk!', 'error');
      } else {
        showFlash('Produk berhasil diupdate!', 'success');
      }
    } else {
      const { error } = await supabase.from('products').insert([formData]);
      if (error) {
        showFlash('Gagal menambah produk!', 'error');
      } else {
        showFlash('Produk berhasil ditambahkan!', 'success');
      }
    }
    
    fetchProducts();
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Hapus produk "${productName}"?`)) return;
    
    const { error } = await supabase.from('products').delete().eq('product_id', productId);
    
    if (error) {
      showFlash('Gagal menghapus produk!', 'error');
    } else {
      showFlash(`Produk "${productName}" berhasil dihapus!`, 'success');
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
                  <button onClick={() => handleDelete(product.product_id, product.name)} className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2">
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
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Produk *</label>
            <input type="text" placeholder="Contoh: Beras Premium 5kg" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi</label>
            <textarea placeholder="Deskripsi produk" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows="2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Harga (Rp) *</label>
            <input type="number" placeholder="75000" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Stok *</label>
            <input type="number" placeholder="100" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Emoji Icon</label>
            <input type="text" placeholder="🌾" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="flex gap-2 pt-2">
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

function OrdersPage({ orders, users, currentUser, fetchOrders, showFlash }) {
  const [orderItems, setOrderItems] = useState({});

  useEffect(() => {
    fetchAllOrderItems();
  }, [orders]);

  const fetchAllOrderItems = async () => {
    const items = {};
    for (const order of orders) {
      const { data } = await supabase.from('order_items').select('*, products(*)').eq('order_id', order.order_id);
      items[order.order_id] = data || [];
    }
    setOrderItems(items);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('order_id', orderId);
    
    if (error) {
      showFlash('Gagal update status!', 'error');
    } else {
      showFlash(`Pesanan ${newStatus === 'approved' ? 'disetujui' : 'ditolak'}!`, 'success');
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
                    <p className="text-sm text-blue-600 mt-1">Pembayaran via: <span className="font-semibold">{order.payment_method === 'cash' ? 'Tunai' : 'Paylater'}</span></p>
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