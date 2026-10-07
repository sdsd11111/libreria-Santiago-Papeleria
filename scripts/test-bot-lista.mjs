// Script de prueba local del bot con la lista de útiles
// Ejecutar: node scripts/test-bot-lista.mjs
// Requiere: .env.local con las credenciales de DB y Gemini

import "dotenv/config";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Cargar .env.local manualmente
import { config } from "dotenv";
config({ path: join(ROOT, ".env.local") });

const mysql = await import("mysql2/promise");

const pool = mysql.default.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 2,
});

async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
async function exec(sql, params = []) {
  const [r] = await pool.query(sql, params);
  return r;
}

const JID_TEST = "5939XXXXXXXX@s.whatsapp.net";
const NOMBRE_TEST = "TestScript";

// 1) Limpiar conversación de prueba anterior
console.log("🧹 Limpiando conversación de prueba anterior...");
const contactoExist = await q("SELECT id FROM bot_contactos WHERE telefono=?", [JID_TEST]);
if (contactoExist.length) {
  const cid = contactoExist[0].id;
  const convs = await q("SELECT id FROM bot_conversaciones WHERE contacto_id=?", [cid]);
  for (const c of convs) {
    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [c.id]);
    await exec("DELETE FROM bot_trazas WHERE conversacion_id=?", [c.id]);
    await exec("DELETE FROM bot_eventos WHERE conversacion_id=?", [c.id]);
    await exec("DELETE FROM bot_conversaciones WHERE id=?", [c.id]);
  }
  await exec("DELETE FROM bot_contactos WHERE id=?", [cid]);
}

// 2) Crear contacto de prueba
const insC = await exec(
  "INSERT INTO bot_contactos (telefono, nombre, datos) VALUES (?,?,'{}')",
  [JID_TEST, NOMBRE_TEST]
);
const contactoId = insC.insertId;

// 3) Crear conversación
const insConv = await exec(
  "INSERT INTO bot_conversaciones (contacto_id, bot_activo, estado, empresa) VALUES (?,1,'NUEVO','santiago')",
  [contactoId]
);
const convId = insConv.insertId;
console.log(`✅ Conversación creada: ID ${convId}`);

// 4) Texto extraído del PDF (simulando lo que haría Gemini Vision)
const textoPDF = `[Contenido del archivo adjunto]:
LISTA DE ÚTILES PRIMERO EGB - Año lectivo 2025-2026

MATERIAL INDIVIDUAL:
- 1 cuaderno parvulario cosido 100 hojas de líneas (forrado lila, lengua)
- 1 cuaderno parvulario cosido 100 hojas de cuadros (forrado verde, matemáticas)
- 1 carpeta tipo sobre broche plástico duro, color azul A4
- 1 carpeta verde plástica tapa transparente A4
- 1 carpeta doble anillo o 2 argollas A4

CARTUCHERA:
- 1 caja de pinturas 12 colores delgadas (Triplus)
- 1 caja de marcadores doble punta 12 colores
- 3 lápices delgados triplus HB N°2
- 1 tijera punta redonda
- 1 borrador blanco
- 1 sacapuntas metálico doble servicio
- 1 frasco de goma líquida 250ml

MATERIALES VARIOS:
- 1 caja de crayones gruesos grandes
- 2 marcadores de tiza líquida rojo y negro
- 1 caja de tizas de colores
- 1 block de papel iris tamaño INEN
- 2 paquetes de cartulinas IRIS tamaño INEN
- 1 paquete cartulinas blancas A4
- 1 resma de papel bond tamaño INEN 75 gramos
- 5 barras de silicona delgadas
- 1 frasco grande de témpera 250ml
- 2 pinceles plano N°8 y 16
- 1 paquete de plastilina 12 unidades
- 1 paquete de fomix escarchado A4
- 1 paquete de fomix llano A4
- 1 punzón punta metálica
- 1 rollo de cinta masking 36x20
- 1 ovillo de lana escolar
- 2 paquetes de palos de helado

ÚTILES DE ASEO:
- 1 paquete de toallas tipo Z
- 1 paquete de paños húmedos (100)`;

// 5) Insertar el mensaje del cliente
await exec(
  "INSERT INTO bot_mensajes (conversacion_id, rol, texto, procesado) VALUES (?,?,?,0)",
  [convId, "cliente", textoPDF]
);
console.log("📄 Mensaje con lista insertado. Procesando con el bot...\n");

// 6) Llamar al bot
// Importar dinámicamente desde el proyecto
process.chdir(ROOT);

// Monkey-patch enviarTexto para capturar respuesta sin enviar WhatsApp real
const evolutionModule = await import(`${ROOT}/lib/evolution.js`).catch(() => null);

// Usar tsx/ts-node o compilado .next — intentamos con el módulo transpilado
let procesarConversacion;
try {
  // Intentar desde .next (build)
  const botMod = await import(`${ROOT}/.next/server/chunks/bot.js`).catch(() => null);
  if (!botMod) throw new Error("No hay build");
  procesarConversacion = botMod.procesarConversacion;
} catch {
  console.log("⚠️  No hay build compilado. Ejecutando con tsx...");
  const { execSync } = await import("child_process");
  // Crear wrapper
  const wrapper = `
import { procesarConversacion } from './lib/bot.ts';
const result = await procesarConversacion(${convId});
console.log('BOT_RESULT:' + JSON.stringify(result));
`;
  const wrapperPath = join(ROOT, "scripts", "_test_wrapper.ts");
  writeFileSync(wrapperPath, wrapper);
  try {
    const out = execSync(`npx tsx ${wrapperPath}`, {
      cwd: ROOT,
      env: { ...process.env },
      encoding: "utf-8",
      timeout: 60000,
    });
    console.log(out);
  } catch (e) {
    console.error(e.stdout || e.message);
  }
  // Leer respuesta del bot desde DB
  await new Promise(r => setTimeout(r, 2000));
}

// 7) Leer respuesta del bot desde la DB
const mensajes = await q(
  "SELECT rol, texto, creado_en FROM bot_mensajes WHERE conversacion_id=? ORDER BY id",
  [convId]
);

console.log("\n" + "═".repeat(60));
console.log("📱 CONVERSACIÓN SIMULADA");
console.log("═".repeat(60));
for (const m of mensajes) {
  const quien = m.rol === "cliente" ? "👤 Cliente" : "🤖 Bot";
  console.log(`\n${quien}:`);
  console.log(m.texto);
}
console.log("\n" + "═".repeat(60));

await pool.end();
process.exit(0);
