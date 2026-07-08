'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stockLevel: number;
  minStockLevel: number;
  maxStockLevel: number;
  supplierId: string | null;
  supplier: Supplier | null;
  createdAt: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and Search States
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'ok', 'low', 'out'

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form States for Add Product
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    price: '',
    stockLevel: '',
    minStockLevel: '',
    maxStockLevel: '',
    supplierId: '',
  });

  // Form States for Adjust Stock
  const [adjustment, setAdjustment] = useState({
    type: 'IN', // 'IN' or 'OUT' or 'ADJUSTMENT'
    quantity: '',
    reason: '',
  });

  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodRes = await fetch('/api/products');
      const suppRes = await fetch('/api/suppliers');
      if (prodRes.ok && suppRes.ok) {
        setProducts(await prodRes.json());
        setSuppliers(await suppRes.json());
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter calculation
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === '' || p.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'out') {
      matchesStatus = p.stockLevel === 0;
    } else if (statusFilter === 'low') {
      matchesStatus = p.stockLevel < p.minStockLevel;
    } else if (statusFilter === 'ok') {
      matchesStatus = p.stockLevel >= p.minStockLevel;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Unique categories list
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Add Product Handler
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Check required fields
    if (
      !newProduct.sku ||
      !newProduct.name ||
      !newProduct.category ||
      !newProduct.price ||
      !newProduct.stockLevel ||
      !newProduct.minStockLevel ||
      !newProduct.maxStockLevel
    ) {
      setFormError('Please fill out all required fields.');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewProduct({
          sku: '',
          name: '',
          description: '',
          category: '',
          price: '',
          stockLevel: '',
          minStockLevel: '',
          maxStockLevel: '',
          supplierId: '',
        });
        fetchData();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to create product.');
      }
    } catch (err) {
      setFormError('Network error. Failed to submit.');
    }
  };

  // Adjust Stock Handler
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProduct || !adjustment.quantity) {
      setFormError('Please enter a quantity.');
      return;
    }

    const qtyVal = parseInt(adjustment.quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setFormError('Please enter a valid positive number.');
      return;
    }

    // Determine final stock level based on operation
    let newStockLevel = selectedProduct.stockLevel;
    if (adjustment.type === 'IN') {
      newStockLevel += qtyVal;
    } else if (adjustment.type === 'OUT') {
      if (qtyVal > selectedProduct.stockLevel) {
        setFormError(`Insufficient stock. Only ${selectedProduct.stockLevel} units available.`);
        return;
      }
      newStockLevel -= qtyVal;
    } else {
      // Manual adjustment override
      newStockLevel = qtyVal;
    }

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockLevel: newStockLevel,
          adjustmentType: adjustment.type,
          adjustmentReason: adjustment.reason || 'Manual warehouse audit adjustment',
        }),
      });

      if (res.ok) {
        setShowAdjustModal(false);
        setAdjustment({ type: 'IN', quantity: '', reason: '' });
        setSelectedProduct(null);
        fetchData();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to adjust stock.');
      }
    } catch (err) {
      setFormError('Network error.');
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will delete all its transaction history.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete product.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Exporter
  const exportToCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Price', 'Stock Level', 'Min Threshold', 'Max Target', 'Supplier'];
    const rows = filteredProducts.map(p => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.price.toFixed(2),
      p.stockLevel,
      p.minStockLevel,
      p.maxStockLevel,
      p.supplier ? `"${p.supplier.name.replace(/"/g, '""')}"` : 'None'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Header section */}
      <div style={headerWrapperStyle}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Inventory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Real-time stock monitoring, threshold metrics, and warehouse intakes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={exportToCSV} disabled={filteredProducts.length === 0}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Filtering Control Bar */}
      <div className="glass" style={filterBarStyle}>
        <div style={searchWrapperStyle}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by SKU, name, or category..."
            style={searchInputStyle}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={dropdownsWrapperStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Filters:</span>
          </div>

          <select
            className="form-input"
            style={selectInputStyle}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="form-input"
            style={selectInputStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Stock Levels</option>
            <option value="ok">Healthy (In-Stock)</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Main Datatable Card */}
      <div className="glass" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading inventory database...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontWeight: 'bold' }}>No products match filters</p>
            <p style={{ fontSize: '0.8125rem' }}>Try clearing your search query or adjusting filters.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock Capacity</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const stockPercent = Math.min(100, (p.stockLevel / p.maxStockLevel) * 100);
                  const isLow = p.stockLevel < p.minStockLevel;
                  const isOut = p.stockLevel === 0;

                  let progressColor = 'var(--primary)';
                  let badgeClass = 'badge-success';
                  let badgeText = 'In Stock';

                  if (isOut) {
                    progressColor = 'var(--danger)';
                    badgeClass = 'badge-danger';
                    badgeText = 'Out of Stock';
                  } else if (isLow) {
                    progressColor = 'var(--warning)';
                    badgeClass = 'badge-warning';
                    badgeText = 'Low Stock';
                  }

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{p.sku}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 550 }}>{p.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description || 'No description'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{p.category}</span>
                      </td>
                      <td style={{ fontWeight: 550 }}>${p.price.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{p.stockLevel} units</span>
                            <span style={{ color: 'var(--text-muted)' }}>Max: {p.maxStockLevel}</span>
                          </div>
                          {/* Progress bar */}
                          <div style={progressBarContainerStyle}>
                            <div
                              style={{
                                ...progressBarFillStyle,
                                width: `${stockPercent}%`,
                                backgroundColor: progressColor,
                                boxShadow: `0 0 8px ${progressColor}50`
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span className={`badge ${badgeClass}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                              {badgeText}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Min: {p.minStockLevel}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {p.supplier ? (
                          <span style={{ color: 'var(--text-primary)' }}>{p.supplier.name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setSelectedProduct(p);
                              setShowAdjustModal(true);
                            }}
                          >
                            Adjust Stock
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                          >
                            <Trash2 size={14} color="var(--danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New Product */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="var(--primary)" /> Add New Product SKU
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {formError && (
                  <div style={errorBannerStyle}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Product SKU *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. SKU-NET-10"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Electronics"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Wireless Mouse"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    placeholder="Optional description of item..."
                    style={{ minHeight: '60px', resize: 'vertical' }}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="29.99"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Stock *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="50"
                      value={newProduct.stockLevel}
                      onChange={(e) => setNewProduct({ ...newProduct, stockLevel: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Limit *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="15"
                      value={newProduct.minStockLevel}
                      onChange={(e) => setNewProduct({ ...newProduct, minStockLevel: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Max Target Capacity *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      placeholder="150"
                      value={newProduct.maxStockLevel}
                      onChange={(e) => setNewProduct({ ...newProduct, maxStockLevel: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier Partner</label>
                    <select
                      className="form-input"
                      value={newProduct.supplierId}
                      onChange={(e) => setNewProduct({ ...newProduct, supplierId: e.target.value })}
                    >
                      <option value="">No Supplier</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save SKU</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust/Log Stock Transaction */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Adjust Stock: {selectedProduct.sku}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowAdjustModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="modal-body">
                {formError && (
                  <div style={errorBannerStyle}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Product: </span>
                  <strong>{selectedProduct.name}</strong>
                  <br />
                  <span style={{ color: 'var(--text-secondary)' }}>Current Stock: </span>
                  <strong>{selectedProduct.stockLevel} units</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Adjustment Type</label>
                  <select
                    className="form-input"
                    value={adjustment.type}
                    onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}
                  >
                    <option value="IN">Inward (Restock / Intake)</option>
                    <option value="OUT">Outward (Sales / Depletion)</option>
                    <option value="ADJUSTMENT">Manual Override (Set exactly to quantity)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {adjustment.type === 'ADJUSTMENT' ? 'New Stock Quantity' : 'Quantity to Adjust'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 10"
                    value={adjustment.quantity}
                    onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Reference Note</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Inventory Cycle Count, Damaged write-off"
                    value={adjustment.reason}
                    onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Inline Styles
const headerWrapperStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
};

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px',
  padding: '16px 20px',
  width: '100%',
};

const searchWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '0 12px',
  flex: 1,
  minWidth: '280px',
  maxWidth: '500px',
};

const searchInputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  width: '100%',
  padding: '10px 8px',
  boxShadow: 'none',
};

const dropdownsWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
};

const selectInputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '0.8125rem',
  minWidth: '150px',
  cursor: 'pointer',
};

const progressBarContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '9999px',
  overflow: 'hidden',
};

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '9999px',
  transition: 'width 0.4s ease-in-out',
};

const errorBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'var(--danger-glow)',
  color: 'var(--danger)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  padding: '10px 12px',
  borderRadius: '8px',
  fontSize: '0.8125rem',
  marginBottom: '16px',
};
