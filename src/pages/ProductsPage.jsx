import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Upload, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CATEGORIES = [
  'Bahan Pokok',
  'Sumber Protein',
  'Minyak & Bumbu',
  'Makanan & Minuman',
  'Produk Instan',
  'Kebutuhan Rumah Tangga',
  'Kesehatan & Kebersihan',
  'Lainnya'
];

async function fetchTopSellingProducts(products, limit = 5) {
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity');

  if (!items || items.length === 0) return products.slice(0, limit);

  const salesMap = {};
  items.forEach(({ product_id, quantity }) => {
    salesMap[product_id] = (salesMap[product_id] || 0) + quantity;
  });

  const sorted = Object.entries(salesMap)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => products.find(p => p.product_id === parseInt(id)))
    .filter(Boolean)
    .slice(0, limit);

  // Jika data penjualan kurang dari limit, tambah dari produk list
  if (sorted.length < limit) {
    const existing = new Set(sorted.map(p => p.product_id));
    const extra = products.filter(p => !existing.has(p.product_id)).slice(0, limit - sorted.length);
    return [...sorted, ...extra];
  }

  return sorted;
}

export function ProductsPage({ products, currentUser, searchTerm, setSearchTerm, addToCart, fetchProducts, showFlash }) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (currentUser?.role === 'user' && products.length > 0) {
      setRecLoading(true);
      fetchTopSellingProducts(products, 5)
        .then(setRecommendations)
        .finally(() => setRecLoading(false));
    }
  }, [currentUser, products]);

  const handleSave = async (formData) => {
    if (editingProduct) {
      const { error } = await supabase.from('products').update(formData).eq('product_id', editingProduct.product_id);
      showFlash(error ? 'Gagal update produk!' : 'Produk berhasil diupdate!', error ? 'error' : 'success');
    } else {
      const { error } = await supabase.from('products').insert([formData]);
      showFlash(error ? 'Gagal menambah produk!' : 'Produk berhasil ditambahkan!', error ? 'error' : 'success');
    }
    fetchProducts();
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Hapus produk "${productName}"?`)) return;
    const { error } = await supabase.from('products').delete().eq('product_id', productId);
    if (error) { showFlash('Gagal menghapus produk!', 'error'); }
    else { showFlash(`Produk "${productName}" berhasil dihapus!`, 'success'); fetchProducts(); }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Produk Sembako</h1>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => { setEditingProduct(null); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm"
          >
            <Plus size={18} /> Tambah Produk
          </button>
        )}
      </div>

      {/* ── REKOMENDASI: hanya tampil untuk user, full width, di atas search ── */}
      {currentUser?.role === 'user' && (
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-700 text-sm md:text-base">Produk Terlaris</h2>
            <span className="text-xs text-slate-400 hidden sm:inline">— paling banyak dibeli pelanggan</span>
          </div>

          {recLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-slate-100 rounded-xl h-48 animate-pulse" />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recommendations.map((product, index) => (
                <div
                  key={product.product_id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  {/* Badge rank */}
                  <div className="relative">
                    <div className="w-full h-32 bg-slate-50 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                      )}
                    </div>
                    <span className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow ${
                      index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="font-semibold text-xs text-slate-800 line-clamp-2 mb-1 leading-tight flex-1">{product.name}</p>
                    <p className="text-blue-600 font-bold text-sm mb-2">
                      Rp {parseFloat(product.price).toLocaleString()}
                    </p>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="w-full text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition font-medium"
                    >
                      {product.stock === 0 ? 'Habis' : '+ Keranjang'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400 whitespace-nowrap">Semua Produk</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>
        </div>
      )}

      {/* ── SEARCH ── */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── CATEGORY FILTER ── */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <button
          onClick={() => setSelectedCategory('Semua')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap text-sm transition flex-shrink-0 ${
            selectedCategory === 'Semua' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Semua
        </button>
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap text-sm transition flex-shrink-0 ${
              selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* ── PRODUCT GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filtered.map(product => (
          <div
            key={product.product_id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition"
          >
            <div className="w-full h-40 bg-slate-50 overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-base text-slate-800">{product.name}</h3>
              {product.category && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mt-1 inline-block">
                  {product.category}
                </span>
              )}
              <p className="text-sm text-slate-500 mt-2 mb-3 line-clamp-2">{product.description}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold text-blue-600">
                  Rp {parseFloat(product.price).toLocaleString()}
                </span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  product.stock === 0 ? 'text-red-600 bg-red-50' :
                  product.stock < 20 ? 'text-yellow-600 bg-yellow-50' :
                  'text-slate-600'
                }`}>
                  Stok: {product.stock}
                </span>
              </div>
              {currentUser?.role === 'admin' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingProduct(product); setShowModal(true); }}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1 text-sm"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.product_id, product.name)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1 text-sm"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 text-sm font-medium transition"
                >
                  {product.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg">Produk tidak ditemukan</p>
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
          showFlash={showFlash}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onSave, onClose, showFlash }) {
  const [formData, setFormData] = useState(
    product || { name: '', description: '', price: 0, stock: 0, image_url: '', category: '' }
  );
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(product?.image_url || '');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) { showFlash('Format file harus JPG, PNG, WebP, atau GIF!', 'error'); return; }
    if (file.size > 5*1024*1024) { showFlash('Ukuran file maksimal 5MB!', 'error'); return; }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2,9)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) { showFlash('Gagal upload foto!', 'error'); return; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
      setPreview(data.publicUrl);
      showFlash('Foto berhasil diupload!', 'success');
    } catch { showFlash('Terjadi kesalahan saat upload!', 'error'); }
    finally { setUploading(false); }
  };

  const handleSaveClick = () => {
    if (!formData.name.trim()) { showFlash('Nama produk tidak boleh kosong!', 'error'); return; }
    if (!formData.price || formData.price <= 0) { showFlash('Harga harus lebih besar dari 0!', 'error'); return; }
    if (formData.stock < 0) { showFlash('Stok tidak boleh negatif!', 'error'); return; }
    if (!formData.category) { showFlash('Kategori harus dipilih!', 'error'); return; }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Foto Produk</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
              {preview && <div className="mb-3"><img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-lg" /></div>}
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload size={24} className="text-slate-400 mb-2" />
                <span className="text-sm text-slate-600">{uploading ? 'Uploading...' : 'Klik untuk upload foto'}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
              </label>
              <p className="text-xs text-slate-500 mt-2">JPG, PNG, WebP, GIF max 5MB</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Produk *</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Contoh: Beras Premium 5kg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Kategori *</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
              <option value="">-- Pilih Kategori --</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows="2" placeholder="Deskripsi produk" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Harga (Rp) *</label>
            <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" placeholder="75000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Stok *</label>
            <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" placeholder="100" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSaveClick} disabled={uploading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400">Simpan</button>
            <button onClick={onClose} disabled={uploading} className="flex-1 bg-slate-200 py-2 rounded-lg hover:bg-slate-300">Batal</button>
          </div>
        </div>
      </div>
    </div>
  );
}