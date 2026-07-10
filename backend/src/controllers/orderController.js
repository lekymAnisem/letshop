const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const checkout = async (req, res, next) => {
  try {
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

      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          items: orderItems,
          total,
          status: 'completed',
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

module.exports = { checkout, getOrders };
