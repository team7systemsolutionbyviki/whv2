import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DB, Expense } from '../utils/db';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar, 
  DollarSign, 
  X, 
  Download, 
  Tag, 
  CreditCard, 
  User, 
  Info, 
  ArrowUpDown 
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { expenses, refreshData, showToast } = useApp();
  const { user } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('all');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Tea, Snacks & Refreshments');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [note, setNote] = useState('');

  // Sort State
  const [sortField, setSortField] = useState<'date' | 'category' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Preset categories
  const categories = [
    'Rent',
    'Salaries & Wages',
    'Electricity & Utilities',
    'Tea, Snacks & Refreshments',
    'Fuel & Vehicle Transport',
    'Office & Store Maintenance',
    'Packaging & Stationeries',
    'Commission & Coolie',
    'Other'
  ];

  const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];

  // Helper date checking
  const checkDateMatch = (dateStr: string) => {
    const itemDate = new Date(dateStr);
    const today = new Date();
    
    if (dateFilter === 'today') {
      return (
        itemDate.getDate() === today.getDate() &&
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    }
    if (dateFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }
    if (dateFilter === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return itemDate >= thirtyDaysAgo;
    }
    if (dateFilter === 'custom') {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    }
    return true; // for 'all'
  };

  // Filtered and searched list
  const filteredExpenses = expenses
    .filter(e => {
      const matchesSearch = (e.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (e.referenceNo || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
      const matchesPayment = paymentFilter === 'All' || e.paymentMethod === paymentFilter;
      const matchesDate = checkDateMatch(e.date);

      return matchesSearch && matchesCategory && matchesPayment && matchesDate;
    });

  // Sort logic
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'date') {
      valA = new Date(a.date).getTime();
      valB = new Date(b.date).getTime();
    } else if (sortField === 'category') {
      valA = a.category.toLowerCase();
      valB = b.category.toLowerCase();
    } else if (sortField === 'amount') {
      valA = a.amount;
      valB = b.amount;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Metrics calculations (based on filtered list)
  const totalPeriodExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate today's expenses
  const todayExpensesVal = expenses
    .filter(e => {
      const d = new Date(e.date);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate this month's expenses
  const thisMonthExpensesVal = expenses
    .filter(e => {
      const d = new Date(e.date);
      const today = new Date();
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate top category
  const categorySummary = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as { [key: string]: number });

  const topCategoryEntry = Object.entries(categorySummary).sort((a, b) => b[1] - a[1])[0];
  const topCategory = topCategoryEntry ? `${topCategoryEntry[0]} (₹${topCategoryEntry[1].toFixed(2)})` : 'None';

  // Sort toggle handler
  const handleSort = (field: 'date' | 'category' | 'amount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Open Add modal
  const openAddModal = () => {
    setEditingExpense(null);
    setDate(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:MM
    setCategory('Tea, Snacks & Refreshments');
    setCustomCategory('');
    setAmount(0);
    setPaymentMethod('Cash');
    setReferenceNo('');
    setNote('');
    setIsModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (e: Expense) => {
    setEditingExpense(e);
    // Format date for datetime-local input
    const localDate = new Date(e.date);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const formatted = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);
    
    setDate(formatted);
    
    if (categories.includes(e.category)) {
      setCategory(e.category);
      setCustomCategory('');
    } else {
      setCategory('Other');
      setCustomCategory(e.category);
    }
    
    setAmount(e.amount);
    setPaymentMethod(e.paymentMethod);
    setReferenceNo(e.referenceNo || '');
    setNote(e.note || '');
    setIsModalOpen(true);
  };

  // Delete handler
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      DB.deleteExpense(id);
      refreshData();
      showToast('Expense record deleted successfully', 'danger');
    }
  };

  // Save handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Please enter an amount greater than 0', 'warning');
      return;
    }

    const finalCategory = category === 'Other' ? (customCategory.trim() || 'Other') : category;

    const expenseData: Expense = {
      id: editingExpense ? editingExpense.id : 'EXP-' + Date.now().toString().slice(-4) + Math.random().toString(36).substr(2, 2),
      date: new Date(date).toISOString(),
      category: finalCategory,
      amount: Number(amount),
      paymentMethod,
      referenceNo: referenceNo.trim() || undefined,
      note: note.trim() || undefined,
      createdBy: editingExpense ? editingExpense.createdBy : (user?.email || 'Admin')
    };

    DB.saveExpense(expenseData);
    refreshData();
    setIsModalOpen(false);
    showToast(
      editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully',
      'success'
    );
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Amount (₹)', 'Payment Method', 'Reference No', 'Note/Description', 'Recorded By'];
    
    const rows = filteredExpenses.map(e => [
      new Date(e.date).toLocaleString(),
      e.category,
      e.amount.toString(),
      e.paymentMethod,
      e.referenceNo || '-',
      e.note || '-',
      e.createdBy || '-'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Expenses exported successfully', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Expense Manager</h1>
          <p>Record, categorize, and audit company operational cash outflows and utilities costs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleExportCSV} 
            disabled={filteredExpenses.length === 0}
            title="Export Expenses to CSV/Excel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
            <Plus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Period Expenses</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem' }}>₹{totalPeriodExpenses.toFixed(2)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Expenses</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--danger)' }}>₹{todayExpensesVal.toFixed(2)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>This Month's Total</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem' }}>₹{thisMonthExpensesVal.toFixed(2)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--info)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--info-light)', color: 'var(--info)' }}>
            <Tag size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Top Category Outflow</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={topCategory}>
              {topCategory}
            </h3>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Note Search */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '40px' }}
              placeholder="Search expenses by notes, categories or ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date range selection */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date Range:</label>
            <select
              className="form-control"
              style={{ width: '130px', padding: '0.5rem' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Category:</label>
            <select
              className="form-control"
              style={{ width: '160px', padding: '0.5rem' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Payment:</label>
            <select
              className="form-control"
              style={{ width: '150px', padding: '0.5rem' }}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="All">All Methods</option>
              {paymentMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date range picker (conditional) */}
        {dateFilter === 'custom' && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', alignSelf: 'flex-start', flexWrap: 'wrap' }} className="animation-fadeIn">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From:</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '0.35rem 0.60rem', fontSize: '0.8rem', width: '135px' }}
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To:</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '0.35rem 0.60rem', fontSize: '0.8rem', width: '135px' }}
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expense List Table */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        {sortedExpenses.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>Date & Time</span>
                      <ArrowUpDown size={14} style={{ opacity: sortField === 'date' ? 1 : 0.4 }} />
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>Category</span>
                      <ArrowUpDown size={14} style={{ opacity: sortField === 'category' ? 1 : 0.4 }} />
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('amount')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      <span>Amount</span>
                      <ArrowUpDown size={14} style={{ opacity: sortField === 'amount' ? 1 : 0.4 }} />
                    </div>
                  </th>
                  <th>Payment Method</th>
                  <th>Reference ID</th>
                  <th>Note / Description</th>
                  <th>Recorded By</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{new Date(exp.date).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 600 }}>
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                      ₹{exp.amount.toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${
                        exp.paymentMethod === 'Cash' ? 'badge-success' :
                        exp.paymentMethod === 'UPI' ? 'badge-info' :
                        exp.paymentMethod === 'Card' ? 'badge-warning' : 'badge-danger'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: exp.referenceNo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {exp.referenceNo || '-'}
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.note}>
                      {exp.note || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes provided</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                        <User size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{(exp.createdBy || '').split('@')[0]}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-icon"
                          style={{ padding: '0.35rem' }}
                          onClick={() => openEditModal(exp)}
                          title="Edit Record"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon"
                          style={{ padding: '0.35rem' }}
                          onClick={() => handleDelete(exp.id)}
                          title="Delete Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            No expenses logged in this selected range. Click "Add Expense" to record a new business outlay.
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingExpense ? 'Modify Expense Outflow' : 'Record Business Expense'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Date Selection */}
                <div className="form-group">
                  <label>Transaction Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Amount Outflow */}
                <div className="form-group">
                  <label>Amount (₹ Cash Outflow) *</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-secondary)' }}>₹</div>
                    <input
                      type="number"
                      className="form-control"
                      style={{ paddingLeft: '28px' }}
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Category Preset */}
                <div className="grid-2">
                  <div className="form-group">
                    <label>Outflow Category</label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      className="form-control"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                    >
                      {paymentMethods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Category Input if 'Other' Selected */}
                {category === 'Other' && (
                  <div className="form-group animation-fadeIn">
                    <label>Custom Category Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="Enter custom category name (e.g. Donation)"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                    />
                  </div>
                )}

                {/* Optional Reference Details */}
                <div className="form-group">
                  <label>Payment Reference No (Receipt / Txn ID)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter transaction ID, receipt reference number..."
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                  />
                </div>

                {/* Notes/Notes Details */}
                <div className="form-group">
                  <label>Notes / Outflow Description</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Enter details about this expense (e.g. Tea forBalaji Wholesalers rep)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Outflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
