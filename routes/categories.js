const express = require('express');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// GET /categories/{userId}
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const pool = await getPool();
    
    // Verificar si el usuario existe y es DELEGATE
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT role FROM users WHERE id = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.recordset[0].role !== 'DELEGATE') {
      return res.status(403).json({ error: 'User is not a delegate' });
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

    res.json(assignedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;