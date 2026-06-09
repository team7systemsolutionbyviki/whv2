import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DB, Product, ProductVariation } from '../utils/db';
import { 
  TrendingUp, 
  Search, 
  DollarSign, 
  Percent, 
  Save, 
  Plus, 
  ListFilter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DisplayRow {
  key: string;
  productId: string;
  variationId?: string;
  isVariation: boolean;
  name: string;
  mark?: string;
  category: string;
  purchasePrice: number;
  salesPrice: number;
  currentStock: number;
  unit: string;
}

export const ProfitAdder: React.FC = () => {
  const { products, refreshData, showToast } = useApp();

  // Selected row keys
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Adjustment form states
  const [priceTarget, setPriceTarget] = useState<'sales' | 'purchase' | 'both'>('sales');
  const [adjustMode, setAdjustMode] = useState<'flat' | 'percent' | 'margin'>('margin');
  const [adjustValue, setAdjustValue] = useState<number>(10);

  // List unique categories for dropdown
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category)));
  }, [products]);

  // Construct flat list of products and variations
  const displayRows = useMemo(() => {
    const rows: DisplayRow[] = [];
    products.forEach(p => {
      // Root product
      rows.push({
        key: p.id,
        productId: p.id,
        isVariation: false,
        name: p.name,
        category: p.category,
        purchasePrice: p.purchasePrice,
        salesPrice: p.salesPrice,
        currentStock: p.currentStock,
        unit: p.unit
      });

      // Variation items
      if (p.variations && p.variations.length > 0) {
        p.variations.forEach(v => {
          rows.push({
            key: `${p.id}-${v.id}`,
            productId: p.id,
            variationId: v.id,
            isVariation: true,
            name: p.name,
            mark: v.mark,
            category: p.category,
            purchasePrice: v.purchasePrice,
            salesPrice: v.salesPrice,
            currentStock: v.currentStock,
            unit: v.unit || p.unit
          });
        });
      }
    });
    return rows;
  }, [products]);

  // Filter display rows based on search and category selections
  const filteredRows = useMemo(() => {
    return displayRows.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (row.mark && row.mark.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            row.productId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || row.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [displayRows, searchQuery, categoryFilter]);

  // Handle toggling select checkboxes
  const handleToggleRow = (row: DisplayRow) => {
    const isSelected = selectedKeys.includes(row.key);
    let newSelected = [...selectedKeys];

    if (row.isVariation) {
      if (isSelected) {
        newSelected = newSelected.filter(k => k !== row.key);
      } else {
        newSelected.push(row.key);
      }
    } else {
      // Toggling root parent toggles parent plus all children variations
      const children = displayRows.filter(r => r.productId === row.productId && r.isVariation);
      const childKeys = children.map(c => c.key);
      const allKeys = [row.key, ...childKeys];

      if (isSelected) {
        newSelected = newSelected.filter(k => !allKeys.includes(k));
      } else {
        allKeys.forEach(k => {
          if (!newSelected.includes(k)) newSelected.push(k);
        });
      }
    }
    setSelectedKeys(newSelected);
  };

  // Check if all filtered rows are selected
  const allVisibleSelected = useMemo(() => {
    const visibleKeys = filteredRows.map(r => r.key);
    return visibleKeys.length > 0 && visibleKeys.every(k => selectedKeys.includes(k));
  }, [filteredRows, selectedKeys]);

  const handleToggleSelectAll = () => {
    const visibleKeys = filteredRows.map(r => r.key);
    if (allVisibleSelected) {
      setSelectedKeys(prev => prev.filter(k => !visibleKeys.includes(k)));
    } else {
      setSelectedKeys(prev => {
        const next = [...prev];
        visibleKeys.forEach(k => {
          if (!next.includes(k)) next.push(k);
        });
        return next;
      });
    }
  };

  // Helper to preview prices before committing them to DB
  const calculatePreview = (row: DisplayRow) => {
    const isSelected = selectedKeys.includes(row.key);
    if (!isSelected) {
      return { 
        purchase: row.purchasePrice, 
        sales: row.salesPrice, 
        profit: row.salesPrice - row.purchasePrice,
        profitPercent: row.purchasePrice > 0 ? ((row.salesPrice - row.purchasePrice) / row.purchasePrice) * 100 : 0
      };
    }

    let previewPurchase = row.purchasePrice;
    let previewSales = row.salesPrice;

    // Apply Purchase Price adjustment
    if (priceTarget === 'purchase' || priceTarget === 'both') {
      if (adjustMode === 'flat') {
        previewPurchase += adjustValue;
      } else if (adjustMode === 'percent') {
        previewPurchase *= (1 + adjustValue / 100);
      }
    }

    // Apply Sales Price adjustment
    if (priceTarget === 'sales' || priceTarget === 'both') {
      if (adjustMode === 'flat') {
        previewSales += adjustValue;
      } else if (adjustMode === 'percent') {
        previewSales *= (1 + adjustValue / 100);
      } else if (adjustMode === 'margin') {
        // margin sets Sales Price = Purchase Price * (1 + margin / 100)
        previewSales = previewPurchase * (1 + adjustValue / 100);
      }
    }

    previewPurchase = Math.max(0, Number(previewPurchase.toFixed(2)));
    previewSales = Math.max(0, Number(previewSales.toFixed(2)));
    const profit = previewSales - previewPurchase;
    const profitPercent = previewPurchase > 0 ? (profit / previewPurchase) * 100 : 0;

    return {
      purchase: previewPurchase,
      sales: previewSales,
      profit,
      profitPercent
    };
  };

  // Apply simulated updates to database
  const handleApplyAdjustments = () => {
    if (selectedKeys.length === 0) {
      showToast('No products selected for price updates', 'warning');
      return;
    }

    const confirmMsg = `Are you sure you want to update prices for ${selectedKeys.length} selected items? This will instantly change store pricing.`;
    if (!confirm(confirmMsg)) return;

    const catalog = DB.getProducts();
    let updatedCount = 0;
    const modifiedProdIds = new Set<string>();

    // Loop selected keys and apply math
    selectedKeys.forEach(key => {
      const parts = key.split('-');
      const prodId = parts[0];
      const varId = parts[1]; // undefined for root products

      const prodIdx = catalog.findIndex(p => p.id === prodId);
      if (prodIdx >= 0) {
        const prod = catalog[prodIdx];
        modifiedProdIds.add(prodId);

        if (!varId) {
          // Update root product prices
          const rowData: DisplayRow = {
            key,
            productId: prodId,
            isVariation: false,
            name: prod.name,
            category: prod.category,
            purchasePrice: prod.purchasePrice,
            salesPrice: prod.salesPrice,
            currentStock: prod.currentStock,
            unit: prod.unit
          };
          const preview = calculatePreview(rowData);
          prod.purchasePrice = preview.purchase;
          prod.salesPrice = preview.sales;
          updatedCount++;
        } else if (prod.variations) {
          // Update variations
          const vIdx = prod.variations.findIndex(v => v.id === varId);
          if (vIdx >= 0) {
            const v = prod.variations[vIdx];
            const rowData: DisplayRow = {
              key,
              productId: prodId,
              variationId: varId,
              isVariation: true,
              name: prod.name,
              mark: v.mark,
              category: prod.category,
              purchasePrice: v.purchasePrice,
              salesPrice: v.salesPrice,
              currentStock: v.currentStock,
              unit: v.unit || prod.unit
            };
            const preview = calculatePreview(rowData);
            v.purchasePrice = preview.purchase;
            v.salesPrice = preview.sales;
            updatedCount++;
          }
        }
      }
    });

    // Post-process: sync parent prices with first variation for any modified products with variations
    modifiedProdIds.forEach(prodId => {
      const prod = catalog.find(p => p.id === prodId);
      if (prod && prod.variations && prod.variations.length > 0) {
        prod.purchasePrice = prod.variations[0].purchasePrice;
        prod.salesPrice = prod.variations[0].salesPrice;
      }
    });

    // Save optimized to localStorage & Firebase
    if (updatedCount > 0) {
      DB.setJSON('billing_products', catalog);
    }

    refreshData();
    setSelectedKeys([]);
    showToast(`Successfully updated ${updatedCount} items in the database!`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Profit Margin & Price Adder</h1>
          <p>Configure profit margins and adjust cost/sales prices across multiple batch items at once</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Side: Filter Catalog & Select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filter Toolbar */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px', height: '38px' }}
                placeholder="Search catalog by name or variation mark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}>
              <ListFilter size={16} style={{ color: 'var(--primary)' }} />
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product selection Table */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Products Selection Journal</h3>
              <span className="badge badge-info" style={{ padding: '0.25rem 0.5rem' }}>
                Selected: {selectedKeys.length} / {displayRows.length}
              </span>
            </div>

            {filteredRows.length > 0 ? (
              <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem', borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={handleToggleSelectAll}
                          style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                        />
                      </th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item Name</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', width: '100px' }}>Mark</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '80px' }}>Cost Price</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '80px' }}>Sales Price</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '70px' }}>Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const isSelected = selectedKeys.includes(row.key);
                      const preview = calculatePreview(row);
                      const isPriceChanged = preview.sales !== row.salesPrice || preview.purchase !== row.purchasePrice;
                      
                      return (
                        <tr 
                          key={row.key} 
                          style={{ 
                            borderBottom: '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                            paddingLeft: row.isVariation ? '1.5rem' : '0.5rem',
                          }}
                        >
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(row)}
                              style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', paddingLeft: row.isVariation ? '1.5rem' : '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: row.isVariation ? 500 : 700, color: row.isVariation ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                {row.isVariation ? `└ ${row.name}` : row.name}
                              </span>
                              {!row.isVariation && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  Category: {row.category} | Stock: {row.currentStock} {row.unit}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            {row.mark ? (
                              <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                                {row.mark}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          {/* Cost Column */}
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <div>₹{row.purchasePrice.toFixed(2)}</div>
                            {isSelected && isPriceChanged && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>
                                → ₹{preview.purchase.toFixed(2)}
                              </div>
                            )}
                          </td>
                          {/* Sales Column */}
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <div>₹{row.salesPrice.toFixed(2)}</div>
                            {isSelected && isPriceChanged && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>
                                → ₹{preview.sales.toFixed(2)}
                              </div>
                            )}
                          </td>
                          {/* Profit Margin Column */}
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <div>
                              {row.purchasePrice > 0 
                                ? `${(((row.salesPrice - row.purchasePrice)/row.purchasePrice)*100).toFixed(0)}%` 
                                : '0%'}
                            </div>
                            {isSelected && isPriceChanged && (
                              <div style={{ fontSize: '0.7rem', color: preview.profitPercent >= ((row.salesPrice - row.purchasePrice)/row.purchasePrice)*100 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                → {preview.profitPercent.toFixed(0)}%
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                No products found matching filters.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Price Adjuster Operations Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              <span>Bulk Margin Adjustments</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Target Selector */}
              <div className="form-group">
                <label>1. Select Price Target to Adjust</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {(['sales', 'purchase', 'both'] as const).map(target => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => {
                        setPriceTarget(target);
                        // Profit margin is not applicable to purchase price adjustments
                        if (target === 'purchase' && adjustMode === 'margin') {
                          setAdjustMode('flat');
                        }
                      }}
                      className={`btn ${priceTarget === target ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.5rem 0', fontSize: '0.8rem', textTransform: 'capitalize' }}
                    >
                      {target === 'sales' && 'Sales Price'}
                      {target === 'purchase' && 'Cost Price'}
                      {target === 'both' && 'Both Prices'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Adjustment Mode */}
              <div className="form-group">
                <label>2. Choose Price Adjustment Rule</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {(['flat', 'percent', 'margin'] as const).map(mode => {
                    const isDisabled = priceTarget === 'purchase' && mode === 'margin';
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => !isDisabled && setAdjustMode(mode)}
                        className={`btn ${adjustMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ 
                          padding: '0.5rem 0', 
                          fontSize: '0.8rem',
                          opacity: isDisabled ? 0.4 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isDisabled}
                      >
                        {mode === 'flat' && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                            <DollarSign size={13} />
                            <span>Flat (₹)</span>
                          </div>
                        )}
                        {mode === 'percent' && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                            <Percent size={13} />
                            <span>Percent (%)</span>
                          </div>
                        )}
                        {mode === 'margin' && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                            <TrendingUp size={13} />
                            <span>Margin (%)</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Value Input */}
              <div className="form-group">
                <label>
                  {adjustMode === 'flat' && '3. Enter Flat Adjust Value (e.g. 5 to add ₹5, -10 to discount ₹10)'}
                  {adjustMode === 'percent' && '3. Enter Percentage Value (e.g. 10 for +10% price, -5 for -5% discount)'}
                  {adjustMode === 'margin' && '3. Enter Target Profit Markup on Cost (e.g. 20 sets Sales = Cost + 20%)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1rem', padding: '0.5rem', fontWeight: 600 }}
                    value={adjustValue === 0 ? '' : adjustValue}
                    onChange={(e) => setAdjustValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Summary Audit Box */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Price Points Selected:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedKeys.length} items</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Price Operation:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {adjustMode === 'flat' && `Add ₹${adjustValue.toFixed(2)}`}
                    {adjustMode === 'percent' && `Adjust by ${adjustValue}%`}
                    {adjustMode === 'margin' && `Set Sales Price to Cost + ${adjustValue}% Margin`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', color: 'var(--warning)', fontSize: '0.75rem' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>Always review simulated arrows (→) in the selection table before applying.</span>
                </div>
              </div>

              {/* Commit Action button */}
              <button
                className="btn btn-primary"
                onClick={handleApplyAdjustments}
                disabled={selectedKeys.length === 0}
                style={{ 
                  padding: '0.75rem', 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  boxShadow: selectedKeys.length > 0 ? 'var(--primary-glow)' : 'none'
                }}
              >
                <Save size={16} />
                <span>Apply Bulk Adjustments ({selectedKeys.length})</span>
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
