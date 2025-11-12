const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// GET /categories - Todas las categorías
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT id, name FROM categories ORDER BY name');

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /categories - Crear nueva categoría
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const newCategory = {
      id: `cat_${uuidv4()}`,
      name
    };

    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, newCategory.id)
      .input('name', sql.NVarChar, newCategory.name)
      .query('INSERT INTO categories (id, name) VALUES (@id, @name)');

    res.status(201).json(newCategory);
    
  } catch (error) {
    if (error.number === 2627) {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /categories/{id} - Actualizar categoría
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .query('UPDATE categories SET name = @name WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ id, name });
    
  } catch (error) {
    if (error.number === 2627) {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /categories/{id} - Eliminar categoría
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM categories WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(204).send();
    
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /categories/{userId} - Categorías del usuario (existente)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const pool = await getPool();
    
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT role FROM users WHERE id = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.recordset[0].role !== 'DELEGATE') {
      return res.status(403).json({ error: 'User is not a delegate' });
    }

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
    console.error('Error fetching user categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;