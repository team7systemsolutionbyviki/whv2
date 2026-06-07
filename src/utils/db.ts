// Database management layer using LocalStorage
import { rtdb } from './firebase';
import { ref, set } from 'firebase/database';

export interface ProductVariation {
  id: string;
  mark: string; // e.g. "MRP 250", "Batch A", "A-grade"
  purchasePrice: number;
  salesPrice: number;
  currentStock: number;
  unit?: string; // unit for this variation (e.g. "Bag", "Kg")
  unit2?: string; // secondary unit for this variation (e.g. "Kg")
  purchasePrice2?: number; // secondary purchase price (optional)
  salesPrice2?: number;    // secondary sales price
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salesPrice: number;
  currentStock: number;
  minStockAlert: number;
  variations?: ProductVariation[];
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  unit: string;
  purchasePrice: number;
  salesPrice: number;
  total: number;
  variationId?: string;
  variationMark?: string;
  weight?: number; // total item weight in KG
  bags?: number; // total bags for this item
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number; // flat discount
  tax: number; // calculated GST amount
  total: number;
  profit: number; // calculated profit
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Mixed' | 'Credit';
  paymentDetails: {
    cashAmount?: number;
    upiAmount?: number;
    cardAmount?: number;
  };
  status: 'completed' | 'on_hold' | 'returned';
  type: 'retail' | 'wholesale';
  dealerId?: string;
  returnedItems?: { productId: string; qty: number; reason: string }[];
  createdBy?: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  qty: number;
  unit: string;
  purchasePrice: number;
  total: number;
  variationId?: string;
  variationMark?: string;
  bags?: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string; // supplier invoice number
  date: string;
  supplierId: string;
  items: PurchaseItem[];
  subtotal?: number;
  discount?: number;
  coolie?: number;
  vehicleNo?: string;
  deliveryPersonPhone?: string;
  lotNo?: string;
  vehicleMark?: string;
  total: number;
  paymentStatus: 'Paid' | 'Due';
  dueAmount: number;
}

export interface Dealer {
  id: string;
  name: string;
  phone: string;
  address: string;
  outstanding: number; // outstanding dues
  email?: string;
  creditLimit?: number;
  gstin?: string;
  lastReminderSent?: string; // ISO date of last WhatsApp/SMS reminder
}

export interface DealerPayment {
  id: string;
  dealerId: string;
  date: string;
  amount: number;
  type?: 'credit' | 'debit';
  referenceNo?: string;
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  due: number; // amount we owe the supplier
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  date: string;
  amount: number;
  referenceNo?: string;
}

export interface StockTransaction {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: 'Purchase' | 'Sale' | 'Adjustment (Add)' | 'Adjustment (Sub)' | 'Return';
  qty: number;
  referenceNo: string; // invoice or transaction id
  reason?: string;
}

export interface Settings {
  shopName: string;
  logo: string; // Base64 or placeholder url
  gstin: string;
  address: string;
  phone: string;
  invoicePrefix: string;
  taxRate: number; // e.g. 18 for 18% GST
  terms: string;
  defaultPrinterLayout: '3inch' | '4inch' | 'a5' | 'a4';
  upiId?: string;
  bankName?: string;
  bankAccNo?: string;
  bankIFSC?: string;
}

// Initial Mock Data
const INITIAL_PRODUCTS: Product[] = [
  { id: 'P001', name: 'Britannia Good Day Biscuits 150g', barcode: '8901063142345', category: 'FMCG', unit: 'Pcs', purchasePrice: 24, salesPrice: 30, currentStock: 120, minStockAlert: 20 },
  { id: 'P002', name: 'Amul Butter 500g', barcode: '8901262010041', category: 'Dairy', unit: 'Pcs', purchasePrice: 220, salesPrice: 250, currentStock: 15, minStockAlert: 10 },
  { id: 'P003', name: 'Tata Salt 1kg', barcode: '8901058002319', category: 'Groceries', unit: 'Pcs', purchasePrice: 22, salesPrice: 28, currentStock: 80, minStockAlert: 15 },
  { id: 'P004', name: 'Fortune Soya Health Oil 1L', barcode: '8906007281014', category: 'Groceries', unit: 'Pcs', purchasePrice: 115, salesPrice: 140, currentStock: 8, minStockAlert: 12 }, // low stock
  { id: 'P005', name: 'Colgate Strong Teeth 200g', barcode: '8901313010328', category: 'Personal Care', unit: 'Pcs', purchasePrice: 85, salesPrice: 110, currentStock: 45, minStockAlert: 10 },
  { id: 'P006', name: 'Surf Excel Easy Wash 1kg', barcode: '8901030753000', category: 'Household', unit: 'Pcs', purchasePrice: 110, salesPrice: 140, currentStock: 3, minStockAlert: 8 }, // low stock
];

