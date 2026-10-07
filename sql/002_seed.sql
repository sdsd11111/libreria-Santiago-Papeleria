-- DATOS DEMO Santiago Papelería.
-- Sucursales e info basada en investigación pública oficial.
-- Promociones, precios y stock son DEMO para el MVP.
SET NAMES utf8mb4;

DELETE FROM bot_sucursales;
DELETE FROM bot_promociones;
DELETE FROM bot_faqs;
DELETE FROM bot_config;

-- ---------- SUCURSALES ----------
INSERT INTO bot_sucursales (empresa, nombre, direccion, ciudad, telefono, horario) VALUES
('santiago','Santiago Papelería Matriz','Azuay 152-48 entre 18 de Noviembre y Av. Universitaria','Loja','(07) 257-3358','{"lun-sab":"09:00-19:00","dom":"09:00-14:00"}'),
('santiago','Mega Santiago','18 de Noviembre entre Azuay y Miguel Riofrío','Loja','098 766 7459','{"lun-sab":"09:00-19:00","dom":"09:00-14:00"}'),
('santiago','Almacén Universitario UTPL','Campus UTPL, Loja','Loja',NULL,'{"lun-vie":"08:00-18:00","sab":"08:00-13:00"}'),
('santiago','Almacén Universitario UIDE','Campus UIDE, Loja','Loja',NULL,'{"lun-vie":"08:00-18:00","sab":"08:00-13:00"}'),
('santiago','Bodega Santiago Papelería','Azuay y Av. Universitaria, Loja','Loja','096 308 8155','{"lun-vie":"08:00-17:00"}');

-- ---------- PROMOCIONES DEMO ----------
INSERT INTO bot_promociones (empresa, titulo, descripcion, desde, hasta) VALUES
('santiago','Martes y Sábados MAPED','Compras desde $5 en productos MAPED en tiendas físicas participan en premios instantáneos.','2026-01-01','2026-12-31'),
('santiago','Bolígrafo Unicornio Lentejuela','De $0,85 a $0,68. Disponible en tiendas físicas.','2026-09-01','2026-12-31'),
('santiago','Palillo Madera Krafty Kids','De $2,10 a $1,89. Disponible en tiendas físicas.','2026-09-01','2026-12-31'),
('santiago','Sin recargo con tarjeta','Pago con tarjetas Visa, Mastercard, American Express, Diners, Discover y Alia sin recargo adicional.','2026-01-01','2026-12-31');

-- ---------- FAQS ----------
INSERT INTO bot_faqs (empresa, tema, pregunta, respuesta) VALUES
('santiago','pagos','¿Qué formas de pago aceptan?','Aceptamos efectivo, tarjetas de crédito y débito (Visa, Mastercard, American Express, Diners Club, Discover y Alia) sin recargo. Para compras online también se acepta transferencia bancaria y depósito.'),
('santiago','factura','¿Emiten factura con datos?','Sí. Indique su cédula o RUC al momento de pagar y emitimos factura electrónica. Para facturación online: facturas@santiagopapeleria.com'),
('santiago','domicilio','¿Hacen entregas a domicilio?','Para compras en nuestra tienda online (megasantiago.com) contemplamos entrega. Para coordinar entregas o pedidos especiales, puede contactarnos al 0987667459 o escribirnos a ventas@santiagopapeleria.com.'),
('santiago','mayorista','¿Venden al por mayor?','Sí, tenemos canal mayorista para negocios, papelerías y distribuidores. Contáctenos al 0939826491 o 0939522690. También puede gestionar un asesor por este chat.'),
('santiago','maped','¿Son distribuidores de MAPED?','Sí, desde 2025 somos distribuidores oficiales de MAPED para todo Ecuador. Para información mayorista sobre MAPED, contáctenos al canal mayorista.'),
('santiago','empleo','¿Cómo trabajar con Santiago Papelería?','Puede enviar su hoja de vida a administracionsantiago@santiagopapeleria.com o entregarla en cualquiera de nuestras tiendas. También publicamos vacantes en LinkedIn.'),
('santiago','devolucion','¿Cuál es la política de devoluciones?','Los reclamos deben hacerse dentro de los 5 primeros días de la compra. Aceptamos devoluciones si el producto no corresponde a lo facturado, llegó dañado o es diferente a lo publicado. Contáctenos en servicios@santiagopapeleria.com.'),
('santiago','horario','¿Cuál es el horario de atención?','Santiago Papelería Matriz y Mega Santiago atienden de lunes a sábado aproximadamente de 09:00 a 19:00. Domingos de 09:00 a 14:00. Los puntos universitarios atienden de lunes a viernes. Confirme el horario exacto llamando a la sucursal.'),
('santiago','envio','¿Hacen envíos a otras ciudades?','Sí, através de nuestra tienda online megasantiago.com realizamos envíos. Para consultar disponibilidad de envío a su ciudad, puede escribirnos al 0987667459.'),
('santiago','catalogo','¿Dónde veo el catálogo completo?','Nuestro catálogo completo está disponible en la tienda online megasantiago.com con aproximadamente 940 productos indexados.'),
('santiago','contacto','¿Cuál es su teléfono de contacto?','Teléfono principal: (07) 257-3358. WhatsApp ventas al por menor: 0987667459. Mayoristas: 0939826491 o 0939522690.'),
('santiago','tiendaonline','¿Tienen tienda online?','Sí, puede comprar en megasantiago.com. Búsqueda de productos, carrito, pago con tarjeta o transferencia, y seguimiento del pedido.');

-- ---------- CONFIG ----------
INSERT INTO bot_config (clave, valor) VALUES
('horario_asesores','{"zona":"America/Guayaquil","lun-sab":["09:00","19:00"],"dom":null}'),
('mensaje_fuera_horario','"Nuestros asesores atienden de lunes a sábado de 09:00 a 19:00. Le responderemos al inicio de la próxima jornada."');
