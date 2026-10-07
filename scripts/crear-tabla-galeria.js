require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS bot_categorias_galeria (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      categoria VARCHAR(120) NOT NULL,
      url_imagen VARCHAR(512) NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_categoria (categoria)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('Tabla bot_categorias_galeria creada');
  await conn.end();
}

run().catch(console.error);
