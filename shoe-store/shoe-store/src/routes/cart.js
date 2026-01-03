/**
 * Cart Routes - Session-based cart management
 */

const express = require('express');
const router = express.Router();
const { Product } = require('../models');

// Initialize cart in session
const initCart = (req) => {
    if (!req.session.cart) {
        req.session.cart = {
            items: [],
            subtotal: 0,
            shipping: 0,
            tax: 0,
            total: 0
        };
    }
    return req.session.cart;
};

// Calculate cart totals
const calculateTotals = (cart) => {
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.shipping = cart.subtotal >= 100 ? 0 : 9.99; // Free shipping over $100
    cart.tax = cart.subtotal * 0.08; // 8% tax
    cart.total = cart.subtotal + cart.shipping + cart.tax;
    return cart;
};

// GET /api/cart - Get cart contents
router.get('/', (req, res) => {
    const cart = initCart(req);
    res.json({
        success: true,
        data: cart
    });
});

// POST /api/cart/add - Add item to cart
router.post('/add', async (req, res) => {
    try {
        const { productId, size, color, quantity = 1 } = req.body;

        // Validate product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check size availability
        const sizeOption = product.sizes.find(s => s.size === parseFloat(size));
        if (!sizeOption || sizeOption.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Selected size is not available in requested quantity'
            });
        }

        const cart = initCart(req);

        // Check if item already in cart
        const existingIndex = cart.items.findIndex(
            item => item.productId === productId && 
                    item.size === parseFloat(size) && 
                    item.color === color
        );

        if (existingIndex > -1) {
            // Update quantity
            const newQty = cart.items[existingIndex].quantity + parseInt(quantity);
            if (newQty > sizeOption.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${sizeOption.stock} items available in this size`
                });
            }
            cart.items[existingIndex].quantity = newQty;
        } else {
            // Add new item
            cart.items.push({
                productId: product._id.toString(),
                name: product.name,
                brand: product.brand,
                price: product.effectivePrice,
                originalPrice: product.price,
                size: parseFloat(size),
                color: color || 'Default',
                quantity: parseInt(quantity),
                image: product.primaryImage,
                slug: product.slug,
                maxStock: sizeOption.stock
            });
        }

        calculateTotals(cart);
        req.session.cart = cart;

        res.json({
            success: true,
            message: 'Item added to cart',
            data: cart
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to cart'
        });
    }
});

// PUT /api/cart/update - Update item quantity
router.put('/update', async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        const cart = initCart(req);

        const itemIndex = cart.items.findIndex(
            item => item.productId === productId && item.size === parseFloat(size)
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        if (quantity <= 0) {
            // Remove item
            cart.items.splice(itemIndex, 1);
        } else {
            // Check stock
            const product = await Product.findById(productId);
            const sizeOption = product.sizes.find(s => s.size === parseFloat(size));
            
            if (quantity > sizeOption.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${sizeOption.stock} items available`
                });
            }
            
            cart.items[itemIndex].quantity = parseInt(quantity);
        }

        calculateTotals(cart);
        req.session.cart = cart;

        res.json({
            success: true,
            message: 'Cart updated',
            data: cart
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update cart'
        });
    }
});

// DELETE /api/cart/remove - Remove item from cart
router.delete('/remove', (req, res) => {
    try {
        const { productId, size } = req.body;
        const cart = initCart(req);

        const itemIndex = cart.items.findIndex(
            item => item.productId === productId && item.size === parseFloat(size)
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items.splice(itemIndex, 1);
        calculateTotals(cart);
        req.session.cart = cart;

        res.json({
            success: true,
            message: 'Item removed from cart',
            data: cart
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item'
        });
    }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', (req, res) => {
    req.session.cart = {
        items: [],
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0
    };

    res.json({
        success: true,
        message: 'Cart cleared',
        data: req.session.cart
    });
});

// GET /api/cart/count - Get cart item count
router.get('/count', (req, res) => {
    const cart = initCart(req);
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    res.json({
        success: true,
        count
    });
});

module.exports = router;
