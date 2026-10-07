// Extractor multimodal para procesar imágenes, PDFs y audios enviados por WhatsApp
export async function extraerTextoDeMedia(messageId: string): Promise<{ texto: string; tipo: string } | null> {
  const { EVOLUTION_URL, EVOLUTION_INSTANCE, EVOLUTION_API_KEY, GEMINI_API_KEY } = process.env;
  if (!EVOLUTION_URL || !EVOLUTION_INSTANCE || !EVOLUTION_API_KEY || !GEMINI_API_KEY) {
    return null;
  }

  try {
    // 1) Obtener base64 del archivo multimedia desde Evolution API
    const evoUrl = `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`;
    const evoRes = await fetch(evoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({
        message: { key: { id: messageId } },
        convertToMp4: false,
      }),
    });

    if (!evoRes.ok) {
      console.warn(`[Media Extractor] Evolution devolvió ${evoRes.status} para el mensaje ${messageId}`);
      return null;
    }

    const mediaData = await evoRes.json();
    if (!mediaData?.base64) {
      return null;
    }

    const cleanBase64 = mediaData.base64.replace(/^data:[^;]+;base64,/, "");
    const mimetype = mediaData.mimetype || "application/octet-stream";
    const caption = mediaData.caption || "";

    // 2) Preparar prompt según el tipo de archivo
    let promptInstruccion = "Analiza este archivo y extrae con precisión todo el contenido relevante, listas de útiles escolares, nombres de productos, marcas, cantidades y notas:";
    if (mimetype.includes("pdf")) {
      promptInstruccion = "Lee con total exactitud este documento PDF escolar o comercial. Extrae la lista completa de útiles, materiales, marcas y cantidades requeridas:";
    } else if (mimetype.includes("image")) {
      promptInstruccion = "Lee con precisión esta imagen (foto de lista de útiles, catálogo o producto). Extrae todos los productos escritos o visibles con sus cantidades y especificaciones:";
    } else if (mimetype.includes("audio") || mimetype.includes("ogg")) {
      promptInstruccion = "Transcribe con exactitud lo que dice este audio de WhatsApp en español:";
    }

    // 3) Enviar a Gemini Multimodal con timeout seguro
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);

    const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`;
    const gemRes = await fetch(gemUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptInstruccion },
              { inlineData: { mimeType: mimetype, data: cleanBase64 } },
            ],
          },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!gemRes.ok) {
      const err = await gemRes.text();
      console.warn(`[Media Extractor] Gemini devolvió ${gemRes.status}: ${err}`);
      return null;
    }

    const gemData = await gemRes.json();
    const textoExtraido = gemData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!textoExtraido) return null;

    const textoFinal = caption ? `[Comentario: ${caption}]\n\n[Contenido del archivo adjunto]:\n${textoExtraido}` : `[Contenido del archivo adjunto]:\n${textoExtraido}`;
    return { texto: textoFinal, tipo: mimetype };
  } catch (err: any) {
    console.error("[Media Extractor Error]:", err?.message || err);
    return null;
  }
}
