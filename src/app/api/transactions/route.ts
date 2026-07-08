import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/transactions - Fetch recent stock transactions
export async function GET() {
  try {
    const transactions = await prisma.stockTransaction.findMany({
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions: ' + error.message },
      { status: 500 }
    );
  }
}
