import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DB, Product, ProductVariation } from '../utils/db';
import { Plus, Search, Edit2, Trash2, Package, Calculator, Tag, X, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { ProfitCalculator } from '../components/ProfitCalculator';

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

export const Products: React.FC = () => {
  const { 
    products, 
    refreshData, 
    showToast, 
    categories, 
    addCategory, 
    renameCategory, 
    deleteCategory 
  } = useApp();
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<{ oldName: string, newName: string } | null>(null);
  
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Groceries');
  const [unit, setUnit] = useState('Pcs');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salesPrice, setSalesPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(10);

  // Profit Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [variations, setVariations] = useState<ProductVariation[]>([]);

  // Categories & Units Presets
  const formCategories = categories;
  const units = ['Pcs', 'Kg', 'Litre', 'Box', 'Packet', 'Gram', 'Bag'];

  // Excel / CSV Export & Import Handlers
  const handleExportCSV = () => {
    const headers = [
      'Product Name',
      'Barcode',
      'Category',
      'Unit',
      'Cost Price',
      'Sales Price',
      'Current Stock',
      'Alert Limit',
      'Variation Mark'
    ];

    const rows: string[][] = [];

    products.forEach(p => {
      if (p.variations && p.variations.length > 0) {
        p.variations.forEach(v => {
          rows.push([
            p.name,
            p.barcode,
            p.category,
            v.unit || p.unit,
            v.purchasePrice.toString(),
            v.salesPrice.toString(),
            v.currentStock.toString(),
            p.minStockAlert.toString(),
            v.mark
          ]);
        });
      } else {
        rows.push([
          p.name,
          p.barcode,
          p.category,
          p.unit,
          p.purchasePrice.toString(),
          p.salesPrice.toString(),
          p.currentStock.toString(),
          p.minStockAlert.toString(),
          ''
        ]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Product_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Product catalog exported successfully', 'success');
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Product Name',
      'Barcode',
      'Category',
      'Unit',
      'Cost Price',
      'Sales Price',
      'Current Stock',
      'Alert Limit',
      'Variation Mark'
    ];

    const sampleRows = [
      ['Sample Product Standalone', '8901234567890', 'Groceries', 'Pcs', '10.00', '15.00', '100', '10', ''],
      ['Sample Product with Variations', '8909876543210', 'Beverages', 'Bottle', '40.00', '50.00', '25', '5', 'Batch A'],
      ['Sample Product with Variations', '8909876543210', 'Beverages', 'Bottle', '45.00', '60.00', '15', '5', 'Batch B']
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...sampleRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Product_Import_Template.csv`);
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
        
        const idxName = headers.findIndex(h => h.includes('name'));
        const idxBarcode = headers.findIndex(h => h.includes('barcode') || h.includes('code'));
        const idxCategory = headers.findIndex(h => h.includes('category'));
        const idxUnit = headers.findIndex(h => h.includes('unit'));
        const idxCost = headers.findIndex(h => h.includes('cost') || h.includes('purchase'));
        const idxSale = headers.findIndex(h => h.includes('sale') || h.includes('retail'));
        const idxStock = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity'));
        const idxAlert = headers.findIndex(h => h.includes('alert') || h.includes('limit') || h.includes('min'));
        const idxMark = headers.findIndex(h => h.includes('mark') || h.includes('variation'));

        if (idxName === -1 || idxBarcode === -1) {
          showToast('Invalid template: "Product Name" and "Barcode" columns are required', 'danger');
          return;
        }

        const rows = parsed.slice(1);
        
        const groups: { [barcode: string]: typeof rows } = {};
        rows.forEach(row => {
          if (row.length < 2) return;
          const barcodeVal = idxBarcode !== -1 ? row[idxBarcode] : '';
          if (!barcodeVal) return;
          if (!groups[barcodeVal]) {
            groups[barcodeVal] = [];
          }
          groups[barcodeVal].push(row);
        });

        let newCount = 0;
        let updateCount = 0;

        const existingProducts = DB.getProducts();

        Object.keys(groups).forEach(barcodeKey => {
          const groupRows = groups[barcodeKey];
          const firstRow = groupRows[0];
          
          const prodName = firstRow[idxName];
          const prodCategory = idxCategory !== -1 && firstRow[idxCategory] ? firstRow[idxCategory] : 'Groceries';
          const prodUnit = idxUnit !== -1 && firstRow[idxUnit] ? firstRow[idxUnit] : 'Pcs';
          const prodMinAlert = idxAlert !== -1 ? (parseInt(firstRow[idxAlert]) || 0) : 10;

          const existing = existingProducts.find(p => p.barcode === barcodeKey);
          const productId = existing ? existing.id : 'P' + Date.now().toString().slice(-4) + Math.random().toString(36).substr(2, 2);

          if (existing) {
            updateCount++;
          } else {
            newCount++;
          }

          const parsedVariations: ProductVariation[] = [];
          let hasVariations = false;

          groupRows.forEach((row, rowIdx) => {
            const markVal = idxMark !== -1 ? row[idxMark] : '';
            if (markVal && markVal !== '-') {
              hasVariations = true;
              const costVal = idxCost !== -1 ? (parseFloat(row[idxCost]) || 0) : 0;
              const saleVal = idxSale !== -1 ? (parseFloat(row[idxSale]) || 0) : 0;
              const stockVal = idxStock !== -1 ? (parseInt(row[idxStock]) || 0) : 0;
              const unitVal = idxUnit !== -1 && row[idxUnit] ? row[idxUnit] : prodUnit;
              
              parsedVariations.push({
                id: (existing?.variations?.[rowIdx]?.id) || ('VAR-' + Date.now() + Math.random().toString(36).substr(2, 2)),
                mark: markVal,
                purchasePrice: costVal,
                salesPrice: saleVal,
                currentStock: stockVal,
                unit: unitVal
              });
            }
          });

          let productData: Product;

          if (hasVariations && parsedVariations.length > 0) {
            const finalStock = parsedVariations.reduce((sum, v) => sum + v.currentStock, 0);
            const finalPurchasePrice = parsedVariations[0].purchasePrice;
            const finalSalesPrice = parsedVariations[0].salesPrice;

            productData = {
              id: productId,
              name: prodName,
              barcode: barcodeKey,
              category: prodCategory,
              unit: prodUnit,
              purchasePrice: finalPurchasePrice,
              salesPrice: finalSalesPrice,
              currentStock: finalStock,
              minStockAlert: prodMinAlert,
              variations: parsedVariations
            };
          } else {
            const costVal = idxCost !== -1 ? (parseFloat(firstRow[idxCost]) || 0) : 0;
            const saleVal = idxSale !== -1 ? (parseFloat(firstRow[idxSale]) || 0) : 0;
            const stockVal = idxStock !== -1 ? (parseInt(firstRow[idxStock]) || 0) : 0;

            productData = {
              id: productId,
              name: prodName,
              barcode: barcodeKey,
              category: prodCategory,
              unit: prodUnit,
              purchasePrice: costVal,
              salesPrice: saleVal,
              currentStock: stockVal,
              minStockAlert: prodMinAlert
            };
          }

          DB.saveProduct(productData);
        });

        refreshData();
        showToast(`Import completed: Created ${newCount} and updated ${updateCount} products`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Error parsing CSV file. Please make sure the format is valid.', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setBarcode(Date.now().toString()); // Seed a numeric mock barcode
    setCategory('Groceries');
    setUnit('Pcs');
    setPurchasePrice(0);
    setSalesPrice(0);
    setCurrentStock(0);
    setMinStockAlert(10);
    setShowCalculator(false);
    setVariations([]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBarcode(p.barcode);
    setCategory(p.category);
    setUnit(p.unit);
    setPurchasePrice(p.purchasePrice);
    setSalesPrice(p.salesPrice);
    setCurrentStock(p.currentStock);
    setMinStockAlert(p.minStockAlert);
    setShowCalculator(false);
    setVariations(p.variations || []);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      DB.deleteProduct(id);
      refreshData();
      showToast('Product deleted successfully', 'danger');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode) {
      showToast('Please fill all required fields correctly', 'warning');
      return;
    }

    const processedVariations: ProductVariation[] = variations.map((v, i) => ({
      id: v.id || 'VAR-' + Date.now() + i,
      mark: v.mark,
      purchasePrice: Number(v.purchasePrice) || 0,
      salesPrice: Number(v.salesPrice) || 0,
      currentStock: Number(v.currentStock) || 0,
      unit: v.unit,
      unit2: v.unit2 || undefined,
      purchasePrice2: v.purchasePrice2 !== undefined ? (Number(v.purchasePrice2) || 0) : undefined,
      salesPrice2: v.salesPrice2 !== undefined ? (Number(v.salesPrice2) || 0) : undefined
    }));

    let finalStock = currentStock;
    let finalPurchasePrice = purchasePrice;
    let finalSalesPrice = salesPrice;

    if (processedVariations.length > 0) {
      finalStock = processedVariations.reduce((sum, v) => sum + v.currentStock, 0);
      finalPurchasePrice = processedVariations[0].purchasePrice;
      finalSalesPrice = processedVariations[0].salesPrice;
    }

    if (finalSalesPrice < finalPurchasePrice) {
      if (!confirm('Warning: Sales price is lower than purchase price. Save anyway?')) {
        return;
      }
    }

    const productData: Product = {
      id: editingProduct ? editingProduct.id : 'P' + Date.now().toString().slice(-4),
      name,
      barcode,
      category,
      unit,
      purchasePrice: finalPurchasePrice,
      salesPrice: finalSalesPrice,
      currentStock: finalStock,
      minStockAlert,
      variations: processedVariations.length > 0 ? processedVariations : undefined
    };

    DB.saveProduct(productData);
    refreshData();
    setIsModalOpen(false);
    showToast(
      editingProduct ? 'Product updated successfully' : 'Product created successfully',
      'success'
    );
  };

  // Filtered products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm);
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Product Catalog</h1>
          <p>Configure inventories, barcodes, purchase margins, and stock thresholds</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleDownloadTemplate} 
            title="Download Import CSV/Excel Template"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
          >
            <FileSpreadsheet size={16} />
            <span>Template</span>
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleExportCSV} 
            title="Export Catalog to CSV/Excel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
          >
            <Download size={16} />
            <span>Export Excel</span>
          </button>
          
          <label 
            className="btn btn-secondary" 
            title="Import Catalog from CSV/Excel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', cursor: 'pointer', margin: 0 }}
          >
            <Upload size={16} />
            <span>Import Excel</span>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCSV} 
              style={{ display: 'none' }} 
            />
          </label>

          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setNewCategoryName('');
              setEditingCategoryName(null);
              setIsCategoryModalOpen(true);
            }} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
          >
            <Tag size={16} />
            <span>Manage Categories</span>
          </button>

          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '40px' }}
            placeholder="Search by Product Name or Barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {['All', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid / Table */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        {filteredProducts.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Cost Price</th>
                  <th style={{ textAlign: 'right' }}>Sales Price</th>
                  <th style={{ textAlign: 'center' }}>Unit 2</th>
                  <th style={{ textAlign: 'right' }}>Price 2</th>
                  <th style={{ textAlign: 'center' }}>Current Stock</th>
                  <th style={{ textAlign: 'center' }}>Alert Limit</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isLowStock = p.currentStock <= p.minStockAlert;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: isLowStock ? 'var(--danger-light)' : 'var(--primary-light)',
                            color: isLowStock ? 'var(--danger)' : 'var(--primary)'
                          }}>
                            <Package size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit: {p.unit}</span>
                            {p.variations && p.variations.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                {p.variations.map(v => (
                                  <span key={v.id} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    {v.mark}: ₹{v.salesPrice} ({v.unit || p.unit}){v.unit2 && ` / ₹${v.salesPrice2} (${v.unit2})`} | Stock: {Number(v.currentStock.toFixed(3))}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'Courier New', fontWeight: 600 }}>{p.barcode}</td>
                      <td>
                        <span className="badge badge-info">{p.category}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>₹{p.purchasePrice.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>₹{p.salesPrice.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {p.variations && p.variations.length > 0 && p.variations[0].unit2 ? (
                          <span style={{ padding: '0.15rem 0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {p.variations[0].unit2}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                        {p.variations && p.variations.length > 0 && p.variations[0].salesPrice2 ? (
                          `₹${p.variations[0].salesPrice2.toFixed(2)}`
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`} style={{ fontWeight: 700 }}>
                          {Number(p.currentStock.toFixed(3))} {p.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{p.minStockAlert} {p.unit}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary btn-icon"
                            style={{ padding: '0.35rem' }}
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon"
                            style={{ padding: '0.35rem' }}
                            onClick={() => handleDelete(p.id)}
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
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
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            No products found matching your search. Click "Add New Product" to populate your catalog.
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product Profile' : 'Register New Product'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter product title..."
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Barcode / Scanner Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Scan or type barcode..."
                      required
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {formCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Unit of Measure</label>
                    <select
                      className="form-control"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {units.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Minimum Stock Alert Level</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Purchase Price (₹ Cost Price) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="0.01"
                      required
                      disabled={variations.length > 0}
                      value={variations.length > 0 ? (variations[0].purchasePrice || '') : (purchasePrice || '')}
                      onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Sales Price (₹ Retail Price) *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="0.01"
                        required
                        disabled={variations.length > 0}
                        value={variations.length > 0 ? (variations[0].salesPrice || '') : (salesPrice || '')}
                        onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowCalculator(!showCalculator)}
                        title="Open Profit Calculator"
                        style={{ padding: '0.5rem' }}
                      >
                        <Calculator size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Profit Calculator widget */}
                {showCalculator && (
                  <ProfitCalculator
                    purchasePrice={variations.length > 0 ? (variations[0].purchasePrice || 0) : purchasePrice}
                    initialSalesPrice={variations.length > 0 ? (variations[0].salesPrice || 0) : salesPrice}
                    onApply={(calculatedSalesPrice) => {
                      if (variations.length > 0) {
                        const updated = [...variations];
                        updated[0].salesPrice = calculatedSalesPrice;
                        setVariations(updated);
                      } else {
                        setSalesPrice(calculatedSalesPrice);
                      }
                      showToast(`Sales Price updated to ₹${calculatedSalesPrice}`, 'info');
                    }}
                    onClose={() => setShowCalculator(false)}
                  />
                )}

                {!editingProduct && (
                  <div className="form-group">
                    <label>Initial Opening Stock Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="any"
                      disabled={variations.length > 0}
                      value={variations.length > 0 ? Number(variations.reduce((sum, v) => sum + v.currentStock, 0).toFixed(3)) : currentStock}
                      onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                {/* Variations Section */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Product Variations (Different Marks & Prices)</h4>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => setVariations(prev => [...prev, { id: '', mark: '', purchasePrice: 0, salesPrice: 0, currentStock: 0, unit: unit, unit2: '', purchasePrice2: 0, salesPrice2: 0 }])}
                    >
                      <Plus size={12} />
                      <span>Add Variation</span>
                    </button>
                  </div>
                  
                  {variations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {variations.map((v, idx) => (
                        <div key={idx} style={{ 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--border-radius-sm)', 
                          padding: '0.75rem', 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.5rem' 
                        }}>
                          {/* Row 1: Mark, Stock, Delete */}
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Variation Mark (e.g. Batch A / MRP 250)"
                              className="form-control"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                              required
                              value={v.mark}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].mark = e.target.value;
                                setVariations(updated);
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Opening Stock"
                              className="form-control"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                              required
                              min="0"
                              step="any"
                              value={v.currentStock}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].currentStock = parseFloat(e.target.value) || 0;
                                setVariations(updated);
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon"
                              style={{ padding: '0.35rem', color: 'var(--danger)' }}
                              onClick={() => setVariations(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {/* Row 2: Unit 1, Cost 1, Price 1, Unit 2, Cost 2, Price 2 */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                              className="form-control"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '28px' }}
                              value={v.unit || unit}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].unit = e.target.value;
                                setVariations(updated);
                              }}
                            >
                              {units.map((u) => (
                                <option key={u} value={u}>{u} (1)</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Cost 1"
                              title="Cost Price 1"
                              className="form-control"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '28px' }}
                              required
                              min="0"
                              step="0.01"
                              value={v.purchasePrice || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].purchasePrice = parseFloat(e.target.value) || 0;
                                setVariations(updated);
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Price 1"
                              title="Retail Price 1"
                              className="form-control"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '28px' }}
                              required
                              min="0"
                              step="0.01"
                              value={v.salesPrice || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].salesPrice = parseFloat(e.target.value) || 0;
                                setVariations(updated);
                              }}
                            />
                            <select
                              className="form-control"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '28px' }}
                              value={v.unit2 || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].unit2 = e.target.value;
                                setVariations(updated);
                              }}
                            >
                              <option value="">-- No Unit 2 --</option>
                              {units.map((u) => (
                                <option key={u} value={u}>{u} (2)</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Cost 2"
                              title="Cost Price 2"
                              className="form-control"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '28px' }}
                              min="0"
                              step="0.01"
                              value={v.purchasePrice2 || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].purchasePrice2 = parseFloat(e.target.value) || 0;
                                setVariations(updated);
                              }}
                            />
                            <input
                              type="number"
                              placeholder="Price 2"
                              title="Retail Price 2"
                              className="form-control"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '28px' }}
                              min="0"
                              step="0.01"
                              value={v.salesPrice2 || ''}
                              onChange={(e) => {
                                const updated = [...variations];
                                updated[idx].salesPrice2 = parseFloat(e.target.value) || 0;
                                setVariations(updated);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                      No variations configured. This product will be sold at a single standard price.
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Manage Categories</h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setIsCategoryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Add Category Form */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="New Category Name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = newCategoryName.trim();
                      if (trimmed) {
                        addCategory(trimmed);
                        setNewCategoryName('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const trimmed = newCategoryName.trim();
                    if (trimmed) {
                      addCategory(trimmed);
                      setNewCategoryName('');
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>

              {/* Categories list */}
              <div style={{ 
                maxHeight: '280px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius-sm)',
                background: 'var(--bg-input)'
              }}>
                <table className="custom-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-sidebar)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category Name</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const isEditing = editingCategoryName?.oldName === cat;
                      return (
                        <tr key={cat}>
                          <td style={{ padding: '0.5rem' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem', height: '28px' }}
                                value={editingCategoryName.newName}
                                onChange={(e) => setEditingCategoryName(prev => prev ? { ...prev, newName: e.target.value } : null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    renameCategory(editingCategoryName.oldName, editingCategoryName.newName);
                                    setEditingCategoryName(null);
                                  }
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600 }}>{cat}</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', borderRadius: '4px', height: '26px' }}
                                    onClick={() => {
                                      renameCategory(editingCategoryName.oldName, editingCategoryName.newName);
                                      setEditingCategoryName(null);
                                    }}
                                    title="Save"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', borderRadius: '4px', height: '26px' }}
                                    onClick={() => setEditingCategoryName(null)}
                                    title="Cancel"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-icon"
                                    style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                                    onClick={() => setEditingCategoryName({ oldName: cat, newName: cat })}
                                    title="Rename"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-icon"
                                    style={{ padding: '0.2rem', color: 'var(--danger)' }}
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete category "${cat}"? Products in this category will be reassigned.`)) {
                                        deleteCategory(cat);
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
