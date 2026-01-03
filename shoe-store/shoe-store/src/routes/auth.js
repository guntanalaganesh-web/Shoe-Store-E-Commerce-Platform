/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { body, validationResult } = require('express-validator');

// Validation middleware
const registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

// GET /auth/register - Show registration form
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('user/register', { title: 'Create Account' });
});

// POST /auth/register - Handle registration
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('user/register', {
                title: 'Create Account',
                errors: errors.array(),
                formData: req.body
            });
        }

        const { email, password, firstName, lastName, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('user/register', {
                title: 'Create Account',
                errors: [{ msg: 'Email already registered' }],
                formData: req.body
            });
        }

        // Create user
        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            phone
        });

        // Set session
        req.session.user = {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        };

        req.session.success = 'Account created successfully! Welcome to Shoe Store.';
        res.redirect('/');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('user/register', {
            title: 'Create Account',
            errors: [{ msg: 'Registration failed. Please try again.' }],
            formData: req.body
        });
    }
});

// GET /auth/login - Show login form
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('user/login', { title: 'Login' });
});

// POST /auth/login - Handle login
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('user/login', {
                title: 'Login',
                errors: errors.array(),
                formData: req.body
            });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email, isActive: true });
        if (!user) {
            return res.render('user/login', {
                title: 'Login',
                errors: [{ msg: 'Invalid email or password' }],
                formData: req.body
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('user/login', {
                title: 'Login',
                errors: [{ msg: 'Invalid email or password' }],
                formData: req.body
            });
        }

        // Set session
        req.session.user = {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        };

        req.session.success = `Welcome back, ${user.firstName}!`;
        
        // Redirect to intended page or home
        const redirectTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(redirectTo);
    } catch (error) {
        console.error('Login error:', error);
        res.render('user/login', {
            title: 'Login',
            errors: [{ msg: 'Login failed. Please try again.' }],
            formData: req.body
        });
    }
});

// GET /auth/logout - Handle logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// GET /auth/profile - User profile
router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        req.session.returnTo = '/auth/profile';
        return res.redirect('/auth/login');
    }

    try {
        const user = await User.findById(req.session.user.id);
        const orders = await require('../models').Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('user/profile', {
            title: 'My Profile',
            profile: user,
            orders
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.redirect('/');
    }
});

// POST /auth/profile - Update profile
router.post('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const { firstName, lastName, phone, street, city, state, zipCode } = req.body;

        await User.findByIdAndUpdate(req.session.user.id, {
            firstName,
            lastName,
            phone,
            address: { street, city, state, zipCode }
        });

        // Update session
        req.session.user.firstName = firstName;
        req.session.user.lastName = lastName;

        req.session.success = 'Profile updated successfully!';
        res.redirect('/auth/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.session.error = 'Failed to update profile';
        res.redirect('/auth/profile');
    }
});

module.exports = router;
