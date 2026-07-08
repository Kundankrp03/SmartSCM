import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.systemAlert.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.stockTransaction.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.supplier.deleteMany({});

  console.log('Seeding suppliers...');
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Apex Tech Logistics',
      contactName: 'Sarah Jenkins',
      email: 'sarah.j@apextech.com',
      phone: '+1-555-0199',
      leadTime: 5,
      rating: 4.8,
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Global Office Solutions',
      contactName: 'David Vance',
      email: 'd.vance@globaloffice.com',
      phone: '+1-555-0142',
      leadTime: 10,
      rating: 4.2,
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: 'Nexus Parts Corp',
      contactName: 'Ming Chen',
      email: 'm.chen@nexusparts.net',
      phone: '+1-555-0177',
      leadTime: 3,
      rating: 4.5,
    },
  });

  console.log('Seeding products...');
  const productsData = [
    {
      sku: 'SKU-NET-01',
      name: 'HyperLink Wi-Fi Router',
      description: 'High-speed dual-band Wi-Fi 6 router for enterprise and home offices.',
      category: 'Networking',
      price: 89.99,
      stockLevel: 25,
      minStockLevel: 30, // Trigger alert
      maxStockLevel: 150,
      supplierId: supplier1.id,
    },
    {
      sku: 'SKU-FUR-02',
      name: 'ErgoComfort Office Chair',
      description: 'Fully adjustable ergonomic chair with mesh back and lumbar support.',
      category: 'Furniture',
      price: 199.99,
      stockLevel: 12,
      minStockLevel: 10,
      maxStockLevel: 40,
      supplierId: supplier2.id,
    },
    {
      sku: 'SKU-OFF-03',
      name: 'Aura LED Desk Lamp',
      description: 'Dimmable smart LED desk lamp with wireless phone charging base.',
      category: 'Office Supplies',
      price: 34.99,
      stockLevel: 8,
      minStockLevel: 20, // Trigger alert
      maxStockLevel: 100,
      supplierId: supplier2.id,
    },
    {
      sku: 'SKU-ACC-04',
      name: 'MultiPort USB-C Hub',
      description: '8-in-1 USB-C docking station with HDMI, Ethernet, and SD card reader.',
      category: 'Accessories',
      price: 49.99,
      stockLevel: 65,
      minStockLevel: 35,
      maxStockLevel: 200,
      supplierId: supplier3.id,
    },
    {
      sku: 'SKU-ELC-05',
      name: 'UltraClear 27in Monitor',
      description: '4K IPS professional monitor with HDR400 and USB-C power delivery.',
      category: 'Electronics',
      price: 249.99,
      stockLevel: 5,
      minStockLevel: 12, // Trigger alert
      maxStockLevel: 50,
      supplierId: supplier1.id,
    },
  ];

  const products = [];
  for (const p of productsData) {
    const createdProduct = await prisma.product.create({ data: p });
    products.push(createdProduct);
  }

  console.log('Seeding transaction history (sales & restocks over 90 days)...');
  const now = new Date();
  
  for (const product of products) {
    // Generate sales transactions for the past 90 days
    let currentStockValue = product.stockLevel;
    
    // Add restock events spaced out
    const restockIntervals = [80, 60, 40, 20];
    for (const daysAgo of restockIntervals) {
      const restockDate = new Date(now);
      restockDate.setDate(now.getDate() - daysAgo);
      const restockQty = Math.floor(product.maxStockLevel * 0.6);
      
      await prisma.stockTransaction.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: restockQty,
          reason: 'Scheduled Supplier Restock',
          performedBy: 'System Auto-Restock',
          createdAt: restockDate,
        },
      });
    }

    // Weekly cyclical sales simulation (higher sales on weekdays, lower on weekends)
    for (let i = 90; i > 0; i--) {
      const transDate = new Date(now);
      transDate.setDate(now.getDate() - i);
      const dayOfWeek = transDate.getDay();
      
      // Determine if a sale occurs today (e.g. 70% chance on weekdays, 30% on weekends)
      const saleChance = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 0.75;
      if (Math.random() < saleChance) {
        // Average daily sale quantities per product
        let baseQty = 1;
        if (product.sku === 'SKU-NET-01') baseQty = 2; // Router sells slightly faster
        if (product.sku === 'SKU-ACC-04') baseQty = 3; // Hub sells fast
        if (product.sku === 'SKU-ELC-05') baseQty = 0.5; // Expensive monitor sells slower

        const saleQty = Math.max(1, Math.round(baseQty * (0.5 + Math.random() * 1.5)));
        
        await prisma.stockTransaction.create({
          data: {
            productId: product.id,
            type: 'OUT',
            quantity: saleQty,
            reason: 'Customer Order POS-' + (10000 + i),
            performedBy: 'POS Terminal ' + (1 + (i % 3)),
            createdAt: transDate,
          },
        });
      }
    }
  }

  console.log('Seeding purchase orders...');
  // Completed Order (Delivered 14 days ago)
  const completedOrderDate = new Date();
  completedOrderDate.setDate(now.getDate() - 20);
  const completedDeliveryDate = new Date();
  completedDeliveryDate.setDate(now.getDate() - 14);

  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-001',
      supplierId: supplier1.id,
      status: 'DELIVERED',
      orderDate: completedOrderDate,
      expectedDeliveryDate: new Date(completedOrderDate.getTime() + supplier1.leadTime * 24 * 60 * 60 * 1000),
      actualDeliveryDate: completedDeliveryDate,
      totalAmount: 4500.00,
    },
  });

  await prisma.orderItem.create({
    data: {
      purchaseOrderId: po1.id,
      productId: products.find(p => p.sku === 'SKU-NET-01')!.id,
      quantity: 50,
      unitPrice: 90.00,
    },
  });

  // Active Order (Shipped, expected in 2 days)
  const activeOrderDate = new Date();
  activeOrderDate.setDate(now.getDate() - 3);
  const activeExpectedDate = new Date();
  activeExpectedDate.setDate(now.getDate() + 2);

  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-002',
      supplierId: supplier3.id,
      status: 'SHIPPED',
      orderDate: activeOrderDate,
      expectedDeliveryDate: activeExpectedDate,
      totalAmount: 2500.00,
    },
  });

  await prisma.orderItem.create({
    data: {
      purchaseOrderId: po2.id,
      productId: products.find(p => p.sku === 'SKU-ACC-04')!.id,
      quantity: 50,
      unitPrice: 50.00,
    },
  });

  // Overdue/Delayed Order (Ordered 15 days ago, lead time was 5 days, status still SENT)
  const delayedOrderDate = new Date();
  delayedOrderDate.setDate(now.getDate() - 15);
  const delayedExpectedDate = new Date();
  delayedExpectedDate.setDate(now.getDate() - 10); // Expected 10 days ago

  const po3 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-003',
      supplierId: supplier1.id,
      status: 'SENT',
      orderDate: delayedOrderDate,
      expectedDeliveryDate: delayedExpectedDate,
      totalAmount: 3749.85,
    },
  });

  await prisma.orderItem.create({
    data: {
      purchaseOrderId: po3.id,
      productId: products.find(p => p.sku === 'SKU-ELC-05')!.id,
      quantity: 15,
      unitPrice: 249.99,
    },
  });

  console.log('Seeding system alerts...');
  // 1. Low stock for routers
  await prisma.systemAlert.create({
    data: {
      type: 'LOW_STOCK',
      severity: 'WARNING',
      title: 'Low Stock: SKU-NET-01',
      message: 'HyperLink Wi-Fi Router has 25 units remaining. Reorder threshold is 30.',
    },
  });

  // 2. Critical stock for monitor
  await prisma.systemAlert.create({
    data: {
      type: 'LOW_STOCK',
      severity: 'CRITICAL',
      title: 'Critical Low Stock: SKU-ELC-05',
      message: 'UltraClear 27in Monitor has only 5 units left. Target level is 50. Reorder immediately.',
    },
  });

  // 3. Delayed Delivery Alert
  await prisma.systemAlert.create({
    data: {
      type: 'DELIVERY_DELAY',
      severity: 'CRITICAL',
      title: 'Delayed Shipment: PO-2026-003',
      message: 'Purchase Order PO-2026-003 from Apex Tech Logistics is 10 days overdue.',
    },
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
