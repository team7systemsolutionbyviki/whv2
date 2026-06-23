import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DB, Dealer, DealerPayment } from '../utils/db';
import {
  UserCheck,
  Plus,
  Search,
  X,
  Printer,
  MessageCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  DollarSign,
  CheckCircle,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  TrendingDown,
  TrendingUp,
  Upload,
  Download,
  FileSpreadsheet,
  Tag
} from 'lucide-react';

const parseCSV = (text: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    lines.push(row);
  }
  
  return lines;
};

export const CustomerManagement: React.FC = () => {
  const { dealers, sales, dealerPayments, refreshData, showToast, settings } = useApp();

  const overdueDaysThreshold = settings.overdueDaysThreshold || 15;

  const CUSTOMER_CATEGORIES = useMemo(() => {
    return settings.customerCategories || ['Wholesale', 'Retail', 'Hotel', 'Local', 'Outstation'];
  }, [settings.customerCategories]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [formCategory, setFormCategory] = useState('Wholesale');

  // Sub-tab
  const [subTab, setSubTab] = useState<'directory' | 'ledger' | 'reminders'>('directory');

  // Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [isDealerFormOpen, setIsDealerFormOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  
  // Custom Categories Manage Modal State
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Dealer form fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formOverdueDays, setFormOverdueDays] = useState('');

  // Dues Only Filter state
  const [showDuesOnly, setShowDuesOnly] = useState(false);

  // Extend Due Duration state
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendDealer, setExtendDealer] = useState<Dealer | null>(null);
  const [formExtendDays, setFormExtendDays] = useState('');

  // Ledger
  const [selectedDealerLedger, setSelectedDealerLedger] = useState<Dealer | null>(null);
  const [ledgerDateFrom, setLedgerDateFrom] = useState('');
  const [ledgerDateTo, setLedgerDateTo] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Payment collection
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDealer, setPaymentDealer] = useState<Dealer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentType, setPaymentType] = useState<'credit' | 'debit'>('credit');

  // Helpers
  const daysSince = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Dealers with balance older than their custom or global threshold
  const reminderDealers = useMemo(() => {
    return dealers.filter(d => {
      if (d.outstanding <= 0) return false;
      const dealerSales = sales.filter(s => s.dealerId === d.id && s.status === 'completed');
      if (dealerSales.length === 0) return true;
      const latestDate = dealerSales.reduce((max, s) => s.date > max ? s.date : max, '');
      const currentThreshold = d.overdueDaysThreshold || overdueDaysThreshold;
      return daysSince(latestDate) >= currentThreshold;
    });
  }, [dealers, sales, overdueDaysThreshold]);

  // Filtered directory
  const filteredDealers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dealers
      .filter(d => selectedCategoryFilter === 'All' || d.category === selectedCategoryFilter)
      .filter(d => !showDuesOnly || d.outstanding > 0)
      .filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.address || '').toLowerCase().includes(q)
      );
  }, [dealers, searchQuery, selectedCategoryFilter, showDuesOnly]);

  // Ledger data for selected dealer
  const ledgerEntries = useMemo(() => {
    if (!selectedDealerLedger) return [];
    const dealerId = selectedDealerLedger.id;

    // Debit and Credit entries from sales (mixed/partial payments)
    const debitEntries = sales
      .filter(s => s.dealerId === dealerId && s.status === 'completed')
      .flatMap(s => {
        const paid = (s.paymentMethod === 'Credit') ? 0 :
                     ((s.paymentDetails?.cashAmount || 0) + 
                      (s.paymentDetails?.upiAmount || 0) + 
                      (s.paymentDetails?.cardAmount || 0));
        
        const entries: Array<{
          id: string;
          date: string;
          type: 'sale' | 'payment' | 'debit_adj';
          description: string;
          debit: number;
          credit: number;
          invoiceNo: string;
        }> = [{
          id: s.id,
          date: s.date,
          type: 'sale',
          description: `Invoice ${s.invoiceNo}`,
          debit: s.total,
          credit: 0,
          invoiceNo: s.invoiceNo
        }];

        if (paid > 0) {
          entries.push({
            id: s.id + '-pay',
            date: s.date,
            type: 'payment',
            description: `Payment for Invoice ${s.invoiceNo} (${s.paymentMethod})`,
            debit: 0,
            credit: paid,
            invoiceNo: s.invoiceNo
          });
        }

        return entries;
      });

    // Credit/Debit entries = payments received or manual adjustments
    const paymentEntries = dealerPayments
      .filter(p => p.dealerId === dealerId)
      .map(p => {
        const isDebit = p.type === 'debit';
        return {
          id: p.id,
          date: p.date,
          type: isDebit ? ('debit_adj' as const) : ('payment' as const),
          description: isDebit
            ? `Dues Added ${p.referenceNo ? '(' + p.referenceNo + ')' : ''} ${p.note || ''}`.trim()
            : `Payment ${p.referenceNo ? '(' + p.referenceNo + ')' : ''} ${p.note || ''}`.trim(),
          debit: isDebit ? p.amount : 0,
          credit: isDebit ? 0 : p.amount,
          invoiceNo: p.referenceNo || ''
        };
      });

    let all = [...debitEntries, ...paymentEntries].sort((a, b) => a.date.localeCompare(b.date));

    // Date filter
    if (ledgerDateFrom) {
      all = all.filter(e => e.date.slice(0, 10) >= ledgerDateFrom);
    }
    if (ledgerDateTo) {
      all = all.filter(e => e.date.slice(0, 10) <= ledgerDateTo);
    }

    // Running balance
    let balance = 0;
    return all.map(e => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }, [selectedDealerLedger, sales, dealerPayments, ledgerDateFrom, ledgerDateTo]);

  const ledgerTotalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
  const ledgerTotalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);

  // Open add form
  const openAddDealer = () => {
    setEditingDealer(null);
    setFormName(''); setFormPhone(''); setFormAddress('');
    setFormEmail(''); setFormCreditLimit(''); setFormGstin('');
    setFormCategory('Wholesale');
    setFormOverdueDays('');
    setIsDealerFormOpen(true);
  };

  // Open edit form
  const openEditDealer = (d: Dealer) => {
    setEditingDealer(d);
    setFormName(d.name); setFormPhone(d.phone); setFormAddress(d.address);
    setFormEmail(d.email || ''); setFormCreditLimit(d.creditLimit?.toString() || '');
    setFormGstin(d.gstin || '');
    setFormCategory(d.category || 'Wholesale');
    setFormOverdueDays(d.overdueDaysThreshold?.toString() || '');
    setIsDealerFormOpen(true);
  };

  const handleSaveExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendDealer) return;
    const days = parseInt(formExtendDays);
    if (isNaN(days) || days <= 0) {
      showToast('Please enter a valid number of days', 'warning');
      return;
    }
    const updatedDealer = { ...extendDealer, overdueDaysThreshold: days };
    DB.saveDealer(updatedDealer);
    refreshData();
    setIsExtendModalOpen(false);
    showToast(`Payment terms for ${extendDealer.name} extended to ${days} days`, 'success');
  };

  const handleSaveDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      showToast('Name and Phone are required', 'warning');
      return;
    }
    const dealer: Dealer = {
      id: editingDealer ? editingDealer.id : 'D-' + Date.now().toString().slice(-6),
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      outstanding: editingDealer ? editingDealer.outstanding : 0,
      category: formCategory,
      email: formEmail.trim() || undefined,
      creditLimit: formCreditLimit ? parseFloat(formCreditLimit) : undefined,
      gstin: formGstin.trim() || undefined,
      overdueDaysThreshold: formOverdueDays ? parseInt(formOverdueDays) : undefined,
    };
    DB.saveDealer(dealer);
    refreshData();
    setIsDealerFormOpen(false);
    showToast(editingDealer ? 'Customer updated' : 'Customer registered', 'success');
  };

  const handlePrintCollectionReceipt = (payment: DealerPayment, dealer: Dealer) => {
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${payment.id}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 80mm;
            margin: 0;
            padding: 4px;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .header h2 { margin: 0 0 4px 0; font-size: 16px; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 11px; }
          .details-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          .details-table td { padding: 2px 0; vertical-align: top; }
          .amount-box {
            border: 1px solid #000;
            padding: 6px;
            margin: 10px 0;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
          }
          .footer { margin-top: 24px; }
          .signature-box { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
          @media print {
            body { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <h2>\${settings.shopName}</h2>
          <p>\${settings.address}</p>
          <p>Phone: \${settings.phone}</p>
          <div class="bold" style="margin-top: 6px; font-size: 13px;">OFFICIAL RECEIPT</div>
        </div>
        
        <div class="divider"></div>
        
        <table class="details-table">
          <tr>
            <td class="bold" style="width: 40%;">Receipt No:</td>
            <td>\${payment.id}</td>
          </tr>
          <tr>
            <td class="bold">Date & Time:</td>
            <td>\${new Date(payment.date).toLocaleString()}</td>
          </tr>
          <tr>
            <td class="bold">Customer:</td>
            <td class="bold">\${dealer.name}</td>
          </tr>
          <tr>
            <td class="bold">Category:</td>
            <td class="bold" style="text-transform: uppercase; letter-spacing: 0.5px;">\${payment.customerCategory || dealer.category || 'Wholesale'}</td>
          </tr>
          <tr>
            <td class="bold">Phone:</td>
            <td>\${dealer.phone}</td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div style="font-size: 11px; font-style: italic; margin-top: 4px;">
          Received with thanks the sum of rupees:
        </div>
        <div class="amount-box">
          ₹ \${payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        
        <table class="details-table" style="font-size: 11px;">
          \${payment.referenceNo ? \`
          <tr>
            <td class="bold" style="width: 40%;">Ref No./Cheque:</td>
            <td>\${payment.referenceNo}</td>
          </tr>\` : ''}
          \${payment.note ? \`
          <tr>
            <td class="bold">Payment Mode/Note:</td>
            <td>\${payment.note}</td>
          </tr>\` : ''}
          <tr>
            <td class="bold">Payment Type:</td>
            <td style="text-transform: uppercase;">\${payment.type === 'debit' ? 'Outstanding Dues Added' : 'Balance Payment Collection'}</td>
          </tr>
          <tr>
            <td class="divider" colspan="2"></td>
          </tr>
          <tr>
            <td class="bold" style="font-size: 12px;">Remaining Balance:</td>
            <td class="bold text-right" style="font-size: 12px; color: #000;">
              ₹ \${dealer.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="footer text-center" style="font-size: 10px;">
          <p>Thank you for your business!</p>
          <div class="signature-box">
            <div>Customer Signature</div>
            <div>Receiver Signature</div>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const handleReprintReceipt = (paymentId: string) => {
    const payment = dealerPayments.find(p => p.id === paymentId);
    if (payment && selectedDealerLedger) {
      handlePrintCollectionReceipt(payment, selectedDealerLedger);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      showToast('Category name cannot be empty', 'warning');
      return;
    }
    if (CUSTOMER_CATEGORIES.some(cat => cat.toLowerCase() === name.toLowerCase())) {
      showToast('Category already exists', 'warning');
      return;
    }
    const updatedCategories = [...CUSTOMER_CATEGORIES, name];
    DB.saveSettings({
      ...settings,
      customerCategories: updatedCategories
    });
    refreshData();
    setNewCategoryName('');
    showToast(`Category "${name}" added successfully`, 'success');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const isUsed = dealers.some(d => (d.category || 'Wholesale') === catToDelete);
    if (isUsed) {
      showToast(`Cannot delete category "${catToDelete}" because it is currently assigned to one or more customers.`, 'danger');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${catToDelete}"?`)) {
      return;
    }

    const updatedCategories = CUSTOMER_CATEGORIES.filter(cat => cat !== catToDelete);
    DB.saveSettings({
      ...settings,
      customerCategories: updatedCategories
    });
    
    if (selectedCategoryFilter === catToDelete) {
      setSelectedCategoryFilter('All');
    }
    if (formCategory === catToDelete) {
      setFormCategory(updatedCategories[0] || 'Wholesale');
    }
    
    refreshData();
    showToast(`Category "${catToDelete}" deleted`, 'success');
  };

  // Excel / CSV Export & Import Handlers
  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Phone Number',
      'Category',
      'Address',
      'Email',
      'Credit Limit',
      'GSTIN',
      'Outstanding Balance',
      'Overdue Days Threshold'
    ];

    const rows = dealers.map(d => [
      d.name,
      d.phone,
      d.category || 'Wholesale',
      d.address || '',
      d.email || '',
      d.creditLimit?.toString() || '',
      d.gstin || '',
      d.outstanding.toString(),
      d.overdueDaysThreshold?.toString() || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Customer_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Customer directory exported successfully', 'success');
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Customer Name',
      'Phone Number',
      'Category',
      'Address',
      'Email',
      'Credit Limit',
      'GSTIN',
      'Outstanding Balance',
      'Overdue Days Threshold'
    ];

    const sampleRows = [
      ['Mahalaxmi Traders', '9876543210', 'Wholesale', 'Main Street, City', 'mahalaxmi@example.com', '50000', '29AAAAA1111A1Z1', '12500.00', '15'],
      ['Balaji Agencies', '8765432109', 'Retail', 'Market Road, Town', '', '30000', '', '0.00', '30'],
      ['Srinivasa Stores', '7654321098', 'Hotel', 'Station Road', 'srinivasa@example.com', '', '', '-1500.00', '']
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...sampleRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Customer_Import_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const parsed = parseCSV(text);
        if (parsed.length < 2) {
          showToast('Invalid CSV format: Empty file or no data rows found', 'danger');
          return;
        }

        const headers = parsed[0].map(h => h.toLowerCase().trim());
        
        const idxName = headers.findIndex(h => h.includes('name') || h.includes('customer') || h.includes('shop'));
        const idxPhone = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
        const idxCategory = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('group'));
        const idxAddress = headers.findIndex(h => h.includes('address'));
        const idxEmail = headers.findIndex(h => h.includes('email'));
        const idxCreditLimit = headers.findIndex(h => h.includes('limit') || h.includes('credit'));
        const idxGstin = headers.findIndex(h => h.includes('gst') || h.includes('gstin'));
        const idxOutstanding = headers.findIndex(h => h.includes('outstanding') || h.includes('balance') || h.includes('due'));
        const idxOverdueThreshold = headers.findIndex(h => h.includes('overdue') || h.includes('threshold') || h.includes('term') || h.includes('days'));

        if (idxName === -1 || idxPhone === -1) {
          showToast('Invalid template: "Customer Name" and "Phone Number" columns are required', 'danger');
          return;
        }

        const rows = parsed.slice(1);
        let newCount = 0;
        let updateCount = 0;

        const existingDealers = DB.getDealers();

        rows.forEach(row => {
          if (row.length < 2) return;
          const nameVal = row[idxName]?.trim();
          const phoneVal = row[idxPhone]?.trim();
          if (!nameVal || !phoneVal) return;

          const addressVal = idxAddress !== -1 ? row[idxAddress]?.trim() : '';
          const emailVal = idxEmail !== -1 ? row[idxEmail]?.trim() : '';
          const categoryVal = idxCategory !== -1 && row[idxCategory] ? row[idxCategory]?.trim() : 'Wholesale';
          const creditLimitVal = idxCreditLimit !== -1 && row[idxCreditLimit] ? parseFloat(row[idxCreditLimit]) : undefined;
          const gstinVal = idxGstin !== -1 ? row[idxGstin]?.trim() : '';
          const outstandingVal = idxOutstanding !== -1 && row[idxOutstanding] ? parseFloat(row[idxOutstanding]) : 0;
          const overdueThresholdVal = idxOverdueThreshold !== -1 && row[idxOverdueThreshold] ? parseInt(row[idxOverdueThreshold]) : undefined;

          // Find existing by phone or name
          const existing = existingDealers.find(d => d.phone === phoneVal || d.name.toLowerCase() === nameVal.toLowerCase());
          const dealerId = existing ? existing.id : 'D-' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 2);

          if (existing) {
            updateCount++;
          } else {
            newCount++;
          }

          const dealerData: Dealer = {
            id: dealerId,
            name: nameVal,
            phone: phoneVal,
            address: addressVal,
            category: categoryVal,
            email: emailVal || undefined,
            creditLimit: isNaN(creditLimitVal as number) ? undefined : creditLimitVal,
            gstin: gstinVal || undefined,
            outstanding: isNaN(outstandingVal) ? (existing ? existing.outstanding : 0) : outstandingVal,
            overdueDaysThreshold: isNaN(overdueThresholdVal as number) ? undefined : overdueThresholdVal
          };

          DB.saveDealer(dealerData);
        });

        refreshData();
        showToast(`Import completed: Created ${newCount} and updated ${updateCount} customers`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Error parsing CSV file. Please make sure the format is valid.', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteDealer = (d: Dealer) => {
    if (!window.confirm(`Delete customer "${d.name}"? This will not delete their sales history.`)) return;
    const dealers = DB.getDealers().filter(x => x.id !== d.id);
    DB.setJSON('billing_dealers', dealers);
    refreshData();
    showToast('Customer deleted', 'danger');
    if (selectedDealerLedger?.id === d.id) setSelectedDealerLedger(null);
  };

  // Collect payment / Add dues
  const openPaymentModal = (d: Dealer, type: 'credit' | 'debit' = 'credit') => {
    setPaymentDealer(d);
    setPaymentType(type);
    if (type === 'credit') {
      setPaymentAmount(d.outstanding > 0 ? d.outstanding.toFixed(2) : '');
    } else {
      setPaymentAmount('');
    }
    setPaymentRef('');
    setPaymentNote('');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDealer) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'warning');
      return;
    }
    
    const isDebit = paymentType === 'debit';
    const updatedOutstanding = paymentDealer.outstanding + (isDebit ? amount : -amount);
    const updatedDealer = { ...paymentDealer, outstanding: updatedOutstanding };
    
    const payment: DealerPayment = {
      id: 'DP-' + Date.now().toString().slice(-8),
      dealerId: paymentDealer.id,
      date: new Date().toISOString(),
      amount,
      type: paymentType,
      referenceNo: paymentRef.trim() || undefined,
      note: paymentNote.trim() || undefined,
      customerCategory: paymentDealer.category || 'Wholesale',
    };
    DB.saveDealerPayment(payment);
    DB.updateDealerOutstanding(paymentDealer.id, isDebit ? amount : -amount);
    refreshData();
    setIsPaymentModalOpen(false);
    
    // Auto-print receipt
    handlePrintCollectionReceipt(payment, updatedDealer);
    
    const actionStr = isDebit ? `Dues of ₹${amount.toFixed(2)} added` : `Payment of ₹${amount.toFixed(2)} recorded`;
    showToast(actionStr, 'success');
    
    // Update ledger if open
    if (selectedDealerLedger?.id === paymentDealer.id) {
      setSelectedDealerLedger(updatedDealer);
    }
  };

  // WhatsApp reminder
  const sendWhatsAppReminder = (d: Dealer) => {
    const phone = d.phone.replace(/\D/g, '');
    const msg = `Hello ${d.name},\n\nThis is a payment reminder from ${settings.shopName}.\n\nOutstanding Balance: ₹${d.outstanding.toFixed(2)}\n\nKindly clear the balance at your earliest convenience.\n\nThank you!`;
    const url = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    DB.updateDealerReminderDate(d.id, new Date().toISOString());
    refreshData();
    showToast('WhatsApp reminder opened!', 'success');
  };

  // Print ledger
  const handlePrintLedger = () => {
    if (!selectedDealerLedger) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = ledgerEntries.map((e, i) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:6px 8px;">${i + 1}</td>
        <td style="padding:6px 8px;">${new Date(e.date).toLocaleDateString()}</td>
        <td style="padding:6px 8px;">${e.description}</td>
        <td style="padding:6px 8px;text-align:right;color:${e.credit > 0 ? '#16a34a' : '#6b7280'};">${e.credit > 0 ? '₹' + e.credit.toFixed(2) : '-'}</td>
        <td style="padding:6px 8px;text-align:right;color:${e.debit > 0 ? '#dc2626' : '#6b7280'};">${e.debit > 0 ? '₹' + e.debit.toFixed(2) : '-'}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600;color:${e.balance > 0 ? '#dc2626' : '#16a34a'};">₹${e.balance.toFixed(2)}</td>
      </tr>
    `).join('');
    w.document.write(`
      <!DOCTYPE html><html><head><title>Customer Ledger - ${selectedDealerLedger.name}</title>
      <style>body{font-family:Arial,sans-serif;color:#111;margin:24px;} table{width:100%;border-collapse:collapse;} th{background:#f3f4f6;padding:8px;border:1px solid #d1d5db;text-align:left;font-size:12px;} td{border:1px solid #e5e7eb;font-size:12px;}</style>
      </head><body>
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
          <div>
            <h2 style="margin:0;font-size:18px;">${settings.shopName}</h2>
            <p style="margin:2px 0;font-size:12px;word-break:break-word;">${settings.address}</p>
            <p style="margin:2px 0;font-size:12px;word-break:break-word;">Ph: ${settings.phone}</p>
          </div>
          <div style="text-align:right;">
            <h3 style="margin:0;font-size:15px;color:#4f46e5;">CUSTOMER LEDGER</h3>
            <p style="font-size:12px;margin:2px 0;">Customer: <strong>${selectedDealerLedger.name}</strong></p>
            <p style="font-size:12px;margin:2px 0;">Phone: ${selectedDealerLedger.phone}</p>
            ${ledgerDateFrom || ledgerDateTo ? `<p style="font-size:11px;margin:2px 0;">Period: ${ledgerDateFrom || 'Start'} to ${ledgerDateTo || 'Today'}</p>` : ''}
            <p style="font-size:12px;margin:2px 0;">Outstanding: <strong style="color:#dc2626;">₹${selectedDealerLedger.outstanding.toFixed(2)}</strong></p>
          </div>
        </div>
        <table>
          <thead><tr><th>S.No</th><th>Date</th><th>Description</th><th style="text-align:right;">Amount In</th><th style="text-align:right;">Amount Out</th><th style="text-align:right;">Balance Amount</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f9fafb;font-weight:700;">
              <td colspan="3" style="padding:8px;text-align:right;">TOTAL</td>
              <td style="padding:8px;text-align:right;color:#16a34a;">₹${ledgerTotalCredit.toFixed(2)}</td>
              <td style="padding:8px;text-align:right;color:#dc2626;">₹${ledgerTotalDebit.toFixed(2)}</td>
              <td style="padding:8px;text-align:right;color:${ledgerTotalDebit - ledgerTotalCredit > 0 ? '#dc2626' : '#16a34a'};">₹${(ledgerTotalDebit - ledgerTotalCredit).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:32px;display:flex;justify-content:space-between;">
          <div style="font-size:11px;color:#6b7280;">Printed on: ${new Date().toLocaleString()}</div>
          <div style="width:180px;text-align:center;">
            <div style="border-top:1px solid #333;padding-top:4px;font-size:11px;">Authorized Signatory</div>
          </div>
        </div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  // Print full customer report
  const handlePrintCustomerReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;

    const sortedDealers = [...filteredDealers].sort((a, b) => {
      if (b.outstanding !== a.outstanding) {
        return b.outstanding - a.outstanding;
      }
      return a.name.localeCompare(b.name);
    });

    const totalDues = sortedDealers.reduce((sum, d) => sum + (d.outstanding > 0 ? d.outstanding : 0), 0);
    const totalAdvance = sortedDealers.reduce((sum, d) => sum + (d.outstanding < 0 ? Math.abs(d.outstanding) : 0), 0);
    const netOutstanding = totalDues - totalAdvance;

    const rows = sortedDealers.map((d, i) => {
      const dealerSales = sales.filter(s => s.dealerId === d.id && s.status === 'completed');
      const dealerPays = dealerPayments.filter(p => p.dealerId === d.id);
      const dates = [
        ...dealerSales.map(s => s.date),
        ...dealerPays.map(p => p.date)
      ].filter(Boolean);
      const latestDate = dates.reduce((max, dt) => dt > max ? dt : max, '');
      const lastActiveStr = latestDate ? new Date(latestDate).toLocaleDateString() : 'Never';

      const dueVal = d.outstanding > 0 ? `₹${d.outstanding.toFixed(2)}` : '-';
      const advVal = d.outstanding < 0 ? `₹${Math.abs(d.outstanding).toFixed(2)}` : '-';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; text-align: center;">${i + 1}</td>
          <td style="padding: 8px; font-weight: 600;">${d.name}</td>
          <td style="padding: 8px;">${d.phone}</td>
          <td style="padding: 8px; font-size: 11px; color: #4b5563;">${d.address || '-'}</td>
          <td style="padding: 8px; text-align: center;">${lastActiveStr}</td>
          <td style="padding: 8px; text-align: right; font-weight: 600; color: #dc2626;">${dueVal}</td>
          <td style="padding: 8px; text-align: right; font-weight: 600; color: #16a34a;">${advVal}</td>
        </tr>
      `;
    }).join('');

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Dues & Balance Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #111;
            margin: 24px;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th {
            background: #f3f4f6;
            padding: 10px 8px;
            border: 1px solid #d1d5db;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #374151;
          }
          td {
            border: 1px solid #e5e7eb;
            font-size: 12px;
            padding: 8px;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            border-bottom: 3px double #111;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .shop-details h2 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            color: #1e1b4b;
          }
          .shop-details p {
            margin: 3px 0;
            font-size: 12px;
            color: #4b5563;
          }
          .report-details {
            text-align: right;
          }
          .report-details h3 {
            margin: 0;
            font-size: 16px;
            color: #4f46e5;
            letter-spacing: 0.5px;
          }
          .report-details p {
            font-size: 12px;
            margin: 3px 0;
            color: #4b5563;
          }
          @media print {
            body { margin: 15px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="shop-details">
            <h2>${settings.shopName}</h2>
            <p style="word-break:break-word;">${settings.address}</p>
            <p style="word-break:break-word;">Phone: ${settings.phone}</p>
          </div>
          <div class="report-details">
            <h3>CUSTOMER BALANCE SHEET REPORT</h3>
            <p>Generated: <strong>${new Date().toLocaleString()}</strong></p>
            <p>Total Customers: <strong>${sortedDealers.length}</strong></p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">S.No</th>
              <th>Customer Name</th>
              <th style="width: 100px;">Phone</th>
              <th>Address</th>
              <th style="width: 100px; text-align: center;">Last Active</th>
              <th style="width: 120px; text-align: right;">Dues (Dr)</th>
              <th style="width: 120px; text-align: right;">Advance / Balance (Cr)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background: #f9fafb; font-weight: 700; border-top: 1px solid #d1d5db;">
              <td colspan="5" style="padding: 10px; text-align: right; font-size: 12px; text-transform: uppercase;">Total:</td>
              <td style="padding: 10px; text-align: right; font-size: 12px; color: #dc2626; font-weight: 800;">₹${totalDues.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-size: 12px; color: #16a34a; font-weight: 800;">₹${totalAdvance.toFixed(2)}</td>
            </tr>
            <tr style="background: #f3f4f6; font-weight: 800; border-top: 2px solid #111;">
              <td colspan="5" style="padding: 10px; text-align: right; font-size: 13px; text-transform: uppercase;">Net Outstanding:</td>
              <td colspan="2" style="padding: 10px; text-align: right; font-size: 13px; color: ${netOutstanding >= 0 ? '#dc2626' : '#16a34a'};">
                ₹${Math.abs(netOutstanding).toFixed(2)} ${netOutstanding >= 0 ? '(Dr)' : '(Cr)'}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280;">
          <div>Report printed via Billing System</div>
          <div style="width: 200px; text-align: center; border-top: 1px solid #9ca3af; padding-top: 6px;">
            Authorized Signatory
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Customer Management</h1>
          <p>Customer directory, account ledger, payment collection & due reminders</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`btn ${subTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('directory')}
          >
            <UserCheck size={15} /> Directory
          </button>
          <button
            className={`btn ${subTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('ledger')}
          >
            <FileText size={15} /> Ledger
          </button>
          <button
            className={`btn ${subTab === 'reminders' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('reminders')}
            style={{ position: 'relative' }}
          >
            <Clock size={15} /> Reminders
            {reminderDealers.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px', right: '-6px',
                background: 'var(--danger)',
                color: 'white',
                fontSize: '0.65rem',
                padding: '0.1rem 0.35rem',
                borderRadius: '999px',
                fontWeight: 700
              }}>{reminderDealers.length}</span>
            )}
          </button>
          
          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.25rem' }}></div>
          
          <button className="btn btn-secondary" onClick={handlePrintCustomerReport}>
            <Printer size={15} /> Print Full Report
          </button>
        </div>
      </div>

      {/* ====================== DIRECTORY TAB ====================== */}
      {subTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, maxWidth: '580px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, phone or address..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
              </div>
              <select
                className="form-control"
                style={{ width: '180px', height: '38px', padding: '0.375rem 0.75rem' }}
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {CUSTOMER_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={showDuesOnly}
                  onChange={e => setShowDuesOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Show Dues Only</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleDownloadTemplate} 
                title="Download Import CSV/Excel Template"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem' }}
              >
                <FileSpreadsheet size={15} />
                <span>Template</span>
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={handleExportCSV} 
                title="Export Customers to CSV/Excel"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem' }}
              >
                <Download size={15} />
                <span>Export Excel</span>
              </button>
              
              <label 
                className="btn btn-secondary" 
                title="Import Customers from CSV/Excel"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', cursor: 'pointer', margin: 0 }}
              >
                <Upload size={15} />
                <span>Import Excel</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportCSV} 
                  style={{ display: 'none' }} 
                />
              </label>

              <button className="btn btn-secondary" onClick={handlePrintCustomerReport} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem' }}>
                <Printer size={15} />
                <span>Print Report</span>
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsCategoriesModalOpen(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem' }}
              >
                <Tag size={15} />
                <span>Manage Categories</span>
              </button>

              <button className="btn btn-primary" onClick={openAddDealer} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem' }}>
                <Plus size={15} />
                <span>Add Customer</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)' }}>{dealers.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Customers</div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger)' }}>
                ₹{dealers.reduce((s, d) => s + d.outstanding, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Outstanding</div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--warning)' }}>{reminderDealers.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{overdueDaysThreshold}+ Day Overdue</div>
            </div>
          </div>

          {/* Dealers grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {filteredDealers.map(d => {
              const isOverdue = reminderDealers.some(r => r.id === d.id);
              const dealerSales = sales.filter(s => s.dealerId === d.id && s.status === 'completed');
              const lastSale = dealerSales.length > 0
                ? dealerSales.reduce((max, s) => s.date > max ? s.date : max, '')
                : '';
              return (
                <div
                  key={d.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    border: isOverdue ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                >
                  {isOverdue && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'var(--danger)', color: 'white',
                      fontSize: '0.65rem', padding: '0.15rem 0.4rem',
                      borderRadius: '999px', fontWeight: 700
                    }}>{d.overdueDaysThreshold || overdueDaysThreshold}+ Day Due</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--info))',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '1rem', flexShrink: 0
                    }}>
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>{d.name}</span>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 600, 
                          padding: '0.1rem 0.4rem', 
                          background: 'var(--primary-light)', 
                          color: 'var(--primary)', 
                          borderRadius: '4px',
                          border: '1px solid rgba(99,102,241,0.15)' 
                        }}>
                          {d.category || 'Wholesale'}
                        </span>
                      </h4>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Phone size={11} /> {d.phone}
                        </span>
                        {d.address && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <MapPin size={11} /> {d.address.slice(0, 30)}{d.address.length > 30 ? '…' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outstanding Balance</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: d.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        ₹{d.outstanding.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Invoices</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{dealerSales.length}</div>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '0.5rem', 
                    background: 'var(--bg-input)', 
                    padding: '0.5rem 0.75rem', 
                    borderRadius: '6px', 
                    marginBottom: '0.75rem', 
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Payment Term</span>
                      <span style={{ fontWeight: 600 }}>{d.overdueDaysThreshold || overdueDaysThreshold} Days</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Dues Duration</span>
                      <span style={{ fontWeight: 600, color: isOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {d.outstanding > 0 ? (lastSale ? `${daysSince(lastSale)} days` : 'Immediate') : 'No dues'}
                      </span>
                    </div>
                  </div>

                  {lastSale && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                      Last transaction: {new Date(lastSale).toLocaleDateString()} ({daysSince(lastSale)} days ago)
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => { setSelectedDealerLedger(d); setSubTab('ledger'); }}
                    >
                      <FileText size={12} /> Ledger
                    </button>
                    <button
                      className="btn btn-success"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => openPaymentModal(d, 'credit')}
                    >
                      <DollarSign size={12} /> Collect
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => openPaymentModal(d, 'debit')}
                    >
                      <Plus size={12} /> Add Dues
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => { setExtendDealer(d); setFormExtendDays((d.overdueDaysThreshold || overdueDaysThreshold).toString()); setIsExtendModalOpen(true); }}
                      title="Extend Due Duration"
                    >
                      <Clock size={12} /> Extend
                    </button>
                    {d.outstanding > 0 && (
                      <button
                        className="btn"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#25D366', color: '#fff', border: 'none' }}
                        onClick={() => sendWhatsAppReminder(d)}
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ padding: '0.3rem' }}
                      onClick={() => openEditDealer(d)}
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon"
                      style={{ padding: '0.3rem' }}
                      onClick={() => handleDeleteDealer(d)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredDealers.length === 0 && (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                No customers found. Add your first customer!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================== LEDGER TAB ====================== */}
      {subTab === 'ledger' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Customer list */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search customer..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  style={{ paddingLeft: '28px', padding: '0.4rem 0.4rem 0.4rem 28px', fontSize: '0.8rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '65vh', overflowY: 'auto' }}>
              {dealers
                .filter(d => d.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || d.phone.includes(ledgerSearch))
                .map(d => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDealerLedger(d)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: selectedDealerLedger?.id === d.id ? 'var(--primary)' : 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s'
                    }}
                    className={selectedDealerLedger?.id !== d.id ? 'glass-panel-hover' : ''}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: selectedDealerLedger?.id === d.id ? 'white' : 'var(--text-primary)' }}>{d.name}</div>
                      <div style={{ fontSize: '0.7rem', color: selectedDealerLedger?.id === d.id ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>{d.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: d.outstanding > 0 ? (selectedDealerLedger?.id === d.id ? '#fca5a5' : 'var(--danger)') : (selectedDealerLedger?.id === d.id ? '#86efac' : 'var(--success)') }}>
                        ₹{d.outstanding.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Right: Ledger detail */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {selectedDealerLedger ? (
              <>
                {/* Ledger header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{selectedDealerLedger.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Ph: {selectedDealerLedger.phone}
                      {selectedDealerLedger.address && ` | ${selectedDealerLedger.address}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outstanding</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: selectedDealerLedger.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        ₹{selectedDealerLedger.outstanding.toFixed(2)}
                      </div>
                    </div>
                    <button className="btn btn-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openPaymentModal(selectedDealerLedger, 'credit')}>
                      <DollarSign size={13} /> Collect
                    </button>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openPaymentModal(selectedDealerLedger, 'debit')}>
                      <Plus size={13} /> Add Dues
                    </button>
                    {selectedDealerLedger.outstanding > 0 && (
                      <button
                        className="btn"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#25D366', color: '#fff', border: 'none' }}
                        onClick={() => sendWhatsAppReminder(selectedDealerLedger)}
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={handlePrintLedger}>
                      <Printer size={13} /> Print
                    </button>
                  </div>
                </div>

                {/* Date filter */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>From:</label>
                    <input type="date" className="form-control" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} value={ledgerDateFrom} onChange={e => setLedgerDateFrom(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>To:</label>
                    <input type="date" className="form-control" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} value={ledgerDateTo} onChange={e => setLedgerDateTo(e.target.value)} />
                  </div>
                  {(ledgerDateFrom || ledgerDateTo) && (
                    <button className="btn btn-ghost btn-icon" style={{ padding: '0.3rem' }} onClick={() => { setLedgerDateFrom(''); setLedgerDateTo(''); }} title="Clear filter">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginBottom: '0.2rem', fontWeight: 600 }}>TOTAL DEBIT (Dr)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>₹{ledgerTotalDebit.toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginBottom: '0.2rem', fontWeight: 600 }}>TOTAL CREDIT (Cr)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>₹{ledgerTotalCredit.toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>NET BALANCE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: (ledgerTotalDebit - ledgerTotalCredit) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ₹{(ledgerTotalDebit - ledgerTotalCredit).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Ledger table */}
                {ledgerEntries.length > 0 ? (
                  <div className="table-container" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                    <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Amount In</th>
                          <th style={{ textAlign: 'right' }}>Amount Out</th>
                          <th style={{ textAlign: 'right' }}>Balance Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((e, i) => (
                          <tr key={e.id}>
                            <td>{i + 1}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString()}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {e.type === 'sale'
                                    ? <TrendingDown size={12} style={{ color: 'var(--danger)' }} />
                                    : <TrendingUp size={12} style={{ color: 'var(--success)' }} />
                                  }
                                  {e.description}
                                </div>
                                {(e.type === 'payment' || e.type === 'debit_adj') && (
                                  <button
                                    className="btn btn-ghost btn-icon"
                                    style={{ padding: '0.25rem', color: 'var(--primary)' }}
                                    onClick={() => handleReprintReceipt(e.id)}
                                    title="Reprint Payment Receipt"
                                  >
                                    <Printer size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', color: e.credit > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                              {e.credit > 0 ? `₹${e.credit.toFixed(2)}` : '-'}
                            </td>
                            <td style={{ textAlign: 'right', color: e.debit > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {e.debit > 0 ? `₹${e.debit.toFixed(2)}` : '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: e.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                              ₹{e.balance.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border-color)' }}>
                          <td colSpan={3} style={{ textAlign: 'right', padding: '0.6rem' }}>TOTAL</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--success)' }}>₹{ledgerTotalCredit.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--danger)' }}>₹{ledgerTotalDebit.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: (ledgerTotalDebit - ledgerTotalCredit) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            ₹{(ledgerTotalDebit - ledgerTotalCredit).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    No transactions found for this period.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <UserCheck size={36} style={{ opacity: 0.3 }} />
                <span>Select a customer from the list to view their ledger</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================== REMINDERS TAB ====================== */}
      {subTab === 'reminders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>
              <AlertTriangle size={16} />
              {reminderDealers.length} customer{reminderDealers.length !== 1 ? 's' : ''} with overdue balances ({overdueDaysThreshold}+ days without payment)
            </div>
          </div>

          {reminderDealers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={36} style={{ color: 'var(--success)', opacity: 0.6 }} />
              <span style={{ fontWeight: 600 }}>All Clear!</span>
              <span style={{ fontSize: '0.85rem' }}>No customers have overdue balances beyond {overdueDaysThreshold} days.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reminderDealers.map(d => {
                const dealerSales = sales.filter(s => s.dealerId === d.id && s.status === 'completed');
                const lastSaleDate = dealerSales.length > 0
                  ? dealerSales.reduce((max, s) => s.date > max ? s.date : max, '')
                  : '';
                const overdueDays = lastSaleDate ? daysSince(lastSaleDate) : 999;
                const lastReminder = d.lastReminderSent ? daysSince(d.lastReminderSent) : null;

                return (
                  <div
                    key={d.id}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid rgba(239,68,68,0.25)',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '1.1rem', flexShrink: 0
                      }}>
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 700 }}>{d.name}</h4>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Phone size={11} /> {d.phone}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                            Outstanding: ₹{d.outstanding.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={11} /> {overdueDays} days since last sale
                          </span>
                        </div>
                        {lastReminder !== null && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Last reminder: {lastReminder === 0 ? 'Today' : `${lastReminder} days ago`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-success"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => openPaymentModal(d)}
                      >
                        <DollarSign size={13} /> Collect Payment
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => { setExtendDealer(d); setFormExtendDays((d.overdueDaysThreshold || overdueDaysThreshold).toString()); setIsExtendModalOpen(true); }}
                      >
                        <Clock size={13} /> Extend Terms
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#25D366', color: '#fff', border: 'none' }}
                        onClick={() => sendWhatsAppReminder(d)}
                      >
                        <MessageCircle size={13} /> WhatsApp Reminder
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => { setSelectedDealerLedger(d); setSubTab('ledger'); }}
                      >
                        <ChevronRight size={13} /> View Ledger
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================== ADD/EDIT DEALER MODAL ====================== */}
      {isDealerFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>{editingDealer ? 'Edit Customer' : 'Register New Customer'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsDealerFormOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDealer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Customer / Shop Name *</label>
                    <input type="text" className="form-control" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Royal Traders" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Phone Number *</label>
                    <input type="text" className="form-control" required value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="10-digit phone" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Business Address</label>
                  <textarea className="form-control" rows={2} value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Street, City" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Email (optional)</label>
                    <input type="email" className="form-control" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Credit Limit (₹)</label>
                    <input type="number" className="form-control" value={formCreditLimit} onChange={e => setFormCreditLimit(e.target.value)} placeholder="e.g. 50000" min="0" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Customer Category *</label>
                    <select
                      className="form-control"
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      required
                    >
                      {CUSTOMER_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>GSTIN (optional)</label>
                    <input type="text" className="form-control" value={formGstin} onChange={e => setFormGstin(e.target.value)} placeholder="GST Number" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Overdue Threshold (Days)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formOverdueDays} 
                      onChange={e => setFormOverdueDays(e.target.value)} 
                      placeholder={`Global default: ${overdueDaysThreshold} days`}
                      min="1" 
                    />
                  </div>
                  <div style={{ flex: 1 }}></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDealerFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingDealer ? 'Update Customer' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================== TRANSACTION MODAL (COLLECT/ADD DUES) ====================== */}
      {isPaymentModalOpen && paymentDealer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>{paymentType === 'debit' ? 'Add Dues (Debit)' : 'Collect Payment (Credit)'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsPaymentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(239,68,68,0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{paymentDealer.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ph: {paymentDealer.phone}</div>
                  <div style={{ marginTop: '0.4rem', fontSize: '1rem', fontWeight: 700, color: 'var(--danger)' }}>
                    Total Outstanding: ₹{paymentDealer.outstanding.toFixed(2)}
                  </div>
                </div>
                
                {/* Transaction Type Select */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Transaction Type</label>
                  <select 
                    className="form-control" 
                    value={paymentType} 
                    onChange={e => {
                      const type = e.target.value as 'credit' | 'debit';
                      setPaymentType(type);
                      if (type === 'credit') {
                        setPaymentAmount(paymentDealer.outstanding > 0 ? paymentDealer.outstanding.toFixed(2) : '');
                      } else {
                        setPaymentAmount('');
                      }
                    }}
                  >
                    <option value="credit">Collect Payment (Credit / reduces outstanding)</option>
                    <option value="debit">Add Dues (Debit / increases outstanding)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{paymentType === 'debit' ? 'Dues Amount (₹) *' : 'Payment Amount (₹) *'}</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1.2rem', fontWeight: 700 }}
                    required
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Reference No.</label>
                    <input type="text" className="form-control" placeholder="Cheque / UPI Ref" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Note</label>
                    <input type="text" className="form-control" placeholder="Optional note" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
                  </div>
                </div>
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    background: paymentType === 'debit' ? 'rgba(239, 68, 68, 0.1)' : 'var(--success-light)', 
                    padding: '0.75rem', 
                    borderRadius: '6px', 
                    border: paymentType === 'debit' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16,185,129,0.2)' 
                  }}>
                    <span style={{ color: paymentType === 'debit' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {paymentType === 'debit' ? 'New Balance after charges:' : 'Remaining Balance after payment:'}
                    </span>
                    <span style={{ color: paymentType === 'debit' ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                      ₹{(paymentDealer.outstanding + (paymentType === 'debit' ? 1 : -1) * parseFloat(paymentAmount)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                <button type="submit" className={paymentType === 'debit' ? 'btn btn-primary' : 'btn btn-success'}>
                  <CheckCircle size={15} /> {paymentType === 'debit' ? 'Add Dues' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ====================== MANAGE CATEGORIES MODAL ====================== */}
      {isCategoriesModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Manage Customer Categories</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsCategoriesModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Add New Category form */}
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label>New Category Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Distributor, Agent" 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </form>

              <hr style={{ borderColor: 'var(--border-color)', margin: '0.25rem 0' }} />

              {/* Categories List */}
              <div>
                <label style={{ marginBottom: '0.5rem', fontWeight: 600, display: 'block' }}>Existing Categories</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {CUSTOMER_CATEGORIES.map(cat => {
                    const count = dealers.filter(d => (d.category || 'Wholesale') === cat).length;
                    return (
                      <div 
                        key={cat} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '0.6rem 0.75rem', 
                          background: 'var(--bg-input)', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border-color)' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({count} customer{count !== 1 ? 's' : ''})</span>
                        </div>
                        <button 
                          className="btn btn-ghost btn-danger btn-icon" 
                          style={{ padding: '0.25rem' }} 
                          onClick={() => handleDeleteCategory(cat)}
                          title={`Delete Category "${cat}"`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsCategoriesModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ====================== EXTEND DUE DURATION MODAL ====================== */}
      {isExtendModalOpen && extendDealer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Extend Due Duration</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsExtendModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveExtension}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{extendDealer.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ph: {extendDealer.phone}</div>
                  <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', fontWeight: 600 }}>
                    Current Payment Term: <span style={{ color: 'var(--danger)' }}>{extendDealer.overdueDaysThreshold || overdueDaysThreshold} Days</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Allowed Payment Terms (Days)</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="1"
                    value={formExtendDays}
                    onChange={e => setFormExtendDays(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormExtendDays(String((extendDealer.overdueDaysThreshold || overdueDaysThreshold) + 7))}>+7 Days</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormExtendDays(String((extendDealer.overdueDaysThreshold || overdueDaysThreshold) + 15))}>+15 Days</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormExtendDays(String((extendDealer.overdueDaysThreshold || overdueDaysThreshold) + 30))}>+30 Days</button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsExtendModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Terms</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
