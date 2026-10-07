require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const RESTANTES = {
  "MARCADORES": "https://images.unsplash.com/photo-1585336261026-7756f7ef59b8?w=800&auto=format&fit=crop&q=80",
  "RESALTADORES": "https://images.unsplash.com/photo-1585336261026-7756f7ef59b8?w=800&auto=format&fit=crop&q=80",
  "ESTILOGRAFOS": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80",
  "MINAS": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80",
  "FORROS": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=80",
  "PLASTILINA / MASA MOLDEABLE": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80"
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

  for (const [cat, url] of Object.entries(RESTANTES)) {
    const slug = slugify(cat);
    const fileName = `categorias/${slug}.webp`;

    console.log(`Subiendo restante: ${cat}`);
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

    const [exGaleria] = await conn.query(
      `SELECT id FROM bot_categorias_galeria WHERE categoria = ? AND url_imagen = ? LIMIT 1`,
      [cat, cdnUrl]
    );
    if (exGaleria.length === 0) {
      await conn.query(
        `INSERT INTO bot_categorias_galeria (categoria, url_imagen) VALUES (?, ?)`,
        [cat, cdnUrl]
      );
    }

    console.log(`  -> ✅ Listo: ${cat} => ${cdnUrl}`);
  }

  const [res] = await conn.query(`SELECT COUNT(*) as con_img FROM bot_categorias_img WHERE url_imagen IS NOT NULL`);
  const [total] = await conn.query(`SELECT COUNT(*) as total FROM bot_categorias_img`);
  console.log(`\nEstado final: ${res[0].con_img} de ${total[0].total} categorías con imagen activa.`);

  await conn.end();
}

completar().catch(console.error);
