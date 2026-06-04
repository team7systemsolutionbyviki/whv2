import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { DB, Product, Purchase, Supplier, PurchaseItem, ProductVariation } from '../utils/db';
import { 
  Truck, 
  Plus, 
  Trash2, 
  Check, 
  TrendingDown, 
  ChevronRight, 
  AlertCircle, 
  UserPlus, 
  DollarSign,
  X,
  Printer,
  ShoppingBag,
  Package,
  CreditCard
} from 'lucide-react';

export const Purchases: React.FC = () => {
  const { 
    products, 
    suppliers, 
    purchases,
    sales,
    refreshData, 
    showToast,
    settings 
  } = useApp();

  const [subTab, setSubTab] = useState<'entry' | 'suppliers' | 'history'>('entry');

  // Purchase Entry States
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<{ product: Product; qty: number; purchasePrice: number; unit: string; variation?: ProductVariation }[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Due'>('Paid');
  const [discount, setDiscount] = useState<number>(0);
  const [coolie, setCoolie] = useState<number>(0);

  // Vehicle & Delivery details
  const [vehicleNo, setVehicleNo] = useState('');
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState('');

  // History & Print details
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingLedger, setIsPrintingLedger] = useState(false);

  // Trigger print after portal is mounted
  useEffect(() => {
    if (isPrinting) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrinting]);

  // Trigger print after ledger portal is mounted
  useEffect(() => {
    if (isPrintingLedger) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrintingLedger(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrintingLedger]);

  // Item Selector states (for building the list)
  const [tempProductId, setTempProductId] = useState('');
  const [tempVariationId, setTempVariationId] = useState('');
  const [tempUnit, setTempUnit] = useState('');
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Supplier Management states
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState<Supplier | null>(null);
  
  // Supplier Ledger Filter States
  const [ledgerFilterType, setLedgerFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerEndDate, setLedgerEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerViewMode, setLedgerViewMode] = useState<'ledger' | 'sales_profit'>('ledger');
  const [ledgerStockFilter, setLedgerStockFilter] = useState<'all' | 'in' | 'out'>('all');

  // Pay Dues state
  const [isPayDuesOpen, setIsPayDuesOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);

  // Handle adding item to the current builder list
  const handleAddItemToList = () => {
    if (!tempProductId) {
      showToast('Select a product to add', 'warning');
      return;
    }
    const product = products.find(p => p.id === tempProductId);
    if (!product) return;

    if (tempQty <= 0 || tempPrice <= 0) {
      showToast('Quantity and price must be greater than zero', 'warning');
      return;
    }

    let variation: ProductVariation | undefined;
    if (product.variations && product.variations.length > 0) {
      variation = product.variations.find(v => v.id === tempVariationId);
      if (!variation) {
        showToast('Please select a product variation/mark', 'warning');
        return;
      }
    }

    // Check if product is already in list with same variation and unit
    const existsIdx = purchaseItems.findIndex(item => 
      item.product.id === tempProductId && 
      item.variation?.id === variation?.id &&
      item.unit === tempUnit
    );
    if (existsIdx >= 0) {
      const updated = [...purchaseItems];
      updated[existsIdx].qty += tempQty;
      updated[existsIdx].purchasePrice = tempPrice; // update with latest entered price
      setPurchaseItems(updated);
    } else {
      setPurchaseItems(prev => [...prev, { product, qty: tempQty, purchasePrice: tempPrice, unit: tempUnit, variation }]);
    }

    // Reset selectors
    setTempProductId('');
    setTempVariationId('');
    setTempUnit('');
    setTempQty(1);
    setTempPrice(0);
    showToast('Product added to entry list', 'success');
  };

  const handleProductSelect = (id: string) => {
    setTempProductId(id);
    setTempVariationId('');
    const prod = products.find(p => p.id === id);
    if (prod) {
      if (prod.variations && prod.variations.length > 0) {
        const v = prod.variations[0];
        setTempPrice(v.purchasePrice);
        setTempVariationId(v.id);
        setTempUnit(v.unit || prod.unit);
      } else {
        setTempPrice(prod.purchasePrice);
        setTempUnit(prod.unit);
      }
    } else {
      setTempUnit('');
    }
  };

  const handleVariationSelect = (vId: string) => {
    setTempVariationId(vId);
    const prod = products.find(p => p.id === tempProductId);
    if (prod && prod.variations) {
      const v = prod.variations.find(varItem => varItem.id === vId);
      if (v) {
        setTempPrice(v.purchasePrice);
        setTempUnit(v.unit || prod.unit);
      }
    }
  };

  const handleUnitSelect = (unitVal: string) => {
    setTempUnit(unitVal);
    const prod = products.find(p => p.id === tempProductId);
    if (prod) {
      if (prod.variations && tempVariationId) {
        const v = prod.variations.find(varItem => varItem.id === tempVariationId);
        if (v) {
          if (v.unit2 && unitVal === v.unit2) {
            setTempPrice(v.purchasePrice2 || v.purchasePrice);
          } else {
            setTempPrice(v.purchasePrice);
          }
        }
      }
    }
  };

  const handleRemoveItem = (idx: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = purchaseItems.reduce((sum, item) => sum + (item.purchasePrice * item.qty), 0);
  const finalTotal = Math.max(0, subtotal - discount + coolie);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !invoiceNo || purchaseItems.length === 0) {
      showToast('Please select a supplier, enter invoice number, and add products', 'warning');
      return;
    }

    const purchaseData: Purchase = {
      id: 'PUR-' + Date.now(),
      invoiceNo,
      date: new Date(purchaseDate).toISOString(),
      supplierId: selectedSupplierId,
      items: purchaseItems.map(item => ({
        productId: item.product.id,
        name: item.variation ? `${item.product.name} (${item.variation.mark})` : item.product.name,
        qty: item.qty,
        unit: item.unit,
        purchasePrice: item.purchasePrice,
        total: item.purchasePrice * item.qty,
        variationId: item.variation?.id,
        variationMark: item.variation?.mark
      })),
      subtotal,
      discount,
      coolie,
      vehicleNo: vehicleNo || undefined,
      deliveryPersonPhone: deliveryPersonPhone || undefined,
      total: finalTotal,
      paymentStatus,
      dueAmount: paymentStatus === 'Due' ? finalTotal : 0
    };

    DB.savePurchase(purchaseData);
    refreshData();

    // Reset Form
    setSelectedSupplierId('');
    setInvoiceNo('');
    setPurchaseItems([]);
    setPaymentStatus('Paid');
    setDiscount(0);
    setCoolie(0);
    setVehicleNo('');
    setDeliveryPersonPhone('');
    showToast(`Purchase ${invoiceNo} recorded. Stock auto-updated!`, 'success');
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supPhone) {
      showToast('Supplier Name and Phone are required', 'warning');
      return;
    }
    const newSupplier: Supplier = {
      id: 'S-' + Date.now().toString().slice(-4),
      name: supName,
      phone: supPhone,
      address: supAddress,
      due: 0
    };
    DB.saveSupplier(newSupplier);
    refreshData();
    setIsSupplierModalOpen(false);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
    showToast('New Supplier registered successfully', 'success');
  };

  const handleCollectDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier || payAmount <= 0) return;

    if (payAmount > paySupplier.due) {
      showToast('Payment amount exceeds what you owe!', 'warning');
      return;
    }

    DB.updateSupplierDue(paySupplier.id, -payAmount);
    refreshData();
    setIsPayDuesOpen(false);
    setPayAmount(0);
    setPaySupplier(null);
    showToast('Payment logged and supplier due reduced', 'success');

    if (selectedLedgerSupplier && selectedLedgerSupplier.id === paySupplier.id) {
      const updated = DB.getSuppliers().find(s => s.id === paySupplier.id);
      if (updated) setSelectedLedgerSupplier(updated);
    }
  };

  const ledgerDateMatch = (dateStr: string) => {
    if (ledgerFilterType === 'all') return true;
    const date = new Date(dateStr);
    const today = new Date();
    
    if (ledgerFilterType === 'today') {
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }
    if (ledgerFilterType === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return date >= sevenDaysAgo;
    }
    if (ledgerFilterType === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return date >= thirtyDaysAgo;
    }
    if (ledgerFilterType === 'custom') {
      const start = new Date(ledgerStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(ledgerEndDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return false;
  };

  const supplierPurchases = selectedLedgerSupplier
    ? DB.getPurchases()
        .filter(p => p.supplierId === selectedLedgerSupplier.id && ledgerDateMatch(p.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const totalPurchaseCost = supplierPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalStockPurchased = supplierPurchases.reduce((sum, p) => sum + p.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);
  const balanceDues = selectedLedgerSupplier ? selectedLedgerSupplier.due : 0;
  const totalPaidAmount = Math.max(0, totalPurchaseCost - balanceDues);

  // Sales Profitability Analysis
  const supplierAllProductIds = selectedLedgerSupplier
    ? new Set(
        DB.getPurchases()
          .filter(p => p.supplierId === selectedLedgerSupplier.id)
          .flatMap(p => p.items.map(item => item.productId))
      )
    : new Set<string>();

  const supplierProductSales = sales
    ? sales
        .filter(s => s.status === 'completed' && ledgerDateMatch(s.date))
        .map(s => ({
          ...s,
          items: s.items.filter(item => supplierAllProductIds.has(item.productId))
        }))
        .filter(s => s.items.length > 0)
    : [];

  const totalSalesRevenue = supplierProductSales.reduce((sum, s) => {
    return sum + s.items.reduce((acc, item) => {
      const itemDiscount = s.subtotal > 0 ? (item.total / s.subtotal) * s.discount : 0;
      return acc + (item.total - itemDiscount);
    }, 0);
  }, 0);

  const totalSalesCost = supplierProductSales.reduce((sum, s) => {
    return sum + s.items.reduce((acc, item) => acc + (item.purchasePrice * item.qty), 0);
  }, 0);

  const supplierSalesProfit = totalSalesRevenue - totalSalesCost;

  const totalSalesQty = supplierProductSales.reduce((sum, s) => {
    return sum + s.items.reduce((acc, item) => acc + item.qty, 0);
  }, 0);

  // Map to group quantities
  const productPurchaseQtyMap: { [prodId: string]: number } = {};
  supplierPurchases.forEach(p => {
    p.items.forEach(item => {
      productPurchaseQtyMap[item.productId] = (productPurchaseQtyMap[item.productId] || 0) + item.qty;
    });
  });

  const productSalesMap: { [prodId: string]: { qty: number; revenue: number; cost: number } } = {};
  supplierProductSales.forEach(s => {
    s.items.forEach(item => {
      const itemDiscount = s.subtotal > 0 ? (item.total / s.subtotal) * s.discount : 0;
      const netRev = item.total - itemDiscount;
      const cost = item.purchasePrice * item.qty;
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { qty: 0, revenue: 0, cost: 0 };
      }
      productSalesMap[item.productId].qty += item.qty;
      productSalesMap[item.productId].revenue += netRev;
      productSalesMap[item.productId].cost += cost;
    });
  });

  // Unified chronological timeline for Stock In (Purchases) and Stock Out (Sales)
  const unifiedTransactions = [
    ...supplierPurchases.map(p => ({
      id: p.id,
      type: 'in' as const,
      date: p.date,
      refNo: p.invoiceNo,
      vehicleNo: p.vehicleNo || undefined,
      deliveryPersonPhone: p.deliveryPersonPhone || undefined,
      customerName: undefined as string | undefined,
      items: p.items.map(item => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        price: item.purchasePrice,
        total: item.total
      })),
      discount: p.discount || 0,
      coolie: p.coolie || 0,
      subtotal: p.subtotal || p.total,
      totalAmount: p.total,
      status: p.paymentStatus
    })),
    ...supplierProductSales.map(s => ({
      id: s.id,
      type: 'out' as const,
      date: s.date,
      refNo: s.invoiceNo,
      vehicleNo: undefined as string | undefined,
      deliveryPersonPhone: undefined as string | undefined,
      customerName: s.customerName,
      items: s.items.map(item => {
        const itemDiscount = s.subtotal > 0 ? (item.total / s.subtotal) * s.discount : 0;
        return {
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          price: item.salesPrice,
          total: item.total - itemDiscount
        };
      }),
      discount: s.discount || 0,
      coolie: 0,
      subtotal: s.subtotal,
      totalAmount: s.items.reduce((acc, item) => {
        const itemDiscount = s.subtotal > 0 ? (item.total / s.subtotal) * s.discount : 0;
        return acc + (item.total - itemDiscount);
      }, 0),
      status: 'Paid'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = unifiedTransactions.filter(t => {
    if (ledgerStockFilter === 'in') return t.type === 'in';
    if (ledgerStockFilter === 'out') return t.type === 'out';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Purchase Management</h1>
          <p>Record wholesale warehouse purchases, increment stocks automatically, and manage supplier debts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${subTab === 'entry' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('entry')}
          >
            New Purchase Entry
          </button>
          <button 
            className={`btn ${subTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('suppliers')}
          >
            Supplier Directory & Ledgers
          </button>
          <button 
            className={`btn ${subTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('history')}
          >
            Purchase History Log
          </button>
        </div>
      </div>

      {subTab === 'entry' && (
        /* Purchase Entry View */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left panel: Build item lists */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Invoice Item Builder</h3>

            {/* Select product to buy */}
            {(() => {
              const selectedProd = products.find(p => p.id === tempProductId);
              const hasVariations = selectedProd?.variations && selectedProd.variations.length > 0;
              const v = selectedProd && selectedProd.variations && tempVariationId
                ? selectedProd.variations.find(varItem => varItem.id === tempVariationId)
                : undefined;
              const availableUnits = selectedProd
                ? (v ? Array.from(new Set([v.unit || selectedProd.unit, v.unit2].filter(Boolean) as string[])) : [selectedProd.unit])
                : [];

              return (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: hasVariations ? '1.2fr 1fr 0.8fr 0.8fr 0.8fr 50px' : '1.5fr 1fr 1fr 1fr 50px', 
                  gap: '0.5rem', 
                  alignItems: 'end' 
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Select Product</label>
                    <select
                      className="form-control"
                      value={tempProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                      ))}
                    </select>
                  </div>

                  {hasVariations && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Select Mark / Batch</label>
                      <select
                        className="form-control"
                        value={tempVariationId}
                        onChange={(e) => handleVariationSelect(e.target.value)}
                      >
                        {selectedProd.variations!.map(varItem => (
                          <option key={varItem.id} value={varItem.id}>
                            {varItem.mark} (Cost 1: ₹{varItem.purchasePrice}{varItem.unit2 && ` / Cost 2: ₹${varItem.purchasePrice2 || 0}`})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Unit</label>
                    <select
                      className="form-control"
                      value={tempUnit}
                      onChange={(e) => handleUnitSelect(e.target.value)}
                    >
                      <option value="">-- Unit --</option>
                      {availableUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Purchase Price (₹ Cost)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="0.01"
                      value={tempPrice || ''}
                      onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0.001"
                      step="0.001"
                      value={tempQty}
                      onChange={(e) => setTempQty(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddItemToList}
                    style={{ height: '38px', width: '38px', padding: 0, borderRadius: 'var(--border-radius-sm)' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              );
            })()}

            {/* Builder Items Table */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>ITEMS ADDED TO INVOICE</h4>
              {purchaseItems.length > 0 ? (
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'right' }}>Cost Price</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>
                            {item.product.name}
                            {item.variation && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', padding: '0.05rem 0.25rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px' }}>
                                {item.variation.mark}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>{Number(item.qty.toFixed(3))} {item.unit}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(item.purchasePrice * item.qty).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon"
                              style={{ padding: '0.2rem', color: 'var(--danger)' }}
                              onClick={() => handleRemoveItem(idx)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                  Invoice list is empty. Select products and prices above to build invoice entry.
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Supplier and meta entry */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 600 }}>Invoice Details</h3>
            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Select Supplier *</label>
                <select
                  className="form-control"
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Due: ₹{s.due})</option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Supplier Invoice No *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. INV-1234"
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Purchase Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Terms *</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="paymentStatus"
                      checked={paymentStatus === 'Paid'}
                      onChange={() => setPaymentStatus('Paid')}
                    />
                    <span>Paid (In Full)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="paymentStatus"
                      checked={paymentStatus === 'Due'}
                      onChange={() => setPaymentStatus('Due')}
                    />
                    <span style={{ color: 'var(--danger)' }}>Due / Credit (Pay Later)</span>
                  </label>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Vehicle Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MH-12-PQ-9999"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Person Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 9800012345"
                    value={deliveryPersonPhone}
                    onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Discount Allowed (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="any"
                    value={discount || ''}
                    placeholder="0.00"
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label>Coolie Charges (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="any"
                    value={coolie || ''}
                    placeholder="0.00"
                    onChange={(e) => setCoolie(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Total Card */}
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--danger)' }}>
                    <span>Discount:</span>
                    <span>- ₹{discount.toFixed(2)}</span>
                  </div>
                )}
                {coolie > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--info)' }}>
                    <span>Coolie Charges:</span>
                    <span>+ ₹{coolie.toFixed(2)}</span>
                  </div>
                )}
                <hr style={{ borderColor: 'var(--border-color)', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>Total Purchase Cost:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
                disabled={purchaseItems.length === 0 || !selectedSupplierId}
              >
                Submit Purchase Bill
              </button>
            </form>
          </div>
        </div>
      )}

      {subTab === 'suppliers' && (
        /* Supplier Directory Ledger view */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Supplier Directory List */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Registered Suppliers</h3>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                onClick={() => setIsSupplierModalOpen(true)}
              >
                <UserPlus size={14} />
                <span>Add Supplier</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {suppliers.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: selectedLedgerSupplier?.id === s.id ? 'var(--primary-light)' : 'var(--bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => setSelectedLedgerSupplier(s)}
                >
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PH: {s.phone}</span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: s.due > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ₹{s.due.toFixed(2)}
                    </span>
                    {s.due > 0 && (
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaySupplier(s);
                          setPayAmount(s.due);
                          setIsPayDuesOpen(true);
                        }}
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                      >
                        Pay Outstanding
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier Ledger Transactions log */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {selectedLedgerSupplier ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem' }}>Supplier Ledger Details</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Supplier: <strong>{selectedLedgerSupplier.name}</strong>
                      {selectedLedgerSupplier.phone && ` | PH: ${selectedLedgerSupplier.phone}`}
                    </span>
                  </div>
                  {((ledgerViewMode === 'ledger' && supplierPurchases.length > 0) || (ledgerViewMode === 'sales_profit' && supplierAllProductIds.size > 0)) && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setIsPrintingLedger(true)}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      <Printer size={14} />
                      <span>{ledgerViewMode === 'ledger' ? 'Print Full Ledger' : 'Print Sales & Profit Report'}</span>
                    </button>
                  )}
                </div>

                {/* Filters & Mode Selection Bar */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', background: 'var(--bg-input)' }}>
                  
                  {/* View Mode Toggle */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginRight: 'auto' }}>
                    <button
                      className={`btn ${ledgerViewMode === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
                      onClick={() => setLedgerViewMode('ledger')}
                    >
                      Ledger & Invoices
                    </button>
                    <button
                      className={`btn ${ledgerViewMode === 'sales_profit' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
                      onClick={() => setLedgerViewMode('sales_profit')}
                    >
                      Sales & Profit/Loss
                    </button>
                  </div>

                  {/* Day Wise Filter Selector */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Period:</span>
                    <select
                      className="form-control"
                      style={{ width: '130px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      value={ledgerFilterType}
                      onChange={(e) => setLedgerFilterType(e.target.value as any)}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {/* Stock Movement Filter Selector */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Movement:</span>
                    <select
                      className="form-control"
                      style={{ width: '150px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      value={ledgerStockFilter}
                      onChange={(e) => setLedgerStockFilter(e.target.value as any)}
                    >
                      <option value="all">All (In & Out)</option>
                      <option value="in">Stock In (Purchases)</option>
                      <option value="out">Stock Out (Sales)</option>
                    </select>
                  </div>

                  {/* Custom Date Picker */}
                  {ledgerFilterType === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="date"
                        className="form-control"
                        style={{ width: '130px', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                        value={ledgerStartDate}
                        onChange={(e) => setLedgerStartDate(e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>to</span>
                      <input
                        type="date"
                        className="form-control"
                        style={{ width: '130px', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                        value={ledgerEndDate}
                        onChange={(e) => setLedgerEndDate(e.target.value)}
                      />
                    </div>
                  )}

                </div>

                {ledgerViewMode === 'ledger' ? (
                  /* Ledger & Invoices View Mode */
                  <div>
                    {/* 4 Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {/* Total Purchases */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Total Purchases</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>₹{totalPurchaseCost.toFixed(2)}</h4>
                        </div>
                      </div>

                      {/* Total Paid */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--success)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Total Paid</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>₹{totalPaidAmount.toFixed(2)}</h4>
                        </div>
                      </div>

                      {/* Balance Dues */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--danger)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                          <TrendingDown size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Balance Dues</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>₹{balanceDues.toFixed(2)}</h4>
                        </div>
                      </div>

                      {/* Total Stock Qty */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--info)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--info-light)', color: 'var(--info)', display: 'flex', alignItems: 'center' }}>
                          <Package size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Total Stock Qty</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>{Number(totalStockPurchased.toFixed(3))}</h4>
                        </div>
                      </div>
                    </div>

                    {filteredTransactions.length > 0 ? (
                      <div className="table-container">
                        <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                          <thead>
                            <tr>
                              <th style={{ paddingLeft: '1rem' }}>Description / Items</th>
                              <th style={{ width: '80px', textAlign: 'right' }}>Price</th>
                              <th style={{ width: '90px', textAlign: 'center' }}>Qty</th>
                              <th style={{ width: '100px', textAlign: 'right' }}>Total Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTransactions.map(t => (
                              <React.Fragment key={`${t.type}-${t.id}`}>
                                {/* Group Header Row */}
                                <tr style={{ background: t.type === 'in' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)', fontWeight: 600 }}>
                                  <td colSpan={4} style={{ padding: '0.6rem 1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <span style={{ color: 'var(--text-primary)', marginRight: '1rem' }}>📅 {new Date(t.date).toLocaleDateString()}</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>Invoice: <strong style={{ color: 'var(--primary)' }}>{t.refNo}</strong></span>
                                        {t.customerName && <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>Customer: <strong>{t.customerName}</strong></span>}
                                      </div>
                                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {t.vehicleNo && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🚚 {t.vehicleNo}</span>}
                                        {t.deliveryPersonPhone && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📞 {t.deliveryPersonPhone}</span>}
                                        <span className="badge" style={{ 
                                          fontSize: '0.65rem',
                                          background: t.type === 'in' ? 'var(--success-light)' : 'var(--warning-light)',
                                          color: t.type === 'in' ? 'var(--success)' : 'var(--warning)',
                                          border: t.type === 'in' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)',
                                          fontWeight: 700
                                        }}>
                                          {t.type === 'in' ? '📥 STOCK IN' : '📤 STOCK OUT'}
                                        </span>
                                        <span className={`badge ${t.status === 'Due' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                                          {t.status.toUpperCase()}
                                        </span>
                                        <span style={{ color: t.type === 'in' ? 'var(--success)' : 'var(--primary)', fontWeight: 700 }}>₹{t.totalAmount.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                {/* Item Rows */}
                                {t.items.map((item, itemIdx) => (
                                  <tr key={`${t.type}-${t.id}-item-${itemIdx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                    <td style={{ paddingLeft: '1.5rem', fontWeight: 500 }}>
                                      {item.name}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                                    <td style={{ textAlign: 'center' }}>{Number(item.qty.toFixed(3))} {item.unit}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.total.toFixed(2)}</td>
                                  </tr>
                                ))}
                                {/* Summary Row for Discount & Coolie */}
                                {(t.discount > 0 || t.coolie > 0) && (
                                  <tr style={{ background: 'rgba(255,255,255,0.01)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    <td colSpan={2} style={{ paddingLeft: '1.5rem', fontStyle: 'italic' }}>
                                      Subtotal: ₹{t.subtotal.toFixed(2)}
                                    </td>
                                    <td colSpan={2} style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                      <div style={{ display: 'inline-flex', gap: '1rem' }}>
                                        {t.discount > 0 && <span style={{ color: 'var(--danger)' }}>Discount: -₹{t.discount.toFixed(2)}</span>}
                                        {t.coolie > 0 && <span style={{ color: 'var(--info)' }}>Coolie: +₹{t.coolie.toFixed(2)}</span>}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                        No purchase history registered with this supplier in the selected period.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Sales & Profitability View Mode */
                  <div>
                    {/* 4 Sales Profitability Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {/* Total Sales Revenue */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                          <TrendingDown size={18} style={{ transform: 'rotate(180deg)' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Sales Revenue</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>₹{totalSalesRevenue.toFixed(2)}</h4>
                        </div>
                      </div>

                      {/* Cost of Goods Sold */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--info)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--info-light)', color: 'var(--info)', display: 'flex', alignItems: 'center' }}>
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Cost of Sales</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>₹{totalSalesCost.toFixed(2)}</h4>
                        </div>
                      </div>

                      {/* Net Profit/Loss */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: `4px solid ${supplierSalesProfit >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: supplierSalesProfit >= 0 ? 'var(--success-light)' : 'var(--danger-light)', color: supplierSalesProfit >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Net Profit / Loss</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0, color: supplierSalesProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            ₹{supplierSalesProfit.toFixed(2)}
                          </h4>
                        </div>
                      </div>

                      {/* Total Stock Sold */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--warning)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center' }}>
                          <Package size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Total Stock Sold</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>{Number(totalSalesQty.toFixed(3))}</h4>
                        </div>
                      </div>
                    </div>

                    {supplierAllProductIds.size > 0 ? (
                      <div className="table-container">
                        <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                          <thead>
                            <tr>
                              <th style={{ paddingLeft: '1rem' }}>Product Details</th>
                              <th style={{ textAlign: 'center', width: '90px' }}>Purchased Qty</th>
                              <th style={{ textAlign: 'center', width: '90px' }}>Sold Qty</th>
                              <th style={{ textAlign: 'center', width: '90px' }}>Current Stock</th>
                              <th style={{ textAlign: 'right', width: '110px' }}>Revenue (₹)</th>
                              <th style={{ textAlign: 'right', width: '110px' }}>Profit/Loss (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(supplierAllProductIds).map(prodId => {
                              const prod = products.find(p => p.id === prodId);
                              if (!prod) return null;

                              const purchasedQty = productPurchaseQtyMap[prodId] || 0;
                              const soldData = productSalesMap[prodId] || { qty: 0, revenue: 0, cost: 0 };
                              const productProfit = soldData.revenue - soldData.cost;

                              const totalStock = prod.variations && prod.variations.length > 0
                                ? prod.variations.reduce((acc, v) => acc + v.currentStock, 0)
                                : prod.currentStock;

                              return (
                                <tr key={prodId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                  <td style={{ paddingLeft: '1rem', fontWeight: 600 }}>
                                    {prod.name}
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                      Category: {prod.category} &bull; Unit: {prod.unit}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 500 }}>
                                    {Number(purchasedQty.toFixed(3))} {prod.unit}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 500, color: soldData.qty > 0 ? 'var(--info)' : 'inherit' }}>
                                    {Number(soldData.qty.toFixed(3))} {prod.unit}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: 600, color: totalStock <= prod.minStockAlert ? 'var(--warning)' : 'var(--success)' }}>
                                      {Number(totalStock.toFixed(3))} {prod.unit}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    ₹{soldData.revenue.toFixed(2)}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: productProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {productProfit >= 0 ? '+' : ''}₹{productProfit.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                        No product transaction records found for this supplier in the selected period.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={24} />
                <span>Select a supplier from the directory to view purchase ledgers.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'history' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Purchase Invoices History Log</h3>
          {purchases.length > 0 ? (
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Supplier</th>
                    <th>Supplier Invoice No</th>
                    <th>Vehicle No</th>
                    <th>Delivery Person Phone</th>
                    <th style={{ textAlign: 'right' }}>Total Cost</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...purchases]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((pur) => {
                      const supplier = suppliers.find(s => s.id === pur.supplierId);
                      return (
                        <tr key={pur.id}>
                          <td>{new Date(pur.date).toLocaleString()}</td>
                          <td style={{ fontWeight: 600 }}>{supplier?.name || 'Unknown Supplier'}</td>
                          <td style={{ fontFamily: 'Courier New', fontWeight: 600 }}>{pur.invoiceNo}</td>
                          <td>{pur.vehicleNo || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                          <td>{pur.deliveryPersonPhone || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{pur.total.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${pur.paymentStatus === 'Due' ? 'badge-danger' : 'badge-success'}`}>
                              {pur.paymentStatus.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-secondary btn-icon"
                              onClick={() => setSelectedPurchase(pur)}
                              title="Print / View Invoice"
                              style={{ padding: '0.3rem' }}
                            >
                              <Printer size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              No purchase bills recorded yet. Go to New Purchase Entry to create one.
            </div>
          )}
        </div>
      )}

      {/* Printable Purchase Invoice Preview Modal */}
      {selectedPurchase && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', background: 'var(--bg-sidebar)' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer style={{ color: 'var(--primary)' }} />
                <span>Purchase Invoice Print Hub</span>
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedPurchase(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ background: 'var(--bg-app)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Invoice Preview Container (Styled like printable A4 sheet) */}
              <div className="glass-panel" style={{ background: '#fff', color: '#000', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)', minHeight: '400px', overflowY: 'auto' }}>
                {/* Print Content Preview */}
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                  
                  {/* B2B Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{settings.shopName || 'WAREHOUSE HUB'}</h2>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', color: '#555' }}>{settings.address}</p>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', color: '#555' }}>Phone: {settings.phone}</p>
                      {settings.gstin && <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', fontWeight: 600 }}>GSTIN: {settings.gstin}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ fontSize: '1.1rem', color: 'indigo', fontWeight: 700, margin: '0 0 0.4rem 0' }}>PURCHASE LEDGER</h3>
                      <p style={{ margin: '0.25rem 0' }}><strong>Invoice No:</strong> {selectedPurchase.invoiceNo}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Date:</strong> {new Date(selectedPurchase.date).toLocaleString()}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Status:</strong> {selectedPurchase.paymentStatus.toUpperCase()}</p>
                    </div>
                  </div>

                  {/* Supplier & Transport details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1rem', background: '#f9fafb', padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '0.8rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, borderBottom: '1px solid #ddd', paddingBottom: '0.2rem', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#4b5563' }}>SUPPLIER PROFILE:</h4>
                      <p style={{ fontWeight: 600, margin: '0.1rem 0' }}>{suppliers.find(s => s.id === selectedPurchase.supplierId)?.name || 'Unknown'}</p>
                      <p style={{ margin: '0.1rem 0' }}>Phone: {suppliers.find(s => s.id === selectedPurchase.supplierId)?.phone}</p>
                      <p style={{ margin: '0.1rem 0' }}>Address: {suppliers.find(s => s.id === selectedPurchase.supplierId)?.address}</p>
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 600, borderBottom: '1px solid #ddd', paddingBottom: '0.2rem', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#4b5563' }}>TRANSPORT & DELIVERY:</h4>
                      <p style={{ margin: '0.25rem 0' }}><strong>Vehicle No:</strong> {selectedPurchase.vehicleNo || 'Not Specified'}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Delivery Person Phone:</strong> {selectedPurchase.deliveryPersonPhone || 'Not Specified'}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '40px', textAlign: 'center' }}>S.No</th>
                        <th style={{ padding: '6px', border: '1px solid #d1d5db', textAlign: 'left' }}>Item Description</th>
                        <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '80px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '90px', textAlign: 'right' }}>Cost Price (₹)</th>
                        <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '110px', textAlign: 'right' }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchase.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '6px', border: '1px solid #d1d5db', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '6px', border: '1px solid #d1d5db' }}>{item.name}</td>
                          <td style={{ padding: '6px', border: '1px solid #d1d5db', textAlign: 'center' }}>{Number(item.qty.toFixed(3))} {item.unit}</td>
                          <td style={{ padding: '6px', border: '1px solid #d1d5db', textAlign: 'right' }}>{item.purchasePrice.toFixed(2)}</td>
                          <td style={{ padding: '6px', border: '1px solid #d1d5db', textAlign: 'right' }}>{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'right', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotal:</span>
                        <span>₹{(selectedPurchase.subtotal || selectedPurchase.total).toFixed(2)}</span>
                      </div>
                      {selectedPurchase.discount !== undefined && selectedPurchase.discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'red' }}>
                          <span>Discount Allowed:</span>
                          <span>- ₹{selectedPurchase.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedPurchase.coolie !== undefined && selectedPurchase.coolie > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Coolie Charges:</span>
                          <span>+ ₹{selectedPurchase.coolie.toFixed(2)}</span>
                        </div>
                      )}
                      <hr style={{ margin: '0.2rem 0', borderColor: '#333' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}>
                        <span>Grand Total:</span>
                        <span>₹{selectedPurchase.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedPurchase(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsPrinting(true)}>
                <Printer size={16} />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Portal for clean printable page format */}
      {isPrinting && selectedPurchase && createPortal(
        <div id="print-area-root" style={{ fontFamily: 'monospace', color: '#000', background: '#fff', padding: '15mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{settings.shopName || 'WAREHOUSE HUB'}</h2>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>{settings.address}</p>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>Phone: {settings.phone}</p>
              {settings.gstin && <p style={{ margin: '2px 0', fontSize: '11px', fontWeight: 'bold' }}>GSTIN: {settings.gstin}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>PURCHASE LEDGER</h3>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>INV NO: {selectedPurchase.invoiceNo}</p>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>DATE: {new Date(selectedPurchase.date).toLocaleString()}</p>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>STATUS: {selectedPurchase.paymentStatus.toUpperCase()}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '1rem', border: '1px solid #000', padding: '8px', fontSize: '11px' }}>
            <div>
              <strong>SUPPLIER PROFILE:</strong>
              <div>{suppliers.find(s => s.id === selectedPurchase.supplierId)?.name || 'Unknown'}</div>
              <div>Phone: {suppliers.find(s => s.id === selectedPurchase.supplierId)?.phone}</div>
              <div>Address: {suppliers.find(s => s.id === selectedPurchase.supplierId)?.address}</div>
            </div>
            <div>
              <strong>TRANSPORT & DELIVERY:</strong>
              <div>Vehicle No: {selectedPurchase.vehicleNo || 'Not Specified'}</div>
              <div>Delivery Phone: {selectedPurchase.deliveryPersonPhone || 'Not Specified'}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                <th style={{ padding: '4px', textAlign: 'center', width: '30px' }}>S.No</th>
                <th style={{ padding: '4px', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '4px', textAlign: 'center', width: '80px' }}>Qty</th>
                <th style={{ padding: '4px', textAlign: 'right', width: '90px' }}>Cost Price</th>
                <th style={{ padding: '4px', textAlign: 'right', width: '110px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedPurchase.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                  <td style={{ padding: '4px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '4px' }}>{item.name}</td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>{Number(item.qty.toFixed(3))} {item.unit}</td>
                  <td style={{ padding: '4px', textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                  <td style={{ padding: '4px', textAlign: 'right' }}>₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '220px', fontSize: '11px', lineHeight: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{(selectedPurchase.subtotal || selectedPurchase.total).toFixed(2)}</span>
              </div>
              {selectedPurchase.discount !== undefined && selectedPurchase.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount Allowed:</span>
                  <span>- ₹{selectedPurchase.discount.toFixed(2)}</span>
                </div>
              )}
              {selectedPurchase.coolie !== undefined && selectedPurchase.coolie > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Coolie Charges:</span>
                  <span>+ ₹{selectedPurchase.coolie.toFixed(2)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid #000', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', paddingTop: '4px', marginTop: '4px' }}>
                <span>Grand Total:</span>
                <span>₹{selectedPurchase.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Render Portal for clean printable ledger/profitability format */}
      {isPrintingLedger && selectedLedgerSupplier && createPortal(
        <div id="print-area-root" style={{ fontFamily: 'monospace', color: '#000', background: '#fff', padding: '15mm' }}>
          {ledgerViewMode === 'ledger' ? (
            /* Purchase Ledger Print Area */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>{settings.shopName || 'WAREHOUSE HUB'}</h2>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}>{settings.address}</p>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}>Phone: {settings.phone}</p>
                  {settings.gstin && <p style={{ margin: '2px 0', fontSize: '11px', fontWeight: 'bold' }}>GSTIN: {settings.gstin}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>SUPPLIER ACCOUNT LEDGER</h3>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Print Date:</strong> {new Date().toLocaleString()}</p>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Period:</strong> {ledgerFilterType.toUpperCase()}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '1rem', border: '1px solid #000', padding: '8px', fontSize: '11px' }}>
                <div>
                  <strong>SUPPLIER PROFILE:</strong>
                  <div><strong>{selectedLedgerSupplier.name}</strong></div>
                  <div>Phone: {selectedLedgerSupplier.phone}</div>
                  {selectedLedgerSupplier.address && <div>Address: {selectedLedgerSupplier.address}</div>}
                </div>
                <div>
                  <strong>LEDGER SUMMARY:</strong>
                  <div>Total Purchases: ₹{totalPurchaseCost.toFixed(2)}</div>
                  <div>Total Paid Amount: ₹{totalPaidAmount.toFixed(2)}</div>
                  <div style={{ fontWeight: 'bold' }}>Outstanding Balance (Due): ₹{balanceDues.toFixed(2)}</div>
                  <div>Total Stock Purchased: {Number(totalStockPurchased.toFixed(3))} Units</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                    <th style={{ padding: '6px', textAlign: 'left', width: '90px' }}>Date</th>
                    <th style={{ padding: '6px', textAlign: 'left', width: '100px' }}>Invoice No</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Item Description / Details</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '85px' }}>Qty / Unit</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '110px' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <React.Fragment key={`${t.type}-${t.id}`}>
                      <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold', background: '#f5f5f5' }}>
                        <td style={{ padding: '6px' }}>{new Date(t.date).toLocaleDateString()}</td>
                        <td style={{ padding: '6px' }}>{t.refNo}</td>
                        <td style={{ padding: '6px' }}>
                          <span style={{ marginRight: '10px', fontSize: '9px', fontWeight: 'bold', color: t.type === 'in' ? 'green' : 'orange' }}>
                            {t.type === 'in' ? '📥 IN' : '📤 OUT'}
                          </span>
                          <span className={`badge ${t.status === 'Due' ? 'badge-danger' : 'badge-success'}`} style={{ marginRight: '10px', fontSize: '9px' }}>
                            {t.status.toUpperCase()}
                          </span>
                          {t.vehicleNo && <span style={{ marginRight: '10px' }}>🚚 {t.vehicleNo}</span>}
                          {t.deliveryPersonPhone && <span>📞 {t.deliveryPersonPhone}</span>}
                          {t.customerName && <span>👤 {t.customerName}</span>}
                        </td>
                        <td style={{ padding: '6px' }}></td>
                        <td style={{ padding: '6px', textAlign: 'right', color: t.type === 'in' ? 'green' : 'black' }}>₹{t.totalAmount.toFixed(2)}</td>
                      </tr>
                      {t.items.map((item, idx) => (
                        <tr key={`${t.type}-${t.id}-item-${idx}`} style={{ borderBottom: '1px dashed #ccc' }}>
                          <td></td>
                          <td></td>
                          <td style={{ padding: '4px 6px', color: '#555' }}>
                            {item.name} @ ₹{item.price.toFixed(2)}
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', color: '#555' }}>
                            {Number(item.qty.toFixed(3))} {item.unit}
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', color: '#555' }}>
                            ₹{item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {(t.discount > 0 || t.coolie > 0) && (
                        <tr style={{ borderBottom: '1px dashed #ccc', fontSize: '10px', color: '#777' }}>
                          <td></td>
                          <td></td>
                          <td style={{ padding: '4px 6px', fontStyle: 'italic' }}>
                            Invoice Subtotal: ₹{t.subtotal.toFixed(2)}
                          </td>
                          <td colSpan={2} style={{ padding: '4px 6px', textAlign: 'right' }}>
                            {t.discount > 0 && <span style={{ marginRight: '10px' }}>Discount: -₹{t.discount.toFixed(2)}</span>}
                            {t.coolie > 0 && <span>Coolie: +₹{t.coolie.toFixed(2)}</span>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Sales & Profitability Print Area */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>{settings.shopName || 'WAREHOUSE HUB'}</h2>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}>{settings.address}</p>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}>Phone: {settings.phone}</p>
                  {settings.gstin && <p style={{ margin: '2px 0', fontSize: '11px', fontWeight: 'bold' }}>GSTIN: {settings.gstin}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>SUPPLIER SALES & PROFITABILITY REPORT</h3>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Print Date:</strong> {new Date().toLocaleString()}</p>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Period:</strong> {ledgerFilterType.toUpperCase()}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '1rem', border: '1px solid #000', padding: '8px', fontSize: '11px' }}>
                <div>
                  <strong>SUPPLIER PROFILE:</strong>
                  <div><strong>{selectedLedgerSupplier.name}</strong></div>
                  <div>Phone: {selectedLedgerSupplier.phone}</div>
                  {selectedLedgerSupplier.address && <div>Address: {selectedLedgerSupplier.address}</div>}
                </div>
                <div>
                  <strong>PROFITABILITY SUMMARY:</strong>
                  <div>Sales Revenue: ₹{totalSalesRevenue.toFixed(2)}</div>
                  <div>Cost of Goods Sold: ₹{totalSalesCost.toFixed(2)}</div>
                  <div style={{ fontWeight: 'bold' }}>Net Profit/Loss: ₹{supplierSalesProfit.toFixed(2)}</div>
                  <div>Total Sold Quantity: {Number(totalSalesQty.toFixed(3))} Units</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '90px' }}>Purchased Qty</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '90px' }}>Sold Qty</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '90px' }}>Current Stock</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '110px' }}>Revenue (₹)</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '110px' }}>Net Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(supplierAllProductIds).map((prodId) => {
                    const prod = products.find(p => p.id === prodId);
                    if (!prod) return null;
                    
                    const purchasedQty = productPurchaseQtyMap[prodId] || 0;
                    const soldData = productSalesMap[prodId] || { qty: 0, revenue: 0, cost: 0 };
                    const productProfit = soldData.revenue - soldData.cost;
                    
                    const totalStock = prod.variations && prod.variations.length > 0
                      ? prod.variations.reduce((acc, v) => acc + v.currentStock, 0)
                      : prod.currentStock;

                    return (
                      <tr key={prodId} style={{ borderBottom: '1px dashed #ccc' }}>
                        <td style={{ padding: '6px' }}>
                          <strong>{prod.name}</strong>
                          <div style={{ fontSize: '9px', color: '#555' }}>Category: {prod.category}</div>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {Number(purchasedQty.toFixed(3))} {prod.unit}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {Number(soldData.qty.toFixed(3))} {prod.unit}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {Number(totalStock.toFixed(3))} {prod.unit}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>
                          ₹{soldData.revenue.toFixed(2)}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                          ₹{productProfit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Register Supplier Profile</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsSupplierModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSupplier}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Supplier / Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Supplier Address</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSupplierModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Dues Modal */}
      {isPayDuesOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Pay Supplier Outstanding</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsPayDuesOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCollectDues}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  Supplier: <strong>{paySupplier?.name}</strong>
                  <br />
                  Outstanding Dues We Owe: <strong style={{ color: 'var(--danger)' }}>₹{paySupplier?.due.toFixed(2)}</strong>
                </div>

                <div className="form-group">
                  <label>Payment Amount Settled (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="1"
                    max={paySupplier?.due}
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayDuesOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
