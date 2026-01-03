/**
 * Order Routes - Checkout and Order Management
 */

const express = require('express');
const router = express.Router();
const { Order, Product, User } = require('../models');
const { isAuthenticated } = require('../middleware/auth');

// GET /api/orders - Get user's orders
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.session.user.id })
            .sort({ createdAt: -1 })
            .populate('items.product', 'name slug images');

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
});

// GET /api/orders/:id - Get single order
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.session.user.id
        }).populate('items.product', 'name slug images');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
});

// POST /api/orders - Create new order (checkout)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const {
            shippingAddress,
            billingAddress,
            paymentMethod,
            shippingMethod
        } = req.body;

        const cart = req.session.cart;

        // Validate cart
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Validate and update stock
        const orderItems = [];
        for (const item of cart.items) {
            const product = await Product.findById(item.productId);
            
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.name} no longer exists`
                });
            }

            const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
            if (sizeIndex === -1 || product.sizes[sizeIndex].stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `${item.name} in size ${item.size} is no longer available in requested quantity`
                });
            }

            // Reduce stock
            product.sizes[sizeIndex].stock -= item.quantity;
            product.soldCount += item.quantity;
            await product.save();

            orderItems.push({
                product: product._id,
                name: product.name,
                price: item.price,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                image: item.image
            });
        }

        // Calculate shipping cost
        let shippingCost = 0;
        switch (shippingMethod) {
            case 'express':
                shippingCost = 19.99;
                break;
            case 'overnight':
                shippingCost = 29.99;
                break;
            default: // standard
                shippingCost = cart.subtotal >= 100 ? 0 : 9.99;
        }

        // Create order
        const order = await Order.create({
            user: req.session.user.id,
            items: orderItems,
            shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            payment: {
                method: paymentMethod,
                status: 'pending'
            },
            subtotal: cart.subtotal,
            shipping: {
                method: shippingMethod || 'standard',
                cost: shippingCost
            },
            tax: cart.tax,
            total: cart.subtotal + shippingCost + cart.tax,
            status: 'confirmed',
            statusHistory: [{
                status: 'confirmed',
                note: 'Order placed successfully'
            }]
        });

        // Clear cart
        req.session.cart = {
            items: [],
            subtotal: 0,
            shipping: 0,
            tax: 0,
            total: 0
        };

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place order'
        });
    }
});

// POST /api/orders/:id/cancel - Cancel order
router.post('/:id/cancel', isAuthenticated, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.session.user.id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        // Restore stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { 
                    'sizes.$[elem].stock': item.quantity,
                    soldCount: -item.quantity 
                }
            }, {
                arrayFilters: [{ 'elem.size': item.size }]
            });
        }

        // Update order status
        order.status = 'cancelled';
        order.statusHistory.push({
            status: 'cancelled',
            note: 'Cancelled by customer'
        });
        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
});

module.exports = router;
