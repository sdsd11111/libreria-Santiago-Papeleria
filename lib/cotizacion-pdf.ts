import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ItemCotizacion {
  codigo?: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CotizacionParams {
  numero: string;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteCiudad?: string;
  items: ItemCotizacion[];
  observaciones?: string;
}

export async function generarPdfCotizacion(params: CotizacionParams): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  const azul = rgb(0.145, 0.388, 0.922);   // #2563eb
  const oscuro = rgb(0.059, 0.090, 0.165);  // #0f172a
  const gris = rgb(0.282, 0.337, 0.412);   // #475569
  const blanco = rgb(1, 1, 1);

  let y = height - 40;

  // ── Barra superior azul ───────────────────────────────────
  page.drawRectangle({ x: 40, y: y - 6, width: width - 80, height: 6, color: azul });
  y -= 20;

  // ── Nombre empresa ────────────────────────────────────────
  page.drawText("SANTIAGO PAPELERÍA", {
    x: 40, y: y - 22, size: 22, font: fontBold, color: oscuro,
  });

  // ── Datos empresa ─────────────────────────────────────────
  page.drawText("RUC: 1190000000001  ·  Matriz: Azuay 152-48, Loja, Ecuador", {
    x: 40, y: y - 40, size: 8, font: fontReg, color: gris,
  });
  page.drawText("Tel: (07) 257-3358  ·  WhatsApp: 0987667459  ·  ventas@santiagopapeleria.com", {
    x: 40, y: y - 52, size: 8, font: fontReg, color: gris,
  });

  // ── Badge cotización (derecha) ────────────────────────────
  page.drawRectangle({ x: 390, y: y - 60, width: 165, height: 55, color: rgb(0.973, 0.984, 0.992), borderColor: rgb(0.886, 0.910, 0.941), borderWidth: 1 });
  page.drawText("PROFORMA / COTIZACIÓN", { x: 398, y: y - 20, size: 9, font: fontBold, color: azul });
  page.drawText(`N° ${params.numero}`, { x: 398, y: y - 35, size: 10, font: fontBold, color: oscuro });
  const fechaHoy = new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
  page.drawText(`Fecha: ${fechaHoy}`, { x: 398, y: y - 48, size: 8, font: fontReg, color: gris });

  y -= 75;

  // ── Datos del cliente ─────────────────────────────────────
  page.drawRectangle({ x: 40, y: y - 50, width: width - 80, height: 50, color: rgb(0.973, 0.984, 0.992), borderColor: rgb(0.886, 0.910, 0.941), borderWidth: 1 });
  page.drawText("DATOS DEL CLIENTE", { x: 52, y: y - 15, size: 8, font: fontBold, color: azul });
  page.drawText(`Cliente: ${params.clienteNombre || "Consumidor Final"}`, { x: 52, y: y - 28, size: 10, font: fontBold, color: oscuro });
  const subCliente = [params.clienteTelefono && `Tel: ${params.clienteTelefono}`, params.clienteCiudad && `Ciudad: ${params.clienteCiudad}`].filter(Boolean).join("  |  ");
  if (subCliente) page.drawText(subCliente, { x: 52, y: y - 42, size: 8, font: fontReg, color: gris });

  y -= 65;

  // ── Encabezado tabla ──────────────────────────────────────
  page.drawRectangle({ x: 40, y: y - 22, width: width - 80, height: 22, color: oscuro });
  page.drawText("CANT", { x: 48, y: y - 15, size: 8, font: fontBold, color: blanco });
  page.drawText("DESCRIPCIÓN DEL PRODUCTO", { x: 95, y: y - 15, size: 8, font: fontBold, color: blanco });
  page.drawText("P.UNIT", { x: 420, y: y - 15, size: 8, font: fontBold, color: blanco });
  page.drawText("TOTAL", { x: 490, y: y - 15, size: 8, font: fontBold, color: blanco });
  y -= 22;

  // ── Filas de productos ────────────────────────────────────
  let subtotal = 0;
  params.items.forEach((item, idx) => {
    const rowColor = idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.973, 0.984, 0.992);
    const itemTotal = item.cantidad * item.precioUnitario;
    subtotal += itemTotal;

    page.drawRectangle({ x: 40, y: y - 18, width: width - 80, height: 18, color: rowColor });
    page.drawLine({ start: { x: 40, y: y - 18 }, end: { x: width - 40, y: y - 18 }, color: rgb(0.886, 0.910, 0.941), thickness: 0.5 });

    page.drawText(String(item.cantidad), { x: 55, y: y - 12, size: 8, font: fontBold, color: oscuro });

    // Truncar nombre si es muy largo
    const nombre = item.nombre.length > 55 ? item.nombre.substring(0, 55) + "…" : item.nombre;
    page.drawText(nombre, { x: 95, y: y - 12, size: 8, font: fontReg, color: oscuro });

    page.drawText(`$${item.precioUnitario.toFixed(2)}`, { x: 415, y: y - 12, size: 8, font: fontReg, color: gris });
    page.drawText(`$${itemTotal.toFixed(2)}`, { x: 490, y: y - 12, size: 8, font: fontBold, color: oscuro });

    y -= 18;
    if (y < 120) {
      // Si se acaba el espacio, continuar (simplificado para MVP)
    }
  });

  y -= 15;

  // ── Totales ───────────────────────────────────────────────
  const iva = subtotal * 0.15;
  const total = subtotal + iva;

  page.drawRectangle({ x: 360, y: y - 72, width: 195, height: 72, color: rgb(0.973, 0.984, 0.992), borderColor: rgb(0.886, 0.910, 0.941), borderWidth: 1 });
  page.drawText("Subtotal:", { x: 372, y: y - 18, size: 9, font: fontReg, color: gris });
  page.drawText(`$${subtotal.toFixed(2)}`, { x: 490, y: y - 18, size: 9, font: fontReg, color: oscuro });
  page.drawText("IVA (15%):", { x: 372, y: y - 36, size: 9, font: fontReg, color: gris });
  page.drawText(`$${iva.toFixed(2)}`, { x: 490, y: y - 36, size: 9, font: fontReg, color: oscuro });
  page.drawLine({ start: { x: 370, y: y - 48 }, end: { x: 545, y: y - 48 }, color: rgb(0.886, 0.910, 0.941), thickness: 0.5 });
  page.drawText("TOTAL USD:", { x: 372, y: y - 62, size: 11, font: fontBold, color: azul });
  page.drawText(`$${total.toFixed(2)}`, { x: 490, y: y - 62, size: 11, font: fontBold, color: azul });

  y -= 90;

  // ── Condiciones ───────────────────────────────────────────
  page.drawText("CONDICIONES COMERCIALES:", { x: 40, y: y, size: 8, font: fontBold, color: oscuro });
  const conds = [
    "• Precios válidos por 5 días calendario o hasta agotar existencias.",
    "• Entrega inmediata en tienda o envíos a nivel nacional.",
    "• Facturación electrónica con cédula / RUC del consumidor.",
    "• Formas de pago: Efectivo, tarjeta, transferencia bancaria.",
  ];
  conds.forEach((c, i) => {
    page.drawText(c, { x: 40, y: y - 12 - i * 12, size: 7.5, font: fontReg, color: gris });
  });

  // ── Pie de página ─────────────────────────────────────────
  page.drawText(
    "Generado automáticamente por el asistente de Santiago Papelería  ·  Gracias por su preferencia.",
    { x: 40, y: 20, size: 7, font: fontReg, color: rgb(0.580, 0.639, 0.722) }
  );

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
