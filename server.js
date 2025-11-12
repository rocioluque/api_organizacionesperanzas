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
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const playersRoutes = require('./routes/players');
const teamsRoutes = require('./routes/teams');

app.use('/auth', authRoutes);
app.use('/users', usersRoutes); 
app.use('/categories', categoriesRoutes);
app.use('/players', playersRoutes);
app.use('/teams', teamsRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Players - Online',
    status: 'OK',
    endpoints: {
      auth: '/auth',
      users: '/users', 
      categories: '/categories',
      players: '/players',
      teams: '/teams'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});