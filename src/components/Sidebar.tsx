'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Truck, TrendingUp, Bell, Activity } from 'lucide-react';

interface SidebarProps {}

export default function Sidebar({}: SidebarProps) {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState<number>(0);

  // Fetch active alert count
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          const unresolved = data.filter((a: any) => !a.resolved);
          setAlertCount(unresolved.length);
        }
      } catch (err) {
        console.error('Failed to fetch alerts count', err);
      }
    };

    fetchAlertCount();
    // Poll for alerts every 15 seconds
    const interval = setInterval(fetchAlertCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Suppliers & POs', href: '/suppliers', icon: Truck },
    { name: 'Demand Forecasting', href: '/forecasting', icon: TrendingUp },
  ];

  return (
    <aside className="glass" style={sidebarStyle}>
      {/* Sidebar Header */}
      <div style={headerStyle}>
        <Activity size={24} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 6px var(--primary))' }} />
        <span style={titleStyle}>SmartSCM</span>
      </div>

      {/* Navigation Links */}
      <nav style={navStyle}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              style={{
                ...navItemStyle,
                backgroundColor: isActive ? 'var(--primary-glow)' : 'transparent',
                borderColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Alerts Indicator Section */}
      <div style={footerStyle}>
        <div className="glass" style={alertWidgetStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} className={alertCount > 0 ? 'pulse-icon' : ''} color={alertCount > 0 ? 'var(--danger)' : 'var(--text-secondary)'} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>System Alerts</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 'bold' }}>
                {alertCount > 0 ? `${alertCount} Active Warning${alertCount > 1 ? 's' : ''}` : 'System Healthy'}
              </span>
            </div>
          </div>
          {alertCount > 0 && (
            <span
              className="badge badge-danger"
              style={{
                padding: '2px 6px',
                fontSize: '0.65rem',
                minWidth: '18px',
                textAlign: 'center',
                justifyContent: 'center',
              }}
            >
              {alertCount}
            </span>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-icon {
          animation: pulseGlow 2s infinite ease-in-out;
        }
      `}</style>
    </aside>
  );
}

// Inline Styles
const sidebarStyle: React.CSSProperties = {
  width: '260px',
  height: '100vh',
  position: 'sticky',
  top: 0,
  left: 0,
  borderRadius: 0,
  borderTop: 'none',
  borderLeft: 'none',
  borderBottom: 'none',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 16px',
  zIndex: 10,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '0 12px 24px 12px',
  borderBottom: '1px solid var(--border-color)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 'bold',
  letterSpacing: '-0.03em',
  background: 'linear-gradient(to right, #ffffff, var(--primary))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginTop: '24px',
  flex: 1,
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: 550,
  borderLeft: '3px solid transparent',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

const footerStyle: React.CSSProperties = {
  marginTop: 'auto',
  paddingTop: '16px',
  borderTop: '1px solid var(--border-color)',
};

const alertWidgetStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(0, 0, 0, 0.2)',
};
