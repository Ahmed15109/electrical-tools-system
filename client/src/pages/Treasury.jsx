import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DollarSign, AlertCircle, TrendingUp, TrendingDown,
  ShoppingCart, Calendar, Plus, PenLine, RotateCcw, X, Hash
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, normalizeNumberInput, toCentsLocal } from '../utils/normalize';
import toast from 'react-hot-toast';


const SOURCE_META = {
  sale:              { label: 'بيع',           icon: <ShoppingCart size={14} />, color: 'var(--success)' },
  installment:       { label: 'قسط',           icon: <Calendar size={14} />,     color: 'var(--accent)' },
  expense:           { label: 'مصروف',         icon: <TrendingDown size={14} />, color: 'var(--danger)' },
  manual:            { label: 'يدوي',          icon: <PenLine size={14} />,      color: 'var(--warning)' },
  refund:            { label: 'مرتجع',         icon: <RotateCcw size={14} />,    color: '#a78bfa' },
  purchase:          { label: 'شراء من مورد',  icon: <TrendingDown size={14} />, color: '#f97316' },
  supplier_payment:  { label: 'دفعة لمورد',   icon: <TrendingDown size={14} />, color: '#ef4444' },
};

const PERIOD_OPTIONS = [
  { label: 'الكل',        value: 'all' },
  { label: 'اليوم',       value: 'day' },
  { label: 'هذا الأسبوع', value: 'week' },
  { label: 'هذا الشهر',  value: 'month' },
];

