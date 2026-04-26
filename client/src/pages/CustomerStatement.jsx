import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight, User, Phone, MapPin, AlertCircle,
  ShoppingCart, CreditCard, Wallet, Clock,
  Calendar, CheckCircle, Download
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, formatNumber } from '../utils/normalize';

const MOCK = {
  customer: { id: 'x', name: 'أحمد الشافعي (تجريبي)', phone: '01000000000', address: 'القاهرة', balance: 3200 },
  summary: { totalSales: 8000, totalPaid: 4800, balance: 3200, overdueCount: 2 },
  transactions: [
    { id: 't1', date: new Date(Date.now() - 86400000 * 30).toISOString(), type: 'sale',    description: 'بيع - ثلاجة ×1',  debit: 5000, credit: 0,    balance: 5000 },
    { id: 't2', date: new Date(Date.now() - 86400000 * 25).toISOString(), type: 'payment', description: 'دفعة',            debit: 0,    credit: 1500, balance: 3500 },
    { id: 't3', date: new Date(Date.now() - 86400000 * 10).toISOString(), type: 'sale',    description: 'بيع - غسالة ×1',  debit: 3000, credit: 0,    balance: 6500 },
    { id: 't4', date: new Date(Date.now() - 86400000 * 5).toISOString(),  type: 'payment', description: 'دفعة قسط',       debit: 0,    credit: 3300, balance: 3200 },
  ],
  installments: [
    { id: 'i1', amount: 800, dueDate: new Date(Date.now() - 86400000 * 5).toISOString(),  status: 'pending' },
    { id: 'i2', amount: 800, dueDate: new Date(Date.now() + 86400000 * 25).toISOString(), status: 'pending' },
    { id: 'i3', amount: 800, dueDate: new Date(Date.now() - 86400000 * 35).toISOString(), status: 'paid', paidAt: new Date(Date.now() - 86400000 * 34).toISOString() },
  ]
};

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

