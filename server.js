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
const teamsRoutes = require('./routes/teams'); // ✅ NUEVA RUTA

app.use('/auth', authRoutes);
app.use('/categories', categoriesRoutes);
app.use('/players', playersRoutes);
app.use('/teams', teamsRoutes); // ✅ REGISTRAR NUEVA RUTA

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Players - Online',
    status: 'OK',
    endpoints: {
      auth: '/auth',
      categories: '/categories',
      players: '/players',
      teams: '/teams' // ✅ NUEVO ENDPOINT
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});