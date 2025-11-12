const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// GET /teams - Todos los equipos con sus categorías
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    
    const teamsResult = await pool.request()
      .query(`
        SELECT t.id, t.name, c.id as categoryId, c.name as categoryName
        FROM teams t
        LEFT JOIN team_categories tc ON t.id = tc.team_id
        LEFT JOIN categories c ON tc.category_id = c.id
        ORDER BY t.name
      `);

    // Agrupar categorías por equipo
    const teamsMap = new Map();
    
    teamsResult.recordset.forEach(row => {
      if (!teamsMap.has(row.id)) {
        teamsMap.set(row.id, {
          id: row.id,
          name: row.name,
          categories: []
        });
      }
      
      if (row.categoryId) {
        teamsMap.get(row.id).categories.push({
          id: row.categoryId,
          name: row.categoryName
        });
      }
    });

    const teams = Array.from(teamsMap.values());
    res.json(teams);
    
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /teams - Crear nuevo equipo
router.post('/', async (req, res) => {
  try {
    const { name, categoryIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const newTeam = {
      id: `team_${uuidv4()}`,
      name,
      categories: []
    };

    const pool = await getPool();
    
    // Iniciar transacción
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Insertar equipo
      await transaction.request()
        .input('id', sql.NVarChar, newTeam.id)
        .input('name', sql.NVarChar, newTeam.name)
        .query('INSERT INTO teams (id, name) VALUES (@id, @name)');

      // Insertar categorías asignadas
      for (const categoryId of categoryIds) {
        await transaction.request()
          .input('team_id', sql.NVarChar, newTeam.id)
          .input('category_id', sql.NVarChar, categoryId)
          .query('INSERT INTO team_categories (team_id, category_id) VALUES (@team_id, @category_id)');
        
        // Obtener información de la categoría para la respuesta
        const catResult = await transaction.request()
          .input('category_id', sql.NVarChar, categoryId)
          .query('SELECT id, name FROM categories WHERE id = @category_id');
        
        if (catResult.recordset.length > 0) {
          newTeam.categories.push(catResult.recordset[0]);
        }
      }

      await transaction.commit();
      res.status(201).json(newTeam);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    if (error.number === 2627) {
      return res.status(409).json({ error: 'Team name already exists' });
    }
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /teams/{id} - Actualizar equipo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Verificar que el equipo existe
      const teamExists = await transaction.request()
        .input('id', sql.NVarChar, id)
        .query('SELECT id FROM teams WHERE id = @id');

      if (teamExists.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Team not found' });
      }

      // Actualizar nombre del equipo
      await transaction.request()
        .input('id', sql.NVarChar, id)
        .input('name', sql.NVarChar, name)
        .query('UPDATE teams SET name = @name WHERE id = @id');

      // Eliminar categorías existentes
      await transaction.request()
        .input('team_id', sql.NVarChar, id)
        .query('DELETE FROM team_categories WHERE team_id = @team_id');

      // Insertar nuevas categorías
      const categories = [];
      for (const categoryId of categoryIds) {
        await transaction.request()
          .input('team_id', sql.NVarChar, id)
          .input('category_id', sql.NVarChar, categoryId)
          .query('INSERT INTO team_categories (team_id, category_id) VALUES (@team_id, @category_id)');
        
        const catResult = await transaction.request()
          .input('category_id', sql.NVarChar, categoryId)
          .query('SELECT id, name FROM categories WHERE id = @category_id');
        
        if (catResult.recordset.length > 0) {
          categories.push(catResult.recordset[0]);
        }
      }

      await transaction.commit();
      
      res.json({
        id,
        name,
        categories
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    if (error.number === 2627) {
      return res.status(409).json({ error: 'Team name already exists' });
    }
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /teams/{id} - Eliminar equipo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM teams WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.status(204).send();
    
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /teams/by-category/{categoryId} - Equipos por categoría
router.get('/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

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

    // Obtener equipos que tienen esta categoría
    const teamsResult = await pool.request()
      .input('categoryId', sql.NVarChar, categoryId)
      .query(`
        SELECT DISTINCT 
          t.id, t.name
        FROM teams t
        INNER JOIN team_categories tc ON t.id = tc.team_id
        WHERE tc.category_id = @categoryId
        ORDER BY t.name
      `);

    const teams = teamsResult.recordset.map(row => ({
      id: row.id,
      name: row.name
    }));

    res.json({
      category: {
        id: categoryResult.recordset[0].id,
        name: categoryResult.recordset[0].name
      },
      teams: teams
    });
    
  } catch (error) {
    console.error('Error en GET /teams/by-category:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

module.exports = router;