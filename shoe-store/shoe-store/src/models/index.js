/**
 * MongoDB Models for Shoe Store
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ==================== USER MODEL ====================
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'USA' }
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

// ==================== PRODUCT MODEL ====================
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    shortDescription: {
        type: String,
        maxlength: 200
    },
    brand: {
        type: String,
        required: [true, 'Brand is required'],
        enum: ['Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Converse', 'Vans', 'Jordan', 'Under Armour', 'Other']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Running', 'Basketball', 'Casual', 'Formal', 'Sneakers', 'Boots', 'Sandals', 'Athletic']
    },
    gender: {
        type: String,
        enum: ['Men', 'Women', 'Unisex', 'Kids'],
        default: 'Unisex'
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    salePrice: {
        type: Number,
        min: 0
    },
    sizes: [{
        size: {
            type: Number,
            required: true
        },
        stock: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    colors: [{
        name: String,
        hexCode: String
    }],
    images: [{
        url: String,
        alt: String,
        isPrimary: { type: Boolean, default: false }
    }],
    features: [String],
    materials: [String],
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    tags: [String],
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    totalStock: {
        type: Number,
        default: 0
    },
    soldCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Generate slug before saving
productSchema.pre('save', function(next) {
    if (!this.slug || this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    // Calculate total stock
    this.totalStock = this.sizes.reduce((sum, s) => sum + s.stock, 0);
    next();
});

// Get primary image
productSchema.virtual('primaryImage').get(function() {
    const primary = this.images.find(img => img.isPrimary);
    return primary ? primary.url : (this.images[0]?.url || '/images/placeholder.jpg');
});

// Get effective price (sale or regular)
productSchema.virtual('effectivePrice').get(function() {
    return this.salePrice && this.salePrice < this.price ? this.salePrice : this.price;
});

// Check if on sale
productSchema.virtual('isOnSale').get(function() {
    return this.salePrice && this.salePrice < this.price;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

// ==================== ORDER MODEL ====================
const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        price: Number,
        size: Number,
        color: String,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        image: String
    }],
    shippingAddress: {
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'USA' },
        phone: String
    },
    billingAddress: {
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'USA' }
    },
    payment: {
        method: {
            type: String,
            enum: ['card', 'paypal', 'cod'],
            default: 'card'
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionId: String
    },
    subtotal: {
        type: Number,
        required: true
    },
    shipping: {
        method: String,
        cost: { type: Number, default: 0 }
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        code: String,
        amount: { type: Number, default: 0 }
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
    },
    trackingNumber: String,
    notes: String,
    statusHistory: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String
    }]
}, {
    timestamps: true
});

// Generate order number
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const date = new Date();
        const prefix = `ORD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await mongoose.model('Order').countDocuments();
        this.orderNumber = `${prefix}${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

const Order = mongoose.model('Order', orderSchema);

// ==================== CART MODEL (Session-based, optional persistence) ====================
const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sessionId: String,
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        size: Number,
        color: String,
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }
    }],
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
}, {
    timestamps: true
});

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Cart = mongoose.model('Cart', cartSchema);

// ==================== CATEGORY MODEL ====================
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: String,
    image: String,
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

module.exports = {
    User,
    Product,
    Order,
    Cart,
    Category
};