const INITIAL_DEALERS: Dealer[] = [
  { id: 'D001', name: 'Royal Supermarket', phone: '9876543210', address: 'Main Market, Sector 4, City', outstanding: 4500 },
  { id: 'D002', name: 'Vardhaman Traders', phone: '9123456789', address: 'Commercial complex, Block B, City', outstanding: 0 },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'S001', name: 'Balaji Wholesalers', phone: '9443210987', address: 'GIDC Industrial Area, City', due: 12000 },
  { id: 'S002', name: 'Metro Foods Distributor', phone: '9988776655', address: 'Ring Road, Wholesale Hub, City', due: 0 },
];

const INITIAL_SETTINGS: Settings = {
  shopName: 'SUPER MART & WHOLESALE',
  logo: '',
  gstin: '27AAACS1234A1Z5',
  address: 'Shop No. 12-15, Royal Plaza, MG Road, Mumbai - 400001',
  phone: '022-24567890 / 9999988888',
  invoicePrefix: 'SM-',
  taxRate: 18,
  terms: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payments.\n3. Subject to local jurisdiction.',
  defaultPrinterLayout: '3inch',
  upiId: 'supermart@okupi',
  bankName: 'State Bank of India',
  bankAccNo: '123456789012',
  bankIFSC: 'SBIN0001234'
};

const INITIAL_SALES: Sale[] = [
  {
    id: 'S-1001',
    invoiceNo: 'SM-2026-0001',
    date: '2026-06-02T10:30:00.000Z',
    customerName: 'Walking Customer',
    items: [
      { productId: 'P001', name: 'Britannia Good Day Biscuits 150g', qty: 2, unit: 'Pcs', purchasePrice: 24, salesPrice: 30, total: 60 },
      { productId: 'P003', name: 'Tata Salt 1kg', qty: 1, unit: 'Pcs', purchasePrice: 22, salesPrice: 28, total: 28 }
    ],
    subtotal: 88,
    discount: 5,
    tax: 12.66,
    total: 83,
    profit: 17,
    paymentMethod: 'Cash',
    paymentDetails: { cashAmount: 83 },
    status: 'completed',
    type: 'retail'
  },
  {
    id: 'S-1002',
    invoiceNo: 'SM-2026-0002',
    date: '2026-06-02T16:45:00.000Z',
    customerName: 'Royal Supermarket',
    items: [
      { productId: 'P002', name: 'Amul Butter 500g', qty: 10, unit: 'Pcs', purchasePrice: 220, salesPrice: 240, total: 2400 },
      { productId: 'P005', name: 'Colgate Strong Teeth 200g', qty: 5, unit: 'Pcs', purchasePrice: 85, salesPrice: 100, total: 500 }
    ],
    subtotal: 2900,
    discount: 100,
    tax: 427.12,
    total: 2800,
    profit: 275,
    paymentMethod: 'Mixed',
    paymentDetails: { cashAmount: 800, upiAmount: 2000 },
    status: 'completed',
    type: 'wholesale',
    dealerId: 'D001'
  }
];

const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'PUR-1001',
    invoiceNo: 'INV-7789',
    date: '2026-06-01T11:00:00.000Z',
    supplierId: 'S001',
    items: [
      { productId: 'P001', name: 'Britannia Good Day Biscuits 150g', qty: 50, unit: 'Pcs', purchasePrice: 24, total: 1200 },
      { productId: 'P002', name: 'Amul Butter 500g', qty: 20, unit: 'Pcs', purchasePrice: 220, total: 4400 }
    ],
    total: 5600,
    paymentStatus: 'Paid',
    dueAmount: 0
  }
];

