// MongoDB Initialization Script
// Creates database, user, and seed data

// Switch to shoestore database
db = db.getSiblingDB('shoestore');

// Create application user
db.createUser({
    user: 'shoestore',
    pwd: 'shoestore123',
    roles: [{ role: 'readWrite', db: 'shoestore' }]
});

// Create indexes
db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ category: 1 });
db.products.createIndex({ brand: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ 'sizes.size': 1 });
db.products.createIndex({ isActive: 1, isFeatured: 1 });
db.products.createIndex({ name: 'text', description: 'text', brand: 'text' });

db.users.createIndex({ email: 1 }, { unique: true });
db.orders.createIndex({ user: 1, createdAt: -1 });
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ status: 1 });

// Seed admin user
db.users.insertOne({
    email: 'admin@shoestore.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VXOUoVJ./B5.P6u', // password: admin123
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

// Seed sample products
const products = [
    {
        name: 'Nike Air Max 270',
        slug: 'nike-air-max-270',
        description: 'The Nike Air Max 270 delivers visible cushioning under every step. Updated for modern comfort, it nods to the original, 1991 Air Max 180 with its heritage tongue top and low-cut collar.',
        shortDescription: 'Iconic Air Max cushioning with modern comfort',
        brand: 'Nike',
        category: 'Running',
        gender: 'Unisex',
        price: 150.00,
        salePrice: 129.99,
        sizes: [
            { size: 7, stock: 15 },
            { size: 7.5, stock: 12 },
            { size: 8, stock: 20 },
            { size: 8.5, stock: 18 },
            { size: 9, stock: 25 },
            { size: 9.5, stock: 22 },
            { size: 10, stock: 30 },
            { size: 10.5, stock: 15 },
            { size: 11, stock: 20 },
            { size: 12, stock: 10 }
        ],
        colors: [
            { name: 'Black/White', hexCode: '#000000' },
            { name: 'Blue/Navy', hexCode: '#1e3a8a' }
        ],
        images: [
            { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', alt: 'Nike Air Max 270', isPrimary: true }
        ],
        features: ['Air Max 270 unit', 'Mesh upper', 'Foam midsole', 'Rubber outsole'],
        materials: ['Mesh', 'Synthetic', 'Rubber'],
        tags: ['running', 'air max', 'cushioned'],
        isActive: true,
        isFeatured: true,
        rating: { average: 4.5, count: 128 },
        totalStock: 187,
        soldCount: 342
    },
    {
        name: 'Adidas Ultraboost 22',
        slug: 'adidas-ultraboost-22',
        description: 'These running shoes serve up incredible energy return with a BOOST midsole. The adidas PRIMEKNIT upper hugs your foot for a supportive fit.',
        shortDescription: 'Premium running with BOOST technology',
        brand: 'Adidas',
        category: 'Running',
        gender: 'Men',
        price: 190.00,
        sizes: [
            { size: 8, stock: 15 },
            { size: 8.5, stock: 18 },
            { size: 9, stock: 22 },
            { size: 9.5, stock: 20 },
            { size: 10, stock: 25 },
            { size: 10.5, stock: 15 },
            { size: 11, stock: 18 },
            { size: 12, stock: 12 }
        ],
        colors: [
            { name: 'Core Black', hexCode: '#000000' },
            { name: 'Cloud White', hexCode: '#ffffff' }
        ],
        images: [
            { url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800', alt: 'Adidas Ultraboost 22', isPrimary: true }
        ],
        features: ['BOOST midsole', 'PRIMEKNIT upper', 'Continental rubber outsole', 'Torsion System'],
        materials: ['Primeknit', 'BOOST foam', 'Continental rubber'],
        tags: ['running', 'boost', 'performance'],
        isActive: true,
        isFeatured: true,
        rating: { average: 4.7, count: 89 },
        totalStock: 145,
        soldCount: 256
    },
    {
        name: 'Converse Chuck Taylor All Star',
        slug: 'converse-chuck-taylor-all-star',
        description: 'The iconic Chuck Taylor All Star. This timeless sneaker features a durable canvas upper, vulcanized rubber sole, and the unmistakable Chuck Taylor ankle patch.',
        shortDescription: 'The iconic canvas sneaker',
        brand: 'Converse',
        category: 'Casual',
        gender: 'Unisex',
        price: 65.00,
        salePrice: 54.99,
        sizes: [
            { size: 6, stock: 20 },
            { size: 7, stock: 25 },
            { size: 8, stock: 30 },
            { size: 9, stock: 35 },
            { size: 10, stock: 30 },
            { size: 11, stock: 25 },
            { size: 12, stock: 20 }
        ],
        colors: [
            { name: 'Black', hexCode: '#000000' },
            { name: 'White', hexCode: '#ffffff' },
            { name: 'Red', hexCode: '#dc2626' }
        ],
        images: [
            { url: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800', alt: 'Converse Chuck Taylor', isPrimary: true }
        ],
        features: ['Canvas upper', 'Vulcanized rubber sole', 'OrthoLite insole', 'Classic design'],
        materials: ['Canvas', 'Rubber'],
        tags: ['casual', 'classic', 'canvas'],
        isActive: true,
        isFeatured: false,
        rating: { average: 4.3, count: 456 },
        totalStock: 185,
        soldCount: 1234
    },
    {
        name: 'Jordan 1 Retro High OG',
        slug: 'jordan-1-retro-high-og',
        description: 'The Air Jordan 1 Retro High remakes the classic sneaker, with new colors and premium materials. This icon features Nike Air technology for cushioning.',
        shortDescription: 'The legendary basketball icon',
        brand: 'Jordan',
        category: 'Basketball',
        gender: 'Men',
        price: 180.00,
        sizes: [
            { size: 8, stock: 5 },
            { size: 9, stock: 8 },
            { size: 10, stock: 10 },
            { size: 11, stock: 7 },
            { size: 12, stock: 5 }
        ],
        colors: [
            { name: 'Chicago', hexCode: '#dc2626' },
            { name: 'Royal Blue', hexCode: '#1d4ed8' }
        ],
        images: [
            { url: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800', alt: 'Jordan 1 Retro High', isPrimary: true }
        ],
        features: ['Air-Sole unit', 'Leather upper', 'Rubber cupsole', 'Padded collar'],
        materials: ['Leather', 'Rubber', 'Foam'],
        tags: ['basketball', 'jordan', 'retro', 'high-top'],
        isActive: true,
        isFeatured: true,
        rating: { average: 4.8, count: 234 },
        totalStock: 35,
        soldCount: 567
    },
    {
        name: 'New Balance 990v5',
        slug: 'new-balance-990v5',
        description: 'The 990v5 is the latest installment of the iconic 990 Series. Made in the USA, it features premium materials and ENCAP midsole technology.',
        shortDescription: 'Made in USA premium comfort',
        brand: 'New Balance',
        category: 'Athletic',
        gender: 'Unisex',
        price: 185.00,
        sizes: [
            { size: 7, stock: 12 },
            { size: 8, stock: 15 },
            { size: 9, stock: 18 },
            { size: 10, stock: 20 },
            { size: 11, stock: 15 },
            { size: 12, stock: 10 }
        ],
        colors: [
            { name: 'Grey', hexCode: '#6b7280' }
        ],
        images: [
            { url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800', alt: 'New Balance 990v5', isPrimary: true }
        ],
        features: ['ENCAP midsole', 'Pigskin/mesh upper', 'Made in USA', 'Blown rubber outsole'],
        materials: ['Pigskin', 'Mesh', 'ENCAP foam', 'Rubber'],
        tags: ['athletic', 'comfort', 'made in usa'],
        isActive: true,
        isFeatured: true,
        rating: { average: 4.6, count: 178 },
        totalStock: 90,
        soldCount: 423
    },
    {
        name: 'Vans Old Skool',
        slug: 'vans-old-skool',
        description: 'The Old Skool, Vans classic skate shoe and the first to feature the iconic side stripe, has a low-top lace-up silhouette with a durable suede and canvas upper.',
        shortDescription: 'Classic skate shoe with iconic stripe',
        brand: 'Vans',
        category: 'Sneakers',
        gender: 'Unisex',
        price: 70.00,
        sizes: [
            { size: 6, stock: 25 },
            { size: 7, stock: 30 },
            { size: 8, stock: 35 },
            { size: 9, stock: 40 },
            { size: 10, stock: 35 },
            { size: 11, stock: 25 },
            { size: 12, stock: 20 }
        ],
        colors: [
            { name: 'Black/White', hexCode: '#000000' },
            { name: 'Navy', hexCode: '#1e3a8a' }
        ],
        images: [
            { url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', alt: 'Vans Old Skool', isPrimary: true }
        ],
        features: ['Suede and canvas upper', 'Signature rubber waffle outsole', 'Padded collar', 'Vulcanized construction'],
        materials: ['Suede', 'Canvas', 'Rubber'],
        tags: ['skate', 'casual', 'classic'],
        isActive: true,
        isFeatured: false,
        rating: { average: 4.4, count: 567 },
        totalStock: 210,
        soldCount: 890
    }
];

// Insert products
products.forEach(product => {
    product.createdAt = new Date();
    product.updatedAt = new Date();
});

db.products.insertMany(products);

print('Database initialized successfully!');
print('Admin user: admin@shoestore.com / admin123');
print('Sample products: ' + products.length);
