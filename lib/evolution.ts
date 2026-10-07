// Envia texto por WhatsApp via Evolution API (v2). Los jid "sim-..." son chats de prueba.
export async function enviarTexto(jid: string, texto: string) {
  if (jid.startsWith("sim-")) return;
  try {
    const r = await fetch(`${process.env.EVOLUTION_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ number: jid, text: texto, delay: 1200 }), // delay = "escribiendo..."
    });
    if (!r.ok) {
      console.warn(`[Evolution Warning] ${r.status}: ${await r.text()}`);
    }
  } catch (err: any) {
    console.warn(`[Evolution Error] No se pudo enviar WhatsApp a ${jid}:`, err?.message || err);
  }
}

// Enviar imagen por Evolution API (v2)
export async function enviarImagen(jid: string, mediaUrl: string, caption?: string) {
  if (jid.startsWith("sim-")) return;
  try {
    const r = await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({
        number: jid,
        mediaMessage: {
          mediatype: "image",
          media: mediaUrl,
          caption: caption || "",
        },
      }),
    });
    if (!r.ok) {
      console.warn(`[Evolution Media Warning] ${r.status}: ${await r.text()}`);
    }
  } catch (err: any) {
    console.warn(`[Evolution Error] No se pudo enviar imagen a ${jid}:`, err?.message || err);
  }
}

// Enviar documento (PDF) por Evolution API (v2)
// Acepta URL (string) o Buffer — si es Buffer lo envía como base64 inline
export async function enviarDocumento(jid: string, media: string | Buffer, fileName: string, caption?: string) {
  if (jid.startsWith("sim-")) return;
  try {
    // Si es un Buffer, convertir a data URI base64
    const mediaStr = Buffer.isBuffer(media)
      ? `data:application/pdf;base64,${media.toString("base64")}`
      : media;

    const body = JSON.stringify({
      number: jid,
      mediatype: "document",
      mimetype: "application/pdf",
      caption: caption || "",
      media: mediaStr,
      fileName,
    });

    const r = await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
      body,
    });

    if (!r.ok) {
      const errText = await r.text();
      console.warn(`[Evolution Document Warning] ${r.status}: ${errText}`);
      // Intento alternativo con mediaMessage wrapper
      const r2 = await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
        body: JSON.stringify({
          number: jid,
          mediaMessage: {
            mediatype: "document",
            mimetype: "application/pdf",
            caption: caption || "",
            media: mediaStr,
            fileName,
          },
        }),
      });
      if (!r2.ok) console.warn(`[Evolution Document Alt] ${r2.status}: ${await r2.text()}`);
    }
  } catch (err: any) {
    console.warn(`[Evolution Error] No se pudo enviar documento a ${jid}:`, err?.message || err);
  }
}


