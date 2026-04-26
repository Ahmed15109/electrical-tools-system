import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Trash2, ArrowRight, Search, ChevronDown, Calendar, AlertCircle, User } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, toCentsLocal } from '../utils/normalize';

export default function CreatePurchase() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  });

  const [items, setItems] = useState([{ product: '', quantity: 1, costPrice: 0 }]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const abortControllerRef = useRef(null);

  
  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const loadData = async () => {
      try {
        setLoadingData(true);
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/products')
        ]);
        if (signal.aborted) return;
        const sups = Array.isArray(supRes.data?.data) ? supRes.data.data :
                     (Array.isArray(supRes.data) ? supRes.data : []);
        const prods = Array.isArray(prodRes.data?.data) ? prodRes.data.data :
                      (Array.isArray(prodRes.data) ? prodRes.data : []);
        setSuppliers(sups);
        setProducts(prods);
      } catch (err) {
        if (!signal.aborted) {
          console.error('[CreatePurchase] Load Error:', err);
          toast.error('فشل تحميل البيانات');
        }
      } finally {
        if (!signal.aborted) setLoadingData(false);
      }
    };
    loadData();

    return () => controller.abort();
  }, []);

  
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(s =>
      s.name?.toLowerCase().includes(q) || s.phone?.includes(q)
    );
  }, [suppliers, supplierSearch]);

  const selectedSupplierObj = useMemo(() => {
    return suppliers.find(s => String(s.id) === String(selectedSupplier));
  }, [suppliers, selectedSupplier]);

  
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const p = item.costPrice || 0;
      return sum + q * p;
    }, 0);
  }, [items]);

  const paidAmountCents = toCentsLocal(paidAmount);
  const remainingAmount = Math.max(0, totalAmount - paidAmountCents);

  const addItem = () => {
    setItems(prev => [...prev, { product: '', quantity: 1, costPrice: 0 }]);
  };

  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const finalValue = field === 'costPrice' ? toCentsLocal(value) : value;
      return { ...item, [field]: finalValue };
    }));
  };

  const handleSelectSupplier = (sup) => {
    setSelectedSupplier(String(sup.id));
    setSupplierSearch('');
    setShowSupplierDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupplier) {
      toast.error('يرجى اختيار المورد');
      return;
    }
    
    if (!purchaseDate) {
      toast.error('يرجى تحديد تاريخ الشراء');
      return;
    }

    const validItems = items.filter(it => it.product && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('يرجى إضافة منتج واحد على الأقل');
      return;
    }

    if (Number(paidAmount) > totalAmount) {
      toast.error('المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي');
      return;
    }

    const toastId = toast.loading('جاري إنشاء فاتورة الشراء...');
    setSubmitting(true);

    try {
      await api.post('/purchases', {
        supplier: selectedSupplier,
        purchaseDate,
        products: validItems.map(it => ({
          product: it.product,
          quantity: Number(it.quantity),
          costPrice: it.costPrice // Already in cents
        })),
        paidAmount: paidAmountCents
      });

      toast.success('تم إنشاء فاتورة الشراء بنجاح', { id: toastId });
      navigate('/suppliers');
    } catch (err) {
      console.error('[CreatePurchase] Submit Error:', err);
      const msg = err.response?.data?.error || err?.message || 'حدث خطأ';
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)', gap: '1rem' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
        جاري تحميل البيانات...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/suppliers')} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px',
          background: 'var(--input-bg)', border: '1px solid var(--border)',
          cursor: 'pointer', transition: 'color 0.2s'
        }}>
          <ArrowRight size={16} /> رجوع
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <ShoppingBag size={26} color="#a855f7" />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>إنشاء فاتورة شراء</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', zIndex: showSupplierDropdown ? 100 : 1 }}>
          <h3 style={{ margin: '0 0 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7' }}>
            <User size={18} /> البيانات الأساسية
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(130px, 1fr)', gap: '1rem', alignItems: 'start' }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>المورد</label>
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', 
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    borderRadius: '8px', display: 'flex', justifyContent: 'space-between', 
                    alignItems: 'center', cursor: 'pointer'
                  }}
                >
                  <span>{selectedSupplierObj ? selectedSupplierObj.name : 'اختر مورد...'}</span>
                  <ChevronDown size={20} />
                </div>

                {showSupplierDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                    marginTop: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-card)'
                  }}>
                    <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--th-bg)' }}>
                      <input
                        type="text"
                        autoFocus
                        value={supplierSearch}
                        onChange={e => setSupplierSearch(e.target.value)}
                        placeholder="ابحث عن مورد بالاسم أو الهاتف..."
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none', color: 'var(--text-main)', fontSize: '0.95rem' }}
                      />
                    </div>
                    
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map(sup => (
                          <div
                            key={sup.id}
                            onClick={() => handleSelectSupplier(sup)}
                            style={{
                              padding: '0.75rem 1rem', cursor: 'pointer',
                              borderBottom: '1px solid var(--td-border)',
                              transition: 'background 0.15s',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontWeight: '600' }}>{sup.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', direction: 'ltr' }}>{sup.phone}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          لا توجد نتائج
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedSupplierObj && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.6rem 1rem', borderRadius: '8px',
                  background: 'var(--row-hover)', border: '1px solid var(--accent)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>المورد المختار: <strong>{selectedSupplierObj.name}</strong></span>
                  <button onClick={() => { setSelectedSupplier(''); setSupplierSearch(''); }} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>تاريخ الشراء / الفاتورة</label>
              <div style={{ position: 'relative' }}>
                 <input
                   type="date"
                   value={purchaseDate}
                   max={new Date().toISOString().split('T')[0]}
                   onChange={e => setPurchaseDate(e.target.value)}
                   style={{
                     width: '100%', padding: '0.75rem 0.5rem', fontSize: '0.9rem',
                     border: !purchaseDate ? '1px solid var(--danger)' : '1px solid var(--border)'
                   }}
                 />
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#a855f7' }}>المنتجات</h3>
            <button type="button" onClick={addItem} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.85rem', borderRadius: '6px', cursor: 'pointer',
              background: 'rgba(168,85,247,0.12)', color: '#a855f7',
              border: '1px solid rgba(168,85,247,0.25)', fontSize: '0.85rem',
              transition: 'all 0.2s'
            }}>
              <Plus size={14} /> إضافة منتج
            </button>
          </div>

          {}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
            gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
            fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.5rem'
          }}>
            <span>المنتج</span>
            <span>الكمية</span>
            <span>سعر التكلفة</span>
            <span>الإجمالي</span>
            <span></span>
          </div>

          {items.map((item, idx) => {
            const lineTotal = (Number(item.quantity) || 0) * (item.costPrice || 0);
            return (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                gap: '0.75rem', padding: '0.6rem 0',
                borderBottom: idx < items.length - 1 ? '1px solid var(--td-border)' : 'none',
                alignItems: 'center'
              }}>
                <select
                  value={item.product}
                  onChange={e => updateItem(idx, 'product', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="">اختر منتج...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.brand && p.brand !== 'General' ? `(${p.brand})` : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  style={{ width: '100%', textAlign: 'center' }}
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.costPrice / 100}
                  onChange={e => updateItem(idx, 'costPrice', e.target.value)}
                  style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
                />

                <div style={{ direction: 'ltr', textAlign: 'right', fontWeight: '600', fontSize: '0.92rem' }}>
                  {formatCurrency(lineTotal)}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  style={{
                    padding: '0.3rem', borderRadius: '4px', cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                    background: 'transparent', color: items.length <= 1 ? 'var(--text-muted)' : 'var(--danger)',
                    border: 'none', opacity: items.length <= 1 ? 0.3 : 1
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#a855f7' }}>ملخص الفاتورة</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            {}
            <div style={{
              padding: '1rem', borderRadius: '10px',
              background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>إجمالي الفاتورة</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#a855f7', direction: 'ltr' }}>
                {formatCurrency(totalAmount)}
              </div>
            </div>

            {}
            <div style={{
              padding: '1rem', borderRadius: '10px',
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>المدفوع</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--success)', direction: 'ltr' }}>
                {formatCurrency(paidAmountCents)}
              </div>
            </div>

            {}
            <div style={{
              padding: '1rem', borderRadius: '10px',
              background: remainingAmount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${remainingAmount > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>المتبقي (عليك)</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: remainingAmount > 0 ? 'var(--danger)' : 'var(--success)', direction: 'ltr' }}>
                {formatCurrency(remainingAmount)}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              المبلغ المدفوع الآن (يُخصم من الخزنة)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={e => setPaidAmount(e.target.value)}
              placeholder="0"
              style={{ width: '100%', fontSize: '1.1rem', direction: 'ltr', textAlign: 'right' }}
            />
          </div>
        </div>

        {}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{
            width: '100%', padding: '0.85rem', fontSize: '1.05rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1
          }}
        >
          <ShoppingBag size={20} />
          {submitting ? 'جاري الإنشاء...' : 'إنشاء فاتورة الشراء'}
        </button>
      </form>
    </div>
  );
}
