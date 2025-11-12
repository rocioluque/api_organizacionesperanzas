// scripts/fixTeamRelations.js
const { getPool, sql } = require('../config/database');

async function fixTeamRelations() {
  let pool;
  try {
    console.log('🔧 REPARANDO RELACIONES EQUIPO-CATEGORÍA...\n');
    
    pool = await getPool();

    // 1. Obtener todas las relaciones de user_categories (datos antiguos)
    console.log('📋 Obteniendo relaciones de user_categories...');
    const userCategories = await pool.request().query(`
      SELECT DISTINCT team_name, category_id 
      FROM user_categories 
      WHERE team_name IS NOT NULL AND category_id IS NOT NULL
    `);

    console.log(`📊 Encontradas ${userCategories.recordset.length} relaciones en user_categories`);

    let fixedCount = 0;

    for (const relation of userCategories.recordset) {
      const { team_name, category_id } = relation;
      
      // Buscar o crear equipo
      let teamId = `team_${team_name.replace(/\s+/g, '_').toLowerCase()}`;
      
      // Verificar si el equipo existe
      const teamExists = await pool.request()
        .input('teamId', sql.NVarChar, teamId)
        .query('SELECT id FROM teams WHERE id = @teamId');

      if (teamExists.recordset.length === 0) {
        // Crear equipo si no existe
        await pool.request()
          .input('id', sql.NVarChar, teamId)
          .input('name', sql.NVarChar, team_name)
          .query('INSERT INTO teams (id, name) VALUES (@id, @name)');
        console.log(`✅ Creado equipo: ${team_name} (${teamId})`);
      }

      // Verificar si la relación ya existe
      const relationExists = await pool.request()
        .input('team_id', sql.NVarChar, teamId)
        .input('category_id', sql.NVarChar, category_id)
        .query('SELECT id FROM team_categories WHERE team_id = @team_id AND category_id = @category_id');

      if (relationExists.recordset.length === 0) {
        // Crear relación si no existe
        await pool.request()
          .input('team_id', sql.NVarChar, teamId)
          .input('category_id', sql.NVarChar, category_id)
          .query('INSERT INTO team_categories (team_id, category_id) VALUES (@team_id, @category_id)');
        
        console.log(`✅ Creada relación: ${team_name} -> ${category_id}`);
        fixedCount++;
      }
    }

    console.log(`\n🎉 REPARACIÓN COMPLETADA: ${fixedCount} relaciones creadas/verificadas`);

  } catch (error) {
    console.error('❌ Error reparando relaciones:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Esto permite ejecutar el script directamente con: node scripts/fixTeamRelations.js
if (require.main === module) {
  fixTeamRelations().then(() => {
    console.log('Proceso completado');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { fixTeamRelations };