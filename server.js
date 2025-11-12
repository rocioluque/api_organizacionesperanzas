const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rutas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const playersRoutes = require('./routes/players');
const teamsRoutes = require('./routes/teams');
const uploadRoutes = require('./routes/upload'); 

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/categories', categoriesRoutes);
app.use('/players', playersRoutes);
app.use('/teams', teamsRoutes);
app.use('/upload', uploadRoutes); 

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
      teams: '/teams',
      upload: '/upload' 
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});