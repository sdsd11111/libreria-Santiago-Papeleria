// Extractor multimodal para procesar imágenes, PDFs y audios enviados por WhatsApp

const MODELOS_VISION = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest",
];

async function llamarGeminiVision(
  base64: string,
  mimetype: string,
  prompt: string,
  apiKey: string,
  modelo: string,
  timeoutMs = 22000
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimetype, data: base64 } },
            ],
          },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (res.status === 503 || res.status === 429) {
      console.warn(`[Media] Gemini ${modelo} devolvió ${res.status} (sobrecarga)`);
      return null; // señal de reintento con otro modelo
    }
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Media] Gemini ${modelo} devolvió ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[Media] Error llamando ${modelo}:`, err?.message || err);
    return null;
  }
}

export async function extraerTextoDeMedia(messageId: string): Promise<{ texto: string; tipo: string } | null> {
  const {
    EVOLUTION_URL,
    EVOLUTION_INSTANCE,
    EVOLUTION_API_KEY,
    GEMINI_API_KEY,
    GEMINI_API_KEY_BACKUP,
  } = process.env;

  if (!EVOLUTION_URL || !EVOLUTION_INSTANCE || !EVOLUTION_API_KEY || !GEMINI_API_KEY) {
    return null;
  }

  try {
    // 1) Obtener base64 del archivo multimedia desde Evolution API
    const evoRes = await fetch(
      `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
      }
    );

    if (!evoRes.ok) {
      console.warn(`[Media] Evolution devolvió ${evoRes.status} para ${messageId}`);
      return null;
    }

    const mediaData = await evoRes.json();
    if (!mediaData?.base64) return null;

    const cleanBase64 = mediaData.base64.replace(/^data:[^;]+;base64,/, "");
    const mimetype: string = mediaData.mimetype || "application/octet-stream";
    const caption: string = mediaData.caption || "";

    // 2) Prompt según tipo de archivo
    let promptInstruccion =
      "Analiza este archivo y extrae con precisión todo el contenido relevante, listas de útiles escolares, nombres de productos, marcas, cantidades y notas:";
    if (mimetype.includes("pdf")) {
      promptInstruccion =
        "Lee con total exactitud este documento PDF escolar o comercial. Extrae la lista completa de útiles, materiales, marcas y cantidades requeridas:";
    } else if (mimetype.includes("image")) {
      promptInstruccion =
        "Lee con precisión esta imagen (foto de lista de útiles, catálogo o producto). Extrae todos los productos escritos o visibles con sus cantidades y especificaciones:";
    } else if (mimetype.includes("audio") || mimetype.includes("ogg")) {
      promptInstruccion = "Transcribe con exactitud lo que dice este audio de WhatsApp en español:";
    }

    // 3) Intentar con varios modelos y claves (fallback en 503/sobrecarga)
    const apiKeys = [GEMINI_API_KEY, GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];
    let textoExtraido: string | null = null;

    outer: for (const apiKey of apiKeys) {
      for (const modelo of MODELOS_VISION) {
        textoExtraido = await llamarGeminiVision(cleanBase64, mimetype, promptInstruccion, apiKey, modelo);
        if (textoExtraido) break outer;
        // Pequeña pausa antes de probar el siguiente modelo
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!textoExtraido) return null;

    const textoFinal = caption
      ? `[Comentario: ${caption}]\n\n[Contenido del archivo adjunto]:\n${textoExtraido}`
      : `[Contenido del archivo adjunto]:\n${textoExtraido}`;

    return { texto: textoFinal, tipo: mimetype };
  } catch (err: any) {
    console.error("[Media Extractor Error]:", err?.message || err);
    return null;
  }
}
