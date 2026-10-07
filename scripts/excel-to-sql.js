const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('muestra lista de precios sin iva.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Saltar header y filtrar filas vacías
const rows = data.slice(1).filter(r => r[3] && r[4] && r[5] !== '');

function esc(s) {
  return String(s || '').replace(/'/g, "''").replace(/\\/g, '\\\\').trim().slice(0, 200);
}

let sql = 'TRUNCATE TABLE bot_productos;\n\n';
const batchSize = 100;

for (let b = 0; b < rows.length; b += batchSize) {
  const batch = rows.slice(b, b + batchSize);
  sql += 'INSERT INTO bot_productos (codigo, empresa, nombre, descripcion, categoria, subcategoria, precio, precio_iva, stock, activo) VALUES\n';
  const vals = batch.map(function(r) {
    const cat = esc(r[2] || r[1]); // Subcategoría específica (CUADERNOS, BOLIGRAFOS, etc.)
    const sub = esc(r[1]); // ESCOLAR
    const cod = esc(r[3]);
    const nom = esc(r[4]);
    const pvp = parseFloat(r[5]) || 0;
    const iva = +(pvp * 1.15).toFixed(2);
    return "('" + cod + "','santiago','" + nom + "',NULL,'" + cat + "','" + sub + "'," + pvp.toFixed(4) + "," + iva + ",50,1)";
  });
  sql += vals.join(',\n') + ';\n\n';
}

fs.writeFileSync('sql/004_productos_santiago.sql', sql);
console.log('SQL generado con éxito para:', rows.length, 'productos');
