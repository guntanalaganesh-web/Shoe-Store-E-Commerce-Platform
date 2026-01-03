/**
 * Shoe Store - Frontend JavaScript
 */

// ==================== Cart Management ====================
const Cart = {
    // Add item to cart
    async add(productId, size, color, quantity = 1) {
        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, size, color, quantity })
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateUI(data.data);
                this.showNotification('Added to cart!', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
            return data;
        } catch (error) {
            console.error('Add to cart error:', error);
            this.showNotification('Failed to add item', 'error');
        }
    },

    // Update cart item quantity
    async update(productId, size, quantity) {
        try {
            const response = await fetch('/api/cart/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, size, quantity })
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateUI(data.data);
                if (quantity === 0) {
                    this.showNotification('Item removed', 'info');
                }
            } else {
                this.showNotification(data.message, 'error');
            }
            return data;
        } catch (error) {
            console.error('Update cart error:', error);
        }
    },

    // Remove item from cart
    async remove(productId, size) {
        try {
            const response = await fetch('/api/cart/remove', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, size })
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateUI(data.data);
                this.showNotification('Item removed', 'success');
            }
            return data;
        } catch (error) {
            console.error('Remove from cart error:', error);
        }
    },

    // Clear entire cart
    async clear() {
        try {
            const response = await fetch('/api/cart/clear', { method: 'DELETE' });
            const data = await response.json();
            
            if (data.success) {
                this.updateUI(data.data);
                this.showNotification('Cart cleared', 'info');
            }
            return data;
        } catch (error) {
            console.error('Clear cart error:', error);
        }
    },

    // Update cart UI
    updateUI(cart) {
        // Update cart count in header
        const countEl = document.querySelector('.cart-count');
        if (countEl) {
            const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
            countEl.textContent = count;
            countEl.style.display = count > 0 ? 'flex' : 'none';
        }

        // Update cart page if we're on it
        const cartItems = document.getElementById('cart-items');
        if (cartItems) {
            this.renderCartItems(cart);
        }

        // Update cart summary
        this.renderCartSummary(cart);
    },

    // Render cart items
    renderCartItems(cart) {
        const container = document.getElementById('cart-items');
        if (!container) return;

        if (cart.items.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty</p>
                    <a href="/shop" class="btn btn-primary">Continue Shopping</a>
                </div>
            `;
            return;
        }

        container.innerHTML = cart.items.map(item => `
            <div class="cart-item" data-product-id="${item.productId}" data-size="${item.size}">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h4><a href="/product/${item.slug}">${item.name}</a></h4>
                    <p class="cart-item-meta">${item.brand} | Size: ${item.size} | Color: ${item.color}</p>
                    <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="Cart.update('${item.productId}', ${item.size}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="Cart.update('${item.productId}', ${item.size}, ${item.quantity + 1})">+</button>
                    </div>
                    <p class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</p>
                    <button class="btn btn-sm btn-danger" onclick="Cart.remove('${item.productId}', ${item.size})">Remove</button>
                </div>
            </div>
        `).join('');
    },

    // Render cart summary
    renderCartSummary(cart) {
        const subtotalEl = document.getElementById('cart-subtotal');
        const shippingEl = document.getElementById('cart-shipping');
        const taxEl = document.getElementById('cart-tax');
        const totalEl = document.getElementById('cart-total');

        if (subtotalEl) subtotalEl.textContent = `$${cart.subtotal.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = cart.shipping === 0 ? 'FREE' : `$${cart.shipping.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `$${cart.tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${cart.total.toFixed(2)}`;
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// ==================== Product Functions ====================
const Product = {
    // Load product details
    async load(id) {
        try {
            const response = await fetch(`/api/products/${id}`);
            return await response.json();
        } catch (error) {
            console.error('Load product error:', error);
        }
    },

    // Add to wishlist
    async addToWishlist(productId) {
        try {
            const response = await fetch('/api/wishlist/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
            const data = await response.json();
            
            if (data.success) {
                Cart.showNotification('Added to wishlist!', 'success');
            } else {
                Cart.showNotification(data.message, 'error');
            }
        } catch (error) {
            Cart.showNotification('Please login to add to wishlist', 'error');
        }
    },

    // Handle size selection
    selectSize(button, size) {
        document.querySelectorAll('.size-option').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        document.getElementById('selected-size').value = size;
    },

    // Handle color selection
    selectColor(button, color) {
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        document.getElementById('selected-color').value = color;
    },

    // Handle quantity change
    updateQuantity(change) {
        const input = document.getElementById('quantity');
        let value = parseInt(input.value) + change;
        value = Math.max(1, Math.min(10, value));
        input.value = value;
    },

    // Add to cart from product page
    addToCart() {
        const productId = document.getElementById('product-id').value;
        const size = document.getElementById('selected-size').value;
        const color = document.getElementById('selected-color').value;
        const quantity = parseInt(document.getElementById('quantity').value);

        if (!size) {
            Cart.showNotification('Please select a size', 'error');
            return;
        }

        Cart.add(productId, size, color, quantity);
    }
};

// ==================== Filters ====================
const Filters = {
    apply() {
        const form = document.getElementById('filter-form');
        if (!form) return;

        const formData = new FormData(form);
        const params = new URLSearchParams();

        for (const [key, value] of formData.entries()) {
            if (value) params.append(key, value);
        }

        window.location.href = `/shop?${params.toString()}`;
    },

    clear() {
        window.location.href = '/shop';
    },

    toggleFilter(type, value) {
        const url = new URL(window.location.href);
        const current = url.searchParams.get(type);

        if (current === value) {
            url.searchParams.delete(type);
        } else {
            url.searchParams.set(type, value);
        }

        window.location.href = url.toString();
    }
};

// ==================== Checkout ====================
const Checkout = {
    async submit(event) {
        event.preventDefault();
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const formData = new FormData(form);
        const data = {
            shippingAddress: {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                street: formData.get('street'),
                city: formData.get('city'),
                state: formData.get('state'),
                zipCode: formData.get('zipCode'),
                phone: formData.get('phone')
            },
            paymentMethod: formData.get('paymentMethod'),
            shippingMethod: formData.get('shippingMethod')
        };

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                window.location.href = `/order-confirmation/${result.data.orderId}`;
            } else {
                Cart.showNotification(result.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
        } catch (error) {
            console.error('Checkout error:', error);
            Cart.showNotification('Checkout failed. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order';
        }
    }
};

// ==================== Search ====================
const Search = {
    init() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;

        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (e.target.value.length >= 2) {
                    this.search(e.target.value);
                } else {
                    this.clearResults();
                }
            }, 300);
        });
    },

    async search(query) {
        try {
            const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            this.showResults(data.data);
        } catch (error) {
            console.error('Search error:', error);
        }
    },

    showResults(products) {
        let container = document.getElementById('search-results');
        if (!container) {
            container = document.createElement('div');
            container.id = 'search-results';
            container.className = 'search-results';
            document.getElementById('search-input').parentElement.appendChild(container);
        }

        if (products.length === 0) {
            container.innerHTML = '<p class="no-results">No products found</p>';
            return;
        }

        container.innerHTML = products.map(p => `
            <a href="/product/${p.slug}" class="search-result-item">
                <img src="${p.images[0]?.url || '/images/placeholder.jpg'}" alt="${p.name}">
                <div>
                    <p class="name">${p.name}</p>
                    <p class="price">$${p.price.toFixed(2)}</p>
                </div>
            </a>
        `).join('');
    },

    clearResults() {
        const container = document.getElementById('search-results');
        if (container) container.remove();
    }
};

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    Search.init();

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Image gallery
    const thumbnails = document.querySelectorAll('.product-thumbnail');
    const mainImage = document.getElementById('main-product-image');
    
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            if (mainImage) {
                mainImage.src = thumb.dataset.image;
            }
        });
    });

    // Auto-hide alerts
    document.querySelectorAll('.alert').forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 1rem;
        z-index: 1000;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .notification.show { transform: translateX(0); }
    .notification-success { background: #10b981; color: white; }
    .notification-error { background: #ef4444; color: white; }
    .notification-info { background: #3b82f6; color: white; }
    .notification button {
        background: none;
        border: none;
        color: inherit;
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0.7;
    }
    .notification button:hover { opacity: 1; }
`;
document.head.appendChild(notificationStyles);
