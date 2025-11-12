const express = require('express');
const upload = require('../config/upload');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Asegurarse de que la carpeta uploads existe
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// POST /upload - Subir archivo
router.post('/', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No se proporcionó ningún archivo',
        message: 'Debe enviar un archivo con el campo "photo"'
      });
    }

    console.log('📁 Archivo recibido:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Construir la URL pública del archivo
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    console.log('✅ Archivo guardado correctamente:', fileUrl);

    res.json({
      success: true,
      message: 'Archivo subido correctamente',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    });

  } catch (error) {
    console.error('❌ Error subiendo archivo:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /uploads/:filename - Servir archivos estáticos
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'Archivo no encontrado',
      message: `El archivo ${filename} no existe`
    });
  }

  res.sendFile(filePath);
});

// DELETE /upload/:filename - Eliminar archivo
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Archivo no encontrado',
        message: `El archivo ${filename} no existe`
      });
    }

    fs.unlinkSync(filePath);
    console.log('🗑️ Archivo eliminado:', filename);

    res.json({
      success: true,
      message: 'Archivo eliminado correctamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando archivo:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;