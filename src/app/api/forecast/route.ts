import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { calculateForecast } from '@/lib/forecasting';

// GET /api/forecast?productId=xxx&days=30&seasonality=1.0 - Get demand forecasting
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const daysStr = searchParams.get('days') || '30';
    const seasonalityStr = searchParams.get('seasonality') || '1.0';

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const forecastDays = parseInt(daysStr);
    const seasonalityFactor = parseFloat(seasonalityStr);

    if (isNaN(forecastDays) || forecastDays <= 0 || forecastDays > 90) {
      return NextResponse.json({ error: 'Invalid forecast period (1-90 days supported)' }, { status: 400 });
    }

    if (isNaN(seasonalityFactor) || seasonalityFactor < 0.1 || seasonalityFactor > 3.0) {
      return NextResponse.json({ error: 'Invalid seasonality factor (0.1 to 3.0 supported)' }, { status: 400 });
    }

    // Attempt cache read
    const cacheKey = `forecast:${productId}:${forecastDays}:${seasonalityFactor}`;
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache HIT for key: ${cacheKey}`);
      return NextResponse.json(JSON.parse(cachedData));
    }

    console.log(`Cache MISS for key: ${cacheKey}. Calculating forecast...`);

    // Fetch product information
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch historical OUT (sales) transactions (90 days window)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const history = await prisma.stockTransaction.findMany({
      where: {
        productId,
        type: 'OUT',
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        quantity: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Map database model to forecasting input format
    const formattedHistory = history.map(h => ({
      date: h.createdAt,
      quantity: h.quantity,
    }));

    // Calculate forecast
    const forecastResults = calculateForecast(formattedHistory, forecastDays, seasonalityFactor);

    // Group actual sales by day (last 30 days) to show on the dashboard chart
    const dailyGroupMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyGroupMap.set(dateStr, 0);
    }

    history.forEach(h => {
      const d = new Date(h.createdAt);
      if (d >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailyGroupMap.has(dateStr)) {
          dailyGroupMap.set(dateStr, (dailyGroupMap.get(dateStr) || 0) + h.quantity);
        }
      }
    });

    const historicalDailySales = Array.from(dailyGroupMap.entries()).map(([date, quantity]) => ({
      date,
      quantity,
    }));
    
    const responsePayload = {
      product,
      historicalDailySales,
      ...forecastResults,
      dataPointsCount: history.length,
    };

    // Cache the forecast for 5 minutes (300 seconds)
    await cache.set(cacheKey, JSON.stringify(responsePayload), 300);

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error calculating forecast:', error);
    return NextResponse.json(
      { error: 'Failed to calculate forecast: ' + error.message },
      { status: 500 }
    );
  }
}
