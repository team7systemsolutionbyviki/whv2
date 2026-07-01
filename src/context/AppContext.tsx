import React, { createContext, useContext, useState, useEffect } from 'react';
import { DB, Product, Sale, Purchase, Dealer, Supplier, Settings, StockTransaction, SaleItem, ProductVariation, SupplierPayment, DealerPayment, PattiRecord, Expense } from '../utils/db';
import { rtdb, isMockMode } from '../utils/firebase';
import { ref, onValue } from 'firebase/database';

export type ActiveTab = 'products' | 'pos' | 'wholesale' | 'purchases' | 'purchase_commission_goods' | 'inventory' | 'reports' | 'settings' | 'profit_adder' | 'customers' | 'patti' | 'expenses';

export interface CartItem {
  product: Product;
  qty: number;
  customPrice?: number; // for wholesale custom prices or overrides
  customUnit?: string; // for custom/modified cart item units
  variation?: ProductVariation;
  customWeight?: number; // for custom weight overrides in KG
  bags?: number; // manually inputted number of bags
  lotNo?: string;
  commissionPurchaseId?: string;
}

export interface HeldCart {
  id: string;
  date: string;
  customerName: string;
  items: CartItem[];
  type: 'retail' | 'wholesale';
  dealerId?: string;
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

interface AppContextType {
  // Navigation & UI
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  
  // Database States
  products: Product[];
  dealers: Dealer[];
  suppliers: Supplier[];
  supplierPayments: SupplierPayment[];
  dealerPayments: DealerPayment[];
  sales: Sale[];
  purchases: Purchase[];
  stockHistory: StockTransaction[];
  settings: Settings;
  pattis: PattiRecord[];
  expenses: Expense[];
  refreshData: () => void;
  
