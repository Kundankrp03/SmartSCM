import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/orders - Fetch all purchase orders
export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders: ' + error.message },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new purchase order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierId, items } = body; // items: [{ productId, quantity, unitPrice }]

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Supplier ID and a list of items are required' },
        { status: 400 }
      );
    }

    // Fetch supplier to calculate lead time
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Calculate expected delivery date
    const orderDate = new Date();
    const expectedDeliveryDate = new Date(
      orderDate.getTime() + supplier.leadTime * 24 * 60 * 60 * 1000
    );

    // Calculate total amount and validate product existences
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product with ID ${item.productId} not found` },
          { status: 404 }
        );
      }

      const quantity = parseInt(item.quantity);
      const unitPrice = parseFloat(item.unitPrice || product.price.toString());

      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for product ${product.name}` },
          { status: 400 }
        );
      }

      totalAmount += quantity * unitPrice;
      validatedItems.push({
        productId: product.id,
        quantity,
        unitPrice,
      });
    }

    // Generate sequential PO Number
    const count = await prisma.purchaseOrder.count();
    const year = orderDate.getFullYear();
    const poNumber = `PO-${year}-${String(count + 1).padStart(3, '0')}`;

    // Execute order creation in a transaction
    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        status: 'SENT', // Initial status
        orderDate,
        expectedDeliveryDate,
        totalAmount,
        items: {
          create: validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order: ' + error.message },
      { status: 500 }
    );
  }
}
