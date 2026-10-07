// Test directo del bot con la lista de útiles del PDF
// Uso: npx tsx scripts/test-bot-lista.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { createPool } from "mysql2/promise";

const pool = createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000,
  connectionLimit: 2,
});

const q = async <T = any>(sql: string, params: any[] = []) => {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
};
const exec = async (sql: string, params: any[] = []) => {
  const [r] = await pool.query(sql, params);
  return r as any;
};

// Monkey-patch enviarTexto y enviarImagen para no mandar WhatsApp real
process.env.EVOLUTION_URL = "http://DISABLED_TEST";

const JID_TEST = "TEST_SCRIPT_5939@s.whatsapp.net";

async function limpiar() {
  const [c] = await q<any>("SELECT id FROM bot_contactos WHERE telefono=?", [JID_TEST]);
  if (!c) return;
  const convs = await q<any>("SELECT id FROM bot_conversaciones WHERE contacto_id=?", [c.id]);
  for (const cv of convs) {
    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [cv.id]);
    await exec("DELETE FROM bot_trazas WHERE conversacion_id=?", [cv.id]);
    await exec("DELETE FROM bot_eventos WHERE conversacion_id=?", [cv.id]);
    await exec("DELETE FROM bot_conversaciones WHERE id=?", [cv.id]);
  }
  await exec("DELETE FROM bot_contactos WHERE id=?", [c.id]);
}

async function setup() {
  await limpiar();
  const insC = await exec(
    "INSERT INTO bot_contactos (telefono, nombre, datos) VALUES (?,?,'{}') ",
    [JID_TEST, "TestScript"]
  );
  const insConv = await exec(
    "INSERT INTO bot_conversaciones (contacto_id, bot_activo, estado, empresa) VALUES (?,1,'NUEVO','santiago')",
    [insC.insertId]
  );
  return { contactoId: insC.insertId, convId: insConv.insertId };
}

// Texto que Gemini Vision extraería del PDF
const LISTA_PDF = `[Contenido del archivo adjunto]:
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
- 1 resma de papel bond tamaño INEN 75 gramos
- 5 barras de silicona delgadas
- 1 frasco grande de témpera 250ml
- 2 pinceles plano N°8 y 16
- 1 paquete de plastilina 12 unidades
- 1 paquete de fomix A4
- 1 punzón punta metálica
- 1 rollo de cinta masking 36x20
- 1 ovillo de lana escolar
- 2 paquetes de palos de helado

ÚTILES DE ASEO:
- 1 paquete de toallas tipo Z
- 1 paquete de paños húmedos (100)`;

async function main() {
  console.log("🧹 Limpiando...");
  const { convId } = await setup();
  console.log(`✅ Conversación de prueba: ID ${convId}`);

  // Insertar mensaje del cliente (simula el PDF recibido)
  await exec(
    "INSERT INTO bot_mensajes (conversacion_id, rol, texto, procesado) VALUES (?,?,?,0)",
    [convId, "cliente", LISTA_PDF]
  );
  console.log("📄 Lista insertada. Llamando al bot...\n");

  // Importar bot (que usa el mismo pool de DB pero con enviarTexto deshabilitado)
  // Interceptamos enviarTexto para no mandar nada real
  const evolution = await import("../lib/evolution.js" as any).catch(() => null);
  // No podemos monkey-patch en TS fácilmente, pero EVOLUTION_URL=DISABLED hará que falle silenciosamente

  const { procesarConversacion } = await import("../lib/bot");
  const resultado = await procesarConversacion(convId);
  console.log("Resultado:", resultado);

  // Leer respuesta desde DB
  const mensajes = await q<any>(
    "SELECT rol, texto FROM bot_mensajes WHERE conversacion_id=? ORDER BY id",
    [convId]
  );

  console.log("\n" + "═".repeat(70));
  console.log("📱 RESPUESTA DEL BOT:");
  console.log("═".repeat(70));
  for (const m of mensajes) {
    if (m.rol === "bot") console.log("\n" + m.texto);
  }
  console.log("\n" + "═".repeat(70));

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
