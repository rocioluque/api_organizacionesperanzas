const { getPool, sql } = require('../config/database');

async function fixTeamIds() {
  let pool;
  try {
    console.log('🔧 NORMALIZANDO TEAM_ID DE JUGADORES...\n');
    
    pool = await getPool();

    // 1. Identificar jugadores con team_id incorrecto
    console.log('📋 JUGADORES CON TEAM_ID INCORRECTO:');
    const playersWithWrongTeamId = await pool.request().query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.team_id,
        p.category_id
      FROM players p
      WHERE p.team_id NOT IN (SELECT id FROM teams)
      AND p.team_id IS NOT NULL
      AND p.team_id != ''
    `);

    console.table(playersWithWrongTeamId.recordset);
    console.log(`📊 Total de jugadores con team_id incorrecto: ${playersWithWrongTeamId.recordset.length}`);

    // 2. Para cada jugador con team_id incorrecto, buscar el team_id correcto
    let fixedCount = 0;
    
    for (const player of playersWithWrongTeamId.recordset) {
      const wrongTeamId = player.team_id;
      
      console.log(`\n🔄 Procesando jugador: ${player.first_name} ${player.last_name}`);
      console.log(`   - Team_id actual: ${wrongTeamId}`);
      console.log(`   - Categoría: ${player.category_id}`);

      // Buscar el team_id correcto basado en la categoría y el nombre del equipo
      const correctTeam = await pool.request()
        .input('category_id', sql.NVarChar, player.category_id)
        .query(`
          SELECT DISTINCT 
            tc.team_id,
            t.name as team_name
          FROM team_categories tc
          INNER JOIN teams t ON tc.team_id = t.id
          WHERE tc.category_id = @category_id
          AND t.name LIKE '%Halcones%'
        `);

      if (correctTeam.recordset.length > 0) {
        const correctTeamId = correctTeam.recordset[0].team_id;
        const correctTeamName = correctTeam.recordset[0].team_name;
        
        console.log(`   ✅ Team_id correcto encontrado: ${correctTeamId} (${correctTeamName})`);

        // Actualizar el jugador con el team_id correcto
        await pool.request()
          .input('player_id', sql.NVarChar, player.id)
          .input('correct_team_id', sql.NVarChar, correctTeamId)
          .query('UPDATE players SET team_id = @correct_team_id WHERE id = @player_id');

        console.log(`   ✅ Jugador actualizado con team_id: ${correctTeamId}`);
        fixedCount++;
      } else {
        console.log(`   ❌ No se encontró team_id correcto para categoría ${player.category_id}`);
      }
    }

    console.log(`\n🎉 NORMALIZACIÓN COMPLETADA: ${fixedCount} jugadores actualizados`);

    // 3. Verificar resultado final
    console.log('\n📊 VERIFICACIÓN FINAL:');
    const finalCheck = await pool.request().query(`
      SELECT 
        COUNT(*) as total_players,
        COUNT(CASE WHEN team_id IN (SELECT id FROM teams) THEN 1 END) as players_with_valid_team,
        COUNT(CASE WHEN team_id NOT IN (SELECT id FROM teams) AND team_id IS NOT NULL THEN 1 END) as players_with_invalid_team,
        COUNT(CASE WHEN team_id IS NULL OR team_id = '' THEN 1 END) as players_without_team
      FROM players
    `);
    
    console.table(finalCheck.recordset);

  } catch (error) {
    console.error('❌ Error normalizando team_id:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

if (require.main === module) {
  fixTeamIds().then(() => {
    console.log('Proceso completado');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { fixTeamIds };
