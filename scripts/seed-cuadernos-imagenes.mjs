/**
 * seed-cuadernos-imagenes.mjs
 * Sube 10 imagenes de cuadernos a Bunny CDN y las registra en bot_categorias_galeria
 * con etiquetas especificas para el matching inteligente del bot.
 *
 * Uso: node --env-file=.env.local scripts/seed-cuadernos-imagenes.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAIN_DIR = 'C:/Users/Smart/.gemini/antigravity-ide/brain/1df26d22-5571-41cf-8a82-aa869c7dfad5';

const {
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME,
  BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_HOST, BUNNY_PULLZONE_URL
} = process.env;

const CATEGORIA = 'CUADERNOS';

// 10 fotos: 6 generadas por IA (locales) + 4 de Unsplash (url)
const IMAGENES = [
  {
    nombre: 'universitario_lineas',
    tipo: 'local',
    fuente: `${BRAIN_DIR}/cuaderno_universitario_lineas_1791471762510.jpg`,
    etiquetas: 'universitario, lineas, 100 hojas, espiral, cosido, academia',
  },
  {
    nombre: 'universitario_cuadros',
    tipo: 'local',
    fuente: `${BRAIN_DIR}/cuaderno_universitario_cuadros_1791471773654.jpg`,
    etiquetas: 'universitario, cuadros, 100 hojas, espiral, matematicas, cuadriculado',
  },
  {
    nombre: 'parvulario',
    tipo: 'local',
    fuente: `${BRAIN_DIR}/cuaderno_parvulario_1791471784866.jpg`,
    etiquetas: 'parvulario, inicial, ninos, pequeno, 50 hojas, cosido, preescolar, basica',
  },
  {
    nombre: 'tapa_dura',
    tipo: 'local',
    fuente: `${BRAIN_DIR}/cuaderno_tapa_dura_1791471793982.jpg`,
    etiquetas: 'tapa dura, premium, A4, profesional, grande, ejecutivo, negro',
  },
  {
    nombre: 'musica',
    tipo: 'local',
    fuente: `${BRAIN_DIR}/cuaderno_musica_1791471807772.jpg`,
    etiquetas: 'musica, pentagrama, arte, composicion, solfeo, espiral',
  },
  {
    nombre: 'dibujo',
    tipo: 'local',
    fuente: `${BRAIN_DIR}/cuaderno_dibujo_1791471828729.jpg`,
    etiquetas: 'dibujo, arte, boceto, blanco, sketchbook, hojas blancas, pintura',
  },
  {
    nombre: 'cosido_basico',
    tipo: 'url',
    fuente: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=80',
    etiquetas: 'cosido, basica, escolar, 50 hojas, economico, bajo costo',
  },
  {
    nombre: 'argollado_grande',
    tipo: 'url',
    fuente: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    etiquetas: 'argollado, grande, A4, carpeta, 200 hojas, universidad, anillado',
  },
  {
    nombre: 'libreta_notas',
    tipo: 'url',
    fuente: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&auto=format&fit=crop&q=80',
    etiquetas: 'libreta, notas, pequeno, bolsillo, viaje, agenda, compacto',
  },
  {
    nombre: 'colores_pack',
    tipo: 'url',
    fuente: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
    etiquetas: 'colores, pack, surtido, variado, escolar, set, combo, varios',
  },
];

async function subirABunny(fuente, tipo, fileName) {
  let buffer;
  if (tipo === 'local') {
    if (!existsSync(fuente)) {
      console.warn(`  WARN: archivo no encontrado: ${fuente}`);
      return null;
    }
    buffer = readFileSync(fuente);
  } else {
    const resp = await fetch(fuente);
    if (!resp.ok) { console.warn(`  WARN: no se pudo descargar ${fuente}`); return null; }
    buffer = Buffer.from(await resp.arrayBuffer());
  }

  const putRes = await fetch(
    `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${fileName}`,
    {
      method: 'PUT',
      headers: { AccessKey: BUNNY_STORAGE_API_KEY, 'Content-Type': 'image/jpeg' },
      body: buffer,
    }
  );
  if (!putRes.ok) { console.warn(`  ERROR Bunny: ${await putRes.text()}`); return null; }
  return `${BUNNY_PULLZONE_URL}/${fileName}`;
}

async function main() {
  if (!BUNNY_STORAGE_API_KEY) throw new Error('Falta BUNNY_STORAGE_API_KEY');

  const conn = await mysql.createConnection({
    host: DB_HOST, port: parseInt(DB_PORT || '3306'),
    user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
  });

  console.log(`\nSubiendo ${IMAGENES.length} imagenes para categoria "${CATEGORIA}"...\n`);
  let ok = 0;

  for (let i = 0; i < IMAGENES.length; i++) {
    const img = IMAGENES[i];
    const fileName = `categorias/cuadernos_${img.nombre}_${Date.now() + i}.jpg`;
    console.log(`[${i + 1}/${IMAGENES.length}] ${img.nombre} | ${img.etiquetas}`);

    const cdnUrl = await subirABunny(img.fuente, img.tipo, fileName);
    if (!cdnUrl) continue;

    await conn.query(
      `INSERT INTO bot_categorias_galeria (categoria, url_imagen, etiquetas) VALUES (?, ?, ?)`,
      [CATEGORIA, cdnUrl, img.etiquetas]
    );
    console.log(`  OK: ${cdnUrl}\n`);
    ok++;
    await new Promise(r => setTimeout(r, 400));
  }

  // Si la categoria no tiene imagen principal, poner la primera
  const [[catRow]] = await conn.query(
    `SELECT url_imagen FROM bot_categorias_img WHERE categoria = ? LIMIT 1`, [CATEGORIA]
  );
  if (catRow && !catRow.url_imagen) {
    const [[first]] = await conn.query(
      `SELECT url_imagen FROM bot_categorias_galeria WHERE categoria = ? ORDER BY id ASC LIMIT 1`, [CATEGORIA]
    );
    if (first) {
      await conn.query(`UPDATE bot_categorias_img SET url_imagen = ? WHERE categoria = ?`, [first.url_imagen, CATEGORIA]);
      console.log(`Imagen principal de ${CATEGORIA} establecida.`);
    }
  }

  console.log(`\nListo! ${ok}/${IMAGENES.length} imagenes subidas.`);
  await conn.end();
}

main().catch(console.error);
