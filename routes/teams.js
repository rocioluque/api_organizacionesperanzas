const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// GET /teams - Todos los equipos con sus categorías Y conteo de jugadores
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    
    const teamsResult = await pool.request()
      .query(`
        SELECT 
          t.id, 
          t.name,
          -- Contar jugadores por equipo
          (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) as playerCount,
          c.id as categoryId, 
          c.name as categoryName
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
          playerCount: row.playerCount, 
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
    
    console.log(`✅ Enviando ${teams.length} equipos con conteo de jugadores`);
    
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

    console.log(`🔄 SOLICITUD DE ACTUALIZACIÓN DE EQUIPO:`);
    console.log(`   - ID del equipo: ${id}`);
    console.log(`   - Nuevo nombre: ${name}`);
    console.log(`   - Categorías a asignar:`, categoryIds);

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Verificar que el equipo existe
      const teamExists = await transaction.request()
        .input('id', sql.NVarChar, id)
        .query('SELECT id, name FROM teams WHERE id = @id');

      if (teamExists.recordset.length === 0) {
        await transaction.rollback();
        console.log(`❌ Equipo ${id} no encontrado`);
        return res.status(404).json({ error: 'Team not found' });
      }

      console.log(`✅ Equipo encontrado: ${teamExists.recordset[0].name}`);

      // 2. Actualizar nombre del equipo
      await transaction.request()
        .input('id', sql.NVarChar, id)
        .input('name', sql.NVarChar, name)
        .query('UPDATE teams SET name = @name WHERE id = @id');

      console.log(`✅ Nombre actualizado: ${teamExists.recordset[0].name} -> ${name}`);

      // 3. ELIMINAR RELACIONES EXISTENTES - Esto es crucial
      const deleteResult = await transaction.request()
        .input('team_id', sql.NVarChar, id)
        .query('DELETE FROM team_categories WHERE team_id = @team_id');

      console.log(`🗑️ Eliminadas ${deleteResult.rowsAffected[0]} relaciones anteriores`);

      // 4. INSERTAR NUEVAS RELACIONES
      const categories = [];
      let relationsCreated = 0;

      for (const categoryId of categoryIds) {
        console.log(`   ➡️ Procesando categoría: ${categoryId}`);
        
        // Verificar que la categoría existe
        const catExists = await transaction.request()
          .input('category_id', sql.NVarChar, categoryId)
          .query('SELECT id, name FROM categories WHERE id = @category_id');

        if (catExists.recordset.length === 0) {
          console.warn(`   ⚠️ Categoría ${categoryId} no existe, saltando...`);
          continue;
        }

        console.log(`   ✅ Categoría válida: ${catExists.recordset[0].name}`);

        // Insertar relación en team_categories
        try {
          await transaction.request()
            .input('team_id', sql.NVarChar, id)
            .input('category_id', sql.NVarChar, categoryId)
            .query(`
              INSERT INTO team_categories (team_id, category_id) 
              VALUES (@team_id, @category_id)
            `);

          console.log(`   ✅ Relación creada: ${name} -> ${catExists.recordset[0].name}`);
          relationsCreated++;
          
          // Agregar a la respuesta
          categories.push({
            id: catExists.recordset[0].id,
            name: catExists.recordset[0].name
          });

        } catch (relationError) {
          if (relationError.number === 2627) { // Violación de unique constraint
            console.log(`   ℹ️ Relación ya existe, continuando...`);
            categories.push({
              id: catExists.recordset[0].id,
              name: catExists.recordset[0].name
            });
          } else {
            throw relationError;
          }
        }
      }

      await transaction.commit();
      
      console.log(`🎉 ACTUALIZACIÓN EXITOSA:`);
      console.log(`   - Equipo: ${name}`);
      console.log(`   - Relaciones creadas: ${relationsCreated}`);
      console.log(`   - Categorías asignadas: ${categories.length}`);
      console.log(`   - Detalles:`, categories.map(c => c.name));
      
      res.json({
        id,
        name,
        categories
      });
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ ERROR EN TRANSACCIÓN:', error.message);
      console.error('Detalles del error:', error);
      throw error;
    }
    
  } catch (error) {
    if (error.number === 2627) {
      console.error('❌ Nombre de equipo duplicado');
      return res.status(409).json({ error: 'Team name already exists' });
    }
    console.error('❌ ERROR GENERAL:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
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

    console.log(`🔍 GET /teams/by-category/${categoryId} solicitado`);

    const pool = await getPool();
    
    // 1. Verificar que la categoría existe
    const categoryResult = await pool.request()
      .input('categoryId', sql.NVarChar, categoryId)
      .query('SELECT id, name FROM categories WHERE id = @categoryId');

    if (categoryResult.recordset.length === 0) {
      console.log(`❌ Categoría ${categoryId} no encontrada`);
      return res.status(404).json({ 
        error: 'Categoría no encontrada',
        message: `La categoría con ID ${categoryId} no existe` 
      });
    }

    console.log(`✅ Categoría encontrada: ${categoryResult.recordset[0].name}`);

    // 2. Consultar equipos para esta categoría
    const teamsResult = await pool.request()
      .input('categoryId', sql.NVarChar, categoryId)
      .query(`
        SELECT DISTINCT 
          t.id, 
          t.name
        FROM teams t
        INNER JOIN team_categories tc ON t.id = tc.team_id
        WHERE tc.category_id = @categoryId
        ORDER BY t.name
      `);

    console.log(`📊 Consulta ejecutada, encontrados ${teamsResult.recordset.length} equipos`);

    // 3. Log detallado de lo que encontró
    if (teamsResult.recordset.length === 0) {
      console.log(`❌ No se encontraron equipos para la categoría ${categoryId}`);
      
      // Debug adicional: ver qué relaciones existen
      const allRelations = await pool.request().query(`
        SELECT tc.team_id, t.name as team_name, tc.category_id, c.name as category_name
        FROM team_categories tc
        INNER JOIN teams t ON tc.team_id = t.id
        INNER JOIN categories c ON tc.category_id = c.id
      `);
      console.log(`🔍 Relaciones totales en team_categories: ${allRelations.recordset.length}`);
    } else {
      console.log(`✅ Equipos encontrados:`, teamsResult.recordset);
    }

    // ✅ CORRECTO: Devolver directamente el array de equipos
    const teams = teamsResult.recordset.map(row => ({
      id: row.id,
      name: row.name
    }));

    console.log(`🎯 Enviando ${teams.length} equipos para categoría ${categoryId}`);
    
    res.json(teams);
    
  } catch (error) {
    console.error('❌ Error en GET /teams/by-category:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

module.exports = router;