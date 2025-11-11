const sql = require('mssql');
require('dotenv').config(); // ✅ Carga variables del .env

const dbConfig = {
  server: '149.50.135.236',
  database: 'Delishare',
  user: 'rocio',
  password: 'Arb0l.C4l0r.2025!',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

let poolPromise;

const getPool = () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then(pool => {
        console.log('✅ Conectado a SQL Server');
        return pool;
      })
      .catch(err => {
        console.error('❌ Error de conexión:', err.message);
        throw err;
      });
  }
  return poolPromise;
};

module.exports = {
  sql,
  getPool,
  dbConfig
};