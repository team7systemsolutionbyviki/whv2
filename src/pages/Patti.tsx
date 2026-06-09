import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Download,
  X,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface PattiItem {
  id: string;
  itemName: string;
  rate: number;
  qty: number;
  weight: number;
  amount: number;
}

interface PattiExpenses {
  rent: number;
  loading: number;
  commission: number;
  other: number;
  otherDesc: string;
}

interface PattiData {
  billNo: string;
  date: string;
  mark: string;
  name: string;
  vehicleNo: string;
  items: PattiItem[];
  expenses: PattiExpenses;
  lessAmount: number;
  notes: string;
}

const generateBillNo = () => {
  const now = new Date();
  return `PAT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
};

const emptyItem = (): PattiItem => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
  itemName: '',
  rate: 0,
  qty: 0,
  weight: 0,
  amount: 0,
});

const defaultPatti = (): PattiData => ({
  billNo: generateBillNo(),
  date: new Date().toISOString().slice(0, 10),
  mark: '',
  name: '',
  vehicleNo: '',
  items: [emptyItem()],
  expenses: {
    rent: 0,
    loading: 0,
    commission: 0,
    other: 0,
    otherDesc: 'Other',
  },
  lessAmount: 0,
  notes: '',
});

export const Patti: React.FC = () => {
  const { settings } = useApp();
  const [patti, setPatti] = useState<PattiData>(defaultPatti());
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // ─── Derived totals ────────────────────────────────────────────────────────
  const itemsTotal = patti.items.reduce((s, i) => s + (i.amount || 0), 0);
  const expensesTotal =
    patti.expenses.rent +
    patti.expenses.loading +
    patti.expenses.commission +
    patti.expenses.other;
  const grossTotal = itemsTotal + expensesTotal;
  const grandTotal = grossTotal - (patti.lessAmount || 0);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const updateItem = (id: string, field: keyof PattiItem, value: string | number) => {
    setPatti((prev) => {
      const items = prev.items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Auto-calculate amount when rate or weight changes
        if (field === 'rate' || field === 'weight' || field === 'qty') {
          updated.amount = Number((updated.rate * updated.weight).toFixed(2));
        }
        return updated;
      });
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setPatti((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (id: string) => {
    setPatti((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((i) => i.id !== id) : prev.items,
    }));
  };

  const updateExpense = (field: keyof PattiExpenses, value: string | number) => {
    setPatti((prev) => ({ ...prev, expenses: { ...prev.expenses, [field]: value } }));
  };

  const resetForm = () => {
    if (confirm('Reset the form and create a new Patti?')) {
      setPatti(defaultPatti());
    }
  };

  // ─── Print / PDF ────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const printHtml = buildPrintHtml(patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(printHtml);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }, [patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal]);

  const handleDownloadPDF = useCallback(() => {
    const printHtml = buildPrintHtml(patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal, true);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(printHtml);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 600);
  }, [patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal]);

  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  const fmtN = (n: number) => n.toFixed(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Patti — Consignment Bill</h1>
          <p>Create transport / mandi patti bills with itemised expenses and grand total</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowPreview(true)}>
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={16} />
            <span>Save PDF</span>
          </button>
          <button className="btn btn-secondary" onClick={resetForm} title="New Patti">
            <RefreshCw size={16} />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* ── Bill Header Details ─────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} style={{ color: 'var(--primary)' }} />
          Bill Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Bill No *</label>
            <input
              className="form-control"
              value={patti.billNo}
              onChange={(e) => setPatti((p) => ({ ...p, billNo: e.target.value }))}
              placeholder="PAT-2026-001"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date *</label>
            <input
              type="date"
              className="form-control"
              value={patti.date}
              onChange={(e) => setPatti((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Mark / Lot</label>
            <input
              className="form-control"
              value={patti.mark}
              onChange={(e) => setPatti((p) => ({ ...p, mark: e.target.value }))}
              placeholder="e.g. MRP250 / mark1"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Party Name *</label>
            <input
              className="form-control"
              value={patti.name}
              onChange={(e) => setPatti((p) => ({ ...p, name: e.target.value }))}
              placeholder="Dealer / Buyer name"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Vehicle No</label>
            <input
              className="form-control"
              value={patti.vehicleNo}
              onChange={(e) => setPatti((p) => ({ ...p, vehicleNo: e.target.value }))}
              placeholder="TN 00 AA 0000"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
          </div>
        </div>
      </div>

      {/* ── Items Table ─────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Items / Rate Chart</h3>
          <button className="btn btn-primary" onClick={addItem} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
            <Plus size={14} />
            <span>Add Row</span>
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '32px' }}>#</th>
                <th>Item Name</th>
                <th style={{ textAlign: 'right', width: '90px' }}>Rate (₹/Kg)</th>
                <th style={{ textAlign: 'right', width: '80px' }}>Qty</th>
                <th style={{ textAlign: 'right', width: '100px' }}>Weight (Kg)</th>
                <th style={{ textAlign: 'right', width: '110px' }}>Amount (₹)</th>
                <th style={{ width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {patti.items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    <input
                      className="form-control"
                      style={{ height: '30px', fontSize: '0.82rem', padding: '0.2rem 0.5rem' }}
                      value={item.itemName}
                      onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                      placeholder="Tomato / Onion / Rice…"
                    />
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    <input
                      type="number"
                      className="form-control"
                      style={{ height: '30px', fontSize: '0.82rem', padding: '0.2rem 0.35rem', textAlign: 'right' }}
                      value={item.rate || ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    <input
                      type="number"
                      className="form-control"
                      style={{ height: '30px', fontSize: '0.82rem', padding: '0.2rem 0.35rem', textAlign: 'right' }}
                      value={item.qty || ''}
                      min="0"
                      step="1"
                      onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    <input
                      type="number"
                      className="form-control"
                      style={{ height: '30px', fontSize: '0.82rem', padding: '0.2rem 0.35rem', textAlign: 'right' }}
                      value={item.weight || ''}
                      min="0"
                      step="0.001"
                      onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    <input
                      type="number"
                      className="form-control"
                      style={{ height: '30px', fontSize: '0.82rem', padding: '0.2rem 0.35rem', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}
                      value={item.amount || ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ textAlign: 'center', padding: '0.35rem 0.25rem' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeItem(item.id)}
                      style={{ padding: '0.2rem', color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-sidebar)', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '0.5rem' }}></td>
                <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  Bags: {patti.items.reduce((s, i) => s + (i.qty || 0), 0)}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  {fmtN(patti.items.reduce((s, i) => s + (i.weight || 0), 0))} Kg
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--primary)' }}>
                  {fmt(itemsTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Expenses + Totals side-by-side ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Expenses */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Expenses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {([
              { key: 'rent', label: 'Rent / Freight (₹)' },
              { key: 'loading', label: 'Loading / Unloading (₹)' },
              { key: 'commission', label: 'Commission / Hamali (₹)' },
            ] as const).map(({ key, label }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</label>
                <input
                  type="number"
                  className="form-control"
                  style={{ textAlign: 'right', height: '32px', fontSize: '0.85rem' }}
                  value={patti.expenses[key] || ''}
                  min="0"
                  step="0.01"
                  onChange={(e) => updateExpense(key, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}

            {/* Other expense with description */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="form-control"
                style={{ height: '32px', fontSize: '0.82rem', padding: '0.2rem 0.5rem' }}
                value={patti.expenses.otherDesc}
                onChange={(e) => updateExpense('otherDesc', e.target.value)}
                placeholder="Other Expense label"
              />
              <input
                type="number"
                className="form-control"
                style={{ textAlign: 'right', height: '32px', fontSize: '0.85rem' }}
                value={patti.expenses.other || ''}
                min="0"
                step="0.01"
                onChange={(e) => updateExpense('other', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
              <span>Total Expenses</span>
              <span style={{ color: 'var(--danger)' }}>{fmt(expensesTotal)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: 0, marginTop: '1rem' }}>
            <label>Remarks / Notes</label>
            <textarea
              className="form-control"
              rows={2}
              value={patti.notes}
              onChange={(e) => setPatti((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional remarks..."
              style={{ resize: 'vertical', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Summary Totals */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Bill Summary</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Items Subtotal</span>
              <span style={{ fontWeight: 600 }}>{fmt(itemsTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Expenses</span>
              <span style={{ fontWeight: 600 }}>{fmt(expensesTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontWeight: 700 }}>
              <span>Gross Total</span>
              <span>{fmt(grossTotal)}</span>
            </div>

            {/* Less amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Less / Deduction (₹)</label>
              <input
                type="number"
                className="form-control"
                style={{ textAlign: 'right', height: '32px', fontSize: '0.85rem', border: '1px solid var(--warning)' }}
                value={patti.lessAmount || ''}
                min="0"
                step="0.01"
                onChange={(e) => setPatti((p) => ({ ...p, lessAmount: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '2px solid var(--primary)',
              paddingTop: '0.75rem',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--primary)'
            }}>
              <span>GRAND TOTAL</span>
              <span>{fmt(grandTotal)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '0.6rem' }}>
              <Printer size={15} />
              <span>Print</span>
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPDF} style={{ padding: '0.6rem', boxShadow: 'var(--primary-glow)' }}>
              <Download size={15} />
              <span>Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ───────────────────────────────────────────────── */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>Patti Preview</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPreview(false)}>
                <X size={20} />
              </button>
            </div>
            <div ref={printRef} style={{ padding: '1.5rem', background: 'white', color: '#000', fontFamily: 'Arial, sans-serif' }}>
              <PattiPrintView
                patti={patti}
                shopName={settings.shopName}
                shopPhone={settings.phone}
                shopAddress={settings.address}
                itemsTotal={itemsTotal}
                expensesTotal={expensesTotal}
                grossTotal={grossTotal}
                grandTotal={grandTotal}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
              <button className="btn btn-secondary" onClick={handlePrint}>
                <Printer size={14} /> Print
              </button>
              <button className="btn btn-primary" onClick={handleDownloadPDF}>
                <Download size={14} /> Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Print-preview sub-component ────────────────────────────────────────────
const PattiPrintView: React.FC<{
  patti: PattiData;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  itemsTotal: number;
  expensesTotal: number;
  grossTotal: number;
  grandTotal: number;
}> = ({ patti, shopName, shopPhone, shopAddress, itemsTotal, expensesTotal, grossTotal, grandTotal }) => {
  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  const fmtN = (n: number) => n.toFixed(3);
  const totalQty = patti.items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalWeight = patti.items.reduce((s, i) => s + (i.weight || 0), 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '12px', maxWidth: '680px', margin: '0 auto' }}>
      {/* Shop header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.05em' }}>{shopName}</div>
        {shopAddress && <div style={{ fontSize: '11px', color: '#333' }}>{shopAddress}</div>}
        {shopPhone && <div style={{ fontSize: '11px' }}>Ph: {shopPhone}</div>}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.1em', textDecoration: 'underline' }}>
        PATTI — CONSIGNMENT BILL
      </div>

      {/* Bill details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px', fontSize: '11.5px' }}>
        <div><strong>Bill No:</strong> {patti.billNo}</div>
        <div style={{ textAlign: 'right' }}><strong>Date:</strong> {new Date(patti.date).toLocaleDateString('en-IN')}</div>
        <div><strong>Party Name:</strong> {patti.name}</div>
        <div style={{ textAlign: 'right' }}><strong>Vehicle No:</strong> {patti.vehicleNo || '-'}</div>
        {patti.mark && <div><strong>Mark / Lot:</strong> {patti.mark}</div>}
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11.5px' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>#</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Item Name</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Rate (₹)</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Qty</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Weight (Kg)</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {patti.items.map((item, idx) => (
            <tr key={item.id}>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{item.itemName || '-'}</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{item.qty}</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmtN(item.weight)}</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f9f9f9', fontWeight: 'bold' }}>
            <td colSpan={3} style={{ border: '1px solid #000', padding: '4px 6px' }}>Total</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{totalQty}</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{fmtN(totalWeight)} Kg</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{fmt(itemsTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Expenses + Summary two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
        {/* Expenses */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th colSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Expenses</th>
            </tr>
          </thead>
          <tbody>
            {patti.expenses.rent > 0 && (
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Rent / Freight</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(patti.expenses.rent)}</td>
              </tr>
            )}
            {patti.expenses.loading > 0 && (
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Loading / Unloading</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(patti.expenses.loading)}</td>
              </tr>
            )}
            {patti.expenses.commission > 0 && (
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Commission / Hamali</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(patti.expenses.commission)}</td>
              </tr>
            )}
            {patti.expenses.other > 0 && (
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{patti.expenses.otherDesc}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(patti.expenses.other)}</td>
              </tr>
            )}
            <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Total Expenses</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{fmt(expensesTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Summary */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', alignSelf: 'start' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Items Subtotal</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(itemsTotal)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Total Expenses</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(expensesTotal)}</td>
            </tr>
            <tr style={{ fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Gross Total</td>
              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(grossTotal)}</td>
            </tr>
            {patti.lessAmount > 0 && (
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Less / Deduction</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>-{fmt(patti.lessAmount)}</td>
              </tr>
            )}
            <tr style={{ background: '#000', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
              <td style={{ border: '1px solid #000', padding: '5px 6px' }}>GRAND TOTAL</td>
              <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {patti.notes && (
        <div style={{ border: '1px solid #ccc', padding: '6px', fontSize: '11px', marginBottom: '10px' }}>
          <strong>Remarks:</strong> {patti.notes}
        </div>
      )}

      {/* Signature */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', fontSize: '11.5px' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>Receiver Signature</div>
        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>Authorised Signatory</div>
      </div>
    </div>
  );
};

// ─── Build print HTML string ─────────────────────────────────────────────────
function buildPrintHtml(
  patti: PattiData,
  settings: any,
  itemsTotal: number,
  expensesTotal: number,
  grossTotal: number,
  grandTotal: number,
  pdfMode = false,
): string {
  const fmt = (n: number) => `&#8377;${n.toFixed(2)}`;
  const fmtN = (n: number) => n.toFixed(3);
  const totalQty = patti.items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalWeight = patti.items.reduce((s, i) => s + (i.weight || 0), 0);
  const dateStr = new Date(patti.date).toLocaleDateString('en-IN');

  const itemRows = patti.items.map((item, idx) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${item.itemName || '-'}</td>
      <td style="text-align:right">${item.rate.toFixed(2)}</td>
      <td style="text-align:right">${item.qty}</td>
      <td style="text-align:right">${fmtN(item.weight)}</td>
      <td style="text-align:right;font-weight:bold">${fmt(item.amount)}</td>
    </tr>
  `).join('');

  const expRows = [
    patti.expenses.rent > 0 ? `<tr><td>Rent / Freight</td><td style="text-align:right">${fmt(patti.expenses.rent)}</td></tr>` : '',
    patti.expenses.loading > 0 ? `<tr><td>Loading / Unloading</td><td style="text-align:right">${fmt(patti.expenses.loading)}</td></tr>` : '',
    patti.expenses.commission > 0 ? `<tr><td>Commission / Hamali</td><td style="text-align:right">${fmt(patti.expenses.commission)}</td></tr>` : '',
    patti.expenses.other > 0 ? `<tr><td>${patti.expenses.otherDesc}</td><td style="text-align:right">${fmt(patti.expenses.other)}</td></tr>` : '',
  ].join('');

  const lessRow = patti.lessAmount > 0 ? `<tr><td>Less / Deduction</td><td style="text-align:right">-${fmt(patti.lessAmount)}</td></tr>` : '';
  const notesSection = patti.notes ? `<div style="border:1px solid #ccc;padding:6px;font-size:11px;margin-bottom:10px"><strong>Remarks:</strong> ${patti.notes}</div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Patti - ${patti.billNo}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0;padding:16px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11.5px}
    th,td{border:1px solid #ccc;padding:4px 6px}
    thead th{background:#f0f0f0;border-color:#000}
    .no-border td,.no-border th{border:none}
    .bold{font-weight:bold}
    .right{text-align:right}
    .center{text-align:center}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
    .grand-row td{background:#000;color:#fff;font-weight:bold;font-size:13px}
    @media print{body{padding:0}@page{margin:10mm}}
  </style>
</head>
<body>
  <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px">
    <div style="font-size:18px;font-weight:bold">${settings.shopName || 'SUPER MART'}</div>
    ${settings.address ? `<div style="font-size:11px;color:#333">${settings.address}</div>` : ''}
    ${settings.phone ? `<div style="font-size:11px">Ph: ${settings.phone}</div>` : ''}
  </div>

  <div style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:8px;text-decoration:underline;letter-spacing:0.1em">
    PATTI &mdash; CONSIGNMENT BILL
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:10px;font-size:11.5px">
    <div><strong>Bill No:</strong> ${patti.billNo}</div>
    <div style="text-align:right"><strong>Date:</strong> ${dateStr}</div>
    <div><strong>Party Name:</strong> ${patti.name}</div>
    <div style="text-align:right"><strong>Vehicle No:</strong> ${patti.vehicleNo || '-'}</div>
    ${patti.mark ? `<div><strong>Mark / Lot:</strong> ${patti.mark}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width:32px">#</th>
        <th>Item Name</th>
        <th class="right">Rate (&#8377;)</th>
        <th class="right">Qty</th>
        <th class="right">Weight (Kg)</th>
        <th class="right">Amount (&#8377;)</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr class="bold" style="background:#f9f9f9">
        <td colspan="3">Total</td>
        <td class="right">${totalQty}</td>
        <td class="right">${fmtN(totalWeight)} Kg</td>
        <td class="right">${fmt(itemsTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="grid2">
    <table>
      <thead><tr><th colspan="2" class="center">Expenses</th></tr></thead>
      <tbody>
        ${expRows}
        <tr class="bold" style="background:#f0f0f0"><td style="border-color:#000">Total Expenses</td><td class="right" style="border-color:#000">${fmt(expensesTotal)}</td></tr>
      </tbody>
    </table>

    <table>
      <tbody>
        <tr><td>Items Subtotal</td><td class="right">${fmt(itemsTotal)}</td></tr>
        <tr><td>Total Expenses</td><td class="right">${fmt(expensesTotal)}</td></tr>
        <tr class="bold"><td>Gross Total</td><td class="right">${fmt(grossTotal)}</td></tr>
        ${lessRow}
        <tr class="grand-row"><td>GRAND TOTAL</td><td class="right">${fmt(grandTotal)}</td></tr>
      </tbody>
    </table>
  </div>

  ${notesSection}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px;font-size:11.5px">
    <div style="border-top:1px solid #000;padding-top:4px;text-align:center">Receiver Signature</div>
    <div style="border-top:1px solid #000;padding-top:4px;text-align:center">Authorised Signatory</div>
  </div>

  ${pdfMode ? `<script>window.onload=function(){window.print();window.close()}</script>` : ''}
</body>
</html>`;
}
