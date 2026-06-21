import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { DB, Sale, Purchase, PattiRecord, Expense } from '../utils/db';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  FileSpreadsheet,
  FileText,
  AlertCircle,
  ClipboardList,
  ArrowUpDown,
  Trash2,
  Receipt
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { sales, purchases, products, settings, dealers, suppliers, pattis, expenses } = useApp();
  const [activeReport, setActiveReport] = useState<'sales' | 'purchases' | 'sales_profit' | 'expenses' | 'stock' | 'mark_wise' | 'staff_wise' | 'patti'>('sales');

  // General Report Sorting States
  const [salesSortField, setSalesSortField] = useState<string>('date');
  const [salesSortAsc, setSalesSortAsc] = useState<boolean>(false);

  const [purchasesSortField, setPurchasesSortField] = useState<string>('date');
  const [purchasesSortAsc, setPurchasesSortAsc] = useState<boolean>(false);

  const [salesProfitSortField, setSalesProfitSortField] = useState<string>('name');
  const [salesProfitSortAsc, setSalesProfitSortAsc] = useState<boolean>(true);

  const [stockSortField, setStockSortField] = useState<string>('name');
  const [stockSortAsc, setStockSortAsc] = useState<boolean>(true);

  const [markWiseSortField, setMarkWiseSortField] = useState<string>('name');
  const [markWiseSortAsc, setMarkWiseSortAsc] = useState<boolean>(true);

  const [staffWiseSortField, setStaffWiseSortField] = useState<string>('email');
  const [staffWiseSortAsc, setStaffWiseSortAsc] = useState<boolean>(true);

  // Patti report states
  const [pattiSortField, setPattiSortField] = useState<string>('date');
  const [pattiSortAsc, setPattiSortAsc] = useState<boolean>(false);
  const [pattiDateFilter, setPattiDateFilter] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('all');
  const [pattiNameFilter, setPattiNameFilter] = useState<string>('');
  const [pattiVehicleFilter, setPattiVehicleFilter] = useState<string>('');
  const [pattiMarkFilter, setPattiMarkFilter] = useState<string>('');

  const [expensesSortField, setExpensesSortField] = useState<'date' | 'category' | 'amount'>('date');
  const [expensesSortAsc, setExpensesSortAsc] = useState<boolean>(false);




  const getProductPurchaseDetails = (productId: string, variationId?: string) => {
    const matchingPurchases = purchases.filter(p => 
      p.items.some(item => 
        item.productId === productId && 
        (!variationId || item.variationId === variationId)
      )
    );
    const lotNos = Array.from(new Set(matchingPurchases.map(p => p.lotNo).filter(Boolean))) as string[];
    const vehicleNos = Array.from(new Set(matchingPurchases.map(p => p.vehicleNo).filter(Boolean))) as string[];
    const vehicleMarks = Array.from(new Set(matchingPurchases.map(p => p.vehicleMark).filter(Boolean))) as string[];
    
    return {
      lotNo: lotNos.length > 0 ? lotNos.join(', ') : '-',
      vehicleNo: vehicleNos.length > 0 ? vehicleNos.join(', ') : '-',
      vehicleMark: vehicleMarks.length > 0 ? vehicleMarks.join(', ') : '-'
    };
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Filter States (Apply to Sales and Purchases)
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Additional Filter States
  const [salesTypeFilter, setSalesTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [dealerFilter, setDealerFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');

  // Printing State
  const [isPrinting, setIsPrinting] = useState(false);

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

  const handlePrintPDF = () => {
    setIsPrinting(true);
  };

  // Helper date checking
  const filterDateMatch = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    if (filterType === 'today') {
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }
    if (filterType === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return date >= sevenDaysAgo;
    }
    if (filterType === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return date >= thirtyDaysAgo;
    }
    if (filterType === 'custom') {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return false;
  };

  // Filtered lists
  const rawFilteredSales = sales
    .filter(s => s.status === 'completed' && filterDateMatch(s.date))
    .filter(s => salesTypeFilter === 'all' || s.type === salesTypeFilter)
    .filter(s => dealerFilter === 'all' || s.dealerId === dealerFilter);

  const filteredSales = rawFilteredSales
    .map(s => {
      if (productFilter === 'all') return s;
      return {
        ...s,
        items: s.items.filter(item => item.productId === productFilter)
      };
    })
    .filter(s => s.items.length > 0);

  const filteredPurchases = purchases
    .filter(p => filterDateMatch(p.date))
    .map(p => {
      if (productFilter === 'all') return p;
      return {
        ...p,
        items: p.items.filter(item => item.productId === productFilter)
      };
    })
    .filter(p => p.items.length > 0);

  // Calculations for Sales & Profit Report Summaries
  const totalSalesRevenue = filteredSales.reduce((sum, s) => {
    return sum + s.items.reduce((acc, item) => {
      const itemDiscount = s.subtotal > 0 ? (item.total / s.subtotal) * s.discount : 0;
      return acc + (item.total - itemDiscount);
    }, 0);
  }, 0);

  const totalSalesCost = filteredSales.reduce((sum, s) => 
    sum + s.items.reduce((acc, item) => acc + (item.purchasePrice * item.qty), 0), 0
  );

  const grossProfitMargin = Math.max(0, totalSalesRevenue - totalSalesCost);

  const netProfit = filteredSales.reduce((sum, s) => {
    return sum + s.items.reduce((acc, item) => {
      const revenue = item.total;
      const cost = item.purchasePrice * item.qty;
      const itemDiscount = s.subtotal > 0 ? (revenue / s.subtotal) * s.discount : 0;
      return acc + (revenue - cost - itemDiscount);
    }, 0);
  }, 0);

  const totalBagsSold = filteredSales.reduce((sum, s) => sum + s.items.reduce((acc, item) => acc + (item.bags || 0), 0), 0);

  const profitMarginPercent = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  const periodExpenses = expenses
    .filter(e => filterDateMatch(e.date))
    .reduce((sum, e) => sum + e.amount, 0);

  const netOperatingProfit = netProfit - periodExpenses;
  const operatingProfitMarginPercent = totalSalesRevenue > 0 ? (netOperatingProfit / totalSalesRevenue) * 100 : 0;

  // Compute top expense category for report range
  const reportCategorySummary = expenses
    .filter(e => filterDateMatch(e.date))
    .reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as { [key: string]: number });

  const reportTopCategoryEntry = Object.entries(reportCategorySummary).sort((a, b) => b[1] - a[1])[0];
  const reportTopCategory = reportTopCategoryEntry ? `${reportTopCategoryEntry[0]} (₹${reportTopCategoryEntry[1].toFixed(2)})` : 'None';

  // Calculations for Purchases Report Summaries
  const totalPurchaseCount = filteredPurchases.length;
  const totalPurchaseVal = filteredPurchases.reduce((sum, p) => 
    sum + p.items.reduce((acc, item) => acc + item.total, 0), 0
  );

  // Calculations for Stock Wise Report (Real-time valuation)
  const stockItemsValuation = products.flatMap(p => {
    if (p.variations && p.variations.length > 0) {
      return p.variations.map(v => ({
        id: p.id + '-' + v.id,
        name: p.name,
        barcode: p.barcode,
        category: p.category,
        unit: v.unit || p.unit,
        currentStock: v.currentStock,
        purchasePrice: v.purchasePrice,
        salesPrice: v.salesPrice,
        minStockAlert: p.minStockAlert,
        variationMark: v.mark as string | undefined
      }));
    } else {
      return [{
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        category: p.category,
        unit: p.unit,
        currentStock: p.currentStock,
        purchasePrice: p.purchasePrice,
        salesPrice: p.salesPrice,
        minStockAlert: p.minStockAlert,
        variationMark: undefined as string | undefined
      }];
    }
  }).filter(item => productFilter === 'all' || item.id.split('-')[0] === productFilter);

  const totalStockQty = stockItemsValuation.reduce((sum, item) => sum + item.currentStock, 0);
  const totalStockCostVal = stockItemsValuation.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0);
  const totalStockRetailVal = stockItemsValuation.reduce((sum, item) => sum + (item.currentStock * item.salesPrice), 0);
  const totalPotentialProfit = Math.max(0, totalStockRetailVal - totalStockCostVal);

  const markWiseReportItems = stockItemsValuation.map(item => {
    const [prodId, varId] = item.id.split('-');
    let qtySold = 0;
    let salesRevenue = 0;
    let salesCost = 0;
    let bagsSold = 0;

    filteredSales.forEach(sale => {
      sale.items.forEach(saleItem => {
        const matchesProduct = saleItem.productId === prodId;
        const matchesVariation = varId ? saleItem.variationId === varId : !saleItem.variationId;
        if (matchesProduct && matchesVariation) {
          qtySold += saleItem.qty;
          salesRevenue += saleItem.total;
          salesCost += saleItem.purchasePrice * saleItem.qty;
          bagsSold += saleItem.bags || 0;
        }
      });
    });

    const costVal = item.currentStock * item.purchasePrice;
    const retailVal = item.currentStock * item.salesPrice;
    const potentialProf = retailVal - costVal;

    return {
      ...item,
      qtySold,
      bagsSold,
      salesRevenue,
      salesCost,
      salesProfit: salesRevenue - salesCost,
      costVal,
      retailVal,
      potentialProf
    };
  });

  const totalMarkSalesQty = markWiseReportItems.reduce((sum, item) => sum + item.qtySold, 0);
  const totalMarkSalesRevenue = markWiseReportItems.reduce((sum, item) => sum + item.salesRevenue, 0);
  const totalMarkSalesProfit = markWiseReportItems.reduce((sum, item) => sum + item.salesProfit, 0);
  const totalMarkStockQty = markWiseReportItems.reduce((sum, item) => sum + item.currentStock, 0);
  const totalMarkStockCost = markWiseReportItems.reduce((sum, item) => sum + item.costVal, 0);
  const totalMarkStockRetail = markWiseReportItems.reduce((sum, item) => sum + item.retailVal, 0);
  const totalMarkStockProfit = markWiseReportItems.reduce((sum, item) => sum + item.potentialProf, 0);





  const staffWiseStats = React.useMemo(() => {
    const groups: {
      [email: string]: {
        email: string;
        role: string;
        invoiceCount: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        cashCollected: number;
        upiCollected: number;
        cardCollected: number;
      }
    } = {};

    const appUsers = JSON.parse(localStorage.getItem('app_users') || '[]') as { email: string; role: string }[];

    const getRole = (email: string) => {
      const lower = email.toLowerCase();
      if (lower === 'viki@wolsales.com' || lower === 'viki') return 'Super Admin';
      if (lower === 'admin@wolsales.com') return 'Admin';
      const found = appUsers.find(u => u.email.toLowerCase() === lower);
      if (found) {
        if (found.role === 'admin') return 'Admin';
        if (found.role === 'staff') return 'Staff';
        return found.role;
      }
      return 'Staff';
    };

    filteredSales.forEach(sale => {
      const staff = sale.createdBy || 'Unknown / System';
      if (!groups[staff]) {
        groups[staff] = {
          email: staff,
          role: staff === 'Unknown / System' ? 'System' : getRole(staff),
          invoiceCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          cashCollected: 0,
          upiCollected: 0,
          cardCollected: 0
        };
      }

      const g = groups[staff];
      g.invoiceCount += 1;
      g.totalRevenue += sale.total;
      
      let saleCost = 0;
      sale.items.forEach(item => {
        saleCost += item.purchasePrice * item.qty;
      });
      g.totalCost += saleCost;
      g.totalProfit += sale.profit;

      if (sale.paymentDetails) {
        g.cashCollected += sale.paymentDetails.cashAmount || 0;
        g.upiCollected += sale.paymentDetails.upiAmount || 0;
        g.cardCollected += sale.paymentDetails.cardAmount || 0;
      }
    });

    return Object.values(groups).filter(g => {
      if (staffFilter === 'all') return true;
      return g.email === staffFilter;
    });
  }, [filteredSales, staffFilter]);

  // Memoized sorted arrays for all report datasets
  const sortedFilteredSales = React.useMemo(() => {
    let list = [...filteredSales];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (salesSortField) {
        case 'invoiceNo':
          valA = a.invoiceNo;
          valB = b.invoiceNo;
          break;
        case 'date':
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
          break;
        case 'customerName':
          valA = a.customerName.toLowerCase();
          valB = b.customerName.toLowerCase();
          break;
        case 'paymentMethod':
          valA = a.paymentMethod.toLowerCase();
          valB = b.paymentMethod.toLowerCase();
          break;
        case 'netAmount':
          valA = a.total;
          valB = b.total;
          break;
        case 'lotNo': {
          const lotsA = a.items.map(item => getProductPurchaseDetails(item.productId, item.variationId).lotNo).filter(x => x !== '-');
          const lotsB = b.items.map(item => getProductPurchaseDetails(item.productId, item.variationId).lotNo).filter(x => x !== '-');
          valA = lotsA.join(', ').toLowerCase();
          valB = lotsB.join(', ').toLowerCase();
          break;
        }
        case 'vehicleNo': {
          const vehsA = a.items.map(item => getProductPurchaseDetails(item.productId, item.variationId).vehicleNo).filter(x => x !== '-');
          const vehsB = b.items.map(item => getProductPurchaseDetails(item.productId, item.variationId).vehicleNo).filter(x => x !== '-');
          valA = vehsA.join(', ').toLowerCase();
          valB = vehsB.join(', ').toLowerCase();
          break;
        }
        default:
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
      }

      if (valA < valB) return salesSortAsc ? -1 : 1;
      if (valA > valB) return salesSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredSales, salesSortField, salesSortAsc, purchases]);

  const sortedFilteredPurchases = React.useMemo(() => {
    let list = [...filteredPurchases];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (purchasesSortField) {
        case 'invoiceNo':
          valA = a.invoiceNo;
          valB = b.invoiceNo;
          break;
        case 'date':
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
          break;
        case 'supplier': {
          const suppA = suppliers.find(s => s.id === a.supplierId)?.name || a.supplierId;
          const suppB = suppliers.find(s => s.id === b.supplierId)?.name || b.supplierId;
          valA = suppA.toLowerCase();
          valB = suppB.toLowerCase();
          break;
        }
        case 'paymentStatus':
          valA = a.paymentStatus.toLowerCase();
          valB = b.paymentStatus.toLowerCase();
          break;
        case 'totalCost':
          valA = a.items.reduce((sum, item) => sum + item.total, 0);
          valB = b.items.reduce((sum, item) => sum + item.total, 0);
          break;
        case 'lotNo':
          valA = (a.lotNo || '').toLowerCase();
          valB = (b.lotNo || '').toLowerCase();
          break;
        case 'vehicleNo':
          valA = (a.vehicleNo || '').toLowerCase();
          valB = (b.vehicleNo || '').toLowerCase();
          break;
        default:
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
      }

      if (valA < valB) return purchasesSortAsc ? -1 : 1;
      if (valA > valB) return purchasesSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredPurchases, purchasesSortField, purchasesSortAsc, suppliers]);

  const sortedSalesProfitItems = React.useMemo(() => {
    const aggMap = filteredSales.reduce((acc, sale) => {
      sale.items.forEach(item => {
        const key = item.productId + (item.variationId ? '-' + item.variationId : '');
        if (acc[key]) {
          acc[key].qty += item.qty;
          acc[key].bags += item.bags || 0;
        } else {
          acc[key] = {
            id: key,
            name: item.name,
            cost: item.purchasePrice,
            sale: item.salesPrice,
            qty: item.qty,
            bags: item.bags || 0,
            variationMark: item.variationMark
          };
        }
      });
      return acc;
    }, {} as { [key: string]: { id: string; name: string; cost: number; sale: number; qty: number; bags: number; variationMark?: string } });

    let list = Object.values(aggMap);

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (salesProfitSortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'cost':
          valA = a.cost;
          valB = b.cost;
          break;
        case 'sale':
          valA = a.sale;
          valB = b.sale;
          break;
        case 'profitPerItem':
          valA = a.sale - a.cost;
          valB = b.sale - b.cost;
          break;
        case 'qty':
          valA = a.qty;
          valB = b.qty;
          break;
        case 'totalProfit':
          valA = (a.sale - a.cost) * a.qty;
          valB = (b.sale - b.cost) * b.qty;
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return salesProfitSortAsc ? -1 : 1;
      if (valA > valB) return salesProfitSortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredSales, salesProfitSortField, salesProfitSortAsc]);

  const sortedStockValuation = React.useMemo(() => {
    let list = [...stockItemsValuation];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (stockSortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'variationMark':
          valA = (a.variationMark || '').toLowerCase();
          valB = (b.variationMark || '').toLowerCase();
          break;
        case 'barcode':
          valA = a.barcode;
          valB = b.barcode;
          break;
        case 'category':
          valA = a.category.toLowerCase();
          valB = b.category.toLowerCase();
          break;
        case 'currentStock':
          valA = a.currentStock;
          valB = b.currentStock;
          break;
        case 'purchasePrice':
          valA = a.purchasePrice;
          valB = b.purchasePrice;
          break;
        case 'costVal':
          valA = a.currentStock * a.purchasePrice;
          valB = b.currentStock * b.purchasePrice;
          break;
        case 'salesPrice':
          valA = a.salesPrice;
          valB = b.salesPrice;
          break;
        case 'retailVal':
          valA = a.currentStock * a.salesPrice;
          valB = b.currentStock * b.salesPrice;
          break;
        case 'potentialProf':
          valA = (a.currentStock * a.salesPrice) - (a.currentStock * a.purchasePrice);
          valB = (b.currentStock * b.salesPrice) - (b.currentStock * b.purchasePrice);
          break;
        case 'lotNo': {
          const [prodId, varId] = a.id.split('-');
          const traceA = getProductPurchaseDetails(prodId, varId);
          const [prodIdB, varIdB] = b.id.split('-');
          const traceB = getProductPurchaseDetails(prodIdB, varIdB);
          valA = traceA.lotNo.toLowerCase();
          valB = traceB.lotNo.toLowerCase();
          break;
        }
        case 'vehicleNo': {
          const [prodId, varId] = a.id.split('-');
          const traceA = getProductPurchaseDetails(prodId, varId);
          const [prodIdB, varIdB] = b.id.split('-');
          const traceB = getProductPurchaseDetails(prodIdB, varIdB);
          valA = traceA.vehicleNo.toLowerCase();
          valB = traceB.vehicleNo.toLowerCase();
          break;
        }
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return stockSortAsc ? -1 : 1;
      if (valA > valB) return stockSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [stockItemsValuation, stockSortField, stockSortAsc, purchases]);

  const sortedMarkWiseReportItems = React.useMemo(() => {
    let list = [...markWiseReportItems];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (markWiseSortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'variationMark':
          valA = (a.variationMark || '').toLowerCase();
          valB = (b.variationMark || '').toLowerCase();
          break;
        case 'qtySold':
          valA = a.qtySold;
          valB = b.qtySold;
          break;
        case 'salesRevenue':
          valA = a.salesRevenue;
          valB = b.salesRevenue;
          break;
        case 'salesProfit':
          valA = a.salesProfit;
          valB = b.salesProfit;
          break;
        case 'currentStock':
          valA = a.currentStock;
          valB = b.currentStock;
          break;
        case 'costVal':
          valA = a.costVal;
          valB = b.costVal;
          break;
        case 'retailVal':
          valA = a.retailVal;
          valB = b.retailVal;
          break;
        case 'potentialProf':
          valA = a.potentialProf;
          valB = b.potentialProf;
          break;
        case 'lotNo': {
          const [prodId, varId] = a.id.split('-');
          const traceA = getProductPurchaseDetails(prodId, varId);
          const [prodIdB, varIdB] = b.id.split('-');
          const traceB = getProductPurchaseDetails(prodIdB, varIdB);
          valA = traceA.lotNo.toLowerCase();
          valB = traceB.lotNo.toLowerCase();
          break;
        }
        case 'vehicleNo': {
          const [prodId, varId] = a.id.split('-');
          const traceA = getProductPurchaseDetails(prodId, varId);
          const [prodIdB, varIdB] = b.id.split('-');
          const traceB = getProductPurchaseDetails(prodIdB, varIdB);
          valA = traceA.vehicleNo.toLowerCase();
          valB = traceB.vehicleNo.toLowerCase();
          break;
        }
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return markWiseSortAsc ? -1 : 1;
      if (valA > valB) return markWiseSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [markWiseReportItems, markWiseSortField, markWiseSortAsc, purchases]);

  const sortedStaffWiseStats = React.useMemo(() => {
    let list = [...staffWiseStats];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (staffWiseSortField) {
        case 'email':
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
          break;
        case 'role':
          valA = a.role.toLowerCase();
          valB = b.role.toLowerCase();
          break;
        case 'invoiceCount':
          valA = a.invoiceCount;
          valB = b.invoiceCount;
          break;
        case 'totalRevenue':
          valA = a.totalRevenue;
          valB = b.totalRevenue;
          break;
        case 'totalCost':
          valA = a.totalCost;
          valB = b.totalCost;
          break;
        case 'totalProfit':
          valA = a.totalProfit;
          valB = b.totalProfit;
          break;
        case 'cashCollected':
          valA = a.cashCollected;
          valB = b.cashCollected;
          break;
        case 'upiCollected':
          valA = a.upiCollected;
          valB = b.upiCollected;
          break;
        case 'cardCollected':
          valA = a.cardCollected;
          valB = b.cardCollected;
          break;
        default:
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
      }

      if (valA < valB) return staffWiseSortAsc ? -1 : 1;
      if (valA > valB) return staffWiseSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [staffWiseStats, staffWiseSortField, staffWiseSortAsc]);



  const handleSalesSort = (field: string) => {
    if (salesSortField === field) {
      setSalesSortAsc(!salesSortAsc);
    } else {
      setSalesSortField(field);
      setSalesSortAsc(true);
    }
  };

  const handlePurchasesSort = (field: string) => {
    if (purchasesSortField === field) {
      setPurchasesSortAsc(!purchasesSortAsc);
    } else {
      setPurchasesSortField(field);
      setPurchasesSortAsc(true);
    }
  };

  const handleSalesProfitSort = (field: string) => {
    if (salesProfitSortField === field) {
      setSalesProfitSortAsc(!salesProfitSortAsc);
    } else {
      setSalesProfitSortField(field);
      setSalesProfitSortAsc(true);
    }
  };

  const handleStockSort = (field: string) => {
    if (stockSortField === field) {
      setStockSortAsc(!stockSortAsc);
    } else {
      setStockSortField(field);
      setStockSortAsc(true);
    }
  };

  const handleMarkWiseSort = (field: string) => {
    if (markWiseSortField === field) {
      setMarkWiseSortAsc(!markWiseSortAsc);
    } else {
      setMarkWiseSortField(field);
      setMarkWiseSortAsc(true);
    }
  };

  const handleStaffWiseSort = (field: string) => {
    if (staffWiseSortField === field) {
      setStaffWiseSortAsc(!staffWiseSortAsc);
    } else {
      setStaffWiseSortField(field);
      setStaffWiseSortAsc(true);
    }
  };

  // Patti report filter + sort
  const filteredPattis = React.useMemo(() => {
    const today = new Date();
    return pattis.filter(p => {
      const d = new Date(p.date);
      let dateOk = true;
      if (pattiDateFilter === 'today') {
        dateOk = d.toDateString() === today.toDateString();
      } else if (pattiDateFilter === 'week') {
        const ago = new Date(); ago.setDate(today.getDate() - 7);
        dateOk = d >= ago;
      } else if (pattiDateFilter === 'month') {
        const ago = new Date(); ago.setDate(today.getDate() - 30);
        dateOk = d >= ago;
      } else if (pattiDateFilter === 'custom') {
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);
        dateOk = d >= start && d <= end;
      }
      const nameOk = !pattiNameFilter || p.name.toLowerCase().includes(pattiNameFilter.toLowerCase());
      const vehicleOk = !pattiVehicleFilter || (p.vehicleNo || '').toLowerCase().includes(pattiVehicleFilter.toLowerCase());
      const markOk = !pattiMarkFilter || (p.mark || '').toLowerCase().includes(pattiMarkFilter.toLowerCase());
      return dateOk && nameOk && vehicleOk && markOk;
    });
  }, [pattis, pattiDateFilter, pattiNameFilter, pattiVehicleFilter, pattiMarkFilter, startDate, endDate]);

  const sortedPattis = React.useMemo(() => {
    return [...filteredPattis].sort((a, b) => {
      let va: any = 0, vb: any = 0;
      const aItems = a.items.reduce((s, i) => s + i.amount, 0);
      const bItems = b.items.reduce((s, i) => s + i.amount, 0);
      const aExp = a.expenses.rent + a.expenses.loading + a.expenses.commission + a.expenses.otherList.reduce((s,o) => s+o.amount, 0);
      const bExp = b.expenses.rent + b.expenses.loading + b.expenses.commission + b.expenses.otherList.reduce((s,o) => s+o.amount, 0);
      const aGrand = aItems + aExp - a.lessAmount;
      const bGrand = bItems + bExp - b.lessAmount;
      switch (pattiSortField) {
        case 'date': va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); break;
        case 'billNo': va = a.billNo; vb = b.billNo; break;
        case 'name': va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
        case 'vehicleNo': va = (a.vehicleNo||'').toLowerCase(); vb = (b.vehicleNo||'').toLowerCase(); break;
        case 'mark': va = (a.mark||'').toLowerCase(); vb = (b.mark||'').toLowerCase(); break;
        case 'itemsTotal': va = aItems; vb = bItems; break;
        case 'expenses': va = aExp; vb = bExp; break;
        case 'grandTotal': va = aGrand; vb = bGrand; break;
        default: va = new Date(a.date).getTime(); vb = new Date(b.date).getTime();
      }
      if (va < vb) return pattiSortAsc ? -1 : 1;
      if (va > vb) return pattiSortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredPattis, pattiSortField, pattiSortAsc]);

  const handlePattiSort = (field: string) => {
    if (pattiSortField === field) setPattiSortAsc(!pattiSortAsc);
    else { setPattiSortField(field); setPattiSortAsc(true); }
  };

  const pattiGrandTotals = React.useMemo(() => {
    return sortedPattis.reduce((acc, p) => {
      const items = p.items.reduce((s, i) => s + i.amount, 0);
      const exp = p.expenses.rent + p.expenses.loading + p.expenses.commission + p.expenses.otherList.reduce((s,o)=>s+o.amount,0);
      const grand = items + exp - p.lessAmount;
      return { items: acc.items + items, exp: acc.exp + exp, grand: acc.grand + grand, qty: acc.qty + p.items.reduce((s,i)=>s+i.qty,0), weight: acc.weight + p.items.reduce((s,i)=>s+i.weight,0) };
    }, { items: 0, exp: 0, grand: 0, qty: 0, weight: 0 });
  }, [sortedPattis]);

  const sortedFilteredExpenses = React.useMemo(() => {
    let list = expenses.filter(e => filterDateMatch(e.date));
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (expensesSortField === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (expensesSortField === 'category') {
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
      } else if (expensesSortField === 'amount') {
        valA = a.amount;
        valB = b.amount;
      }
      if (valA < valB) return expensesSortAsc ? -1 : 1;
      if (valA > valB) return expensesSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [expenses, expensesSortField, expensesSortAsc, filterType, startDate, endDate]);

  const handleExpensesSort = (field: 'date' | 'category' | 'amount') => {
    if (expensesSortField === field) {
      setExpensesSortAsc(!expensesSortAsc);
    } else {
      setExpensesSortField(field);
      setExpensesSortAsc(true);
    }
  };



  // CSV Exporter helper

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let fileName = '';

    if (activeReport === 'sales') {
      headers = ['Bill Number', 'Customer', 'Date', 'Product', 'Bags', 'Qty Sold', 'Cost Price (INR)', 'Sales Price (INR)', 'Total Profit (INR)', 'Total Bill Value (INR)', 'Associated Vehicle No', 'Associated Lot No'];
      rows = sortedFilteredSales.flatMap(sale => 
        sale.items.map(item => {
          const trace = getProductPurchaseDetails(item.productId, item.variationId);
          return [
            sale.invoiceNo,
            sale.customerName,
            formatDateTime(sale.date),
            item.variationMark && !item.name.includes(item.variationMark) ? `${item.name} (${item.variationMark})` : item.name,
            (item.bags || 0).toString(),
            item.qty.toString(),
            item.purchasePrice.toFixed(2),
            item.salesPrice.toFixed(2),
            ((item.salesPrice - item.purchasePrice) * item.qty).toFixed(2),
            sale.total.toFixed(2),
            trace.vehicleNo,
            trace.lotNo
          ];
        })
      );
      fileName = `Sales_Ledger_Report_${filterType}.csv`;
    } else if (activeReport === 'purchases') {
      headers = ['Invoice Number', 'Supplier ID', 'Supplier Name', 'Date', 'Vehicle No', 'Lot No', 'Vehicle Mark', 'Product', 'Bags', 'Qty Bought', 'Unit Price (INR)', 'Total Cost (INR)'];
      rows = sortedFilteredPurchases.flatMap(pur =>
        pur.items.map(item => [
          pur.invoiceNo,
          pur.supplierId,
          suppliers.find(s => s.id === pur.supplierId)?.name || pur.supplierId,
          formatDateTime(pur.date),
          pur.vehicleNo || 'N/A',
          pur.lotNo || 'N/A',
          pur.vehicleMark || 'N/A',
          item.variationMark && !item.name.includes(item.variationMark) ? `${item.name} (${item.variationMark})` : item.name,
          (item.bags || 0).toString(),
          item.qty.toString(),
          item.purchasePrice.toFixed(2),
          item.total.toFixed(2)
        ])
      );
      fileName = `Purchases_Report_${filterType}.csv`;
    } else if (activeReport === 'sales_profit') {
      headers = ['Product Name', 'Total Bags', 'Purchase Cost (INR)', 'Retail Price (INR)', 'Profit Per Item (INR)', 'Quantity Sold', 'Total Net Profit (INR)'];
      rows = sortedSalesProfitItems.map(item => [
        item.variationMark && !item.name.includes(item.variationMark) ? `${item.name} (${item.variationMark})` : item.name,
        item.bags.toString(),
        item.cost.toFixed(2),
        item.sale.toFixed(2),
        (item.sale - item.cost).toFixed(2),
        Number(item.qty.toFixed(3)).toString(),
        ((item.sale - item.cost) * item.qty).toFixed(2)
      ]);
      fileName = `Sales_Profit_Report_${filterType}.csv`;
    } else if (activeReport === 'stock') {
      // Stock Wise Report
      headers = ['Product Name', 'Mark', 'Barcode', 'Category', 'Current Stock', 'Unit Cost Price (INR)', 'Total Cost Value (INR)', 'Unit Sales Price (INR)', 'Total Sales Value (INR)', 'Potential Profit (INR)', 'Status', 'Associated Vehicle No', 'Associated Lot No'];
      rows = sortedStockValuation.map(item => {
        const costVal = item.currentStock * item.purchasePrice;
        const retailVal = item.currentStock * item.salesPrice;
        const potentialProf = retailVal - costVal;
        const status = item.currentStock === 0 ? 'OUT OF STOCK' : item.currentStock <= item.minStockAlert ? 'LOW STOCK' : 'ADEQUATE';
        const [prodId, varId] = item.id.split('-');
        const trace = getProductPurchaseDetails(prodId, varId);
        return [
          item.name,
          item.variationMark || '-',
          item.barcode,
          item.category,
          `${Number(item.currentStock.toFixed(3))} ${item.unit}`,
          item.purchasePrice.toFixed(2),
          costVal.toFixed(2),
          item.salesPrice.toFixed(2),
          retailVal.toFixed(2),
          potentialProf.toFixed(2),
          status,
          trace.vehicleNo,
          trace.lotNo
        ];
      });
      fileName = `Stock_Wise_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (activeReport === 'mark_wise') {
      // Mark Wise Report
      headers = [
        'Product Name', 'Mark', 'Barcode', 'Category', 'Unit', 
        'Bags Sold', 'Qty Sold', 'Sales Revenue (INR)', 'Sales Cost (INR)', 'Sales Profit/Loss (INR)', 
        'Current Stock', 'Stock Cost Value (INR)', 'Stock Retail Value (INR)', 'Stock Potential Profit (INR)', 'Status', 'Associated Vehicle No', 'Associated Lot No'
      ];
      rows = sortedMarkWiseReportItems.map(item => {
        const status = item.currentStock === 0 ? 'OUT OF STOCK' : item.currentStock <= item.minStockAlert ? 'LOW STOCK' : 'ADEQUATE';
        const [prodId, varId] = item.id.split('-');
        const trace = getProductPurchaseDetails(prodId, varId);
        return [
          item.name,
          item.variationMark || '-',
          item.barcode,
          item.category,
          item.unit,
          item.bagsSold.toString(),
          Number(item.qtySold.toFixed(3)).toString(),
          item.salesRevenue.toFixed(2),
          item.salesCost.toFixed(2),
          item.salesProfit.toFixed(2),
          Number(item.currentStock.toFixed(3)).toString(),
          item.costVal.toFixed(2),
          item.retailVal.toFixed(2),
          item.potentialProf.toFixed(2),
          status,
          trace.vehicleNo,
          trace.lotNo
        ];
      });
      fileName = `Mark_Wise_Report_${new Date().toISOString().slice(0, 10)}.csv`;

    } else if (activeReport === 'patti') {
      headers = ['Bill No', 'Date', 'Party Name', 'Vehicle No', 'Transporter Name', 'Truck Driver Name', 'Driver Mobile', 'Truck Owner Mobile', 'Freight Rate (₹)', 'Advance Paid (₹)', 'Mark', 'Items Total (₹)', 'Rent', 'Loading', 'Commission', 'Other Expenses', 'Total Expenses (₹)', 'Less', 'Grand Total (₹)', 'Notes'];
      rows = sortedPattis.map(p => {
        const items = p.items.reduce((s, i) => s + i.amount, 0);
        const exp = p.expenses.rent + p.expenses.loading + p.expenses.commission + p.expenses.otherList.reduce((s,o)=>s+o.amount,0);
        const grand = items + exp - p.lessAmount;
        const otherStr = p.expenses.otherList.map(o=>`${o.label||'Other'}:${o.amount.toFixed(2)}`).join(' | ');
        return [
          p.billNo, new Date(p.date).toLocaleDateString('en-IN'),
          p.name, p.vehicleNo||'-',
          p.transporterName||'-', p.truckDriverName||'-', p.driverMob||'-', p.truckOwnerMob||'-',
          p.freightRate ? p.freightRate.toFixed(2) : '0.00', p.advance ? p.advance.toFixed(2) : '0.00',
          p.mark||'-',
          items.toFixed(2), p.expenses.rent.toFixed(2), p.expenses.loading.toFixed(2),
          p.expenses.commission.toFixed(2), otherStr || '0',
          exp.toFixed(2), p.lessAmount.toFixed(2), grand.toFixed(2), p.notes||''
        ];
      });
      fileName = `Patti_Report_${new Date().toISOString().slice(0,10)}.csv`;
    } else if (activeReport === 'expenses') {
      headers = ['Date & Time', 'Category', 'Note/Description', 'Payment Method', 'Reference No', 'Amount (INR)', 'Recorded By'];
      rows = sortedFilteredExpenses.map(e => [
        new Date(e.date).toLocaleString(),
        e.category,
        e.note || '-',
        e.paymentMethod,
        e.referenceNo || '-',
        e.amount.toFixed(2),
        e.createdBy || '-'
      ]);
      fileName = `Expenses_Report_${filterType}.csv`;
    } else {
      // Staff Wise Report
      headers = ['Staff Email', 'Role', 'Invoices Count', 'Revenue (INR)', 'Cost Value (INR)', 'Net Profit (INR)', 'Cash Collected (INR)', 'UPI Collected (INR)', 'Card Collected (INR)'];
      rows = sortedStaffWiseStats.map(stat => [
        stat.email,
        stat.role,
        stat.invoiceCount.toString(),
        stat.totalRevenue.toFixed(2),
        stat.totalCost.toFixed(2),
        stat.totalProfit.toFixed(2),
        stat.cashCollected.toFixed(2),
        stat.upiCollected.toFixed(2),
        stat.cardCollected.toFixed(2)
      ]);
      fileName = `Staff_Wise_Sales_Report_${filterType}.csv`;
    }


    // Generate CSV contents
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPrintableReport = () => {
    const rangeText = activeReport === 'stock' 
      ? 'REAL-TIME VALUATION' 
      : (filterType === 'custom' ? `${startDate} to ${endDate}` : filterType.toUpperCase());

    const title = activeReport === 'sales' ? 'SALES LEDGER REPORT' : 
                  activeReport === 'purchases' ? 'PURCHASE ASSETS REPORT' : 
                  activeReport === 'sales_profit' ? 'SALES & PROFIT REPORT' : 
                  activeReport === 'expenses' ? 'EXPENSES OUTFLOW REPORT' :
                  activeReport === 'stock' ? 'STOCK WISE INVENTORY VALUATION' : 
                  activeReport === 'mark_wise' ? 'MARK WISE SALES & STOCK REPORT' : 
                  activeReport === 'patti' ? 'PATTI BILLS REPORT' : 'STAFF WISE SALES REPORT';
    
    return (
      <div className="print-a4" style={{ fontFamily: 'var(--font-body)', background: '#fff', color: '#000', padding: '15mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textTransform: 'uppercase' }}>{settings.shopName || 'STORE REPORT'}</h2>
            <p style={{ fontSize: '0.8rem', margin: '2px 0' }}>{settings.address}</p>
            <p style={{ fontSize: '0.8rem', margin: '2px 0' }}>Phone: {settings.phone}</p>
            {settings.gstin && <p style={{ fontSize: '0.8rem', margin: '2px 0', fontWeight: 600 }}>GSTIN: {settings.gstin}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'indigo', marginBottom: '4px' }}>{title}</h3>
            <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Period:</strong> {rangeText}</p>
            {salesTypeFilter !== 'all' && (activeReport === 'sales' || activeReport === 'sales_profit') && (
              <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Type:</strong> {salesTypeFilter === 'retail' ? 'Retail Only' : 'Wholesale Only'}</p>
            )}
            {dealerFilter !== 'all' && (activeReport === 'sales' || activeReport === 'sales_profit') && salesTypeFilter !== 'retail' && (
              <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Dealer:</strong> {dealers.find(d => d.id === dealerFilter)?.name || dealerFilter}</p>
            )}
            {productFilter !== 'all' && (
              <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Product:</strong> {products.find(p => p.id === productFilter)?.name || productFilter}</p>
            )}
            <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Generated:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Report Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {(activeReport === 'sales' || activeReport === 'sales_profit') && (
            <>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Revenue</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{totalSalesRevenue.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Stock Cost</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{totalSalesCost.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Discounts</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{filteredSales.reduce((sum, s) => sum + s.discount, 0).toFixed(2)}</div>
              </div>
              {activeReport === 'sales_profit' ? (
                <>
                  <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Gross Profit</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'green' }}>₹{netProfit.toFixed(2)}</div>
                  </div>
                  <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>General Expenses</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'red' }}>₹{periodExpenses.toFixed(2)}</div>
                  </div>
                  <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Net Profit</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'green' }}>₹{netOperatingProfit.toFixed(2)}</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Net Profit</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'green' }}>₹{netProfit.toFixed(2)}</div>
                  </div>
                  <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Bags Sold</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totalBagsSold} Bags</div>
                  </div>
                </>
              )}
            </>
          )}
          {activeReport === 'expenses' && (
            <>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Expenses Count</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{sortedFilteredExpenses.length} Outflows</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb', gridColumn: 'span 3' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Expenses Value</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'red' }}>₹{periodExpenses.toFixed(2)}</div>
              </div>
            </>
          )}
          {activeReport === 'purchases' && (
            <>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Purchase Bills</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totalPurchaseCount} Bills</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Asset Acquisition Value</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{totalPurchaseVal.toFixed(2)}</div>
              </div>
            </>
          )}
          {activeReport === 'stock' && (
            <>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Stock Qty</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totalStockQty} items</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Asset Cost Value</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{totalStockCostVal.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Asset Retail Value</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{totalStockRetailVal.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Potential Profit</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'green' }}>₹{totalPotentialProfit.toFixed(2)}</div>
              </div>
            </>
          )}
          {activeReport === 'mark_wise' && (
            <>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Sales Profit</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: totalMarkSalesProfit >= 0 ? 'green' : 'red' }}>₹{totalMarkSalesProfit.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Stock Cost Value</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{totalMarkStockCost.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Stock Retail Value</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{totalMarkStockRetail.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Stock Potential Profit</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'green' }}>₹{totalMarkStockProfit.toFixed(2)}</div>
              </div>
            </>
          )}
          {activeReport === 'staff_wise' && (
            <>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Revenue</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{staffWiseStats.reduce((sum, s) => sum + s.totalRevenue, 0).toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Total Net Profit</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'green' }}>₹{staffWiseStats.reduce((sum, s) => sum + s.totalProfit, 0).toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Cash Collected</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{staffWiseStats.reduce((sum, s) => sum + s.cashCollected, 0).toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9fafb' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>Digital Collected</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{staffWiseStats.reduce((sum, s) => sum + (s.upiCollected + s.cardCollected), 0).toFixed(2)}</div>
              </div>
            </>
          )}
        </div>

        {/* Main Report Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              {activeReport === 'sales' && (
                <>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Bill No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Customer</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Product</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Lot No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Vehicle No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Cost Price</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Sales Price</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Qty</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Profit</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Total Bill</th>
                </>
              )}
              {activeReport === 'purchases' && (
                <>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Invoice No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Supplier</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Lot No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Vehicle / Mark</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Product</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Quantity</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Cost Price</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Total Cost</th>
                </>
              )}
              {activeReport === 'sales_profit' && (
                <>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Product Name</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Purchase Cost</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Sales Price</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Profit / Item</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Qty Sold</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Total Profit</th>
                </>
              )}
              {activeReport === 'stock' && (
                <>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Product</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Mark</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Lot No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Vehicle No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Barcode</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Stock Qty</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Cost Price</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Total Cost</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Sales Price</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Total Retail</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Potential Profit</th>
                </>
              )}
              {activeReport === 'mark_wise' && (
                <>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Product</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Mark</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Lot No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Vehicle No</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Unit</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Qty Sold</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Sales Revenue</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Sales Profit</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Stock Level</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Stock Value (Cost)</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Stock Value (Retail)</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Potential Profit</th>
                </>
              )}
              {activeReport === 'staff_wise' && (
                <>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Staff Email</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Role</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>Invoices</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Cost Value</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Net Profit</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Cash</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>UPI</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Card</th>
                </>
              )}
              {activeReport === 'expenses' && (
                <>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Date</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Category</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Note/Description</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Payment Method</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Reference ID</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Amount</th>
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Recorded By</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {activeReport === 'sales' && sortedFilteredSales.map((sale) => 
              sale.items.map((item, idx) => {
                const profitPerItem = item.salesPrice - item.purchasePrice;
                const trace = getProductPurchaseDetails(item.productId, item.variationId);
                return (
                  <tr key={`${sale.id}-${idx}`}>
                    {idx === 0 ? (
                      <td rowSpan={sale.items.length} style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                        {sale.invoiceNo}
                        <div style={{ fontSize: '8px', color: '#555' }}>{formatDateTime(sale.date)}</div>
                      </td>
                    ) : null}
                    {idx === 0 ? (
                      <td rowSpan={sale.items.length} style={{ border: '1px solid #ddd', padding: '6px' }}>
                        {sale.customerName}
                      </td>
                    ) : null}
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                      {item.variationMark && !item.name.includes(item.variationMark) ? `${item.name} (${item.variationMark})` : item.name}
                      {item.bags && item.bags > 0 ? ` [${item.bags} Bags]` : ''}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>{trace.lotNo}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px' }}>{trace.vehicleNo}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.salesPrice.toFixed(2)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: 'green' }}>₹{(profitPerItem * item.qty).toFixed(2)}</td>
                    {idx === 0 ? (
                      <td rowSpan={sale.items.length} style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontWeight: 700 }}>
                        ₹{sale.total.toFixed(2)}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
            {activeReport === 'purchases' && sortedFilteredPurchases.map((pur) => 
              pur.items.map((item, idx) => (
                <tr key={`${pur.id}-${idx}`}>
                  {idx === 0 ? (
                    <td rowSpan={pur.items.length} style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                      {pur.invoiceNo}
                      <div style={{ fontSize: '8px', color: '#555' }}>{formatDateTime(pur.date)}</div>
                    </td>
                  ) : null}
                  {idx === 0 ? (
                    <td rowSpan={pur.items.length} style={{ border: '1px solid #ddd', padding: '6px' }}>
                      {suppliers.find(s => s.id === pur.supplierId)?.name || pur.supplierId}
                    </td>
                  ) : null}
                  {idx === 0 ? (
                    <td rowSpan={pur.items.length} style={{ border: '1px solid #ddd', padding: '6px' }}>
                      {pur.lotNo || 'N/A'}
                    </td>
                  ) : null}
                  {idx === 0 ? (
                    <td rowSpan={pur.items.length} style={{ border: '1px solid #ddd', padding: '6px' }}>
                      {pur.vehicleNo || 'N/A'} {pur.vehicleMark ? `(Mark: ${pur.vehicleMark})` : ''}
                    </td>
                  ) : null}
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                    {item.variationMark && !item.name.includes(item.variationMark) ? `${item.name} (${item.variationMark})` : item.name}
                    {item.bags && item.bags > 0 ? ` [${item.bags} Bags]` : ''}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontWeight: 600 }}>₹{item.total.toFixed(2)}</td>
                </tr>
              ))
            )}
            {activeReport === 'sales_profit' && sortedSalesProfitItems.map((aggItem) => {
              const unitProfit = aggItem.sale - aggItem.cost;
              const totalItemProfit = unitProfit * aggItem.qty;
              return (
                <tr key={aggItem.id}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                    {aggItem.variationMark && !aggItem.name.includes(aggItem.variationMark) ? `${aggItem.name} (${aggItem.variationMark})` : aggItem.name}
                    {aggItem.bags > 0 ? ` [${aggItem.bags} Bags]` : ''}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{aggItem.cost.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{aggItem.sale.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: 'green' }}>+ ₹{unitProfit.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{Number(aggItem.qty.toFixed(3))}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontWeight: 700, color: 'green' }}>
                    ₹{totalItemProfit.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {activeReport === 'stock' && sortedStockValuation.map(item => {
              const costVal = item.currentStock * item.purchasePrice;
              const retailVal = item.currentStock * item.salesPrice;
              const potentialProf = retailVal - costVal;
              const [prodId, varId] = item.id.split('-');
              const trace = getProductPurchaseDetails(prodId, varId);
              return (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                    {item.name}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.variationMark || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{trace.lotNo}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{trace.vehicleNo}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontFamily: 'Courier New' }}>{item.barcode}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{Number(item.currentStock.toFixed(3))} {item.unit}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{costVal.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.salesPrice.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{retailVal.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: 'green', fontWeight: 600 }}>₹{potentialProf.toFixed(2)}</td>
                </tr>
              );
            })}
            {activeReport === 'mark_wise' && sortedMarkWiseReportItems.map(item => {
              const [prodId, varId] = item.id.split('-');
              const trace = getProductPurchaseDetails(prodId, varId);
              return (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                    {item.name}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.variationMark || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{trace.lotNo}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{trace.vehicleNo}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                    {Number(item.qtySold.toFixed(3))}
                    {item.bagsSold > 0 ? ` [${item.bagsSold} Bags]` : ''}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.salesRevenue.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: item.salesProfit >= 0 ? 'green' : 'red' }}>
                    ₹{item.salesProfit.toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontWeight: 700 }}>
                    {Number(item.currentStock.toFixed(3))}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.costVal.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{item.retailVal.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: 'green', fontWeight: 600 }}>₹{item.potentialProf.toFixed(2)}</td>
                </tr>
              );
            })}
            {activeReport === 'staff_wise' && sortedStaffWiseStats.map(stat => (
              <tr key={stat.email}>
                <td style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>{stat.email}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{stat.role}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{stat.invoiceCount}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{stat.totalRevenue.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{stat.totalCost.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: 'green', fontWeight: 600 }}>₹{stat.totalProfit.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{stat.cashCollected.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{stat.upiCollected.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>₹{stat.cardCollected.toFixed(2)}</td>
              </tr>
            ))}
            {activeReport === 'expenses' && sortedFilteredExpenses.map((exp) => (
              <tr key={exp.id}>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{new Date(exp.date).toLocaleDateString()} {new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>{exp.category}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{exp.note || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{exp.paymentMethod}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{exp.referenceNo || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontWeight: 700, color: 'red' }}>₹{exp.amount.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '6px' }}>{(exp.createdBy || '').split('@')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '3rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
          <p>End of Generated Financial Report</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Financial Reports Center</h1>
          <p>Analyze sales volumes, purchase assets, profit margins, and export logs to Excel</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeReport === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('sales')}
          >
            Sales Ledger
          </button>
          <button 
            className={`btn ${activeReport === 'purchases' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('purchases')}
          >
            Purchases Asset
          </button>
          <button 
            className={`btn ${activeReport === 'sales_profit' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('sales_profit')}
          >
            Sales & Profit
          </button>
          <button 
            className={`btn ${activeReport === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('expenses')}
          >
            Expenses Outflow
          </button>
          <button 
            className={`btn ${activeReport === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('stock')}
          >
            Stock Wise Report
          </button>
          <button 
            className={`btn ${activeReport === 'mark_wise' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('mark_wise')}
          >
            Mark Wise Report
          </button>
          <button 
            className={`btn ${activeReport === 'staff_wise' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('staff_wise')}
          >
            Staff Wise Sales
          </button>
          <button 
            className={`btn ${activeReport === 'patti' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport('patti')}
          >
            <ClipboardList size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Patti Report
          </button>
        </div>
      </div>

      {/* Date Filters Controller */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {activeReport === 'stock' ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--warning)' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Stock Wise Report shows real-time warehouse inventory values. Date filters are not applicable.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Range:</span>
            
            <button 
              className={`btn ${filterType === 'today' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: '15px' }}
              onClick={() => setFilterType('today')}
            >
              Today
            </button>
            <button 
              className={`btn ${filterType === 'week' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: '15px' }}
              onClick={() => setFilterType('week')}
            >
              Last 7 Days
            </button>
            <button 
              className={`btn ${filterType === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: '15px' }}
              onClick={() => setFilterType('month')}
            >
              Last 30 Days
            </button>
            <button 
              className={`btn ${filterType === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: '15px' }}
              onClick={() => setFilterType('custom')}
            >
              Custom Range
            </button>
          </div>
        )}

        {!isPrinting && filterType === 'custom' && activeReport !== 'stock' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="date"
              className="form-control"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '130px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem' }}>to</span>
            <input
              type="date"
              className="form-control"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '130px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handlePrintPDF}>
            <FileText size={16} />
            <span>Download PDF Report</span>
          </button>
          <button className="btn btn-success" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export to Excel (CSV)</span>
          </button>
        </div>

        {/* Additional Filters: Sales Type, Dealer, Product */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          {(activeReport === 'sales' || activeReport === 'sales_profit') && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Sales Type</label>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '34px' }}
                value={salesTypeFilter}
                onChange={(e) => {
                  setSalesTypeFilter(e.target.value as any);
                  if (e.target.value === 'retail') {
                    setDealerFilter('all');
                  }
                }}
              >
                <option value="all">All Sales</option>
                <option value="retail">Retail Sales Only</option>
                <option value="wholesale">Wholesale Sales Only</option>
              </select>
            </div>
          )}

          {(activeReport === 'sales' || activeReport === 'sales_profit') && salesTypeFilter !== 'retail' && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Filter by Dealer</label>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '34px' }}
                value={dealerFilter}
                onChange={(e) => setDealerFilter(e.target.value)}
              >
                <option value="all">All Dealers</option>
                {dealers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Filter by Product</label>
            <select
              className="form-control"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '34px' }}
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {activeReport === 'staff_wise' && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Filter by Staff</label>
              <select
                className="form-control"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '34px' }}
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
              >
                <option value="all">All Staff</option>
                {Array.from(new Set(sales.map(s => s.createdBy || 'Unknown / System'))).map(staff => (
                  <option key={staff} value={staff}>{staff}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Patti Report Tab ─────────────────────────────────────────────── */}
      {activeReport === 'patti' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Patti-specific date filter strip */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Calendar size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date:</span>
            {(['all', 'today', 'week', 'month', 'custom'] as const).map(f => (
              <button
                key={f}
                className={`btn ${pattiDateFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', borderRadius: '15px' }}
                onClick={() => setPattiDateFilter(f)}
              >
                {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? 'Last 7 Days' : f === 'month' ? 'Last 30 Days' : 'Custom'}
              </button>
            ))}
            {pattiDateFilter === 'custom' && (
              <>
                <input type="date" className="form-control" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '130px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span style={{ fontSize: '0.8rem' }}>to</span>
                <input type="date" className="form-control" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '130px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <input
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '140px' }}
                placeholder="Search party name…"
                value={pattiNameFilter}
                onChange={e => setPattiNameFilter(e.target.value)}
              />
              <input
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '120px' }}
                placeholder="Vehicle No…"
                value={pattiVehicleFilter}
                onChange={e => setPattiVehicleFilter(e.target.value)}
              />
              <input
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '100px' }}
                placeholder="Mark/Lot…"
                value={pattiMarkFilter}
                onChange={e => setPattiMarkFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Bills</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{sortedPattis.length} Bills</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Items Total</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{pattiGrandTotals.items.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Expenses</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--danger)' }}>₹{pattiGrandTotals.exp.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Grand Total</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>₹{pattiGrandTotals.grand.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Weight</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{pattiGrandTotals.weight.toFixed(3)} Kg</h3>
            </div>
          </div>

          {/* Patti Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Patti Bills</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sortedPattis.length} records</span>
            </div>

            {sortedPattis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <ClipboardList size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <p>No patti bills found for the selected filters.</p>
                <p style={{ fontSize: '0.82rem' }}>Create and save a Patti bill from the Patti menu to see it here.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      {[
                        { field: 'date', label: 'Date' },
                        { field: 'billNo', label: 'Bill No' },
                        { field: 'name', label: 'Party Name' },
                        { field: 'vehicleNo', label: 'Vehicle No' },
                        { field: 'mark', label: 'Mark/Lot' },
                        { field: 'itemsTotal', label: 'Items (₹)' },
                        { field: 'expenses', label: 'Expenses (₹)' },
                        { field: 'grandTotal', label: 'Grand Total (₹)' },
                      ].map(({ field, label }) => (
                        <th
                          key={field}
                          style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                          onClick={() => handlePattiSort(field)}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {label}
                            <ArrowUpDown size={11} style={{ opacity: pattiSortField === field ? 1 : 0.35 }} />
                            {pattiSortField === field && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>
                                {pattiSortAsc ? '▲' : '▼'}
                              </span>
                            )}
                          </span>
                        </th>
                      ))}
                      <th style={{ width: '30px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPattis.map(p => {
                      const itemsTotal = p.items.reduce((s, i) => s + i.amount, 0);
                      const expTotal = p.expenses.rent + p.expenses.loading + p.expenses.commission + p.expenses.otherList.reduce((s,o)=>s+o.amount,0);
                      const grand = itemsTotal + expTotal - p.lessAmount;
                      return (
                        <tr key={p.id}>
                          <td>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.billNo}</td>
                          <td>{p.name}</td>
                          <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{p.vehicleNo || '-'}</td>
                          <td>{p.mark || '-'}</td>
                          <td style={{ textAlign: 'right' }}>₹{itemsTotal.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--danger)' }}>₹{expTotal.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>₹{grand.toFixed(2)}</td>
                          <td>
                            <button
                              className="btn btn-ghost btn-icon"
                              title="Delete this Patti record"
                              style={{ padding: '0.2rem', color: 'var(--danger)' }}
                              onClick={() => {
                                if (confirm(`Delete patti ${p.billNo}?`)) {
                                  DB.deletePatti(p.id);
                                  window.dispatchEvent(new CustomEvent('local-db-update'));
                                }
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-sidebar)', fontWeight: 700, fontSize: '0.85rem' }}>
                      <td colSpan={5} style={{ padding: '0.5rem' }}>Total ({sortedPattis.length} Bills)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{pattiGrandTotals.items.toFixed(2)}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--danger)' }}>₹{pattiGrandTotals.exp.toFixed(2)}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--success)' }}>₹{pattiGrandTotals.grand.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sales Report Tab */}
      {activeReport === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Billing Revenue</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalSalesRevenue.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Stock Costs</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalSalesCost.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Flat Discounts Allowed</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--danger)' }}>
                ₹{filteredSales.reduce((sum, s) => sum + s.discount, 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Profit Earned</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>₹{netProfit.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Bags Sold</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--primary)' }}>{totalBagsSold} Bags</h3>
            </div>
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Sales Transactions Journal</h3>
            {filteredSales.length > 0 ? (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesSort('invoiceNo')}>
                        Bill Number {salesSortField === 'invoiceNo' ? (salesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesSort('customerName')}>
                        Customer Details {salesSortField === 'customerName' ? (salesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th>Product Items sold</th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesSort('lotNo')}>
                        Lot No {salesSortField === 'lotNo' ? (salesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesSort('vehicleNo')}>
                        Vehicle No {salesSortField === 'vehicleNo' ? (salesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right' }}>Cost Price</th>
                      <th style={{ textAlign: 'right' }}>Sales Price</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Profit</th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesSort('netAmount')}>
                        Invoice Net {salesSortField === 'netAmount' ? (salesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredSales.flatMap((sale) => 
                      sale.items.map((item, idx) => {
                        const profitPerItem = item.salesPrice - item.purchasePrice;
                        const trace = getProductPurchaseDetails(item.productId, item.variationId);
                        return (
                          <tr key={`${sale.id}-${idx}`}>
                            {idx === 0 ? (
                              <td rowSpan={sale.items.length} style={{ fontWeight: 600, verticalAlign: 'top' }}>
                                {sale.invoiceNo}
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(sale.date)}</div>
                              </td>
                            ) : null}
                            {idx === 0 ? (
                              <td rowSpan={sale.items.length} style={{ verticalAlign: 'top' }}>
                                <div>{sale.customerName}</div>
                                <span className="badge badge-info">{sale.paymentMethod}</span>
                              </td>
                            ) : null}
                            <td>
                              <div>
                                {item.variationMark && item.name.includes(`(${item.variationMark})`)
                                  ? item.name.replace(` (${item.variationMark})`, '')
                                  : item.name}
                                {item.variationMark && (
                                  <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', padding: '0.05rem 0.25rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px' }}>
                                    {item.variationMark}
                                  </span>
                                )}
                                {item.bags && item.bags > 0 && (
                                  <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    [{item.bags} Bags]
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {trace.lotNo !== '-' ? (
                                <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {trace.lotNo}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                            <td>
                              {trace.vehicleNo !== '-' ? (
                                <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {trace.vehicleNo}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{item.salesPrice.toFixed(2)}</td>
                            <td style={{ textAlign: 'center' }}>{item.qty}</td>
                            <td style={{ textAlign: 'right', color: 'var(--success)' }}>₹{(profitPerItem * item.qty).toFixed(2)}</td>
                            {idx === 0 ? (
                              <td rowSpan={sale.items.length} style={{ textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>
                                ₹{sale.total.toFixed(2)}
                              </td>
                            ) : null}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No sales records found for this range.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchases Report Tab */}
      {activeReport === 'purchases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div className="grid-2">
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Purchase Invoices</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{totalPurchaseCount} Bills</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Assets Purchase Cost</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalPurchaseVal.toFixed(2)}</h3>
            </div>
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Supplier Purchases Details</h3>
            {filteredPurchases.length > 0 ? (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handlePurchasesSort('invoiceNo')}>
                        Invoice Number {purchasesSortField === 'invoiceNo' ? (purchasesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handlePurchasesSort('supplier')}>
                        Supplier {purchasesSortField === 'supplier' ? (purchasesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handlePurchasesSort('lotNo')}>
                        Lot No {purchasesSortField === 'lotNo' ? (purchasesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handlePurchasesSort('vehicleNo')}>
                        Vehicle / Mark {purchasesSortField === 'vehicleNo' ? (purchasesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th>Product Items bought</th>
                      <th style={{ textAlign: 'center' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Cost Price</th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handlePurchasesSort('totalCost')}>
                        Total Cost {purchasesSortField === 'totalCost' ? (purchasesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredPurchases.flatMap((pur) => 
                      pur.items.map((item, idx) => (
                        <tr key={`${pur.id}-${idx}`}>
                          {idx === 0 ? (
                            <td rowSpan={pur.items.length} style={{ fontWeight: 600, verticalAlign: 'top' }}>
                              {pur.invoiceNo}
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(pur.date)}</div>
                            </td>
                          ) : null}
                          {idx === 0 ? (
                            <td rowSpan={pur.items.length} style={{ verticalAlign: 'top' }}>
                              <div>{suppliers.find(s => s.id === pur.supplierId)?.name || pur.supplierId}</div>
                              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }} className="badge badge-warning">{pur.paymentStatus}</div>
                            </td>
                          ) : null}
                          {idx === 0 ? (
                            <td rowSpan={pur.items.length} style={{ verticalAlign: 'top' }}>
                              {pur.lotNo ? (
                                <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {pur.lotNo}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                          ) : null}
                          {idx === 0 ? (
                            <td rowSpan={pur.items.length} style={{ verticalAlign: 'top' }}>
                              {pur.vehicleNo ? (
                                <div>
                                  <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {pur.vehicleNo}
                                  </span>
                                  {pur.vehicleMark && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                      Mark: {pur.vehicleMark}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                          ) : null}
                          <td>
                            {item.variationMark && item.name.includes(`(${item.variationMark})`)
                              ? item.name.replace(` (${item.variationMark})`, '')
                              : item.name}
                            {item.variationMark && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', padding: '0.05rem 0.25rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px' }}>
                                {item.variationMark}
                              </span>
                            )}
                            {item.bags && item.bags > 0 && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                [{item.bags} Bags]
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.qty}</td>
                          <td style={{ textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No purchase transactions logged for this range.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sales & Profit Wise Report Tab */}
      {activeReport === 'sales_profit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Sales Revenue</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalSalesRevenue.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cost of Goods Sold</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalSalesCost.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gross Sales Profit</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>₹{netProfit.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>General Expenses</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--danger)' }}>₹{periodExpenses.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Operating Profit</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)', textShadow: '0 0 10px rgba(16,185,129,0.2)' }}>
                ₹{netOperatingProfit.toFixed(2)}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Margin: {operatingProfitMarginPercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Sales & Profit Margins (Product Wise)</h3>
            {filteredSales.length > 0 ? (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesProfitSort('name')}>
                        Product Name {salesProfitSortField === 'name' ? (salesProfitSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesProfitSort('cost')}>
                        Purchase Cost {salesProfitSortField === 'cost' ? (salesProfitSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesProfitSort('sale')}>
                        Sales Price {salesProfitSortField === 'sale' ? (salesProfitSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesProfitSort('profitPerItem')}>
                        Profit Per Item {salesProfitSortField === 'profitPerItem' ? (salesProfitSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesProfitSort('qty')}>
                        Quantity Sold {salesProfitSortField === 'qty' ? (salesProfitSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSalesProfitSort('totalProfit')}>
                        Total Profit Earned {salesProfitSortField === 'totalProfit' ? (salesProfitSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSalesProfitItems.map((aggItem) => {
                      const unitProfit = aggItem.sale - aggItem.cost;
                      const totalItemProfit = unitProfit * aggItem.qty;
                      return (
                        <tr key={aggItem.id}>
                          <td style={{ fontWeight: 600 }}>
                            {aggItem.variationMark && aggItem.name.includes(`(${aggItem.variationMark})`)
                              ? aggItem.name.replace(` (${aggItem.variationMark})`, '')
                              : aggItem.name}
                            {aggItem.variationMark && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', padding: '0.05rem 0.25rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px' }}>
                                {aggItem.variationMark}
                              </span>
                            )}
                            {aggItem.bags > 0 && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                [{aggItem.bags} Bags]
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>₹{aggItem.cost.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>₹{aggItem.sale.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)' }}>+ ₹{unitProfit.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>{aggItem.qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                            ₹{totalItemProfit.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No sales data compiled for this range.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Wise Inventory Report Tab */}
      {activeReport === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Stock Quantity</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{totalStockQty} Items</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inventory Cost Value</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalStockCostVal.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inventory Retail Value</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalStockRetailVal.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Potential Profit</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>₹{totalPotentialProfit.toFixed(2)}</h3>
            </div>
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Stock Assets Ledger</h3>
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('name')}>
                      Product Name {stockSortField === 'name' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('variationMark')}>
                      Mark {stockSortField === 'variationMark' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('lotNo')}>
                      Lot No {stockSortField === 'lotNo' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('vehicleNo')}>
                      Vehicle No {stockSortField === 'vehicleNo' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('barcode')}>
                      Barcode {stockSortField === 'barcode' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('category')}>
                      Category {stockSortField === 'category' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('currentStock')}>
                      In Stock {stockSortField === 'currentStock' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('purchasePrice')}>
                      Cost Price {stockSortField === 'purchasePrice' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('costVal')}>
                      Total Cost Value {stockSortField === 'costVal' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('salesPrice')}>
                      Retail Price {stockSortField === 'salesPrice' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('retailVal')}>
                      Total Retail Value {stockSortField === 'retailVal' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStockSort('potentialProf')}>
                      Potential Profit {stockSortField === 'potentialProf' ? (stockSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStockValuation.map(item => {
                    const costVal = item.currentStock * item.purchasePrice;
                    const retailVal = item.currentStock * item.salesPrice;
                    const potentialProf = retailVal - costVal;
                    const isOutOfStock = item.currentStock === 0;
                    const isLowStock = item.currentStock <= item.minStockAlert;
                    const [prodId, varId] = item.id.split('-');
                    const trace = getProductPurchaseDetails(prodId, varId);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{item.name}</div>
                        </td>
                        <td>
                          {item.variationMark ? (
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px', fontWeight: 600 }}>
                              {item.variationMark}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {trace.lotNo !== '-' ? (
                            <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {trace.lotNo}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {trace.vehicleNo !== '-' ? (
                            <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {trace.vehicleNo}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'Courier New', fontWeight: 600 }}>{item.barcode}</td>
                        <td><span className="badge badge-info">{item.category}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{Number(item.currentStock.toFixed(3))} {item.unit}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>₹{costVal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.salesPrice.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>₹{retailVal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>₹{potentialProf.toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-warning' : 'badge-success'}`}>
                            {isOutOfStock ? 'OUT' : isLowStock ? 'LOW' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mark Wise Sales & Stock Valuation Report Tab */}
      {activeReport === 'mark_wise' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mark Sales Qty</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{Number(totalMarkSalesQty.toFixed(3))} Units</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mark Sales Revenue</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalMarkSalesRevenue.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mark Net Sales Profit</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>₹{totalMarkSalesProfit.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Stock Level</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{Number(totalMarkStockQty.toFixed(3))} Items</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stock Value (Cost)</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalMarkStockCost.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stock Value (Retail)</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalMarkStockRetail.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Potential Stock Profit</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>₹{totalMarkStockProfit.toFixed(2)}</h3>
            </div>
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Mark Wise Sales & Stock Ledger</h3>
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('name')}>
                      Product Name {markWiseSortField === 'name' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('variationMark')}>
                      Mark {markWiseSortField === 'variationMark' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('lotNo')}>
                      Lot No {markWiseSortField === 'lotNo' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('vehicleNo')}>
                      Vehicle No {markWiseSortField === 'vehicleNo' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th>Barcode</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Unit</th>
                    <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('qtySold')}>
                      Qty Sold {markWiseSortField === 'qtySold' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('salesRevenue')}>
                      Sales Revenue {markWiseSortField === 'salesRevenue' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('salesProfit')}>
                      Sales Profit {markWiseSortField === 'salesProfit' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('currentStock')}>
                      Current Stock {markWiseSortField === 'currentStock' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('costVal')}>
                      Stock Value (Cost) {markWiseSortField === 'costVal' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('retailVal')}>
                      Stock Value (Retail) {markWiseSortField === 'retailVal' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleMarkWiseSort('potentialProf')}>
                      Potential Stock Profit {markWiseSortField === 'potentialProf' ? (markWiseSortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMarkWiseReportItems.map(item => {
                    const isOutOfStock = item.currentStock === 0;
                    const isLowStock = item.currentStock <= item.minStockAlert;
                    const [prodId, varId] = item.id.split('-');
                    const trace = getProductPurchaseDetails(prodId, varId);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{item.name}</div>
                        </td>
                        <td>
                          {item.variationMark ? (
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px', fontWeight: 600 }}>
                              {item.variationMark}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {trace.lotNo !== '-' ? (
                            <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {trace.lotNo}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {trace.vehicleNo !== '-' ? (
                            <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {trace.vehicleNo}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'Courier New', fontWeight: 600 }}>{item.barcode}</td>
                        <td><span className="badge badge-info">{item.category}</span></td>
                        <td style={{ textAlign: 'center' }}>{item.unit}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {Number(item.qtySold.toFixed(3))}
                          {item.bagsSold > 0 && (
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              [{item.bagsSold} Bags]
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>₹{item.salesRevenue.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: item.salesProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          ₹{item.salesProfit.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{Number(item.currentStock.toFixed(3))}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.costVal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.retailVal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>₹{item.potentialProf.toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-warning' : 'badge-success'}`}>
                            {isOutOfStock ? 'OUT' : isLowStock ? 'LOW' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Report Tab */}
      {activeReport === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Period Expenses</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--danger)' }}>
                ₹{periodExpenses.toFixed(2)}
              </h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transactions Logged</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
                {sortedFilteredExpenses.length} Outflows
              </h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Top Expense Category</span>
              <h3 style={{ fontSize: '1.15rem', marginTop: '0.25rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={reportTopCategory}>
                {reportTopCategory}
              </h3>
            </div>
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Period Expenses Details</h3>
            {sortedFilteredExpenses.length > 0 ? (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleExpensesSort('date')}>
                        Date & Time {expensesSortField === 'date' ? (expensesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleExpensesSort('category')}>
                        Category {expensesSortField === 'category' ? (expensesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th>Note / Description</th>
                      <th>Payment Method</th>
                      <th>Reference ID</th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleExpensesSort('amount')}>
                        Amount {expensesSortField === 'amount' ? (expensesSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td>{new Date(exp.date).toLocaleString()}</td>
                        <td>
                          <span className="badge badge-info" style={{ fontWeight: 600 }}>
                            {exp.category}
                          </span>
                        </td>
                        <td>{exp.note || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>}</td>
                        <td>
                          <span className={`badge ${
                            exp.paymentMethod === 'Cash' ? 'badge-success' :
                            exp.paymentMethod === 'UPI' ? 'badge-info' :
                            exp.paymentMethod === 'Card' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {exp.paymentMethod}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{exp.referenceNo || '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                          ₹{exp.amount.toFixed(2)}
                        </td>
                        <td>{(exp.createdBy || '').split('@')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-sidebar)', fontWeight: 700, fontSize: '0.85rem' }}>
                      <td colSpan={5} style={{ padding: '0.5rem' }}>Total Period General Expenses</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--danger)' }}>₹{periodExpenses.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No expenses logged for the selected period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Wise Sales Tab */}
      {activeReport === 'staff_wise' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Revenue Checked Out</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
                ₹{staffWiseStats.reduce((sum, s) => sum + s.totalRevenue, 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Profit Yield</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>
                ₹{staffWiseStats.reduce((sum, s) => sum + s.totalProfit, 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cash Collected</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--info)' }}>
                ₹{staffWiseStats.reduce((sum, s) => sum + s.cashCollected, 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Digital Collections</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--warning)' }}>
                ₹{staffWiseStats.reduce((sum, s) => sum + (s.upiCollected + s.cardCollected), 0).toFixed(2)}
              </h3>
            </div>
          </div>

          {/* Details Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Staff Performance Summary</h3>
            {staffWiseStats.length > 0 ? (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('email')}>
                        Staff Email {staffWiseSortField === 'email' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('role')}>
                        System Role {staffWiseSortField === 'role' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('invoiceCount')}>
                        Invoices Checked {staffWiseSortField === 'invoiceCount' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('totalRevenue')}>
                        Total Revenue {staffWiseSortField === 'totalRevenue' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('totalCost')}>
                        Total Goods Cost {staffWiseSortField === 'totalCost' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('totalProfit')}>
                        Net Profit Contribution {staffWiseSortField === 'totalProfit' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('cashCollected')}>
                        Cash Collections {staffWiseSortField === 'cashCollected' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('upiCollected')}>
                        UPI Collections {staffWiseSortField === 'upiCollected' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleStaffWiseSort('cardCollected')}>
                        Card Collections {staffWiseSortField === 'cardCollected' ? (staffWiseSortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStaffWiseStats.map((stat) => (
                      <tr key={stat.email}>
                        <td style={{ fontWeight: 600 }}>{stat.email}</td>
                        <td>
                          <span className={`badge ${
                            stat.role === 'Super Admin' ? 'badge-danger' : 
                            stat.role === 'Admin' ? 'badge-warning' : 
                            stat.role === 'System' ? 'badge-secondary' : 'badge-success'
                          }`}>
                            {stat.role}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{stat.invoiceCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{stat.totalRevenue.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{stat.totalCost.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>₹{stat.totalProfit.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--info)' }}>₹{stat.cashCollected.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--warning)' }}>₹{stat.upiCollected.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{stat.cardCollected.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No sales transactions found for the selected filters.
              </div>
            )}
          </div>
        </div>
      )}

      {isPrinting && createPortal(
        <div id="print-area-root">
          {renderPrintableReport()}
        </div>,
        document.body
      )}
    </div>
  );
};
