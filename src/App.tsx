import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { POS } from './pages/POS';
import { Wholesale } from './pages/Wholesale';
import { Purchases } from './pages/Purchases';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ProfitAdder } from './pages/ProfitAdder';
import { CustomerManagement } from './pages/CustomerManagement';
import { Patti } from './pages/Patti';
import { Login } from './pages/Login';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, toasts, removeToast } = useApp();
  const { user, loading } = useAuth();

  const isSuperAdmin = user?.email.toLowerCase() === 'viki@wolsales.com';
  const userRole = user?.role || (isSuperAdmin ? 'super_admin' : (user?.email.toLowerCase() === 'admin@wolsales.com' ? 'admin' : 'staff'));

  React.useEffect(() => {
    if (user && userRole === 'staff' && !['products', 'pos', 'wholesale'].includes(activeTab)) {
      setActiveTab('products');
    }
  }, [user, userRole, activeTab, setActiveTab]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#090d16',
        color: '#f8fafc',
        gap: '1.5rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: 'var(--primary)',
          animation: 'spin-anim 1s linear infinite'
        }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', color: 'var(--text-secondary)' }}>
          Loading Wholesale Warehouse...
        </span>
        <style>{`
          @keyframes spin-anim {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderActiveView = () => {
    if (userRole === 'staff') {
      switch (activeTab) {
        case 'products':
          return <Products />;
        case 'pos':
          return <POS />;
        case 'wholesale':
          return <Wholesale />;
        default:
          return <Products />;
      }
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'pos':
        return <POS />;
      case 'wholesale':
        return <Wholesale />;
      case 'purchases':
        return <Purchases />;
      case 'inventory':
        return <Inventory />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'profit_adder':
        return <ProfitAdder />;
      case 'customers':
        return <CustomerManagement />;
      case 'patti':
        return <Patti />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="main-content">
        {renderActiveView()}
      </main>

      {/* Toast Alert Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';
          const isDanger = toast.type === 'danger';

          const bg = isSuccess ? 'rgba(16, 185, 129, 0.15)' :
                     isWarning ? 'rgba(245, 158, 11, 0.15)' :
                     isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)';
                     
          const border = isSuccess ? '1px solid rgba(16, 185, 129, 0.3)' :
                         isWarning ? '1px solid rgba(245, 158, 11, 0.3)' :
                         isDanger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)';

          const color = isSuccess ? 'var(--success)' :
                        isWarning ? 'var(--warning)' :
                        isDanger ? 'var(--danger)' : 'var(--info)';

          return (
            <div
              key={toast.id}
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderRadius: 'var(--border-radius-md)',
                background: bg,
                borderColor: 'transparent',
                borderLeft: `4px solid ${color}`,
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-primary)',
                animation: 'slideUp 0.2s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isSuccess && <CheckCircle size={18} style={{ color }} />}
                {isWarning && <AlertTriangle size={18} style={{ color }} />}
                {isDanger && <AlertCircle size={18} style={{ color }} />}
                {toast.type === 'info' && <Info size={18} style={{ color }} />}
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{toast.text}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
