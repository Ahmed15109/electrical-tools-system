import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight, User, Phone, MapPin, AlertCircle,
  ShoppingCart, CreditCard, Wallet, Clock,
  TrendingUp, TrendingDown, Calendar, CheckCircle, FileText
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, formatNumber } from '../utils/normalize';


const MOCK = {
  customer: { id: 'x', name: 'أحمد علي', phone: '01000000000', address: 'القاهرة', balance: 3200 },
  summary: { totalSales: 8000, totalPaid: 4800, balance: 3200, overdueCount: 2 },
  transactions: [
    { id: 't1', date: new Date(Date.now() - 86400000 * 30).toISOString(), type: 'sale',    description: 'بيع - ثلاجة ×1',  debit: 5000, credit: 0,    balance: 5000 },
    { id: 't2', date: new Date(Date.now() - 86400000 * 25).toISOString(), type: 'payment', description: 'دفعة قسط',        debit: 0,    credit: 1500, balance: 3500 },
    { id: 't3', date: new Date(Date.now() - 86400000 * 10).toISOString(), type: 'sale',    description: 'بيع - غسالة ×1',  debit: 3000, credit: 0,    balance: 6500 },
    { id: 't4', date: new Date(Date.now() - 86400000 * 5).toISOString(),  type: 'payment', description: 'دفعة قسط',        debit: 0,    credit: 3300, balance: 3200 },
  ],
  installments: [
    { id: 'i1', amount: 800, dueDate: new Date(Date.now() - 86400000 * 5).toISOString(),  status: 'pending' },
    { id: 'i2', amount: 800, dueDate: new Date(Date.now() + 86400000 * 25).toISOString(), status: 'pending' },
    { id: 'i3', amount: 800, dueDate: new Date(Date.now() - 86400000 * 35).toISOString(), status: 'paid',    paidAt: new Date(Date.now() - 86400000 * 34).toISOString() },
  ]
};


function SummaryCard({ icon, label, value, color, topColor }) {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', borderTop: `3px solid ${topColor || color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{label}</span>
      </div>
      <div style={{ direction: 'ltr', fontWeight: '700', fontSize: '1.2rem', color }}>
        {value}
      </div>
    </div>
  );
}


export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setIsOffline(false);
        const res = await api.get(`/customers/${id}/statement`);
        const payload = res.data;
        console.log('[CustomerProfile] API response:', payload);

        if (!payload.customer) throw new Error('empty response');

        setData({
          customer:     payload.customer,
          summary:      payload.summary      || { totalSales: 0, totalPaid: 0, balance: 0, overdueCount: 0 },
          transactions: payload.transactions || [],
          installments: payload.installments || [],
        });
      } catch (err) {
        console.warn('[CustomerProfile] API failed — using mock:', err.message);
        setIsOffline(true);
        setData(MOCK);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, typeFilter, search]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)', gap: '1rem' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        جاري تحميل ملف العميل...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return null;

  const { customer, summary, installments } = data;
  const isInDebt = summary.balance > 0;

  return (
    <div style={{ maxWidth: '1050px' }}>

      {}
      {isOffline && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--warning)', fontSize: '0.9rem' }}>
          <AlertCircle size={18} /> الخادم غير متصل. يتم عرض بيانات تجريبية.
        </div>
      )}

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/customers')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            transition: 'all 0.2s', cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowRight size={16} /> رجوع
        </button>
        <h1 style={{ margin: 0, fontSize: '1.4rem', flex: 1 }}>ملف العميل</h1>

        {}
        <button
          onClick={() => navigate(`/customers/${id}/statement`)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer',
            background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
            border: '1px solid rgba(99,102,241,0.25)', fontSize: '0.92rem',
            fontWeight: '600', transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <FileText size={16} /> كشف الحساب
        </button>
      </div>

      {}
      <div className="glass-panel" style={{
        padding: '1.75rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1.5rem',
        borderRight: `4px solid ${isInDebt ? 'var(--danger)' : 'var(--success)'}`
      }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(59,130,246,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
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
            {formatCurrency(Math.abs(summary.balance))}
          </div>
          <div style={{ color: isInDebt ? 'var(--danger)' : 'var(--success)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
            {isInDebt ? '● العميل دائن' : '● العميل خالص'}
          </div>
        </div>
      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <SummaryCard icon={<ShoppingCart size={16} />} label="إجمالي المشتريات"       value={formatCurrency(summary.totalSales)} color="var(--danger)"   />
        <SummaryCard icon={<CreditCard size={16} />}   label="إجمالي المدفوع"         value={formatCurrency(summary.totalPaid)}  color="var(--success)"  />
        <SummaryCard icon={<Wallet size={16} />}       label="المتبقي (الرصيد)"       value={formatCurrency(summary.balance)}    color={isInDebt ? 'var(--warning)' : 'var(--success)'} />
        <SummaryCard icon={<Clock size={16} />}        label="أقساط متأخرة"           value={formatNumber(summary.overdueCount)} color="var(--danger)"   />
      </div>

      {}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>كشف الحساب</h3>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: '0.2rem', borderRadius: '8px', gap: '0.15rem' }}>
              {[['all','الكل'],['sale','مبيعات'],['payment','مدفوعات']].map(([val, lbl]) => (
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

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: 'rgba(15,23,42,0.95)', zIndex: 10 }}>
                <th>التاريخ</th>
                <th>نوع العملية</th>
                <th>الوصف</th>
                <th style={{ textAlign: 'left', color: 'var(--danger)' }}>مدين (عليه)</th>
                <th style={{ textAlign: 'left', color: 'var(--success)' }}>دائن (دفع)</th>
                <th style={{ textAlign: 'left' }}>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => (
                <tr key={t.id || idx}>
                  <td style={{ color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                    {formatDate(t.date)}
                  </td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
                      background: t.type === 'sale' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      color: t.type === 'sale' ? 'var(--danger)' : 'var(--success)',
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                    }}>
                      {t.type === 'sale' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {t.type === 'sale' ? 'بيع' : 'دفعة'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.9rem', maxWidth: '260px' }}>{t.description}</td>
                  <td style={{ textAlign: 'left', direction: 'ltr', fontWeight: '600', color: t.debit > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {t.debit > 0 ? formatCurrency(t.debit) : '—'}
                  </td>
                  <td style={{ textAlign: 'left', direction: 'ltr', fontWeight: '600', color: t.credit > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {t.credit > 0 ? formatCurrency(t.credit) : '—'}
                  </td>
                  <td style={{
                    textAlign: 'left', direction: 'ltr', fontWeight: '700',
                    color: t.balance > 0 ? 'var(--warning)' : t.balance < 0 ? 'var(--success)' : 'var(--text-muted)'
                  }}>
                    {formatCurrency(Math.abs(t.balance))}
                    {t.balance !== 0 && (
                      <span style={{ fontSize: '0.7rem', marginRight: '0.3rem', opacity: 0.7 }}>
                        {t.balance > 0 ? '⬆ مدين' : '⬇ دائن'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    لا توجد معاملات مطابقة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            <Link
              to="/installments"
              style={{ color: 'var(--accent)', fontSize: '0.88rem', textDecoration: 'underline' }}
            >
              عرض كل الأقساط ←
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