const INITIAL_STOCK_HISTORY: StockTransaction[] = [
  { id: 'T001', date: '2026-06-01T11:05:00.000Z', productId: 'P001', productName: 'Britannia Good Day Biscuits 150g', type: 'Purchase', qty: 50, referenceNo: 'INV-7789' },
  { id: 'T002', date: '2026-06-01T11:05:00.000Z', productId: 'P002', productName: 'Amul Butter 500g', type: 'Purchase', qty: 20, referenceNo: 'INV-7789' },
  { id: 'T003', date: '2026-06-02T10:30:00.000Z', productId: 'P001', productName: 'Britannia Good Day Biscuits 150g', type: 'Sale', qty: -2, referenceNo: 'SM-2026-0001' },
  { id: 'T004', date: '2026-06-02T10:30:00.000Z', productId: 'P003', productName: 'Tata Salt 1kg', type: 'Sale', qty: -1, referenceNo: 'SM-2026-0001' },
  { id: 'T005', date: '2026-06-02T16:45:00.000Z', productId: 'P002', productName: 'Amul Butter 500g', type: 'Sale', qty: -10, referenceNo: 'SM-2026-0002' },
  { id: 'T006', date: '2026-06-02T16:45:00.000Z', productId: 'P005', productName: 'Colgate Strong Teeth 200g', type: 'Sale', qty: -5, referenceNo: 'SM-2026-0002' },
];

// DB keys in localStorage
const KEYS = {
  PRODUCTS: 'billing_products',
  DEALERS: 'billing_dealers',
  SUPPLIERS: 'billing_suppliers',
  SALES: 'billing_sales',
  PURCHASES: 'billing_purchases',
  STOCK_HISTORY: 'billing_stock_history',
  SETTINGS: 'billing_settings',
  SUPPLIER_PAYMENTS: 'billing_supplier_payments',
  DEALER_PAYMENTS: 'billing_dealer_payments',
};

// Helper methods to read/write from localStorage
const getFirebasePath = (key: string): string | null => {
  switch (key) {
    case 'billing_products': return 'products';
    case 'billing_dealers': return 'dealers';
    case 'billing_suppliers': return 'suppliers';
    case 'billing_sales': return 'sales';
    case 'billing_purchases': return 'purchases';
    case 'billing_stock_history': return 'stock_history';
    case 'billing_settings': return 'settings';
    case 'billing_supplier_payments': return 'supplier_payments';
    case 'billing_dealer_payments': return 'dealer_payments';
    case 'login_history': return 'login_history';
    case 'app_users': return 'app_users';
    default: return null;
  }
};

const syncToFirebase = (key: string, value: any): void => {
  if (!rtdb) return;
  const path = getFirebasePath(key);
  if (!path) return;
  try {
    const dbRef = ref(rtdb, path);
    set(dbRef, value).catch(err => {
      console.error(`Failed to sync key ${key} to Firebase path ${path}:`, err);
    });
  } catch (err) {
    console.error("Firebase set error:", err);
  }
};

const getJSON = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    return defaultValue;
  }
};

const setJSON = <T>(key: string, value: T, skipSync = false): void => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('local-db-update', { detail: { key } }));
  if (!skipSync) {
    syncToFirebase(key, value);
  }
};

const removeKey = (key: string, skipSync = false): void => {
  localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent('local-db-update', { detail: { key } }));
  if (!skipSync && rtdb) {
    const path = getFirebasePath(key);
    if (path) {
      try {
        const dbRef = ref(rtdb, path);
        set(dbRef, null).catch(err => {
          console.error(`Failed to remove key ${key} from Firebase path ${path}:`, err);
        });
      } catch (err) {
        console.error("Firebase set(null) error:", err);
      }
    }
  }
};

