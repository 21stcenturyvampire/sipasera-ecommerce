import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, Users, CreditCard, FileText, LogOut, 
  Menu, X, ClipboardList, Receipt, User, Briefcase, 
  FileBarChart,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from './supabaseClient';

import { NotificationBanner, FlashMessage, LoadingOverlay } from './components/CommonComponents';

import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { BillingPage } from './pages/BillingPage';
import { ProfilePage } from './pages/ProfilePage';
import { PaylaterApprovalPage } from './pages/PaylaterApprovalPage';
import { OperationalPage } from './pages/OperationalPage';
import { FinancialReportsPage } from './pages/FinancialReportsPage';

export default function SipaseraApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [flashMessage, setFlashMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [creditLimits, setCreditLimits] = useState([]);
  const [financialReports, setFinancialReports] = useState([]);
  const [paylaterApps, setPaylaterApps] = useState([]);
  const [operationalExpenses, setOperationalExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedCart = localStorage.getItem('cart');
    
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setCurrentPage(user.role === 'admin' ? 'dashboard' : 'products');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      fetchProducts();
      fetchUsers();
      fetchCreditLimits();
      fetchOrders();
      if (user.role === 'admin') {
        fetchFinancialReports();
        fetchPaylaterApps();
        fetchOperationalExpenses();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('cart');
    }
  }, [cart]);

  useEffect(() => {
    fetchProducts();
    fetchUsers();
    fetchCreditLimits();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setFlashMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  const showFlash = (message, type = 'success') => {
    setFlashMessage({ message, type });
  };

  const fetchNotifications = async () => {
    if (currentUser?.role === 'user') {
      const { data } = await supabase
        .from('paylater_applications')
        .select('*')
        .eq('user_id', currentUser.user_id)
        .eq('notified', false)
        .neq('status', 'pending');
      
      if (data && data.length > 0) {
        setNotifications(data);
      }
    }
  };

  const markAsNotified = async (appId) => {
    await supabase
      .from('paylater_applications')
      .update({ notified: true })
      .eq('application_id', appId);
    setNotifications(prev => prev.filter(n => n.application_id !== appId));
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('product_id', { ascending: true });
    if (data) setProducts(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('user_id', { ascending: true });
    if (data) setUsers(data);
  };

  const fetchCreditLimits = async () => {
    const { data } = await supabase.from('user_credit_limit').select('*');
    if (data) setCreditLimits(data);
  };

  const fetchOrders = async () => {
      const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(product_id, quantity)`)
    .order('order_id', { ascending: false });

    if (error) {
      console.error('fetchOrders error:', error);
      return;
    }

    setOrders(data || []);
  };

  const fetchFinancialReports = async () => {
    const { data } = await supabase
      .from('financial_report')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setFinancialReports(data);
  };

  const fetchPaylaterApps = async () => {
    const { data } = await supabase
      .from('paylater_applications')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false });
    if (data) setPaylaterApps(data);
  };

  const fetchOperationalExpenses = async () => {
    const { data } = await supabase
      .from('operational_expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOperationalExpenses(data);
  };

  const handleRegister = async (formData) => {
    setLoading(true);
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', formData.email)
      .single();
    
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    setLoading(false);
    
    if (error || !data) return false;
    
    setCurrentUser(data);
    setCurrentPage(data.role === 'admin' ? 'dashboard' : 'products');
    fetchOrders();
    if (data.role === 'admin') {
      fetchFinancialReports();
      fetchPaylaterApps();
      fetchOperationalExpenses();
    }
    showFlash(`Selamat datang, ${data.name}!`, 'success');
    return true;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
    localStorage.removeItem('currentUser');
    showFlash('Berhasil logout', 'info');
  };

  const addToCart = (product) => {
    const existing = cart.find(c => c.product_id === product.product_id);
    if (existing) {
      setCart(cart.map(c => 
        c.product_id === product.product_id 
          ? {...c, quantity: c.quantity + 1} 
          : c
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showFlash(`${product.name} ditambahkan ke keranjang`, 'success');
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      const product = cart.find(c => c.product_id === productId);
      if (product) showFlash(`${product.name} dihapus dari keranjang`, 'info');
      setCart(cart.filter(c => c.product_id !== productId));
    } else {
      setCart(cart.map(c => 
        c.product_id === productId ? {...c, quantity} : c
      ));
    }
  };

  const handleCheckout = async (paymentMethod) => {
    const totalAmount = cart.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    const userCredit = creditLimits.find(c => c.user_id === currentUser.user_id);
    
    if (paymentMethod === 'paylater') {
      if (!userCredit || userCredit.credit_limit <= 1) {
        showFlash('Limit kredit Anda belum mencukupi. Silakan ajukan peningkatan limit!', 'error');
        return;
      }
      const availableCredit = userCredit.credit_limit - userCredit.used_credit;
      if (totalAmount > availableCredit) {
        showFlash('Limit kredit tidak mencukupi!', 'error');
        return;
      }
    }

    setLoading(true);

    const dueDate = paymentMethod === 'paylater'
      ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      : undefined; 

    const orderStatus = 'completed';
    
    const { error: orderError } = await supabase.from('orders').insert([{
      user_id: currentUser.user_id, 
      total_amount: totalAmount, 
      payment_method: paymentMethod, 
      status: orderStatus, 
      due_date: dueDate 
    }]);

    if (orderError) {
      console.error('ORDER ERROR DETAIL:', orderError);
      showFlash(orderError.message, 'error');
      setLoading(false);
      return;
    }

    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', currentUser.user_id)
      .order('order_id', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !orderData) {
      console.error(fetchError);
      showFlash('Gagal mengambil data order', 'error');
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

    setCart([]);
    localStorage.removeItem('cart');
    fetchProducts();
    fetchOrders();
    setLoading(false);
    setCurrentPage('orders');

    for (const item of cart) {
      const product = products.find(p => p.product_id === item.product_id);
      await supabase
        .from('products')
        .update({ stock: product.stock - item.quantity })
        .eq('product_id', item.product_id);
    }

    if (paymentMethod === 'paylater' && userCredit) {
      await supabase
        .from('user_credit_limit')
        .update({ used_credit: userCredit.used_credit + totalAmount })
        .eq('user_id', currentUser.user_id);
      fetchCreditLimits();
    }

    await supabase.from('financial_report').insert([{
      report_type: 'income',
      description: `Order #${orderData.order_id} - ${currentUser.name} - ${paymentMethod.toUpperCase()}`,
      amount: totalAmount
    }]);
    
    const paymentLabel = paymentMethod === 'transfer' ? 'Transfer' : 
                         paymentMethod === 'cod' ? 'COD' : 'Paylater';
    showFlash(`Pesanan berhasil! Pembayaran via ${paymentLabel}. Total: Rp ${totalAmount.toLocaleString()}`, 'success');
    setCurrentPage('orders');
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  if (currentPage === 'login') {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onRegister={() => setCurrentPage('register')} 
        loading={loading} 
      />
    );
  }

  if (currentPage === 'register') {
    return (
      <RegisterPage 
        onRegister={handleRegister} 
        onBack={() => setCurrentPage('login')} 
        loading={loading} 
      />
    );
  }

  const menuItems = currentUser?.role === 'admin' ? [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Produk' },
    { id: 'orders', icon: ShoppingCart, label: 'Pesanan' },
    { id: 'paylater-approval', icon: CreditCard, label: 'Approval Paylater' },
    { id: 'operational', icon: Briefcase, label: 'Operasional' },
    { id: 'reports', icon: FileBarChart, label: 'Laporan Keuangan' }
  ] : [
    { id: 'products', icon: Package, label: 'Produk' },
    { id: 'cart', icon: ShoppingCart, label: 'Keranjang', badge: cart.length },
    { id: 'orders', icon: ClipboardList, label: 'Pesanan Saya' },
    { id: 'billing', icon: Receipt, label: 'Penagihan' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {flashMessage && (
        <FlashMessage 
          message={flashMessage.message} 
          type={flashMessage.type} 
          onClose={() => setFlashMessage(null)} 
        />
      )}
      
      {notifications.length > 0 && (
        <NotificationBanner 
          notifications={notifications} 
          onClose={markAsNotified} 
        />
      )}
      
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          {sidebarOpen && <h2 className="text-xl font-bold text-slate-800">SIPASERA</h2>}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-4">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setCurrentPage(item.id)} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
                currentPage === item.id 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
              {item.badge > 0 && sidebarOpen && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Keluar</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <LoadingOverlay />}
        {currentPage === 'dashboard' && (
          <DashboardPage 
            products={products} 
            orders={orders} 
            users={users} 
            reports={financialReports} 
          />
        )}
        {currentPage === 'products' && (
          <ProductsPage 
            products={products} 
            currentUser={currentUser} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            addToCart={addToCart} 
            fetchProducts={fetchProducts} 
            showFlash={showFlash} 
          />
        )}
        {currentPage === 'cart' && (
          <CartPage 
            cart={cart} 
            updateCartQuantity={updateCartQuantity} 
            creditLimits={creditLimits} 
            currentUser={currentUser} 
            handleCheckout={handleCheckout} 
          />
        )}
        {currentPage === 'orders' && (
          <OrdersPage 
            orders={orders} 
            users={users} 
            currentUser={currentUser} 
            fetchOrders={fetchOrders} 
            showFlash={showFlash} 
          />
        )}
        {currentPage === 'billing' && (
          <BillingPage 
            orders={orders} 
            currentUser={currentUser} 
            creditLimits={creditLimits} 
            fetchOrders={fetchOrders} 
            fetchCreditLimits={fetchCreditLimits} 
            showFlash={showFlash} 
          />
        )}
        {currentPage === 'profile' && (
          <ProfilePage 
            currentUser={currentUser} 
            setCurrentUser={setCurrentUser} 
            creditLimits={creditLimits} 
            fetchCreditLimits={fetchCreditLimits} 
            showFlash={showFlash} 
          />
        )}
        {currentPage === 'paylater-approval' && (
          <PaylaterApprovalPage 
            applications={paylaterApps} 
            fetchApps={fetchPaylaterApps} 
            fetchCreditLimits={fetchCreditLimits} 
            showFlash={showFlash} 
          />
        )}
        {currentPage === 'operational' && (
          <OperationalPage 
            expenses={operationalExpenses} 
            fetchExpenses={fetchOperationalExpenses} 
            currentUser={currentUser} 
            showFlash={showFlash} 
          />
        )}
        {currentPage === 'reports' && (
          <FinancialReportsPage 
            reports={financialReports} 
            orders={orders} 
            fetchReports={fetchFinancialReports} 
          />
        )}
      </div>
    </div>
  );
}