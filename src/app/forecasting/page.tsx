'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Package,
  Calendar,
  AlertCircle,
  Truck,
  HelpCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockLevel: number;
  minStockLevel: number;
  maxStockLevel: number;
  price: number;
  supplierId: string | null;
  supplier?: {
    name: string;
    leadTime: number;
    rating: number;
  } | null;
}

interface ForecastResult {
  dayIndex: number;
  date: string;
  predictedDemand: number;
  trendValue: number;
}

interface ForecastResponse {
  product: Product;
  historicalDailySales: { date: string; quantity: number }[];
  forecast: ForecastResult[];
  averageDailySales: number;
  trendSlope: number;
  recommendedReorder: number;
  dataPointsCount: number;
}

export default function ForecastingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [forecastDays, setForecastDays] = useState(30);
  const [seasonality, setSeasonality] = useState(1.0);
  
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState('');

  // Initial Load - Get Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
          if (data.length > 0) {
            setSelectedProductId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load products list', err);
        setError('Failed to load products.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Fetch forecast when selection or inputs change
  useEffect(() => {
    if (!selectedProductId) return;

    const fetchForecast = async () => {
      setLoadingForecast(true);
      setError('');
      try {
        const res = await fetch(
          `/api/forecast?productId=${selectedProductId}&days=${forecastDays}&seasonality=${seasonality}`
        );
        if (res.ok) {
          const data = await res.json();
          setForecastData(data);
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to calculate forecast.');
        }
      } catch (err) {
        console.error(err);
        setError('Network error calculating forecast.');
      } finally {
        setLoadingForecast(false);
      }
    };

    fetchForecast();
  }, [selectedProductId, forecastDays, seasonality]);

  // Combine historical and forecast data for unified Recharts area chart
  const getChartData = () => {
    if (!forecastData) return [];

    const chartPoints: any[] = [];

    // 1. Add historical points
    forecastData.historicalDailySales.forEach(pt => {
      chartPoints.push({
        date: pt.date,
        'Actual Sales': pt.quantity,
        'Forecasted Demand': undefined,
      });
    });

    // Connect historical line to forecast line smoothly by duplicating the last historical point
    const lastHist = forecastData.historicalDailySales[forecastData.historicalDailySales.length - 1];

    // 2. Add forecast points
    forecastData.forecast.forEach((pt, idx) => {
      chartPoints.push({
        date: pt.date,
        'Actual Sales': idx === 0 && lastHist ? lastHist.quantity : undefined,
        'Forecasted Demand': pt.predictedDemand,
      });
    });

    return chartPoints;
  };

  const chartData = getChartData();

  // Helper stats calculations
  const totalForecastedDemand = forecastData?.forecast.reduce((sum, item) => sum + item.predictedDemand, 0) || 0;
  const leadTime = forecastData?.product.supplier?.leadTime || 5;
  const avgSales = forecastData?.averageDailySales || 0;
  const currentStock = forecastData?.product.stockLevel || 0;
  const minStock = forecastData?.product.minStockLevel || 0;
  const maxStock = forecastData?.product.maxStockLevel || 0;

  // Reorder point = (Avg Daily Sales * Lead Time) + Safety Stock (minStock)
  const reorderPoint = Math.ceil((avgSales * leadTime) + minStock);
  const needsReorder = currentStock < reorderPoint;
  // Recommended qty = Target (maxStock) - Current stock
  const recommendedQty = needsReorder ? (maxStock - currentStock) : 0;

  return (
    <>
      {/* Header section */}
      <div style={headerWrapperStyle}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Demand Forecasting</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Linear regression & cyclical time-series simulation for predictive replenishment planning.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading products database...
        </div>
      ) : products.length === 0 ? (
        <div className="glass" style={emptyPanelStyle}>
          <AlertCircle size={40} color="var(--text-secondary)" style={{ marginBottom: '10px' }} />
          <h3>No products available</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Please add products in the Inventory tab first to run forecasting.
          </p>
        </div>
      ) : (
        <div style={forecastingGridStyle}>
          {/* Left Panel: Simulator Controls */}
          <div className="glass" style={controlPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <Sliders size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.125rem' }}>Model Hyperparameters</h2>
            </div>

            {/* Select Product */}
            <div className="form-group">
              <label className="form-label">Select SKU to Analyze</label>
              <select
                className="form-input"
                style={{ cursor: 'pointer' }}
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* Forecast Horizon */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Forecast Horizon (Days)</label>
              <select
                className="form-input"
                value={forecastDays}
                onChange={(e) => setForecastDays(parseInt(e.target.value))}
              >
                <option value={30}>30 Days (Short-term)</option>
                <option value={60}>60 Days (Mid-term)</option>
                <option value={90}>90 Days (Quarterly)</option>
              </select>
            </div>

            {/* Seasonality Multiplier */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Seasonality Multiplier</label>
                <span style={{ fontSize: '0.8125rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {seasonality.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={seasonality}
                onChange={(e) => setSeasonality(parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>0.5x (Low season)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Promo/Holiday)</span>
              </div>
            </div>

            {/* Model Info */}
            <div style={modelInfoStyle}>
              <Sparkles size={16} color="var(--primary)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Active Forecasting Model</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                  Ordinary Least Squares (OLS) Linear Regression + Weekly Cyclical Coefficients.
                </span>
              </div>
            </div>
          </div>

          {/* Right Area: Chart and Calculations */}
          <div style={chartAndRecommendationStyle}>
            {/* Chart Area */}
            <div className="glass" style={chartPanelStyle}>
              {loadingForecast ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                  <RefreshCw className="spin-icon" size={24} color="var(--primary)" />
                  <span style={{ marginLeft: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Calculating model coefficients...</span>
                </div>
              ) : error ? (
                <div style={{ padding: '40px', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
              ) : forecastData ? (
                <>
                  <div style={chartHeaderStyle}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{forecastData.product.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        SKU: {forecastData.product.sku} • Category: {forecastData.product.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={trendIndicatorStyle(forecastData.trendSlope >= 0)}>
                          {forecastData.trendSlope >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </span>
                        <span>Trend: <strong>{forecastData.trendSlope >= 0 ? 'GROWING' : 'DECLINING'} ({forecastData.trendSlope > 0 ? '+' : ''}{forecastData.trendSlope} qty/day)</strong></span>
                      </div>
                      <div>
                        <span>Daily Sales Velocity: <strong>{forecastData.averageDailySales} units/day</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Container */}
                  <div style={{ width: '100%', height: '300px', marginTop: '16px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card-bg-solid)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '8px',
                            fontSize: '0.8125rem'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="Actual Sales"
                          stroke="#10B981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorActual)"
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Forecasted Demand"
                          stroke="#06B6D4"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#colorForecast)"
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : null}
            </div>

            {/* Smart Recommendations Panel */}
            {forecastData && (
              <div className="glass" style={recommendationPanelStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <TrendingUp size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1rem' }}>Smart Replenishment Recommendation</h3>
                </div>

                <div style={statsGridStyle}>
                  {/* Forecast Demand */}
                  <div style={metricStyle}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Forecasted Demand ({forecastDays}d)</span>
                    <strong style={{ fontSize: '1.25rem' }}>{Math.ceil(totalForecastedDemand)} units</strong>
                  </div>

                  {/* Safety Buffer */}
                  <div style={metricStyle}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reorder Point threshold</span>
                    <strong style={{ fontSize: '1.25rem', color: needsReorder ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {reorderPoint} units
                    </strong>
                  </div>

                  {/* Current stock */}
                  <div style={metricStyle}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Stock Level</span>
                    <strong style={{ fontSize: '1.25rem', color: currentStock < minStock ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {currentStock} units
                    </strong>
                  </div>

                  {/* Supplier details */}
                  <div style={metricStyle}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supplier & Lead Time</span>
                    <strong style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                      <Truck size={14} color="var(--primary)" />
                      {forecastData.product.supplier ? `${forecastData.product.supplier.name} (${leadTime}d)` : 'Unassigned'}
                    </strong>
                  </div>
                </div>

                {/* Advice banner */}
                <div
                  style={{
                    ...adviceBannerStyle,
                    borderColor: needsReorder ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)',
                    backgroundColor: needsReorder ? 'var(--warning-glow)' : 'var(--success-glow)',
                  }}
                >
                  <AlertCircle size={20} color={needsReorder ? 'var(--warning)' : 'var(--success)'} style={{ flexShrink: 0 }} />
                  <div>
                    {needsReorder ? (
                      <>
                        <h4 style={{ color: 'var(--warning)', fontSize: '0.875rem', marginBottom: '2px' }}>Replenishment Triggered</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          Current stock ({currentStock} units) is below the reorder point threshold ({reorderPoint} units). 
                          We recommend placing an order for <strong>{recommendedQty} units</strong> immediately from 
                          {' '}{forecastData.product.supplier ? forecastData.product.supplier.name : 'your supplier'} to 
                          arrive before depletion.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '2px' }}>Stock Level Optimized</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          Current stock level of {currentStock} units is healthy and estimated to cover the supplier lead time
                          duration of {leadTime} days with a safety buffer. No immediate replenishment order is necessary.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <style jsx global>{`
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

const emptyPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px',
  textAlign: 'center',
  color: 'var(--text-secondary)',
};

const forecastingGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '280px 1fr',
  gap: '24px',
  alignItems: 'start',
  width: '100%',
};

const controlPanelStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: 'var(--primary)',
  cursor: 'pointer',
  height: '6px',
  borderRadius: '3px',
  outline: 'none',
};

const modelInfoStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  padding: '12px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--border-color)',
  marginTop: '24px',
};

const chartAndRecommendationStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const chartPanelStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
};

const chartHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '12px',
};

const trendIndicatorStyle = (isUp: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: isUp ? 'var(--success-glow)' : 'var(--danger-glow)',
  color: isUp ? 'var(--success)' : 'var(--danger)',
  marginRight: '2px',
});

const recommendationPanelStyle: React.CSSProperties = {
  padding: '24px',
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
  marginBottom: '20px',
};

const metricStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '12px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0,0,0,0.15)',
  border: '1px solid var(--border-color)',
};

const adviceBannerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid',
};
