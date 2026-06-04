import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  FileText, 
  ChevronRight,
  Printer
} from 'lucide-react';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { Sale } from '../utils/db';

export const Dashboard: React.FC = () => {
  const { sales, purchases, products, activeTab, setActiveTab } = useApp();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Helper to check if date is today (2026-06-03 or standard local day)
  const isToday = (dateStr: string) => {
    const today = new Date();
    const date = new Date(dateStr);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Metrics calculations
  const todaySales = sales
    .filter(s => s.status === 'completed' && isToday(s.date))
    .reduce((sum, s) => sum + s.total, 0);

  const todayPurchases = purchases
    .filter(p => isToday(p.date))
    .reduce((sum, p) => sum + p.total, 0);

  const todayProfit = sales
    .filter(s => s.status === 'completed' && isToday(s.date))
    .reduce((sum, s) => sum + s.profit, 0);

  const totalProducts = products.length;

  // Alerts: Stock <= Min Alert
  const lowStockItems = products.filter(p => p.currentStock <= p.minStockAlert);

  // Fast Moving Products: Aggregate quantities sold
  const productSalesMap: { [key: string]: { name: string; qty: number } } = {};
  sales.filter(s => s.status === 'completed').forEach(s => {
    s.items.forEach(item => {
      if (productSalesMap[item.productId]) {
        productSalesMap[item.productId].qty += item.qty;
      } else {
        productSalesMap[item.productId] = { name: item.name, qty: item.qty };
      }
    });
  });

  const fastMovingProducts = Object.entries(productSalesMap)
    .map(([id, val]) => ({ id, name: val.name, qty: val.qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const maxQtySold = fastMovingProducts.length > 0 ? Math.max(...fastMovingProducts.map(p => p.qty)) : 1;

  // Recent Sales (Last 5)
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Title */}
      <div className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Real-time analytics and store status for today</p>
        </div>
        <div style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          SYSTEM ACTIVE &bull; {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI metrics cards grid */}
      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Sales</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem' }}>₹{todaySales.toFixed(2)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--info)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--info-light)', color: 'var(--info)' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Purchases</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem' }}>₹{todayPurchases.toFixed(2)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--success-light)', color: 'var(--success)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Profit</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--success)' }}>₹{todayProfit.toFixed(2)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Package size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Products</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem' }}>{totalProducts}</h3>
          </div>
        </div>
      </div>

      {/* Main sections */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Side: Low Stock Alerts & Fast Moving */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Low Stock Alert Box */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: lowStockItems.length > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                <AlertTriangle size={18} />
                <span>Low Stock Alerts</span>
              </h3>
              <span className={`badge ${lowStockItems.length > 0 ? 'badge-danger' : 'badge-success'}`}>
                {lowStockItems.length} Products Low
              </span>
            </div>
            
            {lowStockItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {lowStockItems.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: 'var(--danger-light)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--border-radius-sm)'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Min Threshold: {item.minStockAlert} {item.unit}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger)' }}>
                        {Number(item.currentStock.toFixed(3))} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                All products are sufficiently stocked.
              </div>
            )}
            
            <button 
              className="btn btn-secondary" 
              onClick={() => setActiveTab('inventory')}
              style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem', padding: '0.5rem' }}
            >
              Manage Inventory Stock
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Fast Moving Products custom chart */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--success)' }} />
              <span>Fast Moving Products</span>
            </h3>

            {fastMovingProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {fastMovingProducts.map((p) => {
                  const pct = Math.max(10, (p.qty / maxQtySold) * 100);
                  return (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{Number(p.qty.toFixed(3))} sold</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, var(--primary), var(--info))',
                          borderRadius: '999px',
                          boxShadow: 'var(--primary-glow)'
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                No sales data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Recent Sales */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} />
              <span>Recent Sales Bills</span>
            </h3>
            <button 
              className="btn btn-ghost" 
              onClick={() => setActiveTab('reports')} 
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            >
              View All
            </button>
          </div>

          {recentSales.length > 0 ? (
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: 600 }}>{sale.invoiceNo}</td>
                      <td>
                        <div>{sale.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{sale.total.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${
                          sale.paymentMethod === 'Cash' ? 'badge-success' : 
                          sale.paymentMethod === 'UPI' ? 'badge-info' : 
                          sale.paymentMethod === 'Card' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => setSelectedSale(sale)}
                          title="Print / View Invoice"
                          style={{ padding: '0.3rem' }}
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No bills generated yet. Go to POS Sales tab to start billing!
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={() => setActiveTab('pos')}
            style={{ width: '100%', marginTop: '1.25rem' }}
          >
            Launch POS Billing Screen
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Bill Printing Preview Overlay */}
      {selectedSale && (
        <PrintPreviewModal 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
        />
      )}
    </div>
  );
};
