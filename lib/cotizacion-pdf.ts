import PDFDocument from "pdfkit";

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
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const azulOscuro = "#0f172a";
      const azulPrimario = "#2563eb";
      const grisBorde = "#e2e8f0";
      const grisTexto = "#475569";
      const grisFondo = "#f8fafc";

      // ── Encabezado / Branding ────────────────────────────────
      // Barra decorativa superior
      doc.rect(40, 40, 515, 6).fill(azulPrimario);

      // Título empresa
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(azulOscuro)
        .text("SANTIAGO PAPELERÍA", 40, 60);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(grisTexto)
        .text("RUC: 1100000000001 · Matriz: Calle 10 de Agosto y Bernardo Valdivieso · Loja, Ecuador", 40, 88)
        .text("Teléfono: +593 96 341 0409 · Atención y Envíos a todo el país", 40, 100);

      // Badge Cotización
      doc.roundedRect(380, 58, 175, 55, 6).fillAndStroke(grisFondo, grisBorde);
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(azulPrimario)
        .text("PROFORMA / COTIZACIÓN", 390, 68, { width: 155, align: "center" });

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(azulOscuro)
        .text(`N° ${params.numero}`, 390, 85, { width: 155, align: "center" });

      const fechaHoy = new Date().toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(grisTexto)
        .text(`Fecha: ${fechaHoy}`, 390, 100, { width: 155, align: "center" });

      // ── Datos del Cliente ────────────────────────────────────
      doc.roundedRect(40, 125, 515, 52, 6).fillAndStroke(grisFondo, grisBorde);

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(azulPrimario)
        .text("DATOS DEL CLIENTE", 52, 133);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(azulOscuro)
        .text(`Cliente: `, 52, 148, { continued: true })
        .font("Helvetica")
        .text(params.clienteNombre || "Consumidor Final");

      const subCliente = [];
      if (params.clienteTelefono) subCliente.push(`Tel: ${params.clienteTelefono}`);
      if (params.clienteCiudad) subCliente.push(`Ciudad: ${params.clienteCiudad}`);

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(grisTexto)
        .text(subCliente.join("  |  ") || "Cotización solicitada por asistente virtual WhatsApp", 52, 162);

      // ── Tabla de Productos ───────────────────────────────────
      const yTabla = 190;
      doc.rect(40, yTabla, 515, 24).fill(azulOscuro);

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#ffffff")
        .text("CANT", 48, yTabla + 7, { width: 40, align: "center" })
        .text("DESCRIPCIÓN DEL PRODUCTO", 95, yTabla + 7)
        .text("P. UNIT", 400, yTabla + 7, { width: 65, align: "right" })
        .text("TOTAL", 480, yTabla + 7, { width: 65, align: "right" });

      let currY = yTabla + 24;
      let subtotal = 0;

      params.items.forEach((item, index) => {
        const itemTotal = item.cantidad * item.precioUnitario;
        subtotal += itemTotal;

        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, currY, 515, 20).fill(rowBg);

        // Borde inferior sutil
        doc.moveTo(40, currY + 20).lineTo(555, currY + 20).strokeColor(grisBorde).stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(azulOscuro)
          .text(String(item.cantidad), 48, currY + 5, { width: 40, align: "center" });

        const nombreTexto = item.codigo ? `[${item.codigo}] ${item.nombre}` : item.nombre;
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(azulOscuro)
          .text(nombreTexto, 95, currY + 5, { width: 295, lineBreak: false, ellipsis: true });

        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(grisTexto)
          .text(`$${item.precioUnitario.toFixed(2)}`, 400, currY + 5, { width: 65, align: "right" });

        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(azulOscuro)
          .text(`$${itemTotal.toFixed(2)}`, 480, currY + 5, { width: 65, align: "right" });

        currY += 20;
      });

      // ── Bloque de Totales ────────────────────────────────────
      const iva = subtotal * 0.15; // IVA 15% vigente en Ecuador
      const totalGeneral = subtotal + iva;

      currY += 12;
      const xTotales = 360;
      const wTotales = 195;

      doc.roundedRect(xTotales, currY, wTotales, 74, 6).fillAndStroke(grisFondo, grisBorde);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(grisTexto)
        .text("Subtotal:", xTotales + 12, currY + 10)
        .text(`$${subtotal.toFixed(2)}`, xTotales + 12, currY + 10, { width: wTotales - 24, align: "right" });

      doc
        .text("IVA (15%):", xTotales + 12, currY + 28)
        .text(`$${iva.toFixed(2)}`, xTotales + 12, currY + 28, { width: wTotales - 24, align: "right" });

      doc.moveTo(xTotales + 10, currY + 46).lineTo(xTotales + wTotales - 10, currY + 46).strokeColor(grisBorde).stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(azulPrimario)
        .text("TOTAL USD:", xTotales + 12, currY + 52)
        .text(`$${totalGeneral.toFixed(2)}`, xTotales + 12, currY + 52, { width: wTotales - 24, align: "right" });

      // ── Notas y Términos ────────────────────────────────────
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(azulOscuro)
        .text("CONDICIONES COMERCIALES:", 40, currY + 10);

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(grisTexto)
        .text("• Precios válidos por 5 días calendario o hasta agotar existencias.", 40, currY + 22)
        .text("• Entrega inmediata en tienda o envíos a nivel nacional.", 40, currY + 34)
        .text("• Facturación electrónica con datos de consumidor final o RUC.", 40, currY + 46)
        .text("• Formas de pago: Transferencia directa, tarjeta o efectivo en sucursal.", 40, currY + 58);

      // Pie de página
      doc
        .font("Helvetica-Oblique")
        .fontSize(7.5)
        .fillColor("#94a3b8")
        .text(
          "Generado automáticamente por el asistente de Santiago Papelería · Gracias por su preferencia.",
          40,
          770,
          { align: "center", width: 515 }
        );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
