require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const FINALES = {
  "MARCADORES": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80",
  "RESALTADORES": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80"
};

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

async function completar() {
  const { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_HOST, BUNNY_PULLZONE_URL } = process.env;

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  for (const [cat, url] of Object.entries(FINALES)) {
    const slug = slugify(cat);
    const fileName = `categorias/${slug}.webp`;

    console.log(`Subiendo: ${cat}`);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`Error al descargar ${cat}: HTTP ${resp.status}`);
      continue;
    }

    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const putRes = await fetch(
      `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${fileName}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_STORAGE_API_KEY,
          "Content-Type": "image/webp",
        },
        body: buffer,
      }
    );

    if (!putRes.ok) {
      console.error(`Error Bunny ${cat}:`, await putRes.text());
      continue;
    }

    const cdnUrl = `${BUNNY_PULLZONE_URL}/${fileName}`;

    await conn.query(
      `UPDATE bot_categorias_img SET url_imagen = ? WHERE categoria = ?`,
      [cdnUrl, cat]
    );

    await conn.query(
      `INSERT INTO bot_categorias_galeria (categoria, url_imagen) VALUES (?, ?)`,
      [cat, cdnUrl]
    );

    console.log(`  -> ✅ Listo: ${cat} => ${cdnUrl}`);
  }

  const [res] = await conn.query(`SELECT COUNT(*) as con_img FROM bot_categorias_img WHERE url_imagen IS NOT NULL`);
  const [total] = await conn.query(`SELECT COUNT(*) as total FROM bot_categorias_img`);
  console.log(`\n🎉 COMPLETADO: ${res[0].con_img} de ${total[0].total} categorías con imagen activa.`);

  await conn.end();
}

completar().catch(console.error);
