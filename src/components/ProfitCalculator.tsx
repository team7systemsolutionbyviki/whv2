import React, { useState, useEffect } from 'react';
import { Calculator, X, Percent } from 'lucide-react';

interface ProfitCalculatorProps {
  purchasePrice: number;
  initialSalesPrice?: number;
  onApply: (salesPrice: number) => void;
  onClose: () => void;
}

export const ProfitCalculator: React.FC<ProfitCalculatorProps> = ({
  purchasePrice,
  initialSalesPrice = 0,
  onApply,
  onClose
}) => {
  const [profitPct, setProfitPct] = useState<number>(25);
  const [isManual, setIsManual] = useState<boolean>(false);
  const [salesPrice, setSalesPrice] = useState<number>(0);
  const [profitAmt, setProfitAmt] = useState<number>(0);

  // Default presets
  const presets = [5, 10, 15, 20, 25, 30, 40, 50];

  useEffect(() => {
    // If we have an initial sales price, back-calculate profit percent
    if (initialSalesPrice > 0 && purchasePrice > 0 && initialSalesPrice > purchasePrice) {
      const diff = initialSalesPrice - purchasePrice;
      const pct = Math.round((diff / purchasePrice) * 100);
      setProfitPct(pct);
      setSalesPrice(initialSalesPrice);
      setProfitAmt(diff);
    } else {
      calculate(profitPct);
    }
  }, [purchasePrice]);

  const calculate = (pct: number) => {
    if (isNaN(pct) || pct < 0) return;
    const amt = (purchasePrice * pct) / 100;
    const finalSalesPrice = purchasePrice + amt;
    setProfitAmt(Number(amt.toFixed(2)));
    setSalesPrice(Number(finalSalesPrice.toFixed(2)));
  };

  const handlePctChange = (val: number) => {
    setProfitPct(val);
    calculate(val);
  };

  const handleManualPriceChange = (price: number) => {
    if (isNaN(price) || price < purchasePrice) {
      setSalesPrice(price);
      setProfitAmt(0);
      return;
    }
    const diff = price - purchasePrice;
    const pct = purchasePrice > 0 ? (diff / purchasePrice) * 100 : 0;
    setSalesPrice(price);
    setProfitAmt(Number(diff.toFixed(2)));
    setProfitPct(Number(pct.toFixed(1)));
  };

  const handleApply = () => {
    onApply(salesPrice);
    onClose();
  };

  return (
    <div style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-md)',
      padding: '1.25rem',
      marginTop: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      animation: 'slideUp 0.2s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <Calculator size={16} />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Profit Margin Calculator</h4>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div className="grid-2" style={{ gap: '0.75rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Purchase Price (Cost)</label>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, padding: '0.5rem 0', borderBottom: '1px dashed var(--border-color)' }}>
            ₹{purchasePrice || 0}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Profit Selector</label>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {isManual ? (
              <input
                type="number"
                className="form-control"
                style={{ padding: '0.4rem 0.5rem', fontSize: '0.9rem' }}
                value={profitPct}
                onChange={(e) => handlePctChange(parseFloat(e.target.value) || 0)}
                placeholder="Profit %"
                min="0"
              />
            ) : (
              <select
                className="form-control"
                style={{ padding: '0.4rem 0.5rem', fontSize: '0.9rem' }}
                value={profitPct}
                onChange={(e) => handlePctChange(parseFloat(e.target.value))}
              >
                {presets.map(p => (
                  <option key={p} value={p}>{p}%</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setIsManual(!isManual)}
              title={isManual ? "Switch to presets" : "Enter manually"}
              style={{
                background: 'var(--border-color)',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '0.5rem',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Percent size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Sales Price Entry / Output */}
      <div className="grid-2" style={{ gap: '0.75rem', background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ color: 'var(--primary)' }}>Profit Amount</label>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
            + ₹{profitAmt}
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Sales Price (Editable)</label>
          <input
            type="number"
            className="form-control"
            style={{ padding: '0.4rem 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}
            value={salesPrice || ''}
            onChange={(e) => handleManualPriceChange(parseFloat(e.target.value) || 0)}
            placeholder="Sales Price"
            min={purchasePrice}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
        <button type="button" className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleApply}>
          Apply Profit
        </button>
      </div>
    </div>
  );
};
