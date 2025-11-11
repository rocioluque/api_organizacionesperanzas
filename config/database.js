const sql = require('mssql');
require('dotenv').config(); // ✅ Carga variables del .env

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.NODE_ENV === 'production',
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

console.log('🔌 Configuración BD:', {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  port: process.env.DB_PORT
});

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