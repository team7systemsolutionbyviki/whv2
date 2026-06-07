import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { DB, Sale, Purchase } from '../utils/db';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  FileSpreadsheet,
  FileText,
  AlertCircle
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { sales, purchases, products, settings, dealers, suppliers } = useApp();
  const [activeReport, setActiveReport] = useState<'sales' | 'purchases' | 'sales_profit' | 'stock' | 'mark_wise' | 'staff_wise' | 'patti'>('sales');

  // Patti Report States
  const [selectedConsignment, setSelectedConsignment] = useState<{ vehicleNo: string; vehicleMark: string; lotNo: string; purchaseTotal: number; items: any[] } | null>(null);
  const [manualRent, setManualRent] = useState('0');
  const [manualLoading, setManualLoading] = useState('0');
  const [manualCommission, setManualCommission] = useState('0');
  const [manualOther, setManualOther] = useState('0');
  const [adjPurchases, setAdjPurchases] = useState('0');
  const [adjSales, setAdjSales] = useState('0');
  const [pattiSortKey, setPattiSortKey] = useState<string>('name');
  const [pattiSortOrder, setPattiSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pattiSearchQuery, setPattiSearchQuery] = useState<string>('');

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

  const consignments = React.useMemo(() => {
    const list: Array<{ vehicleNo: string; vehicleMark: string; lotNo: string; purchaseTotal: number; items: any[] }> = [];
    purchases.forEach(p => {
      const veh = p.vehicleNo || '';
      const mark = p.vehicleMark || '';
      const lot = p.lotNo || '';
      if (!veh && !mark && !lot) return;
      
      const key = `${veh}-${mark}-${lot}`;
      const existing = list.find(x => `${x.vehicleNo}-${x.vehicleMark}-${x.lotNo}` === key);
      
      const purchaseTotal = p.items.reduce((s, item) => s + item.total, 0);
      
      if (existing) {
        existing.purchaseTotal += purchaseTotal;
        p.items.forEach(item => {
          if (!existing.items.some(i => i.productId === item.productId && i.variationId === item.variationId)) {
            existing.items.push(item);
          }
        });
      } else {
        list.push({
          vehicleNo: veh,
          vehicleMark: mark,
          lotNo: lot,
          purchaseTotal,
          items: [...p.items]
        });
      }
    });
    return list;
  }, [purchases]);

  const getSalesForConsignment = (consignmentItems: any[]) => {
    let salesTotal = 0;
    sales.forEach(s => {
      if (s.status !== 'completed') return;
      s.items.forEach(item => {
        const match = consignmentItems.some(ci => 
          ci.productId === item.productId && 
          (!ci.variationId || ci.variationId === item.variationId)
        );
        if (match) {
          salesTotal += item.total;
        }
      });
    });
    return salesTotal;
  };

  // Compute itemized details for selected consignment (dues, balance stock, sales)
  const pattiItems = React.useMemo(() => {
    if (!selectedConsignment) return [];
    
    const itemsMap: {
      [key: string]: {
        productId: string;
        variationId?: string;
        name: string;
        variationMark?: string;
        purchasedQty: number;
        purchasedBags: number;
        purchasePrice: number;
        soldQty: number;
        soldBags: number;
        salesPrice: number;
        unit: string;
      }
    } = {};

    // 1. Purchases matching the selected consignment
    const matchingPurchases = purchases.filter(p => 
      (p.vehicleNo || '') === selectedConsignment.vehicleNo &&
      (p.vehicleMark || '') === selectedConsignment.vehicleMark &&
      (p.lotNo || '') === selectedConsignment.lotNo
    );

    matchingPurchases.forEach(p => {
      p.items.forEach(item => {
        const key = `${item.productId}-${item.variationId || ''}`;
        const prod = products.find(x => x.id === item.productId);
        const name = prod?.name || item.name;
        const variation = prod?.variations?.find(v => v.id === item.variationId);
        const mark = variation?.mark || item.variationMark;
        const unit = variation?.unit || prod?.unit || 'kg';

        if (itemsMap[key]) {
          const prevTotal = itemsMap[key].purchasedQty * itemsMap[key].purchasePrice;
          itemsMap[key].purchasedQty += item.qty;
          itemsMap[key].purchasedBags += item.bags || 0;
          itemsMap[key].purchasePrice = itemsMap[key].purchasedQty > 0 
            ? (prevTotal + item.total) / itemsMap[key].purchasedQty 
            : item.purchasePrice;
        } else {
          itemsMap[key] = {
            productId: item.productId,
            variationId: item.variationId,
            name,
            variationMark: mark,
            purchasedQty: item.qty,
            purchasedBags: item.bags || 0,
            purchasePrice: item.purchasePrice,
            soldQty: 0,
            soldBags: 0,
            salesPrice: 0,
            unit
          };
        }
      });
    });

    // 2. Sales matching these variation keys
    sales.forEach(s => {
      if (s.status !== 'completed') return;
      s.items.forEach(item => {
        const key = `${item.productId}-${item.variationId || ''}`;
        if (itemsMap[key]) {
          const prevTotal = itemsMap[key].soldQty * itemsMap[key].salesPrice;
          itemsMap[key].soldQty += item.qty;
          itemsMap[key].soldBags += item.bags || 0;
          itemsMap[key].salesPrice = itemsMap[key].soldQty > 0 
            ? (prevTotal + item.total) / itemsMap[key].soldQty 
            : item.salesPrice;
        }
      });
    });

    return Object.values(itemsMap);
  }, [selectedConsignment, purchases, sales, products]);

  // Filter & Sort consignment items
  const filteredSortedPattiItems = React.useMemo(() => {
    let list = [...pattiItems];

    if (pattiSearchQuery) {
      const q = pattiSearchQuery.toLowerCase();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.variationMark || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (pattiSortKey) {
        case 'name':
          valA = a.name + (a.variationMark || '');
          valB = b.name + (b.variationMark || '');
          break;
        case 'purchasedQty':
          valA = a.purchasedQty;
          valB = b.purchasedQty;
          break;
        case 'soldQty':
          valA = a.soldQty;
          valB = b.soldQty;
          break;
        case 'balanceStock':
          valA = a.purchasedQty - a.soldQty;
          valB = b.purchasedQty - b.soldQty;
          break;
        case 'purchasePrice':
          valA = a.purchasePrice;
          valB = b.purchasePrice;
          break;
        case 'salesPrice':
          valA = a.salesPrice;
          valB = b.salesPrice;
          break;
        case 'totalPurchase':
          valA = a.purchasedQty * a.purchasePrice;
          valB = b.purchasedQty * b.purchasePrice;
          break;
        case 'totalSales':
          valA = a.soldQty * a.salesPrice;
          valB = b.soldQty * b.salesPrice;
          break;
        default:
          valA = a.name;
          valB = b.name;
      }

      if (typeof valA === 'string') {
        return pattiSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return pattiSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    return list;
  }, [pattiItems, pattiSearchQuery, pattiSortKey, pattiSortOrder]);

  const handlePattiSort = (key: string) => {
    if (pattiSortKey === key) {
      setPattiSortOrder(pattiSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPattiSortKey(key);
      setPattiSortOrder('asc');
    }
  };

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

  // CSV Exporter helper
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let fileName = '';

    if (activeReport === 'sales') {
      headers = ['Bill Number', 'Customer', 'Date', 'Product', 'Bags', 'Qty Sold', 'Cost Price (INR)', 'Sales Price (INR)', 'Total Profit (INR)', 'Total Bill Value (INR)', 'Associated Vehicle No', 'Associated Lot No'];
      rows = filteredSales.flatMap(sale => 
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
      rows = filteredPurchases.flatMap(pur =>
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
      // Aggregate product totals
      const agg: { [key: string]: { name: string; cost: number; sale: number; qty: number; bags: number; variationMark?: string } } = {};
      filteredSales.forEach(sale => {
        sale.items.forEach(item => {
          const key = item.productId + (item.variationId ? '-' + item.variationId : '');
          if (agg[key]) {
            agg[key].qty += item.qty;
            agg[key].bags += item.bags || 0;
          } else {
            agg[key] = {
              name: item.name,
              cost: item.purchasePrice,
              sale: item.salesPrice,
              qty: item.qty,
              bags: item.bags || 0,
              variationMark: item.variationMark
            };
          }
        });
      });
      rows = Object.values(agg).map(item => [
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
      rows = stockItemsValuation.map(item => {
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
      rows = markWiseReportItems.map(item => {
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
      headers = [
        'Vehicle No', 'Vehicle Mark', 'Lot No', 
        'Total Sales Realization (INR)', 'Total Purchase Cost (INR)', 
        'Rent Expense (INR)', 'Loading Expense (INR)', 
        'Commission (INR)', 'Other Expense (INR)', 'Grand Total Net (INR)'
      ];
      const rent = parseFloat(manualRent) || 0;
      const loading = parseFloat(manualLoading) || 0;
      const comm = parseFloat(manualCommission) || 0;
      const other = parseFloat(manualOther) || 0;
      const totalExp = rent + loading + comm + other;
      const salesVal = parseFloat(adjSales) || 0;
      const purchVal = parseFloat(adjPurchases) || 0;
      const grandTotal = salesVal - purchVal - totalExp;
      rows = [[
        selectedConsignment?.vehicleNo || 'Manual',
        selectedConsignment?.vehicleMark || 'Manual',
        selectedConsignment?.lotNo || 'Manual',
        salesVal.toFixed(2),
        purchVal.toFixed(2),
        rent.toFixed(2),
        loading.toFixed(2),
        comm.toFixed(2),
        other.toFixed(2),
        grandTotal.toFixed(2)
      ]];
      fileName = `Patti_Bill_${selectedConsignment?.vehicleNo || 'Manual'}.csv`;
    } else {
      // Staff Wise Report
      headers = ['Staff Email', 'Role', 'Invoices Count', 'Revenue (INR)', 'Cost Value (INR)', 'Net Profit (INR)', 'Cash Collected (INR)', 'UPI Collected (INR)', 'Card Collected (INR)'];
      rows = staffWiseStats.map(stat => [
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
                  activeReport === 'stock' ? 'STOCK WISE INVENTORY VALUATION' : 
                  activeReport === 'mark_wise' ? 'MARK WISE SALES & STOCK REPORT' : 
                  activeReport === 'patti' ? 'PATTI BILL REPORT' : 'STAFF WISE SALES REPORT';
    
    if (activeReport === 'patti') {
      const rent = parseFloat(manualRent) || 0;
      const loading = parseFloat(manualLoading) || 0;
      const comm = parseFloat(manualCommission) || 0;
      const other = parseFloat(manualOther) || 0;
      const totalExp = rent + loading + comm + other;
      
      const salesVal = parseFloat(adjSales) || 0;
      const purchVal = parseFloat(adjPurchases) || 0;
      const grandTotal = salesVal - purchVal - totalExp;
      
      return (
        <div className="print-a4" style={{ fontFamily: 'var(--font-body)', background: '#fff', color: '#000', padding: '15mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textTransform: 'uppercase' }}>{settings.shopName || 'STORE REPORT'}</h2>
              <p style={{ fontSize: '0.8rem', margin: '2px 0' }}>{settings.address}</p>
              <p style={{ fontSize: '0.8rem', margin: '2px 0' }}>Phone: {settings.phone}</p>
              {settings.gstin && <p style={{ fontSize: '0.8rem', margin: '2px 0', fontWeight: 600 }}>GSTIN: {settings.gstin}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'indigo', marginBottom: '4px' }}>PATTI BILL REPORT</h3>
              <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div style={{ background: '#f9fafb', border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #eee', paddingBottom: '0.25rem' }}>CONSIGNMENT DETAILS</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Vehicle Number:</strong> {selectedConsignment?.vehicleNo || 'Manual'}</div>
              <div><strong>Vehicle Mark:</strong> {selectedConsignment?.vehicleMark || 'Manual'}</div>
              <div><strong>Lot Number:</strong> {selectedConsignment?.lotNo || 'Manual'}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #333' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '150px' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Total Sales Realization</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'right', fontWeight: 600 }}>₹{salesVal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Less: Total Purchase Cost</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'right', color: '#dc2626' }}>- ₹{purchVal.toFixed(2)}</td>
              </tr>
              <tr style={{ background: '#f9fafb', fontWeight: 600 }}>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Gross Realization (Sales - Cost)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>₹{(salesVal - purchVal).toFixed(2)}</td>
              </tr>
              
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 600, paddingTop: '1.5rem' }}>EXPENSES / DEDUCTIONS</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'right' }}></td>
              </tr>
              <tr>
                <td style={{ padding: '8px', paddingLeft: '20px', borderBottom: '1px solid #eee' }}>Rent Expense</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>₹{rent.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', paddingLeft: '20px', borderBottom: '1px solid #eee' }}>Loading Expense</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>₹{loading.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', paddingLeft: '20px', borderBottom: '1px solid #eee' }}>Commission</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>₹{comm.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', paddingLeft: '20px', borderBottom: '1px solid #ddd' }}>Other Expenses</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>₹{other.toFixed(2)}</td>
              </tr>
              <tr style={{ background: '#f9fafb', fontWeight: 600 }}>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Total Expenses Deducted</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'right', color: '#dc2626' }}>- ₹{totalExp.toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ background: '#f3f4f6', fontWeight: 800, borderTop: '2px solid #333' }}>
                <td style={{ padding: '10px', fontSize: '1.1rem' }}>GRAND TOTAL (Net Surplus / Settlement)</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '1.1rem', color: grandTotal >= 0 ? '#16a34a' : '#dc2626' }}>
                  ₹{grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <h4 style={{ margin: '20px 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#1e1b4b', textTransform: 'uppercase' }}>Consignment Items & Sales Realization</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ddd' }}>Item / Mark</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #ddd' }}>Purchased Qty</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #ddd' }}>Sold Qty</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #ddd' }}>Bal Stock</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #ddd' }}>Cost Price</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #ddd' }}>Sale Price</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #ddd' }}>Total Cost</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #ddd' }}>Total Sale</th>
              </tr>
            </thead>
            <tbody>
              {pattiItems.map((item, idx) => {
                const balQty = item.purchasedQty - item.soldQty;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontWeight: 600 }}>{item.name} {item.variationMark ? `(${item.variationMark})` : ''}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.purchasedQty} {item.unit}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.soldQty} {item.unit}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>{balQty} {item.unit}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>₹{item.salesPrice.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>₹{(item.purchasedQty * item.purchasePrice).toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 600 }}>₹{(item.soldQty * item.salesPrice).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <div>
              <p style={{ margin: 0 }}>Customer/Supplier Signature</p>
              <div style={{ borderTop: '1px solid #aaa', width: '150px', marginTop: '2.5rem' }}></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0 }}>Authorized Signatory</p>
              <div style={{ borderTop: '1px solid #aaa', width: '150px', marginTop: '2.5rem', marginLeft: 'auto' }}></div>
            </div>
          </div>
        </div>
      );
    }
    
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
            </tr>
          </thead>
          <tbody>
            {activeReport === 'sales' && filteredSales.map((sale) => 
              sale.items.map((item, idx) => {
                const profitPerItem = item.salesPrice - item.purchasePrice;
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
                      {(() => {
                        const trace = getProductPurchaseDetails(item.productId, item.variationId);
                        if (trace.lotNo !== '-' || trace.vehicleNo !== '-') {
                          return (
                            <div style={{ fontSize: '7.5px', color: '#666', marginTop: '2px' }}>
                              {trace.lotNo !== '-' && <span>Lot: {trace.lotNo}</span>}
                              {trace.vehicleNo !== '-' && <span style={{ marginLeft: '4px' }}>Veh: {trace.vehicleNo}</span>}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
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
            {activeReport === 'purchases' && filteredPurchases.map((pur) => 
              pur.items.map((item, idx) => (
                <tr key={`${pur.id}-${idx}`}>
                  {idx === 0 ? (
                    <td rowSpan={pur.items.length} style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                      {pur.invoiceNo}
                      <div style={{ fontSize: '8px', color: '#555' }}>{formatDateTime(pur.date)}</div>
                      {pur.vehicleNo && <div style={{ fontSize: '7.5px', color: 'var(--primary)', marginTop: '2px' }}>🚚 {pur.vehicleNo}</div>}
                      {pur.lotNo && <div style={{ fontSize: '7.5px', color: 'var(--success)' }}>📦 Lot: {pur.lotNo}</div>}
                      {pur.vehicleMark && <div style={{ fontSize: '7.5px', color: 'var(--warning)' }}>🏷️ Mark: {pur.vehicleMark}</div>}
                    </td>
                  ) : null}
                  {idx === 0 ? (
                    <td rowSpan={pur.items.length} style={{ border: '1px solid #ddd', padding: '6px' }}>
                      {suppliers.find(s => s.id === pur.supplierId)?.name || pur.supplierId}
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
            {activeReport === 'sales_profit' && Object.values(
              filteredSales.reduce((acc, sale) => {
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
              }, {} as { [key: string]: { id: string; name: string; cost: number; sale: number; qty: number; bags: number; variationMark?: string } })
            ).map((aggItem) => {
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
            {activeReport === 'stock' && stockItemsValuation.map(item => {
              const costVal = item.currentStock * item.purchasePrice;
              const retailVal = item.currentStock * item.salesPrice;
              const potentialProf = retailVal - costVal;
              return (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                    {item.name}
                    {(() => {
                      const [prodId, varId] = item.id.split('-');
                      const trace = getProductPurchaseDetails(prodId, varId);
                      if (trace.lotNo !== '-' || trace.vehicleNo !== '-') {
                        return (
                          <div style={{ fontSize: '7.5px', color: '#666', fontWeight: 'normal', marginTop: '2px' }}>
                            {trace.lotNo !== '-' && <span>Lot: {trace.lotNo}</span>}
                            {trace.vehicleNo !== '-' && <span style={{ marginLeft: '4px' }}>Veh: {trace.vehicleNo}</span>}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.variationMark || '-'}</td>
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
            {activeReport === 'mark_wise' && markWiseReportItems.map(item => {
              return (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontWeight: 600 }}>
                    {item.name}
                    {(() => {
                      const [prodId, varId] = item.id.split('-');
                      const trace = getProductPurchaseDetails(prodId, varId);
                      if (trace.lotNo !== '-' || trace.vehicleNo !== '-') {
                        return (
                          <div style={{ fontSize: '7.5px', color: '#666', fontWeight: 'normal', marginTop: '2px' }}>
                            {trace.lotNo !== '-' && <span>Lot: {trace.lotNo}</span>}
                            {trace.vehicleNo !== '-' && <span style={{ marginLeft: '4px' }}>Veh: {trace.vehicleNo}</span>}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.variationMark || '-'}</td>
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
            {activeReport === 'staff_wise' && staffWiseStats.map(stat => (
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
            onClick={() => {
              setActiveReport('patti');
              setSelectedConsignment(null);
            }}
          >
            Patti Bill Report
          </button>
        </div>
      </div>

      {/* Date Filters Controller */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {activeReport === 'stock' || activeReport === 'patti' ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--warning)' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {activeReport === 'stock' 
                ? 'Stock Wise Report shows real-time warehouse inventory values. Date filters are not applicable.'
                : 'Patti Bill Report matches purchases and sales for the selected consignment/vehicle. Date filters are not applicable.'
              }
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

        {!isPrinting && filterType === 'custom' && activeReport !== 'stock' && activeReport !== 'patti' && (
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
        {activeReport !== 'patti' && (
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
        )}
      </div>

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
                      <th>Bill Number</th>
                      <th>Customer Details</th>
                      <th>Product Items sold</th>
                      <th style={{ textAlign: 'right' }}>Cost Price</th>
                      <th style={{ textAlign: 'right' }}>Sales Price</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Profit</th>
                      <th style={{ textAlign: 'right' }}>Invoice Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.flatMap((sale) => 
                      sale.items.map((item, idx) => {
                        const profitPerItem = item.salesPrice - item.purchasePrice;
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
                              {(() => {
                                const trace = getProductPurchaseDetails(item.productId, item.variationId);
                                if (trace.lotNo !== '-' || trace.vehicleNo !== '-') {
                                  return (
                                    <div style={{ marginTop: '0.2rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.7rem' }}>
                                      {trace.lotNo !== '-' && <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>Lot: {trace.lotNo}</span>}
                                      {trace.vehicleNo !== '-' && <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>Veh: {trace.vehicleNo}</span>}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
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
                      <th>Invoice Number</th>
                      <th>Supplier</th>
                      <th>Product Items bought</th>
                      <th style={{ textAlign: 'center' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Cost Price</th>
                      <th style={{ textAlign: 'right' }}>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.flatMap((pur) => 
                      pur.items.map((item, idx) => (
                        <tr key={`${pur.id}-${idx}`}>
                          {idx === 0 ? (
                            <td rowSpan={pur.items.length} style={{ fontWeight: 600, verticalAlign: 'top' }}>
                              {pur.invoiceNo}
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(pur.date)}</div>
                              {pur.vehicleNo && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.2rem' }}>🚚 {pur.vehicleNo}</div>}
                              {pur.lotNo && <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '0.1rem' }}>📦 Lot: {pur.lotNo}</div>}
                              {pur.vehicleMark && <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '0.1rem' }}>🏷️ Mark: {pur.vehicleMark}</div>}
                            </td>
                          ) : null}
                          {idx === 0 ? (
                            <td rowSpan={pur.items.length} style={{ verticalAlign: 'top' }}>
                              <div>{suppliers.find(s => s.id === pur.supplierId)?.name || pur.supplierId}</div>
                              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }} className="badge badge-warning">{pur.paymentStatus}</div>
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
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cost Value of Goods</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>₹{totalSalesCost.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Profit Yield</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--success)' }}>₹{netProfit.toFixed(2)}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Profit Margin</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--warning)' }}>
                {profitMarginPercent.toFixed(1)}%
              </h3>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Bags Sold</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--primary)' }}>{totalBagsSold} Bags</h3>
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
                      <th>Product Name</th>
                      <th style={{ textAlign: 'right' }}>Purchase Cost</th>
                      <th style={{ textAlign: 'right' }}>Sales Price</th>
                      <th style={{ textAlign: 'right' }}>Profit Per Item</th>
                      <th style={{ textAlign: 'center' }}>Quantity Sold</th>
                      <th style={{ textAlign: 'right' }}>Total Profit Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Compute aggregations */}
                    {Object.values(
                      filteredSales.reduce((acc, sale) => {
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
                      }, {} as { [key: string]: { id: string; name: string; cost: number; sale: number; qty: number; bags: number; variationMark?: string } })
                    ).map((aggItem) => {
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
                    <th>Product Name</th>
                    <th>Mark</th>
                    <th>Barcode</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>In Stock</th>
                    <th style={{ textAlign: 'right' }}>Cost Price</th>
                    <th style={{ textAlign: 'right' }}>Total Cost Value</th>
                    <th style={{ textAlign: 'right' }}>Retail Price</th>
                    <th style={{ textAlign: 'right' }}>Total Retail Value</th>
                    <th style={{ textAlign: 'right' }}>Potential Profit</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItemsValuation.map(item => {
                    const costVal = item.currentStock * item.purchasePrice;
                    const retailVal = item.currentStock * item.salesPrice;
                    const potentialProf = retailVal - costVal;
                    const isOutOfStock = item.currentStock === 0;
                    const isLowStock = item.currentStock <= item.minStockAlert;
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{item.name}</div>
                          {(() => {
                            const [prodId, varId] = item.id.split('-');
                            const trace = getProductPurchaseDetails(prodId, varId);
                            if (trace.lotNo !== '-' || trace.vehicleNo !== '-') {
                              return (
                                <div style={{ marginTop: '0.2rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.7rem', fontWeight: 'normal' }}>
                                  {trace.lotNo !== '-' && <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>Lot: {trace.lotNo}</span>}
                                  {trace.vehicleNo !== '-' && <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>Veh: {trace.vehicleNo}</span>}
                                </div>
                              );
                            }
                            return null;
                          })()}
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
                    <th>Product Name</th>
                    <th>Mark</th>
                    <th>Barcode</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Unit</th>
                    <th style={{ textAlign: 'center' }}>Qty Sold</th>
                    <th style={{ textAlign: 'right' }}>Sales Revenue</th>
                    <th style={{ textAlign: 'right' }}>Sales Profit</th>
                    <th style={{ textAlign: 'center' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Stock Value (Cost)</th>
                    <th style={{ textAlign: 'right' }}>Stock Value (Retail)</th>
                    <th style={{ textAlign: 'right' }}>Potential Stock Profit</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {markWiseReportItems.map(item => {
                    const isOutOfStock = item.currentStock === 0;
                    const isLowStock = item.currentStock <= item.minStockAlert;
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{item.name}</div>
                          {(() => {
                            const [prodId, varId] = item.id.split('-');
                            const trace = getProductPurchaseDetails(prodId, varId);
                            if (trace.lotNo !== '-' || trace.vehicleNo !== '-') {
                              return (
                                <div style={{ marginTop: '0.2rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.7rem', fontWeight: 'normal' }}>
                                  {trace.lotNo !== '-' && <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>Lot: {trace.lotNo}</span>}
                                  {trace.vehicleNo !== '-' && <span style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>Veh: {trace.vehicleNo}</span>}
                                </div>
                              );
                            }
                            return null;
                          })()}
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
                      <th>Staff Email</th>
                      <th>System Role</th>
                      <th style={{ textAlign: 'center' }}>Invoices Checked</th>
                      <th style={{ textAlign: 'right' }}>Total Revenue</th>
                      <th style={{ textAlign: 'right' }}>Total Goods Cost</th>
                      <th style={{ textAlign: 'right' }}>Net Profit Contribution</th>
                      <th style={{ textAlign: 'right' }}>Cash Collections</th>
                      <th style={{ textAlign: 'right' }}>UPI Collections</th>
                      <th style={{ textAlign: 'right' }}>Card Collections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffWiseStats.map((stat) => (
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
      {/* Patti Bill Report Tab */}
      {activeReport === 'patti' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left panel: List of Consignments */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Select Consignment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.8rem', textAlign: 'left', width: '100%' }}
                onClick={() => {
                  setSelectedConsignment(null);
                  setAdjPurchases('0');
                  setAdjSales('0');
                  setManualRent('0');
                  setManualLoading('0');
                  setManualCommission('0');
                  setManualOther('0');
                }}
              >
                📝 Create Manual Patti Bill
              </button>
              
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>
              
              {consignments.map((c, i) => {
                const isSelected = selectedConsignment && 
                  selectedConsignment.vehicleNo === c.vehicleNo &&
                  selectedConsignment.vehicleMark === c.vehicleMark &&
                  selectedConsignment.lotNo === c.lotNo;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedConsignment(c);
                      setAdjPurchases(c.purchaseTotal.toString());
                      setAdjSales(getSalesForConsignment(c.items).toString());
                      setManualRent('0');
                      setManualLoading('0');
                      setManualCommission('0');
                      setManualOther('0');
                    }}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary)' : 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.15s'
                    }}
                    className={!isSelected ? 'glass-panel-hover' : ''}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'white' : 'var(--text-primary)' }}>
                      🚚 {c.vehicleNo || 'No Vehicle'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                      <span>Mark: {c.vehicleMark || '-'}</span>
                      <span>Lot: {c.lotNo || '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Patti Worksheet */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
              
              {/* Form inputs */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Patti Bill Worksheet
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Vehicle Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedConsignment ? selectedConsignment.vehicleNo : ''}
                      disabled={!!selectedConsignment}
                      placeholder="e.g. KA-12-AB-3456"
                    />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Mark / Mark</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedConsignment ? selectedConsignment.vehicleMark : ''}
                      disabled={!!selectedConsignment}
                      placeholder="e.g. APPLE-A"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Associated Lot No.</label>
                  <input
                    type="text"
                    className="form-control"
                    value={selectedConsignment ? selectedConsignment.lotNo : ''}
                    disabled={!!selectedConsignment}
                    placeholder="e.g. LOT-100"
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Total Purchases Value (Cost) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={adjPurchases}
                      onChange={e => setAdjPurchases(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Sales Value (Revenue) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={adjSales}
                      onChange={e => setAdjSales(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>
                
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Expenses & Deductions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Rent / Freight (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualRent}
                      onChange={e => setManualRent(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Loading / Unloading (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualLoading}
                      onChange={e => setManualLoading(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Commission / Brokerage (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualCommission}
                      onChange={e => setManualCommission(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Other Expenses (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualOther}
                      onChange={e => setManualOther(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Bill Preview */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', color: 'var(--primary)' }}>
                  Patti Bill Preview
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Vehicle No:</span>
                    <span style={{ fontWeight: 600 }}>{selectedConsignment?.vehicleNo || 'Manual'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Vehicle Mark:</span>
                    <span style={{ fontWeight: 600 }}>{selectedConsignment?.vehicleMark || 'Manual'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Lot No:</span>
                    <span style={{ fontWeight: 600 }}>{selectedConsignment?.lotNo || 'Manual'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-color)', margin: '0.5rem 0' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Sales (A)</span>
                    <span style={{ fontWeight: 600 }}>₹{(parseFloat(adjSales) || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>Total Purchases (B)</span>
                    <span style={{ fontWeight: 600 }}>- ₹{(parseFloat(adjPurchases) || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--success)' }}>
                    <span>Gross Realization (A - B)</span>
                    <span>₹{((parseFloat(adjSales) || 0) - (parseFloat(adjPurchases) || 0)).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-color)', margin: '0.5rem 0' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rent:</span>
                    <span>₹{(parseFloat(manualRent) || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Loading:</span>
                    <span>₹{(parseFloat(manualLoading) || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Commission:</span>
                    <span>₹{(parseFloat(manualCommission) || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Other Exp:</span>
                    <span>₹{(parseFloat(manualOther) || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--danger)' }}>
                    <span>Total Expenses (C)</span>
                    <span>₹{((parseFloat(manualRent) || 0) + (parseFloat(manualLoading) || 0) + (parseFloat(manualCommission) || 0) + (parseFloat(manualOther) || 0)).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ borderTop: '2px solid var(--border-color)', margin: '0.5rem 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700 }}>
                  <span>Grand Total (Net)</span>
                  <span style={{ color: ((parseFloat(adjSales) || 0) - (parseFloat(adjPurchases) || 0) - ((parseFloat(manualRent) || 0) + (parseFloat(manualLoading) || 0) + (parseFloat(manualCommission) || 0) + (parseFloat(manualOther) || 0))) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ₹{((parseFloat(adjSales) || 0) - (parseFloat(adjPurchases) || 0) - ((parseFloat(manualRent) || 0) + (parseFloat(manualLoading) || 0) + (parseFloat(manualCommission) || 0) + (parseFloat(manualOther) || 0))).toFixed(2)}
                  </span>
                </div>
              </div>

            </div>

            {/* Item-wise Sales & Balance Stock Details */}
            {selectedConsignment && (
              <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--primary)' }}>Item-wise Sales & Balance Stock Details</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Analyze individual product sales, average realizations, and warehouse stock balances for this vehicle.
                    </p>
                  </div>
                  
                  {/* Search filter input */}
                  <div style={{ position: 'relative', width: '260px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search items / marks..."
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', height: '34px' }}
                      value={pattiSearchQuery}
                      onChange={e => setPattiSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handlePattiSort('name')}>
                          Item / Mark {pattiSortKey === 'name' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer', textAlign: 'center', userSelect: 'none' }} onClick={() => handlePattiSort('purchasedQty')}>
                          Purchased Qty {pattiSortKey === 'purchasedQty' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer', textAlign: 'center', userSelect: 'none' }} onClick={() => handlePattiSort('soldQty')}>
                          Sold Qty {pattiSortKey === 'soldQty' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer', textAlign: 'center', userSelect: 'none' }} onClick={() => handlePattiSort('balanceStock')}>
                          Balance Stock {pattiSortKey === 'balanceStock' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer', textAlign: 'right', userSelect: 'none' }} onClick={() => handlePattiSort('purchasePrice')}>
                          Purchase Rate {pattiSortKey === 'purchasePrice' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer', textAlign: 'right', userSelect: 'none' }} onClick={() => handlePattiSort('salesPrice')}>
                          Sales Rate {pattiSortKey === 'salesPrice' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer', textAlign: 'right', userSelect: 'none' }} onClick={() => handlePattiSort('totalPurchase')}>
                          Total Cost {pattiSortKey === 'totalPurchase' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th style={{ cursor: 'pointer', textAlign: 'right', userSelect: 'none' }} onClick={() => handlePattiSort('totalSales')}>
                          Total Sales {pattiSortKey === 'totalSales' ? (pattiSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSortedPattiItems.map((item, idx) => {
                        const balanceQty = item.purchasedQty - item.soldQty;
                        const balanceBags = item.purchasedBags - item.soldBags;
                        const costVal = item.purchasedQty * item.purchasePrice;
                        const salesVal = item.soldQty * item.salesPrice;

                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>
                              {item.name}
                              {item.variationMark && (
                                <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', padding: '0.1rem 0.35rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '3px', fontWeight: 700 }}>
                                  {item.variationMark}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.purchasedQty.toFixed(1)} {item.unit}
                              {item.purchasedBags > 0 && (
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({item.purchasedBags} bags)
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', color: 'var(--success)' }}>
                              {item.soldQty.toFixed(1)} {item.unit}
                              {item.soldBags > 0 && (
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({item.soldBags} bags)
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: balanceQty > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                              {balanceQty.toFixed(1)} {item.unit}
                              {balanceBags > 0 && (
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                  ({balanceBags} bags)
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>₹{item.purchasePrice.toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{item.salesPrice.toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{costVal.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>₹{salesVal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {filteredSortedPattiItems.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No items found matching the filter search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
