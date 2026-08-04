import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DB, Supplier, SupplierPayment, PattiRecord, CommissionPurchase, CommissionPurchaseItem } from '../utils/db';
import { getTamilDay } from '../utils/translit';
import { 
  Plus, 
  Search, 
  X, 
  Printer, 
  TrendingDown, 
  TrendingUp, 
  UserCheck, 
  Truck, 
  Warehouse, 
  Receipt, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clipboard, 
  AlertCircle, 
  MapPin, 
  Phone, 
  ArrowDown, 
  ArrowUp,
  FileSpreadsheet
} from 'lucide-react';

export const CommissionGoods: React.FC = () => {
  const { 
    suppliers, 
    pattis, 
    supplierPayments, 
    refreshData, 
    showToast, 
    settings 
  } = useApp();

  const [subTab, setSubTab] = useState<'entry' | 'suppliers' | 'ledger' | 'history'>('entry');
  const [commissionPurchases, setCommissionPurchases] = useState<CommissionPurchase[]>([]);

  // Load purchases local state
  const loadCommissionPurchases = () => {
    setCommissionPurchases(DB.getCommissionPurchases());
  };

  useEffect(() => {
    loadCommissionPurchases();
  }, [pattis, supplierPayments]);

  // Form States (Purchase Entry)
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [lorryNo, setLorryNo] = useState('');
  const [vehicleMark, setVehicleMark] = useState('');
  const [transportName, setTransportName] = useState('');
  const [driverMob, setDriverMob] = useState('');
  const [truckOwnerMob, setTruckOwnerMob] = useState('');
  const [driverName, setDriverName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  
  // Lorry weights
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  
  // Marks & Bags dynamic grid input
  const [markItems, setMarkItems] = useState<CommissionPurchaseItem[]>([{ mark: '', bags: 0, salesPrice: 0 }]);
  
  // Freight & Charges
  const [freightRate, setFreightRate] = useState('');
  const [totalFreight, setTotalFreight] = useState('');
  const [advance, setAdvance] = useState('');
  
  // Bank Details
  const [bankName, setBankName] = useState('');
  const [bankAccNo, setBankAccNo] = useState('');
  const [bankIFSC, setBankIFSC] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  
  // Courier
  const [courierAddress, setCourierAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Suppliers Directory search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  
  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payType, setPayType] = useState<'debit' | 'credit'>('debit'); // debit = we pay them; credit = we receive refund

  // Ledger Tab
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState<Supplier | { id: 'ALL'; name: string } | null>(null);
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // View details modal
  const [selectedPurchase, setSelectedPurchase] = useState<CommissionPurchase | null>(null);

  // Dynamic calculations for dynamic ledger balances
  const supplierBalances = useMemo(() => {
    const balances: { [key: string]: number } = {};
    
    // Initialize standard dues
    suppliers.forEach(s => {
      balances[s.id] = 0;
    });

    // Subtraction (Debits / Amount Out): Commission Purchases Lorry Freight
    commissionPurchases.forEach(p => {
      if (balances[p.supplierId] !== undefined) {
        balances[p.supplierId] -= p.totalFreight;
      }
    });

    // Subtraction (Debits / Amount Out): Supplier Payments (Type debit: payment made; Type credit: refund received)
    supplierPayments.forEach(pm => {
      if (balances[pm.supplierId] !== undefined) {
        const isCredit = pm.type === 'credit';
        balances[pm.supplierId] += isCredit ? pm.amount : -pm.amount;
      }
    });

    // Addition (Credits / Amount In): Pattis net proceed payout
    pattis.forEach(pt => {
      const match = suppliers.find(s => s.name.toLowerCase() === pt.name.toLowerCase());
      if (match) {
        const grandTotal = pt.grandTotal !== undefined ? pt.grandTotal : (
          pt.items.reduce((sum, i) => sum + (i.amount || 0), 0) +
          pt.expenses.rent + pt.expenses.loading + pt.expenses.commission +
          (pt.expenses.marketFee || 0) + (pt.expenses.levi || 0) +
          (pt.expenses.associationFund || 0) + (pt.expenses.saleExp || 0) +
          (pt.expenses.loadingHamali || 0) + (pt.expenses.cashAdvance || 0) +
          (pt.expenses.phoneExp || 0) + (pt.expenses.aadatCommission || 0) +
          (pt.expenses.otherExpense || 0) +
          pt.expenses.otherList.reduce((sum, o) => sum + (o.amount || 0), 0) -
          pt.lessAmount
        );
        balances[match.id] += grandTotal;
      }
    });

    return balances;
  }, [suppliers, commissionPurchases, supplierPayments, pattis]);

  // Unified Supplier Ledger entries
  const getSupplierLedger = (supplierId: string | 'ALL') => {
    let entries: Array<{
      id: string;
      date: string;
      description: string;
      reference: string;
      credit: number; // amount in (sales/proceeds)
      debit: number;  // amount out (lorry freight/payments)
      type: 'freight' | 'payment' | 'patti';
      supplierName?: string;
    }> = [];

    const selectedSupps = supplierId === 'ALL' ? suppliers : suppliers.filter(s => s.id === supplierId);

    selectedSupps.forEach(s => {
      // 1. Commission Purchases Lorry Freight (debit)
      commissionPurchases
        .filter(p => p.supplierId === s.id)
        .forEach(p => {
          entries.push({
            id: p.id,
            date: p.date,
            description: `Lorry Freight (Lorry: ${p.lorryNo || 'N/A'}${p.vehicleMark ? ' | Mark: ' + p.vehicleMark : ''}, Bags: ${p.totalBags})`,
            reference: p.billNo,
            credit: 0,
            debit: p.totalFreight,
            type: 'freight',
            supplierName: s.name
          });
        });

      // 2. Payments (debit)
      supplierPayments
        .filter(pm => pm.supplierId === s.id)
        .forEach(pm => {
          const isCredit = pm.type === 'credit';
          entries.push({
            id: pm.id,
            date: pm.date,
            description: isCredit 
              ? `Refund Received ${pm.note ? '— ' + pm.note : ''}`
              : `Payment Settlement ${pm.note ? '— ' + pm.note : ''}`,
            reference: pm.referenceNo || 'N/A',
            credit: isCredit ? pm.amount : 0,
            debit: isCredit ? 0 : pm.amount,
            type: 'payment',
            supplierName: s.name
          });
        });

      // 3. Patti Bills (credit)
      pattis
        .filter(pt => pt.name.toLowerCase() === s.name.toLowerCase())
        .forEach(pt => {
          const grandTotal = pt.grandTotal !== undefined ? pt.grandTotal : (
            pt.items.reduce((sum, i) => sum + (i.amount || 0), 0) +
            pt.expenses.rent + pt.expenses.loading + pt.expenses.commission +
            (pt.expenses.marketFee || 0) + (pt.expenses.levi || 0) +
            (pt.expenses.associationFund || 0) + (pt.expenses.saleExp || 0) +
            (pt.expenses.loadingHamali || 0) + (pt.expenses.cashAdvance || 0) +
            (pt.expenses.phoneExp || 0) + (pt.expenses.aadatCommission || 0) +
            (pt.expenses.otherExpense || 0) +
            pt.expenses.otherList.reduce((sum, o) => sum + (o.amount || 0), 0) -
            pt.lessAmount
          );
          entries.push({
            id: pt.id,
            date: pt.date,
            description: `Net Patti Bill proceeds (Mark: ${pt.mark || 'N/A'}, Vehicle: ${pt.vehicleNo || 'N/A'})`,
            reference: pt.billNo,
            credit: grandTotal,
            debit: 0,
            type: 'patti',
            supplierName: s.name
          });
        });
    });

    // Sort chronologically (oldest first) to build running balance
    entries.sort((a, b) => a.date.localeCompare(b.date));

    let balance = 0;
    return entries.map(e => {
      balance += e.credit - e.debit;
      return { ...e, balance };
    });
  };

  const currentLedgerEntries = useMemo(() => {
    if (!selectedLedgerSupplier) return [];
    let list = getSupplierLedger(selectedLedgerSupplier.id);
    
    // Apply filters
    if (ledgerStartDate) {
      list = list.filter(e => e.date >= ledgerStartDate);
    }
    if (ledgerEndDate) {
      list = list.filter(e => e.date <= ledgerEndDate);
    }
    
    return list;
  }, [selectedLedgerSupplier, commissionPurchases, supplierPayments, pattis, ledgerStartDate, ledgerEndDate]);

  const ledgerTotalCredit = currentLedgerEntries.reduce((s, e) => s + e.credit, 0);
  const ledgerTotalDebit = currentLedgerEntries.reduce((s, e) => s + e.debit, 0);

  // Dynamic values calculated during entry
  const calculatedTotalBags = markItems.reduce((sum, it) => sum + (Number(it.bags) || 0), 0);
  const calculatedBalanceFreight = (Number(totalFreight) || 0) - (Number(advance) || 0);

  // Dynamic row actions for dynamic table
  const handleAddMarkRow = () => {
    setMarkItems([...markItems, { mark: '', bags: 0, salesPrice: 0 }]);
  };

  const handleRemoveMarkRow = (idx: number) => {
    if (markItems.length === 1) {
      setMarkItems([{ mark: '', bags: 0, salesPrice: 0 }]);
      return;
    }
    setMarkItems(markItems.filter((_, i) => i !== idx));
  };

  const handleMarkItemChange = (idx: number, field: keyof CommissionPurchaseItem, val: string | number) => {
    const updated = [...markItems];
    if (field === 'bags') {
      updated[idx].bags = Math.max(0, parseInt(val.toString()) || 0);
    } else if (field === 'salesPrice') {
      updated[idx].salesPrice = Math.max(0, parseFloat(val.toString()) || 0);
    } else {
      updated[idx].mark = val.toString().toUpperCase();
    }
    setMarkItems(updated);
  };

  // Submit commission purchase
  const handleSaveCommissionPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Select a supplier first', 'warning');
      return;
    }
    if (!billNo) {
      showToast('Bill Number is required', 'warning');
      return;
    }
    const validItems = markItems.filter(item => item.mark.trim() && item.bags > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one valid mark and bags count', 'warning');
      return;
    }

    const newPurchase: CommissionPurchase = {
      id: 'CP-' + Date.now(),
      billNo: billNo.trim(),
      date: purchaseDate,
      supplierId: selectedSupplierId,
      fromCity: fromCity.trim() || undefined,
      toCity: toCity.trim() || undefined,
      lorryNo: lorryNo.trim().toUpperCase() || undefined,
      vehicleMark: vehicleMark.trim().toUpperCase() || undefined,
      transportName: transportName.trim().toUpperCase() || undefined,
      driverMob: driverMob.trim() || undefined,
      truckOwnerMob: truckOwnerMob.trim() || undefined,
      driverName: driverName.trim() || undefined,
      licenseNo: licenseNo.trim() || undefined,
      items: validItems,
      freightRate: freightRate ? parseFloat(freightRate) || undefined : undefined,
      totalFreight: parseFloat(totalFreight) || 0,
      advance: parseFloat(advance) || 0,
      balanceFreight: calculatedBalanceFreight,
      courierAddress: courierAddress.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccNo: bankAccNo.trim() || undefined,
      bankIFSC: bankIFSC.trim().toUpperCase() || undefined,
      bankBranch: bankBranch.trim() || undefined,
      totalBags: calculatedTotalBags,
      grossWeight: grossWeight ? parseFloat(grossWeight) || undefined : undefined,
      tareWeight: tareWeight ? parseFloat(tareWeight) || undefined : undefined,
      netWeight: grossWeight && tareWeight ? (parseFloat(grossWeight) - parseFloat(tareWeight)) || undefined : undefined,
      notes: notes.trim() || undefined
    };

    DB.saveCommissionPurchase(newPurchase);
    
    // Debit Lorry Freight to the supplier's balance (Outstanding reduces)
    DB.updateSupplierDue(selectedSupplierId, -newPurchase.totalFreight);

    // Refresh
    refreshData();
    loadCommissionPurchases();
    
    // Reset Form
    setBillNo('');
    setFromCity('');
    setToCity('');
    setLorryNo('');
    setVehicleMark('');
    setTransportName('');
    setDriverMob('');
    setTruckOwnerMob('');
    setDriverName('');
    setLicenseNo('');
    setGrossWeight('');
    setTareWeight('');
    setMarkItems([{ mark: '', bags: 0, salesPrice: 0 }]);
    setFreightRate('');
    setTotalFreight('');
    setAdvance('');
    setBankName('');
    setBankAccNo('');
    setBankIFSC('');
    setBankBranch('');
    setCourierAddress('');
    setNotes('');

    showToast(`Commission purchase goods bill ${newPurchase.billNo} saved!`, 'success');
  };

  // Delete commission purchase
  const handleDeletePurchase = (p: CommissionPurchase) => {
    if (!window.confirm(`Delete commission purchase bill "${p.billNo}"? Lorry freight charge of ₹${p.totalFreight.toFixed(2)} will be reversed.`)) return;
    
    DB.deleteCommissionPurchase(p.id);
    // Reverse supplier due adjustment
    DB.updateSupplierDue(p.supplierId, p.totalFreight);

    refreshData();
    loadCommissionPurchases();
    showToast('Commission purchase deleted', 'danger');
  };

  // Record direct supplier payments
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'warning');
      return;
    }

    const isCredit = payType === 'credit';
    const payment = {
      id: 'SP-' + Date.now().toString().slice(-8),
      supplierId: paySupplier.id,
      date: new Date().toISOString().split('T')[0],
      amount,
      type: payType,
      referenceNo: payRef.trim() || undefined,
      note: payNote.trim() || undefined,
    };

    DB.saveSupplierPayment(payment);
    // Debit payment made reduces due: i.e. -amount. Credit refund increases due: i.e. +amount.
    DB.updateSupplierDue(paySupplier.id, isCredit ? amount : -amount);

    refreshData();
    setIsPaymentModalOpen(false);
    showToast(isCredit ? `Refund of ₹${amount} recorded` : `Payment of ₹${amount} recorded`, 'success');

    // Update ledger if open
    if (selectedLedgerSupplier?.id === paySupplier.id) {
      setSelectedLedgerSupplier({ ...paySupplier });
    }
  };

  // Add new Supplier Form Submission
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      showToast('Name and Phone are required', 'warning');
      return;
    }
    const newSupplier: Supplier = {
      id: 'S-' + Date.now().toString().slice(-6),
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      due: 0
    };
    DB.saveSupplier(newSupplier);
    refreshData();
    setIsSupplierFormOpen(false);
    setFormName(''); setFormPhone(''); setFormAddress('');
    showToast(`Supplier ${newSupplier.name} registered`, 'success');
  };

  // Delete Supplier
  const handleDeleteSupplier = (s: Supplier) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    const list = DB.getSuppliers().filter(x => x.id !== s.id);
    DB.setJSON('billing_suppliers', list);
    refreshData();
    showToast('Supplier deleted', 'danger');
    if (selectedLedgerSupplier?.id === s.id) setSelectedLedgerSupplier(null);
  };

  // Split items array into N columns for structured display
  const splitItemsIntoColumns = (items: CommissionPurchaseItem[], count: number) => {
    const cols: CommissionPurchaseItem[][] = Array.from({ length: count }, () => []);
    items.forEach((item, idx) => {
      cols[idx % count].push(item);
    });
    return cols;
  };

  // Print Lorry Goods bill replica matching attached layout
  const handlePrintFreightBill = (p: CommissionPurchase) => {
    const supp = suppliers.find(s => s.id === p.supplierId);
    const splitCols = splitItemsIntoColumns(p.items, 4);

    const win = window.open('', '_blank');
    if (!win) return;

    // Header layout replica
    const headerHtml = `
      <div style="text-align: center; border-bottom: 2px double #000; padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 10px; float: left; text-transform: uppercase;">Subject to AHMEDNAGAR Jurisdiction</span>
        <h2 style="font-size: 24px; font-weight: 800; margin: 5px 0 0 0; font-family: sans-serif; letter-spacing: 0.5px;">${settings.shopName || 'ABHIJEET VIJAYKUMAR BORUDE'}</h2>
        <div style="font-size: 11px; font-weight: bold; margin: 2px 0;">ONION MERCHANT & ORDER SUPPLIERS</div>
        <div style="font-size: 11px;">Shop No. 63-64, Nepti Upbazar Samiti, Ahmednagar - 414 001</div>
        <div style="font-size: 11px; margin-top: 4px; font-weight: 600;">
          Vijaykumar: 9422220516 &bull; Ganesh: 9422222516 &bull; Abhijeet: 9422222072, 9260306030
        </div>
      </div>
    `;

    // Row rendering in 4 parallel columns
    const maxColRows = Math.max(...splitCols.map(c => c.length));
    let rowsHtml = '';
    for (let r = 0; r < maxColRows; r++) {
      rowsHtml += `<tr style="border-bottom: 1px solid #ddd;">`;
      for (let c = 0; c < 4; c++) {
        const item = splitCols[c][r];
        if (item) {
          rowsHtml += `
            <td style="padding: 4px 6px; text-align: center; border-right: 1px solid #ddd; font-weight: 600;">${item.mark}</td>
            <td style="padding: 4px 6px; text-align: center; border-right: 1px solid #000;">${item.bags}</td>
          `;
        } else {
          rowsHtml += `
            <td style="border-right: 1px solid #ddd;"></td>
            <td style="border-right: 1px solid #000;"></td>
          `;
        }
      }
      rowsHtml += `</tr>`;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Commission Goods Bill - ${p.billNo}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #000;
            margin: 20px;
            line-height: 1.35;
          }
          table.main-grid {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
          }
          table.main-grid th {
            background: #e5e7eb;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            border: 1px solid #000;
            padding: 5px;
          }
          table.main-grid td {
            font-size: 11.5px;
            height: 20px;
          }
          .flex-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
          }
          .flex-row div {
            flex: 1;
          }
          .box-container {
            display: flex;
            gap: 20px;
            margin-top: 15px;
            font-size: 11px;
          }
          .box {
            flex: 1;
            border: 1px solid #000;
            padding: 8px;
            border-radius: 4px;
          }
          @media print {
            body { margin: 10px; }
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        
        <div class="flex-row">
          <div><strong>M/s:</strong> ${supp?.name || 'Unknown supplier'}</div>
          <div style="text-align: right;"><strong>Date:</strong> ${new Date(p.date).toLocaleDateString('en-IN')}</div>
        </div>
        <div class="flex-row" style="border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 12px;">
          <div><strong>Bill No.:</strong> ${p.billNo}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; border: 1px solid #000; padding: 8px; border-radius: 4px; font-size: 11px; margin-bottom: 12px; background: #fafafa;">
          <div>
            <strong>Lorry details:</strong>
            <div style="margin-top: 2px;">From: ${p.fromCity || '-'} &bull; To: ${p.toCity || '-'}</div>
            <div>Lorry No: <strong>${p.lorryNo || '-'}</strong></div>
            <div>Vehicle Mark: <strong>${p.vehicleMark || '-'}</strong></div>
            <div>Transport: ${p.transportName || '-'}</div>
          </div>
          <div>
            <strong>Driver Details:</strong>
            <div style="margin-top: 2px;">Driver Name: ${p.driverName || '-'}</div>
            <div>Mobile: ${p.driverMob || '-'}</div>
            <div>License No: ${p.licenseNo || '-'}</div>
          </div>
          <div>
            <strong>Owner Info:</strong>
            <div style="margin-top: 2px;">Owner Mobile: ${p.truckOwnerMob || '-'}</div>
          </div>
          <div>
            <strong>Lorry Weights:</strong>
            <div style="margin-top: 2px;">Gross Weight: ${p.grossWeight ? p.grossWeight + ' Kg' : '-'}</div>
            <div>Tare Weight: ${p.tareWeight ? p.tareWeight + ' Kg' : '-'}</div>
            <div>Net Goods Wt: <strong>${p.netWeight ? p.netWeight + ' Kg' : '-'}</strong></div>
          </div>
        </div>

        <table class="main-grid">
          <thead>
            <tr>
              <th style="width: 15%; border-right: 1px solid #ddd;">MARK</th>
              <th style="width: 10%; border-right: 2px solid #000;">Bags</th>
              <th style="width: 15%; border-right: 1px solid #ddd;">MARK</th>
              <th style="width: 10%; border-right: 2px solid #000;">Bags</th>
              <th style="width: 15%; border-right: 1px solid #ddd;">MARK</th>
              <th style="width: 10%; border-right: 2px solid #000;">Bags</th>
              <th style="width: 15%; border-right: 1px solid #ddd;">MARK</th>
              <th style="width: 10%;">Bags</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #fafafa;">
              <td colspan="7" style="padding: 6px; text-align: right; border-right: 1px solid #ddd;">Total Bags:</td>
              <td style="padding: 6px; text-align: center;">${p.totalBags}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; border: 1px solid #000; margin-top: 12px; padding: 8px; border-radius: 4px; font-size: 12px; background: #fafafa; font-weight: bold;">
          <span>Freight Rate: ${p.freightRate ? '₹' + p.freightRate.toFixed(2) : '-'}</span>
          <span>Total Freight: ₹${p.totalFreight.toFixed(2)}</span>
          <span>Lorry Advance: ₹${p.advance.toFixed(2)}</span>
          <span style="color: #b91c1c;">Balance Freight: ₹${p.balanceFreight.toFixed(2)}</span>
        </div>

        <div class="box-container">
          <div class="box">
            <strong>Courier Address:</strong>
            <div style="margin-top: 4px; white-space: pre-line;">${p.courierAddress || 'Borude Mala, Ahmednagar - 414003, MH'}</div>
          </div>
          <div class="box">
            <strong>Bank Details:</strong>
            <div style="margin-top: 4px;">Bank: <strong>${p.bankName || 'ICICI BANK'}</strong></div>
            <div>A/C: ${p.bankAccNo || '777705576030'}</div>
            <div>IFSC: ${p.bankIFSC || 'ICIC0006458'}</div>
            <div>Branch: ${p.bankBranch || 'Savedi'}</div>
          </div>
        </div>

        ${p.notes ? `
          <div style="border: 1px solid #ddd; padding: 6px; border-radius: 4px; font-size: 11px; margin-top: 10px;">
            <strong>Notes:</strong> ${p.notes}
          </div>
        ` : ''}

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
          <div>Generated on: ${new Date().toLocaleString()} (${getTamilDay(new Date())})</div>
          <div style="width: 180px; text-align: center; border-top: 1px solid #000; padding-top: 4px;">Authorized Signatory</div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    setTimeout(() => win.print(), 350);
  };

  // Print ledger report
  const handlePrintLedger = () => {
    if (!selectedLedgerSupplier) return;
    const w = window.open('', '_blank');
    if (!w) return;
    
    const rows = currentLedgerEntries.map((e, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding:6px 8px;">${idx + 1}</td>
        <td style="padding:6px 8px;">${new Date(e.date).toLocaleDateString()}</td>
        <td style="padding:6px 8px;">${selectedLedgerSupplier.id === 'ALL' ? `[${e.supplierName}] ` : ''}${e.description}</td>
        <td style="padding:6px 8px;text-align:right;color:${e.credit > 0 ? '#16a34a' : '#6b7280'};">${e.credit > 0 ? '₹' + e.credit.toFixed(2) : '-'}</td>
        <td style="padding:6px 8px;text-align:right;color:${e.debit > 0 ? '#dc2626' : '#6b7280'};">${e.debit > 0 ? '₹' + e.debit.toFixed(2) : '-'}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600;color:${e.balance >= 0 ? '#16a34a' : '#dc2626'};">
          ₹${Math.abs(e.balance).toFixed(2)} ${e.balance >= 0 ? '(Cr)' : '(Dr)'}
        </td>
      </tr>
    `).join('');

    const netBal = ledgerTotalCredit - ledgerTotalDebit;

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Commission Goods Supplier Ledger</title>
        <style>
          body{font-family:Arial,sans-serif;color:#111;margin:24px;} 
          table{width:100%;border-collapse:collapse;} 
          th{background:#f3f4f6;padding:8px;border:1px solid #d1d5db;text-align:left;font-size:12px;} 
          td{border:1px solid #e5e7eb;font-size:12px;}
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
          <div>
            <h2 style="margin:0;font-size:18px;">${settings.shopName}</h2>
            <p style="margin:2px 0;font-size:12px;">${settings.address}</p>
            <p style="margin:2px 0;font-size:12px;">Ph: ${settings.phone}</p>
          </div>
          <div style="text-align:right;">
            <h3 style="margin:0;font-size:15px;color:#4f46e5;">COMMISSION GOODS SUPPLIER LEDGER</h3>
            <p style="font-size:12px;margin:2px 0;">Supplier: <strong>${selectedLedgerSupplier.name}</strong></p>
            ${ledgerStartDate || ledgerEndDate ? `<p style="font-size:11px;margin:2px 0;">Period: ${ledgerStartDate || 'Start'} to ${ledgerEndDate || 'Today'}</p>` : ''}
            <p style="font-size:12px;margin:2px 0;">Outstanding Dues: <strong style="color:${netBal >= 0 ? '#16a34a' : '#dc2626'};">
              ₹${Math.abs(netBal).toFixed(2)} ${netBal >= 0 ? '(We Owe Supplier)' : '(Supplier Owes Us)'}
            </strong></p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Description</th>
              <th style="text-align:right;">Amount In (Cr)</th>
              <th style="text-align:right;">Amount Out (Dr)</th>
              <th style="text-align:right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background:#f9fafb;font-weight:700;">
              <td colspan="3" style="padding:8px;text-align:right;">TOTAL</td>
              <td style="padding:8px;text-align:right;color:#16a34a;">₹${ledgerTotalCredit.toFixed(2)}</td>
              <td style="padding:8px;text-align:right;color:#dc2626;">₹${ledgerTotalDebit.toFixed(2)}</td>
              <td style="padding:8px;text-align:right;color:${netBal >= 0 ? '#16a34a' : '#dc2626'};">
                ₹${Math.abs(netBal).toFixed(2)} ${netBal >= 0 ? '(Cr)' : '(Dr)'}
              </td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:32px;display:flex;justify-content:space-between;">
          <div style="font-size:11px;color:#6b7280;">Printed on: ${new Date().toLocaleString()} (${getTamilDay(new Date())})</div>
          <div style="width:180px;text-align:center;">
            <div style="border-top:1px solid #333;padding-top:4px;font-size:11px;">Authorized Signatory</div>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Purchase Commission Goods</h1>
          <p>Commission lorry goods inward, transport freight invoicing, and supplier ledger sheets</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className={`btn ${subTab === 'entry' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('entry')}
          >
            <Truck size={15} /> Inward Entry
          </button>
          <button 
            className={`btn ${subTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('suppliers')}
          >
            <UserCheck size={15} /> Supplier Directory
          </button>
          <button 
            className={`btn ${subTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setSubTab('ledger');
              if (suppliers.length > 0 && !selectedLedgerSupplier) {
                setSelectedLedgerSupplier(suppliers[0]);
              }
            }}
          >
            <FileText size={15} /> Supplier Ledger
          </button>
          <button 
            className={`btn ${subTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('history')}
          >
            <Warehouse size={15} /> Lorry History
          </button>
        </div>
      </div>

      {/* ==================== 1. INWARD ENTRY TAB ==================== */}
      {subTab === 'entry' && (
        <form onSubmit={handleSaveCommissionPurchase} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileSpreadsheet size={18} style={{ color: 'var(--primary)' }} />
            <span>New Commission Goods Inward Bill</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>Link Supplier *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  className="form-control"
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  required
                >
                  <option value="">— Select Supplier —</option>
                  {suppliers.map(s => {
                    const bal = supplierBalances[s.id] || 0;
                    const balStr = bal >= 0 ? `(We owe: ₹${bal.toFixed(0)})` : `(Owes us: ₹${Math.abs(bal).toFixed(0)})`;
                    return (
                      <option key={s.id} value={s.id}>{s.name} {balStr}</option>
                    );
                  })}
                </select>
                <button type="button" className="btn btn-secondary btn-icon" onClick={() => setIsSupplierFormOpen(true)} title="Register Supplier">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Bill / Inward No. *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. 00071"
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input 
                type="date" 
                className="form-control"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>City Route (From / To)</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="text" className="form-control" placeholder="From" value={fromCity} onChange={e => setFromCity(e.target.value)} />
                <input type="text" className="form-control" placeholder="To" value={toCity} onChange={e => setToCity(e.target.value)} />
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0.5rem 0 -0.5rem 0', color: 'var(--text-secondary)' }}>Transport & Lorry Profile</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>Lorry / Vehicle Number</label>
              <input type="text" className="form-control" placeholder="e.g. TN-93-B-8638" value={lorryNo} onChange={e => setLorryNo(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Vehicle Mark</label>
              <input type="text" className="form-control" placeholder="e.g. O.K. / V.K." value={vehicleMark} onChange={e => setVehicleMark(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Transport Name</label>
              <input type="text" className="form-control" placeholder="e.g. MAHALAXMI" value={transportName} onChange={e => setTransportName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Truck Driver Name</label>
              <input type="text" className="form-control" placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Driver Mob. / License No.</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="text" className="form-control" placeholder="Mobile" value={driverMob} onChange={e => setDriverMob(e.target.value)} />
                <input type="text" className="form-control" placeholder="License" value={licenseNo} onChange={e => setLicenseNo(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Truck Owner Mobile</label>
              <input type="text" className="form-control" placeholder="Owner mobile" value={truckOwnerMob} onChange={e => setTruckOwnerMob(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Total Lorry Weight (Gross Weight) (Kg)</label>
              <input type="number" className="form-control" placeholder="e.g. 24000" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Vehicle Weight (Tare Weight) (Kg)</label>
              <input type="number" className="form-control" placeholder="e.g. 9000" value={tareWeight} onChange={e => setTareWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Net Goods Weight (Kg)</label>
              <input 
                type="text" 
                className="form-control" 
                value={grossWeight && tareWeight ? (parseFloat(grossWeight) - parseFloat(tareWeight)) + ' Kg' : '—'} 
                disabled 
                style={{ background: 'var(--bg-app)', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Onion Goods Marks Dynamic Input Grid */}
          <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>Onion / Goods Marks Inward Grid</h4>
              <button type="button" className="btn btn-secondary btn-icon" onClick={handleAddMarkRow} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                <Plus size={14} style={{ marginRight: '3px' }} /> Add Mark
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '0.75rem' }}>
              {markItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>Mark #{idx+1}</span>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => handleRemoveMarkRow(idx)} style={{ color: 'var(--danger)', padding: '0.2rem' }}>
                      <X size={15} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Mark Name *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. A, 10"
                        value={item.mark}
                        onChange={e => handleMarkItemChange(idx, 'mark', e.target.value)}
                        style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Bags *</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Bags Qty"
                        value={item.bags || ''}
                        onChange={e => handleMarkItemChange(idx, 'bags', e.target.value)}
                        style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Unit</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value="Kg"
                        disabled
                        style={{ padding: '0.3rem', fontSize: '0.8rem', background: 'var(--bg-app)', textAlign: 'center', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Kg Selling Price *</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="₹/Kg"
                        value={item.salesPrice || ''}
                        onChange={e => handleMarkItemChange(idx, 'salesPrice', e.target.value)}
                        style={{ padding: '0.3rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', paddingRight: '1rem', color: 'var(--primary)' }}>
              Total Lorry Inward Bags: {calculatedTotalBags}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Lorry Freight Settlement */}
            <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: 0, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Lorry Freight & Advances</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Freight Rate (optional)</label>
                  <input type="number" className="form-control" value={freightRate} onChange={e => setFreightRate(e.target.value)} placeholder="Rate" />
                </div>
                <div className="form-group">
                  <label>Total Freight *</label>
                  <input type="number" className="form-control" value={totalFreight} onChange={e => setTotalFreight(e.target.value)} placeholder="Total" required />
                </div>
                <div className="form-group">
                  <label>Lorry Advance</label>
                  <input type="number" className="form-control" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="Paid Advance" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', color: 'var(--danger)' }}>
                <span>Balance Freight Payable:</span>
                <span>₹{calculatedBalanceFreight.toFixed(2)}</span>
              </div>
            </div>

            {/* Transporter Bank Details & Courier */}
            <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: 0, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Supplier Bank & Courier Addresses</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" className="form-control" placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
                <input type="text" className="form-control" placeholder="Account Number" value={bankAccNo} onChange={e => setBankAccNo(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" className="form-control" placeholder="IFSC Code" value={bankIFSC} onChange={e => setBankIFSC(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
                <input type="text" className="form-control" placeholder="Branch" value={bankBranch} onChange={e => setBankBranch(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
              </div>
              <input type="text" className="form-control" placeholder="Courier Office Address" value={courierAddress} onChange={e => setCourierAddress(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Notes / Comments</label>
            <textarea className="form-control" rows={2} placeholder="Enter any extra details or lorry dispatch logs..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>
              💾 Save Commission Inward Bill
            </button>
          </div>
        </form>
      )}

      {/* ==================== 2. SUPPLIER DIRECTORY TAB ==================== */}
      {subTab === 'suppliers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search supplier directory..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setIsSupplierFormOpen(true)}>
              <Plus size={15} /> Add Supplier
            </button>
          </div>

          {/* Directory Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {suppliers
              .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery))
              .map(s => {
                const bal = supplierBalances[s.id] || 0;
                return (
                  <div key={s.id} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        background: 'linear-gradient(135deg, var(--info), var(--primary))', 
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontWeight: 700 
                      }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 700, margin: 0 }}>{s.name}</h4>
                        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Phone size={11} /> {s.phone}</span>
                          {s.address && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><MapPin size={11} /> {s.address}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ledger Account:</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: bal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {bal >= 0 ? `₹${bal.toFixed(2)} (Cr)` : `₹${Math.abs(bal).toFixed(2)} (Dr)`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => { setSelectedLedgerSupplier(s); setSubTab('ledger'); }}
                      >
                        <FileText size={12} /> Ledger
                      </button>
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => { setPaySupplier(s); setPayType('debit'); setPayAmount(bal < 0 ? Math.abs(bal).toFixed(2) : ''); setPayRef(''); setPayNote(''); setIsPaymentModalOpen(true); }}
                      >
                        <DollarSign size={12} /> Pay Supplier
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => { setPaySupplier(s); setPayType('credit'); setPayAmount(''); setPayRef(''); setPayNote(''); setIsPaymentModalOpen(true); }}
                      >
                        <Plus size={12} /> Refund
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleDeleteSupplier(s)} style={{ padding: '0.3rem', color: 'var(--danger)' }} title="Delete Supplier">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ==================== 3. SUPPLIER LEDGER TAB ==================== */}
      {subTab === 'ledger' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left panel: Supplier list */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search supplier..." 
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                style={{ padding: '0.4rem 0.4rem 0.4rem 26px', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div 
                onClick={() => setSelectedLedgerSupplier({ id: 'ALL', name: 'ALL SUPPLIERS' })}
                style={{ 
                  padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                  background: selectedLedgerSupplier?.id === 'ALL' ? 'var(--primary)' : 'var(--bg-input)',
                  border: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: 700,
                  color: selectedLedgerSupplier?.id === 'ALL' ? 'white' : 'var(--text-primary)'
                }}
              >
                📊 FULL CONSOLIDATED LEDGER
              </div>
              
              {suppliers
                .filter(s => s.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || s.phone.includes(ledgerSearch))
                .map(s => {
                  const isSelected = selectedLedgerSupplier?.id === s.id;
                  const bal = supplierBalances[s.id] || 0;
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => setSelectedLedgerSupplier(s)}
                      style={{ 
                        padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                        background: isSelected ? 'var(--primary)' : 'var(--bg-input)',
                        border: '1px solid var(--border-color)', fontSize: '0.8rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: isSelected ? 'white' : 'var(--text-primary)' }}>{s.name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? 'white' : (bal >= 0 ? 'var(--success)' : 'var(--danger)') }}>
                        ₹{Math.abs(bal).toFixed(0)} {bal >= 0 ? 'Cr' : 'Dr'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right panel: Ledger transactions list */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedLedgerSupplier ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Supplier Ledger: {selectedLedgerSupplier.name}</h3>
                    {selectedLedgerSupplier.id !== 'ALL' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Phone: {suppliers.find(x => x.id === selectedLedgerSupplier.id)?.phone || '-'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={handlePrintLedger}>
                      <Printer size={13} style={{ marginRight: '3px' }} /> Print Ledger
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span>From:</span>
                    <input type="date" className="form-control" style={{ padding: '0.25rem', fontSize: '0.8rem' }} value={ledgerStartDate} onChange={e => setLedgerStartDate(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span>To:</span>
                    <input type="date" className="form-control" style={{ padding: '0.25rem', fontSize: '0.8rem' }} value={ledgerEndDate} onChange={e => setLedgerEndDate(e.target.value)} />
                  </div>
                  {(ledgerStartDate || ledgerEndDate) && (
                    <button className="btn btn-ghost btn-icon" onClick={() => { setLedgerStartDate(''); setLedgerEndDate(''); }} title="Clear dates">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Grid stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--success)', display: 'block' }}>TOTAL AMOUNT IN (CREDIT)</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)', margin: '0.2rem 0 0 0' }}>₹{ledgerTotalCredit.toFixed(2)}</h4>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--danger)', display: 'block' }}>TOTAL AMOUNT OUT (DEBIT)</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--danger)', margin: '0.2rem 0 0 0' }}>₹{ledgerTotalDebit.toFixed(2)}</h4>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block' }}>ACCOUNT DUE OUTSTANDING</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: (ledgerTotalCredit - ledgerTotalDebit) >= 0 ? 'var(--success)' : 'var(--danger)', margin: '0.2rem 0 0 0' }}>
                      ₹{Math.abs(ledgerTotalCredit - ledgerTotalDebit).toFixed(2)} {(ledgerTotalCredit - ledgerTotalDebit) >= 0 ? 'Cr' : 'Dr'}
                    </h4>
                  </div>
                </div>

                {/* Table */}
                {currentLedgerEntries.length > 0 ? (
                  <div className="table-container" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                    <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th style={{ width: '100px' }}>Date</th>
                          <th>Particulars</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Amount In (Cr)</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Amount Out (Dr)</th>
                          <th style={{ width: '130px', textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentLedgerEntries.map((e, idx) => (
                          <tr key={e.id}>
                            <td>{idx + 1}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString()}</td>
                            <td>
                              <div>
                                {selectedLedgerSupplier.id === 'ALL' && <strong style={{ color: 'var(--primary)' }}>[{e.supplierName}] </strong>}
                                {e.description}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', color: e.credit > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                              {e.credit > 0 ? `₹${e.credit.toFixed(2)}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right', color: e.debit > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {e.debit > 0 ? `₹${e.debit.toFixed(2)}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: e.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              ₹{Math.abs(e.balance).toFixed(2)} {e.balance >= 0 ? 'Cr' : 'Dr'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    No ledger transactions recorded for this period.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={32} style={{ opacity: 0.3 }} />
                <span>Select a supplier from the list to load their ledger sheet</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. LORRY HISTORY TAB ==================== */}
      {subTab === 'history' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Commission Goods Inward History</h3>
          
          {commissionPurchases.length > 0 ? (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date</th>
                    <th>Bill No.</th>
                    <th>Supplier Name</th>
                    <th>Lorry / Vehicle No.</th>
                    <th style={{ textAlign: 'right' }}>Gross Wt</th>
                    <th style={{ textAlign: 'right' }}>Tare Wt</th>
                    <th style={{ textAlign: 'right' }}>Net Wt</th>
                    <th style={{ textAlign: 'center' }}>Total Bags</th>
                    <th style={{ textAlign: 'right' }}>Total Freight</th>
                    <th style={{ textAlign: 'right' }}>Lorry Advance</th>
                    <th style={{ textAlign: 'right' }}>Balance Freight</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...commissionPurchases].reverse().map((p, idx) => {
                    const suppName = suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown supplier';
                    return (
                      <tr key={p.id}>
                        <td>{idx + 1}</td>
                        <td>{new Date(p.date).toLocaleDateString()}</td>
                        <td><strong>{p.billNo}</strong></td>
                        <td>{suppName}</td>
                        <td>{p.lorryNo || '—'}{p.vehicleMark ? ` (${p.vehicleMark})` : ''}</td>
                        <td style={{ textAlign: 'right' }}>{p.grossWeight ? p.grossWeight + ' Kg' : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{p.tareWeight ? p.tareWeight + ' Kg' : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: p.netWeight ? 600 : 400 }}>{p.netWeight ? p.netWeight + ' Kg' : '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.totalBags}</td>
                        <td style={{ textAlign: 'right' }}>₹{p.totalFreight.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>₹{p.advance.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>₹{p.balanceFreight.toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            <button className="btn btn-secondary btn-icon" onClick={() => handlePrintFreightBill(p)} title="View & Print Bill">
                              <Printer size={13} />
                            </button>
                            <button className="btn btn-danger btn-icon" onClick={() => handleDeletePurchase(p)} title="Delete Bill">
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No lorry dispatch or inward bills have been registered yet.
            </div>
          )}
        </div>
      )}

      {/* ==================== REGISTER SUPPLIER MODAL ==================== */}
      {isSupplierFormOpen && (
        <div className="modal-overlay">
          <form onSubmit={handleSaveSupplier} className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Register New Supplier</h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setIsSupplierFormOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Supplier / Party Name *</label>
                <input type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Abhijeet Borude" required />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input type="text" className="form-control" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="e.g. 9422222072" required />
              </div>
              <div className="form-group">
                <label>Address / Office location</label>
                <input type="text" className="form-control" value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="e.g. Borude Mala, Ahmednagar" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsSupplierFormOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Supplier</button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== RECORD PAYMENT MODAL ==================== */}
      {isPaymentModalOpen && paySupplier && (
        <div className="modal-overlay">
          <form onSubmit={handleSavePayment} className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>{payType === 'debit' ? `Record Payment to ${paySupplier.name}` : `Record Refund from ${paySupplier.name}`}</h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setIsPaymentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <div>Selected Supplier: <strong>{paySupplier.name}</strong></div>
                <div>Phone: {paySupplier.phone}</div>
                <div>Current Ledger Outstanding: <strong style={{ color: (supplierBalances[paySupplier.id] || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  ₹{Math.abs(supplierBalances[paySupplier.id] || 0).toFixed(2)} {(supplierBalances[paySupplier.id] || 0) >= 0 ? 'Cr' : 'Dr'}
                </strong></div>
              </div>

              <div className="form-group">
                <label>Transaction Amount (₹) *</label>
                <input 
                  type="number" 
                  className="form-control"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="form-group">
                <label>Reference No. / Payment Mode</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  placeholder="e.g. Bank Transf / UPI Ref / Cash"
                />
              </div>

              <div className="form-group">
                <label>Note / Remarks</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="e.g. paid driver, part payment"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-success">
                {payType === 'debit' ? 'Record Payment Made' : 'Record Refund Received'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
