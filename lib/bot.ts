import { q, exec } from "./db";
import { generar, textoDe, type Content } from "./gemini";
import { declaraciones, ejecutar, type Ctx } from "./tools";
import { ahora, asesoresDisponibles } from "./time";
import { enviarTexto } from "./evolution";

const ESCALAR_RE = /\b(asesor|humano|persona real|hablar con alguien|agente|queja|reclam|denuncia|estafa|reembols|devoluci)/i;
const FALLBACK = "Prefiero confirmarlo con un asesor para no darte un dato incorrecto. Ya te paso con uno 🙏";

// Convierte los nombres de tools en una etiqueta legible de intención
function etiquetaIntencion(log: { nombre: string }[], escalado: boolean, bloqueada: boolean): string {
  if (escalado) return "Pasó a asesor";
  if (bloqueada) return "Respuesta bloqueada";
  const nombres = [...new Set(log.map((l) => l.nombre))];
  if (nombres.includes("buscar_producto")) return "Consulta de producto/precio";
  if (nombres.includes("buscar_sucursales")) return "Consulta de sucursal/horario";
  if (nombres.includes("listar_promociones")) return "Consulta de promociones";
  if (nombres.includes("buscar_conocimiento")) return "Consulta institucional/marcas";
  if (nombres.includes("buscar_faq")) return "Pregunta frecuente";
  if (nombres.includes("guardar_dato_cliente")) return "Captura de datos";
  if (nombres.includes("escalar_a_humano") || nombres.includes("notificar_asesor")) return "Solicitó asesor";
  if (!nombres.length) return "Conversación general";
  return "Consulta general";
}

