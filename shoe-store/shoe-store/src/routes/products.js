/**
 * Product Routes - API and Page Routes
 */

const express = require('express');
const router = express.Router();
const { Product } = require('../models');

// GET /api/products - Get all products with filtering
router.get('/', async (req, res) => {
    try {
        const {
            category,
            brand,
            gender,
            minPrice,
            maxPrice,
            size,
            color,
            sort,
            search,
            page = 1,
            limit = 12,
            featured
        } = req.query;

        // Build query
        const query = { isActive: true };

        if (category) query.category = category;
        if (brand) query.brand = brand;
        if (gender) query.gender = gender;
        if (featured === 'true') query.isFeatured = true;

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (size) {
            query['sizes.size'] = parseFloat(size);
            query['sizes.stock'] = { $gt: 0 };
        }

        if (color) {
            query['colors.name'] = new RegExp(color, 'i');
        }

        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { brand: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { tags: new RegExp(search, 'i') }
            ];
        }

        // Build sort
        let sortOption = {};
        switch (sort) {
            case 'price_asc':
                sortOption = { price: 1 };
                break;
            case 'price_desc':
                sortOption = { price: -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'rating':
                sortOption = { 'rating.average': -1 };
                break;
            case 'popular':
                sortOption = { soldCount: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Product.countDocuments(query);
        const totalPages = Math.ceil(total / parseInt(limit));

        // Execute query
        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-reviews');

        res.json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
});

// GET /api/products/categories - Get all categories with counts
router.get('/categories', async (req, res) => {
    try {
        const categories = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: categories.map(c => ({ name: c._id, count: c.count }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
});

// GET /api/products/brands - Get all brands
router.get('/brands', async (req, res) => {
    try {
        const brands = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$brand', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: brands.map(b => ({ name: b._id, count: b.count }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch brands' });
    }
});

// GET /api/products/sizes - Get available sizes
router.get('/sizes', async (req, res) => {
    try {
        const sizes = await Product.aggregate([
            { $match: { isActive: true } },
            { $unwind: '$sizes' },
            { $match: { 'sizes.stock': { $gt: 0 } } },
            { $group: { _id: '$sizes.size' } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: sizes.map(s => s._id)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch sizes' });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findOne({
            $or: [
                { _id: req.params.id },
                { slug: req.params.id }
            ],
            isActive: true
        }).populate('reviews.user', 'firstName lastName');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get related products
        const related = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true
        })
        .limit(4)
        .select('name slug price salePrice images brand');

        res.json({
            success: true,
            data: product,
            related
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
});

// POST /api/products/:id/review - Add review
router.post('/:id/review', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Please login to add a review'
            });
        }

        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if user already reviewed
        const existingReview = product.reviews.find(
            r => r.user.toString() === req.session.user.id
        );

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this product'
            });
        }

        // Add review
        product.reviews.push({
            user: req.session.user.id,
            rating: parseInt(rating),
            comment
        });

        // Update rating average
        const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
        product.rating.average = totalRating / product.reviews.length;
        product.rating.count = product.reviews.length;

        await product.save();

        res.json({
            success: true,
            message: 'Review added successfully'
        });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add review'
        });
    }
});

module.exports = router;
