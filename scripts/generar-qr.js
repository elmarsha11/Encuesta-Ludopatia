// Genera los QR de las dos encuestas a partir de la dirección pública del servidor.
//
//   npm run qr -- https://encuesta-ludopatia.onrender.com
//
// Deja en qr/ un PNG grande (para imprimir) y un SVG (se agranda sin perder calidad) por
// encuesta. Son QR ESTÁTICOS: contienen la dirección directa y funcionan para siempre.
// Los generadores web «gratuitos» suelen hacer QR dinámicos, que pasan por un servidor
// de ellos y se desactivan al terminar la prueba gratis.

import { mkdirSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { ENCUESTAS } from '../backend/encuestas/index.js';

const base = process.argv[2];
let url;
try {
  url = new URL(base);
} catch {
  console.error('Uso: npm run qr -- https://<tu-servicio>.onrender.com');
  process.exit(1);
}
if (url.protocol !== 'https:') {
  console.error('La dirección tiene que empezar con https:// (sin el candado, el navegador avisa que no es segura).');
  process.exit(1);
}

// Corrección de errores «M»: el QR se sigue leyendo aunque se manche o se arrugue un 15%.
const opciones = { errorCorrectionLevel: 'M', margin: 4 };
mkdirSync('qr', { recursive: true });
for (const id of Object.keys(ENCUESTAS)) {
  const destino = new URL(`/${id}/`, url).href;
  await QRCode.toFile(`qr/${id}.png`, destino, { ...opciones, width: 1200 });
  writeFileSync(`qr/${id}.svg`, await QRCode.toString(destino, { ...opciones, type: 'svg' }));
  console.log(`${id}: ${destino} → qr/${id}.png y qr/${id}.svg`);
}
console.log('\nAntes de imprimir: escaneá cada QR con un celular y verificá que abre la encuesta correcta.');
