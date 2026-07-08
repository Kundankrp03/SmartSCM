import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

// PUT /api/orders/[id] - Update Purchase Order status
export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body; // "DRAFT", "SENT", "SHIPPED", "DELIVERED", "CANCELLED"

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Fetch existing order with items
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Prevent re-delivering already delivered PO
    if (existingOrder.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'This purchase order has already been marked as DELIVERED.' },
        { status: 400 }
      );
    }

    const dataToUpdate: any = { status };

    if (status === 'DELIVERED') {
      dataToUpdate.actualDeliveryDate = new Date();
    }

    // Use a transaction to update status, increment stock, write transactions and resolve alerts
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update PO Status
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: dataToUpdate,
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 2. If delivered, update product stock levels and create transactions
      if (status === 'DELIVERED') {
        for (const item of existingOrder.items) {
          // Increment stock level
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              stockLevel: {
                increment: item.quantity,
              },
            },
          });

          // Log transaction
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity,
              reason: `Restock via Delivered PO: ${existingOrder.poNumber}`,
              performedBy: 'System Auto-Receive',
            },
          });

          // Check if we can resolve low stock alerts for this product
          if (updatedProduct.stockLevel >= updatedProduct.minStockLevel) {
            const lowStockAlert = await tx.systemAlert.findFirst({
              where: {
                type: 'LOW_STOCK',
                title: { contains: updatedProduct.sku },
                resolved: false,
              },
            });

            if (lowStockAlert) {
              await tx.systemAlert.update({
                where: { id: lowStockAlert.id },
                data: {
                  resolved: true,
                  resolvedAt: new Date(),
                  message: `${lowStockAlert.message} (Resolved: Replenished to ${updatedProduct.stockLevel} units via PO ${existingOrder.poNumber})`,
                },
              });
            }
          }
        }

        // Check if there was a delivery delay alert for this PO and resolve it
        const delayAlert = await tx.systemAlert.findFirst({
          where: {
            type: 'DELIVERY_DELAY',
            title: { contains: existingOrder.poNumber },
            resolved: false,
          },
        });

        if (delayAlert) {
          await tx.systemAlert.update({
            where: { id: delayAlert.id },
            data: {
              resolved: true,
              resolvedAt: new Date(),
              message: `${delayAlert.message} (Resolved: Shipment delivered on ${new Date().toLocaleDateString()})`,
            },
          });
        }
      }

      return updatedOrder;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase order: ' + error.message },
      { status: 500 }
    );
  }
}