function sistema(conv: any) {
  const h = ahora();
  return `Usted es el asistente virtual de Santiago Papelería en WhatsApp. Atiende con un tono profesional, cortés y amable, propio de una empresa con más de 40 años de trayectoria en Loja, Ecuador.

══ IDENTIDAD Y EMPRESA ══
• NOMBRE: Santiago Papelería / Mega Santiago.
• ACTIVIDAD: Comercialización de útiles escolares, papelería, suministros de oficina, tecnología, arte, manualidades, bazar, hogar y regalos.
• FUNDACIÓN: 1980 como Gráficas Santiago en Loja. Desde 1987 desarrollada como papelería por Julio César Luna Cruz y Rosemary Alejandro Matamoros.
• HITOS: 2018 — primer autoservicio de papelería de Loja. 2024 — apertura de Mega Santiago. 2025 — distribuidores oficiales de MAPED para todo Ecuador.
• CALIFICACIÓN GOOGLE: 4,6/5 con aproximadamente 438 reseñas.
• MATRIZ: Azuay 152-48 entre 18 de Noviembre y Av. Universitaria, Loja. Tel: (07) 257-3358.
• MEGA SANTIAGO: 18 de Noviembre entre Azuay y Miguel Riofrío, Loja. Tel: 098 766 7459.
• CORREO VENTAS: ventas@santiagopapeleria.com
• CORREO RECLAMOS: servicios@santiagopapeleria.com
• CORREO FACTURACIÓN: facturas@santiagopapeleria.com
• TIENDA ONLINE: megasantiago.com
• WHATSAPP (ventas al por menor): 0987667459
• WHATSAPP / TEL (mayorista): 0939826491 / 0939522690

══ LÍNEAS DE NEGOCIO ══
• SANTIAGO PAPELERÍA: Autoservicio de papelería, útiles escolares, oficina, arte y bazar.
• MEGA SANTIAGO: Formato ampliado. Incorpora mascotas, hogar y cumpleaños además de la papelería completa.
• CREANDO: Marca propia lanzada en 2016.
• MAPED: Santiago Papelería es distribuidor oficial de MAPED para Ecuador desde 2025.
• CANAL MAYORISTA: Venta al por mayor para negocios, papelerías y distribuidores de todo el país.
• PUNTOS UNIVERSITARIOS: Almacén UTPL y Almacén UIDE, Loja.

══ MARCAS COMERCIALIZADAS ══
BIC, Faber-Castell, Pelikan, Artesco, Maped, Stabilo, Staedtler, Rotring, Lancer, Nataraj, Giotto, Sharpie, Andaluz, Escribe, Krafty Kids y otras marcas nacionales e internacionales.

══ FORMAS DE PAGO ══
• Efectivo en tiendas físicas.
• Tarjetas bancarias: Visa, Mastercard, American Express, Diners Club, Discover y Alia (sin recargo).
• Transferencia bancaria o depósito para compras online.
• Clientes empresariales: se procesan retenciones. Contactar facturas@santiagopapeleria.com.

══ PROMOCIÓN VIGENTE DESTACADA ══
• Martes y sábados MAPED: Compras desde $5 en productos MAPED en tiendas físicas participan en premios instantáneos.
(Las demás promociones se consultan en el catálogo o con un asesor.)

══ LO QUE PUEDE RESPONDER DIRECTAMENTE (SIN CONSULTAR BASE DE DATOS) ══
- ¿Qué venden? → Útiles escolares, papelería, oficina, arte, arquitectura, tecnología, bazar, hogar y regalos. Más de 2.000 productos disponibles en catálogo.
- ¿Tienen tienda online? → Sí, megasantiago.com, con proceso completo de compra online.
- ¿Hacen delivery? → Se contempla entrega para compras online. Para coordinar, escribir al 0987667459 o a ventas@santiagopapeleria.com.
- ¿Son distribuidores de MAPED? → Sí, distribuidores oficiales para Ecuador desde 2025.
- ¿Venden al por mayor? → Sí, canal mayorista activo: 0939826491 / 0939522690.
- ¿Emíten factura? → Sí, factura electrónica al indicar cédula o RUC al pagar.
- ¿Formas de pago? → Efectivo, tarjetas (Visa, Mastercard, American Express, Diners, Discover, Alia) sin recargo. Transferencia para online.
- ¿Cuántos años tienen? → Más de 40 años desde 1980.
- ¿Devoluciones? → Dentro de 5 días después de la compra. Contactar servicios@santiagopapeleria.com.
- ¿Empleo? → Enviar hoja de vida a administracionsantiago@santiagopapeleria.com o en tiendas físicas.

══ CÓMO HABLA ══
- Tono profesional, cortés y cálido, propio de un asistente empresarial serio.
- Utilice el tratamiento de "usted" con los clientes.
- Evite el lenguaje robótico o excesivamente informal.
- REGLA DE SALUDO: Salude cordialmente en el primer contacto o tras varias horas de inactividad. En conversaciones en curso, no repita saludos; responda directamente la consulta.
- Use emojis profesionales con moderación (1 a 2 por respuesta): 📝, 📍, 🎨, 🛒, ✅, 🙌. Evite emojis excesivos.
- Mensajes claros, bien estructurados y con el nivel de detalle necesario. Puede usar listas breves si hay varias opciones.
- PROHIBIDO: menús numerados tipo IVR ("marque 1 para..."). Converse de forma fluida como en un WhatsApp profesional.

══ REGLA DE ORO — USO DE HERRAMIENTAS ══
Cuando el cliente pregunte por ubicación, dirección, horario, precio o promoción de una sucursal o producto ESPECÍFICO:
  → Llame la herramienta de inmediato. NO escriba ningún texto antes ni después de la llamada en ese turno.
  → PROHIBIDO TOTAL: decir "un momento", "voy a buscar", "necesito consultar". Llame la función SIN anunciarlo.
  → Solo después de recibir el resultado de la herramienta redacte su respuesta.

══ MANEJO DE SUCURSALES ══
1. Si el cliente menciona un barrio o sector específico de Loja: identifique la sucursal más cercana y comparta su dirección, horario y enlace de mapa (mapa_url).
2. Si solo dice "en Loja": liste las sucursales disponibles con direcciones y horarios.
3. Siempre que recomiende una sucursal, incluya el enlace a Google Maps (mapa_url).

══ MANEJO DE PRODUCTOS Y CATÁLOGO ══
- Para preguntas de precio o disponibilidad de producto específico: llame buscar_producto().
- Los precios en el catálogo son sin IVA. Informe siempre que el precio mostrado es + IVA (15%).
- Para listas escolares o consultas de conjuntos de productos: ayude al cliente paso a paso y sugiera buscar en la tienda online megasantiago.com para ver el catálogo completo.
- Stock exacto en tienda física: no lo garantice; invíte a confirmar con un asesor o llamando a la sucursal.

══ DIFERENCIA RETAIL / MAYORISTA ══
- Si el cliente indica que quiere comprar para su negocio, en cantidad, o distribuir MAPED: identifíquelo como cliente mayorista y transfiera a un asesor humano con los datos del canal mayorista.
- Para compras al por menor: atienda normalmente.

══ REGLAS ANTI-ALUCINACIÓN (ESTRICTAS) ══
1. DIRECCIONES: Llame buscar_sucursales() → use SOLO las direcciones que devuelva la herramienta.
2. HORARIOS: Llame buscar_sucursales() → use SOLO los horarios que devuelva la herramienta.
3. PRECIOS: Llame buscar_producto() → use SOLO los precios que devuelva. Nunca escriba un precio de memoria.
4. Si la herramienta no encuentra datos, diga "no tengo esa información exacta en este momento" y ofrezca un asesor.
5. Stock real en tienda: no lo asegure; invíte a confirmar con un asesor o llamando a la tienda.

══ ESCALADO A ASESOR HUMANO (PROTOCOLO OBLIGATORIO) ══
Cuándo escalar: cuando el cliente lo solicite, para cotizaciones al por mayor, reclamos, pedidos especiales o casos complejos.
PASOS OBLIGATORIOS (EN ESTRICTO ORDEN):
1. PEDIR DATOS PRIMERO (SIEMPRE): Aunque WhatsApp muestre un nombre de perfil, SIEMPRE pregúntele directamente al cliente su nombre y apellido completo (y ciudad si no la ha indicado) antes de transferirlo al asesor.
   - Ejemplo: "Con gusto le comunico con un asesor. Para abrir su caso y que le atiendan de forma personalizada, ¿podía indicarme por favor su nombre completo y ciudad?"
   - En este turno NO llame a escalar_a_humano ni se despida. Solo pida los datos.
2. CUANDO EL CLIENTE RESPONDE CON SUS DATOS:
   - Guarde los datos con guardar_dato_cliente(campo="nombre", valor=...). Si dio ciudad, también guardar_dato_cliente(campo="ciudad", valor=...).
   - Llame inmediatamente a escalar_a_humano(motivo=...) y notificar_asesor(nombre_cliente=..., motivo=...).
   - Emita el MENSAJE FINAL DE DESPEDIDA:
     "Muchas gracias, [Nombre]. Hasta aquí llega mi intervención como asistente virtual. He registrado sus datos y transferido el resumen de lo conversado a nuestro equipo. Un asesor de Santiago Papelería se pondrá en contacto con usted directamente por este mismo chat. Que tenga un excelente día. 🙌"
3. NUNCA emita el mensaje final de despedida antes de que el cliente haya respondido con su nombre.

══ ESTADO ACTUAL ══
Estado conversación: ${conv.estado}
Ahora en Loja: ${h.dia} ${h.hora}
Cliente: ${conv.nombre ?? "sin nombre"} | Datos: ${JSON.stringify(conv.datos ?? {})}
Resumen previo: ${conv.resumen ?? "conversación nueva"}`;
}

