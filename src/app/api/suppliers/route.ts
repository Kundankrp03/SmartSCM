import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/suppliers - Retrieve list of suppliers
export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(suppliers);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers: ' + error.message },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contactName, email, phone, leadTime, rating } = body;

    if (!name || leadTime === undefined) {
      return NextResponse.json(
        { error: 'Supplier name and typical lead time are required' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        leadTime: parseInt(leadTime),
        rating: rating !== undefined ? parseFloat(rating) : 5.0,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier: ' + error.message },
      { status: 500 }
    );
  }
}
