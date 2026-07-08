'use client';

import React, { useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  Star,
  Mail,
  Phone,
  Clock,
  Printer,
  X,
  AlertCircle,
  Calendar,
  CheckCircle,
  FileText
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  leadTime: number;
  rating: number;
  _count?: {
    products: number;
    orders: number;
  };
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: {
    sku: string;
    name: string;
  };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: Supplier;
  status: 'DRAFT' | 'SENT' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  orderDate: string;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  supplierId: string | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');

  // Modal States
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showPrintPOModal, setShowPrintPOModal] = useState(false);
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);

  // Add Supplier Form
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    leadTime: '5',
    rating: '5.0',
  });

  // Create PO Form
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ]);

  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const suppRes = await fetch('/api/suppliers');
      const ordersRes = await fetch('/api/orders');
      const prodRes = await fetch('/api/products');
      if (suppRes.ok && ordersRes.ok && prodRes.ok) {
        setSuppliers(await suppRes.json());
        setOrders(await ordersRes.json());
        setProducts(await prodRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter products by selected supplier
  const supplierProducts = products.filter(p => p.supplierId === selectedSupplierId);

  // Star ratings helper
  const renderStars = (rating: number) => {
    const stars = [];
    const rounded = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          fill={i <= rounded ? '#F59E0B' : 'transparent'}
          color={i <= rounded ? '#F59E0B' : 'var(--text-muted)'}
          style={{ marginRight: '1px' }}
        />
      );
    }
    return <div style={{ display: 'flex', alignItems: 'center' }}>{stars}</div>;
  };

  // Add Supplier Form Submit
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newSupplier.name || !newSupplier.leadTime) {
      setFormError('Name and Lead Time are required.');
      return;
    }

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      });

      if (res.ok) {
        setShowAddSupplierModal(false);
        setNewSupplier({
          name: '',
          contactName: '',
          email: '',
          phone: '',
          leadTime: '5',
          rating: '5.0',
        });
        fetchData();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to add supplier.');
      }
    } catch (err) {
      setFormError('Network error.');
    }
  };

  // Add item row in PO creation
  const addPoItemRow = () => {
    setPoItems([...poItems, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  // Remove item row in PO creation
  const removePoItemRow = (index: number) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  // Handle PO Item field changes
  const handlePoItemChange = (index: number, field: string, value: string) => {
    const updated = [...poItems];
    if (field === 'productId') {
      updated[index].productId = value;
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].unitPrice = product.price;
      }
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Math.max(0, parseFloat(value) || 0);
    }
    setPoItems(updated);
  };

  // Submit PO
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedSupplierId) {
      setFormError('Please select a supplier.');
      return;
    }

    const validItems = poItems.filter(item => item.productId !== '');
    if (validItems.length === 0) {
      setFormError('Please add at least one valid product.');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          items: validItems,
        }),
      });

      if (res.ok) {
        setShowCreatePOModal(false);
        setSelectedSupplierId('');
        setPoItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
        fetchData();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to submit Purchase Order.');
      }
    } catch (err) {
      setFormError('Network error.');
    }
  };

  // Update PO Status
  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Print Window Trigger
  const triggerPrint = () => {
    const printContent = document.getElementById('printable-po');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=600,width=800');
    if (win) {
      win.document.write('<html><head><title>Purchase Order Print</title>');
      win.document.write('<style>');
      win.document.write(`
        body { font-family: sans-serif; color: #333; padding: 40px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ccc; padding-bottom: 20px; }
        .meta { margin: 20px 0; display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; }
        .total { text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 30px; }
        .signature { margin-top: 80px; display: flex; justify-content: space-between; }
      `);
      win.document.write('</style></head><body>');
      win.document.write(printContent.innerHTML);
      win.document.write('</body></html>');
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }
  };

  // Calculate order subtotal
  const poTotalAmount = poItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

  return (
    <>
      {/* Header wrapper */}
      <div style={headerWrapperStyle}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Supply Chain</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage supplier relationships, lead times, and track Purchase Orders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'suppliers' ? (
            <button className="btn btn-primary" onClick={() => setShowAddSupplierModal(true)}>
              <Plus size={16} />
              Add Supplier
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowCreatePOModal(true)}>
              <Plus size={16} />
              New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Tabs Controller */}
      <div style={tabContainerStyle}>
        <button
          style={{
            ...tabButtonStyle,
            borderBottomColor: activeTab === 'suppliers' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'suppliers' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
          onClick={() => setActiveTab('suppliers')}
        >
          <Truck size={16} />
          Supplier Directory ({suppliers.length})
        </button>
        <button
          style={{
            ...tabButtonStyle,
            borderBottomColor: activeTab === 'orders' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
          onClick={() => setActiveTab('orders')}
        >
          <FileText size={16} />
          Purchase Order Tracker ({orders.length})
        </button>
      </div>

      {/* Content Panels */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading SCM registry...
        </div>
      ) : activeTab === 'suppliers' ? (
        /* Supplier Directory View */
        <div style={supplierGridStyle}>
          {suppliers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No suppliers cataloged yet.
            </div>
          ) : (
            suppliers.map(s => (
              <div key={s.id} className="glass" style={supplierCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.05rem' }}>{s.name}</h3>
                  {renderStars(s.rating)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Clock size={14} color="var(--primary)" />
                    <span>Lead Time: <strong>{s.leadTime} days</strong></span>
                  </div>
                  {s.contactName && (
                    <span style={{ color: 'var(--text-secondary)' }}>Contact: <strong style={{ color: 'var(--text-primary)' }}>{s.contactName}</strong></span>
                  )}
                  {s.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Mail size={14} />
                      <a href={`mailto:${s.email}`} style={{ fontSize: '0.8125rem' }}>{s.email}</a>
                    </div>
                  )}
                  {s.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Phone size={14} />
                      <span>{s.phone}</span>
                    </div>
                  )}
                </div>

                <div style={supplierCardFooterStyle}>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Products: <strong>{s._count?.products || 0}</strong></span>
                    <span>POs: <strong>{s._count?.orders || 0}</strong></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Purchase Orders View */
        <div className="glass" style={{ overflow: 'hidden' }}>
          {orders.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No purchase orders found. Click "New Purchase Order" to submit one.
            </div>
          ) : (
            <div className="table-container">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Expected Delivery</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    let badgeClass = 'badge-neutral';
                    if (order.status === 'DELIVERED') badgeClass = 'badge-success';
                    else if (order.status === 'SHIPPED') badgeClass = 'badge-info';
                    else if (order.status === 'SENT') badgeClass = 'badge-warning';
                    else if (order.status === 'CANCELLED') badgeClass = 'badge-danger';

                    return (
                      <tr key={order.id}>
                        <td style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{order.poNumber}</td>
                        <td>{order.supplier.name}</td>
                        <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} color="var(--text-muted)" />
                            <span>
                              {order.expectedDeliveryDate
                                ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                                : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                          <span className={`badge ${badgeClass}`}>{order.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {/* PO Print Preview trigger */}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px' }}
                              title="Print Invoice"
                              onClick={() => {
                                setPrintPO(order);
                                setShowPrintPOModal(true);
                              }}
                            >
                              <Printer size={14} />
                            </button>

                            {order.status === 'SENT' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                              >
                                Mark Shipped
                              </button>
                            )}

                            {(order.status === 'SENT' || order.status === 'SHIPPED') && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                              >
                                Mark Received
                              </button>
                            )}

                            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', borderColor: 'rgba(239,68,68,0.1)' }}
                                onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                              >
                                Cancel
                              </button>
                            )}
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
      )}

      {/* Modal: Add Supplier */}
      {showAddSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Add Supplier Profile</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowAddSupplierModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSupplier}>
              <div className="modal-body">
                {formError && (
                  <div style={errorBannerStyle}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Supplier Business Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Acme Microelectronics"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={newSupplier.contactName}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. supply@acme.com"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +1-555-0100"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Lead Time (Days) *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={newSupplier.leadTime}
                      onChange={(e) => setNewSupplier({ ...newSupplier, leadTime: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rating (1-5 Stars)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      className="form-input"
                      value={newSupplier.rating}
                      onChange={(e) => setNewSupplier({ ...newSupplier, rating: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSupplierModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {showCreatePOModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Draft Purchase Order</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowCreatePOModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePO}>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {formError && (
                  <div style={errorBannerStyle}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Select Supplier *</label>
                  <select
                    className="form-input"
                    value={selectedSupplierId}
                    onChange={(e) => {
                      setSelectedSupplierId(e.target.value);
                      // Reset items
                      setPoItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
                    }}
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.leadTime}d lead time)</option>
                    ))}
                  </select>
                </div>

                {selectedSupplierId && (
                  <>
                    <h4 style={{ margin: '16px 0 8px 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Order Items</h4>
                    
                    {poItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 3, marginBottom: 0 }}>
                          <label className="form-label">Item SKU</label>
                          <select
                            className="form-input"
                            value={item.productId}
                            onChange={(e) => handlePoItemChange(idx, 'productId', e.target.value)}
                          >
                            <option value="">-- Select Product --</option>
                            {supplierProducts.map(p => (
                              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label className="form-label">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={item.quantity}
                            onChange={(e) => handlePoItemChange(idx, 'quantity', e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                          <label className="form-label">Cost ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={item.unitPrice || ''}
                            onChange={(e) => handlePoItemChange(idx, 'unitPrice', e.target.value)}
                          />
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '10px', height: '38px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                          onClick={() => removePoItemRow(idx)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginTop: '12px', padding: '6px 12px', fontSize: '0.8125rem' }}
                      onClick={addPoItemRow}
                    >
                      + Add Item Row
                    </button>

                    <div style={poTotalSummaryStyle}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Estimated Total:</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                        ${poTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreatePOModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedSupplierId}>Send Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Print Invoice PO */}
      {showPrintPOModal && printPO && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', background: '#ffffff', color: '#111827' }}>
            <div className="modal-header" style={{ borderBottomColor: '#e5e7eb', color: '#111827' }}>
              <h3 style={{ color: '#111827' }}>Invoice: {printPO.poNumber}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}
                onClick={() => setShowPrintPOModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Printable Area */}
            <div id="printable-po" style={{ padding: '24px', maxHeight: '55vh', overflowY: 'auto', backgroundColor: '#ffffff', color: '#111827' }}>
              <div className="header">
                <div>
                  <h2 style={{ color: '#111827', margin: 0 }}>PURCHASE ORDER</h2>
                  <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>Status: <strong>{printPO.status}</strong></span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ color: '#111827', margin: 0 }}>SmartSCM Warehouse</h3>
                  <span style={{ fontSize: '0.8125rem', color: '#4b5563' }}>Inventory & Logistics Hub</span>
                </div>
              </div>

              <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', margin: '20px 0', padding: '10px 0' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#374151' }}>ORDER TO:</h4>
                  <strong>{printPO.supplier.name}</strong><br />
                  {printPO.supplier.contactName && `Attn: ${printPO.supplier.contactName}`}<br />
                  {printPO.supplier.email && `Email: ${printPO.supplier.email}`}<br />
                  {printPO.supplier.phone && `Tel: ${printPO.supplier.phone}`}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#374151' }}>DETAILS:</h4>
                  <span>PO Number: <strong>{printPO.poNumber}</strong></span><br />
                  <span>Order Date: {new Date(printPO.orderDate).toLocaleDateString()}</span><br />
                  <span>Expected delivery: {printPO.expectedDeliveryDate ? new Date(printPO.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#374151' }}>SKU</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#374151' }}>Item Name</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#374151' }}>Quantity</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#374151' }}>Unit Cost</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#374151' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {printPO.items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px', fontFamily: 'monospace' }}>{item.product.sku}</td>
                      <td style={{ padding: '10px' }}>{item.product.name}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>${item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="total" style={{ textAlign: 'right', marginTop: '24px', fontSize: '1.15rem' }}>
                Total Order Value: <strong style={{ fontSize: '1.35rem', color: '#111827' }}>${printPO.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
              <button className="btn btn-secondary" style={{ color: '#111827', borderColor: '#d1d5db' }} onClick={() => setShowPrintPOModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={triggerPrint}>
                <Printer size={16} /> Print Purchase Order
              </button>
            </div>
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

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
  borderBottom: '1px solid var(--border-color)',
  width: '100%',
};

const tabButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  borderBottom: '3px solid transparent',
  padding: '12px 6px',
  fontSize: '0.9375rem',
  fontWeight: 550,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s ease',
};

const supplierGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px',
  width: '100%',
};

const supplierCardStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '190px',
};

const supplierCardFooterStyle: React.CSSProperties = {
  marginTop: 'auto',
  paddingTop: '12px',
  borderTop: '1px solid rgba(255,255,255,0.03)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const poTotalSummaryStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '20px',
  padding: '14px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
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
