const { getPool, sql } = require('../config/database');

async function initializeDatabase() {
  let pool;
  try {
    console.log('Inicializando tablas en base de datos Delishare...');
    
    // Conectar a Delishare
    pool = await getPool();
    console.log('Conectado a Delishare');

    // Crear tablas si no existen
    console.log('Creando/Verificando tablas...');
    
    const tables = [
      `-- Tabla de categorías
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='U')
      CREATE TABLE categories (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL
      )`,

      `-- Tabla de usuarios
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id NVARCHAR(50) PRIMARY KEY,
        username NVARCHAR(255) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL CHECK (role IN ('DELEGATE', 'ORGANIZER'))
      )`,

      `-- Tabla de categorías asignadas a usuarios
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_categories' AND xtype='U')
      CREATE TABLE user_categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id NVARCHAR(50) NOT NULL,
        team_name NVARCHAR(255) NOT NULL,
        category_id NVARCHAR(50) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,

      `-- Tabla de jugadores
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='players' AND xtype='U')
      CREATE TABLE players (
        id NVARCHAR(50) PRIMARY KEY,
        category_id NVARCHAR(50) NOT NULL,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        birth_date NVARCHAR(20),
        photo_url NVARCHAR(500),
        status NVARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`
    ];

    for (let i = 0; i < tables.length; i++) {
      try {
        await pool.request().query(tables[i]);
        console.log(`✅ Tabla ${i + 1} creada/verificada correctamente`);
      } catch (tableError) {
        console.error(`❌ Error creando tabla ${i + 1}:`, tableError.message);
        throw tableError;
      }
    }

    console.log('Todas las tablas creadas/verificadas correctamente');

    // Insertar datos iniciales
    await insertInitialData(pool);
    
    console.log('✅ Base de datos Delishare inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error.message);
    throw error;
  } finally {
    // Cerrar la conexión
    if (pool) {
      await pool.close();
    }
  }
}

async function insertInitialData(pool) {
  console.log('Insertando datos iniciales...');

  // Insertar categorías
  const categories = [
    { id: 'cat_1_1', name: 'Sub-10' },
    { id: 'cat_1_2', name: 'Sub-12' },
    { id: 'cat_1_3', name: 'Sub-14' },
    { id: 'cat_1_4', name: 'Sub-16' }
  ];

  console.log('Insertando categorías...');
  for (const category of categories) {
    try {
      const result = await pool.request()
        .input('id', sql.NVarChar, category.id)
        .input('name', sql.NVarChar, category.name)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM categories WHERE id = @id)
          INSERT INTO categories (id, name) VALUES (@id, @name)
          ELSE
          PRINT 'Categoría ${category.name} ya existe'
        `);
      
      if (result.rowsAffected[0] > 0) {
        console.log(`✅ Categoría ${category.name} insertada`);
      } else {
        console.log(`ℹ️ Categoría ${category.name} ya existe`);
      }
    } catch (error) {
      console.log(`⚠️ Categoría ${category.id}: ${error.message}`);
    }
  }

  // Insertar usuarios
  const users = [
    { 
      id: 'user_abc_456', 
      username: 'delegate@example.com', 
      password: 'password123', 
      role: 'DELEGATE' 
    },
    { 
      id: 'user_xyz_789', 
      username: 'organizer@example.com', 
      password: 'admin123', 
      role: 'ORGANIZER' 
    }
  ];

  console.log('Insertando usuarios...');
  for (const user of users) {
    try {
      const result = await pool.request()
        .input('id', sql.NVarChar, user.id)
        .input('username', sql.NVarChar, user.username)
        .input('password', sql.NVarChar, user.password)
        .input('role', sql.NVarChar, user.role)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM users WHERE id = @id)
          INSERT INTO users (id, username, password, role) VALUES (@id, @username, @password, @role)
          ELSE
          PRINT 'Usuario ${user.username} ya existe'
        `);
      
      if (result.rowsAffected[0] > 0) {
        console.log(`✅ Usuario ${user.username} insertado`);
      } else {
        console.log(`ℹ️ Usuario ${user.username} ya existe`);
      }
    } catch (error) {
      console.log(`⚠️ Usuario ${user.username}: ${error.message}`);
    }
  }

  // Insertar categorías asignadas
  const userCategories = [
    { user_id: 'user_abc_456', team_name: 'Los Halcones', category_id: 'cat_1_1' },
    { user_id: 'user_abc_456', team_name: 'Los Halcones', category_id: 'cat_1_2' }
  ];

  console.log('Insertando categorías asignadas...');
  for (const uc of userCategories) {
    try {
      const result = await pool.request()
        .input('user_id', sql.NVarChar, uc.user_id)
        .input('team_name', sql.NVarChar, uc.team_name)
        .input('category_id', sql.NVarChar, uc.category_id)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM user_categories WHERE user_id = @user_id AND category_id = @category_id)
          INSERT INTO user_categories (user_id, team_name, category_id) VALUES (@user_id, @team_name, @category_id)
          ELSE
          PRINT 'Categoría asignada ya existe'
        `);
      
      if (result.rowsAffected[0] > 0) {
        console.log(`✅ Categoría asignada: ${uc.team_name} - ${uc.category_id}`);
      } else {
        console.log(`ℹ️ Categoría asignada ya existe: ${uc.team_name} - ${uc.category_id}`);
      }
    } catch (error) {
      console.log(`⚠️ Categoría asignada: ${error.message}`);
    }
  }

  // Insertar jugadores de ejemplo
  const players = [
    {
      id: 'player_xyz_123',
      category_id: 'cat_1_1',
      first_name: 'Leo',
      last_name: 'Messi',
      birth_date: '24/06/1987',
      photo_url: 'https://example.com/photo.jpg',
      status: 'APPROVED'
    },
    {
      id: 'player_abc_456',
      category_id: 'cat_1_1',
      first_name: 'Cristiano',
      last_name: 'Ronaldo',
      birth_date: '05/02/1985',
      photo_url: null,
      status: 'PENDING'
    },
    {
      id: 'player_def_789',
      category_id: 'cat_1_2',
      first_name: 'Neymar',
      last_name: 'Jr',
      birth_date: '05/02/1992',
      photo_url: null,
      status: 'APPROVED'
    }
  ];

  console.log('Insertando jugadores...');
  for (const player of players) {
    try {
      const result = await pool.request()
        .input('id', sql.NVarChar, player.id)
        .input('category_id', sql.NVarChar, player.category_id)
        .input('first_name', sql.NVarChar, player.first_name)
        .input('last_name', sql.NVarChar, player.last_name)
        .input('birth_date', sql.NVarChar, player.birth_date)
        .input('photo_url', sql.NVarChar, player.photo_url)
        .input('status', sql.NVarChar, player.status)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM players WHERE id = @id)
          INSERT INTO players (id, category_id, first_name, last_name, birth_date, photo_url, status) 
          VALUES (@id, @category_id, @first_name, @last_name, @birth_date, @photo_url, @status)
          ELSE
          PRINT 'Jugador ${player.first_name} ${player.last_name} ya existe'
        `);
      
      if (result.rowsAffected[0] > 0) {
        console.log(`✅ Jugador ${player.first_name} ${player.last_name} insertado`);
      } else {
        console.log(`ℹ️ Jugador ${player.first_name} ${player.last_name} ya existe`);
      }
    } catch (error) {
      console.log(`⚠️ Jugador ${player.first_name}: ${error.message}`);
    }
  }

  console.log('✅ Datos iniciales insertados correctamente');
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  initializeDatabase().then(() => {
    console.log('🎉 Proceso de inicialización completado');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Error en el proceso de inicialización:', error.message);
    process.exit(1);
  });
}

module.exports = { initializeDatabase };