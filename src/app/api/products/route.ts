import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/products - List products with search, category & stock status filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || ''; // 'low', 'out', 'ok'

    // Build database query filters
    const where: any = {
      OR: [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
      ],
    };

    if (category) {
      where.category = category;
    }

    if (status === 'out') {
      where.stockLevel = 0;
    } else if (status === 'low') {
      where.stockLevel = {
        lt: prisma.product.fields.minStockLevel,
      };
    } else if (status === 'ok') {
      where.stockLevel = {
        gte: prisma.product.fields.minStockLevel,
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        supplier: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products: ' + error.message },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sku, name, description, category, price, stockLevel, minStockLevel, maxStockLevel, supplierId } = body;

    // Validate request
    if (!sku || !name || !category || price === undefined || stockLevel === undefined || minStockLevel === undefined || maxStockLevel === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existing = await prisma.product.findUnique({
      where: { sku },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Product SKU already exists' },
        { status: 400 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        category,
        price: parseFloat(price),
        stockLevel: parseInt(stockLevel),
        minStockLevel: parseInt(minStockLevel),
        maxStockLevel: parseInt(maxStockLevel),
        supplierId: supplierId || null,
      },
      include: {
        supplier: true,
      },
    });

    // Log transaction if stock level > 0
    if (parseInt(stockLevel) > 0) {
      await prisma.stockTransaction.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: parseInt(stockLevel),
          reason: 'Initial stock intake',
          performedBy: 'System Admin',
        },
      });
    }

    // Check and create system alert if initial stock is low
    if (parseInt(stockLevel) < parseInt(minStockLevel)) {
      const severity = parseInt(stockLevel) === 0 ? 'CRITICAL' : 'WARNING';
      await prisma.systemAlert.create({
        data: {
          type: 'LOW_STOCK',
          severity,
          title: `Low Stock: ${product.sku}`,
          message: `${product.name} was created with ${stockLevel} units, which is below its minimum threshold of ${minStockLevel}.`,
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product: ' + error.message },
      { status: 500 }
    );
  }
}
