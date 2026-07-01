import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  AlertCircle, 
  ArrowUpRight, 
  Plus, 
  Truck, 
  Receipt,
  ShoppingCart,
  Warehouse,
  ArrowRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    products, 
    dealers, 
    suppliers, 
    sales, 
    purchases, 
    expenses, 
    setActiveTab 
  } = useApp();
  const { user } = useAuth();

  const isSuperAdmin = user?.email.toLowerCase() === 'viki@wolsales.com';
  const userRole = user?.role || (isSuperAdmin ? 'super_admin' : (user?.email.toLowerCase() === 'admin@wolsales.com' ? 'admin' : 'staff'));

  // Dates helpers
  const todayStr = new Date().toDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // 1. Sales & Profits Calculations
  const stats = useMemo(() => {
    let salesToday = 0;
    let profitToday = 0;
    let salesMonth = 0;
    let profitMonth = 0;
    let salesCountToday = 0;

    sales.forEach(sale => {
      if (sale.status !== 'completed') return;
      
      const saleDate = new Date(sale.date);
      const isToday = saleDate.toDateString() === todayStr;
      const isThisMonth = saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;

      if (isToday) {
        salesToday += sale.total;
        profitToday += sale.profit;
        salesCountToday += 1;
      }
      if (isThisMonth) {
        salesMonth += sale.total;
        profitMonth += sale.profit;
      }
    });

    // 2. Expenses Calculations
    let expensesToday = 0;
    let expensesMonth = 0;

    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      const isToday = expDate.toDateString() === todayStr;
      const isThisMonth = expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;

      if (isToday) {
        expensesToday += exp.amount;
      }
      if (isThisMonth) {
        expensesMonth += exp.amount;
      }
    });

    // Add purchases to expenses (total cash outflow)
    purchases.forEach(pur => {
      const purDate = new Date(pur.date);
      const isToday = purDate.toDateString() === todayStr;
      const isThisMonth = purDate.getMonth() === currentMonth && purDate.getFullYear() === currentYear;

      if (isToday) {
        expensesToday += pur.total;
      }
      if (isThisMonth) {
        expensesMonth += pur.total;
      }
    });

    return {
      salesToday,
      profitToday,
      salesMonth,
      profitMonth,
      salesCountToday,
      expensesToday,
      expensesMonth
    };
  }, [sales, purchases, expenses, todayStr, currentMonth, currentYear]);

  // Outstanding Dues
  const totalCustomerDues = useMemo(() => {
    return dealers.reduce((sum, d) => sum + (d.outstanding || 0), 0);
  }, [dealers]);

  const totalSupplierDues = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.due || 0), 0);
  }, [suppliers]);

  // Low Stock Count
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.currentStock <= p.minStockAlert);
  }, [products]);



  // Recent 5 Sales Transactions
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p>Real-time telemetry, cash flow analytics, and operational tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => setActiveTab('pos')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
          >
            <ShoppingCart size={16} />
            <span>POS Register</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Sales Today Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Today's Sales
              </span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.4rem 0 0.2rem 0', color: 'var(--text-primary)' }}>
                ₹{stats.salesToday.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {stats.salesCountToday} invoices completed
              </span>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* Profit Today Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Today's Net Profit
              </span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.4rem 0 0.2rem 0', color: 'var(--success)' }}>
                ₹{stats.profitToday.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Margin: {stats.salesToday > 0 ? ((stats.profitToday / stats.salesToday) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* Cash Outflow (Purchases & Expenses) */}
        <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Monthly Outflow
              </span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.4rem 0 0.2rem 0', color: 'var(--danger)' }}>
                ₹{stats.expensesMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ₹{stats.expensesToday.toLocaleString('en-IN')} spent today
              </span>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
              <TrendingDown size={22} />
            </div>
          </div>
        </div>

        {/* Low Stock Items Alert Card */}
        <div 
          className="glass-panel" 
          style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
          onClick={() => setActiveTab('inventory')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Low Stock Alerts
              </span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.4rem 0 0.2rem 0', color: lowStockProducts.length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {lowStockProducts.length} Items
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Require reordering attention
              </span>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <AlertCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left column: Top products & recent sales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          


          {/* Recent Sales transactions */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} style={{ color: 'var(--primary)' }} />
              <span>Recent Transactions</span>
            </h3>

            {recentSales.length > 0 ? (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Customer</th>
                      <th>Method</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{sale.invoiceNo}</td>
                        <td>
                          <div>{sale.customerName}</div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(sale.date).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sale.paymentMethod === 'Cash' ? 'badge-success' : (sale.paymentMethod === 'UPI' ? 'badge-info' : 'badge-warning')}`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{sale.total.toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success">Completed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No recent sales transactions.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Ledger summaries & Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Dues Summary Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              <span>Outstanding Balances</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Customer Receivables */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Customer Outstanding</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    ₹{totalCustomerDues.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActiveTab('customers')}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  View
                </button>
              </div>

              {/* Supplier Payables */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Supplier Payables</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)', marginTop: '2px' }}>
                    ₹{totalSupplierDues.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActiveTab('purchases')}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  View
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpRight size={18} style={{ color: 'var(--primary)' }} />
              <span>Quick Actions</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setActiveTab('pos')}
                style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', flexDirection: 'column', gap: '0.4rem', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ShoppingCart size={18} />
                <span>New Sale</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setActiveTab('products')}
                style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', flexDirection: 'column', gap: '0.4rem', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={18} />
                <span>Add Product</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setActiveTab('purchases')}
                style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', flexDirection: 'column', gap: '0.4rem', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Truck size={18} />
                <span>Record Purchase</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setActiveTab('expenses')}
                style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', flexDirection: 'column', gap: '0.4rem', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Receipt size={18} />
                <span>Record Expense</span>
              </button>
            </div>
          </div>

          {/* System Inventory Health Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Warehouse size={18} style={{ color: 'var(--primary)' }} />
              <span>Inventory Status</span>
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Total Catalog Products:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{products.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span>Low Stock Alerts:</span>
              <strong style={{ color: lowStockProducts.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {lowStockProducts.length} Items
              </strong>
            </div>
            <button 
              className="btn btn-ghost" 
              onClick={() => setActiveTab('inventory')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center', fontSize: '0.8rem', padding: '0.2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}
            >
              <span>Manage Inventory</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
