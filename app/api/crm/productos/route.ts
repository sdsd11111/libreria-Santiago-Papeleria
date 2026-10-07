import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const busqueda = (searchParams.get("q") || "").trim();
  const categoria = (searchParams.get("categoria") || "").trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  let whereClauses: string[] = ["1=1"];
  let params: any[] = [];

  if (categoria) {
    whereClauses.push("categoria = ?");
    params.push(categoria);
  }

  if (busqueda) {
    whereClauses.push("(nombre LIKE ? OR codigo LIKE ? OR subcategoria LIKE ?)");
    const like = `%${busqueda}%`;
    params.push(like, like, like);
  }

  const whereSql = whereClauses.join(" AND ");

  const [totalRes] = await q<any>(`SELECT COUNT(*) AS total FROM bot_productos WHERE ${whereSql}`, params);
  const total = totalRes?.total ?? 0;

  const productos = await q<any>(
    `SELECT id, codigo, categoria, subcategoria, nombre, precio, precio_iva, stock, activo
     FROM bot_productos
     WHERE ${whereSql}
     ORDER BY categoria ASC, nombre ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Obtener lista única de categorías y estadísticas rápidas
  const categorias = await q<any>(
    `SELECT categoria, COUNT(*) as cantidad FROM bot_productos GROUP BY categoria ORDER BY cantidad DESC`
  );

  return NextResponse.json({
    total,
    productos,
    categorias,
    limit,
    offset,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codigo, categoria, subcategoria, nombre, precio, stock, unidad } = body;

    if (!nombre || precio == null) {
      return NextResponse.json({ error: "Nombre y precio son requeridos" }, { status: 400 });
    }

    const p = parseFloat(precio) || 0;
    const precio_iva = +(p * 1.15).toFixed(2);

    const res: any = await q(
      `INSERT INTO bot_productos (empresa, codigo, categoria, subcategoria, nombre, precio, precio_iva, unidad, stock, activo)
       VALUES ('santiago', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        codigo || null,
        categoria || "Papelería",
        subcategoria || null,
        nombre.trim(),
        p,
        precio_iva,
        unidad || "UNIDAD",
        stock != null ? parseInt(stock, 10) : 50,
      ]
    );

    return NextResponse.json({ ok: true, id: res?.insertId ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, codigo, categoria, subcategoria, nombre, precio, stock, activo } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const p = parseFloat(precio) || 0;
    const precio_iva = +(p * 1.15).toFixed(2);

    await q<any>(
      `UPDATE bot_productos
       SET codigo = ?, categoria = ?, subcategoria = ?, nombre = ?, precio = ?, precio_iva = ?, stock = ?, activo = ?
       WHERE id = ?`,
      [
        codigo || null,
        categoria || "Papelería",
        subcategoria || null,
        nombre,
        p,
        precio_iva,
        stock != null ? parseInt(stock, 10) : 0,
        activo ? 1 : 0,
        id,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
