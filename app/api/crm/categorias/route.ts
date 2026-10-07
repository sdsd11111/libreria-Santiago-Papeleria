import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";

// GET: listar todas las categorías con su imagen principal y su galería (incluyendo etiquetas)
export async function GET() {
  try {
    const categorias = await q<any>(
      `SELECT c.id, c.categoria, c.url_imagen, c.descripcion,
              COUNT(p.id) AS total_productos
       FROM bot_categorias_img c
       LEFT JOIN bot_productos p ON p.categoria = c.categoria
       GROUP BY c.id
       ORDER BY c.categoria ASC`
    );

    const galeriaRows = await q<any>(
      `SELECT g.id, g.categoria, g.url_imagen, g.etiquetas, g.producto_id,
              p.nombre AS producto_nombre, p.precio AS producto_precio
       FROM bot_categorias_galeria g
       LEFT JOIN bot_productos p ON p.id = g.producto_id
       ORDER BY g.id ASC`
    );

    const galeriaMap: Record<string, any[]> = {};
    for (const row of galeriaRows) {
      if (!galeriaMap[row.categoria]) galeriaMap[row.categoria] = [];
      galeriaMap[row.categoria].push({
        id: row.id,
        url: row.url_imagen,
        etiquetas: row.etiquetas || "",
        producto_id: row.producto_id || null,
        producto_nombre: row.producto_nombre || null,
        producto_precio: row.producto_precio || null,
      });
    }

    const resultado = categorias.map((cat: any) => ({
      ...cat,
      galeria: galeriaMap[cat.categoria] || [],
    }));

    return NextResponse.json({ categorias: resultado });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: subir una o varias imágenes a Bunny CDN y guardar en galería / principal
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("imagenes") as File[];
    const singleFile = formData.get("imagen") as File | null;
    const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);

    const categoria = (formData.get("categoria") as string || "").trim();
    const descripcion = (formData.get("descripcion") as string || "").trim();
    const etiquetas = (formData.get("etiquetas") as string || "").trim();
    const productoId = formData.get("producto_id") ? parseInt(formData.get("producto_id") as string, 10) : null;

    if (allFiles.length === 0 || !categoria) {
      return NextResponse.json({ error: "Se requiere al menos una imagen y la categoría" }, { status: 400 });
    }

    const { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_HOST, BUNNY_PULLZONE_URL } = process.env;
    if (!BUNNY_STORAGE_API_KEY || !BUNNY_STORAGE_ZONE) {
      return NextResponse.json({ error: "Bunny CDN no configurado" }, { status: 500 });
    }

    const slug = categoria
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const subidas: string[] = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const fileName = `categorias/${slug}_${Date.now()}_${randomSuffix}.webp`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadRes = await fetch(
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

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        return NextResponse.json({ error: `Error Bunny al subir imagen ${i + 1}: ${err}` }, { status: 500 });
      }

      const urlImagen = `${BUNNY_PULLZONE_URL}/${fileName}`;
      subidas.push(urlImagen);

      // Guardar en galería con etiquetas y producto_id opcionales
      await q<any>(
        `INSERT INTO bot_categorias_galeria (categoria, url_imagen, etiquetas, producto_id) VALUES (?, ?, ?, ?)`,
        [categoria, urlImagen, etiquetas || null, productoId || null]
      );
    }

    // Si la categoría aún no tiene imagen principal, establecer la primera subida
    const existing = await q<any>(
      `SELECT url_imagen FROM bot_categorias_img WHERE categoria = ? LIMIT 1`,
      [categoria]
    );

    if (existing.length > 0 && !existing[0].url_imagen && subidas.length > 0) {
      await q<any>(
        `UPDATE bot_categorias_img SET url_imagen = ?, descripcion = COALESCE(?, descripcion) WHERE categoria = ?`,
        [subidas[0], descripcion || null, categoria]
      );
    } else if (descripcion) {
      await q<any>(
        `UPDATE bot_categorias_img SET descripcion = ? WHERE categoria = ?`,
        [descripcion, categoria]
      );
    }

    return NextResponse.json({ ok: true, subidas, total: subidas.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: quitar una imagen específica de galería o imagen principal
export async function DELETE(req: NextRequest) {
  try {
    const { categoria, imagenId, esPrincipal } = await req.json();
    if (!categoria) return NextResponse.json({ error: "categoría requerida" }, { status: 400 });

    if (imagenId) {
      // Eliminar de galería
      await q<any>(`DELETE FROM bot_categorias_galeria WHERE id = ? AND categoria = ?`, [imagenId, categoria]);
    } else if (esPrincipal) {
      // Quitar solo la principal
      await q<any>(`UPDATE bot_categorias_img SET url_imagen = NULL WHERE categoria = ?`, [categoria]);
    } else {
      // Limpiar todo si no especifica id
      await q<any>(`UPDATE bot_categorias_img SET url_imagen = NULL WHERE categoria = ?`, [categoria]);
      await q<any>(`DELETE FROM bot_categorias_galeria WHERE categoria = ?`, [categoria]);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: establecer una imagen como principal O actualizar sus etiquetas y producto asociado
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { accion, categoria, url_imagen, imagenId, etiquetas, producto_id } = body;

    // Acción 1: Actualizar etiquetas / producto vinculado a una foto específica
    if (accion === "actualizar_etiquetas" || imagenId) {
      await q<any>(
        `UPDATE bot_categorias_galeria
         SET etiquetas = ?, producto_id = ?
         WHERE id = ?`,
        [etiquetas ? String(etiquetas).trim() : null, producto_id ? parseInt(producto_id, 10) : null, imagenId]
      );
      return NextResponse.json({ ok: true });
    }

    // Acción 2: Fijar como principal de categoría
    if (!categoria || !url_imagen) {
      return NextResponse.json({ error: "categoria y url_imagen requeridos" }, { status: 400 });
    }

    await q<any>(
      `UPDATE bot_categorias_img SET url_imagen = ? WHERE categoria = ?`,
      [url_imagen, categoria]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
