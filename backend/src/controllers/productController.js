const { PrismaClient } = require('@prisma/client');
const { uploadToS3, deleteFromS3 } = require('../config/s3');

const prisma = new PrismaClient();

const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;

    if (!name || !description || !price || !stock || !category) {
      res.status(400);
      throw new Error('Please provide all required fields');
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToS3(req.file, 'products');
    }

    const product = await prisma.product.create({
      data: { name, description, price: parseFloat(price), stock: parseInt(stock), category, imageUrl },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'name') orderBy = { name: 'asc' };
    if (sort === 'popular') orderBy = { soldCount: 'desc' };
    if (sort === 'rating') orderBy = { rating: 'desc' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404);
      throw new Error('Product not found');
    }

    let imageUrl = existing.imageUrl;
    if (req.file) {
      if (existing.imageUrl) {
        try {
          const key = existing.imageUrl.split('.amazonaws.com/')[1];
          if (key) await deleteFromS3(key);
        } catch {}
      }
      imageUrl = await uploadToS3(req.file, 'products');
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: name || existing.name,
        description: description || existing.description,
        price: price ? parseFloat(price) : existing.price,
        stock: stock ? parseInt(stock) : existing.stock,
        category: category || existing.category,
        imageUrl,
      },
    });

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (product.imageUrl) {
      try {
        const key = product.imageUrl.split('.amazonaws.com/')[1];
        if (key) await deleteFromS3(key);
      } catch {}
    }

    await prisma.product.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image file');
    }

    const imageUrl = await uploadToS3(req.file, 'products');

    res.json({ success: true, data: { imageUrl } });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    const categories = products.map((p) => p.category).filter(Boolean);

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

module.exports = { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, uploadProductImage, getCategories };