function applyPeriodFilter(items, period) {
  const now = new Date();
  return items.filter(t => {
    const d = new Date(t.createdAt || t.paymentDate);
    if (period === 'day')  return d.toDateString() === now.toDateString();
    if (period === 'week') return d >= new Date(now - 7 * 86400000);
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}



const AddEntryModal = memo(({ onClose, onSaved }) => {
  const [mode, setMode] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedAmt = normalizeNumberInput(amount);
    if (!normalizedAmt || isNaN(Number(normalizedAmt)) || Number(normalizedAmt) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    
    const toastId = toast.loading('جاري حفظ القيد...');
    setLoading(true);
    try {
      await api.post(`/payments/${mode}`, { amount: toCentsLocal(normalizedAmt), description });
      toast.success('تم حفظ القيد بنجاح', { id: toastId });
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء الحفظ', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '420px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <h3 style={{ margin: '0 0 1.5rem 0' }}>إضافة قيد جديد</h3>

        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.25rem', marginBottom: '1.5rem', gap: '0.25rem' }}>
          <button onClick={() => setMode('expense')} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', background: mode === 'expense' ? 'var(--danger)' : 'transparent', color: mode === 'expense' ? 'white' : 'var(--text-muted)' }}>
            <TrendingDown size={14} style={{ marginLeft: '0.35rem' }} /> مصروف
          </button>
          <button onClick={() => setMode('manual')} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', background: mode === 'manual' ? 'var(--success)' : 'transparent', color: mode === 'manual' ? 'white' : 'var(--text-muted)' }}>
            <TrendingUp size={14} style={{ marginLeft: '0.35rem' }} /> إيداع
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>المبلغ *</label>
            <input type="text" value={amount} onChange={e => setAmount(normalizeNumberInput(e.target.value))} placeholder="0.00" style={{ width: '100%', padding: '0.75rem', direction: 'ltr' }} required disabled={loading} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>البيان / الوصف</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="الوصف..." style={{ width: '100%', padding: '0.75rem' }} disabled={loading} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)', padding: '0.5rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ القيد'}</button>
          </div>
        </form>
      </div>
    </div>
  );
});

const TreasuryRow = memo(({ t, onNavigateCustomer }) => {
  const isIn = t.type === 'in' || !t.type;
  const src = SOURCE_META[t.source] || SOURCE_META.manual;
  return (
    <tr style={{ opacity: t.isDeleted ? 0.4 : 1, textDecoration: t.isDeleted ? 'line-through' : 'none' }}>
      <td style={{ textAlign: 'left', direction: 'ltr', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
        {t.invoiceNumber || '—'}
      </td>
      <td>
        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600', background: t.isDeleted ? 'rgba(100,100,100,0.1)' : isIn ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: t.isDeleted ? '#888' : isIn ? 'var(--success)' : 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          {isIn ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {t.isDeleted ? 'ملغاة' : isIn ? 'وارد' : 'صادر'}
        </span>
      </td>
      <td>
        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '500', background: `${src.color}18`, color: src.color, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          {src.icon} {src.label}
        </span>
      </td>
      <td style={{ maxWidth: '220px', fontSize: '0.9rem' }}>
        {t.description || '—'}
        {t.isDeleted && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.2rem', textDecoration: 'none' }}>{t.cancelReason}</div>}
      </td>
      <td>
        {t.customer?.name ? (
          <button onClick={() => onNavigateCustomer(t.customer.id || t.customer._id)} style={{ color: 'var(--accent)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
            {t.customer.name}
          </button>
        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td style={{ fontWeight: '700', direction: 'ltr', textAlign: 'right', color: t.isDeleted ? 'inherit' : isIn ? 'var(--success)' : 'var(--danger)' }}>
        {isIn ? '+' : '-'}{(() => {
          console.log(`[Treasury] Row amount:`, t.amount);
          return formatCurrency(t.amount);
        })()}
      </td>
      <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: '500', color: t.isDeleted ? 'inherit' : 'var(--warning)' }}>
        {(() => {
          console.log(`[Treasury] Running balance:`, t.runningBalance);
          return formatCurrency(t.runningBalance);
        })()}
      </td>
      <td style={{ color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right', fontSize: '0.88rem' }}>
        {formatDate(t.createdAt || t.paymentDate)}
      </td>
    </tr>
  );
});

const TreasuryTable = memo(({ transactions, onNavigateCustomer }) => {
  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
        لا توجد معاملات تطابق الفلاتر المحددة.
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>رقم المعاملة</th>
            <th>النوع</th><th>المصدر</th><th>الوصف</th><th>العميل</th><th>المبلغ</th><th>الرصيد بعد العملية</th><th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, idx) => (
            <TreasuryRow key={t.id || idx} t={t} onNavigateCustomer={onNavigateCustomer} />
          ))}
        </tbody>
      </table>
    </div>
  );
});


const Treasury = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('id');

  const [transactions, setTransactions] = useState([]);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [summaryIn, setSummaryIn] = useState(0);
  const [summaryOut, setSummaryOut] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [period, setPeriod] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showCanceled, setShowCanceled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [treasuryRes, paymentsRes] = await Promise.all([
        api.get('/stats/treasury'),
        api.get('/payments')
      ]);

      const { data: treasuryData } = treasuryRes;
      const { data: paymentsData } = paymentsRes;

      setVaultBalance(Number(treasuryData.balance) || 0);
      setSummaryIn(Number(treasuryData.totalIn) || 0);
      setSummaryOut(Number(treasuryData.totalOut) || 0);

      
      const rawPayments = Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || []);
      const payments = rawPayments.map(p => ({ ...p, amount: Number(p.amount) || 0 }));
      setTransactions(payments);
    } catch (err) {
      console.error('[Treasury] Fetch failed:', err);
      toast.error('فشل تحميل بيانات الخزنة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const withBalance = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.createdAt || a.paymentDate) - new Date(b.createdAt || b.paymentDate)
    );
    let running = 0;
    return sorted.map(t => {
      const isIn = t.type === 'in' || !t.type;
      const amt = Number(t.amount) || 0;
      if (!t.isDeleted) {
          running = isIn ? running + amt : running - amt;
      }
      return { ...t, runningBalance: running };
    }).reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    let base = applyPeriodFilter(withBalance, period).filter(t => {
      if (!showCanceled && t.isDeleted) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;
      return true;
    });

    
    if (focusId) {
      base = base.filter(t => (t.id || t._id || '').toString() === focusId);
    }

    if (searchParams.get('q')) {
      const q = searchParams.get('q').toLowerCase();
      base = base.filter(t => 
        (t.invoiceNumber || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }

    return base;
  }, [withBalance, period, typeFilter, sourceFilter, focusId]);

  const handleNavigateCustomer = useCallback((id) => {
    navigate(`/customers/${id}/statement`);
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
      {showModal && (
        <AddEntryModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData(); }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem' }}>
            <DollarSign size={32} style={{ color: 'var(--warning)' }} /> الخزنة والمعاملات
          </h1>
          <p className="text-muted" style={{ margin: '0.4rem 0 0 0' }}>كشف شامل لكل الأموال الواردة والصادرة.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> إضافة قيد يدوي
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem', borderRight: '4px solid var(--warning)' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>الرصيد الكلي</p>
          <h2 style={{ margin: 0, color: 'var(--warning)', direction: 'ltr' }}>
            {(() => {
              console.log("[Treasury] vaultBalance RAW:", vaultBalance);
              return formatCurrency(vaultBalance);
            })()}
          </h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.2rem', borderRight: '4px solid var(--success)' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>إجمالي الوارد</p>
          <h2 style={{ margin: 0, color: 'var(--success)', direction: 'ltr' }}>
            {(() => {
              console.log("[Treasury] summaryIn RAW:", summaryIn);
              return formatCurrency(summaryIn);
            })()}
          </h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.2rem', borderRight: '4px solid var(--danger)' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>إجمالي الصادر</p>
          <h2 style={{ margin: 0, color: 'var(--danger)', direction: 'ltr' }}>
            {(() => {
              console.log("[Treasury] summaryOut RAW:", summaryOut);
              return formatCurrency(summaryOut);
            })()}
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '0.8rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: '8px' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', background: period === opt.value ? 'var(--warning)' : 'transparent', color: period === opt.value ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>{opt.label}</button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px' }}>
          <option value="all">كل الأنواع</option>
          <option value="in">الوارد فقط</option>
          <option value="out">الصادر فقط</option>
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px' }}>
          <option value="all">كل المصادر</option>
          {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '0.45rem 0.8rem', borderRadius: '8px' }}>
          <input type="checkbox" checked={showCanceled} onChange={e => setShowCanceled(e.target.checked)} style={{ cursor: 'pointer' }} />
          إظهار المعاملات الملغاة
        </label>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.2rem 0.5rem', flex: 1, minWidth: '200px' }}>
           <input
             type="text"
             placeholder="بحث برقم المعاملة أو الوصف..."
             value={searchParams.get('q') || ''}
             onChange={e => {
               if (e.target.value) { searchParams.set('q', e.target.value); }
               else { searchParams.delete('q'); }
               setSearchParams(searchParams);
             }}
             style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', padding: '0.4rem', fontSize: '0.85rem' }}
           />
        </div>
      </div>
      
      {focusId && (
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)', padding: '0.85rem 1.25rem', borderRadius: '10px', 
          border: '1px solid var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)' }}>
            <Hash size={18} />
            <span>عرض حركة محددة من لوحة التحكم</span>
          </div>
          <button 
            onClick={() => setSearchParams({})} 
            style={{ 
              background: 'var(--accent)', color: 'white', padding: '0.4rem 1rem', 
              borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' 
            }}
          >
            إظهار كل المعاملات
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>جاري تحميل المعاملات...</div>
      ) : (
        <TreasuryTable transactions={filtered} onNavigateCustomer={handleNavigateCustomer} />
      )}
    </div>
  );
};

export default memo(Treasury);