  // POS Carts
  retailCart: CartItem[];
  addToRetailCart: (product: Product, qty?: number, variation?: ProductVariation, lotNo?: string, commissionPurchaseId?: string) => void;
  removeFromRetailCart: (productId: string, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => void;
  updateRetailQty: (productId: string, qty: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => void;
  updateRetailPrice: (productId: string, price: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => void;
  updateRetailUnit: (productId: string, unit: string, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => void;
  updateRetailWeight: (productId: string, weight: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => void;
  updateRetailBags: (productId: string, bags: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => void;
  clearRetailCart: () => void;
  retailDiscount: number; // flat discount
  setRetailDiscount: (disc: number) => void;
  retailOthersCharge: number;
  setRetailOthersCharge: (charge: number) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  
  // Wholesale Cart
  wholesaleCart: CartItem[];
  selectedDealerId: string;
  setSelectedDealerId: (id: string) => void;
  addToWholesaleCart: (product: Product, qty?: number, variation?: ProductVariation) => void;
  removeFromWholesaleCart: (productId: string, variationId?: string) => void;
  updateWholesaleQty: (productId: string, qty: number, variationId?: string) => void;
  updateWholesalePrice: (productId: string, price: number, variationId?: string) => void;
  updateWholesaleUnit: (productId: string, unit: string, variationId?: string) => void;
  updateWholesaleWeight: (productId: string, weight: number, variationId?: string) => void;
  updateWholesaleBags: (productId: string, bags: number, variationId?: string) => void;
  clearWholesaleCart: () => void;
  wholesaleDiscount: number;
  setWholesaleDiscount: (disc: number) => void;

  // Held Bills
  heldCarts: HeldCart[];
  holdCurrentCart: (type: 'retail' | 'wholesale') => void;
  recallCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;

  // Alerts & Notifications
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  removeToast: (id: string) => void;

  // Categories Management
  categories: string[];
  addCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [darkMode, setDarkModeState] = useState<boolean>(true);

  // Database
  const [products, setProducts] = useState<Product[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [dealerPayments, setDealerPayments] = useState<DealerPayment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stockHistory, setStockHistory] = useState<StockTransaction[]>([]);
  const [settings, setSettings] = useState<Settings>({} as Settings);
  const [pattis, setPattis] = useState<PattiRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Cart & Customers
  const [retailCart, setRetailCart] = useState<CartItem[]>([]);
  const [retailDiscount, setRetailDiscount] = useState<number>(0);
  const [retailOthersCharge, setRetailOthersCharge] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('Walking Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  const [wholesaleCart, setWholesaleCart] = useState<CartItem[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [wholesaleDiscount, setWholesaleDiscount] = useState<number>(0);

  // Held Carts
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initialize DB and load data, and set up Realtime DB sync
  useEffect(() => {
    DB.initialize();
    refreshData();

    let unsubscribes: (() => void)[] = [];

    if (!isMockMode && rtdb) {
      const keysToListen = [
        { key: 'billing_products', path: 'products', defaultValue: [] },
        { key: 'billing_dealers', path: 'dealers', defaultValue: [] },
        { key: 'billing_suppliers', path: 'suppliers', defaultValue: [] },
        { key: 'billing_sales', path: 'sales', defaultValue: [] },
        { key: 'billing_purchases', path: 'purchases', defaultValue: [] },
        { key: 'billing_stock_history', path: 'stock_history', defaultValue: [] },
        { key: 'billing_settings', path: 'settings', defaultValue: null },
        { key: 'billing_supplier_payments', path: 'supplier_payments', defaultValue: [] },
        { key: 'login_history', path: 'login_history', defaultValue: [] },
        { key: 'app_users', path: 'app_users', defaultValue: [] },
        { key: 'billing_expenses', path: 'expenses', defaultValue: [] },
        { key: 'billing_dealer_payments', path: 'dealer_payments', defaultValue: [] },
        { key: 'billing_pattis', path: 'pattis', defaultValue: [] },
        { key: 'billing_commission_purchases', path: 'commission_purchases', defaultValue: [] },
        { key: 'billing_categories', path: 'categories', defaultValue: ['Groceries', 'Dairy', 'FMCG', 'Personal Care', 'Household', 'Snacks', 'Beverages'] },
      ];

      keysToListen.forEach(({ key, path, defaultValue }) => {
        const dbRef = ref(rtdb, path);
        const unsub = onValue(dbRef, (snapshot) => {
          const val = snapshot.val();
          if (val === null) {
            // Firebase is empty. Try to upload local data if available.
            const localDataStr = localStorage.getItem(key);
            if (localDataStr) {
              try {
                const localVal = JSON.parse(localDataStr);
                if (localVal && (Array.isArray(localVal) ? localVal.length > 0 : Object.keys(localVal).length > 0)) {
                  DB.setJSON(key, localVal, false); // Upload to Firebase
                  return;
                }
              } catch (e) {
                console.error(`Error seeding ${key} to Firebase:`, e);
              }
            }
            // Seed local with default if nothing exists either
            if (defaultValue !== null) {
              DB.setJSON(key, defaultValue, true);
            }
          } else {
            const localDataStr = localStorage.getItem(key);
            const remoteStr = JSON.stringify(val);
            if (localDataStr !== remoteStr) {
              DB.setJSON(key, val, true); // Write locally only
            }
          }
        }, (error) => {
          console.error(`Firebase read error for path ${path}:`, error);
        });
        unsubscribes.push(unsub);
      });
    }

    // Check light/dark preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkModeState(false);
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isMockMode]);

  // Listen to local-db-update custom event to refresh application data
  useEffect(() => {
    const handleDbUpdate = () => {
      refreshData();
    };

    window.addEventListener('local-db-update', handleDbUpdate);
    return () => {
      window.removeEventListener('local-db-update', handleDbUpdate);
    };
  }, []);

  // Keep retailCart and wholesaleCart synchronized with database updates (prices, stock, units)
  useEffect(() => {
    setRetailCart((prevCart) => {
      let changed = false;
      const newCart = prevCart.map((item) => {
        const dbProduct = products.find((p) => p.id === item.product.id);
        if (!dbProduct) return item;

        let dbVariation: ProductVariation | undefined;
        if (item.variation && dbProduct.variations) {
          dbVariation = dbProduct.variations.find((v) => v.id === item.variation!.id);
        }

        const productChanged = JSON.stringify(item.product) !== JSON.stringify(dbProduct);
        const variationChanged = JSON.stringify(item.variation) !== JSON.stringify(dbVariation);

        if (productChanged || variationChanged) {
          changed = true;
          return {
            ...item,
            product: dbProduct,
            variation: dbVariation,
          };
        }
        return item;
      });
      return changed ? newCart : prevCart;
    });

    setWholesaleCart((prevCart) => {
      let changed = false;
      const newCart = prevCart.map((item) => {
        const dbProduct = products.find((p) => p.id === item.product.id);
        if (!dbProduct) return item;

        let dbVariation: ProductVariation | undefined;
        if (item.variation && dbProduct.variations) {
          dbVariation = dbProduct.variations.find((v) => v.id === item.variation!.id);
        }

        const productChanged = JSON.stringify(item.product) !== JSON.stringify(dbProduct);
        const variationChanged = JSON.stringify(item.variation) !== JSON.stringify(dbVariation);

        if (productChanged || variationChanged) {
          changed = true;
          return {
            ...item,
            product: dbProduct,
            variation: dbVariation,
          };
        }
        return item;
      });
      return changed ? newCart : prevCart;
    });
  }, [products]);

  const refreshData = () => {
    setProducts(DB.getProducts());
    setDealers(DB.getDealers());
    setSuppliers(DB.getSuppliers());
    setSupplierPayments(DB.getSupplierPayments());
    setDealerPayments(DB.getDealerPayments());
    setSales(DB.getSales());
    setPurchases(DB.getPurchases());
    setStockHistory(DB.getStockHistory());
    setSettings(DB.getSettings());
    setPattis(DB.getPattis());
    setExpenses(DB.getExpenses());
    setCategories(DB.getCategories());
  };

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
    if (dark) {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const showToast = (text: string, type: 'success' | 'warning' | 'danger' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // RETAIL CART LOGIC
  const addToRetailCart = (product: Product, qty = 1, variation?: ProductVariation, lotNo?: string, commissionPurchaseId?: string) => {
    let addedSuccessfully = true;
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => 
        item.product.id === product.id && 
        item.variation?.id === variation?.id &&
        item.lotNo === lotNo &&
        item.commissionPurchaseId === commissionPurchaseId
      );
      const stockLimit = variation ? variation.currentStock : product.currentStock;

      if (commissionPurchaseId) {
        // Commission lot: stockLimit is remainingBags (in bags)
        if (idx >= 0) {
          const currentBags = prev[idx].bags || 0;
          const newBags = currentBags + 1;
          if (newBags > stockLimit) {
            showToast(`Error: Cannot exceed available stock (${stockLimit} bags)`, 'danger');
            const updated = [...prev];
            const item = updated[idx];
            item.bags = stockLimit;
            const avgWeight = currentBags > 0 ? (item.qty / currentBags) : 1;
            item.qty = Number((stockLimit * avgWeight).toFixed(3));
            if (item.customWeight !== undefined) {
              item.customWeight = item.qty;
            }
            return updated;
          }
          const updated = [...prev];
          const item = updated[idx];
          item.bags = newBags;
          const avgWeight = currentBags > 0 ? (item.qty / currentBags) : 1;
          item.qty = Number((newBags * avgWeight).toFixed(3));
          if (item.customWeight !== undefined) {
            item.customWeight = item.qty;
          }
          return updated;
        }
        if (stockLimit <= 0) {
          showToast(`Error: Lot is out of stock!`, 'danger');
          addedSuccessfully = false;
          return prev;
        }
        return [...prev, { product, qty, variation, customUnit: variation?.unit, lotNo, commissionPurchaseId, bags: 1 }];
      }

      // Standard product
      if (idx >= 0) {
        const newQty = prev[idx].qty + qty;
        if (newQty > stockLimit) {
          showToast(`Error: Cannot exceed available stock (${stockLimit})`, 'danger');
          const updated = [...prev];
          updated[idx].qty = stockLimit;
          return updated;
        }
        const updated = [...prev];
        updated[idx].qty = newQty;
        return updated;
      }
      if (stockLimit <= 0) {
        showToast(`Error: Product "${product.name}" is out of stock!`, 'danger');
        addedSuccessfully = false;
        return prev;
      }
      const addedQty = Math.min(qty, stockLimit);
      return [...prev, { product, qty: addedQty, variation, customUnit: variation?.unit, lotNo, commissionPurchaseId }];
    });
    
    if (addedSuccessfully) {
      const displayName = variation ? `${product.name} (${variation.mark})` : product.name;
      showToast(`${displayName} added to cart`, 'success');
    }
  };

  const removeFromRetailCart = (productId: string, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => {
    setRetailCart((prev) => prev.filter((item) => !(item.product.id === productId && item.variation?.id === variationId && item.lotNo === lotNo && item.commissionPurchaseId === commissionPurchaseId)));
  };

  const updateRetailQty = (productId: string, qty: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => {
    if (qty < 0) return;
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId && item.lotNo === lotNo && item.commissionPurchaseId === commissionPurchaseId);
      if (idx >= 0) {
        const updated = [...prev];
        const item = updated[idx];
        if (commissionPurchaseId) {
          // Commission lot: do not clamp qty (weight) strictly to stockLimit (bags)
          item.qty = qty;
          item.customWeight = undefined; // clear weight override on manual qty edit
          return updated;
        }

        // Standard product
        const prod = item.product;
        const stockLimit = item.variation ? item.variation!.currentStock : prod.currentStock;
        let finalQty = qty;
        if (qty > stockLimit) {
          showToast(`Error: Limited to available stock count of ${stockLimit}`, 'danger');
          finalQty = stockLimit;
        }
        item.qty = finalQty;
        item.customWeight = undefined; // clear weight override on manual qty edit
        return updated;
      }
      return prev;
    });
  };

  const updateRetailWeight = (productId: string, weight: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => {
    if (weight < 0) return;
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId && item.lotNo === lotNo && item.commissionPurchaseId === commissionPurchaseId);
      if (idx >= 0) {
        const updated = [...prev];
        const item = updated[idx];
        item.customWeight = weight;
        
        const unit = (item.customUnit || item.variation?.unit || item.product.unit || '').toLowerCase().trim();
        let unitWeight = 0;
        if (unit === 'kg') {
          unitWeight = 1;
        } else if (unit === 'gram' || unit === 'g' || unit === 'gm') {
          unitWeight = 0.001;
        } else {
          const nameToSearch = `${item.product.name} ${item.variation?.mark || ''}`.toLowerCase();
          const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|l|litre|litres|ml)\b/i;
          const match = nameToSearch.match(weightRegex);
          if (match) {
            const value = parseFloat(match[1]);
            const parsedUnit = match[2].toLowerCase();
            if (parsedUnit === 'kg' || parsedUnit === 'l' || parsedUnit === 'litre' || parsedUnit.startsWith('litre')) {
              unitWeight = value;
            } else {
              unitWeight = value / 1000;
            }
          }
        }
        
        if (unitWeight > 0) {
          let newQty = Number((weight / unitWeight).toFixed(3));
          
          if (commissionPurchaseId) {
            // Commission lot: do not clamp qty to stockLimit (bags)
            item.qty = newQty;
            return updated;
          }

          // Standard product
          const prod = item.product;
          const stockLimit = item.variation ? item.variation.currentStock : prod.currentStock;
          if (newQty > stockLimit) {
            showToast(`Error: Calculated quantity (${newQty}) exceeds stock count of ${stockLimit}. Clamped to stock count.`, 'danger');
            newQty = stockLimit;
            item.customWeight = Number((stockLimit * unitWeight).toFixed(3));
          }
          item.qty = newQty;
        }
        
        return updated;
      }
      return prev;
    });
  };

  const updateRetailBags = (productId: string, bags: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => {
    if (bags < 0) return;
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId && item.lotNo === lotNo && item.commissionPurchaseId === commissionPurchaseId);
      if (idx >= 0) {
        const updated = [...prev];
        const item = updated[idx];
        
        const prod = item.product;
        const stockLimit = item.variation ? item.variation.currentStock : prod.currentStock;
        
        let finalBags = bags;
        if (commissionPurchaseId) {
          // Commission lot: clamp bags to stockLimit (remainingBags)
          if (bags > stockLimit) {
            showToast(`Error: Cannot exceed available stock (${stockLimit} bags)`, 'danger');
            finalBags = stockLimit;
          }
        }
        
        item.bags = finalBags;
        
        const unit = (item.customUnit || item.variation?.unit || item.product.unit || '').toLowerCase().trim();
        let unitWeight = 0;
        if (unit === 'kg') {
          unitWeight = 1;
        } else if (unit === 'gram' || unit === 'g' || unit === 'gm') {
          unitWeight = 0.001;
        } else {
          const nameToSearch = `${item.product.name} ${item.variation?.mark || ''}`.toLowerCase();
          const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|l|litre|litres|ml)\b/i;
          const match = nameToSearch.match(weightRegex);
          if (match) {
            const value = parseFloat(match[1]);
            const parsedUnit = match[2].toLowerCase();
            if (parsedUnit === 'kg' || parsedUnit === 'l' || parsedUnit === 'litre' || parsedUnit.startsWith('litre')) {
              unitWeight = value;
            } else {
              unitWeight = value / 1000;
            }
          }
        }
        
        if (unitWeight > 0) {
          const calculatedWeight = finalBags * unitWeight;
          let newQty = Number((calculatedWeight / unitWeight).toFixed(3));
          
          if (commissionPurchaseId) {
            // Commission lot: do not clamp qty based on stockLimit (bags)
            item.customWeight = calculatedWeight;
            item.qty = newQty;
            return updated;
          }

          // Standard product
          if (newQty > stockLimit) {
            showToast(`Error: Calculated quantity (${newQty}) exceeds stock count of ${stockLimit}. Clamped to stock count.`, 'danger');
            newQty = stockLimit;
            item.bags = Math.floor(stockLimit / unitWeight);
            item.customWeight = Number((item.bags * unitWeight).toFixed(3));
          } else {
            item.customWeight = calculatedWeight;
          }
          item.qty = newQty;
        }
        
        return updated;
      }
      return prev;
    });
  };

