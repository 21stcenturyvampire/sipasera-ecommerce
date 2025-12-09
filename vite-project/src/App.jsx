import React, { useState } from "react";
import { FileText, Package, ShoppingCart, LogOut, Menu, X } from "lucide-react";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./components/DashboardPage";
import ProductsPage from "./components/ProductsPage";
import CartPage from "./components/CartPage";
import OrdersPage from "./components/OrdersPage";

export default function SipaseraApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data dummy
  const [products] = useState([
    { id: 1, name: "Beras 5kg", price: 70000 },
    { id: 2, name: "Minyak Goreng 1L", price: 18000 },
    { id: 3, name: "Gula Pasir 1kg", price: 16000 },
  ]);

  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [creditLimits] = useState({
    admin: 0,
    user: 200000,
  });

  // Handle login
  const handleLogin = (email, password) => {
    if (email === "admin@sipasera.com" && password === "admin") {
      setCurrentUser({ role: "admin", name: "Admin SIPASERA" });
      return true;
    } else if (email === "warung1@example.com" && password === "user") {
      setCurrentUser({ role: "user", name: "Warung Sembako" });
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActivePage("dashboard");
  };

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const handleCheckout = () => {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const userLimit = creditLimits[currentUser.role];
    if (total > userLimit) {
      alert("⚠️ Jumlah melebihi limit kredit!");
      return;
    }
    const newOrder = {
      id: Date.now(),
      items: cart,
      total,
      status: "Menunggu Konfirmasi",
    };
    setOrders([...orders, newOrder]);
    setCart([]);
    alert("✅ Pesanan berhasil dibuat!");
  };

  if (!currentUser)
    return (
      <LoginPage
        onLogin={(email, pass) => {
          if (!handleLogin(email, pass)) alert("Email atau password salah!");
        }}
      />
    );

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage orders={orders} />;
      case "products":
        return <ProductsPage products={products} addToCart={addToCart} />;
      case "cart":
        return (
          <CartPage cart={cart} handleCheckout={handleCheckout} products={products} />
        );
      case "orders":
        return <OrdersPage orders={orders} />;
      default:
        return <DashboardPage orders={orders} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-blue-700 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 transition duration-200 ease-in-out`}
      >
        <div className="flex items-center justify-between px-4">
          <h1 className="text-2xl font-bold">SIPASERA</h1>
          <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav>
          <button
            onClick={() => setActivePage("dashboard")}
            className="block py-2.5 px-4 rounded hover:bg-blue-800 w-full text-left"
          >
            <FileText className="inline-block mr-2" size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActivePage("products")}
            className="block py-2.5 px-4 rounded hover:bg-blue-800 w-full text-left"
          >
            <Package className="inline-block mr-2" size={18} />
            Produk
          </button>
          <button
            onClick={() => setActivePage("cart")}
            className="block py-2.5 px-4 rounded hover:bg-blue-800 w-full text-left"
          >
            <ShoppingCart className="inline-block mr-2" size={18} />
            Keranjang
          </button>
          <button
            onClick={() => setActivePage("orders")}
            className="block py-2.5 px-4 rounded hover:bg-blue-800 w-full text-left"
          >
            <FileText className="inline-block mr-2" size={18} />
            Pesanan
          </button>
        </nav>

        <div className="absolute bottom-6 w-full px-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 py-2 rounded-lg flex items-center justify-center hover:bg-red-700"
          >
            <LogOut size={18} className="mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden text-blue-700"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-gray-700">
              Halo, {currentUser.name}
            </h2>
          </div>
        </header>

        <main className="p-6">{renderPage()}</main>
      </div>
    </div>
  );
}
