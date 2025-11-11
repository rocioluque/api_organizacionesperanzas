const express = require('express');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// ✅ ENDPOINT: GET /categories - Todas las categorías
router.get('/', async (req, res) => {
  try {
    console.log('📋 Solicitando todas las categorías...');
    
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT id, name FROM categories ORDER BY name');

    // Formatear respuesta
    const categories = result.recordset.map(cat => ({
      id: cat.id,
      name: cat.name
    }));

    console.log(`✅ Enviando ${categories.length} categorías`);
    
    res.json(categories);
    
  } catch (error) {
    console.error('❌ Error en GET /categories:', error.message);
    
    // Manejar diferentes tipos de errores
    if (error.code === 'ETIMEOUT') {
      return res.status(503).json({ 
        error: 'Database timeout',
        message: 'El servidor de base de datos no responde'
      });
    }
    
    if (error.code === 'ELOGIN') {
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: 'Error de autenticación con la base de datos'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'No se pudieron obtener las categorías'
    });
  }
});

// ✅ ENDPOINT EXISTENTE: GET /categories/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`👤 Solicitando categorías para usuario: ${userId}`);

    const pool = await getPool();
    
    // Verificar usuario
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT id, role FROM users WHERE id = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (userResult.recordset[0].role !== 'DELEGATE') {
      return res.status(403).json({ error: 'El usuario no es un delegado' });
    }

    // Obtener categorías asignadas
    const categoriesResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT uc.team_name as teamName, c.id, c.name
        FROM user_categories uc
        INNER JOIN categories c ON uc.category_id = c.id
        WHERE uc.user_id = @userId
      `);

    const assignedCategories = categoriesResult.recordset.map(row => ({
      teamName: row.teamName,
      category: {
        id: row.id,
        name: row.name
      }
    }));

    console.log(`✅ Enviando ${assignedCategories.length} categorías para usuario ${userId}`);
    
    res.json(assignedCategories);
    
  } catch (error) {
    console.error('❌ Error en GET /categories/:userId:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

module.exports = router;