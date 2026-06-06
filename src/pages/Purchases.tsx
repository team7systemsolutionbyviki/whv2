import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { DB, Product, Purchase, Supplier, PurchaseItem, ProductVariation } from '../utils/db';
import { 
  Truck, 
  Plus, 
  Trash2, 
  Check, 
  TrendingDown, 
  TrendingUp,
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

const PRODUCT_CATEGORIES = ['Groceries', 'Dairy', 'FMCG', 'Personal Care', 'Household', 'Snacks', 'Beverages'];
const PRODUCT_UNITS = ['Pcs', 'Kg', 'Litre', 'Box', 'Packet', 'Gram', 'Bag'];

export const Purchases: React.FC = () => {
  const { 
    products, 
    suppliers, 
    purchases,
    sales,
    supplierPayments,
    refreshData, 
    showToast,
    settings 
  } = useApp();

  const [subTab, setSubTab] = useState<'entry' | 'suppliers' | 'history'>('entry');

  // Purchase Entry States
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<{ product: Product; qty: number; purchasePrice: number; unit: string; variation?: ProductVariation; bags?: number }[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Due'>('Paid');
  const [discount, setDiscount] = useState<number>(0);
  const [coolie, setCoolie] = useState<number>(0);

  // Vehicle & Delivery details
  const [vehicleNo, setVehicleNo] = useState('');
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState('');

  const formatPurchaseUnit = (unitStr: string) => {
    const u = (unitStr || '').toLowerCase().trim();
    if (u === 'bag' || u === 'bags') return 'KG';
    return unitStr || 'Pcs';
  };

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
  const [tempBags, setTempBags] = useState<number>(0);

  // Supplier Management states
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState<Supplier | null>(null);

  // Set default to consolidated ledger when suppliers are available
  useEffect(() => {
    if (suppliers.length > 0) {
      if (!selectedLedgerSupplier) {
        setSelectedLedgerSupplier({
          id: 'ALL',
          name: 'All Suppliers',
          phone: 'Consolidated Ledger',
          address: 'All registered suppliers in the system',
          due: suppliers.reduce((sum, s) => sum + s.due, 0)
        });
      } else if (selectedLedgerSupplier.id === 'ALL') {
        const totalDue = suppliers.reduce((sum, s) => sum + s.due, 0);
        if (selectedLedgerSupplier.due !== totalDue) {
          setSelectedLedgerSupplier(prev => prev ? { ...prev, due: totalDue } : null);
        }
      }
    }
  }, [suppliers, selectedLedgerSupplier]);
  
  // Supplier Ledger Filter States
  const [ledgerFilterType, setLedgerFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerEndDate, setLedgerEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerViewMode, setLedgerViewMode] = useState<'ledger' | 'sales_profit'>('ledger');
  const [ledgerStockFilter, setLedgerStockFilter] = useState<'all' | 'in' | 'out'>('all');
  const [reportGrouping, setReportGrouping] = useState<'product' | 'mark'>('product');
  const [ledgerProductFilter, setLedgerProductFilter] = useState<string>('all');
  const [ledgerMarkFilter, setLedgerMarkFilter] = useState<string>('all');

  // List of all products matching the current supplier's purchase items
  const ledgerProductsList = useMemo(() => {
    if (!selectedLedgerSupplier) return [];
    const pList = DB.getPurchases().filter(p => selectedLedgerSupplier.id === 'ALL' || p.supplierId === selectedLedgerSupplier.id);
    const prodIds = new Set(pList.flatMap(p => p.items.map(item => item.productId)));
    return products.filter(p => prodIds.has(p.id));
  }, [selectedLedgerSupplier, products]);

  // List of all variation marks matching the current supplier's purchase items and selected product filter
  const ledgerMarksList = useMemo(() => {
    if (!selectedLedgerSupplier) return [];
    const pList = DB.getPurchases().filter(p => selectedLedgerSupplier.id === 'ALL' || p.supplierId === selectedLedgerSupplier.id);
    const marks = new Set<string>();
    pList.forEach(p => {
      p.items.forEach(item => {
        if (ledgerProductFilter === 'all' || item.productId === ledgerProductFilter) {
          if (item.variationMark) {
            marks.add(item.variationMark);
          }
        }
      });
    });
    return Array.from(marks).sort();
  }, [selectedLedgerSupplier, ledgerProductFilter]);

  // Reset mark filter when product filter changes
  useEffect(() => {
    setLedgerMarkFilter('all');
  }, [ledgerProductFilter]);

  // Pay Dues state
  const [isPayDuesOpen, setIsPayDuesOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payNote, setPayNote] = useState('');

  // New Product Creator modal states (inside Invoice Item Builder)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Groceries');
  const [newProdUnit, setNewProdUnit] = useState('Pcs');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<number>(0);
  const [newProdSalesPrice, setNewProdSalesPrice] = useState<number>(0);
  const [newProdMinStockAlert, setNewProdMinStockAlert] = useState<number>(10);
  const [newProdVariations, setNewProdVariations] = useState<ProductVariation[]>([]);

  const openNewProductModal = () => {
    setNewProdName('');
    setNewProdBarcode(Date.now().toString());
    setNewProdCategory('Groceries');
    setNewProdUnit('Pcs');
    setNewProdPurchasePrice(0);
    setNewProdSalesPrice(0);
    setNewProdMinStockAlert(10);
    setNewProdVariations([]);
    setIsNewProductModalOpen(true);
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdBarcode) {
      showToast('Please fill all required fields correctly', 'warning');
      return;
    }

    const barcodeExists = products.some(p => p.barcode === newProdBarcode);
    if (barcodeExists) {
      showToast('A product with this barcode already exists', 'danger');
      return;
    }

    const processedVariations: ProductVariation[] = newProdVariations.map((v, i) => ({
      id: v.id || 'VAR-' + Date.now() + i,
      mark: v.mark,
      purchasePrice: Number(v.purchasePrice) || 0,
      salesPrice: Number(v.salesPrice) || 0,
      currentStock: 0,
      unit: v.unit,
      unit2: v.unit2 || undefined,
      purchasePrice2: v.purchasePrice2 !== undefined ? (Number(v.purchasePrice2) || 0) : undefined,
      salesPrice2: v.salesPrice2 !== undefined ? (Number(v.salesPrice2) || 0) : undefined
    }));

    let finalPurchasePrice = newProdPurchasePrice;
    let finalSalesPrice = newProdSalesPrice;

    if (processedVariations.length > 0) {
      finalPurchasePrice = processedVariations[0].purchasePrice;
      finalSalesPrice = processedVariations[0].salesPrice;
    }

    const productData: Product = {
      id: 'P' + Date.now().toString().slice(-4),
      name: newProdName,
      barcode: newProdBarcode,
      category: newProdCategory,
      unit: newProdUnit,
      purchasePrice: finalPurchasePrice,
      salesPrice: finalSalesPrice,
      currentStock: 0,
      minStockAlert: newProdMinStockAlert,
      variations: processedVariations.length > 0 ? processedVariations : undefined
    };

    DB.saveProduct(productData);
    refreshData();
    setIsNewProductModalOpen(false);
    showToast('Product registered in catalog successfully!', 'success');
    handleProductSelect(productData.id);
  };

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
      if (tempBags > 0) {
        updated[existsIdx].bags = (updated[existsIdx].bags || 0) + tempBags;
      }
      setPurchaseItems(updated);
    } else {
      setPurchaseItems(prev => [...prev, { product, qty: tempQty, purchasePrice: tempPrice, unit: tempUnit, variation, bags: tempBags || undefined }]);
    }

    // Reset selectors
    setTempProductId('');
    setTempVariationId('');
    setTempUnit('');
    setTempQty(1);
    setTempPrice(0);
    setTempBags(0);
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
        variationMark: item.variation?.mark,
        bags: item.bags
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

    // Record the payment settlement first
    const paymentData = {
      id: 'PAY-' + Date.now() + Math.random().toString(36).substr(2, 4),
      supplierId: paySupplier.id,
      date: new Date().toISOString(),
      amount: payAmount,
      referenceNo: payNote.trim() || undefined
    };

    DB.saveSupplierPayment(paymentData);
    DB.updateSupplierDue(paySupplier.id, -payAmount);
    refreshData();
    setIsPayDuesOpen(false);
    setPayAmount(0);
    setPayNote('');
    setPaySupplier(null);
    showToast('Payment logged and supplier due reduced', 'success');

    if (selectedLedgerSupplier) {
      if (selectedLedgerSupplier.id === 'ALL') {
        const totalDue = DB.getSuppliers().reduce((sum, s) => sum + s.due, 0);
        setSelectedLedgerSupplier(prev => prev ? { ...prev, due: totalDue } : null);
      } else if (selectedLedgerSupplier.id === paySupplier.id) {
        const updated = DB.getSuppliers().find(s => s.id === paySupplier.id);
        if (updated) setSelectedLedgerSupplier(updated);
      }
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
        .filter(p => (selectedLedgerSupplier.id === 'ALL' || p.supplierId === selectedLedgerSupplier.id) && ledgerDateMatch(p.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const totalPurchaseCost = supplierPurchases.reduce((sum, p) => {
    return sum + p.items
      .filter(item => {
        const matchProd = ledgerProductFilter === 'all' || item.productId === ledgerProductFilter;
        const matchMark = ledgerMarkFilter === 'all' || item.variationMark === ledgerMarkFilter;
        return matchProd && matchMark;
      })
      .reduce((itemSum, item) => itemSum + item.total, 0);
  }, 0);

  const totalStockPurchased = supplierPurchases.reduce((sum, p) => {
    return sum + p.items
      .filter(item => {
        const matchProd = ledgerProductFilter === 'all' || item.productId === ledgerProductFilter;
        const matchMark = ledgerMarkFilter === 'all' || item.variationMark === ledgerMarkFilter;
        return matchProd && matchMark;
      })
      .reduce((itemSum, item) => itemSum + item.qty, 0);
  }, 0);

  const balanceDues = selectedLedgerSupplier ? selectedLedgerSupplier.due : 0;

  const allSupplierPayments = selectedLedgerSupplier
    ? (selectedLedgerSupplier.id === 'ALL'
        ? supplierPayments
        : supplierPayments.filter(pm => pm.supplierId === selectedLedgerSupplier.id))
    : [];

  const totalPaidAmount = supplierPurchases.reduce((sum, p) => sum + (p.paymentStatus === 'Paid' ? p.total : 0), 0) +
                          allSupplierPayments.filter(pm => ledgerDateMatch(pm.date)).reduce((sum, pm) => sum + pm.amount, 0);

  // Sales Profitability Analysis
  const supplierAllProductIds = selectedLedgerSupplier
    ? (ledgerProductFilter !== 'all'
        ? new Set([ledgerProductFilter])
        : new Set(
            DB.getPurchases()
              .filter(p => selectedLedgerSupplier.id === 'ALL' || p.supplierId === selectedLedgerSupplier.id)
              .flatMap(p => p.items.map(item => item.productId))
          )
      )
    : new Set<string>();

  const supplierProductSales = sales
    ? sales
        .filter(s => s.status === 'completed' && ledgerDateMatch(s.date))
        .map(s => ({
          ...s,
          items: s.items.filter(item => {
            const matchesProduct = supplierAllProductIds.has(item.productId);
            const matchesMark = ledgerMarkFilter === 'all' || item.variationMark === ledgerMarkFilter;
            return matchesProduct && matchesMark;
          })
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

  const currentStockBalanceQty = Array.from(supplierAllProductIds).reduce((sum, prodId) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return sum;
    if (prod.variations && prod.variations.length > 0) {
      return sum + prod.variations
        .filter(v => ledgerMarkFilter === 'all' || v.mark === ledgerMarkFilter)
        .reduce((acc, v) => acc + v.currentStock, 0);
    }
    if (ledgerMarkFilter !== 'all') return sum;
    return sum + prod.currentStock;
  }, 0);

  const ledgerStockValue = Array.from(supplierAllProductIds).reduce((sum, prodId) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return sum;
    if (prod.variations && prod.variations.length > 0) {
      return sum + prod.variations
        .filter(v => ledgerMarkFilter === 'all' || v.mark === ledgerMarkFilter)
        .reduce((acc, v) => acc + (v.currentStock * v.purchasePrice), 0);
    }
    if (ledgerMarkFilter !== 'all') return sum;
    return sum + (prod.currentStock * prod.purchasePrice);
  }, 0);

  // Mark-wise / Variation-wise calculations
  const productVariationPurchaseQtyMap: { [key: string]: number } = {};
  supplierPurchases.forEach(p => {
    p.items.forEach(item => {
      const key = `${item.productId}_${item.variationId || 'DEFAULT'}_${item.variationMark || ''}`;
      productVariationPurchaseQtyMap[key] = (productVariationPurchaseQtyMap[key] || 0) + item.qty;
    });
  });

  const productVariationSalesMap: { [key: string]: { qty: number; revenue: number; cost: number } } = {};
  supplierProductSales.forEach(s => {
    s.items.forEach(item => {
      const key = `${item.productId}_${item.variationId || 'DEFAULT'}_${item.variationMark || ''}`;
      const itemDiscount = s.subtotal > 0 ? (item.total / s.subtotal) * s.discount : 0;
      const netRev = item.total - itemDiscount;
      const cost = item.purchasePrice * item.qty;
      if (!productVariationSalesMap[key]) {
        productVariationSalesMap[key] = { qty: 0, revenue: 0, cost: 0 };
      }
      productVariationSalesMap[key].qty += item.qty;
      productVariationSalesMap[key].revenue += netRev;
      productVariationSalesMap[key].cost += cost;
    });
  });

  const supplierAllProductVariations = selectedLedgerSupplier
    ? Array.from(
        new Set(
          DB.getPurchases()
            .filter(p => selectedLedgerSupplier.id === 'ALL' || p.supplierId === selectedLedgerSupplier.id)
            .flatMap(p => p.items.map(item => `${item.productId}_${item.variationId || 'DEFAULT'}_${item.variationMark || ''}`))
        )
      )
        .map(str => {
          const parts = str.split('_');
          const productId = parts[0];
          const variationId = parts[1];
          const variationMark = parts.slice(2).join('_');
          return {
            productId,
            variationId: variationId === 'DEFAULT' ? undefined : variationId,
            variationMark: variationMark || undefined,
            key: str
          };
        })
        .filter(item => {
          const matchesProduct = ledgerProductFilter === 'all' || item.productId === ledgerProductFilter;
          const matchesMark = ledgerMarkFilter === 'all' || item.variationMark === ledgerMarkFilter;
          return matchesProduct && matchesMark;
        })
    : [];

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

  // Calculate Running Balance over ALL time (unfiltered by date) to ensure correct running balance, then filter for display
  const allSupplierPurchases = selectedLedgerSupplier
    ? (selectedLedgerSupplier.id === 'ALL'
        ? DB.getPurchases()
        : DB.getPurchases().filter(p => p.supplierId === selectedLedgerSupplier.id))
    : [];

  const allSupplierSales = selectedLedgerSupplier
    ? sales
        .filter(s => s.status === 'completed')
        .map(s => ({
          ...s,
          items: s.items.filter(item => supplierAllProductIds.has(item.productId))
        }))
        .filter(s => s.items.length > 0)
    : [];

  const rawTimeline = [
    ...allSupplierPurchases.map(p => ({
      id: p.id,
      type: 'in' as const,
      date: p.date,
      refNo: p.invoiceNo,
      vehicleNo: p.vehicleNo || undefined,
      deliveryPersonPhone: p.deliveryPersonPhone || undefined,
      customerName: undefined as string | undefined,
      items: p.items.map(item => ({
        productId: item.productId,
        variationId: item.variationId,
        variationMark: item.variationMark,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        price: item.purchasePrice,
        total: item.total,
        bags: item.bags
      })),
      discount: p.discount || 0,
      coolie: p.coolie || 0,
      subtotal: p.subtotal || p.total,
      totalAmount: p.total,
      status: p.paymentStatus,
      due: p.total,
      paid: p.paymentStatus === 'Paid' ? p.total : 0,
      particulars: `Purchase Invoice (${p.paymentStatus})`,
      supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown Supplier'
    })),
    ...allSupplierPayments.map(pm => ({
      id: pm.id,
      type: 'payment' as const,
      date: pm.date,
      refNo: pm.referenceNo || 'N/A',
      vehicleNo: undefined as string | undefined,
      deliveryPersonPhone: undefined as string | undefined,
      customerName: undefined as string | undefined,
      items: [] as any[],
      discount: 0,
      coolie: 0,
      subtotal: 0,
      totalAmount: pm.amount,
      status: 'Paid',
      due: 0,
      paid: pm.amount,
      particulars: `Payment Settlement`,
      supplierName: suppliers.find(s => s.id === pm.supplierId)?.name || 'Unknown Supplier'
    })),
    ...allSupplierSales.map(s => ({
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
          productId: item.productId,
          variationId: item.variationId,
          variationMark: item.variationMark,
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          price: item.salesPrice,
          total: item.total - itemDiscount,
          bags: item.bags
        };
      }),
      discount: s.discount || 0,
      coolie: 0,
      subtotal: s.subtotal,
      totalAmount: s.items.reduce((acc, item) => {
        const itemDiscount = s.subtotal > 0 ? (item.total / s.subtotal) * s.discount : 0;
        return acc + (item.total - itemDiscount);
      }, 0),
      status: 'Paid',
      due: 0,
      paid: 0,
      particulars: `Stock Out (Sale to Customer)`,
      supplierName: undefined as string | undefined
    }))
  ];

  // Sort chronologically (oldest first) to calculate running balance
  rawTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningDueSum = 0;
  const timelineWithBalance = rawTimeline.map(t => {
    if (t.type === 'in') {
      if (t.status === 'Due') {
        runningDueSum += t.due;
      }
    } else if (t.type === 'payment') {
      runningDueSum -= t.paid;
    }
    return {
      ...t,
      runningBalance: runningDueSum
    };
  });

  // Filter transactions for current view list
  const unifiedTransactions = timelineWithBalance
    .map(t => {
      if (t.type === 'payment') return t;
      const filteredItems = t.items.filter(item => {
        const matchesProduct = ledgerProductFilter === 'all' || item.productId === ledgerProductFilter;
        const matchesMark = ledgerMarkFilter === 'all' || item.variationMark === ledgerMarkFilter;
        return matchesProduct && matchesMark;
      });
      return {
        ...t,
        items: filteredItems
      };
    })
    .filter(t => {
      if (t.type === 'payment') {
        return ledgerProductFilter === 'all' && ledgerMarkFilter === 'all';
      }
      return t.items.length > 0;
    })
    .filter(t => ledgerDateMatch(t.date))
    .filter(t => {
      if (ledgerStockFilter === 'in') return t.type === 'in';
      if (ledgerStockFilter === 'out') return t.type === 'out';
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = unifiedTransactions;

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
            className={`btn ${subTab === 'suppliers' && selectedLedgerSupplier?.id !== 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setSubTab('suppliers');
              if (selectedLedgerSupplier?.id === 'ALL' || !selectedLedgerSupplier) {
                setSelectedLedgerSupplier(suppliers[0] || null);
              }
            }}
          >
            Supplier Directory & Ledgers
          </button>
          <button 
            className={`btn ${subTab === 'suppliers' && selectedLedgerSupplier?.id === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setSubTab('suppliers');
              setSelectedLedgerSupplier({
                id: 'ALL',
                name: 'All Suppliers',
                phone: 'Consolidated Ledger',
                address: 'All registered suppliers in the system',
                due: suppliers.reduce((sum, s) => sum + s.due, 0)
              });
            }}
          >
            Full Consolidated Ledger
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
                  gridTemplateColumns: hasVariations ? '1.2fr 1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 50px' : '1.5fr 1fr 1fr 0.8fr 0.8fr 50px', 
                  gap: '0.5rem', 
                  alignItems: 'end' 
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ margin: 0 }}>Select Product</label>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '0 0.25rem', fontSize: '0.75rem', height: 'auto', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onClick={openNewProductModal}
                      >
                        <Plus size={12} />
                        <span>Add Product</span>
                      </button>
                    </div>
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

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Bags</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={tempBags || ''}
                      placeholder="-"
                      onChange={(e) => setTempBags(parseInt(e.target.value) || 0)}
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
                        <th style={{ textAlign: 'center' }}>Bags</th>
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
                          <td style={{ textAlign: 'center' }}>{item.bags || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{Number(item.qty.toFixed(3))} {formatPurchaseUnit(item.unit)}</td>
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
              {/* Consolidated Option */}
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: selectedLedgerSupplier?.id === 'ALL' ? 'var(--primary-light)' : 'var(--bg-input)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderLeft: '4px solid var(--primary)'
                }}
                onClick={() => setSelectedLedgerSupplier({
                  id: 'ALL',
                  name: 'All Suppliers',
                  phone: 'Consolidated Ledger',
                  address: 'All registered suppliers in the system',
                  due: suppliers.reduce((sum, s) => sum + s.due, 0)
                })}
              >
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Full Consolidated Ledger</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All suppliers combined</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: suppliers.reduce((sum, s) => sum + s.due, 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    ₹{suppliers.reduce((sum, s) => sum + s.due, 0).toFixed(2)}
                  </span>
                </div>
              </div>

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
                      {selectedLedgerSupplier.phone && selectedLedgerSupplier.id !== 'ALL' && ` | PH: ${selectedLedgerSupplier.phone}`}
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

                  {/* Product Filter Selector */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Product:</span>
                    <select
                      className="form-control"
                      style={{ width: '160px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      value={ledgerProductFilter}
                      onChange={(e) => setLedgerProductFilter(e.target.value)}
                    >
                      <option value="all">All Products</option>
                      {ledgerProductsList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mark Filter Selector */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mark:</span>
                    <select
                      className="form-control"
                      style={{ width: '130px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      value={ledgerMarkFilter}
                      onChange={(e) => setLedgerMarkFilter(e.target.value)}
                    >
                      <option value="all">All Marks</option>
                      {ledgerMarksList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
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
                    {/* Summary cards grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
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

                      {/* Total Sales */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--info)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--info-light)', color: 'var(--info)', display: 'flex', alignItems: 'center' }}>
                          <TrendingUp size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Total Sales</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>₹{totalSalesRevenue.toFixed(2)}</h4>
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

                      {/* Stock In Qty */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--warning)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center' }}>
                          <Package size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Stock In Qty</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>{Number(totalStockPurchased.toFixed(3))}</h4>
                        </div>
                      </div>

                      {/* Stock Out Qty */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid #a855f7' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center' }}>
                          <Package size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Stock Out Qty</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>{Number(totalSalesQty.toFixed(3))}</h4>
                        </div>
                      </div>

                      {/* Balance Stock Qty */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--success)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                          <Package size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Balance Stock Qty</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>{Number(currentStockBalanceQty.toFixed(3))}</h4>
                        </div>
                      </div>

                      {/* Ledger Stock Value */}
                      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Ledger Stock Value</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.1rem', margin: 0 }}>₹{ledgerStockValue.toFixed(2)}</h4>
                        </div>
                      </div>
                    </div>

                    {filteredTransactions.length > 0 ? (
                      <div className="table-container">
                        <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                          <thead>
                            <tr>
                              <th style={{ paddingLeft: '0.75rem', width: '100px' }}>Date</th>
                              <th>Particulars / Details</th>
                              <th style={{ width: '120px' }}>Ref / Invoice</th>
                              <th style={{ width: '100px', textAlign: 'right' }}>Due (+₹)</th>
                              <th style={{ width: '100px', textAlign: 'right' }}>Paid (-₹)</th>
                              <th style={{ width: '120px', textAlign: 'right', paddingRight: '1rem' }}>Balance (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTransactions.map(t => {
                              let borderLeftColor = 'var(--border-color)';
                              let rowBg = 'transparent';
                              let badgeColor = 'var(--text-secondary)';
                              let badgeBg = 'var(--bg-input)';
                              let typeLabel = '';

                              if (t.type === 'in') {
                                borderLeftColor = t.status === 'Due' ? 'var(--danger)' : 'var(--success)';
                                rowBg = t.status === 'Due' ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)';
                                badgeColor = t.status === 'Due' ? 'var(--danger)' : 'var(--success)';
                                badgeBg = t.status === 'Due' ? 'var(--danger-light)' : 'var(--success-light)';
                                typeLabel = '📥 Purchase';
                              } else if (t.type === 'payment') {
                                borderLeftColor = 'var(--primary)';
                                rowBg = 'rgba(99, 102, 241, 0.04)';
                                badgeColor = 'var(--primary)';
                                badgeBg = 'var(--primary-light)';
                                typeLabel = '💳 Payment';
                              } else if (t.type === 'out') {
                                borderLeftColor = 'var(--warning)';
                                rowBg = 'rgba(245, 158, 11, 0.02)';
                                badgeColor = 'var(--warning)';
                                badgeBg = 'var(--warning-light)';
                                typeLabel = '📤 Stock Out';
                              }

                              return (
                                <tr 
                                  key={`${t.type}-${t.id}`} 
                                  style={{ 
                                    borderLeft: `4px solid ${borderLeftColor}`,
                                    background: rowBg,
                                    borderBottom: '1px solid var(--border-color)'
                                  }}
                                >
                                  <td style={{ paddingLeft: '0.75rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                    📅 {new Date(t.date).toLocaleDateString()}
                                  </td>
                                  <td style={{ verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span 
                                        className="badge" 
                                        style={{ 
                                          fontSize: '0.65rem', 
                                          background: badgeBg, 
                                          color: badgeColor,
                                          fontWeight: 700 
                                        }}
                                      >
                                        {typeLabel}
                                      </span>
                                      <strong>
                                        {t.type === 'in' && `Purchase Invoice`}
                                        {t.type === 'payment' && `Dues Settlement`}
                                        {t.type === 'out' && `Sales Stock Out`}
                                      </strong>
                                      {selectedLedgerSupplier?.id === 'ALL' && t.supplierName && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, padding: '0.05rem 0.3rem', background: 'var(--primary-light)', borderRadius: '3px' }}>
                                          {t.supplierName}
                                        </span>
                                      )}
                                      {t.customerName && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}> (Customer: {t.customerName})</span>}
                                    </div>
                                    
                                    {t.type === 'payment' ? (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.5rem' }}>
                                        {t.refNo && t.refNo !== 'N/A' ? `Reference/Note: ${t.refNo}` : 'Settled outstanding dues'}
                                      </div>
                                    ) : (
                                      <div style={{ marginTop: '0.25rem', paddingLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {t.items.map((item: any, idx: number) => (
                                          <div key={idx} style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                            <span>• {item.name}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                              ({Number(item.qty.toFixed(3))} {formatPurchaseUnit(item.unit)} @ ₹{item.price.toFixed(2)})
                                            </span>
                                          </div>
                                        ))}
                                        {t.type === 'in' && (t.discount > 0 || t.coolie > 0) && (
                                          <div style={{ fontStyle: 'italic', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                            Subtotal: ₹{t.subtotal.toFixed(2)}
                                            {t.discount > 0 && ` | Discount: -₹${t.discount.toFixed(2)}`}
                                            {t.coolie > 0 && ` | Coolie: +₹${t.coolie.toFixed(2)}`}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ verticalAlign: 'top', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                    {t.refNo}
                                  </td>
                                  <td style={{ verticalAlign: 'top', textAlign: 'right', fontWeight: 600 }}>
                                    {t.type === 'in' ? `₹${t.due.toFixed(2)}` : '₹0.00'}
                                  </td>
                                  <td style={{ verticalAlign: 'top', textAlign: 'right', fontWeight: 600, color: t.paid > 0 ? 'var(--success)' : 'inherit' }}>
                                    {t.paid > 0 ? `₹${t.paid.toFixed(2)}` : '₹0.00'}
                                  </td>
                                  <td style={{ verticalAlign: 'top', textAlign: 'right', fontWeight: 700, paddingRight: '1rem', color: t.runningBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    ₹{t.runningBalance.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
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

                    {/* Report Type Sub-toggle */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Group By:</span>
                      <button
                        className={`btn ${reportGrouping === 'product' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => setReportGrouping('product')}
                      >
                        Product Wise
                      </button>
                      <button
                        className={`btn ${reportGrouping === 'mark' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => setReportGrouping('mark')}
                      >
                        Mark Wise
                      </button>
                    </div>

                    {reportGrouping === 'product' ? (
                      supplierAllProductIds.size > 0 ? (
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
                      )
                    ) : (
                      supplierAllProductVariations.length > 0 ? (
                        <div className="table-container">
                          <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                            <thead>
                              <tr>
                                <th style={{ paddingLeft: '1rem' }}>Product & Variation Details</th>
                                <th style={{ textAlign: 'center', width: '90px' }}>Purchased Qty</th>
                                <th style={{ textAlign: 'center', width: '90px' }}>Sold Qty</th>
                                <th style={{ textAlign: 'center', width: '90px' }}>Current Stock</th>
                                <th style={{ textAlign: 'right', width: '110px' }}>Revenue (₹)</th>
                                <th style={{ textAlign: 'right', width: '110px' }}>Profit/Loss (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supplierAllProductVariations.map(item => {
                                const prod = products.find(p => p.id === item.productId);
                                if (!prod) return null;

                                const purchasedQty = productVariationPurchaseQtyMap[item.key] || 0;
                                const soldData = productVariationSalesMap[item.key] || { qty: 0, revenue: 0, cost: 0 };
                                const variationProfit = soldData.revenue - soldData.cost;

                                let currentStock = 0;
                                if (item.variationId && prod.variations) {
                                  const v = prod.variations.find(varItem => varItem.id === item.variationId);
                                  currentStock = v ? v.currentStock : 0;
                                } else {
                                  currentStock = prod.currentStock;
                                }

                                return (
                                  <tr key={item.key} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                    <td style={{ paddingLeft: '1rem', fontWeight: 600 }}>
                                      {prod.name}
                                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.1rem' }}>
                                        Mark: {item.variationMark || 'Default Variation'}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 500 }}>
                                      {Number(purchasedQty.toFixed(3))} {prod.unit}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 500, color: soldData.qty > 0 ? 'var(--info)' : 'inherit' }}>
                                      {Number(soldData.qty.toFixed(3))} {prod.unit}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span style={{ fontWeight: 600, color: currentStock <= prod.minStockAlert ? 'var(--warning)' : 'var(--success)' }}>
                                        {Number(currentStock.toFixed(3))} {prod.unit}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                      ₹{soldData.revenue.toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: variationProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                      {variationProfit >= 0 ? '+' : ''}₹{variationProfit.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                          No variation transaction records found for this supplier in the selected period.
                        </div>
                      )
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
                        <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Item Description</th>
                        <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '60px', textAlign: 'center' }}>Bags</th>
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
                          <td style={{ padding: '6px', border: '1px solid #d1d5db', textAlign: 'center' }}>{item.bags || '-'}</td>
                          <td style={{ padding: '6px', border: '1px solid #d1d5db', textAlign: 'center' }}>{Number(item.qty.toFixed(3))} {formatPurchaseUnit(item.unit)}</td>
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
                <th style={{ padding: '4px', textAlign: 'center', width: '60px' }}>Bags</th>
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
                  <td style={{ padding: '4px', textAlign: 'center' }}>{item.bags || '-'}</td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>{Number(item.qty.toFixed(3))} {formatPurchaseUnit(item.unit)}</td>
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
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{selectedLedgerSupplier.id === 'ALL' ? 'CONSOLIDATED SUPPLIER ACCOUNT LEDGER' : 'SUPPLIER ACCOUNT LEDGER'}</h3>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Print Date:</strong> {new Date().toLocaleString()}</p>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Period:</strong> {ledgerFilterType.toUpperCase()}</p>
                  {ledgerProductFilter !== 'all' && (
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>
                      <strong>Product:</strong> {products.find(p => p.id === ledgerProductFilter)?.name}
                    </p>
                  )}
                  {ledgerMarkFilter !== 'all' && (
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>
                      <strong>Mark:</strong> {ledgerMarkFilter}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '1rem', border: '1px solid #000', padding: '8px', fontSize: '11px' }}>
                <div>
                  <strong>{selectedLedgerSupplier.id === 'ALL' ? 'ACCOUNT SUMMARY:' : 'SUPPLIER PROFILE:'}</strong>
                  <div><strong>{selectedLedgerSupplier.name}</strong></div>
                  {selectedLedgerSupplier.id !== 'ALL' && <div>Phone: {selectedLedgerSupplier.phone}</div>}
                  {selectedLedgerSupplier.id !== 'ALL' && selectedLedgerSupplier.address && <div>Address: {selectedLedgerSupplier.address}</div>}
                  {selectedLedgerSupplier.id === 'ALL' && <div>Scope: All Registered Suppliers</div>}
                </div>
                <div>
                  <strong>LEDGER SUMMARY:</strong>
                  <div>Total Purchases (Stock In): ₹{totalPurchaseCost.toFixed(2)} ({Number(totalStockPurchased.toFixed(3))} Units)</div>
                  <div>Total Sales (Stock Out): ₹{totalSalesRevenue.toFixed(2)} ({Number(totalSalesQty.toFixed(3))} Units)</div>
                  <div>Total Paid Amount: ₹{totalPaidAmount.toFixed(2)}</div>
                  <div style={{ fontWeight: 'bold' }}>Outstanding Balance (Due): ₹{balanceDues.toFixed(2)}</div>
                  <div>Balance Stock Qty: {Number(currentStockBalanceQty.toFixed(3))} Units</div>
                  <div>Ledger Stock Value: ₹{ledgerStockValue.toFixed(2)}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000', fontWeight: 'bold' }}>
                    <th style={{ padding: '6px', textAlign: 'left', width: '80px' }}>Date</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Particulars / Items</th>
                    <th style={{ padding: '6px', textAlign: 'left', width: '90px' }}>Ref No / Inv</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '90px' }}>Due (+₹)</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '90px' }}>Paid (-₹)</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '100px' }}>Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr 
                      key={`${t.type}-${t.id}`} 
                      style={{ 
                        borderBottom: '1px solid #ccc',
                        background: t.type === 'payment' ? '#f0f4f8' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '6px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '6px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {t.type === 'in' && `📥 Purchase Invoice (${t.status})`}
                          {t.type === 'payment' && `💳 Payment Settlement`}
                          {t.type === 'out' && `📤 Sales Stock Out`}
                          {selectedLedgerSupplier.id === 'ALL' && t.supplierName && ` [${t.supplierName}]`}
                        </div>
                        {t.type === 'payment' ? (
                          <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                            {t.refNo && t.refNo !== 'N/A' ? `Note: ${t.refNo}` : 'Settled outstanding dues'}
                          </div>
                        ) : (
                          <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                            {t.items.map((item, idx) => (
                              <div key={idx}>
                                • {item.name} ({Number(item.qty.toFixed(3))} {formatPurchaseUnit(item.unit)} @ ₹{item.price.toFixed(2)})
                              </div>
                            ))}
                            {t.type === 'in' && (t.discount > 0 || t.coolie > 0) && (
                              <div style={{ fontStyle: 'italic', color: '#777', fontSize: '8.5px', marginTop: '1px' }}>
                                Subtotal: ₹{t.subtotal.toFixed(2)}
                                {t.discount > 0 && ` | Discount: -₹${t.discount.toFixed(2)}`}
                                {t.coolie > 0 && ` | Coolie: +₹${t.coolie.toFixed(2)}`}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '6px', verticalAlign: 'top', fontFamily: 'monospace' }}>
                        {t.refNo}
                      </td>
                      <td style={{ padding: '6px', verticalAlign: 'top', textAlign: 'right' }}>
                        {t.type === 'in' ? `₹${t.due.toFixed(2)}` : '₹0.00'}
                      </td>
                      <td style={{ padding: '6px', verticalAlign: 'top', textAlign: 'right', color: t.paid > 0 ? 'green' : 'black' }}>
                        {t.paid > 0 ? `₹${t.paid.toFixed(2)}` : '₹0.00'}
                      </td>
                      <td style={{ padding: '6px', verticalAlign: 'top', textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{t.runningBalance.toFixed(2)}
                      </td>
                    </tr>
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
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{selectedLedgerSupplier.id === 'ALL' ? 'CONSOLIDATED SALES & PROFITABILITY REPORT' : 'SUPPLIER SALES & PROFITABILITY REPORT'}</h3>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Print Date:</strong> {new Date().toLocaleString()}</p>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Period:</strong> {ledgerFilterType.toUpperCase()}</p>
                  {ledgerProductFilter !== 'all' && (
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>
                      <strong>Product:</strong> {products.find(p => p.id === ledgerProductFilter)?.name}
                    </p>
                  )}
                  {ledgerMarkFilter !== 'all' && (
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>
                      <strong>Mark:</strong> {ledgerMarkFilter}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '1rem', border: '1px solid #000', padding: '8px', fontSize: '11px' }}>
                <div>
                  <strong>{selectedLedgerSupplier.id === 'ALL' ? 'ACCOUNT SUMMARY:' : 'SUPPLIER PROFILE:'}</strong>
                  <div><strong>{selectedLedgerSupplier.name}</strong></div>
                  {selectedLedgerSupplier.id !== 'ALL' && <div>Phone: {selectedLedgerSupplier.phone}</div>}
                  {selectedLedgerSupplier.id !== 'ALL' && selectedLedgerSupplier.address && <div>Address: {selectedLedgerSupplier.address}</div>}
                  {selectedLedgerSupplier.id === 'ALL' && <div>Scope: All Registered Suppliers</div>}
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
                    <th style={{ padding: '6px', textAlign: 'left' }}>{reportGrouping === 'mark' ? 'Product & Mark Details' : 'Product Name'}</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '90px' }}>Purchased Qty</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '90px' }}>Sold Qty</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '90px' }}>Current Stock</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '110px' }}>Revenue (₹)</th>
                    <th style={{ padding: '6px', textAlign: 'right', width: '110px' }}>Net Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportGrouping === 'product' ? (
                    Array.from(supplierAllProductIds).map((prodId) => {
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
                    })
                  ) : (
                    supplierAllProductVariations.map((item) => {
                      const prod = products.find(p => p.id === item.productId);
                      if (!prod) return null;
                      
                      const purchasedQty = productVariationPurchaseQtyMap[item.key] || 0;
                      const soldData = productVariationSalesMap[item.key] || { qty: 0, revenue: 0, cost: 0 };
                      const variationProfit = soldData.revenue - soldData.cost;
                      
                      let currentStock = 0;
                      if (item.variationId && prod.variations) {
                        const v = prod.variations.find(varItem => varItem.id === item.variationId);
                        currentStock = v ? v.currentStock : 0;
                      } else {
                        currentStock = prod.currentStock;
                      }

                      return (
                        <tr key={item.key} style={{ borderBottom: '1px dashed #ccc' }}>
                          <td style={{ padding: '6px' }}>
                            <strong>{prod.name}</strong>
                            <div style={{ fontSize: '9px', color: '#555' }}>Mark: {item.variationMark || 'Default Variation'}</div>
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            {Number(purchasedQty.toFixed(3))} {prod.unit}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            {Number(soldData.qty.toFixed(3))} {prod.unit}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            {Number(currentStock.toFixed(3))} {prod.unit}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right' }}>
                            ₹{soldData.revenue.toFixed(2)}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                            ₹{variationProfit.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
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

                <div className="form-group">
                  <label>Payment Reference / Note (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Cash, GPay UPI, Check #104"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
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

      {/* Add New Product Modal (from Invoice Item Builder) */}
      {isNewProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Register New Product</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsNewProductModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveNewProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter product title..."
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Barcode / Scanner Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Scan or type barcode..."
                      required
                      value={newProdBarcode}
                      onChange={(e) => setNewProdBarcode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                    >
                      {PRODUCT_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Unit of Measure</label>
                    <select
                      className="form-control"
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value)}
                    >
                      {PRODUCT_UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Minimum Stock Alert Level</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={newProdMinStockAlert}
                      onChange={(e) => setNewProdMinStockAlert(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Purchase Price (₹ Cost Price) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="0.01"
                      required
                      disabled={newProdVariations.length > 0}
                      value={newProdVariations.length > 0 ? (newProdVariations[0].purchasePrice || '') : (newProdPurchasePrice || '')}
                      onChange={(e) => setNewProdPurchasePrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Sales Price (₹ Retail Price) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="0.01"
                      required
                      disabled={newProdVariations.length > 0}
                      value={newProdVariations.length > 0 ? (newProdVariations[0].salesPrice || '') : (newProdSalesPrice || '')}
                      onChange={(e) => setNewProdSalesPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Variations Section */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Product Variations (Different Marks & Prices)</h4>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => setNewProdVariations(prev => [...prev, { id: '', mark: '', purchasePrice: 0, salesPrice: 0, currentStock: 0, unit: newProdUnit, unit2: '', purchasePrice2: 0, salesPrice2: 0 }])}
                    >
                      <Plus size={12} />
                      <span>Add Variation</span>
                    </button>
                  </div>
                  
                  {newProdVariations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {newProdVariations.map((v, idx) => (
                        <div key={idx} style={{ 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--border-radius-sm)', 
                          padding: '0.75rem', 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.5rem' 
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr auto', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Variation Mark (e.g. Batch A / MRP 250)"
                              className="form-control"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                              required
                              value={v.mark}
                              onChange={(e) => {
                                const updated = [...newProdVariations];
                                updated[idx].mark = e.target.value;
                                setNewProdVariations(updated);
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit: {v.unit || newProdUnit}</span>
                            <button
                              type="button"
                              className="btn btn-danger btn-icon"
                              style={{ padding: '0.25rem' }}
                              onClick={() => {
                                const updated = newProdVariations.filter((_, i) => i !== idx);
                                setNewProdVariations(updated);
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem' }}>Purchase Price (₹)</label>
                              <input
                                type="number"
                                className="form-control"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                required
                                min="0"
                                step="0.01"
                                value={v.purchasePrice || ''}
                                onChange={(e) => {
                                  const updated = [...newProdVariations];
                                  updated[idx].purchasePrice = parseFloat(e.target.value) || 0;
                                  setNewProdVariations(updated);
                                }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem' }}>Sales Price (₹)</label>
                              <input
                                type="number"
                                className="form-control"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                required
                                min="0"
                                step="0.01"
                                value={v.salesPrice || ''}
                                onChange={(e) => {
                                  const updated = [...newProdVariations];
                                  updated[idx].salesPrice = parseFloat(e.target.value) || 0;
                                  setNewProdVariations(updated);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                      No variations added. Product will be saved as a simple standalone item.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewProductModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Select Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
