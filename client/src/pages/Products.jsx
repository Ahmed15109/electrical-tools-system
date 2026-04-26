import { useState, useEffect, useCallback, memo } from 'react';
import { Package, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

import ProductForm from '../components/ProductForm';
import ProductTable from '../components/ProductTable';


const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error('[Products] Fetch failed:', err);
      setError(err.response?.data?.error || err.message || 'فشل تحميل المنتجات');
      toast.error('لم نتمكن من العمل على جلب قائمة المنتجات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = useCallback(async (formData) => {
    const toastId = toast.loading('جاري حفظ بيانات المنتج...');
    try {
      setFormLoading(true);
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        stock: Number(formData.stock)
      };

      if (selectedProduct?.id || selectedProduct?._id) {
        const id = selectedProduct.id || selectedProduct._id;
        await api.put(`/products/${id}`, payload);
        toast.success('تم تحديث المنتج بنجاح', { id: toastId });
      } else {
        await api.post('/products', payload);
        toast.success('تم إضافة المنتج بنجاح', { id: toastId });
      }

      setShowForm(false);
      setSelectedProduct(null);
      await fetchProducts();
    } catch (err) {
      console.error('[Products] Save failed:', err);
      const msg = err.response?.data?.error || 'فشل في حفظ المنتج';
      toast.error(msg, { id: toastId });
    } finally {
      setFormLoading(false);
    }
  }, [selectedProduct, fetchProducts]);

  const handleDelete = useCallback(async (id) => {
    if (!id || !window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    const toastId = toast.loading('جاري حذف المنتج...');
    try {
      await api.delete(`/products/${id}`);
      toast.success('تم حذف المنتج بنجاح', { id: toastId });
      await fetchProducts();
    } catch (err) {
      console.error('[Products] Delete failed:', err);
      const msg = err.response?.data?.error || 'فشل في حذف المنتج';
      toast.error(msg, { id: toastId });
    }
  }, [fetchProducts]);

  const handleEdit = useCallback((product) => {
    setSelectedProduct(product);
    setShowForm(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedProduct(null);
    setShowForm(true);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setSelectedProduct(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.8rem' }}>
            <Package size={28} style={{ color: 'var(--accent)' }} /> 
            إدارة المنتجات
          </h1>
          <p className="text-muted" style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>إدارة مخزون المتجر والأسعار بشكل مركزي.</p>
        </div>
        
        {!showForm && (
          <button className="btn-primary" onClick={handleAddNew} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}>
            <Plus size={20} /> إضافة منتج جديد
          </button>
        )}
      </div>

      {}
      {showForm && (
        <ProductForm 
          initialData={selectedProduct} 
          onSubmit={handleSave} 
          onCancel={handleCancelForm} 
          loading={formLoading} 
        />
      )}

      {}
      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>جاري تحميل المنتجات...</div>
        ) : error ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--danger)' }}>فشل تحميل البيانات</h2>
            <p>{error}</p>
            <button className="btn-secondary" onClick={fetchProducts}>إعادة المحاولة</button>
          </div>
        ) : (
          <ProductTable 
            products={products} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        )}
      </div>

      {}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <div>إجمالي: {products.length} منتج</div>
      </div>
      
    </div>
  );
};

export default memo(Products);
