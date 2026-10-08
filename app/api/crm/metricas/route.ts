import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Métricas generales
  const [stats] = await q<any>(`
    SELECT
      COUNT(*) AS total_conversaciones,
      SUM(bot_activo = 1) AS con_bot,
      SUM(bot_activo = 0 AND estado = 'ESCALADO') AS escaladas,
      SUM(bot_activo = 0 AND estado = 'HUMANO') AS con_humano,
      SUM(DATE(creado_en) = CURDATE()) AS hoy
    FROM bot_conversaciones
  `);

  // Leads: contactos que tienen al menos un dato capturado (nombre, correo, cédula, ciudad)
  const [leads] = await q<any>(`
    SELECT COUNT(*) AS total FROM bot_contactos
    WHERE nombre IS NOT NULL OR (datos IS NOT NULL AND datos != 'null' AND datos != '{}')
  `);

  // Proformas generadas: contar desde bot_trazas donde se llamó generar_cotizacion_pdf
  // Es la fuente exacta — bot_trazas registra qué herramientas usó el modelo en cada turno
  const [proformas] = await q<any>(`
    SELECT COUNT(DISTINCT conversacion_id) AS total FROM bot_trazas
    WHERE tools_llamadas LIKE '%generar_cotizacion_pdf%'
  `);


  // Paso a ventas: eventos registrados cuando se genera una proforma
  const [pasoVentas] = await q<any>(`
    SELECT COUNT(*) AS total FROM bot_eventos
    WHERE tipo = 'paso_a_ventas'
  `);

  // Intenciones más frecuentes
  const intenciones = await q<any>(`
    SELECT intencion, COUNT(*) AS n
    FROM bot_conversaciones
    WHERE intencion IS NOT NULL
    GROUP BY intencion
    ORDER BY n DESC
    LIMIT 12
  `);

  // Intenciones agrupadas por empresa / canal
  const porEmpresa = await q<any>(`
    SELECT empresa, intencion, COUNT(*) AS n
    FROM bot_conversaciones
    WHERE intencion IS NOT NULL
    GROUP BY empresa, intencion
  `);

  // Actividad últimos 7 días con desglose
  const porDia = await q<any>(`
    SELECT 
      DATE_FORMAT(creado_en, '%Y-%m-%d') AS dia, 
      COUNT(*) AS n,
      SUM(CASE WHEN empresa = 'santiago' THEN 1 ELSE 0 END) AS santiago_n,
      SUM(CASE WHEN bot_activo = 0 THEN 1 ELSE 0 END) AS escalados_n
    FROM bot_conversaciones
    WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE_FORMAT(creado_en, '%Y-%m-%d')
    ORDER BY dia ASC
  `);

  // Clientes esperando asesor
  const [esperando] = await q<any>(`
    SELECT COUNT(*) AS n FROM bot_conversaciones c
    JOIN bot_mensajes m ON m.conversacion_id = c.id
    WHERE c.bot_activo = 0 AND c.estado NOT IN ('ESCALADO','HUMANO')
    AND m.id = (SELECT MAX(id) FROM bot_mensajes WHERE conversacion_id = c.id)
    AND m.rol = 'cliente'
  `);

  // Inyectar "Pasó a ventas" como intención sintética (viene de bot_eventos, no de bot_conversaciones)
  // para que aparezca en la sección "Qué consultaron los clientes"
  const pasoVentasN = pasoVentas?.total || 0;
  const proformasN = proformas?.total || 0;

  // Asegurarnos de que "Proforma generada" SIEMPRE aparezca (aunque esté en 0)
  const intentcionesFinal = [...intenciones];

  // Agregar "Pasó a ventas" si tiene eventos y no está ya en la lista
  if (pasoVentasN > 0 && !intentcionesFinal.find((i: any) => i.intencion === 'Pasó a ventas')) {
    intentcionesFinal.push({ intencion: 'Pasó a ventas', n: pasoVentasN });
  }

  // "Proforma generada" siempre visible en las cards
  if (!intentcionesFinal.find((i: any) => i.intencion === 'Proforma generada')) {
    intentcionesFinal.push({ intencion: 'Proforma generada', n: proformasN });
  }

  // Reordenar por n desc
  intentcionesFinal.sort((a: any, b: any) => b.n - a.n);

  return NextResponse.json({
    stats: {
      ...stats,
      leads: leads?.total || 0,
      esperando: esperando?.n || 0,
      proformas: proformasN,
      paso_ventas: pasoVentasN,
    },
    intenciones: intentcionesFinal,
    porDia,
    porEmpresa,
  });
}
