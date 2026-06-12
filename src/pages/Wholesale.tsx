import React, { useState, useEffect } from 'react';
import { useApp, CartItem } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DB, Product, Sale, Dealer, ProductVariation } from '../utils/db';
import { 
  Users, 
  Plus, 
  Minus,
  Search, 
  Trash2, 
  Check, 
  CreditCard, 
  FileText, 
  DollarSign,
  UserPlus,
  AlertCircle,
  X
} from 'lucide-react';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { getCartItemWeightInKg } from '../utils/weight';

export const Wholesale: React.FC = () => {
  const { user } = useAuth();
  const {
    products,
    dealers,
    refreshData,
    showToast,
    wholesaleCart,
    addToWholesaleCart,
    removeFromWholesaleCart,
    updateWholesaleQty,
    updateWholesalePrice,
    updateWholesaleUnit,
    updateWholesaleWeight,
    updateWholesaleBags,
    clearWholesaleCart,
    wholesaleDiscount,
    setWholesaleDiscount,
    selectedDealerId,
    setSelectedDealerId,
    settings
  } = useApp();

  const [subTab, setSubTab] = useState<'billing' | 'dealers'>('billing');
  
  // Billing Search states
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [variationSelectorProduct, setVariationSelectorProduct] = useState<Product | null>(null);

  // Dealer Management states
  const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
  const [dealerName, setDealerName] = useState('');
  const [dealerPhone, setDealerPhone] = useState('');
  const [dealerAddress, setDealerAddress] = useState('');
  const [selectedStatementDealer, setSelectedStatementDealer] = useState<Dealer | null>(null);

  // Dues payment state
  const [isPayDuesOpen, setIsPayDuesOpen] = useState(false);
  const [payDuesAmount, setPayDuesAmount] = useState<number>(0);
  const [payDuesDealer, setPayDuesDealer] = useState<Dealer | null>(null);

  // Print completed invoice
  const [justCompletedSale, setJustCompletedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (productSearch.trim().length > 1) {
      const results = products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch)
      );
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [productSearch, products]);

  // Set default price override (wholesale defaults to 12% lower than retail sales price or cost + 8%)
  const getWholesaleDefaultPrice = (prod: Product, variation?: ProductVariation, currentUnit?: string) => {
    let salesPrice = prod.salesPrice;
    let purchasePrice = prod.purchasePrice;

    if (variation) {
      const unitVal = currentUnit || variation.unit || prod.unit;
      if (variation.unit2 && unitVal === variation.unit2) {
        salesPrice = variation.salesPrice2 || 0;
        purchasePrice = variation.purchasePrice2 || variation.purchasePrice;
      } else {
        salesPrice = variation.salesPrice;
        purchasePrice = variation.purchasePrice;
      }
    }

    const margin = salesPrice - purchasePrice;
    // wholesale price is purchase price + 40% of standard profit margin (making it cheaper for dealers)
    const wholesalePrice = purchasePrice + (margin * 0.4);
    return Number(wholesalePrice.toFixed(2));
  };

  const getEffectivePrice = (item: CartItem) => {
    const baseWholesale = item.customPrice !== undefined 
      ? item.customPrice 
      : getWholesaleDefaultPrice(item.product, item.variation, item.customUnit || (item.variation ? (item.variation.unit || item.product.unit) : item.product.unit));
    
    // Bulk Quantity Pricing: If quantity >= 10, apply an extra 5% bulk discount
    if (item.qty >= 10) {
      return Number((baseWholesale * 0.95).toFixed(2));
    }
    return baseWholesale;
  };

  const isPricePerKg = (item: CartItem): boolean => {
    const baseUnit = (item.variation?.unit || item.product.unit || '').toLowerCase().trim();
    return baseUnit === 'kg';
  };

  const getCartItemTotal = (item: CartItem): number => {
    const price = getEffectivePrice(item);
    if (isPricePerKg(item)) {
      return price * getCartItemWeightInKg(item);
    }
    return price * item.qty;
  };

  // Wholesale cart calculations
  const cartSubtotal = wholesaleCart.reduce((sum, item) => {
    return sum + getCartItemTotal(item);
  }, 0);
  const cartTotalWeight = wholesaleCart.reduce((sum, item) => sum + getCartItemWeightInKg(item), 0);
  
  const cartTotal = Math.max(0, cartSubtotal - wholesaleDiscount);
  const cartTax = Number((cartTotal * (settings.taxRate / (100 + settings.taxRate))).toFixed(2));
  
  const totalProfit = wholesaleCart.reduce((sum, item) => {
    const purchasePrice = item.variation 
      ? ((item.variation.unit2 && (item.customUnit || item.variation.unit || item.product.unit) === item.variation.unit2) 
         ? (item.variation.purchasePrice2 || item.variation.purchasePrice) 
         : item.variation.purchasePrice)
      : item.product.purchasePrice;
    const cost = isPricePerKg(item)
      ? purchasePrice * getCartItemWeightInKg(item)
      : purchasePrice * item.qty;
    const price = getEffectivePrice(item);
    const revenue = getCartItemTotal(item);
    const itemDiscount = cartSubtotal > 0 ? (revenue / cartSubtotal) * wholesaleDiscount : 0;
    return sum + (revenue - cost - itemDiscount);
  }, 0);

  // Add custom price handler
  const handlePriceOverride = (productId: string, priceStr: string, variationId?: string) => {
    const price = parseFloat(priceStr) || 0;
    updateWholesalePrice(productId, price, variationId);
  };

  const handleAddDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerName || !dealerPhone) {
      showToast('Please fill Name and Phone', 'warning');
      return;
    }
    const newDealer: Dealer = {
      id: 'D-' + Date.now().toString().slice(-4),
      name: dealerName,
      phone: dealerPhone,
      address: dealerAddress,
      outstanding: 0
    };
    DB.saveDealer(newDealer);
    refreshData();
    setIsDealerModalOpen(false);
    setDealerName('');
    setDealerPhone('');
    setDealerAddress('');
    showToast('Wholesale Dealer registered', 'success');
  };

  const handleWholesaleCheckout = (isCreditSale: boolean) => {
    if (!selectedDealerId) {
      showToast('Please select a Dealer for wholesale transaction', 'warning');
      return;
    }
    if (wholesaleCart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    const dealer = dealers.find(d => d.id === selectedDealerId);
    if (!dealer) return;

    // Double check stock before saving to make sure stock doesn't go below zero
    for (const item of wholesaleCart) {
      const prod = products.find(p => p.id === item.product.id);
      if (!prod) continue;
      const stockLimit = item.variation
        ? prod.variations?.find(v => v.id === item.variation?.id)?.currentStock || 0
        : prod.currentStock;
      if (item.qty > stockLimit) {
        showToast(`Error: Insufficient stock for ${item.product.name} (Available: ${stockLimit})`, 'danger');
        return;
      }
    }

    const saleData: Sale = {
      id: 'S-' + Date.now(),
      invoiceNo: settings.invoicePrefix + 'W-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4),
      date: new Date().toISOString(),
      customerName: dealer.name,
      customerPhone: dealer.phone,
      items: wholesaleCart.map(item => {
        const price = getEffectivePrice(item);
        const purchasePrice = item.variation 
          ? ((item.variation.unit2 && (item.customUnit || item.variation.unit || item.product.unit) === item.variation.unit2) 
             ? (item.variation.purchasePrice2 || item.variation.purchasePrice) 
             : item.variation.purchasePrice)
          : item.product.purchasePrice;
        const name = item.variation ? `${item.product.name} (${item.variation.mark})` : item.product.name;
        return {
          productId: item.product.id,
          name,
          qty: item.qty,
          unit: item.customUnit || item.product.unit,
          purchasePrice,
          salesPrice: price,
          total: getCartItemTotal(item),
          variationId: item.variation?.id,
          variationMark: item.variation?.mark,
          weight: getCartItemWeightInKg(item),
          bags: item.bags
        };
      }),
      subtotal: cartSubtotal,
      discount: wholesaleDiscount,
      tax: cartTax,
      total: cartTotal,
      profit: Number(totalProfit.toFixed(2)),
      // Credit sales are tracked as mixed with 0 paid, or separate designation. 
      paymentMethod: isCreditSale ? 'Mixed' : 'UPI',
      paymentDetails: {
        cashAmount: 0,
        upiAmount: isCreditSale ? 0 : cartTotal,
        cardAmount: 0
      },
      status: 'completed',
      type: 'wholesale',
      dealerId: selectedDealerId,
      createdBy: user?.email || 'Unknown'
    };

    DB.saveSale(saleData);
    

    refreshData();
    clearWholesaleCart();
    showToast(`Wholesale Bill ${saleData.invoiceNo} completed!`, 'success');
    setJustCompletedSale(saleData);
  };

  // Pay dues trigger
  const handleCollectDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDuesDealer || payDuesAmount <= 0) return;

    if (payDuesAmount > payDuesDealer.outstanding) {
      showToast('Payment amount exceeds outstanding dues!', 'warning');
      return;
    }

    // Update outstanding in DB
    DB.updateDealerOutstanding(payDuesDealer.id, -payDuesAmount);
    
    // Log as a special sale or log payment entry? 
    // For this mock ledger, updating the outstanding is sufficient, and we show a toast.
    refreshData();
    setIsPayDuesOpen(false);
    setPayDuesAmount(0);
    setPayDuesDealer(null);
    showToast('Dues collected and balance updated', 'success');

    // Update statement dealer if active
    if (selectedStatementDealer && selectedStatementDealer.id === payDuesDealer.id) {
      const updated = DB.getDealers().find(d => d.id === payDuesDealer.id);
      if (updated) setSelectedStatementDealer(updated);
    }
  };

  // Get statement details for selected dealer
  const dealerSales = selectedStatementDealer 
    ? DB.getSales().filter(s => s.dealerId === selectedStatementDealer.id)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Wholesale Sales & Dealer Hub</h1>
          <p>Credit billings, wholesale price overrides, bulk volume price tiers, and customer ledgers</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${subTab === 'billing' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('billing')}
          >
            Wholesale Billing
          </button>
          <button 
            className={`btn ${subTab === 'dealers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('dealers')}
          >
            Dealers & Statements
          </button>
        </div>
      </div>

      {subTab === 'billing' ? (
        /* Wholesale Billing View */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left panel: Dealer select, Product search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Dealer selector */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Select Wholesale Dealer *</span>
                  {selectedDealerId && (
                    <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                      Dues Outstanding: ₹{dealers.find(d => d.id === selectedDealerId)?.outstanding.toFixed(2)}
                    </span>
                  )}
                </label>
                <select
                  className="form-control"
                  value={selectedDealerId}
                  onChange={(e) => setSelectedDealerId(e.target.value)}
                >
                  <option value="">-- Choose Dealer --</option>
                  {dealers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product search & results */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Wholesale Product Search</h3>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Type product name or barcode..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>

              {searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {searchResults.map(prod => {
                    const defaultWholesale = getWholesaleDefaultPrice(prod);
                    return (
                      <div 
                        key={prod.id}
                        className="glass-panel-hover"
                        onClick={() => {
                          if (prod.variations && prod.variations.length > 0) {
                            setVariationSelectorProduct(prod);
                          } else {
                            addToWholesaleCart(prod, 1);
                          }
                          setProductSearch('');
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius-sm)',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{prod.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retail price: ₹{prod.salesPrice} / {prod.unit}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                            Wholesale Est: ₹{defaultWholesale}
                          </span>
                          <span className={`badge ${prod.currentStock <= prod.minStockAlert ? 'badge-danger' : 'badge-success'}`}>
                            Stock: {Number(prod.currentStock.toFixed(3))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : productSearch.trim().length > 1 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>
                  No matches found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {products.map(prod => {
                    const defaultWholesale = getWholesaleDefaultPrice(prod);
                    return (
                      <div 
                        key={prod.id}
                        className="glass-panel-hover"
                        onClick={() => {
                          if (prod.variations && prod.variations.length > 0) {
                            setVariationSelectorProduct(prod);
                          } else {
                            addToWholesaleCart(prod, 1);
                          }
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius-sm)',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{prod.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retail price: ₹{prod.salesPrice} / {prod.unit}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                            Wholesale Est: ₹{defaultWholesale}
                          </span>
                          <span className={`badge ${prod.currentStock <= prod.minStockAlert ? 'badge-danger' : 'badge-success'}`}>
                            Stock: {Number(prod.currentStock.toFixed(3))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Wholesale Cart & Checkout */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Wholesale Billing Cart</h3>
              <button 
                className="btn btn-danger btn-icon" 
                onClick={clearWholesaleCart}
                disabled={wholesaleCart.length === 0}
                style={{ padding: '0.25rem' }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {wholesaleCart.length > 0 ? (
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item Name</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Mark</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Unit</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '60px' }}>Bag</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '90px' }}>Price (₹)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {wholesaleCart.map((item) => {
                      const currentItemUnit = item.customUnit || (item.variation ? (item.variation.unit || item.product.unit) : item.product.unit);
                      const itemWeight = getCartItemWeightInKg(item);
                      const defaultWhPrice = getWholesaleDefaultPrice(item.product, item.variation, currentItemUnit);
                      const isBulk = item.qty >= 10;
                      const activePrice = getEffectivePrice(item);
                      const itemKey = item.product.id + (item.variation ? '-' + item.variation.id : '');
                      
                      const availableUnits = item.variation 
                        ? Array.from(new Set([item.variation.unit || item.product.unit, item.variation.unit2].filter(Boolean) as string[]))
                        : ['Pcs', 'Kg', 'Litre', 'Box', 'Packet', 'Gram', 'Bag'];

                      return (
                        <tr key={itemKey} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{item.product.name}</td>
                          <td style={{ padding: '0.5rem' }}>
                            {item.variation ? (
                              <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.25rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px', fontWeight: 600 }}>
                                {item.variation.mark}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <select
                              className="form-control"
                              style={{
                                width: '70px',
                                padding: '0.15rem 0.25rem',
                                fontSize: '0.8rem',
                                height: '24px',
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                textAlign: 'center'
                              }}
                              value={currentItemUnit}
                              onChange={(e) => updateWholesaleUnit(item.product.id, e.target.value, item.variation?.id)}
                            >
                              {availableUnits.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{
                                width: '50px',
                                padding: '0.15rem 0.25rem',
                                fontSize: '0.8rem',
                                height: '24px',
                                textAlign: 'center',
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)'
                              }}
                              value={item.bags === 0 || item.bags === undefined ? '' : item.bags}
                              min="0"
                              placeholder="-"
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateWholesaleBags(item.product.id, val, item.variation?.id);
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                              <button 
                                type="button"
                                className="btn btn-secondary btn-icon" 
                                onClick={() => {
                                  const newQty = Number((item.qty - 1).toFixed(3));
                                  if (newQty <= 0) {
                                    removeFromWholesaleCart(item.product.id, item.variation?.id);
                                  } else {
                                    updateWholesaleQty(item.product.id, newQty, item.variation?.id);
                                  }
                                }}
                                style={{ padding: '0.15rem', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={10} />
                              </button>
                              <input
                                type="number"
                                className="form-control"
                                style={{
                                  width: '60px',
                                  padding: '0.15rem 0.25rem',
                                  fontSize: '0.8rem',
                                  height: '24px',
                                  textAlign: 'center',
                                  background: 'var(--bg-app)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)'
                                }}
                                value={item.qty === 0 ? '' : Number(item.qty.toFixed(3))}
                                min="0.001"
                                step="0.001"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateWholesaleQty(item.product.id, val, item.variation?.id);
                                }}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (isNaN(val) || val <= 0) {
                                    removeFromWholesaleCart(item.product.id, item.variation?.id);
                                  }
                                }}
                              />
                              <button 
                                type="button"
                                className="btn btn-secondary btn-icon" 
                                onClick={() => updateWholesaleQty(item.product.id, Number((item.qty + 1).toFixed(3)), item.variation?.id)}
                                style={{ padding: '0.15rem', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          </td>

                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{
                                width: '80px',
                                padding: '0.15rem 0.35rem',
                                fontSize: '0.8rem',
                                height: '24px',
                                textAlign: 'right',
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)'
                              }}
                              value={item.customPrice !== undefined ? item.customPrice : defaultWhPrice}
                              min="0"
                              step="0.01"
                              onChange={(e) => handlePriceOverride(item.product.id, e.target.value, item.variation?.id)}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>
                            ₹{getCartItemTotal(item).toFixed(2)}
                            {isBulk && (
                              <span style={{ display: 'block', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 600 }}>
                                -5% Bulk
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button 
                              type="button"
                              className="btn btn-ghost btn-icon" 
                              onClick={() => removeFromWholesaleCart(item.product.id, item.variation?.id)}
                              style={{ padding: '0.2rem', color: 'var(--danger)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                Cart is empty. Search products above to build wholesale bill.
              </div>
            )}

            {/* Calculations Card */}
            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Wholesale Subtotal:</span>
                <span style={{ fontWeight: 600 }}>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Total Weight:</span>
                <span style={{ fontWeight: 600 }}>{Number(cartTotalWeight.toFixed(3))} Kg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span>Additional Discount (₹):</span>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', textAlign: 'right', height: '26px' }}
                  value={wholesaleDiscount || ''}
                  onChange={(e) => setWholesaleDiscount(Math.min(cartSubtotal, parseFloat(e.target.value) || 0))}
                  min="0"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Incl. GST Tax ({settings.taxRate}%):</span>
                <span>₹{cartTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', paddingTop: '0.25rem', borderTop: '1px dashed var(--border-color)' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleWholesaleCheckout(false)}
                disabled={wholesaleCart.length === 0 || !selectedDealerId}
              >
                Cash/Online checkout
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleWholesaleCheckout(true)}
                disabled={wholesaleCart.length === 0 || !selectedDealerId}
                style={{ background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000', fontWeight: 600 }}
              >
                <CreditCard size={16} />
                <span>Save Credit Sale</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Dealers Directory and Statements View */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Dealers directory list */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Dealers Directory</h3>
              <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setIsDealerModalOpen(true)}>
                <UserPlus size={14} />
                <span>Register Dealer</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dealers.map(d => (
                <div 
                  key={d.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: selectedStatementDealer?.id === d.id ? 'var(--primary-light)' : 'var(--bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => setSelectedStatementDealer(d)}
                >
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{d.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PH: {d.phone}</span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: d.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ₹{d.outstanding.toFixed(2)}
                    </span>
                    {d.outstanding > 0 && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayDuesDealer(d);
                          setPayDuesAmount(d.outstanding);
                          setIsPayDuesOpen(true);
                        }}
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                      >
                        Collect Pay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dealer Ledger Statement */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {selectedStatementDealer ? (
              <div>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>Statement of Account</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Dealer: <strong>{selectedStatementDealer.name}</strong> | Outstanding Dues: <strong style={{ color: 'var(--danger)' }}>₹{selectedStatementDealer.outstanding.toFixed(2)}</strong>
                  </span>
                </div>

                {dealerSales.length > 0 ? (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice No</th>
                          <th>Method</th>
                          <th style={{ textAlign: 'right' }}>Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealerSales.map(sale => (
                          <tr key={sale.id}>
                            <td>{new Date(sale.date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600 }}>{sale.invoiceNo}</td>
                            <td>
                              <span className={`badge ${sale.paymentMethod === 'Mixed' ? 'badge-danger' : 'badge-success'}`}>
                                {sale.paymentMethod === 'Mixed' ? 'CREDIT' : 'PAID'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{sale.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                    No transactions found for this dealer.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={24} />
                <span>Select a dealer from the directory to view statement of accounts.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Register Dealer Modal */}
      {isDealerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Register Dealer Profile</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsDealerModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddDealer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Dealer / Shop Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={dealerName}
                    onChange={(e) => setDealerName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={dealerPhone}
                    onChange={(e) => setDealerPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Business Address</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={dealerAddress}
                    onChange={(e) => setDealerAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDealerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Dues Payment Modal */}
      {isPayDuesOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Collect Dues Payment</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsPayDuesOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCollectDues}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  Dealer: <strong>{payDuesDealer?.name}</strong>
                  <br />
                  Max Outstanding: <strong style={{ color: 'var(--danger)' }}>₹{payDuesDealer?.outstanding.toFixed(2)}</strong>
                </div>
                
                <div className="form-group">
                  <label>Payment Amount Received (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="1"
                    max={payDuesDealer?.outstanding}
                    value={payDuesAmount || ''}
                    onChange={(e) => setPayDuesAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayDuesOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printing preview auto launcher */}
      {justCompletedSale && (
        <PrintPreviewModal 
          sale={justCompletedSale} 
          onClose={() => setJustCompletedSale(null)} 
          autoPrint={true}
        />
      )}

      {/* Multiple Variations Selector Modal */}
      {variationSelectorProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Select Variation - {variationSelectorProduct.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setVariationSelectorProduct(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Please select the correct price/mark variation to add:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {variationSelectorProduct.variations?.map((v) => (
                  <div
                    key={v.id}
                    className="glass-panel-hover"
                    onClick={() => {
                      addToWholesaleCart(variationSelectorProduct, 1, v);
                      setVariationSelectorProduct(null);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>{v.mark}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost Price: ₹{v.purchasePrice}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>₹{v.salesPrice.toFixed(2)}</div>
                      <span style={{ fontSize: '0.75rem', color: v.currentStock <= variationSelectorProduct.minStockAlert ? 'var(--danger)' : 'var(--success)', fontWeight: 500 }}>
                        Stock: {Number(v.currentStock.toFixed(3))} {variationSelectorProduct.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setVariationSelectorProduct(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
