import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Truck, Phone, AlertCircle,
  ShoppingBag, CreditCard, Wallet,
  TrendingUp, TrendingDown, DollarSign, Download
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, toCentsLocal } from '../utils/normalize';

function SCard({ icon, label, value, color }) {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{label}</span>
      </div>
      <div style={{ direction: 'ltr', fontWeight: '700', fontSize: '1.2rem', color }}>{value}</div>
    </div>
  );
}

export default function SupplierStatement() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  
  const [printing, setPrinting] = useState(false);
  const [pdfStatus, setPdfStatus] = useState(null);

  const printPDF = async () => {
    if (!data) return;
    setPrinting(true);
    setPdfStatus(null);
    try {
      const result = await window.api.pdf.generate({
        supplier: data.supplier,
        summary: data.summary,
        transactions: data.transactions,
        
      });
      if (result?.success) {
        setPdfStatus('ok');
      } else if (result?.reason !== 'cancelled') {
        setPdfStatus('err');
      }
    } catch (e) {
      console.error('[PDF] generation failed:', e);
      setPdfStatus('err');
    } finally {
      setPrinting(false);
      setTimeout(() => setPdfStatus(null), 4000);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/suppliers/${id}/statement`);
      const payload = res.data;
      console.log('[SupplierStatement] API response:', payload);

      if (!payload.supplier) throw new Error('empty response');

      setData({
        supplier: payload.supplier,
        summary: payload.summary || { totalPurchases: 0, totalPaid: 0, balance: 0 },
        transactions: payload.transactions || [],
      });
    } catch (err) {
      console.error('[SupplierStatement] API failed:', err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchInv = t.invoiceNumber?.toLowerCase().includes(q);
        if (!matchDesc && !matchInv) return false;
      }
      return true;
    });
  }, [data, typeFilter, search]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      return;
    }

    setPayLoading(true);
    try {
      await api.post('/purchases/supplier-payment', {
        supplier: id,
        amount: toCentsLocal(payAmount),
        description: payDesc || 'دفعة للمورد'
      });
      setShowPayment(false);
      setPayAmount('');
      setPayDesc('');
      await fetchData(); 
    } catch (err) {
      console.error('[SupplierStatement] Payment Error:', err);
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)', gap: '1rem' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '3px solid var(--border)', borderTopColor: '#a855f7',
          animation: 'spin 0.8s linear infinite'
        }} />
        جاري تحميل كشف حساب المورد...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      لم يتم العثور على بيانات هذا المورد.
    </div>
  );

  const { supplier, summary } = data;
  const hasDebt = (summary.balance || 0) > 0;

  return (
    <div style={{ maxWidth: '1050px', padding: '1rem' }}>

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/suppliers')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            cursor: 'pointer', transition: 'color 0.2s'
          }}
        >
          <ArrowRight size={16} /> رجوع
        </button>
        <h1 style={{ margin: 0, fontSize: '1.4rem', flex: 1 }}>كشف حساب المورد</h1>

        {}
        <button
          onClick={printPDF}
          disabled={printing}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', fontSize: '0.92rem', cursor: printing ? 'wait' : 'pointer',
            opacity: printing ? 0.7 : 1, transition: 'opacity 0.2s',
            background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)'
          }}
        >
          <Download size={16} />
          {printing ? 'جاري التصدير...' : 'تحميل PDF'}
        </button>

        {}
        {pdfStatus === 'ok' && (
          <span style={{
            fontSize: '0.85rem', padding: '0.4rem 0.85rem', borderRadius: '8px',
            background: 'rgba(16,185,129,0.12)', color: 'var(--success)',
            border: '1px solid rgba(16,185,129,0.25)', whiteSpace: 'nowrap'
          }}>
            ✓ تم الحفظ بنجاح
          </span>
        )}
        {pdfStatus === 'err' && (
          <span style={{
            fontSize: '0.85rem', padding: '0.4rem 0.85rem', borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
            border: '1px solid rgba(239,68,68,0.25)', whiteSpace: 'nowrap'
          }}>
            ✗ فشل التصدير
          </span>
        )}

        {}
        <button
          onClick={() => setShowPayment(!showPayment)}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', fontSize: '0.92rem'
          }}
        >
          <DollarSign size={16} />
          دفع للمورد
        </button>
      </div>

      {}
      {showPayment && (
        <div className="glass-panel" style={{
          padding: '1.5rem', marginBottom: '1.5rem',
          borderRight: '4px solid var(--success)',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--success)' }}>تسجيل دفعة للمورد</h3>
          <form onSubmit={handlePayment} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>المبلغ *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0.00"
                required
                style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
              />
            </div>
            <div style={{ flex: '2 1 300px' }}>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>الوصف</label>
              <input
                type="text"
                value={payDesc}
                onChange={e => setPayDesc(e.target.value)}
                placeholder="دفعة للمورد"
                style={{ width: '100%' }}
              />
            </div>
            <button type="submit" disabled={payLoading} className="btn-primary" style={{
              padding: '0.55rem 1.25rem', cursor: payLoading ? 'wait' : 'pointer',
              opacity: payLoading ? 0.7 : 1
            }}>
              {payLoading ? 'جاري الدفع...' : 'تأكيد الدفع'}
            </button>
          </form>
          <style>{`@keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
      )}

      {}
      <div className="glass-panel" style={{
        padding: '1.75rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1.5rem',
        borderRight: `4px solid ${hasDebt ? 'var(--danger)' : 'var(--success)'}`
      }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(168,85,247,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#a855f7'
          }}>
            <Truck size={28} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem' }}>{supplier.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {supplier.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={14} /> {supplier.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.35rem' }}>الرصيد الحالي</div>
          <div style={{
            padding: '0.6rem 1.5rem', borderRadius: '100px',
            background: hasDebt ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            color: hasDebt ? 'var(--danger)' : 'var(--success)',
            fontWeight: '800', fontSize: '1.4rem', direction: 'ltr'
          }}>
            {formatCurrency(Math.abs(summary.balance || 0))}
          </div>
          <div style={{ color: hasDebt ? 'var(--danger)' : 'var(--success)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
            {hasDebt ? '● عليك رصيد للمورد' : '● المورد خالص'}
          </div>
        </div>
      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <SCard icon={<ShoppingBag size={16}/>} label="إجمالي المشتريات" value={formatCurrency(summary.totalPurchases)} color="var(--danger)" />
        <SCard icon={<CreditCard size={16}/>} label="إجمالي المدفوع (دفعت)" value={formatCurrency(summary.totalPaid)} color="var(--success)" />
        <SCard icon={<Wallet size={16}/>} label="المتبقي (عليك)" value={formatCurrency(summary.balance || 0)} color={hasDebt ? 'var(--warning)' : 'var(--success)'} />
      </div>

      {}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>كشف الحساب</h3>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: '0.2rem', borderRadius: '8px', gap: '0.15rem' }}>
              {[['all','الكل'], ['purchase','مشتريات'], ['payment','مدفوعات']].map(([val, lbl]) => (
                <button key={val} onClick={() => setTypeFilter(val)} style={{
                  padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem',
                  background: typeFilter === val ? '#a855f7' : 'transparent',
                  color: typeFilter === val ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>
                  {lbl}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الوصف..."
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', width: '180px' }}
            />
          </div>
        </div>

        {data.transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            لا يوجد تعاملات لهذا المورد حتى الآن.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.95)' }}>
                  <th>التاريخ</th>
                  <th style={{ textAlign: 'left' }}>رقم المعاملة</th>
                  <th>نوع العملية</th>
                  <th>البيان</th>
                  <th style={{ textAlign: 'left', color: 'var(--danger)' }}>عليك 🛒</th>
                  <th style={{ textAlign: 'left', color: 'var(--success)' }}>دفعت 💰</th>
                  <th style={{ textAlign: 'left' }}>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr key={t._id || t.id || idx}>
                    <td style={{ color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                      {formatDate(t.date)}
                    </td>
                    <td style={{ textAlign: 'left', direction: 'ltr', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                      {t.invoiceNumber || '—'}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700',
                        background: t.type === 'purchase' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: t.type === 'purchase' ? 'var(--danger)' : 'var(--success)',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                      }}>
                        {t.type === 'purchase' ? <><TrendingUp size={12} /> شراء</> : <><TrendingDown size={12} /> دفعة</>}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem', maxWidth: '260px' }}>{t.description || '—'}</td>
                    <td style={{ textAlign: 'left', direction: 'ltr', fontWeight: '600', color: (t.owed || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {(t.owed || 0) > 0 ? formatCurrency(t.owed) : '—'}
                    </td>
                    <td style={{ textAlign: 'left', direction: 'ltr', fontWeight: '600', color: (t.paid || 0) > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {(t.paid || 0) > 0 ? formatCurrency(t.paid) : '—'}
                    </td>
                    <td style={{
                      textAlign: 'left', direction: 'ltr', fontWeight: '700',
                      color: (t.balance || 0) > 0 ? 'var(--warning)' : (t.balance || 0) < 0 ? 'var(--success)' : 'var(--text-muted)'
                    }}>
                      {formatCurrency(Math.abs(t.balance || 0))}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && data.transactions.length > 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      لا توجد معاملات تطابق الفلاتر المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
