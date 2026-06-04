import React, { createContext, useContext, useState, useEffect } from 'react';
import { DB, Product, Sale, Purchase, Dealer, Supplier, Settings, StockTransaction, SaleItem, ProductVariation } from '../utils/db';
import { rtdb, isMockMode } from '../utils/firebase';
import { ref, onValue } from 'firebase/database';

export type ActiveTab = 'dashboard' | 'products' | 'pos' | 'wholesale' | 'purchases' | 'inventory' | 'reports' | 'settings' | 'profit_adder';

export interface CartItem {
  product: Product;
  qty: number;
  customPrice?: number; // for wholesale custom prices or overrides
  customUnit?: string; // for custom/modified cart item units
  variation?: ProductVariation;
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
  sales: Sale[];
  purchases: Purchase[];
  stockHistory: StockTransaction[];
  settings: Settings;
  refreshData: () => void;
  
  // POS Carts
  retailCart: CartItem[];
  addToRetailCart: (product: Product, qty?: number, variation?: ProductVariation) => void;
  removeFromRetailCart: (productId: string, variationId?: string) => void;
  updateRetailQty: (productId: string, qty: number, variationId?: string) => void;
  updateRetailPrice: (productId: string, price: number, variationId?: string) => void;
  updateRetailUnit: (productId: string, unit: string, variationId?: string) => void;
  clearRetailCart: () => void;
  retailDiscount: number; // flat discount
  setRetailDiscount: (disc: number) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [darkMode, setDarkModeState] = useState<boolean>(true);

  // Database
  const [products, setProducts] = useState<Product[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stockHistory, setStockHistory] = useState<StockTransaction[]>([]);
  const [settings, setSettings] = useState<Settings>({} as Settings);

  // Cart & Customers
  const [retailCart, setRetailCart] = useState<CartItem[]>([]);
  const [retailDiscount, setRetailDiscount] = useState<number>(0);
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
        { key: 'login_history', path: 'login_history', defaultValue: [] },
        { key: 'app_users', path: 'app_users', defaultValue: [] },
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

  const refreshData = () => {
    setProducts(DB.getProducts());
    setDealers(DB.getDealers());
    setSuppliers(DB.getSuppliers());
    setSales(DB.getSales());
    setPurchases(DB.getPurchases());
    setStockHistory(DB.getStockHistory());
    setSettings(DB.getSettings());
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
  const addToRetailCart = (product: Product, qty = 1, variation?: ProductVariation) => {
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id && item.variation?.id === variation?.id);
      const stockLimit = variation ? variation.currentStock : product.currentStock;

      if (idx >= 0) {
        const newQty = prev[idx].qty + qty;
        if (newQty > stockLimit) {
          showToast(`Warning: Added quantity exceeds current stock (${stockLimit})`, 'warning');
        }
        const updated = [...prev];
        updated[idx].qty = newQty;
        return updated;
      }
      if (stockLimit <= 0) {
        showToast(`Warning: Product "${product.name}" is out of stock!`, 'warning');
      }
      return [...prev, { product, qty, variation, customUnit: variation?.unit }];
    });
    const displayName = variation ? `${product.name} (${variation.mark})` : product.name;
    showToast(`${displayName} added to cart`, 'success');
  };

  const removeFromRetailCart = (productId: string, variationId?: string) => {
    setRetailCart((prev) => prev.filter((item) => !(item.product.id === productId && item.variation?.id === variationId)));
  };

  const updateRetailQty = (productId: string, qty: number, variationId?: string) => {
    if (qty < 0) return;
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const prod = prev[idx].product;
        const stockLimit = prev[idx].variation ? prev[idx].variation!.currentStock : prod.currentStock;
        if (qty > stockLimit) {
          showToast(`Warning: Exceeds stock count of ${stockLimit}`, 'warning');
        }
        const updated = [...prev];
        updated[idx].qty = qty;
        return updated;
      }
      return prev;
    });
  };

  const updateRetailPrice = (productId: string, price: number, variationId?: string) => {
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].customPrice = price;
        return updated;
      }
      return prev;
    });
  };

  const updateRetailUnit = (productId: string, unit: string, variationId?: string) => {
    setRetailCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
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
    setCustomerName('Walking Customer');
    setCustomerPhone('');
  };

  // WHOLESALE CART LOGIC
  const addToWholesaleCart = (product: Product, qty = 1, variation?: ProductVariation) => {
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id && item.variation?.id === variation?.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].qty += qty;
        return updated;
      }
      return [...prev, { product, qty, variation, customUnit: variation?.unit }];
    });
    const displayName = variation ? `${product.name} (${variation.mark})` : product.name;
    showToast(`${displayName} added to wholesale cart`, 'success');
  };

  const removeFromWholesaleCart = (productId: string, variationId?: string) => {
    setWholesaleCart((prev) => prev.filter((item) => !(item.product.id === productId && item.variation?.id === variationId)));
  };

  const updateWholesaleQty = (productId: string, qty: number, variationId?: string) => {
    if (qty < 0) return;
    setWholesaleCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId && item.variation?.id === variationId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].qty = qty;
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
        sales,
        purchases,
        stockHistory,
        settings,
        refreshData,
        
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
        
        wholesaleCart,
        selectedDealerId,
        setSelectedDealerId,
        addToWholesaleCart,
        removeFromWholesaleCart,
        updateWholesaleQty,
        updateWholesalePrice,
        updateWholesaleUnit,
        clearWholesaleCart,
        wholesaleDiscount,
        setWholesaleDiscount,

        heldCarts,
        holdCurrentCart,
        recallCart,
        deleteHeldCart,

        toasts,
        showToast,
        removeToast
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
