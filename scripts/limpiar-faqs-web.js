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

  const [faqs] = await conn.query('SELECT id, pregunta, respuesta FROM bot_faqs WHERE respuesta LIKE ?', ['%megasantiago.com%']);
  console.log('FAQs con megasantiago.com:', faqs.length);

  for (const f of faqs) {
    const nueva = f.respuesta
      .replace(/nuestra tienda online \(megasantiago\.com\)/gi, 'nuestro servicio por este chat')
      .replace(/atrav[eé]s de nuestra tienda online megasantiago\.com/gi, 'a través de nuestro servicio por este chat')
      .replace(/en la tienda online megasantiago\.com/gi, 'directamente con nuestro asistente por este chat')
      .replace(/en megasantiago\.com/gi, 'directamente con nosotros por este chat');

    await conn.query('UPDATE bot_faqs SET respuesta = ? WHERE id = ?', [nueva, f.id]);
    console.log(`FAQ ${f.id} actualizada:`, nueva);
  }

  await conn.end();
}

run().catch(console.error);
