import React, { useState, useEffect, useRef } from 'react';
import { useApp, CartItem } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DB, Product, Sale, ProductVariation } from '../utils/db';
import { 
  Search, 
  Barcode, 
  Trash2, 
  FolderPlus, 
  History, 
  RotateCcw, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Plus, 
  Minus,
  Sparkles,
  ShoppingBag,
  X
} from 'lucide-react';
import { PrintPreviewModal } from '../components/PrintPreviewModal';

export const POS: React.FC = () => {
  const { user } = useAuth();
  const {
    products,
    refreshData,
    showToast,
    retailCart,
    addToRetailCart,
    removeFromRetailCart,
    updateRetailQty,
    updateRetailPrice,
    updateRetailUnit,
    clearRetailCart,
    retailDiscount,
    setRetailDiscount,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    heldCarts,
    holdCurrentCart,
    recallCart,
    deleteHeldCart,
    settings
  } = useApp();

  // Search & Barcode state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [duplicateBarcodeProducts, setDuplicateBarcodeProducts] = useState<Product[]>([]);
  const [variationSelectorProduct, setVariationSelectorProduct] = useState<Product | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Payment Form States
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [upiPaid, setUpiPaid] = useState<number>(0);
  const [cardPaid, setCardPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Mixed'>('Cash');

  // Return Form States
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [targetReturnSale, setTargetReturnSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Damaged Product');

  // Print state after payment
  const [justCompletedSale, setJustCompletedSale] = useState<Sale | null>(null);

  // Focus barcode input on load
  useEffect(() => {
    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, []);

  // Search products handler
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

  const getCartItemPrice = (item: any) => {
    if (item.customPrice !== undefined) return item.customPrice;
    if (item.variation) {
      const currentUnit = item.customUnit || item.variation.unit || item.product.unit;
      if (item.variation.unit2 && currentUnit === item.variation.unit2) {
        return item.variation.salesPrice2 || 0;
      }
      return item.variation.salesPrice;
    }
    return item.product.salesPrice;
  };

  const getCartItemCost = (item: any) => {
    if (item.variation) {
      const currentUnit = item.customUnit || item.variation.unit || item.product.unit;
      if (item.variation.unit2 && currentUnit === item.variation.unit2) {
        return item.variation.purchasePrice2 || item.variation.purchasePrice;
      }
      return item.variation.purchasePrice;
    }
    return item.product.purchasePrice;
  };

  // Calculations
  const cartSubtotal = retailCart.reduce((sum, item) => {
    const price = getCartItemPrice(item);
    return sum + (price * item.qty);
  }, 0);
  const taxRateDecimal = settings.taxRate / 100;
  // tax is inclusive
  const cartTax = Number((cartSubtotal * (taxRateDecimal / (1 + taxRateDecimal))).toFixed(2));
  const cartTotal = Math.max(0, cartSubtotal - retailDiscount);
  const totalProfit = retailCart.reduce((sum, item) => {
    const cost = getCartItemCost(item) * item.qty;
    const price = getCartItemPrice(item);
    const revenue = price * item.qty;
    // proportional discount adjustment
    const itemDiscount = cartSubtotal > 0 ? (revenue / cartSubtotal) * retailDiscount : 0;
    return sum + (revenue - cost - itemDiscount);
  }, 0);

  // Handle barcode submit (barcode scanner simulation)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcodeTrimmed = barcodeInput.trim();
    if (!barcodeTrimmed) return;

    const matches = products.filter(p => p.barcode === barcodeTrimmed);
    if (matches.length === 1) {
      const prod = matches[0];
      if (prod.variations && prod.variations.length > 0) {
        setVariationSelectorProduct(prod);
      } else {
        addToRetailCart(prod, 1);
      }
      setBarcodeInput('');
    } else if (matches.length > 1) {
      setDuplicateBarcodeProducts(matches);
      setBarcodeInput('');
    } else {
      showToast(`No product matches barcode: ${barcodeInput}`, 'danger');
      setBarcodeInput('');
    }
  };

  const handleCheckoutClick = () => {
    if (retailCart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }
    setPaymentMethod('Cash');
    setCashPaid(cartTotal);
    setUpiPaid(0);
    setCardPaid(0);
    setIsPayModalOpen(true);
  };

  // Complete sale handler
  const handleCompleteSale = () => {
    const totalPaid = Number(cashPaid) + Number(upiPaid) + Number(cardPaid);
    
    if (paymentMethod !== 'Mixed' && totalPaid < cartTotal) {
      showToast(`Insufficient payment amount (Paid: ₹${totalPaid}, Due: ₹${cartTotal})`, 'warning');
      return;
    }

    const saleData: Sale = {
      id: 'S-' + Date.now(),
      invoiceNo: settings.invoicePrefix + new Date().getFullYear() + '-' + Date.now().toString().slice(-4),
      date: new Date().toISOString(),
      customerName,
      customerPhone: customerPhone || undefined,
      items: retailCart.map(item => {
        const price = getCartItemPrice(item);
        const name = item.variation ? `${item.product.name} (${item.variation.mark})` : item.product.name;
        const purchasePrice = getCartItemCost(item);
        return {
          productId: item.product.id,
          name,
          qty: item.qty,
          unit: item.customUnit || item.product.unit,
          purchasePrice,
          salesPrice: price,
          total: price * item.qty,
          variationId: item.variation?.id,
          variationMark: item.variation?.mark
        };
      }),
      subtotal: cartSubtotal,
      discount: retailDiscount,
      tax: cartTax,
      total: cartTotal,
      profit: Number(totalProfit.toFixed(2)),
      paymentMethod,
      paymentDetails: {
        cashAmount: paymentMethod === 'Cash' || paymentMethod === 'Mixed' ? Number(cashPaid) : 0,
        upiAmount: paymentMethod === 'UPI' || paymentMethod === 'Mixed' ? Number(upiPaid) : 0,
        cardAmount: paymentMethod === 'Card' || paymentMethod === 'Mixed' ? Number(cardPaid) : 0,
      },
      status: 'completed',
      type: 'retail',
      createdBy: user?.email || 'Unknown'
    };

    DB.saveSale(saleData);
    refreshData();
    clearRetailCart();
    setIsPayModalOpen(false);
    showToast(`Bill ${saleData.invoiceNo} checked out!`, 'success');
    setJustCompletedSale(saleData);
  };

  // Return logic: search invoice
  const handleSearchReturnInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const sale = DB.getSales().find(s => s.invoiceNo === returnInvoiceNo.trim());
    if (sale) {
      if (sale.status === 'returned') {
        showToast('This invoice has already been returned', 'warning');
        return;
      }
      setTargetReturnSale(sale);
      // Initialize return quantities to 0
      const qtys: { [key: string]: number } = {};
      sale.items.forEach(item => {
        qtys[item.productId] = 0;
      });
      setReturnQuantities(qtys);
    } else {
      showToast('Invoice number not found', 'danger');
      setTargetReturnSale(null);
    }
  };

  const handleReturnQtyChange = (productId: string, val: number, max: number) => {
    setReturnQuantities(prev => ({
      ...prev,
      [productId]: Math.min(max, Math.max(0, val))
    }));
  };

  // Submit product return
  const handleSubmitReturn = () => {
    if (!targetReturnSale) return;
    
    const productsList = DB.getProducts();
    const history = DB.getStockHistory();
    const salesList = DB.getSales();

    const returnedItemsList: { productId: string; qty: number; reason: string }[] = [];
    let refundAmount = 0;

    Object.entries(returnQuantities).forEach(([prodId, qty]) => {
      if (qty > 0) {
        returnedItemsList.push({ productId: prodId, qty, reason: returnReason });
        const item = targetReturnSale.items.find(i => i.productId === prodId);
        if (item) {
          refundAmount += item.salesPrice * qty;

          // Increase stock
          const pIdx = productsList.findIndex(p => p.id === prodId);
          if (pIdx >= 0) {
            productsList[pIdx].currentStock += qty;
          }

          // Add history log
          history.push({
            id: 'T' + Date.now() + Math.random().toString(36).substr(2, 4),
            date: new Date().toISOString(),
            productId: prodId,
            productName: item.name,
            type: 'Return',
            qty: qty,
            referenceNo: targetReturnSale.invoiceNo,
            reason: `Return: ${returnReason}`
          });
        }
      }
    });

    if (returnedItemsList.length === 0) {
      showToast('No items selected for return', 'warning');
      return;
    }

    // Find sale and update status/returnedItems
    const saleIdx = salesList.findIndex(s => s.id === targetReturnSale.id);
    if (saleIdx >= 0) {
      salesList[saleIdx].status = 'returned';
      salesList[saleIdx].returnedItems = returnedItemsList;
      salesList[saleIdx].total -= refundAmount; // Reduce total
      salesList[saleIdx].profit -= (refundAmount * 0.2); // Simple mock profit reduction
    }

    DB.setJSON('billing_sales', salesList);
    DB.setJSON('billing_products', productsList);
    DB.setJSON('billing_stock_history', history);

    refreshData();
    setIsReturnModalOpen(false);
    setTargetReturnSale(null);
    setReturnInvoiceNo('');
    showToast(`Processed Return. Refund Issued: ₹${refundAmount.toFixed(2)}`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with Quick Actions */}
      <div className="page-header">
        <div>
          <h1>POS Billing Screen</h1>
          <p>Quick barcode sales processing, multi-payment checkout, and returns</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setIsHeldModalOpen(true)}>
            <History size={16} />
            <span>Held Bills ({heldCarts.filter(c => c.type === 'retail').length})</span>
          </button>
          <button className="btn btn-warning" onClick={() => setIsReturnModalOpen(true)}>
            <RotateCcw size={16} />
            <span>Return Bill</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Side: Product Search & Scanner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Barcode Search Form */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Barcode size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                <input
                  ref={barcodeRef}
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '40px', fontFamily: 'Courier New', fontWeight: 600 }}
                  placeholder="Scan Barcode or type scanner number..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">Add Scan</button>
            </form>
          </div>

          {/* Fuzzy Search Section */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Quick Product Search</h3>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                placeholder="Search products by name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            {/* Results Grid */}
            {searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {searchResults.map((prod) => (
                  <div 
                    key={prod.id} 
                    className="glass-panel-hover"
                    onClick={() => {
                      if (prod.variations && prod.variations.length > 0) {
                        setVariationSelectorProduct(prod);
                      } else {
                        addToRetailCart(prod, 1);
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Barcode: {prod.barcode} | Unit: {prod.unit}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>₹{prod.salesPrice}</span>
                      <span className={`badge ${prod.currentStock <= prod.minStockAlert ? 'badge-danger' : 'badge-success'}`}>
                        Stock: {Number(prod.currentStock.toFixed(3))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : productSearch.trim().length > 1 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No matches found.
              </div>
            ) : null}

            {/* Quick-select common items list */}
            <div>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>POPULAR PRODUCTS</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {products.slice(0, 6).map(prod => (
                  <button
                    key={prod.id}
                    className="btn btn-secondary glass-panel-hover"
                    onClick={() => {
                      if (prod.variations && prod.variations.length > 0) {
                        setVariationSelectorProduct(prod);
                      } else {
                        addToRetailCart(prod, 1);
                      }
                    }}
                    style={{ 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '0.25rem',
                      padding: '0.6rem 0.4rem', 
                      borderRadius: 'var(--border-radius-md)',
                      fontSize: '0.75rem',
                      height: '75px',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>{prod.name}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>₹{prod.salesPrice} / {prod.unit}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Active Cart & Checkout */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Customer Details input */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Customer Name</label>
              <input
                type="text"
                className="form-control"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Phone Number (WhatsApp Share)</label>
              <input
                type="text"
                className="form-control"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Courier New' }}
                placeholder="Enter 10 digit phone..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Cart items list */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShoppingBag size={16} />
                <span>Cart Products ({retailCart.length})</span>
              </h3>
              <button 
                className="btn btn-danger btn-icon" 
                onClick={clearRetailCart} 
                style={{ padding: '0.25rem' }}
                title="Clear Cart"
                disabled={retailCart.length === 0}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {retailCart.length > 0 ? (
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item Name</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Mark</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Unit</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '90px' }}>Price (₹)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {retailCart.map((item) => {
                      const price = getCartItemPrice(item);
                      const availableUnits = item.variation 
                        ? Array.from(new Set([item.variation.unit || item.product.unit, item.variation.unit2].filter(Boolean) as string[]))
                        : ['Pcs', 'Kg', 'Litre', 'Box', 'Packet', 'Gram', 'Bag'];
                      return (
                        <tr key={item.product.id + (item.variation ? '-' + item.variation.id : '')} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                              value={item.customUnit || (item.variation ? (item.variation.unit || item.product.unit) : item.product.unit)}
                              onChange={(e) => updateRetailUnit(item.product.id, e.target.value, item.variation?.id)}
                            >
                              {availableUnits.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                              <button 
                                type="button"
                                className="btn btn-secondary btn-icon" 
                                onClick={() => {
                                  const newQty = Number((item.qty - 1).toFixed(3));
                                  if (newQty <= 0) {
                                    removeFromRetailCart(item.product.id, item.variation?.id);
                                  } else {
                                    updateRetailQty(item.product.id, newQty, item.variation?.id);
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
                                  updateRetailQty(item.product.id, val, item.variation?.id);
                                }}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (isNaN(val) || val <= 0) {
                                    removeFromRetailCart(item.product.id, item.variation?.id);
                                  }
                                }}
                              />
                              <button 
                                type="button"
                                className="btn btn-secondary btn-icon" 
                                onClick={() => updateRetailQty(item.product.id, Number((item.qty + 1).toFixed(3)), item.variation?.id)}
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
                              value={price === 0 ? '' : price}
                              min="0"
                              step="0.01"
                              onChange={(e) => updateRetailPrice(item.product.id, parseFloat(e.target.value) || 0, item.variation?.id)}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>
                            ₹{(price * item.qty).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button 
                              type="button"
                              className="btn btn-ghost btn-icon" 
                              onClick={() => removeFromRetailCart(item.product.id, item.variation?.id)}
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
                Cart is empty. Scan barcodes or search products above to build a bill.
              </div>
            )}
          </div>

          {/* Pricing Summary card */}
          <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>₹{cartSubtotal.toFixed(2)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span>Flat Discount (₹):</span>
              <input
                type="number"
                className="form-control"
                style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', textAlign: 'right', height: '26px' }}
                value={retailDiscount || ''}
                onChange={(e) => setRetailDiscount(Math.min(cartSubtotal, parseFloat(e.target.value) || 0))}
                min="0"
                max={cartSubtotal}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
              <span>Incl. GST Tax ({settings.taxRate}%):</span>
              <span>₹{cartTax.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', paddingTop: '0.25rem' }}>
              <span>GRAND TOTAL:</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => holdCurrentCart('retail')}
              disabled={retailCart.length === 0}
            >
              <FolderPlus size={16} />
              <span>Hold Bill</span>
            </button>
            
            <button 
              className="btn btn-primary" 
              onClick={handleCheckoutClick}
              disabled={retailCart.length === 0}
              style={{ boxShadow: 'var(--primary-glow)' }}
            >
              <Sparkles size={16} />
              <span>Checkout Pay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Split Payment Modal */}
      {isPayModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Select Payment Method</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsPayModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-app)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 600 }}>Amount Due:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₹{cartTotal.toFixed(2)}</span>
              </div>

              {/* Payment Mode Selector tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem' }}>
                {(['Cash', 'UPI', 'Card', 'Mixed'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method === 'Cash') {
                        setCashPaid(cartTotal); setUpiPaid(0); setCardPaid(0);
                      } else if (method === 'UPI') {
                        setCashPaid(0); setUpiPaid(cartTotal); setCardPaid(0);
                      } else if (method === 'Card') {
                        setCashPaid(0); setUpiPaid(0); setCardPaid(cartTotal);
                      } else {
                        setCashPaid(0); setUpiPaid(0); setCardPaid(0);
                      }
                    }}
                    className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.5rem 0', fontSize: '0.8rem', flexDirection: 'column', gap: '0.2rem' }}
                  >
                    {method === 'Cash' && <DollarSign size={14} />}
                    {method === 'UPI' && <Smartphone size={14} />}
                    {method === 'Card' && <CreditCard size={14} />}
                    {method === 'Mixed' && <History size={14} />}
                    <span>{method}</span>
                  </button>
                ))}
              </div>

              {/* Payment Splits inputs */}
              {paymentMethod === 'Mixed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Split Amounts:</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <DollarSign size={12} color="var(--success)" /> Cash
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={cashPaid || ''}
                      onChange={(e) => setCashPaid(parseFloat(e.target.value) || 0)}
                      placeholder="₹0.00"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Smartphone size={12} color="var(--info)" /> UPI App
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={upiPaid || ''}
                      onChange={(e) => setUpiPaid(parseFloat(e.target.value) || 0)}
                      placeholder="₹0.00"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CreditCard size={12} color="var(--warning)" /> Card Swipe
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={cardPaid || ''}
                      onChange={(e) => setCardPaid(parseFloat(e.target.value) || 0)}
                      placeholder="₹0.00"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', fontSize: '0.85rem' }}>
                    <span>Total Allocated:</span>
                    <span style={{ fontWeight: 700, color: (Number(cashPaid) + Number(upiPaid) + Number(cardPaid)) === cartTotal ? 'var(--success)' : 'var(--danger)' }}>
                      ₹{(Number(cashPaid) + Number(upiPaid) + Number(cardPaid)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Amount Received *</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}
                    value={paymentMethod === 'Cash' ? (cashPaid || '') : paymentMethod === 'UPI' ? (upiPaid || '') : (cardPaid || '')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (paymentMethod === 'Cash') setCashPaid(val);
                      else if (paymentMethod === 'UPI') setUpiPaid(val);
                      else setCardPaid(val);
                    }}
                    min={cartTotal}
                  />
                </div>
              )}

              {/* Change calculation for Cash Payment */}
              {paymentMethod === 'Cash' && cashPaid > cartTotal && (
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--success-light)', padding: '0.75rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.95rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>Balance Change:</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{(cashPaid - cartTotal).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCompleteSale}
                disabled={paymentMethod === 'Mixed' && (Number(cashPaid) + Number(upiPaid) + Number(cardPaid)) !== cartTotal}
              >
                Checkout & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {isHeldModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>Held Transactions List</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsHeldModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {heldCarts.filter(c => c.type === 'retail').length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {heldCarts.filter(c => c.type === 'retail').map(cart => (
                    <div 
                      key={cart.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-sm)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>ID: {cart.id} &bull; {cart.customerName}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(cart.date).toLocaleTimeString()} ({cart.items.length} items)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => {
                            recallCart(cart.id);
                            setIsHeldModalOpen(false);
                          }}
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Recall
                        </button>
                        <button 
                          className="btn btn-danger btn-icon" 
                          onClick={() => deleteHeldCart(cart.id)}
                          style={{ padding: '0.35rem' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  No retail bills are currently placed on hold.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsHeldModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Bill Modal */}
      {isReturnModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Process Product Return</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => {
                setIsReturnModalOpen(false);
                setTargetReturnSale(null);
                setReturnInvoiceNo('');
              }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Search Invoice form */}
              <form onSubmit={handleSearchReturnInvoice} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Invoice Number (e.g. SM-2026-0001)..."
                  required
                  value={returnInvoiceNo}
                  onChange={(e) => setReturnInvoiceNo(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Find Bill</button>
              </form>

              {/* Invoice products selector */}
              {targetReturnSale && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'var(--bg-input)' }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Target: {targetReturnSale.invoiceNo} &bull; {targetReturnSale.customerName}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Billed Total: ₹{targetReturnSale.total.toFixed(2)}</span>
                  </div>

                  <hr style={{ borderColor: 'var(--border-color)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {targetReturnSale.items.map(item => (
                      <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ flex: 1 }}>{item.name} (Sold: {item.qty})</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Return Qty:</label>
                          <input
                            type="number"
                            className="form-control"
                            style={{ width: '60px', padding: '0.2rem 0.4rem', textAlign: 'center' }}
                            min="0"
                            max={item.qty}
                            value={returnQuantities[item.productId] || 0}
                            onChange={(e) => handleReturnQtyChange(item.productId, parseInt(e.target.value) || 0, item.qty)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Reason for Return</label>
                    <select
                      className="form-control"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    >
                      <option value="Damaged Product">Damaged Product</option>
                      <option value="Incorrect Item Purchased">Incorrect Item Purchased</option>
                      <option value="Expired Product">Expired Product</option>
                      <option value="Customer Dissatisfaction">Customer Dissatisfaction</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setIsReturnModalOpen(false);
                setTargetReturnSale(null);
                setReturnInvoiceNo('');
              }}>
                Cancel
              </button>
              <button 
                className="btn btn-warning" 
                onClick={handleSubmitReturn}
                disabled={!targetReturnSale}
              >
                Execute Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto launch Print Preview Modal upon checkout completion */}
      {justCompletedSale && (
        <PrintPreviewModal 
          sale={justCompletedSale} 
          onClose={() => setJustCompletedSale(null)} 
          autoPrint={true}
        />
      )}

      {/* Duplicate Barcode Selector Modal */}
      {duplicateBarcodeProducts.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Select Product</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDuplicateBarcodeProducts([])}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Multiple products found with barcode: <strong>{duplicateBarcodeProducts[0].barcode}</strong>. Please select the correct item:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {duplicateBarcodeProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="glass-panel-hover"
                    onClick={() => {
                      setDuplicateBarcodeProducts([]);
                      if (prod.variations && prod.variations.length > 0) {
                        setVariationSelectorProduct(prod);
                      } else {
                        addToRetailCart(prod, 1);
                      }
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
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{prod.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {prod.category}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>₹{prod.salesPrice.toFixed(2)}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock: {Number(prod.currentStock.toFixed(3))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDuplicateBarcodeProducts([])}>Cancel</button>
            </div>
          </div>
        </div>
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
                      addToRetailCart(variationSelectorProduct, 1, v);
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
