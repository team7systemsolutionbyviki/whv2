import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Sale, Product, DB } from '../utils/db';
import { X, Printer, Share2, FileText, Smartphone } from 'lucide-react';

interface PrintPreviewModalProps {
  sale: Sale;
  onClose: () => void;
  autoPrint?: boolean;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ sale, onClose, autoPrint }) => {
  const { settings, showToast } = useApp();
  const [printFormat, setPrintFormat] = useState<'a4' | '3inch' | '4inch' | 'a5'>((settings.defaultPrinterLayout as any) || '3inch');

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = sale.customerPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Hello ${sale.customerName}, thank you for shopping with us! Your invoice ${sale.invoiceNo} for ₹${sale.total} has been generated. Details: ${settings.shopName || 'Supermarket'}`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showToast('WhatsApp link opened!', 'success');
  };

  // Helper calculations
  const formatKGColumn = (item: any) => {
    if (item.weight && item.weight > 0) {
      return `${Number(item.weight.toFixed(3))} Kg`;
    }
    const unit = (item.unit || '').toLowerCase().trim();
    if (unit === 'bag' || unit === 'bags') {
      return `${Number(item.qty.toFixed(3))}`;
    }
    return `${Number(item.qty.toFixed(3))} ${item.unit || 'Pcs'}`;
  };

  const calculateTaxable = () => {
    // If tax rate is 18%, taxable = total / 1.18
    const taxRateDecimal = 1 + (settings.taxRate / 100);
    const taxableValue = sale.total / taxRateDecimal;
    const taxValue = sale.total - taxableValue;
    return {
      taxable: Number(taxableValue.toFixed(2)),
      tax: Number(taxValue.toFixed(2)),
      cgst: Number((taxValue / 2).toFixed(2)),
      sgst: Number((taxValue / 2).toFixed(2))
    };
  };

  const taxDetails = calculateTaxable();

  // Get dealer outstanding balance due (if credit/dealer sale)
  const dealerForSale = sale.dealerId ? DB.getDealers().find(d => d.id === sale.dealerId) : null;
  // Balance due = dealer's current outstanding (already updated after this sale)
  const balanceDue = dealerForSale ? dealerForSale.outstanding : 0;

  const receivedAmount = (sale.paymentDetails?.cashAmount || 0) + (sale.paymentDetails?.upiAmount || 0) + (sale.paymentDetails?.cardAmount || 0);
  const billBalance = Math.max(0, sale.total - receivedAmount);

  const calculateTotalWeight = () => {
    return sale.items.reduce((sum, item) => sum + (item.weight || 0), 0);
  };

  const calculateTotalBags = () => {
    return sale.items.reduce((sum, item) => sum + (item.bags || 0), 0);
  };

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Print layout JSX for both on-screen and print portal
  const renderInvoiceContent = (format: 'a4' | '3inch' | '4inch' | 'a5') => {
    const dateFormatted = new Date(sale.date).toLocaleString();

    if (format === 'a4') {
      return (
        <div className="print-a4" style={{ fontFamily: 'var(--font-body)', background: '#fff', color: '#000' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase' }}>{settings.shopName}</h2>
              <p style={{ margin: '0.2rem 0', wordBreak: 'break-word' }}>{settings.address}</p>
              <p style={{ margin: '0.2rem 0', wordBreak: 'break-word' }}>Phone: {settings.phone}</p>
              {settings.gstin && <p style={{ margin: '0.2rem 0', fontWeight: 600 }}>GSTIN: {settings.gstin}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.5rem' }}>TAX INVOICE</h3>
              <p><strong>Invoice No:</strong> {sale.invoiceNo}</p>
              <p><strong>Date:</strong> {dateFormatted}</p>
              <p><strong>Type:</strong> {sale.type.toUpperCase()} SALE</p>
            </div>
          </div>

          {/* Customer details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            <div>
              <h4 style={{ fontWeight: 600, borderBottom: '1px solid #ddd', paddingBottom: '0.25rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>BILLED TO:</h4>
              <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{sale.customerName}</p>
              {sale.customerPhone && <p>Phone: {sale.customerPhone}</p>}
            </div>
            <div>
              <h4 style={{ fontWeight: 600, borderBottom: '1px solid #ddd', paddingBottom: '0.25rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>PAYMENT DETAILS:</h4>
              <p><strong>Method:</strong> {sale.paymentMethod}</p>
              <p><strong>Status:</strong> Completed</p>
            </div>
          </div>

          {/* Products Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '8px', border: '1px solid #d1d5db', width: '50px', textAlign: 'center' }}>S.No</th>
                <th style={{ padding: '8px', border: '1px solid #d1d5db' }}>Product Description</th>
                <th style={{ padding: '8px', border: '1px solid #d1d5db', width: '80px', textAlign: 'center' }}>Bags</th>
                <th style={{ padding: '8px', border: '1px solid #d1d5db', width: '100px', textAlign: 'center' }}>KG</th>
                <th style={{ padding: '8px', border: '1px solid #d1d5db', width: '100px', textAlign: 'right' }}>Price (₹)</th>
                <th style={{ padding: '8px', border: '1px solid #d1d5db', width: '120px', textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>
                    {item.name}
                    {item.lotNo && (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>
                        Lot: {item.lotNo}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>{item.bags || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>
                    {formatKGColumn(item)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'right' }}>{item.salesPrice.toFixed(2)}</td>
                  <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'right' }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}></td>
                <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>Total</td>
                <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>{calculateTotalBags()}</td>
                <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>
                  {calculateTotalWeight() > 0 ? `${Number(calculateTotalWeight().toFixed(3))} Kg` : ''}
                </td>
                <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'right' }}></td>
                <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'right' }}>{sale.subtotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Bottom section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '1rem' }}>
            {/* Terms & QR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Terms & Conditions:</h4>
                <p style={{ fontSize: '0.75rem', color: '#4b5563', whiteSpace: 'pre-line' }}>{settings.terms}</p>
              </div>
              {settings.showQrPaymentReceipt !== false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* QR Code representation */}
                  <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifySelf: 'center', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ width: '68px', height: '68px', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 8px 8px', border: '2px solid black' }}></div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>Scan QR to Pay / Verify</p>
                    <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>UPI Supported Apps</p>
                    {settings.upiId && <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem' }}><strong>UPI ID:</strong> {settings.upiId}</p>}
                    {settings.bankName && <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.7rem' }}><strong>Bank:</strong> {settings.bankName} &bull; A/C: {settings.bankAccNo} &bull; IFSC: {settings.bankIFSC}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Calculations & Sign */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid #ddd', paddingBottom: '0.75rem' }}>

                {sale.discount > 0 && (
                  <div className="print-flex-between" style={{ color: 'red' }}>
                    <span>Discount:</span>
                    <span>- ₹{sale.discount.toFixed(2)}</span>
                  </div>
                )}
                {sale.othersCharge !== undefined && sale.othersCharge > 0 && (
                  <div className="print-flex-between">
                    <span>Other Charges:</span>
                    <span>+ ₹{sale.othersCharge.toFixed(2)}</span>
                  </div>
                )}
                {settings.showGstReceipt !== false && settings.gstin && (
                  <>
                    <div className="print-flex-between">
                      <span>CGST ({settings.taxRate / 2}%):</span>
                      <span>₹{taxDetails.cgst}</span>
                    </div>
                    <div className="print-flex-between">
                      <span>SGST ({settings.taxRate / 2}%):</span>
                      <span>₹{taxDetails.sgst}</span>
                    </div>
                  </>
                )}
                <div className="print-flex-between" style={{ fontSize: '1.1rem', fontWeight: 700, paddingTop: '0.25rem', borderTop: '2px double #333' }}>
                  <span>Grand Total:</span>
                  <span>₹{sale.total.toFixed(2)}</span>
                </div>
                <div className="print-flex-between" style={{ fontWeight: 600 }}>
                  <span>Received Amount:</span>
                  <span>₹{receivedAmount.toFixed(2)}</span>
                </div>
                <div className="print-flex-between" style={{ fontWeight: 600 }}>
                  <span>Bill Balance:</span>
                  <span>₹{billBalance.toFixed(2)}</span>
                </div>
                {dealerForSale && (
                  <>
                    <div className="print-flex-between" style={{ fontWeight: 600 }}>
                      <span>Old Balance:</span>
                      <span>₹{(balanceDue - billBalance).toFixed(2)}</span>
                    </div>
                    <div className="print-flex-between" style={{ color: '#dc2626', fontWeight: 700, borderTop: '1px dashed #dc2626', paddingTop: '0.35rem', marginTop: '0.1rem' }}>
                      <span>Outstanding Due:</span>
                      <span>₹{balanceDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div style={{ marginTop: '2rem', alignSelf: 'flex-end', width: '180px', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (format === '3inch') {
      return (
        <div className="print-3inch" style={{ fontFamily: 'Courier New', color: '#000', background: '#fff' }}>
          <div className="print-text-center">
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{settings.shopName}</h3>
            <p style={{ margin: '0 0 2px 0', wordBreak: 'break-word' }}>{settings.address}</p>
            <p style={{ margin: '0 0 2px 0', wordBreak: 'break-word' }}>PH: {settings.phone}</p>
            {settings.gstin && <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>GSTIN: {settings.gstin}</p>}
            <div className="print-divider"></div>
          </div>

          <div style={{ fontSize: '9px', margin: '4px 0' }}>
            <div>INV NO: {sale.invoiceNo}</div>
            <div>DATE  : {dateFormatted}</div>
            <div>CUSTOMER: {sale.customerName}</div>
            {sale.customerPhone && <div>PHONE   : {sale.customerPhone}</div>}
          </div>

          <div className="print-divider"></div>

          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '40%' }}>ITEM</th>
                <th style={{ textAlign: 'center', width: '15%' }}>BAG</th>
                <th style={{ textAlign: 'center', width: '20%' }}>KG</th>
                <th style={{ textAlign: 'right', width: '25%' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'left' }}>
                    {item.name.slice(0, 12)}
                    {item.lotNo && ` (L:${item.lotNo})`}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.bags || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {formatKGColumn(item)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', borderTop: '1px dashed black' }}>
                <td style={{ textAlign: 'left', paddingTop: '4px' }}>Total</td>
                <td style={{ textAlign: 'center', paddingTop: '4px' }}>{calculateTotalBags()}</td>
                <td style={{ textAlign: 'center', paddingTop: '4px' }}>
                  {calculateTotalWeight() > 0 ? `${Number(calculateTotalWeight().toFixed(3))} Kg` : ''}
                </td>
                <td style={{ textAlign: 'right', paddingTop: '4px' }}>{sale.subtotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="print-divider"></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px' }}>

            {sale.discount > 0 && (
              <div className="print-flex-between">
                <span>Discount:</span>
                <span>-₹{sale.discount.toFixed(2)}</span>
              </div>
            )}
            {sale.othersCharge !== undefined && sale.othersCharge > 0 && (
              <div className="print-flex-between">
                <span>Other Charges:</span>
                <span>+₹{sale.othersCharge.toFixed(2)}</span>
              </div>
            )}
            {settings.showGstReceipt !== false && settings.gstin && (
              <div className="print-flex-between">
                <span>GST Tax ({settings.taxRate}%):</span>
                <span>₹{taxDetails.tax}</span>
              </div>
            )}
            <div className="print-flex-between" style={{ fontWeight: 'bold', fontSize: '11px', borderTop: '1px dashed black', paddingTop: '3px' }}>
              <span>GRAND TOTAL:</span>
              <span>₹{sale.total.toFixed(2)}</span>
            </div>
            <div className="print-flex-between">
              <span>RECEIVED AMT:</span>
              <span>₹{receivedAmount.toFixed(2)}</span>
            </div>
            <div className="print-flex-between">
              <span>BILL BALANCE:</span>
              <span>₹{billBalance.toFixed(2)}</span>
            </div>
            {dealerForSale && (
              <>
                <div className="print-flex-between">
                  <span>OLD BALANCE:</span>
                  <span>₹{(balanceDue - billBalance).toFixed(2)}</span>
                </div>
                <div className="print-flex-between" style={{ color: '#dc2626', fontWeight: 'bold', borderTop: '1px dashed #dc2626', paddingTop: '3px', marginTop: '1px' }}>
                  <span>OUTSTANDING DUE:</span>
                  <span>₹{balanceDue.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="print-divider"></div>

          {/* Barcode and QR */}
          <div className="print-text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
            {/* Simulated Barcode */}
            <div style={{ display: 'flex', height: '24px', width: '100px', letterSpacing: '2px', background: 'repeating-linear-gradient(90deg, #000 0px 2px, #fff 2px 4px)', borderLeft: '2px solid black', borderRight: '1px solid black' }}></div>
            <div style={{ fontSize: '8px' }}>*{sale.invoiceNo}*</div>
            
            {/* Simulated UPI QR */}
            {settings.showQrPaymentReceipt !== false && (
              <>
                <div style={{ width: '48px', height: '48px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 6px 6px' }}></div>
                <div style={{ fontSize: '7px', fontWeight: 'bold' }}>SCAN TO PAY</div>
                {settings.upiId && <div style={{ fontSize: '7px', marginTop: '1px' }}>UPI: {settings.upiId}</div>}
                {settings.bankName && <div style={{ fontSize: '6.5px', marginTop: '1.5px', lineHeight: '8px' }}>BANK: {settings.bankName}<br/>A/C: {settings.bankAccNo}<br/>IFSC: {settings.bankIFSC}</div>}
              </>
            )}
            <div style={{ fontSize: '8px', marginTop: '6px', fontStyle: 'italic' }}>Thank You! Visit Again</div>
          </div>
        </div>
      );
    }

    if (format === 'a5') {
      return (
        <div className="print-a5" style={{ fontFamily: 'var(--font-body)', background: '#fff', color: '#000', padding: '10px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{settings.shopName}</h3>
              <p style={{ margin: '0.1rem 0', fontSize: '0.75rem', wordBreak: 'break-word' }}>{settings.address}</p>
              <p style={{ margin: '0.1rem 0', fontSize: '0.75rem', wordBreak: 'break-word' }}>Phone: {settings.phone}</p>
              {settings.gstin && <p style={{ margin: '0.1rem 0', fontWeight: 600, fontSize: '0.75rem' }}>GSTIN: {settings.gstin}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 700, margin: '0 0 0.2rem 0' }}>TAX INVOICE</h4>
              <p style={{ margin: '0.1rem 0', fontSize: '0.75rem' }}><strong>Invoice No:</strong> {sale.invoiceNo}</p>
              <p style={{ margin: '0.1rem 0', fontSize: '0.75rem' }}><strong>Date:</strong> {dateFormatted}</p>
            </div>
          </div>

          {/* Customer details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.6rem', background: '#f9fafb', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '0.75rem' }}>
            <div>
              <p style={{ margin: '0.1rem 0' }}><strong>BILLED TO:</strong> {sale.customerName}</p>
              {sale.customerPhone && <p style={{ margin: '0.1rem 0' }}><strong>Phone:</strong> {sale.customerPhone}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0.1rem 0' }}><strong>Payment Method:</strong> {sale.paymentMethod}</p>
              <p style={{ margin: '0.1rem 0' }}><strong>Sale Type:</strong> {sale.type.toUpperCase()}</p>
            </div>
          </div>

          {/* Products Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.6rem', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '5px', border: '1px solid #d1d5db', width: '35px', textAlign: 'center' }}>S.No</th>
                <th style={{ padding: '5px', border: '1px solid #d1d5db' }}>Product Description</th>
                <th style={{ padding: '5px', border: '1px solid #d1d5db', width: '50px', textAlign: 'center' }}>Bags</th>
                <th style={{ padding: '5px', border: '1px solid #d1d5db', width: '60px', textAlign: 'center' }}>KG</th>
                <th style={{ padding: '5px', border: '1px solid #d1d5db', width: '70px', textAlign: 'right' }}>Price (₹)</th>
                <th style={{ padding: '5px', border: '1px solid #d1d5db', width: '80px', textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>
                    {item.name}
                    {item.lotNo && (
                      <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block' }}>
                        Lot: {item.lotNo}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{item.bags || '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>
                    {formatKGColumn(item)}
                  </td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'right' }}>{item.salesPrice.toFixed(2)}</td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'right' }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                <td style={{ padding: '5px', border: '1px solid #d1d5db', textAlign: 'center' }}></td>
                <td style={{ padding: '5px', border: '1px solid #d1d5db' }}>Total</td>
                <td style={{ padding: '5px', border: '1px solid #d1d5db', textAlign: 'center' }}>{calculateTotalBags()}</td>
                <td style={{ padding: '5px', border: '1px solid #d1d5db', textAlign: 'center' }}>
                  {calculateTotalWeight() > 0 ? `${Number(calculateTotalWeight().toFixed(3))} Kg` : ''}
                </td>
                <td style={{ padding: '5px', border: '1px solid #d1d5db', textAlign: 'right' }}></td>
                <td style={{ padding: '5px', border: '1px solid #d1d5db', textAlign: 'right' }}>{sale.subtotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Bottom section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginTop: '0.4rem', fontSize: '0.75rem' }}>
            {/* Terms & QR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>
                <h5 style={{ fontWeight: 600, fontSize: '0.7rem', margin: '0 0 0.1rem 0' }}>Terms & Conditions:</h5>
                <p style={{ fontSize: '0.6rem', color: '#4b5563', whiteSpace: 'pre-line', margin: 0, lineHeight: 1.2 }}>{settings.terms}</p>
              </div>
              {settings.showQrPaymentReceipt !== false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ border: '1px solid #ccc', padding: '2px', borderRadius: '4px', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '38px', height: '38px', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 5px 5px', border: '1px solid black' }}></div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 600, margin: 0 }}>Scan QR to Pay</p>
                    <p style={{ fontSize: '0.55rem', color: '#6b7280', margin: 0 }}>UPI Apps Supported</p>
                    {settings.upiId && <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.55rem', color: '#4b5563', lineHeight: 1.1 }}><strong>UPI ID:</strong> {settings.upiId}</p>}
                    {settings.bankName && <p style={{ margin: 0, fontSize: '0.55rem', color: '#4b5563', lineHeight: 1.1 }}><strong>Bank:</strong> {settings.bankName} &bull; A/C: {settings.bankAccNo} &bull; IFSC: {settings.bankIFSC}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', borderBottom: '1px solid #ddd', paddingBottom: '0.4rem' }}>

                {sale.discount > 0 && (
                  <div className="print-flex-between" style={{ color: 'red' }}>
                    <span>Discount:</span>
                    <span>- ₹{sale.discount.toFixed(2)}</span>
                  </div>
                )}
                {sale.othersCharge !== undefined && sale.othersCharge > 0 && (
                  <div className="print-flex-between">
                    <span>Other Charges:</span>
                    <span>+ ₹{sale.othersCharge.toFixed(2)}</span>
                  </div>
                )}
                {settings.showGstReceipt !== false && settings.gstin && (
                  <>
                    <div className="print-flex-between">
                      <span>CGST ({settings.taxRate / 2}%):</span>
                      <span>₹{taxDetails.cgst}</span>
                    </div>
                    <div className="print-flex-between">
                      <span>SGST ({settings.taxRate / 2}%):</span>
                      <span>₹{taxDetails.sgst}</span>
                    </div>
                  </>
                )}
                <div className="print-flex-between" style={{ fontSize: '0.9rem', fontWeight: 700, paddingTop: '0.2rem', borderTop: '1px double #333' }}>
                  <span>Grand Total:</span>
                  <span>₹{sale.total.toFixed(2)}</span>
                </div>
                <div className="print-flex-between" style={{ fontWeight: 600 }}>
                  <span>Received Amount:</span>
                  <span>₹{receivedAmount.toFixed(2)}</span>
                </div>
                <div className="print-flex-between" style={{ fontWeight: 600 }}>
                  <span>Bill Balance:</span>
                  <span>₹{billBalance.toFixed(2)}</span>
                </div>
                {dealerForSale && (
                  <>
                    <div className="print-flex-between" style={{ fontSize: '0.75rem' }}>
                      <span>Old Balance:</span>
                      <span>₹{(balanceDue - billBalance).toFixed(2)}</span>
                    </div>
                    <div className="print-flex-between" style={{ color: '#dc2626', fontWeight: 700, borderTop: '1px dashed #dc2626', paddingTop: '0.25rem', marginTop: '0.1rem', fontSize: '0.85rem' }}>
                      <span>Outstanding Due:</span>
                      <span>₹{balanceDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div style={{ marginTop: '0.5rem', alignSelf: 'flex-end', width: '110px', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '0.1rem', fontSize: '0.65rem', fontWeight: 600 }}>
                  Authorized Sign
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 4 inch layout
    return (
      <div className="print-4inch" style={{ fontFamily: 'Courier New', color: '#000', background: '#fff' }}>
        <div className="print-text-center">
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{settings.shopName}</h3>
          <p style={{ margin: '0 0 2px 0', wordBreak: 'break-word' }}>{settings.address}</p>
          <p style={{ margin: '0 0 2px 0', wordBreak: 'break-word' }}>PH: {settings.phone}</p>
          {settings.gstin && <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>GSTIN: {settings.gstin}</p>}
          <div className="print-divider"></div>
          <h4 style={{ fontSize: '12px', margin: '2px 0' }}>TAX INVOICE (4 INCH)</h4>
          <div className="print-divider"></div>
        </div>

        <div style={{ fontSize: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '4px 0' }}>
          <div>
            <div>INV NO: {sale.invoiceNo}</div>
            <div>DATE  : {dateFormatted}</div>
            <div>TYPE  : {sale.type.toUpperCase()}</div>
          </div>
          <div className="print-text-right">
            <div>CUSTOMER: {sale.customerName}</div>
            {sale.customerPhone && <div>PHONE   : {sale.customerPhone}</div>}
            <div>PAY BY: {sale.paymentMethod}</div>
          </div>
        </div>

        <div className="print-divider"></div>

        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '35%' }}>ITEM</th>
              <th style={{ textAlign: 'right', width: '15%' }}>PRICE</th>
              <th style={{ textAlign: 'center', width: '12%' }}>BAG</th>
              <th style={{ textAlign: 'center', width: '18%' }}>KG</th>
              <th style={{ textAlign: 'right', width: '20%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'left' }}>
                  {item.name.slice(0, 16)}
                  {item.lotNo && ` (L:${item.lotNo})`}
                </td>
                <td style={{ textAlign: 'right' }}>{item.salesPrice.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{item.bags || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  {formatKGColumn(item)}
                </td>
                <td style={{ textAlign: 'right' }}>{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', borderTop: '1px dashed black' }}>
              <td style={{ textAlign: 'left', paddingTop: '4px' }}>Total</td>
              <td style={{ textAlign: 'right', paddingTop: '4px' }}></td>
              <td style={{ textAlign: 'center', paddingTop: '4px' }}>{calculateTotalBags()}</td>
              <td style={{ textAlign: 'center', paddingTop: '4px' }}>
                {calculateTotalWeight() > 0 ? `${Number(calculateTotalWeight().toFixed(3))} Kg` : ''}
              </td>
              <td style={{ textAlign: 'right', paddingTop: '4px' }}>{sale.subtotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="print-divider"></div>

        {/* GST breakdown table */}
        {settings.showGstReceipt !== false && settings.gstin && (
          <div style={{ fontSize: '9px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>GST BREAKDOWN:</div>
            <div className="print-flex-between">
              <span>Taxable Value:</span>
              <span>₹{taxDetails.taxable}</span>
            </div>
            <div className="print-flex-between">
              <span>CGST ({settings.taxRate / 2}%):</span>
              <span>₹{taxDetails.cgst}</span>
            </div>
            <div className="print-flex-between">
              <span>SGST ({settings.taxRate / 2}%):</span>
              <span>₹{taxDetails.sgst}</span>
            </div>
          </div>
        )}

        <div className="print-divider"></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px' }}>

          {sale.discount > 0 && (
            <div className="print-flex-between" style={{ color: 'red' }}>
              <span>Discount:</span>
              <span>-₹{sale.discount.toFixed(2)}</span>
            </div>
          )}
          {sale.othersCharge !== undefined && sale.othersCharge > 0 && (
            <div className="print-flex-between">
              <span>Other Charges:</span>
              <span>+₹{sale.othersCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="print-flex-between" style={{ fontWeight: 'bold', fontSize: '12px', borderTop: '1px dashed black', paddingTop: '4px' }}>
            <span>GRAND TOTAL:</span>
            <span>₹{sale.total.toFixed(2)}</span>
          </div>
          <div className="print-flex-between">
            <span>RECEIVED AMOUNT:</span>
            <span>₹{receivedAmount.toFixed(2)}</span>
          </div>
          <div className="print-flex-between">
            <span>BILL BALANCE:</span>
            <span>₹{billBalance.toFixed(2)}</span>
          </div>
          {dealerForSale && (
            <>
              <div className="print-flex-between" style={{ fontSize: '10px' }}>
                <span>OLD BALANCE:</span>
                <span>₹{(balanceDue - billBalance).toFixed(2)}</span>
              </div>
              <div className="print-flex-between" style={{ color: '#dc2626', fontWeight: 'bold', borderTop: '1px dashed #dc2626', paddingTop: '3px', marginTop: '1px' }}>
                <span>OUTSTANDING DUE:</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <div className="print-divider"></div>

        <div className="print-text-center" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '12px' }}>
          <div>
            <div style={{ display: 'flex', height: '24px', width: '90px', letterSpacing: '2px', background: 'repeating-linear-gradient(90deg, #000 0px 2px, #fff 2px 4px)', borderLeft: '2px solid black', borderRight: '1px solid black', margin: '0 auto' }}></div>
            <div style={{ fontSize: '8px', marginTop: '2px' }}>*{sale.invoiceNo}*</div>
          </div>
          {settings.showQrPaymentReceipt !== false && (
            <div>
              <div style={{ width: '40px', height: '40px', border: '1px solid black', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 5px 5px' }}></div>
              <div style={{ fontSize: '7px', fontWeight: 'bold', marginTop: '2px' }}>SCAN TO PAY</div>
              {settings.upiId && <div style={{ fontSize: '7px', marginTop: '1.5px' }}>UPI ID: {settings.upiId}</div>}
              {settings.bankName && <div style={{ fontSize: '6.5px', marginTop: '1.5px', lineHeight: '8px' }}>{settings.bankName} A/C: {settings.bankAccNo}<br/>IFSC: {settings.bankIFSC}</div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '850px', background: 'var(--bg-sidebar)' }}>
          <div className="modal-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText style={{ color: 'var(--primary)' }} />
              <span>Invoice Print Hub</span>
            </h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body" style={{ background: 'var(--bg-app)', padding: '1.5rem', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
            {/* Format Selection & Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Select Template</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  className={`btn ${printFormat === '3inch' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPrintFormat('3inch')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Smartphone size={16} />
                  <span>3" Thermal Receipt</span>
                </button>
                <button
                  className={`btn ${printFormat === '4inch' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPrintFormat('4inch')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Smartphone size={16} />
                  <span>4" Thermal Receipt</span>
                </button>
                <button
                  className={`btn ${printFormat === 'a5' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPrintFormat('a5')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <FileText size={16} />
                  <span>A5 Standard Invoice</span>
                </button>
                <button
                  className={`btn ${printFormat === 'a4' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPrintFormat('a4')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <FileText size={16} />
                  <span>A4 Standard Invoice</span>
                </button>
              </div>

              <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0' }} />

              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Actions</h4>
              <button className="btn btn-primary" onClick={handlePrint} style={{ width: '100%' }}>
                <Printer size={16} />
                <span>Print Document</span>
              </button>
              
              <button
                className="btn btn-success"
                onClick={handleWhatsAppShare}
                style={{ width: '100%' }}
                disabled={!sale.customerPhone}
                title={!sale.customerPhone ? "Add phone to customer info to enable WhatsApp share" : ""}
              >
                <Share2 size={16} />
                <span>WhatsApp Bill</span>
              </button>
            </div>

            {/* Render Preview */}
            <div className="glass-panel" style={{ background: '#fff', borderRadius: 'var(--border-radius-md)', padding: '1rem', height: '60vh', overflowY: 'auto', display: 'flex', justifyContent: 'center', border: '1px solid var(--border-color)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center', width: '100%' }}>
                {renderInvoiceContent(printFormat)}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Render the printable portal directly on document.body for clean window.print() execution */}
      {createPortal(
        <div id="print-area-root">
          {renderInvoiceContent(printFormat)}
        </div>,
        document.body
      )}
    </>
  );
};
