import React from 'react';
import { createPortal } from 'react-dom';
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
  UserCheck,
  ClipboardList,
  Receipt,
  X,
  Printer
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, darkMode, setDarkMode, products, settings, sales } = useApp();
  const { user, logout } = useAuth();

  // Logout shift summary states
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isPrintingSummary, setIsPrintingSummary] = React.useState(false);

  // Calculate today's shift summary for current staff
  const shiftSummary = React.useMemo(() => {
    if (!sales || !user) return { count: 0, cash: 0, upi: 0, card: 0, bags: 0, kg: 0, total: 0 };
    
    const todayStr = new Date().toDateString();
    const staffSales = sales.filter(s => 
      s.createdBy === user.email && 
      new Date(s.date).toDateString() === todayStr &&
      s.status === 'completed'
    );

    let count = staffSales.length;
    let cash = 0;
    let upi = 0;
    let card = 0;
    let bags = 0;
    let kg = 0;
    let total = 0;

    staffSales.forEach(sale => {
      cash += sale.paymentDetails?.cashAmount || 0;
      upi += sale.paymentDetails?.upiAmount || 0;
      card += sale.paymentDetails?.cardAmount || 0;
      total += sale.total;

      sale.items.forEach(item => {
        bags += item.bags || 0;
        kg += item.weight || 0;
      });
    });

    return { count, cash, upi, card, bags, kg, total };
  }, [sales, user]);

  const handlePrintAndLogout = () => {
    setIsPrintingSummary(true);
    setTimeout(() => {
      window.print();
      setIsPrintingSummary(false);
      setShowLogoutModal(false);
      logout();
    }, 500);
  };

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
    { id: 'patti' as ActiveTab, name: 'Patti', icon: ClipboardList },
    { id: 'expenses' as ActiveTab, name: 'Expenses', icon: Receipt },
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
              onClick={() => setShowLogoutModal(true)}
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

      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', background: 'var(--bg-sidebar)' }}>
            <div className="modal-header">
              <h3>Confirm Log Out &amp; Shift Cashout</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLogoutModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Here is your shift cashout summary for today:
              </p>
              
              <div style={{ 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius-sm)', 
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Staff User:</span>
                  <span style={{ fontWeight: 600 }}>{user?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Shift Date:</span>
                  <span style={{ fontWeight: 600 }}>{new Date().toLocaleDateString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Sales Count:</span>
                  <span style={{ fontWeight: 600 }}>{shiftSummary.count} bills</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cash in Hand:</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{shiftSummary.cash.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GPay / UPI Total:</span>
                  <span style={{ fontWeight: 600, color: 'var(--info)' }}>₹{shiftSummary.upi.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Card Total:</span>
                  <span style={{ fontWeight: 600, color: 'var(--warning)' }}>₹{shiftSummary.card.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Sales in Bag:</span>
                  <span style={{ fontWeight: 600 }}>{shiftSummary.bags} bags</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Weight (KG):</span>
                  <span style={{ fontWeight: 600 }}>{Number(shiftSummary.kg.toFixed(3))} Kg</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', paddingTop: '0.25rem' }}>
                  <span>TOTAL SALES:</span>
                  <span>₹{shiftSummary.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={handlePrintAndLogout}
                style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
              >
                <Printer size={16} />
                <span>Print Summary &amp; Log Out</span>
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowLogoutModal(false);
                    logout();
                  }}
                  style={{ width: '100%' }}
                >
                  Log Out Only
                </button>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setShowLogoutModal(false)}
                  style={{ width: '100%' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPrintingSummary && createPortal(
        <div id="print-area-root" style={{ fontFamily: 'Courier New', color: '#000', background: '#fff', padding: '15px', width: '80mm', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{settings.shopName || 'SUPER MART'}</h3>
            <h4 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0' }}>SHIFT CASHOUT SUMMARY</h4>
            <span style={{ fontSize: '9px' }}>{new Date().toLocaleString()}</span>
          </div>

          <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
            <div><strong>Staff:</strong> {user?.email}</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0' }}><strong>Total Sales:</strong></td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{shiftSummary.count} bills</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><strong>Cash in Hand:</strong></td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>₹{shiftSummary.cash.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><strong>GPay / UPI:</strong></td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>₹{shiftSummary.upi.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><strong>Card Amount:</strong></td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>₹{shiftSummary.card.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '1px dashed #ccc', paddingTop: '4px' }}>
                <td style={{ padding: '4px 0' }}><strong>Total Sales (Bag):</strong></td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{shiftSummary.bags} bags</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><strong>Total KG Weight:</strong></td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{Number(shiftSummary.kg.toFixed(3))} Kg</td>
              </tr>
              <tr style={{ borderTop: '1px dashed #000', fontSize: '12px', fontWeight: 'bold' }}>
                <td style={{ padding: '6px 0 0 0' }}>TOTAL SALES AMT:</td>
                <td style={{ padding: '6px 0 0 0', textAlign: 'right' }}>₹{shiftSummary.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '9px', fontStyle: 'italic', borderTop: '1px dashed #000', paddingTop: '10px' }}>
            Shift Ended. Thank You!
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
