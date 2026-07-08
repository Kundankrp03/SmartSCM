'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  DollarSign,
  AlertTriangle,
  Truck,
  Bell,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalSKUs: number;
  totalValue: number;
  lowStockCount: number;
  pendingOrders: number;
  activeAlertsCount: number;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  resolved: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  productId: string;
  product: {
    sku: string;
    name: string;
  };
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSKUs: 0,
    totalValue: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    activeAlertsCount: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState('');

  const fetchDashboardData = async () => {
    try {
      // Fetch Products to calculate totals
      const prodRes = await fetch('/api/products');
      const alertsRes = await fetch('/api/alerts?resolved=false');
      const ordersRes = await fetch('/api/orders');
      const transRes = await fetch('/api/transactions');

      if (prodRes.ok && alertsRes.ok && ordersRes.ok && transRes.ok) {
        const products = await prodRes.json();
        const activeAlerts = await alertsRes.json();
        const orders = await ordersRes.json();
        const recentTrans = await transRes.json();

        // Calculate metrics
        const totalSKUs = products.length;
        const totalValue = products.reduce((acc: number, p: any) => acc + p.price * p.stockLevel, 0);
        const lowStockCount = products.filter((p: any) => p.stockLevel < p.minStockLevel).length;
        const pendingOrders = orders.filter((o: any) => o.status === 'SENT' || o.status === 'SHIPPED').length;

        setStats({
          totalSKUs,
          totalValue,
          lowStockCount,
          pendingOrders,
          activeAlertsCount: activeAlerts.length,
        });

        setAlerts(activeAlerts.slice(0, 5)); // Show top 5 active alerts
        setTransactions(recentTrans.slice(0, 6)); // Show top 6 transactions
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const runSystemAudit = async () => {
    setAuditing(true);
    setAuditMessage('');
    try {
      const res = await fetch('/api/alerts', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setAuditMessage(`Audit complete. Found ${result.newAlertsCount} new issues.`);
        fetchDashboardData();
        setTimeout(() => setAuditMessage(''), 4000);
      }
    } catch (err) {
      console.error('Audit failed', err);
      setAuditMessage('Audit failed to run.');
    } finally {
      setAuditing(false);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });
      if (res.ok) {
        // Remove resolved alert from local view
        setAlerts(prev => prev.filter(a => a.id !== id));
        setStats(prev => ({
          ...prev,
          activeAlertsCount: Math.max(0, prev.activeAlertsCount - 1),
        }));
      }
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <RefreshCw className="spin-icon" size={32} color="var(--primary)" />
        <span style={{ marginLeft: '12px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Loading Dashboard...</span>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spin-icon {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* Dashboard Top Header */}
      <div style={headerWrapperStyle}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Real-time supply chain metrics, stock telemetry, and alerts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {auditMessage && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 'bold' }}>
              {auditMessage}
            </span>
          )}
          <button className="btn btn-primary" onClick={runSystemAudit} disabled={auditing}>
            <RefreshCw size={16} className={auditing ? 'spin-icon' : ''} />
            {auditing ? 'Auditing...' : 'Run Audit'}
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div style={gridStyle}>
        {/* Total Value */}
        <div className="glass" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 550 }}>Inventory Value</span>
            <div style={{ ...iconBgStyle, backgroundColor: 'var(--primary-glow)' }}>
              <DollarSign size={20} color="var(--primary)" />
            </div>
          </div>
          <span style={numberStyle}>${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <TrendingUp size={14} color="var(--success)" /> Live asset appraisal
          </span>
        </div>

        {/* Total SKUs */}
        <div className="glass" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 550 }}>Total Items</span>
            <div style={{ ...iconBgStyle, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Package size={20} color="var(--info)" />
            </div>
          </div>
          <span style={numberStyle}>{stats.totalSKUs} SKUs</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Monitored products in stock
          </span>
        </div>

        {/* Low Stock Count */}
        <div className="glass" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 550 }}>Low Stock Warnings</span>
            <div style={{ ...iconBgStyle, backgroundColor: stats.lowStockCount > 0 ? 'var(--warning-glow)' : 'rgba(255,255,255,0.05)' }}>
              <AlertTriangle size={20} color={stats.lowStockCount > 0 ? 'var(--warning)' : 'var(--text-secondary)'} />
            </div>
          </div>
          <span style={{ ...numberStyle, color: stats.lowStockCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
            {stats.lowStockCount} Items
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            {stats.lowStockCount > 0 ? 'Items below reorder point' : 'All stock levels healthy'}
          </span>
        </div>

        {/* Pending Shipments */}
        <div className="glass" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 550 }}>Pending Deliveries</span>
            <div style={{ ...iconBgStyle, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Truck size={20} color="var(--success)" />
            </div>
          </div>
          <span style={numberStyle}>{stats.pendingOrders} Active POs</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Awaiting supplier warehouse receipt
          </span>
        </div>
      </div>

      {/* Main Dashboard Layout split */}
      <div style={splitLayoutStyle}>
        {/* Left Side: System Alerts */}
        <div className="glass" style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.125rem' }}>Active Alert Center ({stats.activeAlertsCount})</h2>
            </div>
            <Link href="/inventory" style={{ fontSize: '0.75rem', fontWeight: 550, color: 'var(--primary)' }}>
              Manage Inventory
            </Link>
          </div>

          <div style={alertListStyle}>
            {alerts.length === 0 ? (
              <div style={emptyStateStyle}>
                <CheckCircle size={40} color="var(--success)" style={{ marginBottom: '10px', opacity: 0.8 }} />
                <p style={{ fontWeight: 550 }}>System fully optimized</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No critical alerts or delayed deliveries detected.</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    ...alertItemStyle,
                    borderLeftColor: alert.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)',
                    backgroundColor: alert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.03)' : 'rgba(245, 158, 11, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                        {alert.severity}
                      </span>
                      <strong style={{ fontSize: '0.875rem' }}>{alert.title}</strong>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{alert.message}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Raised {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => resolveAlert(alert.id)}>
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Activity Log / Transactions */}
        <div className="glass" style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.125rem' }}>Recent Warehouse Activities</h2>
            </div>
          </div>

          <div style={activityListStyle}>
            {transactions.length === 0 ? (
              <div style={emptyStateStyle}>
                <Package size={40} color="var(--text-muted)" style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p style={{ fontWeight: 550 }}>No recent activities</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transactions will appear here when inventory is edited or orders delivered.</p>
              </div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} style={activityItemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {tx.type === 'IN' ? (
                      <div style={directionIconStyle(true)}>
                        <ArrowUpRight size={14} color="var(--success)" />
                      </div>
                    ) : (
                      <div style={directionIconStyle(false)}>
                        <ArrowDownRight size={14} color="var(--danger)" />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 550 }}>
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity} units {tx.product.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {tx.reason || 'Manual inventory correction'} • {tx.performedBy}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
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

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
  width: '100%',
};

const cardStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const iconBgStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const numberStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 'bold',
  letterSpacing: '-0.02em',
};

const splitLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
  gap: '24px',
  width: '100%',
  flex: 1,
};

const panelStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '480px',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '18px',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '12px',
};

const alertListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  overflowY: 'auto',
  flex: 1,
  paddingRight: '4px',
};

const alertItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px',
  borderRadius: '8px',
  borderLeft: '4px solid',
  gap: '16px',
};

const activityListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  overflowY: 'auto',
  flex: 1,
  paddingRight: '4px',
};

const activityItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: '12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
};

const directionIconStyle = (isIncoming: boolean): React.CSSProperties => ({
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: isIncoming ? 'var(--success-glow)' : 'var(--danger-glow)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  textAlign: 'center',
  color: 'var(--text-secondary)',
  padding: '30px',
};
