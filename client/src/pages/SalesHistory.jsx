import { useState, useEffect, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, AlertCircle, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/normalize';

const MOCK_SALES = [
  { id: 'm1', customer: { name: 'أحمد علي', id: 'c1' }, totalPrice: 5000, finalAmount: 5500, paymentMethod: 'installment', createdAt: new Date(Date.now() - 864000000).toISOString(), products: [{ product: { name: 'ثلاجة' }, quantity: 1 }] },
  { id: 'm2', customer: { name: 'محمد حسن', id: 'c2' }, totalPrice: 2000, finalAmount: 2000, paymentMethod: 'cash', createdAt: new Date(Date.now() - 172800000).toISOString(), products: [{ product: { name: 'غسالة' }, quantity: 1 }] },
  { id: 'm3', customer: { name: 'سارة أحمد', id: 'c3' }, totalPrice: 8000, finalAmount: 9000, paymentMethod: 'installment', createdAt: new Date().toISOString(), products: [{ product: { name: 'تكييف' }, quantity: 2 }] },
];

const PERIOD_OPTIONS = [
  { label: 'الكل', value: 'all' },
  { label: 'هذا الأسبوع', value: 'week' },
  { label: 'هذا الشهر', value: 'month' },
  { label: 'هذا العام', value: 'year' },
];


const SalesRow = memo(({ sale, onCancel }) => (
  <tr style={{ opacity: sale.status === 'cancelled' ? 0.6 : 1 }}>
    <td style={{ textAlign: 'left', direction: 'ltr', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>{sale.invoiceNumber || '—'}</td>
    <td style={{ fontWeight: '500' }}>{sale.customer?.name || 'غير معروف'}</td>
    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      {(sale.products || []).map(item => `${item.product?.name || '—'} ×${item.quantity}`).join('، ')}
    </td>
    <td>
      <span style={{
        padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
        background: sale.status === 'cancelled' ? 'rgba(239, 68, 68, 0.1)' : (sale.paymentMethod === 'cash' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)'),
        color: sale.status === 'cancelled' ? 'var(--danger)' : (sale.paymentMethod === 'cash' ? 'var(--success)' : 'var(--accent)')
      }}>
        {sale.status === 'cancelled' ? 'ملغاة' : (sale.paymentMethod === 'cash' ? 'نقدي' : 'تقسيط')}
      </span>
    </td>
    <td style={{ direction: 'ltr', textAlign: 'right' }}>{formatCurrency(sale.totalPrice)}</td>
    <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: '600', color: sale.status === 'cancelled' ? 'var(--text-muted)' : 'var(--success)' }}>{formatCurrency(sale.finalAmount || sale.totalPrice)}</td>
    <td style={{ color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right' }}>{formatDate(sale.createdAt)}</td>
    <td style={{ textAlign: 'center' }}>
      {sale.status !== 'cancelled' && (
        <button
          onClick={() => onCancel(sale)}
          className="action-btn-danger"
          title="إلغاء الفاتورة"
          style={{
            background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)',
            padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </td>
  </tr>
));

export default function SalesHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('id');

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchSales = async (signal) => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      if (!signal?.aborted) {
        setSales(res.data || []);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setIsOffline(true);
        setSales(MOCK_SALES);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchSales(controller.signal);
    return () => controller.abort();
  }, []);

  const handleCancelClick = (sale) => {
    setSaleToCancel(sale);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!saleToCancel || cancelling) return;
    try {
      setCancelling(true);
      await api.post(`/sales/${saleToCancel._id || saleToCancel.id}/cancel`);
      toast.success(`تم إلغاء الفاتورة ${saleToCancel.invoiceNumber || ''} بنجاح`);
      setShowCancelModal(false);
      setSaleToCancel(null);
      fetchSales();
    } catch (error) {
      console.error('Cancel Error:', error);
      toast.error(error.response?.data?.message || 'فشل في إلغاء الفاتورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setCancelling(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...sales];
    
    
    const now = new Date();
    if (period !== 'all') {
      result = result.filter(s => {
        const d = new Date(s.createdAt);
        if (period === 'week') {
          const weekAgo = new Date(now - 7 * 86400000);
          return d >= weekAgo;
        }
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === 'year') return d.getFullYear() === now.getFullYear();
        return true;
      });
    }

    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => 
          (s.customer?.name || '').toLowerCase().includes(q) ||
          (s.invoiceNumber || '').toLowerCase().includes(q)
      );
    }

    
    if (focusId) {
      result = result.filter(s => (s.id || s._id || '').toString() === focusId);
    }

    return result;
  }, [sales, period, search, focusId]);

  const totalFiltered = useMemo(() => 
    filtered.reduce((sum, s) => sum + (s.finalAmount || s.totalPrice || 0), 0),
    [filtered]
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} style={{ color: 'var(--success)' }} />
            سجل المبيعات
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>استعراض جميع المبيعات وتفاصيلها.</p>
        </div>

        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)', gap: '0.25rem' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{
              padding: '0.5rem 1rem', borderRadius: '6px',
              background: period === opt.value ? 'var(--success)' : 'transparent',
              color: period === opt.value ? 'white' : 'var(--text-muted)',
              fontWeight: period === opt.value ? '600' : '400',
              transition: 'all 0.2s', border: 'none', cursor: 'pointer'
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isOffline && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--warning)' }}>
          <AlertCircle size={20} /> الخادم غير متصل. يتم عرض بيانات تجريبية.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>إجمالي هذه الفترة</p>
          <h2 style={{ margin: '0.25rem 0 0', direction: 'ltr', color: 'var(--success)' }}>{formatCurrency(totalFiltered)}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>عدد المبيعات</p>
          <h2 style={{ margin: '0.25rem 0 0', direction: 'ltr' }}>{filtered.length}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>تقسيط</p>
          <h2 style={{ margin: '0.25rem 0 0', direction: 'ltr' }}>{filtered.filter(s => s.paymentMethod === 'installment').length}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>نقدي</p>
          <h2 style={{ margin: '0.25rem 0 0', direction: 'ltr' }}>{filtered.filter(s => s.paymentMethod === 'cash').length}</h2>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث باسم العميل أو رقم الفاتورة..."
          style={{ width: '100%', padding: '0.75rem 2.8rem 0.75rem 1rem' }}
        />
      </div>
      
      {focusId && (
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px', 
          border: '1px solid var(--success)', display: 'flex', justifyContent: 'space-between', 
          alignItems: 'center', marginBottom: '1.5rem' 
        }}>
          <div style={{ color: 'var(--success)', fontWeight: '600' }}>مبينة لعملية بيع محددة</div>
          <button 
            onClick={() => setSearchParams({})} 
            style={{ 
              background: 'var(--success)', color: 'white', padding: '0.4rem 1rem', 
              borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', border: 'none' 
            }}
          >
            عرض الكل
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>جاري تحميل المبيعات...</div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>رقم الفاتورة</th>
                <th>العميل</th>
                <th>المنتجات</th>
                <th>طريقة الدفع</th>
                <th style={{ textAlign: 'right' }}>المبلغ الأصلي</th>
                <th style={{ textAlign: 'right' }}>المبلغ النهائي</th>
                <th style={{ textAlign: 'right' }}>التاريخ</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => <SalesRow key={sale.id || sale._id} sale={sale} onCancel={handleCancelClick} />)}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد مبيعات مطابقة في هذه الفترة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            maxWidth: '450px', width: '90%', padding: '2.5rem',
            textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem', color: 'var(--danger)'
            }}>
              <Trash2 size={40} />
            </div>
            
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>تأكيد إلغاء الفاتورة</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              أنت على وشك إلغاء الفاتورة رقم <span style={{ color: 'var(--text-main)', fontWeight: '600', fontFamily: 'monospace' }}>{saleToCancel?.invoiceNumber}</span> للعميل <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{saleToCancel?.customer?.name}</span>.
            </p>
            
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--danger)',
              padding: '1rem', borderRadius: '8px', marginBottom: '2rem',
              textAlign: 'right', fontSize: '0.85rem', color: 'var(--danger)'
            }}>
              <strong>تنبيه:</strong> هذا الإجراء سيقوم باستعادة المنتجات للمخزون وعكس العمليات المالية المرتبطة. لا يمكن التراجع عن هذا الإجراء.
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                style={{
                  flex: 2, padding: '1rem', borderRadius: '12px', border: 'none',
                  background: 'var(--danger)', color: 'white', fontWeight: 'bold',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                {cancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء النهائي'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
                  fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
