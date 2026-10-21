/**
 * Generates resources/icon.ico using Node.js built-ins only.
 * Creates BMP-based ICO (universally compatible, including NSIS/Windows XP+).
 * Sizes: 256, 48, 32, 16
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, "../resources/icon.ico");

// ──────────────────────────────────────────────────────────
// Colour helpers
// ──────────────────────────────────────────────────────────
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// SpeakFlow brand: cyan-500 → blue-600 diagonal gradient + "S"
const CYAN = [6, 182, 212];   // RGB
const BLUE = [37, 99, 235];

function getPixel(x, y, sz) {
  const cx = sz / 2, cy = sz / 2;
  const r = sz * 0.46;   // circle radius
  const t = (x + y) / (sz * 2); // gradient factor 0..1

  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded square mask (corner radius ≈ 22% of size)
  const cr = sz * 0.22;
  const ax = Math.abs(dx) - (sz / 2 - cr);
  const ay = Math.abs(dy) - (sz / 2 - cr);
  const outside = Math.sqrt(Math.max(ax, 0) ** 2 + Math.max(ay, 0) ** 2) > cr
    ? (ax > 0 || ay > 0) : false;

  if (outside) return [0, 0, 0, 0]; // transparent

  const R = lerp(CYAN[0], BLUE[0], t);
  const G = lerp(CYAN[1], BLUE[1], t);
  const B = lerp(CYAN[2], BLUE[2], t);
  return [R, G, B, 255];
}

// Very simple bitmap "S" drawn pixel-by-pixel at given scale
// We use a 5×7 font grid
const S_MASK_5x7 = [
  [0,1,1,1,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [0,1,1,0,0],
  [0,0,0,1,1],
  [0,0,0,0,1],
  [0,1,1,1,0],
];

function drawPixels(sz) {
  // BGRA array (BMP format is bottom-to-top, BGRA)
  const pixels = new Uint8Array(sz * sz * 4);

  // Fill with gradient background
  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      const [R, G, B, A] = getPixel(x, y, sz);
      const i = ((sz - 1 - y) * sz + x) * 4; // BMP = bottom-to-top
      pixels[i + 0] = B;
      pixels[i + 1] = G;
      pixels[i + 2] = R;
      pixels[i + 3] = A;
    }
  }

  // Draw "S" in white
  const cellW  = sz * 0.10;          // cell width
  const cellH  = sz * 0.10;          // cell height
  const cols   = 5, rows = 7;
  const glyW   = cellW * cols;
  const glyH   = cellH * rows;
  const offX   = Math.round((sz - glyW) / 2);
  const offY   = Math.round((sz - glyH) / 2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!S_MASK_5x7[row][col]) continue;
      const px0 = Math.round(offX + col * cellW);
      const py0 = Math.round(offY + row * cellH);
      const px1 = Math.round(offX + (col + 1) * cellW);
      const py1 = Math.round(offY + (row + 1) * cellH);
      for (let py = py0; py < py1; py++) {
        for (let px = px0; px < px1; px++) {
          if (px < 0 || px >= sz || py < 0 || py >= sz) continue;
          const i = ((sz - 1 - py) * sz + px) * 4;
          pixels[i + 0] = 255; // B
          pixels[i + 1] = 255; // G
          pixels[i + 2] = 255; // R
          pixels[i + 3] = 255; // A
        }
      }
    }
  }

  return pixels;
}

// ──────────────────────────────────────────────────────────
// BMP DIB builder for ICO (BITMAPINFOHEADER + XOR + AND)
// ──────────────────────────────────────────────────────────
function buildBmpDib(sz, pixels) {
  const rowBytes  = sz * 4;                       // 32-bit BGRA
  const pixBytes  = sz * sz * 4;
  // AND mask: 1 bit per pixel, row padded to DWORD (4 bytes)
  const maskRowBytes = Math.ceil(sz / 32) * 4;
  const maskBytes = sz * maskRowBytes;

  const buf = Buffer.alloc(40 + pixBytes + maskBytes);
  let o = 0;

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40,          o);      o += 4; // biSize
  buf.writeInt32LE(sz,           o);      o += 4; // biWidth
  buf.writeInt32LE(sz * 2,       o);      o += 4; // biHeight (×2 for ICO)
  buf.writeUInt16LE(1,           o);      o += 2; // biPlanes
  buf.writeUInt16LE(32,          o);      o += 2; // biBitCount
  buf.writeUInt32LE(0,           o);      o += 4; // biCompression (BI_RGB)
  buf.writeUInt32LE(pixBytes,    o);      o += 4; // biSizeImage
  buf.writeInt32LE(0,            o);      o += 4; // biXPelsPerMeter
  buf.writeInt32LE(0,            o);      o += 4; // biYPelsPerMeter
  buf.writeUInt32LE(0,           o);      o += 4; // biClrUsed
  buf.writeUInt32LE(0,           o);      o += 4; // biClrImportant

  // XOR mask (pixel data, BGRA bottom-to-top — already in that order)
  Buffer.from(pixels).copy(buf, o);
  o += pixBytes;

  // AND mask: 0 = opaque where alpha=255, 1 = transparent elsewhere
  for (let row = 0; row < sz; row++) {          // row 0 = bottom of image
    for (let col = 0; col < sz; col++) {
      const pi = (row * sz + col) * 4;
      const transparent = pixels[pi + 3] < 128 ? 1 : 0;
      const byteIdx = o + row * maskRowBytes + Math.floor(col / 8);
      const bitPos  = 7 - (col % 8);
      buf[byteIdx] |= (transparent << bitPos);
    }
  }

  return buf;
}

// ──────────────────────────────────────────────────────────
// ICO assembler
// ──────────────────────────────────────────────────────────
const SIZES = [256, 48, 32, 16];

const dibs = SIZES.map(sz => buildBmpDib(sz, drawPixels(sz)));

const icoHeaderSize = 6;
const dirEntrySize  = 16;
const totalDirSize  = dirEntrySize * SIZES.length;
let   offset        = icoHeaderSize + totalDirSize;

const parts = [];

// ICONDIR
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: ICO
header.writeUInt16LE(SIZES.length, 4);
parts.push(header);

// ICONDIRENTRY per image
for (let i = 0; i < SIZES.length; i++) {
  const sz  = SIZES[i];
  const wh  = sz >= 256 ? 0 : sz;
  const dib = dibs[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(wh,          0);  // width
  entry.writeUInt8(wh,          1);  // height
  entry.writeUInt8(0,           2);  // color count
  entry.writeUInt8(0,           3);  // reserved
  entry.writeUInt16LE(1,        4);  // planes
  entry.writeUInt16LE(32,       6);  // bit count
  entry.writeUInt32LE(dib.length, 8);
  entry.writeUInt32LE(offset,  12);
  offset += dib.length;
  parts.push(entry);
}

// Image data
for (const dib of dibs) parts.push(dib);

writeFileSync(OUT, Buffer.concat(parts));
console.log(`icon.ico written → ${OUT}  (${Buffer.concat(parts).length} bytes)`);
