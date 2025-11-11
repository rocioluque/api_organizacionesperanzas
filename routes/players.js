const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// GET /players/{categoryId}
router.get('/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.NVarChar, categoryId)
      .query(`
        SELECT id, category_id as categoryId, first_name as firstName, last_name as lastName, 
               birth_date as birthDate, photo_url as photoUrl, status
        FROM players 
        WHERE category_id = @categoryId
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /player/{playerId}
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const pool = await getPool();
    const result = await pool.request()
      .input('playerId', sql.NVarChar, playerId)
      .query(`
        SELECT id, category_id as categoryId, first_name as firstName, last_name as lastName, 
               birth_date as birthDate, photo_url as photoUrl, status
        FROM players 
        WHERE id = @playerId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /players
router.post('/', async (req, res) => {
  try {
    const { categoryId, firstName, lastName, birthDate, photoUrl } = req.body;

    if (!categoryId || !firstName || !lastName) {
      return res.status(400).json({ error: 'categoryId, firstName, and lastName are required' });
    }

    const newPlayer = {
      id: `player_${uuidv4()}`,
      categoryId,
      firstName,
      lastName,
      birthDate: birthDate || null,
      photoUrl: photoUrl || null,
      status: 'PENDING'
    };

    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, newPlayer.id)
      .input('category_id', sql.NVarChar, newPlayer.categoryId)
      .input('first_name', sql.NVarChar, newPlayer.firstName)
      .input('last_name', sql.NVarChar, newPlayer.lastName)
      .input('birth_date', sql.NVarChar, newPlayer.birthDate)
      .input('photo_url', sql.NVarChar, newPlayer.photoUrl)
      .input('status', sql.NVarChar, newPlayer.status)
      .query(`
        INSERT INTO players (id, category_id, first_name, last_name, birth_date, photo_url, status)
        VALUES (@id, @category_id, @first_name, @last_name, @birth_date, @photo_url, @status)
      `);

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
    const { categoryId, firstName, lastName, birthDate, photoUrl, status } = req.body;

    const pool = await getPool();
    
    // Verificar si el jugador existe
    const existingPlayer = await pool.request()
      .input('playerId', sql.NVarChar, playerId)
      .query('SELECT id FROM players WHERE id = @playerId');

    if (existingPlayer.recordset.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Actualizar jugador
    await pool.request()
      .input('id', sql.NVarChar, playerId)
      .input('category_id', sql.NVarChar, categoryId)
      .input('first_name', sql.NVarChar, firstName)
      .input('last_name', sql.NVarChar, lastName)
      .input('birth_date', sql.NVarChar, birthDate)
      .input('photo_url', sql.NVarChar, photoUrl)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE players 
        SET category_id = @category_id, first_name = @first_name, last_name = @last_name,
            birth_date = @birth_date, photo_url = @photo_url, status = @status
        WHERE id = @id
      `);

    // Obtener el jugador actualizado
    const result = await pool.request()
      .input('playerId', sql.NVarChar, playerId)
      .query(`
        SELECT id, category_id as categoryId, first_name as firstName, last_name as lastName, 
               birth_date as birthDate, photo_url as photoUrl, status
        FROM players 
        WHERE id = @playerId
      `);

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /players/{playerId}/status
router.put('/:playerId/status', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { status } = req.body;

    if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required: PENDING, APPROVED, or REJECTED' });
    }

    const pool = await getPool();
    
    const result = await pool.request()
      .input('playerId', sql.NVarChar, playerId)
      .input('status', sql.NVarChar, status)
      .query('UPDATE players SET status = @status WHERE id = @playerId');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error updating player status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;