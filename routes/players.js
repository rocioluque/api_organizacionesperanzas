const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// GET /players/by-category/{categoryId}
router.get('/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log(`👥 Solicitando jugadores para categoría: ${categoryId}`);
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.NVarChar, categoryId)
      .query(`
        SELECT 
          p.id, 
          p.category_id as categoryId, 
          p.first_name as firstName, 
          p.last_name as lastName, 
          p.birth_date as birthDate, 
          p.photo_url as photoUrl, 
          p.document_photo_url as documentPhotoUrl, -- ADDED
          p.status, 
          p.team_id as teamId,
          CASE 
            WHEN t.name IS NOT NULL THEN t.name
            ELSE 'Sin equipo'
          END as teamName
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.id
        WHERE p.category_id = @categoryId
        ORDER BY teamName, p.last_name, p.first_name
      `);
    console.log(`Enviando ${result.recordset.length} jugadores para categoría ${categoryId}`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /players/{playerId}
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    console.log(`👤 Solicitando información del jugador: ${playerId}`);
    const pool = await getPool();
    const result = await pool.request()
      .input('playerId', sql.NVarChar, playerId)
      .query(`
        SELECT 
          p.id, 
          p.category_id as categoryId, 
          p.first_name as firstName, 
          p.last_name as lastName, 
          p.birth_date as birthDate, 
          p.photo_url as photoUrl,
          p.document_photo_url as documentPhotoUrl, -- ADDED
          p.status, 
          p.team_id as teamId,
          t.name as teamName,
          c.name as categoryName
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = @playerId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const player = result.recordset[0];
    console.log(`✅ Información del jugador encontrada para: ${player.firstName} ${player.lastName}`);
    res.json(player);
  } catch (error) {
    console.error('Error obteniendo jugador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// POST /players 
router.post('/', async (req, res) => {
  try {
    const { categoryId, firstName, lastName, teamId, birthDate, photoUrl, documentPhotoUrl } = req.body;

    if (!categoryId || !firstName || !lastName) {
      return res.status(400).json({ error: 'categoryId, firstName, and lastName are required' });
    }

    const newPlayer = {
      id: `player_${uuidv4()}`,
      categoryId,
      firstName,
      lastName,
      teamId: teamId || null,
      birthDate: birthDate || null,
      photoUrl: photoUrl || null,
      documentPhotoUrl: documentPhotoUrl || null, // ADDED
      status: 'PENDING'
    };

    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, newPlayer.id)
      .input('category_id', sql.NVarChar, newPlayer.categoryId)
      .input('first_name', sql.NVarChar, newPlayer.firstName)
      .input('last_name', sql.NVarChar, newPlayer.lastName)
      .input('team_id', sql.NVarChar, newPlayer.teamId) 
      .input('birth_date', sql.NVarChar, newPlayer.birthDate)
      .input('photo_url', sql.NVarChar, newPlayer.photoUrl)
      .input('document_photo_url', sql.NVarChar, newPlayer.documentPhotoUrl) // ADDED
      .input('status', sql.NVarChar, newPlayer.status)
      .query(`
        INSERT INTO players (id, category_id, first_name, last_name, team_id, birth_date, photo_url, document_photo_url, status)
        VALUES (@id, @category_id, @first_name, @last_name, @team_id, @birth_date, @photo_url, @document_photo_url, @status)
      `);

    console.log(`✅ Jugador creado: ${newPlayer.firstName} ${newPlayer.lastName}`);
    res.status(201).json(newPlayer);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /players/{playerId} 
router.put('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    console.log(`🔄 Recibida petición para actualizar jugador ${playerId}. Body:`, req.body);

    const pool = await getPool();
    const fieldsToUpdate = [];
    const request = pool.request().input('id', sql.NVarChar, playerId);

    for (const [key, value] of Object.entries(req.body)) {
      if (key !== 'id' && value !== undefined) {
        const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fieldsToUpdate.push(`${dbField} = @${key}`);
        request.input(key, sql.NVarChar, value);
      }
    }
    
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'No fields to update provided' });
    }

    const query = `UPDATE players SET ${fieldsToUpdate.join(', ')} WHERE id = @id`;
    console.log("Executing query:", query);
    
    await request.query(query);

    const result = await pool.request()
      .input('playerId', sql.NVarChar, playerId)
      .query(`
        SELECT id, category_id as categoryId, first_name as firstName, last_name as lastName, 
               birth_date as birthDate, photo_url as photoUrl, document_photo_url as documentPhotoUrl, status, team_id as teamId
        FROM players WHERE id = @playerId
      `);
      
    const updatedPlayer = result.recordset[0];
    console.log(`✅ Jugador actualizado: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`);
    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PUT /players/{playerId}/status 
router.put('/:playerId/status', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { status } = req.body;

    if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const pool = await getPool();
    await pool.request()
      .input('playerId', sql.NVarChar, playerId)
      .input('status', sql.NVarChar, status)
      .query('UPDATE players SET status = @status WHERE id = @playerId');
    
    console.log(`✅ Estado del jugador ${playerId} actualizado a: ${status}`);
    res.status(200).send();
  } catch (error) {
    console.error('Error updating player status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
