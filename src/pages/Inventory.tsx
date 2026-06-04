import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DB, Product } from '../utils/db';
import { 
  Warehouse, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  AlertTriangle, 
  X, 
  Sliders, 
  Plus, 
  Minus 
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { products, stockHistory, refreshData, showToast } = useApp();
  const [subTab, setSubTab] = useState<'levels' | 'history'>('levels');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Adjustment Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<'Add' | 'Sub'>('Add');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Manual Stock Take');

  const openAdjustModal = (product: Product, direction: 'Add' | 'Sub') => {
    setAdjustProduct(product);
    setAdjustDirection(direction);
    setAdjustQty(0);
    setAdjustReason(direction === 'Add' ? 'Received stock' : 'Damaged / Expired stock');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || adjustQty <= 0) {
      showToast('Please enter a valid adjustment quantity', 'warning');
      return;
    }

    if (adjustDirection === 'Sub' && adjustQty > adjustProduct.currentStock) {
      showToast('Adjustment exceeds current stock levels!', 'warning');
      return;
    }

    DB.adjustStock(adjustProduct.id, adjustQty, adjustDirection, adjustReason);
    refreshData();
    setIsAdjustModalOpen(false);
    setAdjustProduct(null);
    showToast(`Stock adjusted successfully for ${adjustProduct.name}`, 'success');
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm);
    if (stockFilter === 'low') {
      return matchesSearch && p.currentStock <= p.minStockAlert && p.currentStock > 0;
    }
    if (stockFilter === 'out') {
      return matchesSearch && p.currentStock === 0;
    }
    return matchesSearch;
  });

  // Sort history newest first
  const sortedHistory = [...stockHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Inventory & Stock Center</h1>
          <p>Audit stock values, review alerts, perform manual adjustments, and track stock audit logs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${subTab === 'levels' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('levels')}
          >
            Current Stock Levels
          </button>
          <button 
            className={`btn ${subTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('history')}
          >
            <History size={16} />
            <span>Stock Audit Log</span>
          </button>
        </div>
      </div>

      {subTab === 'levels' ? (
        /* Stock Levels view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filters Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                placeholder="Search stock by name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`btn ${stockFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
                onClick={() => setStockFilter('all')}
              >
                All Inventory
              </button>
              <button 
                className={`btn ${stockFilter === 'low' ? 'btn-warning' : 'btn-secondary'}`}
                style={{ 
                  padding: '0.45rem 1rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '20px', 
                  background: stockFilter === 'low' ? 'var(--warning)' : 'var(--primary-light)', 
                  color: stockFilter === 'low' ? 'black' : 'var(--warning)' 
                }}
                onClick={() => setStockFilter('low')}
              >
                Low Stock alerts
              </button>
              <button 
                className={`btn ${stockFilter === 'out' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ 
                  padding: '0.45rem 1rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '20px', 
                  background: stockFilter === 'out' ? 'var(--danger)' : 'var(--primary-light)', 
                  color: stockFilter === 'out' ? 'white' : 'var(--danger)' 
                }}
                onClick={() => setStockFilter('out')}
              >
                Out of Stock alerts
              </button>
            </div>
          </div>

          {/* Current Stock Levels Grid Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            {filteredProducts.length > 0 ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Product Details</th>
                      <th>Barcode</th>
                      <th style={{ textAlign: 'center' }}>Stock Threshold</th>
                      <th style={{ textAlign: 'center' }}>Current Inventory</th>
                      <th style={{ textAlign: 'center' }}>Stock Health</th>
                      <th style={{ textAlign: 'center' }}>Quick Adjust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const isOutOfStock = p.currentStock === 0;
                      const isLowStock = p.currentStock <= p.minStockAlert;
                      
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {p.category} &bull; Unit: {p.unit}</span>
                          </td>
                          <td style={{ fontFamily: 'Courier New', fontWeight: 600 }}>{p.barcode}</td>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{p.minStockAlert} {p.unit}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: isOutOfStock ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--success)' }}>
                              {Number(p.currentStock.toFixed(3))} {p.unit}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${
                              isOutOfStock ? 'badge-danger' : 
                              isLowStock ? 'badge-warning' : 'badge-success'
                            }`} style={{ fontWeight: 700 }}>
                              {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'ADEQUATE'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-secondary btn-icon"
                                onClick={() => openAdjustModal(p, 'Add')}
                                style={{ padding: '0.25rem', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                                title="Add Stock"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                className="btn btn-secondary btn-icon"
                                onClick={() => openAdjustModal(p, 'Sub')}
                                style={{ padding: '0.25rem', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                disabled={isOutOfStock}
                                title="Deduct Stock"
                              >
                                <Minus size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                No inventory records found matching filters.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Stock Audit History log */
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Audit Ledger of Stock Movements</h3>
          
          {sortedHistory.length > 0 ? (
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Movement Type</th>
                    <th style={{ textAlign: 'center' }}>Quantity Delta</th>
                    <th>Reference ID</th>
                    <th>Audit Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((log) => {
                    const isAddition = log.qty > 0;
                    return (
                      <tr key={log.id}>
                        <td>{new Date(log.date).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{log.productName}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${
                            log.type === 'Purchase' ? 'badge-info' : 
                            log.type === 'Sale' ? 'badge-success' : 
                            log.type === 'Return' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: isAddition ? 'var(--success)' : 'var(--danger)' }}>
                          {isAddition ? '+' : ''}{Number(log.qty.toFixed(3))}
                        </td>
                        <td style={{ fontFamily: 'Courier New', fontWeight: 600 }}>{log.referenceNo}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{log.reason || 'Transaction checkout'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              No inventory adjustments or billing changes logged yet.
            </div>
          )}
        </div>
      )}

      {/* Adjustment Modal */}
      {isAdjustModalOpen && adjustProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Warehouse size={18} style={{ color: 'var(--primary)' }} />
                <span>Adjust Stock: {adjustProduct.name}</span>
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsAdjustModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <span>Current Inventory Balance:</span>
                  <strong>{Number(adjustProduct.currentStock.toFixed(3))} {adjustProduct.unit}</strong>
                </div>

                <div className="form-group">
                  <label>Adjustment Action</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${adjustDirection === 'Add' ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => setAdjustDirection('Add')}
                      style={{ fontSize: '0.8rem' }}
                    >
                      <ArrowUpRight size={14} />
                      <span>Add / Increase Stock</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${adjustDirection === 'Sub' ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => setAdjustDirection('Sub')}
                      style={{ fontSize: '0.8rem' }}
                    >
                      <ArrowDownRight size={14} />
                      <span>Remove / Decrease Stock</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Quantity Delta *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="0"
                    step="any"
                    value={adjustQty || ''}
                    onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label>Audit Log Reason *</label>
                  <select
                    className="form-control"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  >
                    {adjustDirection === 'Add' ? (
                      <>
                        <option value="Manual Stock Take Add">Manual Stock Take Add</option>
                        <option value="Supplier Over-delivery">Supplier Over-delivery</option>
                        <option value="Found Missing Stock">Found Missing Stock</option>
                      </>
                    ) : (
                      <>
                        <option value="Damaged Stock Deduct">Damaged Stock Deduct</option>
                        <option value="Expired / Spoiled Stock">Expired / Spoiled Stock</option>
                        <option value="Theft / Inventory Shrinkage">Theft / Inventory Shrinkage</option>
                        <option value="Manual Stock Take Sub">Manual Stock Take Sub</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
