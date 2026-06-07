import React from 'react';
import { useApp, ActiveTab } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Truck, 
  Warehouse, 
  BarChart3, 
  Settings, 
  Sun, 
  Moon, 
  ShoppingBag,
  Bell,
  LogOut,
  TrendingUp,
  UserCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, darkMode, setDarkMode, products, settings } = useApp();
  const { user, logout } = useAuth();

  // Calculate low stock items count
  const lowStockCount = products.filter(p => p.currentStock <= p.minStockAlert).length;

  const menuItems = [
    { id: 'dashboard' as ActiveTab, name: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as ActiveTab, name: 'Products', icon: ShoppingBag },
    { id: 'pos' as ActiveTab, name: 'POS Sales', icon: ShoppingCart },
    { id: 'wholesale' as ActiveTab, name: 'Wholesale', icon: Users },
    { id: 'customers' as ActiveTab, name: 'Customers', icon: UserCheck },
    { id: 'purchases' as ActiveTab, name: 'Purchases', icon: Truck },
    { 
      id: 'inventory' as ActiveTab, 
      name: 'Inventory', 
      icon: Warehouse,
      badge: lowStockCount > 0 ? lowStockCount : undefined 
    },
    { id: 'reports' as ActiveTab, name: 'Reports', icon: BarChart3 },
    { id: 'profit_adder' as ActiveTab, name: 'Profit Adder', icon: TrendingUp },
    { id: 'settings' as ActiveTab, name: 'Settings', icon: Settings },
  ];

  const isSuperAdmin = user?.email.toLowerCase() === 'viki@wolsales.com';
  const userRole = user?.role || (isSuperAdmin ? 'super_admin' : (user?.email.toLowerCase() === 'admin@wolsales.com' ? 'admin' : 'staff'));

  const filteredMenuItems = menuItems.filter(item => {
    if (userRole === 'staff') {
      return ['products', 'pos', 'wholesale'].includes(item.id);
    }
    return true;
  });

  return (
    <div className="glass-panel" style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRadius: 0,
      borderTop: 'none',
      borderLeft: 'none',
      borderBottom: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem 1rem',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Brand Logo & Name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), var(--info))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            boxShadow: 'var(--primary-glow)'
          }}>
            {settings.shopName ? settings.shopName.charAt(0) : 'S'}
          </div>
          <div>
            <h2 style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2
            }}>
              {settings.shopName || 'SUPER MART'}
            </h2>
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              letterSpacing: '0.05em'
            }}>
              BILLING HUB
            </span>
          </div>
        </div>

        {/* Menu Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: 'none',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  boxShadow: isActive ? 'var(--primary-glow)' : 'none'
                }}
                className={!isActive ? 'btn-ghost' : ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span style={{
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Theme Control & Info */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1.25rem'
      }}>
        {/* User profile & Logout */}
        {user && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--info))',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.8rem',
                flexShrink: 0
              }}>
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.email.split('@')[0]}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all var(--transition-fast)'
              }}
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-input)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
            width: '100%',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)'
          }}
          className="glass-panel-hover"
        >
          {darkMode ? (
            <>
              <Sun size={16} style={{ color: 'var(--warning)' }} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={16} style={{ color: 'var(--primary)' }} />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Footer info */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          lineHeight: '1.4'
        }}>
          This App Developed by vignesh<br />
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>9360039283</span>
        </div>
      </div>
    </div>
  );
};