// Valida que precios en $ mencionados por el bot vengan de una herramienta.
// Las horas y direcciones quedan protegidas por el prompt + function calling.
function validar(texto: string, resultados: string, _toolsUsadas: string[]): boolean {
  const nums = new Set((resultados.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  const montos = texto.match(/\$\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:d[oó]lares|USD)/gi) ?? [];
  for (const m of montos) {
    const n = parseFloat((m.match(/\d+(?:[.,]\d{1,2})?/)![0]).replace(",", "."));
    if (![...nums].some((x) => Math.abs(x - n) < 0.001)) return false;
  }
  return true;
}

function limpiarSaludoRepetido(texto: string): string {
  // Elimina saludos al inicio como "¡Hola de nuevo!", "¡Hola!", "Hola Cristhopher,", "Buenas tardes,", etc.
  return texto
    .replace(/^(\s*¡?\s*(hola(?:\s+de\s+nuevo)?|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches)(?:\s+[a-záéíóúñ]+)?\s*[!.,:;]*\s*(?:[😊👋🤖✨🛒🍎]\s*)*)+/i, "")
    .trim();
}

async function responder(conv: any, texto: string, ids: number[]) {
  // Verificamos cuándo fue el último mensaje del bot
  const [ultimoBot] = await q<any>(
    "SELECT creado_en FROM bot_mensajes WHERE conversacion_id=? AND rol='bot' ORDER BY id DESC LIMIT 1",
    [conv.id]
  );

  let textoFinal = texto;

  if (ultimoBot?.creado_en) {
    const diffHoras = (Date.now() - new Date(ultimoBot.creado_en).getTime()) / (1000 * 60 * 60);
    // Solo si estamos en una conversación ACTIVA y continua (hace menos de 4 horas) quitamos el saludo repetido.
    // Si escribe después de 4 horas, al día siguiente o la próxima semana, SÍ es natural que salude.
    if (diffHoras < 4) {
      const textoSinSaludo = limpiarSaludoRepetido(texto);
      if (textoSinSaludo.length > 5) {
        textoFinal = textoSinSaludo.charAt(0).toUpperCase() + textoSinSaludo.slice(1);
      }
    }
  }

  await enviarTexto(conv.jid, textoFinal);
  await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto) VALUES (?, 'bot', ?)", [conv.id, textoFinal]);
  if (ids.length) {
    const maxId = Math.max(...ids);
    await exec("UPDATE bot_mensajes SET procesado=1 WHERE conversacion_id=? AND rol='cliente' AND id <= ?", [conv.id, maxId]);
  }
  await exec("UPDATE bot_conversaciones SET ultimo_msg_en=NOW(3) WHERE id=?", [conv.id]);
}

