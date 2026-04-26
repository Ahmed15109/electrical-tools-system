import React, { useState, useEffect, memo, useMemo, useRef } from 'react';
import { 
  Users, DollarSign, Activity, AlertTriangle, TrendingUp, TrendingDown,
  ShoppingCart, RefreshCw, UserPlus, CreditCard, ChevronLeft,
  Calculator, Percent, Hash, Coins
} from 'lucide-react';
import { formatCurrency, toCentsLocal } from '../utils/normalize';
import { useNavigate } from 'react-router-dom';

const safeArray = (arr) => (Array.isArray(arr) ? arr : []);
const safeNumber = (val) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

const StatCard = memo(({ title, value, icon, color, subValue }) => (
  <div className="glass-panel" style={{ 
      padding: '1.5rem', display: 'flex', flexDirection: 'column', 
      position: 'relative', borderBottom: `3px solid var(--${color})`,
      transition: 'transform 0.2s ease', cursor: 'default'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <div style={{ padding: '0.6rem', borderRadius: '10px', background: `rgba(var(--${color}-rgb, 255,255,255), 0.1)`, color: `var(--${color})` }}>
         {icon}
      </div>
      <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{title}</h3>
    </div>
    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{value}</h2>
    {subValue && (
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {subValue}
      </div>
    )}
  </div>
));

const ActivityItem = memo(({ act, onClick }) => {
  if (!act) return null;
  const iconMap = { sale: <ShoppingCart size={18} />, payment: <CreditCard size={18} />, customer: <UserPlus size={18} /> };
  const colorMap = { sale: 'var(--accent)', payment: 'var(--success)', customer: 'var(--warning)' };
  const typeLabels = { sale: 'عملية بيع', payment: 'تحصيل قسط', customer: 'عميل جديد' };
  
  return (
    <div 
      onClick={() => onClick(act)}
      className="activity-item-card"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        padding: '1rem', 
        background: 'rgba(255,255,255,0.03)', 
        border: '1px solid var(--border)',
        borderRadius: '14px', 
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ 
        padding: '0.7rem', 
        borderRadius: '10px', 
        background: `rgba(var(--${act.type === 'sale' ? 'accent' : act.type === 'payment' ? 'success' : 'warning'}-rgb), 0.1)`, 
        color: colorMap[act.type] || 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
          {iconMap[act.type] || <Activity size={18} />}
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)' }}>
            {typeLabels[act.type] || 'نشاط'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>{act.date ? new Date(act.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : ''}</span>
            {act.type === 'payment' && <span style={{ opacity: 0.5 }}>•</span>}
            {act.type === 'payment' && <span style={{ fontSize: '0.65rem' }}>بواسطة الخزنة</span>}
          </div>
      </div>

      <div style={{ textAlign: 'left' }}>
          {act.value > 0 ? (
            <div style={{ 
              fontWeight: '900', 
              fontSize: '1.05rem', 
              color: colorMap[act.type] || 'var(--text-main)', 
              direction: 'ltr',
              letterSpacing: '-0.02em'
            }}>
                {formatCurrency(act.value)}
            </div>
          ) : (
            <ChevronLeft size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          )}
      </div>
    </div>
  );
});

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        console.log("[Dashboard] Loading stats...");
        if (!window.api?.stats?.dashboard) {
            console.warn("[Dashboard] window.api.stats.dashboard not found. Using mock data.");
            setStats({
                totalCustomers: 0,
                totalSales: 0,
                totalRevenue: 0,
                vaultBalance: 0,
                pendingInstallments: 0,
                overdueInstallments: 0,
                recentActivity: []
            });
            setLoading(false);
            return;
        }
        const res = await window.api.stats.dashboard();
        
        if (controller.signal.aborted) return;
        setStats(res);
      } catch (err) {
        console.error("[Dashboard] Load failed:", err);
        setError(err.message || 'فشل التحميل');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
    return () => abortControllerRef.current?.abort();
  }, []);

  const safeStats = useMemo(() => {
      if (!stats) return { totalCustomers: 0, totalSales: 0, totalRevenue: 0, vaultBalance: 0, pendingInstallments: 0, overdueInstallments: 0, recentActivity: [] };
      return {
          totalCustomers: safeNumber(stats.totalCustomers),
          totalSales: safeNumber(stats.totalSales),
          totalRevenue: safeNumber(stats.totalRevenue),
          vaultBalance: safeNumber(stats.vaultBalance),
          pendingInstallments: safeNumber(stats.pendingInstallments),
          overdueInstallments: safeNumber(stats.overdueInstallments),
          recentActivity: safeArray(stats.recentActivity)
      };
  }, [stats]);

  const [calc, setCalc] = useState({ price: '', downPayment: '', rate: '30', months: '12' });

  const calculated = useMemo(() => {
    const p  = safeNumber(calc.price);
    const dp = safeNumber(calc.downPayment);
    const r  = safeNumber(calc.rate);
    const m  = safeNumber(calc.months);

    const remaining = Math.max(0, p - dp);
    const interest  = remaining * (r / 100);
    const total     = remaining + interest;
    const monthly   = m > 0 ? total / m : 0;

    return { remaining, interest, total, monthly };
  }, [calc]);

  if (loading) return <div style={{ padding: '5rem', textAlign: 'center', opacity: 0.5 }}><RefreshCw className="animate-spin" /></div>;
  if (error) return <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>لوحة التحكم</h1>
        <p style={{ color: 'var(--text-muted)' }}>ملخص النشاط المالي اليومي</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <StatCard title="إجمالي المبيعات" value={formatCurrency(safeStats.totalSales)} icon={<ShoppingCart size={22} />} color="accent" />
          <StatCard title="رصيد الخزنة" value={formatCurrency(safeStats.vaultBalance)} icon={<DollarSign size={22} />} color="success" subValue={`وارد اليوم: ${formatCurrency(safeStats.totalRevenue)}`} />
          <StatCard title="العملاء" value={safeStats.totalCustomers} icon={<Users size={22} />} color="warning" />
          <StatCard title="الأقساط المتأخرة" value={safeStats.overdueInstallments} icon={<AlertTriangle size={22} />} color={safeStats.overdueInstallments > 0 ? 'danger' : 'success'} />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem' 
      }}>
          <div className="glass-panel" style={{ 
            padding: '1.75rem', 
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            height: '500px'
          }}>
              <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(var(--accent-rgb, 99, 102, 241), 0.1)', color: 'var(--accent)' }}>
                   <Activity size={20} />
                </div>
                آخر العمليات
              </h3>
              
              <div 
                className="custom-thin-scrollbar"
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem',
                  overflowY: 'auto',
                  paddingLeft: '0.6rem',
                  marginLeft: '-0.4rem',
                  paddingBottom: '1rem'
                }}
              >
                  {safeStats.recentActivity.length > 0 ? (
                      safeStats.recentActivity.map((act, i) => <ActivityItem key={i} act={act} onClick={() => {}} />)
                  ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, gap: '1rem' }}>
                          <Activity size={48} strokeWidth={1} />
                          <p style={{ margin: 0 }}>لا توجد عمليات حديثة</p>
                      </div>
                  )}
              </div>
          </div>
          
          <div className="glass-panel" style={{ 
            padding: '1.75rem', 
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            height: '500px'
          }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(var(--accent-rgb, 99, 102, 241), 0.1)', color: 'var(--accent)' }}>
                   <Calculator size={22} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>حاسبة الأقساط السريعة</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: 'auto' }}>
                  {/* Right Column in RTL */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)', marginRight: '0.25rem' }}>سعر المنتج</label>
                        <input 
                          type="number" 
                          value={calc.price} 
                          onChange={e => setCalc({...calc, price: e.target.value})}
                          placeholder="0.00"
                          style={{ 
                            width: '100%', height: '46px', padding: '0 1rem', 
                            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', 
                            borderRadius: '12px', fontSize: '1rem', transition: 'border-color 0.2s',
                            outline: 'none'
                          }}
                          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)', marginRight: '0.25rem' }}>نسبة الفائدة (%)</label>
                        <input 
                          type="number" 
                          value={calc.rate} 
                          onChange={e => setCalc({...calc, rate: e.target.value})}
                          placeholder="10"
                          style={{ 
                            width: '100%', height: '46px', padding: '0 1rem', 
                            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', 
                            borderRadius: '12px', fontSize: '1rem', outline: 'none'
                          }}
                        />
                      </div>
                  </div>

                  {/* Left Column in RTL */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)', marginRight: '0.25rem' }}>المقدم</label>
                        <input 
                          type="number" 
                          value={calc.downPayment} 
                          onChange={e => setCalc({...calc, downPayment: e.target.value})}
                          placeholder="0.00"
                          style={{ 
                            width: '100%', height: '46px', padding: '0 1rem', 
                            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', 
                            borderRadius: '12px', fontSize: '1rem', outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)', marginRight: '0.25rem' }}>عدد الأشهر</label>
                        <input 
                          type="number" 
                          value={calc.months} 
                          onChange={e => setCalc({...calc, months: e.target.value})}
                          placeholder="12"
                          style={{ 
                            width: '100%', height: '46px', padding: '0 1rem', 
                            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', 
                            borderRadius: '12px', fontSize: '1rem', outline: 'none'
                          }}
                        />
                      </div>
                  </div>
              </div>

              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                padding: '1.5rem', 
                borderRadius: '16px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginTop: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent)' }}>القسط الشهري</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--accent)', direction: 'ltr' }}>
                    {formatCurrency(calculated.monthly * 100)}
                  </span>
                </div>
                
                <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>إجمالي بعد الفائدة</span>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem', direction: 'ltr' }}>{formatCurrency(calculated.total * 100)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>المبلغ المتبقي</span>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem', direction: 'ltr' }}>{formatCurrency(calculated.remaining * 100)}</span>
                </div>
              </div>
          </div>
      </div>
      
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; } 
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .activity-item-card:hover {
          background: rgba(255,255,255,0.07) !important;
          border-color: var(--accent) !important;
          transform: translateX(4px);
        }
        
        .custom-thin-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-thin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--accent-rgb), 0.2);
          border-radius: 10px;
        }
        .custom-thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--accent-rgb), 0.4);
        }
      `}</style>
    </div>
  );
};

export default memo(Dashboard);
