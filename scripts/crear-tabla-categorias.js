require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  // Crear tabla de imagenes por categoria
  await conn.query(`
    CREATE TABLE IF NOT EXISTS bot_categorias_img (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      categoria VARCHAR(120) NOT NULL UNIQUE,
      url_imagen VARCHAR(512) DEFAULT NULL,
      descripcion VARCHAR(300) DEFAULT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('Tabla bot_categorias_img creada');

  // Insertar todas las categorias existentes del inventario
  const [cats] = await conn.query('SELECT DISTINCT categoria FROM bot_productos ORDER BY categoria ASC');
  for (const row of cats) {
    await conn.query(
      'INSERT IGNORE INTO bot_categorias_img (categoria) VALUES (?)',
      [row.categoria]
    );
  }
  console.log('Categorias insertadas:', cats.length);

  const [rows] = await conn.query('SELECT categoria FROM bot_categorias_img ORDER BY categoria');
  console.log('Categorias registradas:');
  rows.forEach((r, i) => console.log(` ${i+1}. ${r.categoria}`));

  await conn.end();
}

run().catch(console.error);
