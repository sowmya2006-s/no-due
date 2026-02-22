const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const academicRoutes = require('./routes/academic');
const nodueRoutes = require('./routes/nodue');

app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/nodue', nodueRoutes);

app.get('/', (req, res) => {
    res.send('No Due Portal API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
