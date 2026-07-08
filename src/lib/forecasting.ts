interface HistoricalData {
  date: Date;
  quantity: number;
}

interface ForecastResult {
  dayIndex: number;
  date: string;
  predictedDemand: number;
  trendValue: number;
}

/**
 * Calculates a linear regression forecast and moving averages for demand prediction.
 */
export function calculateForecast(
  history: HistoricalData[],
  forecastDays: number = 30,
  seasonalityFactor: number = 1.0
): {
  forecast: ForecastResult[];
  averageDailySales: number;
  trendSlope: number;
  recommendedReorder: number;
} {
  if (history.length === 0) {
    return {
      forecast: [],
      averageDailySales: 0,
      trendSlope: 0,
      recommendedReorder: 0,
    };
  }

  // Group sales by day (normalize dates to yyyy-mm-dd)
  const dailySalesMap = new Map<string, number>();
  
  // Find date range
  const dates = history.map(h => {
    const d = new Date(h.date);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  // Fill all days between min and max with 0 initially to ensure continuity
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate);
    d.setDate(minDate.getDate() + i);
    dailySalesMap.set(d.toISOString().split('T')[0], 0);
  }

  // Populate actual sales
  history.forEach(h => {
    const key = new Date(h.date).toISOString().split('T')[0];
    dailySalesMap.set(key, (dailySalesMap.get(key) || 0) + h.quantity);
  });

  // Convert to ordered array of data points for regression
  const dataPoints: { x: number; y: number; dateStr: string }[] = [];
  let index = 0;
  
  dailySalesMap.forEach((qty, dateStr) => {
    dataPoints.push({ x: index++, y: qty, dateStr });
  });

  // Calculate Linear Regression variables
  // y = mx + c
  const n = dataPoints.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  dataPoints.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  });

  const denominator = (n * sumXX - sumX * sumX);
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = n === 0 ? 0 : (sumY - slope * sumX) / n;

  const averageDailySales = n === 0 ? 0 : sumY / n;

  // Generate Future Forecast Points
  const forecast: ForecastResult[] = [];
  const lastActualDate = new Date(maxDate);

  for (let i = 1; i <= forecastDays; i++) {
    const forecastDate = new Date(lastActualDate);
    forecastDate.setDate(lastActualDate.getDate() + i);

    const xVal = n + i - 1;
    // Linear regression prediction
    let predicted = slope * xVal + intercept;
    
    // Fallback if trend is negative or near zero to moving average baseline
    if (predicted < 0) {
      predicted = Math.max(0, averageDailySales);
    }

    // Apply seasonality multiplier (e.g. 1.2 for 20% higher demand)
    // Add minor weekday/weekend cyclical adjustments for realism
    const dayOfWeek = forecastDate.getDay();
    const cycleMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.25;
    
    const finalPrediction = predicted * seasonalityFactor * cycleMultiplier;

    forecast.push({
      dayIndex: i,
      date: forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predictedDemand: Math.round(finalPrediction * 100) / 100,
      trendValue: Math.round((slope * xVal + intercept) * 100) / 100,
    });
  }

  // Recommended Reorder Qty = Forecasted Demand over lead time + Safety Stock - Current Stock
  // (We'll calculate this dynamically on pages based on actual stock levels)

  return {
    forecast,
    averageDailySales: Math.round(averageDailySales * 100) / 100,
    trendSlope: Math.round(slope * 1000) / 1000,
    recommendedReorder: Math.round(averageDailySales * forecastDays),
  };
}
