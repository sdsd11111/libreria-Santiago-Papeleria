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
export async function enviarDocumento(jid: string, mediaUrl: string, fileName: string, caption?: string) {
  if (jid.startsWith("sim-")) return;
  try {
    // Evolution API v2: mediatype va al nivel raíz, no dentro de mediaMessage
    const r = await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({
        number: jid,
        mediatype: "document",
        media: mediaUrl,
        fileName,
        caption: caption || "",
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      console.warn(`[Evolution Document Warning] ${r.status}: ${errText}`);
      // Intentar formato alternativo si falla
      const r2 = await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
        body: JSON.stringify({
          number: jid,
          mediaMessage: { mediatype: "document", media: mediaUrl, fileName, caption: caption || "" },
        }),
      });
      if (!r2.ok) console.warn(`[Evolution Document Alt Warning] ${r2.status}: ${await r2.text()}`);
    }
  } catch (err: any) {
    console.warn(`[Evolution Error] No se pudo enviar documento a ${jid}:`, err?.message || err);
  }
}

