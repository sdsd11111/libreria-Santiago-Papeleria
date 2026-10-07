require('dotenv').config({ path: '.env.local' });

async function testBunny() {
  const { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_HOST, BUNNY_PULLZONE_URL } = process.env;

  console.log('--- Configuración Bunny CDN ---');
  console.log('Zone:   ', BUNNY_STORAGE_ZONE);
  console.log('Host:   ', BUNNY_STORAGE_HOST);
  console.log('Key:    ', BUNNY_STORAGE_API_KEY?.slice(0, 8) + '...');
  console.log('CDN URL:', BUNNY_PULLZONE_URL);
  console.log('');

  // 1) Subir un archivo de prueba (texto simple)
  const testContent = Buffer.from('test-conexion-santiago-papeleria-' + Date.now());
  const testFile = 'test/conexion-ok.txt';

  console.log('Subiendo archivo de prueba...');
  const putRes = await fetch(
    `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${testFile}`,
    {
      method: 'PUT',
      headers: {
        AccessKey: BUNNY_STORAGE_API_KEY,
        'Content-Type': 'text/plain',
      },
      body: new Uint8Array(testContent),
    }
  );

  console.log('PUT status:', putRes.status, putRes.statusText);
  if (!putRes.ok) {
    const errText = await putRes.text();
    console.error('ERROR al subir:', errText);
    return;
  }

  console.log('✅ Archivo subido correctamente!');

  // 2) Verificar acceso vía Pull Zone
  const cdnUrl = `${BUNNY_PULLZONE_URL}/${testFile}`;
  console.log('Verificando acceso CDN:', cdnUrl);

  // Pequeño delay para que el CDN propague
  await new Promise(r => setTimeout(r, 1500));

  const getRes = await fetch(cdnUrl);
  console.log('GET CDN status:', getRes.status);
  if (getRes.ok) {
    const text = await getRes.text();
    console.log('✅ CDN accesible! Contenido:', text.slice(0, 50));
  } else {
    console.warn('⚠️  CDN devolvió:', getRes.status, '(puede tardar unos segundos en propagar)');
  }

  // 3) Borrar el archivo de test
  const delRes = await fetch(
    `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${testFile}`,
    { method: 'DELETE', headers: { AccessKey: BUNNY_STORAGE_API_KEY } }
  );
  console.log('DELETE status:', delRes.status, delRes.ok ? '✅ limpio' : '⚠️  no borrado');

  console.log('\n=== Bunny CDN funcionando correctamente ===');
}

testBunny().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
