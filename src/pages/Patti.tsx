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
  marketFee?: number;
  levi?: number;
  associationFund?: number;
  saleExp?: number;
  loadingHamali?: number;
  cashAdvance?: number;
  phoneExp?: number;
  aadatCommission?: number;
  otherExpense?: number;
}

interface PattiData {
  billNo: string;
  date: string;
  mark: string;
  name: string;
  vehicleNo: string;
  transporterName?: string;
  truckOwnerMob?: string;
  driverMob?: string;
  truckDriverName?: string;
  freightRate?: string;
  advance?: string;
  dcNo?: string;
  dcDate?: string;
  loadingDate?: string;
  place?: string;
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
  transporterName: '',
  truckOwnerMob: '',
  driverMob: '',
  truckDriverName: '',
  freightRate: '',
  advance: '',
  dcNo: '',
  dcDate: '',
  loadingDate: new Date().toISOString().slice(0, 10),
  place: '',
  items: [emptyItem()],
  expenses: {
    rent: 0,
    loading: 0,
    commission: 0,
    otherList: [],
    marketFee: 0,
    levi: 0,
    associationFund: 0,
    saleExp: 0,
    loadingHamali: 0,
    cashAdvance: 0,
    phoneExp: 0,
    aadatCommission: 0,
    otherExpense: 0,
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
  const specificExpenses =
    (patti.expenses.marketFee || 0) +
    (patti.expenses.levi || 0) +
    (patti.expenses.associationFund || 0) +
    (patti.expenses.saleExp || 0) +
    (patti.expenses.loadingHamali || 0) +
    (patti.expenses.cashAdvance || 0) +
    (patti.expenses.phoneExp || 0) +
    (patti.expenses.aadatCommission || 0) +
    (patti.expenses.otherExpense || 0);
  const otherExpensesTotal = patti.expenses.otherList.reduce(
    (s, o) => s + (o.amount || 0),
    0,
  );
  const expensesTotal = fixedExpenses + specificExpenses + otherExpensesTotal;
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
  const updateFixed = (field: keyof Omit<PattiExpenses, 'otherList'>, value: number) =>
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
      transporterName: pattiData.transporterName || undefined,
      truckOwnerMob: pattiData.truckOwnerMob || undefined,
      driverMob: pattiData.driverMob || undefined,
      truckDriverName: pattiData.truckDriverName || undefined,
      freightRate: pattiData.freightRate ? parseFloat(pattiData.freightRate) || undefined : undefined,
      advance: pattiData.advance ? parseFloat(pattiData.advance) || undefined : undefined,
      dcNo: pattiData.dcNo || undefined,
      dcDate: pattiData.dcDate || undefined,
      loadingDate: pattiData.loadingDate || undefined,
      place: pattiData.place || undefined,
      items: pattiData.items,
      expenses: pattiData.expenses,
      lessAmount: pattiData.lessAmount,
      notes: pattiData.notes,
      savedAt: new Date().toISOString(),
      grandTotal: grand,
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
            { key: 'dcNo', label: 'DC No', placeholder: 'e.g. 892' },
            { key: 'dcDate', label: 'DC Date', type: 'date' },
            { key: 'loadingDate', label: 'Loading Date', type: 'date' },
            { key: 'mark', label: 'Mark / Lot', placeholder: 'e.g. MRP250' },
            { key: 'name', label: 'Party Name *', placeholder: 'Dealer / Buyer name' },
            { key: 'place', label: 'Party Place / City', placeholder: 'e.g. Uadmalpetai' },
            { key: 'vehicleNo', label: 'Vehicle No', placeholder: 'TN 00 AA 0000' },
            { key: 'transporterName', label: 'Transporter Name', placeholder: 'e.g. MAHALAXMI' },
            { key: 'truckDriverName', label: 'Truck Driver Name', placeholder: 'e.g. Satish kumar' },
            { key: 'driverMob', label: 'Driver Mobile (Driver Mob)', placeholder: 'e.g. 9003490996' },
            { key: 'truckOwnerMob', label: 'Truck Owner Mobile', placeholder: 'e.g. 9845012345' },
            { key: 'freightRate', label: 'Freight Rate (₹)', placeholder: 'e.g. 150', type: 'number' },
            { key: 'advance', label: 'Advance Amount (₹)', placeholder: 'e.g. 2000', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} className="form-group" style={{ marginBottom: 0 }}>
              <label>{label}</label>
              <input
                className="form-control"
                type={type || 'text'}
                value={(patti as any)[key] || ''}
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

             {/* Fixed & Mandi Specific expenses */}
             {([
               { key: 'commission' as const, label: 'Commission (₹)' },
               { key: 'marketFee' as const, label: 'Market Fee (₹)' },
               { key: 'loading' as const, label: 'Hamali (₹)' },
               { key: 'levi' as const, label: 'Levi (₹)' },
               { key: 'associationFund' as const, label: 'A. Fund (₹)' },
               { key: 'saleExp' as const, label: 'Sale Exp. (₹)' },
               { key: 'loadingHamali' as const, label: 'Loading Hamali (₹)' },
               { key: 'rent' as const, label: 'Fright / Rent (₹)' },
               { key: 'cashAdvance' as const, label: 'Cash Advance (₹)' },
               { key: 'phoneExp' as const, label: 'Phone Exp. (₹)' },
               { key: 'aadatCommission' as const, label: 'Aadat Commission (₹)' },
               { key: 'otherExpense' as const, label: 'Other (₹)' },
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

  const expensesList = [
    { label: 'Commission', amount: patti.expenses.commission },
    { label: 'Market Fee', amount: patti.expenses.marketFee || 0 },
    { label: 'Hamali', amount: patti.expenses.loading },
    { label: 'Levi', amount: patti.expenses.levi || 0 },
    { label: 'A. Fund', amount: patti.expenses.associationFund || 0 },
    { label: 'Sale Exp.', amount: patti.expenses.saleExp || 0 },
    { label: 'Loading Hamali', amount: patti.expenses.loadingHamali || 0 },
    { label: 'Fright', amount: patti.expenses.rent },
    { label: 'Cash Advance', amount: patti.expenses.cashAdvance || 0 },
    { label: 'Phone Exp.', amount: patti.expenses.phoneExp || 0 },
    { label: 'Aadat Commission', amount: patti.expenses.aadatCommission || 0 },
    { label: 'Other', amount: (patti.expenses.otherExpense || 0) + patti.expenses.otherList.reduce((s, o) => s + (o.amount || 0), 0) },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '11px', maxWidth: '680px', margin: '0 auto', padding: '10px', backgroundColor: '#fff' }}>
      {/* Header matching slip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px double #000', paddingBottom: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '45px', height: '45px', border: '1px solid #000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold', textAlign: 'center' }}>M/s</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0', color: '#b91c1c', letterSpacing: '0.5px' }}>{shopName || 'SHIVKRUPA TRADERS'}</h2>
          <div style={{ fontSize: '10.5px', fontWeight: 'bold', margin: '2px 0', textTransform: 'uppercase', color: '#4b5563' }}>Onion Merchant & Order Suppliers</div>
          <div style={{ fontSize: '10px', color: '#374151' }}>{shopAddress || 'Shop No. 5, APMC, Market Yard, Tal. Parner, Maharashtra'}</div>
          {shopPhone && <div style={{ fontSize: '10px', fontWeight: '600' }}>Mob. {shopPhone}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '22px' }}>🧅</div>
        </div>
      </div>

      {/* Meta details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', marginBottom: '10px', fontSize: '10.5px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div><strong>BILL NO. :</strong> {patti.billNo}</div>
          <div><strong>DATE :</strong> {patti.date ? new Date(patti.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</div>
          <div><strong>DC NO. :</strong> {patti.dcNo || '-'}</div>
          <div><strong>DC DATE :</strong> {patti.dcDate ? new Date(patti.dcDate).toLocaleDateString('en-IN') : '-'}</div>
          <div><strong>LOADING DATE :</strong> {patti.loadingDate ? new Date(patti.loadingDate).toLocaleDateString('en-IN') : '-'}</div>
          <div><strong>VEHICLE NO. :</strong> <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{patti.vehicleNo || '-'}</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
          <div style={{ fontSize: '12px' }}><strong>M/s. {patti.name}</strong></div>
          {patti.place && <div style={{ fontSize: '11px', color: '#374151' }}><strong>{patti.place}</strong></div>}
          {patti.mark && <div style={{ marginTop: '8px' }}><strong>MARK :</strong> <span style={{ border: '1px solid #000', padding: '1px 4px', fontWeight: 'bold' }}>{patti.mark}</span></div>}
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '10.5px' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '1.5px solid #000' }}>
            <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'left', width: '25%' }}>PARTICULARS</th>
            <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center', width: '12%' }}>MARK</th>
            <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center', width: '8%' }}>BAGS</th>
            <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right', width: '12%' }}>WEIGHT</th>
            <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right', width: '10%' }}>RATE</th>
            <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right', width: '13%' }}>AMOUNT</th>
            <th style={{ borderBottom: '1px solid #000', padding: '4px', textAlign: 'center', width: '20%' }}>EXPENSES</th>
          </tr>
        </thead>
        <tbody>
          {patti.items.map((item, idx) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ borderRight: '1px solid #000', padding: '4px 6px', verticalAlign: 'middle' }}>{item.itemName || 'Onion'}</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>{patti.mark || '-'}</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>{item.qty}</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'right', verticalAlign: 'middle' }}>{fmtN(item.weight)}</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'right', verticalAlign: 'middle' }}>{item.rate > 0 ? item.rate.toFixed(2) : '-'}</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle' }}>{fmt(item.amount)}</td>
              {idx === 0 && (
                <td rowSpan={patti.items.length + 1} style={{ padding: '0', verticalAlign: 'top', borderLeft: '1px solid #000', borderBottom: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <tbody>
                      {expensesList.map((e, eIdx) => (
                        <tr key={eIdx} style={{ borderBottom: eIdx === expensesList.length - 1 ? '1px solid #000' : '1px solid #eee' }}>
                          <td style={{ padding: '2px 4px', borderRight: '1px solid #eee', width: '60%' }}>{e.label}</td>
                          <td style={{ padding: '2px 4px', textAlign: 'right' }}>{e.amount > 0 ? e.amount.toFixed(2) : e.amount < 0 ? e.amount.toFixed(2) : '-'}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f9fafb', fontWeight: 'bold' }}>
                        <td style={{ padding: '3px 4px', borderRight: '1px solid #eee' }}>Total</td>
                        <td style={{ padding: '3px 4px', textAlign: 'right', color: '#b91c1c' }}>{expensesTotal.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              )}
            </tr>
          ))}
          {/* Total Row */}
          <tr style={{ fontWeight: 'bold', background: '#f9fafb', borderTop: '1px solid #000' }}>
            <td colSpan={2} style={{ borderRight: '1px solid #000', padding: '6px' }}>TOTAL</td>
            <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>{totalQty}</td>
            <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right' }}>{fmtN(totalWeight)}</td>
            <td style={{ borderRight: '1px solid #000', padding: '6px' }}></td>
            <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right' }}>{fmt(itemsTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Summary Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', marginTop: '10px', alignItems: 'start' }}>
        <div style={{ border: '1px solid #000', padding: '6px', borderRadius: '3px', fontSize: '9.5px', background: '#fafafa' }}>
          <strong>(AMOUNT IN WORD Rs. {numberToWords(grandTotal)})</strong>
          {patti.notes && <div style={{ marginTop: '8px', borderTop: '1px dashed #ccc', paddingTop: '4px' }}><strong>Note:</strong> {patti.notes}</div>}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1.5px solid #000' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <td style={{ padding: '4px 6px', fontWeight: 'bold', width: '60%' }}>Total Amount Of Goods</td>
              <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(itemsTotal)}</td>
            </tr>
            <tr style={{ background: '#000', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
              <td style={{ padding: '5px 6px' }}>GRAND TOTAL</td>
              <td style={{ padding: '5px 6px', textAlign: 'right' }}>{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Authorized Signatory */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '28px', fontSize: '10px', color: '#4b5563' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center' }}>Receiver Signature</div>
        <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', fontWeight: 'bold' }}>For {shopName || 'SHIVKRUPA TRADERS'}</div>
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
  const dateStr = patti.date ? new Date(patti.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';

  const expensesList = [
    { label: 'Commission', amount: patti.expenses.commission },
    { label: 'Market Fee', amount: patti.expenses.marketFee || 0 },
    { label: 'Hamali', amount: patti.expenses.loading },
    { label: 'Levi', amount: patti.expenses.levi || 0 },
    { label: 'A. Fund', amount: patti.expenses.associationFund || 0 },
    { label: 'Sale Exp.', amount: patti.expenses.saleExp || 0 },
    { label: 'Loading Hamali', amount: patti.expenses.loadingHamali || 0 },
    { label: 'Fright', amount: patti.expenses.rent },
    { label: 'Cash Advance', amount: patti.expenses.cashAdvance || 0 },
    { label: 'Phone Exp.', amount: patti.expenses.phoneExp || 0 },
    { label: 'Aadat Commission', amount: patti.expenses.aadatCommission || 0 },
    { label: 'Other', amount: (patti.expenses.otherExpense || 0) + patti.expenses.otherList.reduce((s, o) => s + (o.amount || 0), 0) },
  ];

  const expensesTableRows = expensesList.map((e, idx) => `
    <tr style="border-bottom: ${idx === expensesList.length - 1 ? '1px solid #000' : '1px solid #eee'}">
      <td style="padding: 2px 4px; border-right: 1px solid #eee; width: 60%;">${e.label}</td>
      <td style="padding: 2px 4px; text-align: right;">${e.amount > 0 ? e.amount.toFixed(2) : e.amount < 0 ? e.amount.toFixed(2) : '-'}</td>
    </tr>
  `).join('');

  const itemRows = patti.items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb">
      <td style="border-right: 1px solid #000; padding: 4px 6px; vertical-align: middle;">${item.itemName || 'Onion'}</td>
      <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle;">${patti.mark || '-'}</td>
      <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle;">${item.qty}</td>
      <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: right; vertical-align: middle;">${fmtN(item.weight)}</td>
      <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: right; vertical-align: middle;">${item.rate > 0 ? item.rate.toFixed(2) : '-'}</td>
      <td style="border-right: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: bold; vertical-align: middle;">${fmt(item.amount)}</td>
      ${idx === 0 ? `
      <td rowspan="${patti.items.length + 1}" style="padding: 0; vertical-align: top; border-left: 1px solid #000; border-bottom: none;">
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
          <tbody>
            ${expensesTableRows}
            <tr style="background: #f9fafb; font-weight: bold;">
              <td style="padding: 3px 4px; border-right: 1px solid #eee;">Total</td>
              <td style="padding: 3px 4px; text-align: right; color: #b91c1c;">${expensesTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </td>
      ` : ''}
    </tr>
  `).join('');

  const wordAmount = numberToWords(grandTotal);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Patti - ${patti.billNo}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;margin:0;padding:12px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10.5px}
    th,td{border:1px solid #ccc;padding:4px 6px}
    thead th{background:#f3f4f6;border-color:#000}
    .bold{font-weight:bold}
    .right{text-align:right}
    .center{text-align:center}
    @media print{body{padding:0}@page{margin:8mm}}
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; alignItems: center; border-bottom: 2px double #000; padding-bottom: 8px; margin-bottom: 10px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 45px; height: 45px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; text-align: center;">M/s</div>
    </div>
    <div style="text-align: center; flex: 1;">
      <h2 style="font-size: 20px; font-weight: 800; margin: 0; color: #b91c1c; letter-spacing: 0.5px;">${settings.shopName || 'SHIVKRUPA TRADERS'}</h2>
      <div style="font-size: 10.5px; font-weight: bold; margin: 2px 0; text-transform: uppercase; color: #4b5563;">Onion Merchant & Order Suppliers</div>
      <div style="font-size: 10px; color: #374151;">${settings.address || 'Shop No. 5, APMC, Market Yard, Tal. Parner, Maharashtra'}</div>
      ${settings.phone ? `<div style="font-size: 10px; font-weight: 600;">Mob. ${settings.phone}</div>` : ''}
    </div>
    <div style="display: flex; align-items: center; gap: 8px; font-size: 22px;">🧅</div>
  </div>

  <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px; margin-bottom: 10px; font-size: 10.5px; border-bottom: 1px solid #000; padding-bottom: 8px;">
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div><strong>BILL NO. :</strong> ${patti.billNo}</div>
      <div><strong>DATE :</strong> ${dateStr}</div>
      <div><strong>DC NO. :</strong> ${patti.dcNo || '-'}</div>
      <div><strong>DC DATE :</strong> ${patti.dcDate ? new Date(patti.dcDate).toLocaleDateString('en-IN') : '-'}</div>
      <div><strong>LOADING DATE :</strong> ${patti.loadingDate ? new Date(patti.loadingDate).toLocaleDateString('en-IN') : '-'}</div>
      <div><strong>VEHICLE NO. :</strong> <span style="font-weight: bold; text-transform: uppercase;">${patti.vehicleNo || '-'}</span></div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px; text-align: right;">
      <div style="font-size: 12px;"><strong>M/s. ${patti.name}</strong></div>
      ${patti.place ? `<div style="font-size: 11px; color: #374151;"><strong>${patti.place}</strong></div>` : ''}
      ${patti.mark ? `<div style="margin-top: 8px;"><strong>MARK :</strong> <span style="border: 1px solid #000; padding: 1px 4px; font-weight: bold;">${patti.mark}</span></div>` : ''}
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 10.5px;">
    <thead>
      <tr style="background: #f3f4f6; border-bottom: 1.5px solid #000;">
        <th style="border-right: 1px solid #000; padding: 4px; text-align: left; width: 25%;">PARTICULARS</th>
        <th style="border-right: 1px solid #000; padding: 4px; text-align: center; width: 12%;">MARK</th>
        <th style="border-right: 1px solid #000; padding: 4px; text-align: center; width: 8%;">BAGS</th>
        <th style="border-right: 1px solid #000; padding: 4px; text-align: right; width: 12%;">WEIGHT</th>
        <th style="border-right: 1px solid #000; padding: 4px; text-align: right; width: 10%;">RATE</th>
        <th style="border-right: 1px solid #000; padding: 4px; text-align: right; width: 13%;">AMOUNT</th>
        <th style="padding: 4px; text-align: center; width: 20%;">EXPENSES</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr style="font-weight: bold; background: #f9fafb; border-top: 1px solid #000;">
        <td colSpan="2" style="border-right: 1px solid #000; padding: 6px;">TOTAL</td>
        <td style="border-right: 1px solid #000; padding: 6px; text-align: center;">${totalQty}</td>
        <td style="border-right: 1px solid #000; padding: 6px; text-align: right;">${fmtN(totalWeight)}</td>
        <td style="border-right: 1px solid #000; padding: 6px;"></td>
        <td style="border-right: 1px solid #000; padding: 6px; text-align: right;">${fmt(itemsTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px; margin-top: 10px; align-items: start;">
    <div style="border: 1px solid #000; padding: 6px; border-radius: 3px; font-size: 9.5px; background: #fafafa;">
      <strong>(AMOUNT IN WORD Rs. ${wordAmount})</strong>
      ${patti.notes ? `<div style="margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 4px;"><strong>Note:</strong> ${patti.notes}</div>` : ''}
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1.5px solid #000;">
      <tbody>
        <tr style="border-bottom: 1px solid #000;">
          <td style="padding: 4px 6px; fontWeight: bold; width: 60%;">Total Amount Of Goods</td>
          <td style="padding: 4px 6px; text-align: right; fontWeight: bold;">${fmt(itemsTotal)}</td>
        </tr>
        <tr style="background: #000; color: #fff; font-weight: bold; font-size: 12px;">
          <td style="padding: 5px 6px;">GRAND TOTAL</td>
          <td style="padding: 5px 6px; text-align: right;">${fmt(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px; font-size: 10px; color: #4b5563;">
    <div style="border-top: 1px solid #000; padding-top: 4px; text-align: center;">Receiver Signature</div>
    <div style="border-top: 1px solid #000; padding-top: 4px; text-align: center; font-weight: bold;">For ${settings.shopName || 'SHIVKRUPA TRADERS'}</div>
  </div>
  ${pdfMode ? `<script>window.onload=function(){window.print();window.close()}</script>` : ''}
</body>
</html>`;
}

// ─── Number to Words Helper ──────────────────────────────────────────────────
function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';
  
  const a = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  
  const convertThousands = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    const tens = n % 100;
    return a[Math.floor(n / 100)] + ' HUNDRED' + (tens ? ' AND ' + convertThousands(tens) : '');
  };

  const convertLakhs = (n: number): string => {
    let str = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    if (crore > 0) {
      str += convertThousands(crore) + ' CRORE ';
    }
    
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    if (lakh > 0) {
      str += convertThousands(lakh) + ' LAKH ';
    }
    
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    if (thousand > 0) {
      str += convertThousands(thousand) + ' THOUSAND ';
    }
    
    if (n > 0) {
      str += convertThousands(n);
    }
    
    return str.trim();
  };

  const whole = Math.floor(num);
  const words = convertLakhs(whole);
  
  return words ? words + ' ONLY' : '';
}