export default function CustomerStatement() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search,     setSearch]     = useState('');
  const [showCanceled, setShowCanceled] = useState(false);
  const [printing,   setPrinting]   = useState(false);
  const [pdfStatus,  setPdfStatus]  = useState(null); 

  const printPDF = async () => {
    if (!data) return;
    setPrinting(true);
    setPdfStatus(null);
    try {
      const result = await window.api.pdf.generate({
        customer:     data.customer,
        summary:      data.summary,
        transactions: data.transactions,
        installments: data.installments,
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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setOffline(false);
        const res = await api.get(`/customers/${id}/statement`);

        
        const payload = res.data;
        console.log('[CustomerStatement] API response:', payload);

        if (!payload.customer) throw new Error('empty response');

        setData({
          customer:     payload.customer,
          summary:      payload.summary      || { totalSales: 0, totalPaid: 0, balance: 0, overdueCount: 0 },
          transactions: payload.transactions || [],
          installments: payload.installments || [],
        });
      } catch (err) {
        console.warn('[CustomerStatement] API failed — using mock:', err.message);
        setOffline(true);
        setData(MOCK);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter(t => {
      if (!showCanceled && t.isDeleted) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchInv = t.invoiceNumber?.toLowerCase().includes(q);
        if (!matchDesc && !matchInv) return false;
      }
      return true;
    });
  }, [data, typeFilter, search, showCanceled]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)', gap: '1rem' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite'
        }} />
        جاري تحميل كشف الحساب...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      لم يتم العثور على بيانات هذا العميل.
    </div>
  );

  const { customer, summary, installments } = data;
  const isInDebt = (summary.balance || 0) > 0;

  return (
    <div style={{ maxWidth: '1050px' }}>

      {}
      {offline && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)',
          padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: 'var(--warning)', fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} /> الخادم غير متصل — يتم عرض بيانات تجريبية.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/customers')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            cursor: 'pointer', transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowRight size={16} /> رجوع
        </button>
        <h1 style={{ margin: 0, fontSize: '1.4rem', flex: 1 }}>كشف حساب — ملف العميل</h1>

        {}
        <button
          onClick={printPDF}
          disabled={printing}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', fontSize: '0.92rem', cursor: printing ? 'wait' : 'pointer',
            opacity: printing ? 0.7 : 1, transition: 'opacity 0.2s'
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
      </div>

      <div className="glass-panel" style={{
        padding: '1.75rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1.5rem',
        borderRight: `4px solid ${isInDebt ? 'var(--danger)' : 'var(--success)'}`
      }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(59,130,246,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            <User size={28} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem' }}>{customer.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {customer.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={14} /> {customer.phone}
                </span>
              )}
              {customer.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={14} /> {customer.address}
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
            background: isInDebt ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            color: isInDebt ? 'var(--danger)' : 'var(--success)',
            fontWeight: '800', fontSize: '1.4rem', direction: 'ltr'
          }}>
            {formatCurrency(Math.abs(summary.balance || 0))}
          </div>
          <div style={{ color: isInDebt ? 'var(--danger)' : 'var(--success)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
            {isInDebt ? '● العميل عليه رصيد' : '● العميل خالص'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <SCard icon={<ShoppingCart size={16}/>} label="إجمالي المشتريات"   value={formatCurrency(summary.totalSales)}   color="var(--danger)"  />
        <SCard icon={<CreditCard size={16}/>}   label="إجمالي المدفوع"     value={formatCurrency(summary.totalPaid)}    color="var(--success)" />
        <SCard icon={<Wallet size={16}/>}        label="المتبقي"            value={formatCurrency(summary.balance || 0)} color={isInDebt ? 'var(--warning)' : 'var(--success)'} />
        <SCard icon={<Clock size={16}/>}         label="أقساط متأخرة"      value={formatNumber(summary.overdueCount)}  color="var(--danger)"  />
      </div>

      {}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>كشف الحساب</h3>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: '0.2rem', borderRadius: '8px', gap: '0.15rem' }}>
              {[['all','الكل'], ['sale','مشتريات'], ['payment','مدفوعات']].map(([val, lbl]) => (
                <button key={val} onClick={() => setTypeFilter(val)} style={{
                  padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem',
                  background: typeFilter === val ? 'var(--accent)' : 'transparent',
                  color: typeFilter === val ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>
                  {lbl}
                </button>
              ))}
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={showCanceled} onChange={e => setShowCanceled(e.target.checked)} style={{ cursor: 'pointer' }} />
              إظهار المعاملات الملغاة
            </label>

            {}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الوصف..."
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', width: '180px' }}
            />
          </div>
        </div>

        {}
        {data.transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            لا يوجد تعاملات لهذا العميل حتى الآن.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr style={{ background: 'var(--th-bg)', boxShadow: '0 1px 0 var(--th-border)' }}>
                  <th>التاريخ</th>
                  <th style={{ textAlign: 'left' }}>رقم المعاملة</th>
                  <th>نوع العملية</th>
                  <th>البيان</th>
                  <th style={{ textAlign: 'left', color: 'var(--danger)' }}>عليه 🛒</th>
                  <th style={{ textAlign: 'left', color: 'var(--success)' }}>دفع 💰</th>
                  <th style={{ textAlign: 'left' }}>الرصيد بعد العملية</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td style={{ color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                      {formatDate(t.date)}
                    </td>
                    <td style={{ textAlign: 'left', direction: 'ltr', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                      {t.invoiceNumber || '—'}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700',
                        background: t.type === 'sale' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: t.type === 'sale' ? 'var(--danger)' : 'var(--success)',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                      }}>
                        {t.type === 'sale' ? '🛒 شراء' : '💰 دفعة'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem', maxWidth: '260px' }}>{t.description || '—'}</td>
                    <td style={{ textAlign: 'left', direction: 'ltr', fontWeight: '600', color: (t.debit || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {(t.debit || 0) > 0 ? formatCurrency(t.debit) : '—'}
                    </td>
                    <td style={{ textAlign: 'left', direction: 'ltr', fontWeight: '600', color: (t.credit || 0) > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {(t.credit || 0) > 0 ? formatCurrency(t.credit) : '—'}
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

      {}
      {installments.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={20} style={{ color: 'var(--accent)' }} /> جدول الأقساط
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>تاريخ الاستحقاق</th>
                  <th style={{ textAlign: 'left' }}>المبلغ</th>
                  <th>الحالة</th>
                  <th>تاريخ الدفع</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst, idx) => {
                  const now = new Date();
                  const overdue = inst.status === 'pending' && new Date(inst.dueDate) < now;
                  return (
                    <tr key={inst.id} style={{ background: overdue ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{
                        direction: 'ltr', textAlign: 'right',
                        color: overdue ? 'var(--danger)' : 'var(--text-main)',
                        fontWeight: overdue ? '600' : '400'
                      }}>
                        {formatDate(inst.dueDate)}
                        {overdue && <span style={{ marginRight: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}>⚠ متأخر</span>}
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(inst.amount)}
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
                          background: inst.status === 'paid' ? 'rgba(16,185,129,0.1)' : overdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          color: inst.status === 'paid' ? 'var(--success)' : overdue ? 'var(--danger)' : 'var(--warning)',
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                        }}>
                          {inst.status === 'paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {inst.status === 'paid' ? 'مدفوع' : overdue ? 'متأخر' : 'معلق'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right', fontSize: '0.88rem' }}>
                        {inst.paidAt ? formatDate(inst.paidAt) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/installments" style={{ color: 'var(--accent)', fontSize: '0.88rem', textDecoration: 'underline' }}>
              عرض كل الأقساط ←
            </Link>
          </div>
        </div>
      )}

      {}
      <div id="pdf-print-area" style={{ display: 'none' }}>
        <style>{`
          @media print {
            /* Hide the entire app shell */
            body > * { display: none !important; }
            /* Show only the print area */
            #pdf-print-area { display: block !important; }

            /* Reset to clean white A4 */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: white !important; color: #111 !important;
                   font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }
            #pdf-print-area {
              display: block; padding: 32px 40px;
              max-width: 100%; background: white;
            }

            /* Header */
            .p-header { border-bottom: 2px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 20px; }
            .p-title  { font-size: 22px; font-weight: 800; color: #1e3a5f; }
            .p-sub    { font-size: 13px; color: #555; margin-top: 4px; }
            .p-info   { font-size: 13px; color: #333; margin-top: 8px; }

            /* Summary grid */
            .p-summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 20px 0; }
            .p-scard   { border: 1px solid #dde; border-radius: 8px; padding: 12px; background: #f7f9ff; }
            .p-scard-label { font-size: 11px; color: #666; margin-bottom: 4px; }
            .p-scard-val   { font-size: 16px; font-weight: 700; direction: ltr; text-align: right; }

            /* Tables */
            .p-section-title { font-size: 15px; font-weight: 700; color: #1e3a5f;
                               border-right: 3px solid #1e3a5f; padding-right: 8px;
                               margin: 20px 0 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #1e3a5f; color: white; padding: 8px 10px;
                 text-align: right; font-weight: 600; }
            td { padding: 7px 10px; border-bottom: 1px solid #e8eaf0; text-align: right; }
            tr:nth-child(even) td { background: #f7f9ff; }
            .p-badge-sale    { color: #c0392b; font-weight: 600; }
            .p-badge-payment { color: #27ae60; font-weight: 600; }
            .p-debit  { color: #c0392b; font-weight: 700; direction: ltr; }
            .p-credit { color: #27ae60; font-weight: 700; direction: ltr; }
            .p-bal    { font-weight: 700; direction: ltr; }
            .p-overdue { color: #c0392b; }
            .p-paid    { color: #27ae60; }
            .p-pending { color: #d97706; }

            /* Footer */
            .p-footer { margin-top: 24px; border-top: 1px solid #ccd; padding-top: 12px;
                        font-size: 11px; color: #888; display: flex; justify-content: space-between; }
          }
        `}</style>

        {}
        <div className="p-header">
          <div className="p-title">كشف حساب عميل</div>
          <div className="p-sub">
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="p-info">
            <strong>العميل:</strong> {customer?.name} &nbsp;|
            {customer?.phone && <> &nbsp;هاتف: {customer.phone} &nbsp;|</>}
            {customer?.address && <> &nbsp;العنوان: {customer.address}</>}
          </div>
        </div>

        {}
        <div className="p-summary">
          <div className="p-scard">
            <div className="p-scard-label">إجمالي المشتريات</div>
            <div className="p-scard-val" style={{ color: '#c0392b' }}>{formatCurrency(summary.totalSales)}</div>
          </div>
          <div className="p-scard">
            <div className="p-scard-label">إجمالي المدفوع</div>
            <div className="p-scard-val" style={{ color: '#27ae60' }}>{formatCurrency(summary.totalPaid)}</div>
          </div>
          <div className="p-scard">
            <div className="p-scard-label">الرصيد المتبقي</div>
            <div className="p-scard-val" style={{ color: isInDebt ? '#c0392b' : '#27ae60' }}>{formatCurrency(Math.abs(summary.balance || 0))}</div>
          </div>
          <div className="p-scard">
            <div className="p-scard-label">أقساط متأخرة</div>
            <div className="p-scard-val" style={{ color: '#c0392b' }}>{summary.overdueCount ?? 0}</div>
          </div>
        </div>

        {}
        {data.transactions.length > 0 && (
          <>
            <div className="p-section-title">كشف الحساب التفصيلي</div>
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th style={{ textAlign: 'left' }}>رقم المعاملة</th>
                  <th>نوع العملية</th>
                  <th>الوصف</th>
                  <th>مدين (عليه)</th>
                  <th>دائن (دفع)</th>
                  <th>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td style={{ direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                    <td style={{ textAlign: 'left', direction: 'ltr', fontFamily: 'monospace' }}>{t.invoiceNumber || '—'}</td>
                    <td className={t.type === 'sale' ? 'p-badge-sale' : 'p-badge-payment'}>
                      {t.type === 'sale' ? 'بيع' : 'دفعة'}
                    </td>
                    <td>{t.description || '—'}</td>
                    <td className="p-debit">{(t.debit || 0) > 0 ? formatCurrency(t.debit) : '—'}</td>
                    <td className="p-credit">{(t.credit || 0) > 0 ? formatCurrency(t.credit) : '—'}</td>
                    <td className="p-bal">{formatCurrency(Math.abs(t.balance || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {}
        {installments.length > 0 && (
          <>
            <div className="p-section-title">جدول الأقساط</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>تاريخ الدفع</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst, idx) => {
                  const overdue = inst.status === 'pending' && new Date(inst.dueDate) < new Date();
                  return (
                    <tr key={inst.id || idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td className={overdue ? 'p-overdue' : ''} style={{ direction: 'ltr', textAlign: 'right' }}>
                        {formatDate(inst.dueDate)}{overdue && ' ⚠ متأخر'}
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(inst.amount)}</td>
                      <td className={inst.status === 'paid' ? 'p-paid' : overdue ? 'p-overdue' : 'p-pending'}>
                        {inst.status === 'paid' ? 'مدفوع' : overdue ? 'متأخر' : 'معلق'}
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right' }}>
                        {inst.paidAt ? formatDate(inst.paidAt) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {}
        <div className="p-footer">
          <span>توليدته المنظومة— {new Date().toLocaleString('ar-EG')}</span>
          <span>سري وخاص بالعميل</span>
        </div>
      </div>

    </div>
  );
}