async function historial(convId: number, n: number) {
  return (await q<any>("SELECT id, rol, texto FROM bot_mensajes WHERE conversacion_id=? ORDER BY id DESC LIMIT ?", [convId, n])).reverse();
}

async function escalar(conv: any, motivo: string) {
  // Generamos el resumen a partir del historial en memoria (sin llamada extra a Gemini)
  // para no superar el límite de 60 s de Vercel Serverless.
  const h = await historial(conv.id, 20);
  const resumen = h.map((m: any) => `${m.rol === 'cliente' ? '👤 Cliente' : '🤖 Bot'}: ${m.texto}`).join("\n").slice(0, 2000);
  await exec("UPDATE bot_conversaciones SET bot_activo=0, estado='ESCALADO', motivo_escalamiento=?, resumen_agente=? WHERE id=?", [motivo, resumen, conv.id]);
  await exec("INSERT INTO bot_eventos (conversacion_id, tipo, detalle) VALUES (?, 'escalado', ?)", [conv.id, JSON.stringify({ motivo })]);
  return asesoresDisponibles();
}

export async function procesarConversacion(convId: number) {
  const [conv] = await q<any>(
    `SELECT c.*, ct.nombre, ct.telefono AS jid, ct.datos FROM bot_conversaciones c JOIN bot_contactos ct ON ct.id=c.contacto_id WHERE c.id=?`, [convId]);
  if (!conv || !conv.bot_activo) return { omitido: "bot inactivo" };
  const pend = await q<any>("SELECT id, texto FROM bot_mensajes WHERE conversacion_id=? AND rol='cliente' AND procesado=0 ORDER BY id", [convId]);
  if (!pend.length) return { omitido: "sin pendientes" };
  const ids: number[] = pend.map((p) => p.id);
  const t0 = Date.now();

  // 0) Comando temporal de prueba: /reset para reiniciar de 0 el número
  const textoEntrante = pend.map((p) => p.texto || "").join(" ").trim();
  if (/^\/reset\b/i.test(textoEntrante)) {
    // Borrar trazas, eventos, mensajes y la conversación
    await exec("DELETE FROM bot_eventos WHERE conversacion_id=?", [convId]);
    await exec("DELETE FROM bot_trazas WHERE conversacion_id=?", [convId]);
    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [convId]);
    await exec("DELETE FROM bot_conversaciones WHERE id=?", [convId]);
    // Borrar el contacto si no tiene más conversaciones
    if (conv.contacto_id) {
      await exec("DELETE FROM bot_contactos WHERE id=?", [conv.contacto_id]);
    }
    // Enviar confirmación al WhatsApp
    await enviarTexto(conv.jid, "🔄 *¡Datos reseteados con éxito!* Se eliminó el historial y tus datos para este número. Puedes iniciar una nueva conversación de prueba desde cero. 🙌");
    return { ok: true, reset: true };
  }

  // 1) Disparadores por CODIGO (solo si es queja grave o fraude explícito con insulto/denuncia extrema)
  const esQuejaExtrema = /\b(denuncia|estafa|demanda judicial|fiscalia)\b/i.test(textoEntrante);
  if (esQuejaExtrema) {
    const a = await escalar(conv, "Caso legal / denuncia urgente");
    await responder(conv, a.disponible
      ? "Hasta aquí llega mi intervención como asistente virtual. He pasado tu caso de inmediato a un asesor humano de nuestra administración. En un momento se pondrá en contacto contigo directamente 🙌"
      : `Hasta aquí llega mi intervención como asistente virtual. Dejo tu caso registrado con carácter prioritario para administración. Nuestro horario de atención es ${a.texto}; apenas inicien labores se pondrán en contacto contigo directamente por aquí 🙌`, ids);
    return { escalado: true };
  }

  // 2) Contexto: datos + estado + resumen (system) y ultimos 14 mensajes (contents)
  const contents: Content[] = [];
  for (const m of await historial(convId, 14)) {
    const role = m.rol === "cliente" ? "user" : "model";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n" + m.texto;
    else contents.push({ role, parts: [{ text: m.texto }] });
  }
  while (contents[0]?.role === "model") contents.shift();

  const ctx: Ctx = { convId, contactoId: conv.contacto_id, empresa: conv.empresa };
  const system = sistema(conv);
  const log: { nombre: string; args: any; resultado: any }[] = [];
  let tokens = 0, texto = "";

  // 3) Loop de herramientas (máximo 5 vueltas)
  for (let i = 0; i < 3; i++) {
    const res = await generar({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: declaraciones }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    });
    tokens += res?.usageMetadata?.totalTokenCount ?? 0;
    const cand = res?.candidates?.[0];
    const calls = (cand?.content?.parts ?? []).filter((p: any) => p.functionCall);
    if (!calls.length) { texto = textoDe(res); break; }
    contents.push(cand.content); // se conserva tal cual (incluye firmas de pensamiento)
    const respuestas: any[] = [];
    for (const c of calls) {
      const resultado = await ejecutar(c.functionCall.name, c.functionCall.args ?? {}, ctx);
      log.push({ nombre: c.functionCall.name, args: c.functionCall.args ?? {}, resultado });
      respuestas.push({ functionResponse: { name: c.functionCall.name, response: { result: resultado } } });
    }
    contents.push({ role: "user", parts: respuestas });
  }

  // 4) Validacion anti-alucinacion
  const resultados = JSON.stringify(log.map((l) => l.resultado));
  const toolsUsadas = log.map((l) => l.nombre);
  let bloqueada = false;
  if (!texto) { bloqueada = true; texto = FALLBACK; }
  else if (!validar(texto, resultados, toolsUsadas)) { bloqueada = true; texto = FALLBACK; }

  // 5) Escalado / intentos fallidos
  let motivo = ctx.escalar ?? (bloqueada ? "El bot no pudo dar una respuesta verificable" : null);
  const sinResultado = log.some((l) => l.resultado?.encontrado === false);
  let intentos = sinResultado ? conv.intentos_fallidos + 1 : 0;
  if (!motivo && intentos >= 2) motivo = "El bot no encontró información dos veces seguidas";
  if (motivo) { await escalar(conv, motivo); intentos = 0; }

  await responder(conv, texto, ids);
  await exec("UPDATE bot_conversaciones SET intentos_fallidos=?, estado=IF(?, estado, 'ATENDIENDO') WHERE id=?", [intentos, motivo ? 1 : 0, convId]);

  // Guardar intención detectada
  const intencion = etiquetaIntencion(log, !!motivo, bloqueada);
  await exec("UPDATE bot_conversaciones SET intencion=? WHERE id=?", [intencion, convId]);

  await exec("INSERT INTO bot_trazas (conversacion_id, prompt, respuesta, tools_llamadas, bloqueada, tokens, latencia_ms) VALUES (?,?,?,?,?,?,?)", [
    convId, JSON.stringify({ system, contents }), JSON.stringify({ texto }), JSON.stringify(log), bloqueada ? 1 : 0, tokens, Date.now() - t0,
  ]);

  try { await actualizarResumen(convId); } catch { /* no critico */ }
  return { ok: true, escalado: !!motivo, bloqueada };
}

