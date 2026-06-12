import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { DB, PattiRecord } from '../utils/db';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Download,
  X,
  Eye,
  RefreshCw,
  PlusCircle,
  Save,
} from 'lucide-react';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PattiItem {
  id: string;
  itemName: string;
  rate: number;
  qty: number;
  weight: number;
  amount: number;
}

interface OtherExpense {
  id: string;
  label: string;
  amount: number;
}

interface PattiExpenses {
  rent: number;
  loading: number;
  commission: number;
  otherList: OtherExpense[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateBillNo = () => {
  const now = new Date();
  return `PAT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
};

const newItemId = () =>
  Date.now().toString() + Math.random().toString(36).slice(2, 5);

const emptyItem = (): PattiItem => ({
  id: newItemId(),
  itemName: '',
  rate: 0,
  qty: 0,
  weight: 0,
  amount: 0,
});

const emptyOther = (): OtherExpense => ({
  id: newItemId(),
  label: '',
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
    otherList: [],
  },
  lessAmount: 0,
  notes: '',
});

// ─── Main Component ───────────────────────────────────────────────────────────
export const Patti: React.FC = () => {
  const { settings, showToast } = useApp();
  const [patti, setPatti] = useState<PattiData>(defaultPatti());
  const [billId] = useState<string>(() => 'PATTI-' + Date.now());
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Derived totals ──────────────────────────────────────────────────────────
  const itemsTotal = patti.items.reduce((s, i) => s + (i.amount || 0), 0);
  const fixedExpenses =
    patti.expenses.rent + patti.expenses.loading + patti.expenses.commission;
  const otherExpensesTotal = patti.expenses.otherList.reduce(
    (s, o) => s + (o.amount || 0),
    0,
  );
  const expensesTotal = fixedExpenses + otherExpensesTotal;
  const grossTotal = itemsTotal + expensesTotal;
  const grandTotal = grossTotal - (patti.lessAmount || 0);

  // ── Item helpers ────────────────────────────────────────────────────────────
  const updateItem = (id: string, field: keyof PattiItem, value: string | number) => {
    setPatti((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'rate' || field === 'weight') {
          updated.amount = Number((updated.rate * updated.weight).toFixed(2));
        }
        return updated;
      }),
    }));
  };

  const addItem = () =>
    setPatti((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (id: string) =>
    setPatti((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((i) => i.id !== id) : prev.items,
    }));

  // ── Fixed expense helper ────────────────────────────────────────────────────
  const updateFixed = (field: 'rent' | 'loading' | 'commission', value: number) =>
    setPatti((prev) => ({
      ...prev,
      expenses: { ...prev.expenses, [field]: value },
    }));

  // ── Dynamic "other" expense helpers ────────────────────────────────────────
  const addOther = () =>
    setPatti((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        otherList: [...prev.expenses.otherList, emptyOther()],
      },
    }));

  const updateOther = (id: string, field: 'label' | 'amount', value: string | number) =>
    setPatti((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        otherList: prev.expenses.otherList.map((o) =>
          o.id === id ? { ...o, [field]: value } : o,
        ),
      },
    }));

  const removeOther = (id: string) =>
    setPatti((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        otherList: prev.expenses.otherList.filter((o) => o.id !== id),
      },
    }));

  const resetForm = () => {
    if (confirm('Reset and create a new Patti?')) setPatti(defaultPatti());
  };

  // ── Save to database ──────────────────────────────────────────────────────
  const saveToDB = useCallback((pattiData: PattiData, iTotal: number, eTotal: number, gross: number, grand: number) => {
    const record: PattiRecord = {
      id: billId,
      billNo: pattiData.billNo,
      date: pattiData.date,
      mark: pattiData.mark,
      name: pattiData.name,
      vehicleNo: pattiData.vehicleNo,
      items: pattiData.items,
      expenses: pattiData.expenses,
      lessAmount: pattiData.lessAmount,
      notes: pattiData.notes,
      savedAt: new Date().toISOString(),
    };
    DB.savePatti(record);
  }, [billId]);

  // ── Print / PDF ─────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const html = buildPrintHtml(patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
    saveToDB(patti, itemsTotal, expensesTotal, grossTotal, grandTotal);
  }, [patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal, saveToDB]);

  const handleDownloadPDF = useCallback(() => {
    const html = buildPrintHtml(patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal, true);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
    saveToDB(patti, itemsTotal, expensesTotal, grossTotal, grandTotal);
  }, [patti, settings, itemsTotal, expensesTotal, grossTotal, grandTotal, saveToDB]);

  const handleSaveBill = useCallback(() => {
    saveToDB(patti, itemsTotal, expensesTotal, grossTotal, grandTotal);
    showToast(`Patti ${patti.billNo} saved to reports!`, 'success');
  }, [patti, itemsTotal, expensesTotal, grossTotal, grandTotal, saveToDB, showToast]);

  const fmt = (n: number) => `₹${n.toFixed(2)}`;
  const fmtN = (n: number) => n.toFixed(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Patti — Consignment Bill</h1>
          <p>Transport / mandi patti with itemised expenses and grand total</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowPreview(true)}>
            <Eye size={16} /><span>Preview</span>
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /><span>Print</span>
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={16} /><span>Save PDF</span>
          </button>
          <button className="btn btn-secondary" onClick={handleSaveBill} title="Save bill to Reports">
            <Save size={16} /><span>Save</span>
          </button>
          <button className="btn btn-secondary" onClick={resetForm}>
            <RefreshCw size={16} /><span>New</span>
          </button>
        </div>
      </div>

      {/* ── Bill Info ───────────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} style={{ color: 'var(--primary)' }} />
          Bill Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { key: 'billNo', label: 'Bill No *', placeholder: 'PAT-2026-001' },
            { key: 'date', label: 'Date *', type: 'date' },
            { key: 'mark', label: 'Mark / Lot', placeholder: 'e.g. MRP250' },
            { key: 'name', label: 'Party Name *', placeholder: 'Dealer / Buyer name' },
            { key: 'vehicleNo', label: 'Vehicle No', placeholder: 'TN 00 AA 0000' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} className="form-group" style={{ marginBottom: 0 }}>
              <label>{label}</label>
              <input
                className="form-control"
                type={type || 'text'}
                value={(patti as any)[key]}
                placeholder={placeholder}
                style={key === 'vehicleNo' ? { textTransform: 'uppercase' } : undefined}
                onChange={(e) => setPatti((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Items Table ─────────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Items / Rate Chart</h3>
          <button className="btn btn-primary" onClick={addItem} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
            <Plus size={14} /><span>Add Row</span>
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
                  {(['itemName', 'rate', 'qty', 'weight', 'amount'] as const).map((field) => (
                    <td key={field} style={{ padding: '0.35rem 0.5rem' }}>
                      <input
                        className="form-control"
                        type={field === 'itemName' ? 'text' : 'number'}
                        style={{
                          height: '30px', fontSize: '0.82rem', padding: '0.2rem 0.5rem',
                          textAlign: field === 'itemName' ? 'left' : 'right',
                          fontWeight: field === 'amount' ? 600 : undefined,
                          color: field === 'amount' ? 'var(--primary)' : undefined,
                        }}
                        value={field === 'itemName' ? item[field] : (item[field] || '')}
                        placeholder={field === 'itemName' ? 'Tomato / Onion…' : undefined}
                        min={field !== 'itemName' ? 0 : undefined}
                        step={field === 'weight' ? 0.001 : field !== 'itemName' ? 0.01 : undefined}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            field,
                            field === 'itemName' ? e.target.value : parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                  ))}
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

      {/* ── Expenses + Summary ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Expenses panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Expenses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Fixed expenses */}
            {([
              { key: 'rent' as const, label: 'Rent / Freight (₹)' },
              { key: 'loading' as const, label: 'Loading / Unloading (₹)' },
              { key: 'commission' as const, label: 'Commission / Hamali (₹)' },
            ]).map(({ key, label }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</label>
                <input
                  type="number"
                  className="form-control"
                  style={{ textAlign: 'right', height: '32px', fontSize: '0.85rem' }}
                  value={patti.expenses[key] || ''}
                  min="0"
                  step="0.01"
                  onChange={(e) => updateFixed(key, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}

            {/* ── Dynamic other expenses ──────────────────────────────────── */}
            {patti.expenses.otherList.length > 0 && (
              <div style={{
                borderTop: '1px dashed var(--border-color)',
                paddingTop: '0.65rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Other Expenses
                </span>
                {patti.expenses.otherList.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 110px 30px',
                      gap: '0.4rem',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      className="form-control"
                      style={{ height: '32px', fontSize: '0.82rem', padding: '0.2rem 0.5rem' }}
                      value={o.label}
                      placeholder="Expense name…"
                      onChange={(e) => updateOther(o.id, 'label', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-control"
                      style={{ height: '32px', fontSize: '0.85rem', textAlign: 'right' }}
                      value={o.amount || ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateOther(o.id, 'amount', parseFloat(e.target.value) || 0)}
                    />
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeOther(o.id)}
                      title="Remove"
                      style={{
                        padding: '0.25rem',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 'var(--border-radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '32px',
                        width: '30px',
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Other Expense button */}
            <button
              className="btn btn-secondary"
              onClick={addOther}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                justifyContent: 'center',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                border: '1px dashed var(--primary)',
                color: 'var(--primary)',
                background: 'rgba(99,102,241,0.06)',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginTop: patti.expenses.otherList.length === 0 ? '0.25rem' : '0',
              }}
            >
              <PlusCircle size={14} />
              <span>Add Other Expense</span>
            </button>

            {/* Total row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px dashed var(--border-color)',
              paddingTop: '0.5rem',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}>
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

        {/* Summary panel */}
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
              color: 'var(--primary)',
            }}>
              <span>GRAND TOTAL</span>
              <span>{fmt(grandTotal)}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '0.6rem' }}>
              <Printer size={15} /><span>Print</span>
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPDF} style={{ padding: '0.6rem', boxShadow: 'var(--primary-glow)' }}>
              <Download size={15} /><span>Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ───────────────────────────────────────────────────── */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>Patti Preview</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPreview(false)}>
                <X size={20} />
              </button>
            </div>
            <div ref={printRef} style={{ padding: '1.5rem', background: 'white', color: '#000' }}>
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

// ─── Print-preview sub-component ─────────────────────────────────────────────
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
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{shopName}</div>
        {shopAddress && <div style={{ fontSize: '11px', color: '#333' }}>{shopAddress}</div>}
        {shopPhone && <div style={{ fontSize: '11px' }}>Ph: {shopPhone}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px', fontSize: '11.5px' }}>
        <div><strong>Bill No:</strong> {patti.billNo}</div>
        <div style={{ textAlign: 'right' }}><strong>Date:</strong> {new Date(patti.date).toLocaleDateString('en-IN')}</div>
        <div><strong>Party Name:</strong> {patti.name}</div>
        <div style={{ textAlign: 'right' }}><strong>Vehicle No:</strong> {patti.vehicleNo || '-'}</div>
        {patti.mark && <div><strong>Mark / Lot:</strong> {patti.mark}</div>}
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11.5px' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            {['#', 'Item Name', 'Rate (₹)', 'Qty', 'Weight (Kg)', 'Amount (₹)'].map((h, i) => (
              <th key={i} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: i === 0 ? 'center' : i === 1 ? 'left' : 'right' }}>{h}</th>
            ))}
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

      {/* Expenses + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th colSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Expenses</th>
            </tr>
          </thead>
          <tbody>
            {patti.expenses.rent > 0 && (
              <tr><td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Rent / Freight</td><td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(patti.expenses.rent)}</td></tr>
            )}
            {patti.expenses.loading > 0 && (
              <tr><td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Loading / Unloading</td><td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(patti.expenses.loading)}</td></tr>
            )}
            {patti.expenses.commission > 0 && (
              <tr><td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Commission / Hamali</td><td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(patti.expenses.commission)}</td></tr>
            )}
            {patti.expenses.otherList.filter(o => o.amount > 0).map((o) => (
              <tr key={o.id}>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{o.label || 'Other'}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(o.amount)}</td>
              </tr>
            ))}
            <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Total Expenses</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{fmt(expensesTotal)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', alignSelf: 'start' }}>
          <tbody>
            <tr><td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Items Subtotal</td><td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(itemsTotal)}</td></tr>
            <tr><td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Total Expenses</td><td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(expensesTotal)}</td></tr>
            <tr style={{ fontWeight: 'bold' }}><td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Gross Total</td><td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{fmt(grossTotal)}</td></tr>
            {patti.lessAmount > 0 && (
              <tr><td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>Less / Deduction</td><td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>-{fmt(patti.lessAmount)}</td></tr>
            )}
            <tr style={{ background: '#000', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
              <td style={{ border: '1px solid #000', padding: '5px 6px' }}>GRAND TOTAL</td>
              <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {patti.notes && (
        <div style={{ border: '1px solid #ccc', padding: '6px', fontSize: '11px', marginBottom: '10px' }}>
          <strong>Remarks:</strong> {patti.notes}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', fontSize: '11.5px' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>Receiver Signature</div>
        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>Authorised Signatory</div>
      </div>
    </div>
  );
};

// ─── Build print HTML ─────────────────────────────────────────────────────────
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
    </tr>`).join('');

  const expRows = [
    patti.expenses.rent > 0 ? `<tr><td>Rent / Freight</td><td style="text-align:right">${fmt(patti.expenses.rent)}</td></tr>` : '',
    patti.expenses.loading > 0 ? `<tr><td>Loading / Unloading</td><td style="text-align:right">${fmt(patti.expenses.loading)}</td></tr>` : '',
    patti.expenses.commission > 0 ? `<tr><td>Commission / Hamali</td><td style="text-align:right">${fmt(patti.expenses.commission)}</td></tr>` : '',
    ...patti.expenses.otherList
      .filter(o => o.amount > 0)
      .map(o => `<tr><td>${o.label || 'Other'}</td><td style="text-align:right">${fmt(o.amount)}</td></tr>`),
  ].join('');

  const lessRow = patti.lessAmount > 0
    ? `<tr><td>Less / Deduction</td><td style="text-align:right">-${fmt(patti.lessAmount)}</td></tr>`
    : '';
  const notesSection = patti.notes
    ? `<div style="border:1px solid #ccc;padding:6px;font-size:11px;margin-bottom:10px"><strong>Remarks:</strong> ${patti.notes}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Patti - ${patti.billNo}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0;padding:16px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11.5px}
    th,td{border:1px solid #ccc;padding:4px 6px}
    thead th{background:#f0f0f0;border-color:#000}
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
        <tr class="bold" style="background:#f0f0f0">
          <td style="border-color:#000">Total Expenses</td>
          <td class="right" style="border-color:#000">${fmt(expensesTotal)}</td>
        </tr>
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
