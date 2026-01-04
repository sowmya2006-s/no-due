const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ message: 'College No Due API is running 🚀' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