// Database class
export const DB = {
  getJSON: <T>(key: string, defaultValue: T): T => getJSON<T>(key, defaultValue),
  setJSON: <T>(key: string, value: T, skipSync = false): void => setJSON<T>(key, value, skipSync),
  removeKey: (key: string, skipSync = false): void => removeKey(key, skipSync),

  initialize: () => {
    getJSON(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    getJSON(KEYS.DEALERS, INITIAL_DEALERS);
    getJSON(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    getJSON(KEYS.SETTINGS, INITIAL_SETTINGS);
    getJSON(KEYS.SALES, INITIAL_SALES);
    getJSON(KEYS.PURCHASES, INITIAL_PURCHASES);
    getJSON(KEYS.STOCK_HISTORY, INITIAL_STOCK_HISTORY);
    getJSON(KEYS.SUPPLIER_PAYMENTS, []);
    getJSON(KEYS.DEALER_PAYMENTS, []);
  },

  reset: () => {
    removeKey(KEYS.PRODUCTS);
    removeKey(KEYS.DEALERS);
    removeKey(KEYS.SUPPLIERS);
    removeKey(KEYS.SETTINGS);
    removeKey(KEYS.SALES);
    removeKey(KEYS.PURCHASES);
    removeKey(KEYS.STOCK_HISTORY);
    DB.initialize();
  },

  // Products
  getProducts: (): Product[] => {
    const products = getJSON<Product[]>(KEYS.PRODUCTS, []);
    let modified = false;
    products.forEach((p) => {
      if (p.variations && p.variations.length > 0) {
        const sum = p.variations.reduce((s, v) => s + v.currentStock, 0);
        if (p.currentStock !== sum) {
          const diff = p.currentStock - sum;
          p.variations[0].currentStock += diff;
          modified = true;
        }
      }
    });
    if (modified) {
      setJSON(KEYS.PRODUCTS, products, false);
    }
    return products;
  },
  saveProduct: (product: Product): void => {
    const products = DB.getProducts();
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.push(product);
    }
    setJSON(KEYS.PRODUCTS, products);
  },
  deleteProduct: (id: string): void => {
    const products = DB.getProducts();
    setJSON(KEYS.PRODUCTS, products.filter((p) => p.id !== id));
  },

  // Dealers
  getDealers: (): Dealer[] => getJSON<Dealer[]>(KEYS.DEALERS, []),
  saveDealer: (dealer: Dealer): void => {
    const dealers = DB.getDealers();
    const idx = dealers.findIndex((d) => d.id === dealer.id);
    if (idx >= 0) {
      dealers[idx] = dealer;
    } else {
      dealers.push(dealer);
    }
    setJSON(KEYS.DEALERS, dealers);
  },
  updateDealerOutstanding: (dealerId: string, diff: number): void => {
    const dealers = DB.getDealers();
    const idx = dealers.findIndex((d) => d.id === dealerId);
    if (idx >= 0) {
      dealers[idx].outstanding = Math.max(0, dealers[idx].outstanding + diff);
      setJSON(KEYS.DEALERS, dealers);
    }
  },
  updateDealerReminderDate: (dealerId: string, date: string): void => {
    const dealers = DB.getDealers();
    const idx = dealers.findIndex((d) => d.id === dealerId);
    if (idx >= 0) {
      dealers[idx].lastReminderSent = date;
      setJSON(KEYS.DEALERS, dealers);
    }
  },
  getDealerPayments: (): DealerPayment[] => getJSON<DealerPayment[]>(KEYS.DEALER_PAYMENTS, []),
  saveDealerPayment: (payment: DealerPayment): void => {
    const payments = DB.getDealerPayments();
    payments.push(payment);
    setJSON(KEYS.DEALER_PAYMENTS, payments);
  },

  // Suppliers
  getSuppliers: (): Supplier[] => getJSON<Supplier[]>(KEYS.SUPPLIERS, []),
  saveSupplier: (supplier: Supplier): void => {
    const suppliers = DB.getSuppliers();
    const idx = suppliers.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      suppliers[idx] = supplier;
    } else {
      suppliers.push(supplier);
    }
    setJSON(KEYS.SUPPLIERS, suppliers);
  },
  updateSupplierDue: (supplierId: string, diff: number): void => {
    const suppliers = DB.getSuppliers();
    const idx = suppliers.findIndex((s) => s.id === supplierId);
    if (idx >= 0) {
      suppliers[idx].due = Math.max(0, suppliers[idx].due + diff);
      setJSON(KEYS.SUPPLIERS, suppliers);
    }
  },
  getSupplierPayments: (): SupplierPayment[] => getJSON<SupplierPayment[]>(KEYS.SUPPLIER_PAYMENTS, []),
  saveSupplierPayment: (payment: SupplierPayment): void => {
    const payments = DB.getSupplierPayments();
    payments.push(payment);
    setJSON(KEYS.SUPPLIER_PAYMENTS, payments);
  },

  // Sales
  getSales: (): Sale[] => getJSON<Sale[]>(KEYS.SALES, []),
  saveSale: (sale: Sale): void => {
    const sales = DB.getSales();
    const idx = sales.findIndex((s) => s.id === sale.id);
    if (idx >= 0) {
      sales[idx] = sale;
    } else {
      sales.push(sale);
      
      // Stock update and History logging (only if completed and new sale)
      if (sale.status === 'completed') {
        const products = DB.getProducts();
        const history = DB.getStockHistory();
        
        sale.items.forEach((item) => {
          // Adjust stock
          const pIdx = products.findIndex((p) => p.id === item.productId);
          if (pIdx >= 0) {
            products[pIdx].currentStock -= item.qty;
            if (item.variationId && products[pIdx].variations) {
              const vIdx = products[pIdx].variations!.findIndex(v => v.id === item.variationId);
              if (vIdx >= 0) {
                products[pIdx].variations![vIdx].currentStock -= item.qty;
              }
            }
          }
          // Log history
          history.push({
            id: 'T' + Date.now() + Math.random().toString(36).substr(2, 4),
            date: sale.date,
            productId: item.productId,
            productName: item.name,
            type: 'Sale',
            qty: -item.qty,
            referenceNo: sale.invoiceNo
          });
        });
        
        setJSON(KEYS.PRODUCTS, products);
        setJSON(KEYS.STOCK_HISTORY, history);

        // Dealer credit updates
        if (sale.dealerId) {
          const paid = (sale.paymentMethod === 'Credit') ? 0 :
                       ((sale.paymentDetails.cashAmount || 0) + 
                        (sale.paymentDetails.upiAmount || 0) + 
                        (sale.paymentDetails.cardAmount || 0));
          const outstanding = sale.total - paid;
          if (outstanding > 0) {
            DB.updateDealerOutstanding(sale.dealerId, outstanding);
          }
        }
      }
    }
    setJSON(KEYS.SALES, sales);
  },

  // Purchases
  getPurchases: (): Purchase[] => getJSON<Purchase[]>(KEYS.PURCHASES, []),
  savePurchase: (purchase: Purchase): void => {
    const purchases = DB.getPurchases();
    purchases.push(purchase);
    setJSON(KEYS.PURCHASES, purchases);

    // Update stock and history
    const products = DB.getProducts();
    const history = DB.getStockHistory();

    purchase.items.forEach((item) => {
      const pIdx = products.findIndex((p) => p.id === item.productId);
      if (pIdx >= 0) {
        products[pIdx].currentStock += item.qty;
        products[pIdx].purchasePrice = item.purchasePrice; // update purchase price
        if (item.variationId && products[pIdx].variations) {
          const vIdx = products[pIdx].variations!.findIndex(v => v.id === item.variationId);
          if (vIdx >= 0) {
            products[pIdx].variations![vIdx].currentStock += item.qty;
            products[pIdx].variations![vIdx].purchasePrice = item.purchasePrice;
          }
        }
      }
      history.push({
        id: 'T' + Date.now() + Math.random().toString(36).substr(2, 4),
        date: purchase.date,
        productId: item.productId,
        productName: item.name,
        type: 'Purchase',
        qty: item.qty,
        referenceNo: purchase.invoiceNo
      });
    });

    setJSON(KEYS.PRODUCTS, products);
    setJSON(KEYS.STOCK_HISTORY, history);

    // Update supplier due
    if (purchase.paymentStatus === 'Due' && purchase.dueAmount > 0) {
      DB.updateSupplierDue(purchase.supplierId, purchase.dueAmount);
    }
  },

  // Stock History
  getStockHistory: (): StockTransaction[] => getJSON<StockTransaction[]>(KEYS.STOCK_HISTORY, []),
  adjustStock: (productId: string, qty: number, direction: 'Add' | 'Sub', reason: string, variationId?: string): void => {
    const products = DB.getProducts();
    const history = DB.getStockHistory();
    const pIdx = products.findIndex((p) => p.id === productId);

    if (pIdx >= 0) {
      const adjustmentQty = direction === 'Add' ? qty : -qty;
      products[pIdx].currentStock += adjustmentQty;

      let variationMark = '';
      if (variationId && products[pIdx].variations) {
        const vIdx = products[pIdx].variations!.findIndex(v => v.id === variationId);
        if (vIdx >= 0) {
          products[pIdx].variations![vIdx].currentStock += adjustmentQty;
          variationMark = ` (${products[pIdx].variations![vIdx].mark})`;
        }
      }

      setJSON(KEYS.PRODUCTS, products);

      history.push({
        id: 'T' + Date.now() + Math.random().toString(36).substr(2, 4),
        date: new Date().toISOString(),
        productId: productId,
        productName: products[pIdx].name + variationMark,
        type: direction === 'Add' ? 'Adjustment (Add)' : 'Adjustment (Sub)',
        qty: adjustmentQty,
        referenceNo: 'ADJ-' + Date.now().toString().slice(-4),
        reason: reason
      });
      setJSON(KEYS.STOCK_HISTORY, history);
    }
  },

  // Settings
  getSettings: (): Settings => getJSON<Settings>(KEYS.SETTINGS, INITIAL_SETTINGS),
  saveSettings: (settings: Settings): void => {
    setJSON(KEYS.SETTINGS, settings);
  },

  // Backup & Restore
  exportDatabase: (): string => {
    const data = {
      products: DB.getProducts(),
      dealers: DB.getDealers(),
      suppliers: DB.getSuppliers(),
      sales: DB.getSales(),
      purchases: DB.getPurchases(),
      stockHistory: DB.getStockHistory(),
      settings: DB.getSettings()
    };
    return JSON.stringify(data, null, 2);
  },

  importDatabase: (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.products && data.settings) {
        setJSON(KEYS.PRODUCTS, data.products);
        if (data.dealers) setJSON(KEYS.DEALERS, data.dealers);
        if (data.suppliers) setJSON(KEYS.SUPPLIERS, data.suppliers);
        if (data.sales) setJSON(KEYS.SALES, data.sales);
        if (data.purchases) setJSON(KEYS.PURCHASES, data.purchases);
        if (data.stock_history) setJSON(KEYS.STOCK_HISTORY, data.stock_history);
        if (data.stockHistory) setJSON(KEYS.STOCK_HISTORY, data.stockHistory); // handle both cases
        setJSON(KEYS.SETTINGS, data.settings);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  createAutoBackup: async (email: string, action: 'login' | 'logout'): Promise<void> => {
    try {
      const databaseData = {
        products: DB.getProducts(),
        dealers: DB.getDealers(),
        suppliers: DB.getSuppliers(),
        sales: DB.getSales(),
        purchases: DB.getPurchases(),
        stockHistory: DB.getStockHistory(),
        settings: DB.getSettings()
      };

      const timestamp = new Date().toISOString();

      // Save to localStorage for easy retrieval
      localStorage.setItem('billing_last_auto_backup', JSON.stringify({
        timestamp,
        email,
        action,
        data: databaseData
      }));

      // Auto-download to local device as a JSON file
      try {
        const dataStr = JSON.stringify(databaseData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const sanitizedEmail = email.split('@')[0] || 'user';
        const dateStr = timestamp.slice(0, 10);
        const timeStr = timestamp.slice(11, 19).replace(/:/g, '-');
        const fileName = `WOLSales_Backup_${dateStr}_${timeStr}_${sanitizedEmail}_${action}.json`;
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`Auto backup downloaded locally as ${fileName}`);
      } catch (downloadErr) {
        console.error("Local file download failed:", downloadErr);
      }

      // Also upload to Firebase Realtime Database if connected
      if (rtdb) {
        const sanitizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const tsPath = timestamp.replace(/[:.]/g, '-');
        const backupRef = ref(rtdb, `backups/${tsPath}_${sanitizedEmail}_${action}`);
        await set(backupRef, databaseData);
        console.log(`Auto backup saved to Firebase under backups/${tsPath}_${sanitizedEmail}_${action}`);
      }
    } catch (e) {
      console.error("Auto backup failed:", e);
    }
  }
};
