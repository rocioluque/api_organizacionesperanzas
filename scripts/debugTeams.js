const { getPool, sql } = require('../config/database');

async function debugTeams() {
  let pool;
  try {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE EQUIPOS Y CATEGORÍAS...\n');
    
    pool = await getPool();

    // 1. Ver todas las categorías
    console.log('📋 1. CATEGORÍAS EXISTENTES:');
    const categories = await pool.request().query('SELECT id, name FROM categories');
    console.table(categories.recordset);

    // 2. Ver todos los equipos
    console.log('\n🏈 2. EQUIPOS EXISTENTES:');
    const teams = await pool.request().query('SELECT id, name FROM teams');
    console.table(teams.recordset);

    // 3. Ver relaciones equipo-categoría
    console.log('\n🔗 3. RELACIONES EQUIPO-CATEGORÍA:');
    const teamCategories = await pool.request().query(`
      SELECT tc.team_id, t.name as team_name, tc.category_id, c.name as category_name
      FROM team_categories tc
      INNER JOIN teams t ON tc.team_id = t.id
      INNER JOIN categories c ON tc.category_id = c.id
    `);
    
    if (teamCategories.recordset.length === 0) {
      console.log('❌ NO HAY RELACIONES ENTRE EQUIPOS Y CATEGORÍAS');
    } else {
      console.table(teamCategories.recordset);
    }

    // 4. Probar consulta específica del endpoint
    console.log('\n🔍 4. PROBANDO CONSULTA DEL ENDPOINT:');
    for (const category of categories.recordset) {
      const result = await pool.request()
        .input('categoryId', sql.NVarChar, category.id)
        .query(`
          SELECT DISTINCT t.id, t.name
          FROM teams t
          INNER JOIN team_categories tc ON t.id = tc.team_id
          WHERE tc.category_id = @categoryId
          ORDER BY t.name
        `);
      
      console.log(`📊 Categoría "${category.name}" (${category.id}): ${result.recordset.length} equipos`);
      if (result.recordset.length > 0) {
        console.table(result.recordset);
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

debugTeams();