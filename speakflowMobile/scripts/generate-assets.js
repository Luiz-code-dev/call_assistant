/**
 * Gera assets PNG placeholder para o Expo.
 * Executa com: node scripts/generate-assets.js
 * Não requer dependências externas — usa apenas Node.js built-in (zlib).
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// CRC32 para PNG
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(width, height, r, g, b, r2, g2, b2) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      // Subtle gradient: blend primary color in center, dark at edges
      const cx = (x - width / 2) / (width / 2);
      const cy = (y - height / 2) / (height / 2);
      const dist = Math.min(1, Math.sqrt(cx * cx + cy * cy));
      const t = 1 - dist * 0.6;
      raw[y * rowSize + 1 + x * 3] = Math.round(r * t + (r2 ?? 9) * (1 - t));
      raw[y * rowSize + 2 + x * 3] = Math.round(g * t + (g2 ?? 9) * (1 - t));
      raw[y * rowSize + 3 + x * 3] = Math.round(b * t + (b2 ?? 11) * (1 - t));
    }
  }
  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

const assetsDir = path.join(__dirname, "..", "assets");
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

// icon.png — 1024x1024 purple gradient
fs.writeFileSync(path.join(assetsDir, "icon.png"), createPNG(1024, 1024, 124, 58, 237));
console.log("✅ assets/icon.png");

// adaptive-icon.png — 1024x1024 (Android foreground)
fs.writeFileSync(path.join(assetsDir, "adaptive-icon.png"), createPNG(1024, 1024, 124, 58, 237));
console.log("✅ assets/adaptive-icon.png");

// splash.png — 1284x2778 dark with purple center
fs.writeFileSync(path.join(assetsDir, "splash.png"), createPNG(1284, 2778, 124, 58, 237, 9, 9, 11));
console.log("✅ assets/splash.png");

// favicon.png — 48x48
fs.writeFileSync(path.join(assetsDir, "favicon.png"), createPNG(48, 48, 124, 58, 237));
console.log("✅ assets/favicon.png");

console.log("\n🎉 Assets gerados com sucesso em /assets/");
