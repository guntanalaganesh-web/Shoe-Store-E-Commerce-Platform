/**
 * Page Routes - Frontend Views
 */

const express = require('express');
const router = express.Router();
const { Product, Category } = require('../models');

// GET / - Home page
router.get('/', async (req, res) => {
    try {
        const [featuredProducts, newArrivals, categories] = await Promise.all([
            Product.find({ isFeatured: true, isActive: true }).limit(8),
            Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(8),
            Product.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        res.render('pages/home', {
            title: 'Shoe Store - Premium Footwear',
            featuredProducts,
            newArrivals,
            categories
        });
    } catch (error) {
        console.error('Home page error:', error);
        res.render('pages/home', {
            title: 'Shoe Store',
            featuredProducts: [],
            newArrivals: [],
            categories: []
        });
    }
});

// GET /shop - Shop page with filters
router.get('/shop', async (req, res) => {
    try {
        const {
            category, brand, gender, minPrice, maxPrice,
            size, sort, search, page = 1
        } = req.query;

        const limit = 12;
        const skip = (parseInt(page) - 1) * limit;

        // Build query
        const query = { isActive: true };
        if (category) query.category = category;
        if (brand) query.brand = brand;
        if (gender) query.gender = gender;
        if (size) query['sizes.size'] = parseFloat(size);
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { brand: new RegExp(search, 'i') }
            ];
        }

        // Sort options
        let sortOption = { createdAt: -1 };
        switch (sort) {
            case 'price_asc': sortOption = { price: 1 }; break;
            case 'price_desc': sortOption = { price: -1 }; break;
            case 'rating': sortOption = { 'rating.average': -1 }; break;
            case 'popular': sortOption = { soldCount: -1 }; break;
        }

        const [products, total, brands, sizes, categories] = await Promise.all([
            Product.find(query).sort(sortOption).skip(skip).limit(limit),
            Product.countDocuments(query),
            Product.distinct('brand', { isActive: true }),
            Product.aggregate([
                { $match: { isActive: true } },
                { $unwind: '$sizes' },
                { $group: { _id: '$sizes.size' } },
                { $sort: { _id: 1 } }
            ]),
            Product.distinct('category', { isActive: true })
        ]);

        res.render('pages/shop', {
            title: 'Shop All Shoes',
            products,
            pagination: {
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total
            },
            filters: { category, brand, gender, minPrice, maxPrice, size, sort, search },
            availableFilters: {
                brands,
                sizes: sizes.map(s => s._id),
                categories
            }
        });
    } catch (error) {
        console.error('Shop page error:', error);
        res.render('pages/shop', {
            title: 'Shop',
            products: [],
            pagination: { page: 1, totalPages: 1, total: 0 },
            filters: {},
            availableFilters: { brands: [], sizes: [], categories: [] }
        });
    }
});

// GET /product/:slug - Product detail page
router.get('/product/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({
            $or: [{ slug: req.params.slug }, { _id: req.params.slug }],
            isActive: true
        }).populate('reviews.user', 'firstName lastName');

        if (!product) {
            return res.status(404).render('pages/404', {
                title: 'Product Not Found'
            });
        }

        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true
        }).limit(4);

        res.render('pages/product', {
            title: product.name,
            product,
            relatedProducts
        });
    } catch (error) {
        console.error('Product page error:', error);
        res.status(500).render('pages/error', { title: 'Error' });
    }
});

// GET /category/:category - Category page
router.get('/category/:category', async (req, res) => {
    req.query.category = req.params.category;
    res.redirect(`/shop?category=${req.params.category}`);
});

// GET /brand/:brand - Brand page
router.get('/brand/:brand', async (req, res) => {
    res.redirect(`/shop?brand=${req.params.brand}`);
});

// GET /cart - Cart page
router.get('/cart', (req, res) => {
    res.render('pages/cart', {
        title: 'Shopping Cart'
    });
});

// GET /checkout - Checkout page
router.get('/checkout', (req, res) => {
    if (!req.session.user) {
        req.session.returnTo = '/checkout';
        return res.redirect('/auth/login');
    }

    if (!req.session.cart || req.session.cart.items.length === 0) {
        return res.redirect('/cart');
    }

    res.render('pages/checkout', {
        title: 'Checkout'
    });
});

// GET /order-confirmation/:id - Order confirmation
router.get('/order-confirmation/:id', async (req, res) => {
    try {
        const { Order } = require('../models');
        const order = await Order.findById(req.params.id);

        if (!order || order.user.toString() !== req.session.user?.id) {
            return res.redirect('/');
        }

        res.render('pages/order-confirmation', {
            title: 'Order Confirmed',
            order
        });
    } catch (error) {
        res.redirect('/');
    }
});

// GET /about - About page
router.get('/about', (req, res) => {
    res.render('pages/about', { title: 'About Us' });
});

// GET /contact - Contact page
router.get('/contact', (req, res) => {
    res.render('pages/contact', { title: 'Contact Us' });
});

// GET /search - Search results
router.get('/search', (req, res) => {
    res.redirect(`/shop?search=${req.query.q || ''}`);
});

module.exports = router;
