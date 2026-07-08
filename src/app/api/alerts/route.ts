import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/alerts - List all alerts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get('resolved');

    const where: any = {};
    if (resolved !== null) {
      where.resolved = resolved === 'true';
    }

    const alerts = await prisma.systemAlert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts: ' + error.message },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Run system-wide inventory audit to generate alerts
export async function POST() {
  try {
    const now = new Date();
    let newAlertsCount = 0;

    // 1. Audit Products for Low Stock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stockLevel: {
          lt: prisma.product.fields.minStockLevel,
        },
      },
    });

    for (const product of lowStockProducts) {
      // Check if unresolved alert already exists
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          type: 'LOW_STOCK',
          title: { contains: product.sku },
          resolved: false,
        },
      });

      if (!existingAlert) {
        const severity = product.stockLevel === 0 ? 'CRITICAL' : 'WARNING';
        await prisma.systemAlert.create({
          data: {
            type: 'LOW_STOCK',
            severity,
            title: `Low Stock: ${product.sku}`,
            message: `${product.name} stock level is currently ${product.stockLevel} (Reorder threshold: ${product.minStockLevel}).`,
          },
        });
        newAlertsCount++;
      }
    }

    // 2. Audit Purchase Orders for Delivery Delays
    const delayedOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ['SENT', 'SHIPPED'] },
        expectedDeliveryDate: {
          lt: now,
        },
      },
      include: {
        supplier: true,
      },
    });

    for (const order of delayedOrders) {
      // Check if unresolved alert already exists
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          type: 'DELIVERY_DELAY',
          title: { contains: order.poNumber },
          resolved: false,
        },
      });

      if (!existingAlert) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(order.expectedDeliveryDate!).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        await prisma.systemAlert.create({
          data: {
            type: 'DELIVERY_DELAY',
            severity: 'CRITICAL',
            title: `Delayed Shipment: ${order.poNumber}`,
            message: `Purchase Order ${order.poNumber} from ${order.supplier.name} is ${daysOverdue} days overdue. Expected date: ${new Date(order.expectedDeliveryDate!).toLocaleDateString()}.`,
          },
        });
        newAlertsCount++;
      }
    }

    return NextResponse.json({
      message: 'System audit completed successfully',
      newAlertsCount,
    });
  } catch (error: any) {
    console.error('Error running system audit:', error);
    return NextResponse.json(
      { error: 'Failed to run system audit: ' + error.message },
      { status: 500 }
    );
  }
}
