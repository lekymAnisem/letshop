const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getCart = async (req, res, next) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            stock: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    res.json({
      success: true,
      data: { items: cartItems, total },
    });
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      res.status(400);
      throw new Error('Product ID is required');
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (product.stock < quantity) {
      res.status(400);
      throw new Error('Insufficient stock');
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    });

    let cartItem;

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > product.stock) {
        res.status(400);
        throw new Error('Insufficient stock');
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { userId: req.user.id, productId, quantity },
        include: { product: true },
      });
    }

    res.status(201).json({ success: true, data: cartItem });
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (!quantity || quantity < 1) {
      res.status(400);
      throw new Error('Quantity must be at least 1');
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });

    if (!cartItem) {
      res.status(404);
      throw new Error('Cart item not found');
    }

    if (cartItem.userId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to update this cart item');
    }

    if (quantity > cartItem.product.stock) {
      res.status(400);
      throw new Error('Insufficient stock');
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          select: { id: true, name: true, price: true, imageUrl: true, stock: true },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cartItem = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!cartItem) {
      res.status(404);
      throw new Error('Cart item not found');
    }

    if (cartItem.userId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to remove this cart item');
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem };
