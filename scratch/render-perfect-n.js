const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Read the exact user image
const userImgPath = 'C:\\Users\\mrity\\.gemini\\antigravity-ide\\brain\\3327a879-d8eb-4d98-bae2-76a176c6c7c1\\.user_uploaded\\media_1786811743357.png';
const userBuf = fs.readFileSync(userImgPath);

// Function to decode simple PNG
function decodePNG(buffer) {
  let offset = 8;
  let width, height, bitDepth, colorType;
  let idatBuffers = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatBuffers.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const idat = Buffer.concat(idatBuffers);
  const decompressed = zlib.inflateSync(idat);

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
  const pixels = Buffer.alloc(width * height * 4);

  let srcOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcOffset++];
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (bytesPerPixel === 4) {
        pixels[dstIdx] = decompressed[srcOffset++];
        pixels[dstIdx + 1] = decompressed[srcOffset++];
        pixels[dstIdx + 2] = decompressed[srcOffset++];
        pixels[dstIdx + 3] = decompressed[srcOffset++];
      } else if (bytesPerPixel === 3) {
        pixels[dstIdx] = decompressed[srcOffset++];
        pixels[dstIdx + 1] = decompressed[srcOffset++];
        pixels[dstIdx + 2] = decompressed[srcOffset++];
        pixels[dstIdx + 3] = 255;
      }
    }
  }

  return { width, height, pixels };
}

function encodePNG(width, height, rgbaBuffer) {
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let scanOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[scanOffset++] = 0;
    const row = rgbaBuffer.slice(y * width * 4, (y + 1) * width * 4);
    row.copy(scanlines, scanOffset);
    scanOffset += width * 4;
  }

  const compressed = zlib.deflateSync(scanlines);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([length, typeBuf, data, crcBuf]);
  }

  function crc32(buf) {
    let table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    let c = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
    }
    return (c ^ (-1)) >>> 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const decoded = decodePNG(userBuf);
console.log('Decoded source image:', decoded.width, 'x', decoded.height);

// Generate crisp, centered 1024x1024 canvas
const TARGET_SIZE = 1024;
const canvas = Buffer.alloc(TARGET_SIZE * TARGET_SIZE * 4, 255); // Pure solid white background

// Scale N logo to fill 70% of canvas height
const targetH = Math.round(TARGET_SIZE * 0.70);
const scale = targetH / decoded.height;
const targetW = Math.round(decoded.width * scale);

const startX = Math.round((TARGET_SIZE - targetW) / 2);
const startY = Math.round((TARGET_SIZE - targetH) / 2);

// Bilinear interpolation for smooth edges
for (let y = 0; y < targetH; y++) {
  const srcYFloat = (y / targetH) * (decoded.height - 1);
  const y0 = Math.floor(srcYFloat);
  const y1 = Math.min(y0 + 1, decoded.height - 1);
  const yFrac = srcYFloat - y0;

  for (let x = 0; x < targetW; x++) {
    const srcXFloat = (x / targetW) * (decoded.width - 1);
    const x0 = Math.floor(srcXFloat);
    const x1 = Math.min(x0 + 1, decoded.width - 1);
    const xFrac = srcXFloat - x0;

    const idx00 = (y0 * decoded.width + x0) * 4;
    const idx10 = (y0 * decoded.width + x1) * 4;
    const idx01 = (y1 * decoded.width + x0) * 4;
    const idx11 = (y1 * decoded.width + x1) * 4;

    const r0 = decoded.pixels[idx00] * (1 - xFrac) + decoded.pixels[idx10] * xFrac;
    const r1 = decoded.pixels[idx01] * (1 - xFrac) + decoded.pixels[idx11] * xFrac;
    const r = Math.round(r0 * (1 - yFrac) + r1 * yFrac);

    const g0 = decoded.pixels[idx00 + 1] * (1 - xFrac) + decoded.pixels[idx10 + 1] * xFrac;
    const g1 = decoded.pixels[idx01 + 1] * (1 - xFrac) + decoded.pixels[idx11 + 1] * xFrac;
    const g = Math.round(g0 * (1 - yFrac) + g1 * yFrac);

    const b0 = decoded.pixels[idx00 + 2] * (1 - xFrac) + decoded.pixels[idx10 + 2] * xFrac;
    const b1 = decoded.pixels[idx01 + 2] * (1 - xFrac) + decoded.pixels[idx11 + 2] * xFrac;
    const b = Math.round(b0 * (1 - yFrac) + b1 * yFrac);

    const a0 = decoded.pixels[idx00 + 3] * (1 - xFrac) + decoded.pixels[idx10 + 3] * xFrac;
    const a1 = decoded.pixels[idx01 + 3] * (1 - xFrac) + decoded.pixels[idx11 + 3] * xFrac;
    const a = (a0 * (1 - yFrac) + a1 * yFrac) / 255;

    const dstX = startX + x;
    const dstY = startY + y;

    if (dstX >= 0 && dstX < TARGET_SIZE && dstY >= 0 && dstY < TARGET_SIZE) {
      const dstIdx = (dstY * TARGET_SIZE + dstX) * 4;
      canvas[dstIdx] = Math.round(r * a + 255 * (1 - a));
      canvas[dstIdx + 1] = Math.round(g * a + 255 * (1 - a));
      canvas[dstIdx + 2] = Math.round(b * a + 255 * (1 - a));
      canvas[dstIdx + 3] = 255;
    }
  }
}

const finalPng = encodePNG(TARGET_SIZE, TARGET_SIZE, canvas);
console.log('Final 1024x1024 PNG size:', finalPng.length);

const assetsDir = path.join(__dirname, '..', 'assets');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), finalPng);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), finalPng);
fs.writeFileSync(path.join(assetsDir, 'android-icon-foreground.png'), finalPng);
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), finalPng);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), finalPng);

console.log('All asset icons updated with crisp N logo!');
