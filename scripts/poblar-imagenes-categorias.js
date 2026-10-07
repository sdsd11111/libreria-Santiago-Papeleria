require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

// Mapeo curado de fotos profesionales de alta resolución en Unsplash para papelería y útiles escolares
const FOTOS_CATEGORIAS = {
  "ACUARELAS": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80",
  "AGENDAS Y LIBRETAS": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
  "BOLIGRAFOS": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80",
  "BORRADORES": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80",
  "COMPAS": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
  "CORRECTORES": "https://images.unsplash.com/photo-1568205612837-017257d2310a?w=800&auto=format&fit=crop&q=80",
  "CRAYONES": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80",
  "CUADERNOS": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=80",
  "CUENTOS": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80",
  "DIARIOS": "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&auto=format&fit=crop&q=80",
  "DICCIONARIOS": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
  "ESCARCHA": "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&auto=format&fit=crop&q=80",
  "ESTILETES": "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80",
  "ESTILOGRAFOS": "https://images.unsplash.com/photo-1585336261026-7756f7ef59b8?w=800&auto=format&fit=crop&q=80",
  "FORROS": "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80",
  "GOMAS": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80",
  "GRADUADORES": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80",
  "LANA": "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&auto=format&fit=crop&q=80",
  "LAPICES": "https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=800&auto=format&fit=crop&q=80",
  "LIBROS": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&auto=format&fit=crop&q=80",
  "LIBROS INSTITUCIONES": "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&auto=format&fit=crop&q=80",
  "MARCADORES": "https://images.unsplash.com/photo-1580569214296-5cf2bbe69c5f?w=800&auto=format&fit=crop&q=80",
  "MEMBRETES": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80",
  "MINAS": "https://images.unsplash.com/photo-1585336261026-7756f7ef59b8?w=800&auto=format&fit=crop&q=80",
  "PALETAS": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
  "PINTURAS DE MADERA": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80",
  "PLASTILINA / MASA MOLDEABLE": "https://images.unsplash.com/photo-1596464716127-f2a829822391?w=800&auto=format&fit=crop&q=80",
  "PORTAMINAS": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80",
  "PUNZON": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
  "REGISTROS": "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
  "REGLAS / PLANTILLAS Y JGO GEOM": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80",
  "RESALTADORES": "https://images.unsplash.com/photo-1580569214296-5cf2bbe69c5f?w=800&auto=format&fit=crop&q=80",
  "SACAPUNTAS": "https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=800&auto=format&fit=crop&q=80",
  "SETS ESCOLARES": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80",
  "TABLEROS DE DIBUJO": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
  "TEMPERAS": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80",
  "TIJERAS": "https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80",
  "TIZAS": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80"
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

async function poblar() {
  const { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_HOST, BUNNY_PULLZONE_URL } = process.env;
  if (!BUNNY_STORAGE_API_KEY) {
    throw new Error('Falta BUNNY_STORAGE_API_KEY');
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const categorias = Object.keys(FOTOS_CATEGORIAS);
  console.log(`Iniciando carga de 1 imagen representativa para ${categorias.length} categorías...`);

  let count = 0;
  for (const cat of categorias) {
    count++;
    const unsplashUrl = FOTOS_CATEGORIAS[cat];
    const slug = slugify(cat);
    const fileName = `categorias/${slug}.webp`;

    console.log(`[${count}/${categorias.length}] Descargando foto para: ${cat}`);
    try {
      const resp = await fetch(unsplashUrl);
      if (!resp.ok) {
        console.warn(`Error al descargar ${cat}: HTTP ${resp.status}`);
        continue;
      }

      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Subir a Bunny CDN
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

      // Guardar en bot_categorias_img
      await conn.query(
        `UPDATE bot_categorias_img SET url_imagen = ? WHERE categoria = ?`,
        [cdnUrl, cat]
      );

      // Guardar también en bot_categorias_galeria si no existe
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

      console.log(`  -> ✅ Subida exitosa a Bunny CDN y BD: ${cdnUrl}`);
    } catch (e) {
      console.error(`Error procesando ${cat}:`, e.message);
    }
  }

  console.log('\n🎉 ¡Proceso finalizado con éxito!');
  await conn.end();
}

poblar().catch(console.error);
