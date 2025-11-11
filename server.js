const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Importar rutas
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const playersRoutes = require('./routes/players');

app.use('/auth', authRoutes);
app.use('/categories', categoriesRoutes);
app.use('/players', playersRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Players - Online',
    status: 'OK',
    environment: process.env.NODE_ENV || 'production'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});