import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, ShieldAlert, Trash2, CheckCircle, Loader, HardDriveDownload, UploadCloud, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { normalizeNumberInput } from '../utils/normalize';


function ResetModal({ onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);


  useEffect(() => {
    if (step === 2 && inputRef.current) inputRef.current.focus();
  }, [step]);

  const handleReset = async () => {
    const trimmed = normalizeNumberInput(code.trim());
    if (!trimmed) { setError('يرجى إدخال رمز التأكيد'); return; }

    setLoading(true);
    setError('');
    try {
      await api.delete('/system/reset', { data: { code: trimmed } });
      setDone(true);
      setTimeout(() => { onClose(); navigate('/'); }, 2500);
    } catch (err) {
      const msg = err.response?.data?.error || 'حدث خطأ أثناء إعادة التعيين';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%', maxWidth: '460px', padding: '2rem',
          border: '1px solid rgba(239,68,68,0.35)',
          boxShadow: '0 0 60px rgba(239,68,68,0.15)',
          position: 'relative', animation: 'modalIn 0.25s ease'
        }}
      >
        { }
        {!loading && !done && (
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-muted)', display: 'flex' }}
          >
            <X size={20} />
          </button>
        )}

        { }
        {done ? (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--success)' }}>تمت إعادة التعيين</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>تم حذف جميع البيانات بنجاح. جارٍ التوجيه...</p>
          </div>
        ) : step === 1 ? (

          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
              }}>
                <AlertTriangle size={36} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ margin: '0 0 0.5rem', color: 'var(--danger)' }}>تحذير: إعادة تعيين النظام</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.7 }}>
                ⚠️ سيتم <strong style={{ color: 'var(--text-main)' }}>حذف جميع البيانات نهائيًا</strong> ولا يمكن استرجاعها، بما في ذلك:
              </p>
            </div>

            { }
            <div style={{
              background: 'rgba(239,68,68,0.06)', borderRadius: '8px',
              padding: '1rem 1.25rem', marginBottom: '1.5rem',
              border: '1px solid rgba(239,68,68,0.2)'
            }}>
              {['العملاء وبيانات حساباتهم', 'المنتجات والمخزون', 'سجل جميع المبيعات', 'جميع الأقساط', 'سجل الخزنة والمعاملات المالية'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', borderBottom: i < 4 ? '1px solid rgba(239,68,68,0.08)' : 'none' }}>
                  <Trash2 size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} /> {item}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
                  fontWeight: '600', cursor: 'pointer', border: '1px solid var(--border)'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.15)', color: 'var(--danger)',
                  fontWeight: '700', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.35)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
              >
                متابعة →
              </button>
            </div>
          </>
        ) : (

          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
              }}>
                <ShieldAlert size={32} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ margin: '0 0 0.4rem' }}>أدخل رمز التأكيد</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                أدخل رمز الأمان لتأكيد عملية الحذف النهائي.
              </p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                رمز التأكيد *
              </label>
              <input
                ref={inputRef}
                type="password"
                value={code}
                onChange={e => { setCode(normalizeNumberInput(e.target.value)); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter' && code) handleReset(); }}
                placeholder="• • • • • •"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.85rem 1rem', fontSize: '1.1rem',
                  letterSpacing: '0.15em', textAlign: 'center', direction: 'ltr',
                  border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                  background: error ? 'rgba(239,68,68,0.05)' : undefined
                }}
              />
              {error && (
                <div style={{
                  marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.88rem',
                  display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setStep(1); setCode(''); setError(''); }}
                disabled={loading}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
                  fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                  border: '1px solid var(--border)'
                }}
              >
                رجوع
              </button>
              <button
                onClick={handleReset}
                disabled={!code || loading}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '8px',
                  background: !code || loading ? 'rgba(239,68,68,0.1)' : 'var(--danger)',
                  color: !code || loading ? 'rgba(239,68,68,0.4)' : 'white',
                  fontWeight: '700', cursor: !code || loading ? 'not-allowed' : 'pointer',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? (
                  <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> جاري الحذف...</>
                ) : (
                  <><Trash2 size={16} /> تأكيد الحذف النهائي</>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: scale(0.92) translateY(-12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


function BackupRestore() {
  const [backupStatus, setBackupStatus] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [restoreMsg, setRestoreMsg] = useState('');


  const [settings, setSettings] = useState({
    autoBackupEnabled: true,
    maxBackups: 10,
    backupPath: '',
    lastBackupDate: null
  });

  useEffect(() => {
    const init = async () => {
      const data = await window.api.system.getSettings();
      if (data) setSettings(data);
    };
    init();
  }, []);

  const updateSetting = async (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    await window.api.system.updateSettings({ [key]: val });
  };

  const handleSelectFolder = async () => {
    const res = await window.api.system.selectBackupFolder();
    if (res.success && res.path) {
      await updateSetting('backupPath', res.path);
      setBackupStatus('success');
      setBackupMsg('تم تغيير مجلد النسخ التلقائي بنجاح.');
      setTimeout(() => setBackupStatus(null), 3000);
    }
  };

  const handleBackup = async () => {
    setBackupStatus('loading');
    setBackupMsg('');
    try {
      const result = await window.api.system.backup();
      if (result.success) {
        setBackupStatus('success');
        setBackupMsg(result.message || 'تم الحفظ بنجاح.');
      } else {
        setBackupStatus(result.message?.includes('إلغاء') ? null : 'error');
        setBackupMsg(result.message || '');
      }
    } catch (err) {
      setBackupStatus('error');
      setBackupMsg(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      if (backupStatus !== 'error') setTimeout(() => setBackupStatus(null), 4000);
    }
  };

  const handleRestore = async () => {
    setRestoreStatus('loading');
    setRestoreMsg('');
    try {
      const result = await window.api.system.restore();
      if (result.success) {
        setRestoreStatus('success');
        setRestoreMsg(result.message || 'تمت الاستعادة.');

        if (result.requiresRestart) {
          setTimeout(() => window.api.system.restart(), 1500);
        }
      } else {
        setRestoreStatus(result.message?.includes('إلغاء') ? null : 'error');
        setRestoreMsg(result.message || '');
      }
    } catch (err) {
      setRestoreStatus('error');
      setRestoreMsg(err.message || 'حدث خطأ غير متوقع.');
    }
  };

  const StatusBadge = ({ status, msg }) => {
    if (!status || status === 'loading') return null;
    const isOk = status === 'success';
    return (
      <div style={{
        marginTop: '0.75rem', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: isOk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        color: isOk ? 'var(--success)' : 'var(--danger)',
        border: `1px solid ${isOk ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}>
        {isOk ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
        {msg}
      </div>
    );
  };

  const ActionRow = ({ icon, title, desc, btnLabel, btnColor, status, onAction, statusMsg }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '10px',
      border: '1px solid var(--border)', flexWrap: 'wrap', gap: '1rem'
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon} {title}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{desc}</div>
        <StatusBadge status={status} msg={statusMsg} />
      </div>
      <button
        onClick={onAction}
        disabled={status === 'loading' || status === 'success'}
        style={{
          padding: '0.65rem 1.25rem', borderRadius: '8px', flexShrink: 0,
          background: status === 'loading' || status === 'success'
            ? 'rgba(255,255,255,0.05)'
            : `rgba(${btnColor},0.12)`,
          color: status === 'loading' || status === 'success'
            ? 'var(--text-muted)'
            : `rgb(${btnColor})`,
          fontWeight: '700', fontSize: '0.9rem',
          cursor: status === 'loading' || status === 'success' ? 'not-allowed' : 'pointer',
          border: `1px solid rgba(${btnColor},0.3)`,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          transition: 'all 0.2s', whiteSpace: 'nowrap',
          opacity: status === 'loading' || status === 'success' ? 0.6 : 1
        }}
      >
        {status === 'loading'
          ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> جاري...</>
          : <>{icon} {btnLabel}</>
        }
      </button>
    </div>
  );

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
      <h3 style={{ margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <HardDriveDownload size={20} style={{ color: 'var(--accent)' }} />
        النسخ الاحتياطي والاستعادة
      </h3>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
        احفظ نسخة احتياطية من قاعدة البيانات أو استعد بياناتك من نسخة سابقة.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ActionRow
          icon={<HardDriveDownload size={15} />}
          title="تصدير نسخة احتياطية"
          desc="حفظ ملف قاعدة البيانات الحالية في مكان تختاره. يُنصح بعمل نسخة قبل أي تغيير كبير."
          btnLabel="تصدير"
          btnColor="99,102,241"
          status={backupStatus}
          onAction={handleBackup}
          statusMsg={backupMsg}
        />
        <ActionRow
          icon={<UploadCloud size={15} />}
          title="استعادة من نسخة احتياطية"
          desc="سيتم استبدال البيانات الحالية بالكامل بالنسخة المختارة ثم إعادة تشغيل البرنامج."
          btnLabel="استعادة"
          btnColor="245,158,11"
          status={restoreStatus}
          onAction={handleRestore}
          statusMsg={restoreMsg}
        />
      </div>

      <div style={{
        marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '10px',
        border: '1px solid var(--border)'
      }}>
        <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
          <RotateCcw size={18} style={{ color: 'var(--accent)' }} /> إعدادات النسخ الاحتياطي التلقائي
        </h4>

        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={settings.autoBackupEnabled}
                onChange={(e) => updateSetting('autoBackupEnabled', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '600' }}>تشغيل النسخ الاحتياطي التلقائي</span>
            </label>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '1.95rem' }}>
              سيتم إنشاء نسخة احتياطية لبياناتك محلياً بشكل تلقائي كل 30 يوماً.
              {settings.lastBackupDate && (
                <div style={{ marginTop: '0.3rem', color: 'var(--accent)' }}>
                  آخر نسخة أوتوماتيكية: {new Date(settings.lastBackupDate).toLocaleDateString('ar-EG')}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>الحد الأقصى للملفات (1-50)</label>
            <input
              type="number"
              value={settings.maxBackups}
              onChange={(e) => updateSetting('maxBackups', parseInt(e.target.value) || 10)}
              min="1" max="50"
              style={{
                width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-main)', outline: 'none'
              }}
            />
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>سلة المهملات تحذف النسخ الأقدم لتوفير المساحة</div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>مسار حفظ النسخ التلقائي</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                readOnly
                value={settings.backupPath || 'المسار الافتراضي (مجلد النظام)'}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px dashed var(--border)',
                  background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right'
                }}
              />
              <button
                onClick={handleSelectFolder}
                style={{
                  padding: '0.65rem 1rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--accent)', border: '1px solid rgba(99, 102, 241, 0.3)', cursor: 'pointer',
                  fontWeight: '600', transition: 'all 0.2s'
                }}
              >
                تغيير...
              </button>
              <button
                onClick={() => window.api.system.openBackupFolder()}
                style={{
                  padding: '0.65rem 1rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-main)', border: '1px solid var(--border)', cursor: 'pointer',
                  fontWeight: '600', transition: 'all 0.2s'
                }}
              >
                فتح المجلد
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function Settings() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      {showModal && <ResetModal onClose={() => setShowModal(false)} />}

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldAlert size={28} style={{ color: 'var(--text-muted)' }} />
          إعدادات النظام
        </h1>
        <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>
          إدارة خيارات النظام المتقدمة.
        </p>
      </div>

      { }
      <BackupRestore />

      { }
      <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid rgba(239,68,68,0.3)' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={20} /> منطقة الخطر
        </h3>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
          الإجراءات أدناه لا يمكن التراجع عنها. تأكد تمامًا قبل المتابعة.
        </p>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(239,68,68,0.05)', padding: '1.25rem', borderRadius: '10px',
          border: '1px solid rgba(239,68,68,0.15)'
        }}>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>إعادة تعيين النظام بالكامل</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              حذف جميع العملاء، المنتجات، المبيعات، الأقساط، والخزنة.
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.65rem 1.25rem', borderRadius: '8px', flexShrink: 0, marginRight: '1rem',
              background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
              fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--danger)'; }}
          >
            <Trash2 size={16} />
            إعادة تعيين
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