// Resumen rodante estructurado: comprime lo antiguo para que nunca se pierda.
async function actualizarResumen(convId: number) {
  const [c] = await q<any>("SELECT resumen, resumen_hasta_msg_id FROM bot_conversaciones WHERE id=?", [convId]);
  const desde = c.resumen_hasta_msg_id ?? 0;
  const [{ n }] = await q<any>("SELECT COUNT(*) n FROM bot_mensajes WHERE conversacion_id=? AND id>?", [convId, desde]);
  if (n <= 24) return;
  const viejos = await q<any>("SELECT id, rol, texto FROM bot_mensajes WHERE conversacion_id=? AND id>? ORDER BY id LIMIT ?", [convId, desde, n - 10]);
  const r = await generar({
    contents: [{ role: "user", parts: [{ text:
      `Actualiza el resumen de esta conversación de atención al cliente. Responde SOLO un JSON con las claves: quiere, ya_se_le_dijo, datos, pendiente. Sé breve y no inventes.\nResumen previo: ${c.resumen ?? "ninguno"}\n\nMensajes nuevos:\n${viejos.map((m: any) => `${m.rol}: ${m.texto}`).join("\n")}` }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
  });
  const t = textoDe(r).replace(/```json|```/g, "").trim();
  if (!t) return;
  await exec("UPDATE bot_conversaciones SET resumen=?, resumen_hasta_msg_id=? WHERE id=?", [t, viejos[viejos.length - 1].id, convId]);
}
