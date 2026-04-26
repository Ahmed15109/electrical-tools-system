import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import api from '../services/api';
import {
  ShoppingCart, Search, Plus, Minus, Trash2,
  Calculator, CheckCircle, AlertCircle, Package, User, Calendar
} from 'lucide-react';
import { normalizeNumberInput, formatCurrency, formatNumber, toCentsLocal } from '../utils/normalize';
import toast from 'react-hot-toast';


const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const cleaned = String(v).replace(/[^\d.]/g, '');
  return Number(cleaned) || 0;
};




const ProductSearch = memo(({ products, onAdd }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = useCallback((product) => {
    onAdd(product);
    setQuery('');
    setOpen(false);
  }, [onAdd]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', top: '50%', right: '0.85rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث عن منتج للإضافة..."
          style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', fontSize: '0.95rem' }}
        />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, left: 0, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '8px', maxHeight: '240px', overflowY: 'auto',
          backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              لا يوجد منتج بهذا الاسم
            </div>
          ) : filtered.map(p => {
            const pId = p.id || p._id;
            return (
            <div
              key={pId}
              onClick={() => select(p)}
              style={{
                padding: '0.75rem 1rem', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 0.15s', borderBottom: '1px solid var(--td-border)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{p.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>مخزون: {p.stock ?? '—'}</div>
              </div>
              <div style={{ fontWeight: '700', color: 'var(--success)', direction: 'ltr' }}>
                {(() => {
                  console.log(`[CreateSale] Product list item: ${p.name}, RAW price:`, p.price);
                  return formatCurrency(p.price);
                })()}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
});


const CartRow = memo(({ item, product, onQtyChange, onRemove, onPriceChange, priceError }) => {
  const currentPrice = item.price !== undefined ? item.price : (product?.price || 0);
  const rowTotal = currentPrice * item.qty;

  return (
    <tr>
      <td>
        <div style={{ fontWeight: '500' }}>{product?.name || '—'}</div>
        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={currentPrice / 100}
            onChange={(e) => onPriceChange(item.productId, e.target.value)}
            style={{ 
              width: '85px', padding: '0.3rem 0.5rem', borderRadius: '6px',
              border: priceError ? '1px solid var(--danger)' : item.price !== product?.price ? '1px solid var(--warning)' : '1px solid var(--border)',
              background: priceError ? 'rgba(var(--danger-rgb), 0.05)' : 'var(--input-bg)', 
              color: priceError ? 'var(--danger)' : item.price !== product?.price ? 'var(--warning)' : 'var(--text-main)',
              direction: 'ltr', textAlign: 'center', fontSize: '0.85rem',
              transition: 'all 0.2s'
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ وحدة</span>
          {priceError && (
             <div style={{ flexBasis: '100%', color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={12} /> {priceError}
             </div>
          )}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={() => onQtyChange(item.productId, -1)}
            disabled={item.qty <= 1}
            style={{
              width: '28px', height: '28px', borderRadius: '6px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
              transition: 'all 0.15s', cursor: item.qty <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <Minus size={14} />
          </button>
          <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: '600', fontSize: '1rem' }}>
            {item.qty}
          </span>
          <button
            onClick={() => onQtyChange(item.productId, +1)}
            style={{
              width: '28px', height: '28px', borderRadius: '6px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(59,130,246,0.15)', color: 'var(--accent)',
              transition: 'all 0.15s', cursor: 'pointer'
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </td>
      <td style={{ textAlign: 'left', direction: 'ltr', fontWeight: '700', color: 'var(--success)' }}>
        {(() => {
          console.log(`[CreateSale] CartRow rowTotal (cents):`, rowTotal);
          return formatCurrency(rowTotal);
        })()}
      </td>
      <td style={{ textAlign: 'center' }}>
        <button
          onClick={() => onRemove(item.productId)}
          style={{
            color: 'var(--danger)', padding: '0.35rem', borderRadius: '4px',
            background: 'rgba(239,68,68,0.08)', cursor: 'pointer',
            display: 'inline-flex', transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
});


const SummaryRow = memo(({ label, value, color, bold, highlight }) => {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: '0.88rem',
      padding: highlight ? '0.4rem 0.65rem' : '0',
      borderRadius: highlight ? '6px' : '0',
      background: highlight ? 'var(--row-hover)' : 'transparent',
    }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ direction: 'ltr', fontWeight: bold ? '700' : '500', color: color || 'var(--text-main)' }}>
        {value}
      </span>
    </div>
  );
});


const CreateSale = () => {
  const [customers, setCustomers] = useState([]);
  const [productsList, setProductsList] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(() => {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  });
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [interestRate, setInterestRate] = useState('30');
  
  const [months, setMonths] = useState('12');
  const [downPayment, setDownPayment] = useState('0');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const loadData = async () => {
      try {
        setLoading(true);
        const [cRes, pRes] = await Promise.all([api.get('/customers'), api.get('/products')]);
        if (signal.aborted) return;
        setCustomers(cRes.data || []);
        setProductsList(pRes.data || []);
      } catch (e) {
        if (!signal.aborted) {
          console.error('[CreateSale] Initial fetch failed:', e);
          toast.error('فشل تحميل البيانات الأساسية');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    loadData();

    return () => controller.abort();
  }, []);

  
  const addToCart = useCallback((product) => {
    const prodId = product.id || product._id;
    if (!prodId) return;
    
    setCart(prev => {
      const existing = prev.find(i => i.productId === prodId);
      console.log("[CreateSale] Adding product. RAW price from backend:", product.price);
      if (existing) return prev.map(i => i.productId === prodId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: prodId, qty: 1, price: Number(product.price) || 0 }];
    });
    setErrors(e => e.products ? { ...e, products: undefined } : e);
  }, []);

  const changeQty = useCallback((productId, delta) => {
    setCart(prev =>
      prev.map(i => i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const changePrice = useCallback((productId, value) => {
    setCart(prev =>
      prev.map(i => i.productId === productId ? { ...i, price: toCentsLocal(value) } : i)
    );
    setErrors(prev => {
        if (!prev[`price_${productId}`]) return prev;
        const newErr = { ...prev };
        delete newErr[`price_${productId}`];
        return newErr;
    });
  }, []);

  
  const pMap = useMemo(() => {
    const map = {};
    productsList.forEach(p => {
      map[p.id || p._id] = p;
    });
    return map;
  }, [productsList]);

  const { subtotal, interestAmount, finalAmount, downPaymentNum, remaining, monthly, dpError } = useMemo(() => {
    const subtotal       = cart.reduce((sum, item) => {
      const priceToUse = item.price || 0;
      return sum + priceToUse * item.qty;
    }, 0);
    const rate           = paymentMethod === 'installment' ? toNum(interestRate) / 100 : 0;
    const dp             = toCentsLocal(downPayment);
    const dpCapped       = Math.min(dp, subtotal);                
    const afterDown      = Math.max(0, subtotal - dpCapped);      
    const interestAmount = Math.round(afterDown * rate);                       
    const finalAmount    = subtotal + interestAmount;              
    const dpError        = dp > finalAmount && finalAmount > 0 ? 'المقدم يتجاوز الإجمالي النهائي' : '';
    const remaining      = Math.max(0, afterDown + interestAmount); 
    const m              = toNum(months);
    const monthly        = paymentMethod === 'installment' && m > 0 ? Math.round(remaining / m) : 0;
    console.log("[CreateSale] --- Summary Calc ---");
    console.log("Subtotal (cents):", subtotal);
    console.log("Interest Rate:", interestRate);
    console.log("Interest Amount (cents):", interestAmount);
    console.log("Down Payment RAW:", downPayment);
    console.log("Down Payment (cents):", dp);
    console.log("Final Amount (cents):", finalAmount);
    return { subtotal, interestAmount, finalAmount, downPaymentNum: dp, remaining, monthly, dpError };
  }, [cart, pMap, interestRate, months, paymentMethod, downPayment]);

  
  const validate = () => {
    const errs = {};
    if (!customerId) errs.customer = 'يرجى اختيار العميل';
    if (!saleDate) errs.saleDate = 'يرجى تحديد تاريخ الفاتورة';
    if (cart.length === 0) errs.products = 'يرجى إضافة منتج واحد على الأقل';
    
    let hasPriceError = false;
    cart.forEach(item => {
      const p = item.price;
      if (p <= 0) {
        errs[`price_${item.productId}`] = 'السعر لا يمكن أن يكون صفراً أو أقل';
        hasPriceError = true;
      } else if (p > 99999999) {
        errs[`price_${item.productId}`] = 'السعر مرتفع جداً';
        hasPriceError = true;
      }
    });
    if (hasPriceError) errs.products = 'يوجد أخطاء في الأسعار المدخلة للمنتجات';

    if (dpError) errs.downPayment = dpError;
    if (paymentMethod === 'installment' && toNum(months) <= 0) errs.months = 'يرجى تحديد عدد الأشهر';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const toastId = toast.loading('جاري إنشاء المبيعة...');
    setLoading(true);
    try {
      const payload = {
        customer: customerId,
        paymentMethod,
        saleDate,
        products: cart.map(i => ({ product: i.productId, quantity: i.qty, price: i.price }))
      };
      if (paymentMethod === 'installment') {
        payload.interestRate = Math.round(toNum(interestRate) * 100);
        payload.months = toNum(months);
        payload.downPayment = toCentsLocal(downPayment);
      }
      await api.post('/sales', payload);
      toast.success('تمت عملية البيع بنجاح! ✓', { id: toastId });
      
      
      setCart([]);
      setCustomerId('');
      const d = new Date();
      setSaleDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      setPaymentMethod('cash');
      setInterestRate('30');
      setMonths('12');
      setDownPayment('0');
    } catch (err) {
      const msg = err.response?.data?.error || err?.message || 'حدث خطأ أثناء إنشاء المبيعة';
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShoppingCart size={28} style={{ color: 'var(--accent)' }} />
          إنشاء مبيعة جديدة
        </h1>
        <p className="text-muted" style={{ margin: '0.4rem 0 0' }}>أضف المنتجات واختر طريقة الدفع لإتمام عملية البيع.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <User size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>البيانات الأساسية</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(130px, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>العميل</label>
                <select
                  value={customerId}
                  onChange={e => { setCustomerId(e.target.value); setErrors(er => e.target.value ? { ...er, customer: undefined } : er); }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', fontSize: '0.95rem',
                    border: errors.customer ? '1px solid var(--danger)' : '1px solid var(--border)'
                  }}
                >
                  <option value="">— اختر العميل —</option>
                  {customers.map(c => {
                    const cId = c.id || c._id;
                    return <option key={cId} value={cId}>{c.name} ({c.phone})</option>;
                  })}
                </select>
                {errors.customer && (
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} /> {errors.customer}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>تاريخ الفاتورة</label>
                <div style={{ position: 'relative' }}>
                   <input
                     type="date"
                     value={saleDate}
                     max={new Date().toISOString().split('T')[0]}
                     onChange={e => { setSaleDate(e.target.value); setErrors(er => e.target.value ? { ...er, saleDate: undefined } : er); }}
                     style={{
                       width: '100%', padding: '0.75rem 0.5rem', fontSize: '0.9rem',
                       border: errors.saleDate ? '1px solid var(--danger)' : '1px solid var(--border)'
                     }}
                   />
                </div>
                {errors.saleDate && (
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} /> {errors.saleDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <Package size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>المنتجات</h3>
            </div>
            <ProductSearch products={productsList} onAdd={addToCart} />
            {errors.products && (
              <p style={{ margin: '0.75rem 0 0', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertCircle size={14} /> {errors.products}
              </p>
            )}
            <div style={{ marginTop: '1.25rem', minHeight: '120px' }}>
              {cart.length === 0 ? (
                <div style={{ padding: '2.5rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                  اختر منتجاً لبدء عملية البيع
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>المنتج</th><th style={{ textAlign: 'center' }}>الكمية</th><th style={{ textAlign: 'left' }}>الإجمالي</th><th style={{ textAlign: 'center' }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item => (
                        <CartRow key={item.productId} item={item} product={pMap[item.productId]} onQtyChange={changeQty} onRemove={removeFromCart} onPriceChange={changePrice} priceError={errors[`price_${item.productId}`]} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>طريقة الدفع</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: paymentMethod === 'installment' ? '1.25rem' : 0 }}>
              {[['cash', 'نقدي (كاش)', 'var(--success)'], ['installment', 'تقسيط', 'var(--accent)']].map(([val, lbl, col]) => (
                <button
                  key={val} onClick={() => setPaymentMethod(val)}
                  style={{
                    padding: '0.75rem', borderRadius: '8px', fontWeight: '600',
                    border: `2px solid ${paymentMethod === val ? col : 'var(--border)'}`,
                    background: paymentMethod === val ? `rgba(var(--accent-rgb), 0.08)` : 'var(--input-bg)',
                    color: paymentMethod === val ? col : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >{lbl}</button>
              ))}
            </div>

            {paymentMethod === 'installment' && (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>نسبة الفائدة (%)</label>
                  <input type="text" value={interestRate} onChange={e => setInterestRate(normalizeNumberInput(e.target.value))} style={{ width: '100%', padding: '0.65rem' }} />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>عدد الأشهر</label>
                  <input type="text" value={months} onChange={e => setMonths(normalizeNumberInput(e.target.value))} style={{ width: '100%', padding: '0.65rem' }} />
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
                  <label style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: '600' }}>المقدم (اختياري)</label>
                  <input type="text" value={downPayment} onChange={e => setDownPayment(normalizeNumberInput(e.target.value))} style={{ width: '100%', padding: '0.65rem', direction: 'ltr' }} />
                  {dpError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{dpError}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>ملخص الطلب</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <SummaryRow label="السعر الأساسي" value={formatCurrency(subtotal)} />
            {paymentMethod === 'installment' && (
              <>
                <SummaryRow label={`الفائدة (${interestRate}%)`} value={`+${formatCurrency(interestAmount)}`} color="var(--warning)" />
                <SummaryRow label="الإجمالي بعد الفائدة" value={formatCurrency(finalAmount)} bold />
                {downPaymentNum > 0 && <SummaryRow label="المقدم" value={`-${formatCurrency(downPaymentNum)}`} color="var(--success)" />}
                <SummaryRow label="المتبقي" value={formatCurrency(remaining)} color="var(--accent)" bold highlight />
                <SummaryRow label={`القسط الشهري (${months} شهر)`} value={`${formatCurrency(monthly)} / شهر`} color="var(--accent)" />
              </>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>الإجمالي النهائي</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--success)' }}>
                    {formatCurrency(paymentMethod === 'installment' ? remaining : finalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ padding: '1rem', width: '100%', fontSize: '1.05rem' }}>
            {loading ? 'جاري المعالجة...' : 'تأكيد عملية البيع'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default memo(CreateSale);
