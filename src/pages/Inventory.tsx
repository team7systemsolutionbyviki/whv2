import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DB, Product, ProductVariation } from '../utils/db';
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
  Minus,
  LayoutGrid,
  List,
  Info,
  Calendar,
  User,
  Truck
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { products, stockHistory, sales, suppliers, refreshData, showToast } = useApp();
  const [subTab, setSubTab] = useState<'levels' | 'history'>('levels');

  // Filter & Layout modes
  const [stockType, setStockType] = useState<'purchase' | 'commission'>('purchase');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Audit Log specific Filter
  const [auditTypeFilter, setAuditTypeFilter] = useState<'all' | 'purchase' | 'commission'>('all');

  // Adjustment Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [isCommissionAdjustment, setIsCommissionAdjustment] = useState(false);
  const [adjustCommissionLot, setAdjustCommissionLot] = useState<any | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<'Add' | 'Sub'>('Add');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Manual Stock Take');
  const [selectedVariationId, setSelectedVariationId] = useState('');

  const openAdjustModal = (product: Product, direction: 'Add' | 'Sub') => {
    setIsCommissionAdjustment(false);
    setAdjustCommissionLot(null);
    setAdjustProduct(product);
    setAdjustDirection(direction);
    setAdjustQty(0);
    setAdjustReason(direction === 'Add' ? 'Received stock' : 'Damaged / Expired stock');
    setSelectedVariationId(product.variations && product.variations.length > 0 ? product.variations[0].id : '');
    setIsAdjustModalOpen(true);
  };

  const openCommissionAdjustModal = (lot: any, direction: 'Add' | 'Sub') => {
    setIsCommissionAdjustment(true);
    setAdjustProduct(null);
    setAdjustCommissionLot(lot);
    setAdjustDirection(direction);
    setAdjustQty(0);
    setAdjustReason(direction === 'Add' ? 'Manual Stock Take Add' : 'Damaged Stock Deduct');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCommissionAdjustment) {
      if (!adjustCommissionLot || adjustQty <= 0) {
        showToast('Please enter a valid adjustment quantity', 'warning');
        return;
      }

      if (adjustDirection === 'Sub' && adjustQty > adjustCommissionLot.remainingBags) {
        showToast('Adjustment exceeds current remaining bags!', 'warning');
        return;
      }

      const history = DB.getStockHistory();
      const adjustKg = adjustQty * 45; // Standard 45 Kg per bag
      const qtyDelta = adjustDirection === 'Add' ? adjustKg : -adjustKg;
      const bagsDelta = adjustDirection === 'Add' ? adjustQty : -adjustQty;

      history.push({
        id: 'T' + Date.now() + Math.random().toString(36).substr(2, 4),
        date: new Date().toISOString(),
        productId: 'COMMISSION',
        productName: `Commission (${adjustCommissionLot.mark})`,
        type: adjustDirection === 'Add' ? 'Adjustment (Add)' : 'Adjustment (Sub)',
        qty: qtyDelta,
        referenceNo: adjustCommissionLot.lotNo,
        reason: adjustReason,
        commissionPurchaseId: adjustCommissionLot.commissionPurchaseId,
        variationMark: adjustCommissionLot.mark,
        bagsQty: bagsDelta
      });
      DB.setJSON('billing_stock_history', history);

      refreshData();
      setIsAdjustModalOpen(false);
      setAdjustCommissionLot(null);
      setIsCommissionAdjustment(false);
      showToast(`Stock adjusted successfully for Lot ${adjustCommissionLot.lotNo} (Mark: ${adjustCommissionLot.mark})`, 'success');
      return;
    }

    if (!adjustProduct || adjustQty <= 0) {
      showToast('Please enter a valid adjustment quantity', 'warning');
      return;
    }

    if (adjustDirection === 'Sub') {
      const currentStockLimit = adjustProduct.variations && selectedVariationId
        ? adjustProduct.variations.find(v => v.id === selectedVariationId)?.currentStock || 0
        : adjustProduct.currentStock;

      if (adjustQty > currentStockLimit) {
        showToast('Adjustment exceeds current stock levels!', 'warning');
        return;
      }
    }

    DB.adjustStock(adjustProduct.id, adjustQty, adjustDirection, adjustReason, selectedVariationId);
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

  const commissionGoodsStock = React.useMemo(() => {
    const commissionPurchases = DB.getCommissionPurchases();
    const soldBagsMap = new Map<string, number>();
    const adjustmentsMap = new Map<string, number>();

    // 1. Calculate sold bags from sales
    sales.forEach(sale => {
      if (sale.status === 'completed') {
        sale.items.forEach(item => {
          if (item.commissionPurchaseId) {
            const key = `${item.commissionPurchaseId}-${item.variationMark || ''}`;
            soldBagsMap.set(key, (soldBagsMap.get(key) || 0) + (item.bags || 0));
          }
        });
      }
    });

    // 2. Calculate adjustments from stockHistory
    stockHistory.forEach(log => {
      if (log.productId === 'COMMISSION' && log.referenceNo) {
        const key = `${log.referenceNo}-${log.variationMark || ''}`;
        const bagsVal = log.bagsQty !== undefined ? log.bagsQty : (log.qty / 45);
        adjustmentsMap.set(key, (adjustmentsMap.get(key) || 0) + bagsVal);
      }
    });

    const list: Array<{
      id: string;
      commissionPurchaseId: string;
      lotNo: string;
      date: string;
      supplierId: string;
      supplierName: string;
      lorryNo: string;
      vehicleMark?: string;
      mark: string;
      initialBags: number;
      remainingBags: number;
      salesPrice: number;
    }> = [];

    commissionPurchases.forEach(cp => {
      const supplier = suppliers.find(s => s.id === cp.supplierId);
      const supplierName = supplier ? supplier.name : 'Unknown';
      
      cp.items.forEach(item => {
        const key = `${cp.id}-${item.mark}`;
        const sold = soldBagsMap.get(key) || 0;
        const adjusted = adjustmentsMap.get(key) || 0;
        const remaining = item.bags - sold + adjusted;
        
        list.push({
          id: key,
          commissionPurchaseId: cp.id,
          lotNo: cp.billNo,
          date: cp.date,
          supplierId: cp.supplierId,
          supplierName,
          lorryNo: cp.lorryNo || '—',
          vehicleMark: cp.vehicleMark || '—',
          mark: item.mark,
          initialBags: item.bags,
          remainingBags: Math.max(0, remaining),
          salesPrice: item.salesPrice || 0
        });
      });
    });

    return list;
  }, [sales, stockHistory, suppliers]);

  const filteredCommissionStock = React.useMemo(() => {
    return commissionGoodsStock.filter(item => {
      const matchesSearch = item.lotNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.mark.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.lorryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.vehicleMark && item.vehicleMark.toLowerCase().includes(searchTerm.toLowerCase()));
      if (stockFilter === 'low') {
        return matchesSearch && item.remainingBags <= 5 && item.remainingBags > 0;
      }
      if (stockFilter === 'out') {
        return matchesSearch && item.remainingBags === 0;
      }
      return matchesSearch;
    });
  }, [commissionGoodsStock, searchTerm, stockFilter]);

  // Sort history newest first, filtered by type
  const sortedHistory = [...stockHistory]
    .filter(log => {
      if (auditTypeFilter === 'purchase') {
        return log.productId !== 'COMMISSION';
      }
      if (auditTypeFilter === 'commission') {
        return log.productId === 'COMMISSION';
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

      {subTab === 'levels' && (
        <div className="dashboard-grid">
          {/* Card 1: Purchase Goods Stock */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', cursor: 'pointer' }} onClick={() => setStockType('purchase')}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Purchase Goods Inventory</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.25rem' }}>
              <h3 style={{ fontSize: '1.5rem' }}>{products.length} Products</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                {products.filter(p => p.currentStock <= p.minStockAlert).length} low/out alerts
              </span>
            </div>
          </div>
          
          {/* Card 2: Commission Goods Consignment */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)', cursor: 'pointer' }} onClick={() => setStockType('commission')}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Commission Consignment Stock</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.25rem' }}>
              <h3 style={{ fontSize: '1.5rem' }}>{commissionGoodsStock.reduce((s, x) => s + x.remainingBags, 0).toFixed(0)} Bags</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                {commissionGoodsStock.filter(x => x.remainingBags > 0).length} active lots
              </span>
            </div>
          </div>
        </div>
      )}

      {subTab === 'levels' ? (
        /* Stock Levels view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filters Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '40px' }}
                  placeholder={stockType === 'purchase' ? "Search standard stock by name or barcode..." : "Search consignment by lot, mark, lorry or supplier..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button 
                  className={`btn ${stockType === 'purchase' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
                  onClick={() => setStockType('purchase')}
                >
                  Purchase Goods
                </button>
                <button 
                  className={`btn ${stockType === 'commission' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
                  onClick={() => setStockType('commission')}
                >
                  Commission Goods
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  className={`btn ${stockFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => setStockFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`btn ${stockFilter === 'low' ? 'btn-warning' : 'btn-ghost'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => setStockFilter('low')}
                >
                  Low
                </button>
                <button 
                  className={`btn ${stockFilter === 'out' ? 'btn-danger' : 'btn-ghost'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => setStockFilter('out')}
                >
                  Out
                </button>
              </div>

              {/* Layout Toggle */}
              <div style={{ display: 'flex', gap: '0.25rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                <button 
                  className={`btn btn-icon ${layoutMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem' }}
                  onClick={() => setLayoutMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button 
                  className={`btn btn-icon ${layoutMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem' }}
                  onClick={() => setLayoutMode('table')}
                  title="Table View"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* GRID (CARD) VIEW - PURCHASE GOODS */}
          {layoutMode === 'grid' && stockType === 'purchase' && (
            filteredProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {filteredProducts.map(p => {
                  const isOutOfStock = p.currentStock === 0;
                  const isLowStock = p.currentStock <= p.minStockAlert;
                  return (
                    <div key={p.id} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{p.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Category: {p.category}</span>
                        </div>
                        <span className={`badge ${
                          isOutOfStock ? 'badge-danger' : 
                          isLowStock ? 'badge-warning' : 'badge-success'
                        }`} style={{ fontWeight: 700 }}>
                          {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Barcode: <strong>{p.barcode}</strong></span>
                        <span style={{ color: 'var(--text-secondary)' }}>Min Alert: <strong>{p.minStockAlert} {p.unit}</strong></span>
                      </div>

                      {p.variations && p.variations.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                          {p.variations.map(v => (
                            <span key={v.id} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.15)' }}>
                              {v.mark}: {Number(v.currentStock.toFixed(3))}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>CURRENT BALANCE</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isOutOfStock ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--success)' }}>
                            {Number(p.currentStock.toFixed(3))} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{p.unit}</span>
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            onClick={() => openAdjustModal(p, 'Add')}
                            style={{ padding: '0.4rem', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                            title="Add Stock"
                          >
                            <Plus size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            onClick={() => openAdjustModal(p, 'Sub')}
                            style={{ padding: '0.4rem', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            disabled={isOutOfStock}
                            title="Deduct Stock"
                          >
                            <Minus size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                No standard inventory records found matching search filters.
              </div>
            )
          )}

          {/* GRID (CARD) VIEW - COMMISSION GOODS */}
          {layoutMode === 'grid' && stockType === 'commission' && (
            filteredCommissionStock.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {filteredCommissionStock.map(item => {
                  const isOut = item.remainingBags === 0;
                  const isLow = item.remainingBags <= 5 && item.remainingBags > 0;
                  const percent = Math.min(100, Math.max(0, (item.remainingBags / item.initialBags) * 100));
                  return (
                    <div key={item.id} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: isOut ? 0.65 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Mark: <span style={{ color: 'var(--primary)' }}>{item.mark}</span></h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}><User size={11} /> {item.supplierName}</span>
                        </div>
                        <span className={`badge ${
                          isOut ? 'badge-danger' : 
                          isLow ? 'badge-warning' : 'badge-success'
                        }`} style={{ fontWeight: 700 }}>
                          {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}><Truck size={11} /> Lot No: <strong>{item.lotNo}</strong></span>
                        <span style={{ color: 'var(--text-secondary)' }}>Lorry: <strong>{item.lorryNo} {item.vehicleMark && item.vehicleMark !== '—' ? `(${item.vehicleMark})` : ''}</strong></span>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px', gridColumn: 'span 2' }}><Calendar size={11} /> Date Inward: <strong>{new Date(item.date).toLocaleDateString()}</strong></span>
                      </div>

                      <div style={{ marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          <span>Bags Ratio</span>
                          <span>{item.remainingBags} / {item.initialBags} Bags ({percent.toFixed(0)}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>REMAINING WEIGHT</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' }}>
                            {item.remainingBags * 45} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Kg</span>
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            onClick={() => openCommissionAdjustModal(item, 'Add')}
                            style={{ padding: '0.4rem', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                            title="Add Bags"
                          >
                            <Plus size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            onClick={() => openCommissionAdjustModal(item, 'Sub')}
                            style={{ padding: '0.4rem', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            disabled={isOut}
                            title="Deduct Bags"
                          >
                            <Minus size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                No consignment records found matching search filters.
              </div>
            )
          )}

          {/* TABLE VIEW - PURCHASE GOODS */}
          {layoutMode === 'table' && stockType === 'purchase' && (
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
                              {p.variations && p.variations.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                  {p.variations.map(v => (
                                    <span key={v.id} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                      {v.mark}: Stock: {Number(v.currentStock.toFixed(3))}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                                {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-icon"
                                  onClick={() => openAdjustModal(p, 'Add')}
                                  style={{ padding: '0.25rem', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                                  title="Add Stock"
                                >
                                  <Plus size={14} />
                                </button>
                                <button
                                  type="button"
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
                  No standard inventory records found matching filters.
                </div>
              )}
            </div>
          )}

          {/* TABLE VIEW - COMMISSION GOODS */}
          {layoutMode === 'table' && stockType === 'commission' && (
            <div className="glass-panel" style={{ padding: '1rem' }}>
              {filteredCommissionStock.length > 0 ? (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Consignment Details</th>
                        <th>Supplier</th>
                        <th>Lorry / Vehicle</th>
                        <th style={{ textAlign: 'center' }}>Initial Stock</th>
                        <th style={{ textAlign: 'center' }}>Remaining Stock</th>
                        <th style={{ textAlign: 'center' }}>Stock Health</th>
                        <th style={{ textAlign: 'center' }}>Quick Adjust</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCommissionStock.map(item => {
                        const isOut = item.remainingBags === 0;
                        const isLow = item.remainingBags <= 5 && item.remainingBags > 0;
                        return (
                          <tr key={item.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Mark: {item.mark}</div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date Inward: {new Date(item.date).toLocaleDateString()}</span>
                            </td>
                            <td>{item.supplierName}</td>
                            <td style={{ fontFamily: 'monospace' }}>{item.lorryNo} {item.vehicleMark && item.vehicleMark !== '—' ? `(${item.vehicleMark})` : ''}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.initialBags} Bags ({item.initialBags * 45} Kg)</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' }}>
                                {item.remainingBags} Bags ({item.remainingBags * 45} Kg)
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${
                                isOut ? 'badge-danger' : 
                                isLow ? 'badge-warning' : 'badge-success'
                              }`} style={{ fontWeight: 700 }}>
                                {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-icon"
                                  onClick={() => openCommissionAdjustModal(item, 'Add')}
                                  style={{ padding: '0.25rem', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                                  title="Add Bags"
                                >
                                  <Plus size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-icon"
                                  onClick={() => openCommissionAdjustModal(item, 'Sub')}
                                  style={{ padding: '0.25rem', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                  disabled={isOut}
                                  title="Deduct Bags"
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
                  No commission goods consignment records found matching filters.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Stock Audit History log */
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Audit Ledger of Stock Movements</h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter Audit Log:</span>
              <select
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: '32px', width: '200px' }}
                value={auditTypeFilter}
                onChange={(e) => setAuditTypeFilter(e.target.value as any)}
              >
                <option value="all">All Movements</option>
                <option value="purchase">Purchase Goods Only</option>
                <option value="commission">Commission Goods Only</option>
              </select>
            </div>
          </div>
          
          {sortedHistory.length > 0 ? (
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Product / Consignment</th>
                    <th style={{ textAlign: 'center' }}>Movement Type</th>
                    <th style={{ textAlign: 'center' }}>Quantity Delta</th>
                    <th>Reference ID / Lot</th>
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
                            log.type.startsWith('Purchase') ? 'badge-info' : 
                            log.type.startsWith('Sale') ? 'badge-success' : 
                            log.type.startsWith('Return') ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: isAddition ? 'var(--success)' : 'var(--danger)' }}>
                          {isAddition ? '+' : ''}
                          {log.productId === 'COMMISSION' && (log as any).bagsQty !== undefined
                            ? `${(log as any).bagsQty} Bags (${Number(log.qty.toFixed(1))} Kg)` 
                            : `${Number(log.qty.toFixed(3))}`}
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
      {isAdjustModalOpen && (adjustProduct || adjustCommissionLot) && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Warehouse size={18} style={{ color: 'var(--primary)' }} />
                <span>
                  {isCommissionAdjustment 
                    ? `Adjust Consignment Lot: ${adjustCommissionLot.lotNo}` 
                    : `Adjust Stock: ${adjustProduct?.name}`}
                </span>
              </h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setIsAdjustModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <span>Current Inventory Balance:</span>
                  <strong>
                    {isCommissionAdjustment 
                      ? `${adjustCommissionLot.remainingBags} Bags (${adjustCommissionLot.remainingBags * 45} Kg)`
                      : `${Number(adjustProduct?.currentStock.toFixed(3))} ${adjustProduct?.unit}`}
                  </strong>
                </div>

                {!isCommissionAdjustment && adjustProduct && adjustProduct.variations && adjustProduct.variations.length > 0 && (
                  <div className="form-group">
                    <label>Select Variation / Mark *</label>
                    <select
                      className="form-control"
                      value={selectedVariationId}
                      onChange={(e) => setSelectedVariationId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Variation --</option>
                      {adjustProduct.variations.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.mark} (Current Stock: {Number(v.currentStock.toFixed(3))} {adjustProduct.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                  <label>{isCommissionAdjustment ? 'Quantity Delta in Bags *' : 'Quantity Delta *'}</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="0"
                    step={isCommissionAdjustment ? "1" : "any"}
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
                    {isCommissionAdjustment ? (
                      adjustDirection === 'Add' ? (
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
                      )
                    ) : (
                      adjustDirection === 'Add' ? (
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
                      )
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
