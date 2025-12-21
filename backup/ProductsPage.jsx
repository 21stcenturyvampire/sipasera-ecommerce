import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function ProductsPage({ products, currentUser, searchTerm, setSearchTerm, addToCart, fetchProducts, showFlash }) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (formData) => {
    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(formData)
        .eq('product_id', editingProduct.product_id);
      
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
          <button 
            onClick={() => { setEditingProduct(null); setShowModal(true); }} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={20} /> Tambah Produk
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari produk..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(product => (
          <div 
            key={product.product_id} 
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition"
          >
            <div className="text-6xl p-6 bg-slate-50 text-center">{product.image_url}</div>
            <div className="p-4">
              <h3 className="font-semibold text-lg text-slate-800 mb-1">{product.name}</h3>
              <p className="text-sm text-slate-600 mb-3">{product.description}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xl font-bold text-blue-600">
                  Rp {parseFloat(product.price).toLocaleString()}
                </span>
                <span className="text-sm text-slate-500">Stok: {product.stock}</span>
              </div>
              {currentUser?.role === 'admin' ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingProduct(product); setShowModal(true); }} 
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(product.product_id, product.name)} 
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => addToCart(product)} 
                  disabled={product.stock === 0} 
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {product.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ProductModal 
          product={editingProduct} 
          onSave={handleSave} 
          onClose={() => { setShowModal(false); setEditingProduct(null); }} 
        />
      )}
    </div>
  );
}

function ProductModal({ product, onSave, onClose }) {
  const [formData, setFormData] = useState(
    product || { name: '', description: '', price: 0, stock: 0, image_url: '📦' }
  );

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">
          {product ? 'Edit Produk' : 'Tambah Produk'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Produk *</label>
            <input 
              type="text" 
              placeholder="Contoh: Beras Premium 5kg" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi</label>
            <textarea 
              placeholder="Deskripsi produk" 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg" 
              rows="2" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Harga (Rp) *</label>
            <input 
              type="number" 
              placeholder="75000" 
              value={formData.price} 
              onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} 
              className="w-full px-4 py-2 border rounded-lg" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Stok *</label>
            <input 
              type="number" 
              placeholder="100" 
              value={formData.stock} 
              onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} 
              className="w-full px-4 py-2 border rounded-lg" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Emoji Icon</label>
            <input 
              type="text" 
              placeholder="🌾" 
              value={formData.image_url} 
              onChange={(e) => setFormData({...formData, image_url: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg" 
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button 
              onClick={() => onSave(formData)} 
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Simpan
            </button>
            <button 
              onClick={onClose} 
              className="flex-1 bg-slate-200 py-2 rounded-lg hover:bg-slate-300"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}