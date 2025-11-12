const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// GET /users - Lista todos los usuarios (sin password)
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT id, username, role, assigned_teams as assignedTeams
        FROM users 
        ORDER BY username
      `);

    // Parsear assigned_teams si es un string JSON
    const users = result.recordset.map(user => ({
      ...user,
      assignedTeams: user.assignedTeams ? JSON.parse(user.assignedTeams) : []
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users - Crear nuevo usuario
router.post('/', async (req, res) => {
  try {
    const { username, password, role, assignedTeams = [] } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ 
        error: 'username, password, and role are required' 
      });
    }

    if (!['ORGANIZER', 'DELEGATE'].includes(role)) {
      return res.status(400).json({ 
        error: 'role must be either ORGANIZER or DELEGATE' 
      });
    }

    const newUser = {
      id: `user_${uuidv4()}`,
      username,
      password, // En producción, deberías hashear esta contraseña
      role,
      assignedTeams: assignedTeams || []
    };

    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, newUser.id)
      .input('username', sql.NVarChar, newUser.username)
      .input('password', sql.NVarChar, newUser.password)
      .input('role', sql.NVarChar, newUser.role)
      .input('assigned_teams', sql.NVarChar, JSON.stringify(newUser.assignedTeams))
      .query(`
        INSERT INTO users (id, username, password, role, assigned_teams)
        VALUES (@id, @username, @password, @role, @assigned_teams)
      `);

    // Devolver usuario sin password
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
    
  } catch (error) {
    if (error.number === 2627) { // Violación de unique constraint
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /users/{id} - Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, assignedTeams } = req.body;

    const pool = await getPool();
    
    // Verificar si el usuario existe
    const existingUser = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('SELECT id FROM users WHERE id = @id');

    if (existingUser.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Construir query dinámicamente
    let query = 'UPDATE users SET ';
    const inputs = [];
    
    if (username) {
      query += 'username = @username, ';
      inputs.push({ name: 'username', type: sql.NVarChar, value: username });
    }
    
    if (password) {
      query += 'password = @password, ';
      inputs.push({ name: 'password', type: sql.NVarChar, value: password });
    }
    
    if (role) {
      if (!['ORGANIZER', 'DELEGATE'].includes(role)) {
        return res.status(400).json({ 
          error: 'role must be either ORGANIZER or DELEGATE' 
        });
      }
      query += 'role = @role, ';
      inputs.push({ name: 'role', type: sql.NVarChar, value: role });
    }
    
    if (assignedTeams !== undefined) {
      query += 'assigned_teams = @assigned_teams, ';
      inputs.push({ name: 'assigned_teams', type: sql.NVarChar, value: JSON.stringify(assignedTeams) });
    }

    // Remover la última coma y agregar WHERE
    query = query.slice(0, -2) + ' WHERE id = @id';
    inputs.push({ name: 'id', type: sql.NVarChar, value: id });

    const request = pool.request();
    inputs.forEach(input => {
      request.input(input.name, input.type, input.value);
    });

    await request.query(query);

    // Obtener usuario actualizado
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`
        SELECT id, username, role, assigned_teams as assignedTeams
        FROM users WHERE id = @id
      `);

    const updatedUser = {
      ...result.recordset[0],
      assignedTeams: result.recordset[0].assignedTeams ? JSON.parse(result.recordset[0].assignedTeams) : []
    };

    res.json(updatedUser);
    
  } catch (error) {
    if (error.number === 2627) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /users/{id} - Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM users WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;