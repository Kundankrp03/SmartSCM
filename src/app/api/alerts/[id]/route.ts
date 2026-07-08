import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

// PUT /api/alerts/[id] - Resolve (acknowledge) alert
export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { resolved } = body;

    const updatedAlert = await prisma.systemAlert.update({
      where: { id },
      data: {
        resolved: resolved !== undefined ? resolved : true,
        resolvedAt: resolved === false ? null : new Date(),
      },
    });

    return NextResponse.json(updatedAlert);
  } catch (error: any) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert: ' + error.message },
      { status: 500 }
    );
  }
}
