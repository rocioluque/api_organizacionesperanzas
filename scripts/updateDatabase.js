const { getPool, sql } = require('../config/database');

async function updateDatabase() {
  let pool;
  try {
    console.log('🔄 Actualizando base de datos...');
    
    pool = await getPool();

    // 1. Crear tabla de equipos si no existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='teams' AND xtype='U')
      CREATE TABLE teams (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL UNIQUE
      )
    `);
    console.log('✅ Tabla teams creada/verificada');

    // 2. Crear tabla de relación equipos-categorías
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='team_categories' AND xtype='U')
      CREATE TABLE team_categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        team_id NVARCHAR(50) NOT NULL,
        category_id NVARCHAR(50) NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        UNIQUE(team_id, category_id)
      )
    `);
    console.log('✅ Tabla team_categories creada/verificada');

    // 3. Actualizar tabla users para incluir assigned_teams
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'assigned_teams' AND object_id = OBJECT_ID('users'))
      ALTER TABLE users ADD assigned_teams NVARCHAR(MAX)
    `);
    console.log('✅ Columna assigned_teams añadida a users');

    // 4. Migrar datos existentes de user_categories a teams
    const existingTeams = await pool.request().query(`
      SELECT DISTINCT team_name FROM user_categories
    `);

    for (const team of existingTeams.recordset) {
      const teamId = `team_${team.team_name.replace(/\s+/g, '_').toLowerCase()}`;
      
      // Insertar equipo si no existe
      await pool.request()
        .input('id', sql.NVarChar, teamId)
        .input('name', sql.NVarChar, team.team_name)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM teams WHERE id = @id)
          INSERT INTO teams (id, name) VALUES (@id, @name)
        `);

      // Obtener categorías para este equipo
      const teamCategories = await pool.request()
        .input('team_name', sql.NVarChar, team.team_name)
        .query('SELECT DISTINCT category_id FROM user_categories WHERE team_name = @team_name');

      // Insertar relaciones equipo-categoría
      for (const cat of teamCategories.recordset) {
        await pool.request()
          .input('team_id', sql.NVarChar, teamId)
          .input('category_id', sql.NVarChar, cat.category_id)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM team_categories WHERE team_id = @team_id AND category_id = @category_id)
            INSERT INTO team_categories (team_id, category_id) VALUES (@team_id, @category_id)
          `);
      }
    }
    console.log('✅ Datos migrados a teams');

    console.log('🎉 Base de datos actualizada correctamente');
    
  } catch (error) {
    console.error('❌ Error actualizando la base de datos:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

if (require.main === module) {
  updateDatabase().then(() => {
    console.log('Proceso completado');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { updateDatabase };