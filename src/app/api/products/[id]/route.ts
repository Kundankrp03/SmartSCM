import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

// PUT /api/products/[id] - Update product details or adjust stock level
export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      category,
      price,
      stockLevel,
      minStockLevel,
      maxStockLevel,
      supplierId,
      adjustmentType, // "IN", "OUT", "ADJUSTMENT" (optional for stock log)
      adjustmentReason, // (optional)
      performedBy, // (optional)
    } = body;

    // Fetch existing product
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Determine if stock level is changing
    const newStock = stockLevel !== undefined ? parseInt(stockLevel) : existing.stockLevel;
    const stockDifference = newStock - existing.stockLevel;

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        category: category !== undefined ? category : existing.category,
        price: price !== undefined ? parseFloat(price) : existing.price,
        stockLevel: newStock,
        minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : existing.minStockLevel,
        maxStockLevel: maxStockLevel !== undefined ? parseInt(maxStockLevel) : existing.maxStockLevel,
        supplierId: supplierId !== undefined ? (supplierId || null) : existing.supplierId,
      },
      include: {
        supplier: true,
      },
    });

    // Log stock adjustment transaction if there was a change
    if (stockDifference !== 0) {
      let finalType = adjustmentType;
      if (!finalType) {
        finalType = stockDifference > 0 ? 'IN' : 'OUT';
      }

      await prisma.stockTransaction.create({
        data: {
          productId: id,
          type: finalType,
          quantity: Math.abs(stockDifference),
          reason: adjustmentReason || 'Manual adjustment',
          performedBy: performedBy || 'System Admin',
        },
      });

      // Update or create alert based on new stock level
      const updatedMin = minStockLevel !== undefined ? parseInt(minStockLevel) : existing.minStockLevel;
      
      if (newStock < updatedMin) {
        const severity = newStock === 0 ? 'CRITICAL' : 'WARNING';
        
        // Find existing unresolved alert for this product
        const existingAlert = await prisma.systemAlert.findFirst({
          where: {
            type: 'LOW_STOCK',
            title: { contains: existing.sku },
            resolved: false,
          },
        });

        if (existingAlert) {
          // Update message/severity
          await prisma.systemAlert.update({
            where: { id: existingAlert.id },
            data: {
              severity,
              message: `${updatedProduct.name} has ${newStock} units left (Min threshold: ${updatedMin}).`,
            },
          });
        } else {
          // Create new alert
          await prisma.systemAlert.create({
            data: {
              type: 'LOW_STOCK',
              severity,
              title: `Low Stock: ${updatedProduct.sku}`,
              message: `${updatedProduct.name} stock fell to ${newStock} units (Min threshold: ${updatedMin}).`,
            },
          });
        }
      } else {
        // Resolve alert if stock is now healthy
        const existingAlert = await prisma.systemAlert.findFirst({
          where: {
            type: 'LOW_STOCK',
            title: { contains: existing.sku },
            resolved: false,
          },
        });

        if (existingAlert) {
          await prisma.systemAlert.update({
            where: { id: existingAlert.id },
            data: {
              resolved: true,
              resolvedAt: new Date(),
              message: `${existingAlert.message} (Resolved: Stock adjusted to ${newStock})`,
            },
          });
        }
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Remove product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Resolve any outstanding low stock alerts for this product SKU
    await prisma.systemAlert.updateMany({
      where: {
        type: 'LOW_STOCK',
        title: { contains: existing.sku },
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    // Delete product (cascade will delete stock transactions)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product: ' + error.message },
      { status: 500 }
    );
  }
}
