const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const checkout = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.country) {
      res.status(400);
      throw new Error('Shipping address is required (address, city, state, zipCode, country)');
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      res.status(400);
      throw new Error('Cart is empty');
    }

    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        res.status(400);
        throw new Error(`Insufficient stock for ${item.product.name}. Only ${item.product.stock} available.`);
      }
    }

    const orderItems = cartItems.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      imageUrl: item.product.imageUrl,
    }));

    const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.product.id },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { userId: req.user.id } });

      const statusHistory = [
        { status: 'pending', timestamp: new Date().toISOString(), note: 'Order placed' },
      ];

      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          items: orderItems,
          total,
          status: 'pending',
          shippingAddress,
          paymentMethod: paymentMethod || 'cod',
          paymentStatus: paymentMethod === 'card' ? 'paid' : 'pending',
          statusHistory,
        },
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: { orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['pending', 'packing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const currentStatusIndex = validStatuses.indexOf(order.status);
    const newStatusIndex = validStatuses.indexOf(status);

    if (newStatusIndex < currentStatusIndex && status !== 'cancelled') {
      res.status(400);
      throw new Error('Cannot move order to a previous status');
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      res.status(400);
      throw new Error(`Order is already ${order.status} and cannot be changed`);
    }

    const statusHistory = order.statusHistory || [];
    statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${status}`,
    });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory,
        paymentStatus: status === 'delivered' && order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus,
      },
    });

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkout, getOrders, getAllOrders, updateOrderStatus };
