import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Home, ShoppingCart, Calendar, Users, Package, DollarSign, History, Settings as SettingsIcon, Truck, ShoppingBag, Sun, Moon } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages to prevent single-file crashes from breaking the bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InstallmentsList = lazy(() => import('./pages/InstallmentsList'));
const Customers = lazy(() => import('./pages/Customers'));
const SalesHistory = lazy(() => import('./pages/SalesHistory'));
const CreateSale = lazy(() => import('./pages/CreateSale'));
const CustomerStatement = lazy(() => import('./pages/CustomerStatement'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const Products = lazy(() => import('./pages/Products'));
const Treasury = lazy(() => import('./pages/Treasury'));
const Settings = lazy(() => import('./pages/Settings'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const CreatePurchase = lazy(() => import('./pages/CreatePurchase'));
const SupplierStatement = lazy(() => import('./pages/SupplierStatement'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
    جاري التحميل...
  </div>
);

function App() {
  console.log("[App.jsx] Rendering App Shell");
  const { theme, toggleTheme } = useTheme();

  return (
    <HashRouter>
      <Toaster position="top-center" />
      <div className="layout">
        <aside className="sidebar glass-panel">
          <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>تطبيق الإدارة</h2>
          </div>
          
          <NavLink to="/" end className="sidebar-link">
            <Home size={20} /> <span>الرئيسية</span>
          </NavLink>
          
          <NavLink to="/create-sale" className="sidebar-link">
            <ShoppingCart size={20} /> <span>إنشاء مبيعة</span>
          </NavLink>

          <NavLink to="/sales" className="sidebar-link">
            <History size={20} /> <span>سجل المبيعات</span>
          </NavLink>
          
          <NavLink to="/installments" className="sidebar-link">
            <Calendar size={20} /> <span>الأقساط</span>
          </NavLink>
          
          <NavLink to="/customers" className="sidebar-link">
            <Users size={20} /> <span>العملاء</span>
          </NavLink>

          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', opacity: 0.3 }} />

          <NavLink to="/suppliers" className="sidebar-link">
            <Truck size={20} /> <span>الموردين</span>
          </NavLink>

          <NavLink to="/create-purchase" className="sidebar-link">
            <ShoppingBag size={20} /> <span>فاتورة شراء</span>
          </NavLink>

          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', opacity: 0.3 }} />

          <NavLink to="/treasury" className="sidebar-link">
            <DollarSign size={20} /> <span>الخزنة</span>
          </NavLink>
          
          <NavLink to="/products" className="sidebar-link">
            <Package size={20} /> <span>المنتجات</span>
          </NavLink>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <NavLink to="/settings" className="sidebar-link">
              <SettingsIcon size={20} /> <span>الإعدادات</span>
            </NavLink>

            <button onClick={toggleTheme} className="sidebar-link" style={{ marginTop: '0.5rem', background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}>
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
               <span>{theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
            </button>
          </div>
        </aside>

        <main className="main-content">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/create-sale" element={<CreateSale />} />
                <Route path="/sales" element={<SalesHistory />} />
                <Route path="/installments" element={<InstallmentsList />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerProfile />} />
                <Route path="/customers/:id/statement" element={<CustomerStatement />} />
                <Route path="/products" element={<Products />} />
                <Route path="/treasury" element={<Treasury />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/suppliers/:id/statement" element={<SupplierStatement />} />
                <Route path="/create-purchase" element={<CreatePurchase />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
