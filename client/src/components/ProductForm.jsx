import { useState, useEffect, memo, useCallback } from 'react';
import { Save, X, Package, DollarSign, Layers } from 'lucide-react';
import { normalizeNumberInput, toCentsLocal } from '../utils/normalize';


const ProductForm = ({ initialData, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        price: initialData.price !== undefined ? initialData.price / 100 : '',
        stock: initialData.stock !== undefined ? initialData.stock : ''
      });
    } else {
      setFormData({ name: '', price: '', stock: '' });
    }
  }, [initialData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const finalValue = (name === 'price' || name === 'stock') 
      ? normalizeNumberInput(value) 
      : value;
      
    setFormData(prev => {
      if (prev[name] === finalValue) return prev;
      return { ...prev, [name]: finalValue };
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cents = toCentsLocal(formData.price);
    console.log("[ProductForm] INPUT (EGP):", formData.price);
    console.log("[ProductForm] STORED (CENTS):", cents);
    
    const submissionData = {
      ...formData,
      price: cents
    };
    onSubmit(submissionData);
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: 'var(--accent)' }}>
          {initialData ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        </h3>
        <button type="button" onClick={onCancel} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>اسم المنتج *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem' }}
              placeholder="مثال: ثلاجة توشيبا 14 قدم"
              disabled={loading}
            />
            <Package size={18} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          </div>
        </div>
        
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>السعر *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem' }}
              placeholder="0.00"
              disabled={loading}
            />
            <DollarSign size={18} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          </div>
        </div>

        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>الكمية بالمخزن *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem' }}
              placeholder="مثال: 50"
              disabled={loading}
            />
            <Layers size={18} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary" style={{ padding: '0.7rem 1.8rem' }}>
            إلغاء
          </button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 2.5rem' }}>
            <Save size={18} />
            {loading ? 'جاري الحفظ...' : (initialData ? 'تحديث المنتج' : 'حفظ المنتج')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(ProductForm);
