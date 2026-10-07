import { NextResponse } from "next/server";
import { ingresar } from "@/lib/ingest";
import { inngest } from "@/lib/inngest";
import { enviarTexto } from "@/lib/evolution";
import { exec } from "@/lib/db";
import { extraerTextoDeMedia } from "@/lib/media";

export const maxDuration = 45;

// Evolution -> POST /api/webhook?secret=...   (evento MESSAGES_UPSERT)
export async function POST(req: Request) {
  if (new URL(req.url).searchParams.get("secret") !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const evento = String(body?.event ?? "").toLowerCase().replace("_", ".");
  if (evento !== "messages.upsert") return NextResponse.json({ ok: true });

  const lista = Array.isArray(body.data) ? body.data : [body.data];
  for (const m of lista) {
    const key = m?.key;
    if (!key || key.fromMe) continue; // ignora mis propios mensajes (evita bucles)
    const jid: string = key.remoteJid?.endsWith("@lid") && key.remoteJidAlt ? key.remoteJidAlt : key.remoteJid;
    if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") continue;

    let texto: string | null =
      m.message?.conversation ??
      m.message?.extendedTextMessage?.text ??
      m.message?.imageMessage?.caption ??
      m.message?.documentMessage?.caption ??
      null;

    const tieneMedia = Boolean(
      m.message?.imageMessage ||
      m.message?.documentMessage ||
      m.message?.documentWithCaptionMessage ||
      m.message?.audioMessage
    );

    // Si viene un archivo (PDF, imagen, audio), extraer su contenido con Gemini Multimodal
    if (tieneMedia && key.id) {
      try {
        const mediaExt = await extraerTextoDeMedia(key.id);
        if (mediaExt?.texto) {
          texto = mediaExt.texto;
        }
      } catch (err) {
        console.error("[Webhook Media Error]:", err);
      }
    }

    const r = await ingresar({
      jid,
      nombre: m.pushName,
      waId: key.id,
      texto: texto ?? "[Archivo no legible]",
      procesado: !texto,
    });

    const textoLimpio = (texto || "").trim().toLowerCase();
    if (textoLimpio === "/reset" || textoLimpio.startsWith("/reset ")) {
      // Reset inmediato en caliente
      await exec("DELETE FROM bot_eventos WHERE conversacion_id=?", [r.conversacionId]);
      await exec("DELETE FROM bot_trazas WHERE conversacion_id=?", [r.conversacionId]);
      await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [r.conversacionId]);
      await exec("DELETE FROM bot_conversaciones WHERE id=?", [r.conversacionId]);
      await exec("DELETE FROM bot_contactos WHERE telefono=?", [jid]);
      await enviarTexto(jid, "🔄 *¡Datos reseteados con éxito!* Se eliminó el historial y tus datos para este número. Puedes iniciar una nueva conversación de prueba desde cero. 🙌");
      continue;
    }

    if (r.duplicado) continue;

    // Si el bot ya no está activo (porque ya pasó a asesor humano)
    if (!r.botActivo) {
      if (r.estado === "ESCALADO" || r.estado === "HUMANO") {
        const avisoAsesor = "¡Hola! Tu mensaje quedó registrado en el historial de tu caso ✍️. Como te comentamos, un asesor humano tomará este chat en breve para atenderte directamente. ¡Muchas gracias por tu paciencia! 🙌";
        await enviarTexto(jid, avisoAsesor);
        await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto) VALUES (?, 'bot', ?)", [r.conversacionId, avisoAsesor]);
      }
      continue;
    }

    if (!texto) {
      const aviso = "Recibí tu archivo, pero no pude leer el contenido. ¿Podrías enviarme una foto más clara o escribir los productos que necesitas? Con gusto te ayudo 🙂";
      await enviarTexto(jid, aviso);
      await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto) VALUES (?, 'bot', ?)", [r.conversacionId, aviso]);
    } else {
      if (!process.env.INNGEST_SIGNING_KEY && !process.env.INNGEST_EVENT_KEY) {
        // Modo directo local / MVP: procesar inmediatamente
        const { procesarConversacion } = await import("@/lib/bot");
        setTimeout(() => {
          procesarConversacion(r.conversacionId).catch((err) => console.error("Error procesando bot directo:", err));
        }, 1000);
      } else {
        await inngest.send({ name: "chat/mensaje", data: { conversacionId: r.conversacionId } });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
