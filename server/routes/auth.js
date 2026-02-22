const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Register (for initial Admin setup or later use)
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role.toUpperCase()
            }
        });

        res.status(201).json({ message: 'User created successfully', user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(400).json({ message: 'Error creating user', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const user = await prisma.user.findFirst({
            where: {
                username,
                role: role.toUpperCase()
            }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
