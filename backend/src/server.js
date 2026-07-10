const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { uploadToS3 } = require('./config/s3');
const upload = require('./middleware/uploadMiddleware');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middleware/errorMiddleware');

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

app.post('/api/test-upload', upload.single('image'), async (req, res) => {
  try {
    console.log('Test upload - body:', req.body);
    console.log('Test upload - file:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'NO FILE');

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received. Make sure the form field name is "image"' });
    }

    const url = await uploadToS3(req.file, 'test');
    res.json({ success: true, message: 'Upload successful', data: { url } });
  } catch (err) {
    console.error('Test upload error:', err);
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const createAdminIfNotExists = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set in .env');
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await prisma.user.create({
        data: {
          name: 'Admin',
          email: adminEmail,
          password: hashedPassword,
          isAdmin: true,
        },
      });
      console.log('Admin user created successfully');
    } else if (!existing.isAdmin) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { isAdmin: true },
      });
      console.log('Existing user updated to admin');
    }
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
};

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await createAdminIfNotExists();
});
