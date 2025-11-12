const { getPool, sql } = require('../config/database');

async function fixPlayersTeams() {
  let pool;
  try {
    console.log('🔧 ASIGNANDO EQUIPOS A JUGADORES...\n');
    
    pool = await getPool();

    // 1. Primero, obtener las relaciones de user_categories para saber qué equipo corresponde a cada categoría
    console.log('📋 Obteniendo relaciones equipo-categoría...');
    const teamCategories = await pool.request().query(`
      SELECT DISTINCT 
        tc.team_id,
        t.name as team_name,
        tc.category_id,
        c.name as category_name
      FROM team_categories tc
      INNER JOIN teams t ON tc.team_id = t.id
      INNER JOIN categories c ON tc.category_id = c.id
    `);

    console.log(`📊 Encontradas ${teamCategories.recordset.length} relaciones equipo-categoría`);
    console.table(teamCategories.recordset);

    let updatedPlayers = 0;

    // 2. Para cada relación equipo-categoría, asignar ese equipo a los jugadores de esa categoría
    for (const relation of teamCategories.recordset) {
      const { team_id, team_name, category_id, category_name } = relation;
      
      console.log(`\n🔄 Procesando: ${team_name} -> ${category_name}`);

      // Actualizar jugadores de esta categoría con el team_id correspondiente
      const updateResult = await pool.request()
        .input('team_id', sql.NVarChar, team_id)
        .input('category_id', sql.NVarChar, category_id)
        .query(`
          UPDATE players 
          SET team_id = @team_id 
          WHERE category_id = @category_id 
          AND (team_id IS NULL OR team_id = '')
        `);

      console.log(`✅ Jugadores actualizados en ${category_name}: ${updateResult.rowsAffected[0]}`);
      updatedPlayers += updateResult.rowsAffected[0];
    }

    console.log(`\n🎉 ASIGNACIÓN COMPLETADA: ${updatedPlayers} jugadores actualizados con equipo`);

    // 3. Mostrar resultado final
    console.log('\n📊 SITUACIÓN FINAL:');
    const finalCount = await pool.request().query(`
      SELECT 
        COUNT(*) as total_players,
        COUNT(CASE WHEN team_id IS NOT NULL AND team_id != '' THEN 1 END) as players_with_team,
        COUNT(CASE WHEN team_id IS NULL OR team_id = '' THEN 1 END) as players_without_team
      FROM players
    `);
    
    console.table(finalCount.recordset);

  } catch (error) {
    console.error('❌ Error asignando equipos:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

if (require.main === module) {
  fixPlayersTeams().then(() => {
    console.log('Proceso completado');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { fixPlayersTeams };