  const updateRetailPrice = (productId: string, price: number, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => {
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId && item.lotNo === lotNo && item.commissionPurchaseId === commissionPurchaseId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].customPrice = price;
        return updated;
      }
      return prev;
    });
  };

  const updateRetailUnit = (productId: string, unit: string, variationId?: string, lotNo?: string, commissionPurchaseId?: string) => {
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId && item.lotNo === lotNo && item.commissionPurchaseId === commissionPurchaseId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].customUnit = unit;
        return updated;
      }
      return prev;
    });
  };

  const clearRetailCart = () => {
    setRetailCart([]);
    setRetailDiscount(0);
    setRetailOthersCharge(0);
    setCustomerName('Walking Customer');
    setCustomerPhone('');
  };

  // WHOLESALE CART LOGIC
  const addToWholesaleCart = (product: Product, qty = 1, variation?: ProductVariation) => {
    let addedSuccessfully = true;
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id && item.variation?.id === variation?.id);
      const stockLimit = variation ? variation.currentStock : product.currentStock;

      if (idx >= 0) {
        const newQty = prev[idx].qty + qty;
        if (newQty > stockLimit) {
          showToast(`Error: Cannot exceed available stock (${stockLimit})`, 'danger');
          const updated = [...prev];
          updated[idx].qty = stockLimit;
          return updated;
        }
        const updated = [...prev];
        updated[idx].qty = newQty;
        return updated;
      }
      if (stockLimit <= 0) {
        showToast(`Error: Product "${product.name}" is out of stock!`, 'danger');
        addedSuccessfully = false;
        return prev;
      }
      const addedQty = Math.min(qty, stockLimit);
      return [...prev, { product, qty: addedQty, variation, customUnit: variation?.unit }];
    });
    
    if (addedSuccessfully) {
      const displayName = variation ? `${product.name} (${variation.mark})` : product.name;
      showToast(`${displayName} added to wholesale cart`, 'success');
    }
  };

  const removeFromWholesaleCart = (productId: string, variationId?: string) => {
    setWholesaleCart((prev) => prev.filter((item) => !(item.product.id === productId && item.variation?.id === variationId)));
  };

  const updateWholesaleQty = (productId: string, qty: number, variationId?: string) => {
    if (qty < 0) return;
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const prod = prev[idx].product;
        const stockLimit = prev[idx].variation ? prev[idx].variation!.currentStock : prod.currentStock;
        let finalQty = qty;
        if (qty > stockLimit) {
          showToast(`Error: Limited to available stock count of ${stockLimit}`, 'danger');
          finalQty = stockLimit;
        }
        const updated = [...prev];
        updated[idx].qty = finalQty;
        updated[idx].customWeight = undefined; // clear override on manual qty edit
        return updated;
      }
      return prev;
    });
  };

  const updateWholesaleWeight = (productId: string, weight: number, variationId?: string) => {
    if (weight < 0) return;
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const updated = [...prev];
        const item = updated[idx];
        item.customWeight = weight;
        
        const unit = (item.customUnit || item.variation?.unit || item.product.unit || '').toLowerCase().trim();
        let unitWeight = 0;
        if (unit === 'kg') {
          unitWeight = 1;
        } else if (unit === 'gram' || unit === 'g' || unit === 'gm') {
          unitWeight = 0.001;
        } else {
          const nameToSearch = `${item.product.name} ${item.variation?.mark || ''}`.toLowerCase();
          const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|l|litre|litres|ml)\b/i;
          const match = nameToSearch.match(weightRegex);
          if (match) {
            const value = parseFloat(match[1]);
            const parsedUnit = match[2].toLowerCase();
            if (parsedUnit === 'kg' || parsedUnit === 'l' || parsedUnit === 'litre' || parsedUnit.startsWith('litre')) {
              unitWeight = value;
            } else {
              unitWeight = value / 1000;
            }
          }
        }
        
        if (unitWeight > 0) {
          let newQty = Number((weight / unitWeight).toFixed(3));
          const prod = item.product;
          const stockLimit = item.variation ? item.variation.currentStock : prod.currentStock;
          if (newQty > stockLimit) {
            showToast(`Error: Calculated quantity (${newQty}) exceeds stock count of ${stockLimit}. Clamped to stock count.`, 'danger');
            newQty = stockLimit;
            item.customWeight = Number((stockLimit * unitWeight).toFixed(3));
          }
          item.qty = newQty;
        }
        
        return updated;
      }
      return prev;
    });
  };

  const updateWholesaleBags = (productId: string, bags: number, variationId?: string) => {
    if (bags < 0) return;
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const updated = [...prev];
        const item = updated[idx];
        item.bags = bags;
        
        const unit = (item.customUnit || item.variation?.unit || item.product.unit || '').toLowerCase().trim();
        let unitWeight = 0;
        if (unit === 'kg') {
          unitWeight = 1;
        } else if (unit === 'gram' || unit === 'g' || unit === 'gm') {
          unitWeight = 0.001;
        } else {
          const nameToSearch = `${item.product.name} ${item.variation?.mark || ''}`.toLowerCase();
          const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|l|litre|litres|ml)\b/i;
          const match = nameToSearch.match(weightRegex);
          if (match) {
            const value = parseFloat(match[1]);
            const parsedUnit = match[2].toLowerCase();
            if (parsedUnit === 'kg' || parsedUnit === 'l' || parsedUnit === 'litre' || parsedUnit.startsWith('litre')) {
              unitWeight = value;
            } else {
              unitWeight = value / 1000;
            }
          }
        }
        
        if (unitWeight > 0) {
          const calculatedWeight = bags * unitWeight;
          let newQty = Number((calculatedWeight / unitWeight).toFixed(3));
          const prod = item.product;
          const stockLimit = item.variation ? item.variation.currentStock : prod.currentStock;
          if (newQty > stockLimit) {
            showToast(`Error: Calculated quantity (${newQty}) exceeds stock count of ${stockLimit}. Clamped to stock count.`, 'danger');
            newQty = stockLimit;
            item.bags = Math.floor(stockLimit / unitWeight);
            item.customWeight = Number((item.bags * unitWeight).toFixed(3));
          } else {
            item.customWeight = calculatedWeight;
          }
          item.qty = newQty;
        }
        
        return updated;
      }
      return prev;
    });
  };

  const updateWholesalePrice = (productId: string, price: number, variationId?: string) => {
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].customPrice = price;
        return updated;
      }
      return prev;
    });
  };

  const updateWholesaleUnit = (productId: string, unit: string, variationId?: string) => {
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].customUnit = unit;
        return updated;
      }
      return prev;
    });
  };

  const clearWholesaleCart = () => {
    setWholesaleCart([]);
    setWholesaleDiscount(0);
    setSelectedDealerId('');
  };

  // HELD CART LOGIC
  const holdCurrentCart = (type: 'retail' | 'wholesale') => {
    const items = type === 'retail' ? retailCart : wholesaleCart;
    if (items.length === 0) {
      showToast('Cannot hold an empty cart!', 'warning');
      return;
    }

    const name = type === 'retail' ? customerName : dealers.find((d) => d.id === selectedDealerId)?.name || 'Dealer';
    const newHold: HeldCart = {
      id: 'HOLD-' + Date.now().toString().slice(-6),
      date: new Date().toISOString(),
      customerName: name,
      items: [...items],
      type,
      dealerId: type === 'wholesale' ? selectedDealerId : undefined
    };

    setHeldCarts((prev) => [...prev, newHold]);
    
    if (type === 'retail') {
      clearRetailCart();
    } else {
      clearWholesaleCart();
    }
    showToast(`Bill placed on Hold (${newHold.id})`, 'info');
  };

  const recallCart = (id: string) => {
    const target = heldCarts.find((c) => c.id === id);
    if (!target) return;

    if (target.type === 'retail') {
      setRetailCart(target.items);
      setCustomerName(target.customerName);
      setActiveTab('pos');
    } else {
      setWholesaleCart(target.items);
      if (target.dealerId) setSelectedDealerId(target.dealerId);
      setActiveTab('wholesale');
    }

    setHeldCarts((prev) => prev.filter((c) => c.id !== id));
    showToast(`Recalled Held Bill ${id}`, 'success');
  };

  const deleteHeldCart = (id: string) => {
    setHeldCarts((prev) => prev.filter((c) => c.id !== id));
    showToast(`Deleted Held Bill ${id}`, 'danger');
  };

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast('Category already exists', 'warning');
      return;
    }
    const updatedCats = [...categories, trimmed].sort();
    setCategories(updatedCats);
    DB.saveCategories(updatedCats);
    showToast(`Category "${trimmed}" added`, 'success');
  };

  const renameCategory = (oldName: string, newName: string) => {
    const oldTrimmed = oldName.trim();
    const newTrimmed = newName.trim();
    if (!newTrimmed || oldTrimmed === newTrimmed) return;
    
    // 1. Update categories list
    const updatedCats = categories.map(c => c === oldTrimmed ? newTrimmed : c);
    setCategories(updatedCats);
    DB.saveCategories(updatedCats);
    
    // 2. Update all products using old category name
    const updatedProducts = products.map(p => {
      if (p.category === oldTrimmed) {
        return { ...p, category: newTrimmed };
      }
      return p;
    });
    setProducts(updatedProducts);
    DB.setJSON('billing_products', updatedProducts);
    
    showToast(`Category "${oldTrimmed}" renamed to "${newTrimmed}". Updated products.`, 'success');
  };

  const deleteCategory = (name: string) => {
    const trimmed = name.trim();
    
    // 1. Remove from categories list
    const updatedCats = categories.filter(c => c !== trimmed);
    setCategories(updatedCats);
    DB.saveCategories(updatedCats);
    
    // 2. Update products using this category (reset to 'Groceries' or first available category)
    const fallbackCategory = updatedCats[0] || 'Groceries';
    const updatedProducts = products.map(p => {
      if (p.category === trimmed) {
        return { ...p, category: fallbackCategory };
      }
      return p;
    });
    setProducts(updatedProducts);
    DB.setJSON('billing_products', updatedProducts);
    
    showToast(`Category "${trimmed}" deleted. Products moved to "${fallbackCategory}".`, 'info');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        darkMode,
        setDarkMode,
        products,
        dealers,
        suppliers,
        supplierPayments,
        dealerPayments,
        sales,
        purchases,
        stockHistory,
        settings,
        pattis,
        refreshData,
        
        retailCart,
        addToRetailCart,
        removeFromRetailCart,
        updateRetailQty,
        updateRetailPrice,
        updateRetailUnit,
        updateRetailWeight,
        updateRetailBags,
        clearRetailCart,
        retailDiscount,
        setRetailDiscount,
        retailOthersCharge,
        setRetailOthersCharge,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        
        wholesaleCart,
        selectedDealerId,
        setSelectedDealerId,
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

        heldCarts,
        holdCurrentCart,
        recallCart,
        deleteHeldCart,

        toasts,
        showToast,
        removeToast,
        expenses,

        categories,
        addCategory,
        renameCategory,
        deleteCategory
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
