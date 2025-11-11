const express = require('express');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// ✅ GET /teams/by-category/{categoryId} - Equipos por categoría
router.get('/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    console.log(`🏈 Solicitando equipos para categoría: ${categoryId}`);

    const pool = await getPool();
    
    // Verificar que la categoría existe
    const categoryResult = await pool.request()
      .input('categoryId', sql.NVarChar, categoryId)
      .query('SELECT id, name FROM categories WHERE id = @categoryId');

    if (categoryResult.recordset.length === 0) {
      return res.status(404).json({ 
        error: 'Categoría no encontrada',
        message: `La categoría con ID ${categoryId} no existe` 
      });
    }

    // Obtener equipos únicos que tienen jugadores en esta categoría
    const teamsResult = await pool.request()
      .input('categoryId', sql.NVarChar, categoryId)
      .query(`
        SELECT DISTINCT 
          p.team_id as teamId,
          COUNT(p.id) as playerCount
        FROM players p
        WHERE p.category_id = @categoryId AND p.team_id IS NOT NULL
        GROUP BY p.team_id
        ORDER BY p.team_id
      `);

    const teams = teamsResult.recordset.map(row => ({
      teamId: row.teamId,
      playerCount: row.playerCount
    }));

    console.log(`✅ Encontrados ${teams.length} equipos para categoría ${categoryId}`);
    
    res.json({
      category: {
        id: categoryResult.recordset[0].id,
        name: categoryResult.recordset[0].name
      },
      teams: teams
    });
    
  } catch (error) {
    console.error('❌ Error en GET /teams/by-category:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

module.exports = router;