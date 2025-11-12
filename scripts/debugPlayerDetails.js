const { getPool, sql } = require('../config/database');

async function debugPlayerDetails() {
  let pool;
  try {
    console.log('🔍 VERIFICANDO DATOS DE JUGADORES ESPECÍFICOS...\n');
    
    pool = await getPool();

    // Obtener algunos jugadores de ejemplo
    const players = await pool.request().query(`
      SELECT TOP 5 
        p.id,
        p.first_name,
        p.last_name,
        p.birth_date,
        p.photo_url,
        p.team_id,
        t.name as team_name,
        p.category_id,
        c.name as category_name,
        p.status
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.first_name, p.last_name
    `);

    console.log('👥 JUGADORES DE EJEMPLO (primeros 5):');
    console.table(players.recordset);

    // Probar el endpoint para cada jugador
    console.log('\n🔍 PROBANDO ENDPOINT PARA CADA JUGADOR:');
    for (const player of players.recordset) {
      console.log(`\n📋 Jugador: ${player.first_name} ${player.last_name} (${player.id})`);
      
      const result = await pool.request()
        .input('playerId', sql.NVarChar, player.id)
        .query(`
          SELECT 
            p.id, 
            p.category_id as categoryId, 
            p.first_name as firstName, 
            p.last_name as lastName, 
            p.birth_date as birthDate, 
            p.photo_url as photoUrl, 
            p.status, 
            p.team_id as teamId,
            t.name as teamName,
            c.name as categoryName
          FROM players p
          LEFT JOIN teams t ON p.team_id = t.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = @playerId
        `);

      if (result.recordset.length > 0) {
        const playerData = result.recordset[0];
        console.log('   ✅ Datos completos encontrados:');
        console.log(`      - Nombre: ${playerData.firstName} ${playerData.lastName}`);
        console.log(`      - Fecha nacimiento: ${playerData.birthDate || 'NULL'}`);
        console.log(`      - Foto: ${playerData.photoUrl || 'NULL'}`);
        console.log(`      - Equipo: ${playerData.teamName || 'NULL'} (${playerData.teamId || 'NULL'})`);
        console.log(`      - Categoría: ${playerData.categoryName} (${playerData.categoryId})`);
        console.log(`      - Estado: ${playerData.status}`);
      } else {
        console.log('   ❌ Jugador no encontrado');
      }
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

if (require.main === module) {
  debugPlayerDetails().then(() => {
    console.log('Proceso completado');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { debugPlayerDetails };