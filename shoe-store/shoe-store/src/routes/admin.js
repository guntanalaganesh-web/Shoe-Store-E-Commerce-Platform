/**
 * Admin Routes - Product & Inventory Management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Product, Order, User, Category } = require('../models');
const { isAdmin } = require('../middleware/auth');

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});

// Upload to S3
const uploadToS3 = async (file, folder = 'products') => {
    const key = `${folder}/${Date.now()}-${file.originalname}`;
    
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
    }));

    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

// Apply admin middleware to all routes
router.use(isAdmin);

// ==================== DASHBOARD ====================

// GET /admin - Admin dashboard
router.get('/', async (req, res) => {
    try {
        const [
            totalProducts,
            totalOrders,
            totalUsers,
            recentOrders,
            lowStockProducts,
            salesStats
        ] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            User.countDocuments({ role: 'customer' }),
            Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'firstName lastName email'),
            Product.find({ totalStock: { $lt: 10 } }).select('name brand totalStock'),
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $group: { _id: null, totalSales: { $sum: '$total' }, orderCount: { $sum: 1 } } }
            ])
        ]);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            stats: {
                totalProducts,
                totalOrders,
                totalUsers,
                totalSales: salesStats[0]?.totalSales || 0
            },
            recentOrders,
            lowStockProducts
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.session.error = 'Failed to load dashboard';
        res.redirect('/');
    }
});

// ==================== PRODUCTS ====================

// GET /admin/products - List all products
router.get('/products', async (req, res) => {
    try {
        const { page = 1, search, category, brand } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { brand: new RegExp(search, 'i') }
            ];
        }
        if (category) query.category = category;
        if (brand) query.brand = brand;

        const [products, total] = await Promise.all([
            Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Product.countDocuments(query)
        ]);

        res.render('admin/products/list', {
            title: 'Manage Products',
            products,
            pagination: {
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total
            },
            filters: { search, category, brand }
        });
    } catch (error) {
        console.error('List products error:', error);
        req.session.error = 'Failed to load products';
        res.redirect('/admin');
    }
});

// GET /admin/products/new - New product form
router.get('/products/new', (req, res) => {
    res.render('admin/products/form', {
        title: 'Add New Product',
        product: null,
        isEdit: false
    });
});

// POST /admin/products - Create product
router.post('/products', upload.array('images', 5), async (req, res) => {
    try {
        const {
            name, description, shortDescription, brand, category, gender,
            price, salePrice, sizes, colors, features, materials, tags,
            isActive, isFeatured
        } = req.body;

        // Parse JSON fields
        const parsedSizes = JSON.parse(sizes || '[]');
        const parsedColors = JSON.parse(colors || '[]');
        const parsedFeatures = features ? features.split(',').map(f => f.trim()) : [];
        const parsedMaterials = materials ? materials.split(',').map(m => m.trim()) : [];
        const parsedTags = tags ? tags.split(',').map(t => t.trim()) : [];

        // Upload images to S3
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const url = await uploadToS3(req.files[i]);
                images.push({
                    url,
                    alt: name,
                    isPrimary: i === 0
                });
            }
        }

        const product = await Product.create({
            name,
            description,
            shortDescription,
            brand,
            category,
            gender,
            price: parseFloat(price),
            salePrice: salePrice ? parseFloat(salePrice) : undefined,
            sizes: parsedSizes,
            colors: parsedColors,
            features: parsedFeatures,
            materials: parsedMaterials,
            tags: parsedTags,
            images,
            isActive: isActive === 'on',
            isFeatured: isFeatured === 'on'
        });

        req.session.success = 'Product created successfully';
        res.redirect(`/admin/products/${product._id}/edit`);
    } catch (error) {
        console.error('Create product error:', error);
        req.session.error = 'Failed to create product: ' + error.message;
        res.redirect('/admin/products/new');
    }
});

// GET /admin/products/:id/edit - Edit product form
router.get('/products/:id/edit', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.session.error = 'Product not found';
            return res.redirect('/admin/products');
        }

        res.render('admin/products/form', {
            title: 'Edit Product',
            product,
            isEdit: true
        });
    } catch (error) {
        console.error('Edit product error:', error);
        req.session.error = 'Failed to load product';
        res.redirect('/admin/products');
    }
});

// PUT /admin/products/:id - Update product
router.post('/products/:id', upload.array('images', 5), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.session.error = 'Product not found';
            return res.redirect('/admin/products');
        }

        const {
            name, description, shortDescription, brand, category, gender,
            price, salePrice, sizes, colors, features, materials, tags,
            isActive, isFeatured, existingImages
        } = req.body;

        // Parse JSON fields
        product.name = name;
        product.description = description;
        product.shortDescription = shortDescription;
        product.brand = brand;
        product.category = category;
        product.gender = gender;
        product.price = parseFloat(price);
        product.salePrice = salePrice ? parseFloat(salePrice) : undefined;
        product.sizes = JSON.parse(sizes || '[]');
        product.colors = JSON.parse(colors || '[]');
        product.features = features ? features.split(',').map(f => f.trim()) : [];
        product.materials = materials ? materials.split(',').map(m => m.trim()) : [];
        product.tags = tags ? tags.split(',').map(t => t.trim()) : [];
        product.isActive = isActive === 'on';
        product.isFeatured = isFeatured === 'on';

        // Handle existing images
        const keptImages = existingImages ? JSON.parse(existingImages) : [];
        product.images = product.images.filter(img => keptImages.includes(img.url));

        // Upload new images
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadToS3(file);
                product.images.push({
                    url,
                    alt: name,
                    isPrimary: product.images.length === 0
                });
            }
        }

        await product.save();

        req.session.success = 'Product updated successfully';
        res.redirect(`/admin/products/${product._id}/edit`);
    } catch (error) {
        console.error('Update product error:', error);
        req.session.error = 'Failed to update product: ' + error.message;
        res.redirect(`/admin/products/${req.params.id}/edit`);
    }
});

// DELETE /admin/products/:id - Delete product
router.delete('/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
});

// ==================== INVENTORY ====================

// GET /admin/inventory - Inventory management
router.get('/inventory', async (req, res) => {
    try {
        const products = await Product.find()
            .select('name brand sizes totalStock')
            .sort({ totalStock: 1 });

        res.render('admin/inventory', {
            title: 'Inventory Management',
            products
        });
    } catch (error) {
        console.error('Inventory error:', error);
        req.session.error = 'Failed to load inventory';
        res.redirect('/admin');
    }
});

// PUT /admin/inventory/:id - Update stock
router.put('/inventory/:id', async (req, res) => {
    try {
        const { sizes } = req.body;
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.sizes = sizes;
        await product.save();

        res.json({ success: true, message: 'Stock updated', totalStock: product.totalStock });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update stock' });
    }
});

// ==================== ORDERS ====================

// GET /admin/orders - List all orders
router.get('/orders', async (req, res) => {
    try {
        const { page = 1, status } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        const query = {};
        if (status) query.status = status;

        const [orders, total] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'firstName lastName email'),
            Order.countDocuments(query)
        ]);

        res.render('admin/orders/list', {
            title: 'Manage Orders',
            orders,
            pagination: {
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total
            },
            filters: { status }
        });
    } catch (error) {
        console.error('List orders error:', error);
        req.session.error = 'Failed to load orders';
        res.redirect('/admin');
    }
});

// GET /admin/orders/:id - Order details
router.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name slug images');

        if (!order) {
            req.session.error = 'Order not found';
            return res.redirect('/admin/orders');
        }

        res.render('admin/orders/detail', {
            title: `Order ${order.orderNumber}`,
            order
        });
    } catch (error) {
        console.error('Order detail error:', error);
        req.session.error = 'Failed to load order';
        res.redirect('/admin/orders');
    }
});

// PUT /admin/orders/:id/status - Update order status
router.put('/orders/:id/status', async (req, res) => {
    try {
        const { status, note, trackingNumber } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        if (trackingNumber) order.trackingNumber = trackingNumber;
        
        order.statusHistory.push({
            status,
            note: note || `Status updated to ${status}`
        });

        await order.save();

        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
});

// ==================== USERS ====================

// GET /admin/users - List users
router.get('/users', async (req, res) => {
    try {
        const { page = 1, role } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        const query = {};
        if (role) query.role = role;

        const [users, total] = await Promise.all([
            User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(query)
        ]);

        res.render('admin/users/list', {
            title: 'Manage Users',
            users,
            pagination: {
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total
            },
            filters: { role }
        });
    } catch (error) {
        console.error('List users error:', error);
        req.session.error = 'Failed to load users';
        res.redirect('/admin');
    }
});

module.exports = router;
