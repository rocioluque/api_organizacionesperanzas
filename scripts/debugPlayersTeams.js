const { getPool, sql } = require('../config/database');

async function debugPlayersTeams() {
  let pool;
  try {
    console.log('🔍 DIAGNÓSTICO DE JUGADORES Y EQUIPOS...\n');
    
    pool = await getPool();

    // 1. Ver jugadores y sus team_id
    console.log('👥 1. JUGADORES Y SUS EQUIPOS:');
    const players = await pool.request().query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name, 
        p.team_id,
        p.category_id,
        c.name as category_name,
        t.name as team_name
      FROM players p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN teams t ON p.team_id = t.id
      ORDER BY p.category_id, p.team_id
    `);
    
    console.table(players.recordset);

    // 2. Contar jugadores por equipo
    console.log('\n📊 2. JUGADORES POR EQUIPO:');
    const playersByTeam = await pool.request().query(`
      SELECT 
        p.team_id,
        t.name as team_name,
        COUNT(p.id) as player_count
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      GROUP BY p.team_id, t.name
      ORDER BY player_count DESC
    `);
    
    console.table(playersByTeam.recordset);

    // 3. Jugadores sin equipo
    console.log('\n❌ 3. JUGADORES SIN EQUIPO:');
    const playersWithoutTeam = await pool.request().query(`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.category_id,
        c.name as category_name
      FROM players p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.team_id IS NULL OR p.team_id = ''
    `);
    
    console.table(playersWithoutTeam.recordset);
    console.log(`📝 Total de jugadores sin equipo: ${playersWithoutTeam.recordset.length}`);

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

if (require.main === module) {
  debugPlayersTeams().then(() => {
    console.log('Proceso completado');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { debugPlayersTeams };