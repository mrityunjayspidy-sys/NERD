const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Read source PNG
const srcPath = 'C:\\Users\\mrity\\.gemini\\antigravity-ide\\brain\\3327a879-d8eb-4d98-bae2-76a176c6c7c1\\.user_uploaded\\media_1786811743357.png';
const buf = fs.readFileSync(srcPath);

// Function to decode simple PNG
function decodePNG(buffer) {
  let offset = 8; // skip signature
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

  // Parse scanlines (supports RGBA 8-bit or RGB 8-bit)
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
  const pixels = Buffer.alloc(width * height * 4); // RGBA output

  let srcOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcOffset++];
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (bytesPerPixel === 4) {
        pixels[dstIdx] = decompressed[srcOffset++];     // R
        pixels[dstIdx + 1] = decompressed[srcOffset++]; // G
        pixels[dstIdx + 2] = decompressed[srcOffset++]; // B
        pixels[dstIdx + 3] = decompressed[srcOffset++]; // A
      } else if (bytesPerPixel === 3) {
        pixels[dstIdx] = decompressed[srcOffset++];     // R
        pixels[dstIdx + 1] = decompressed[srcOffset++]; // G
        pixels[dstIdx + 2] = decompressed[srcOffset++]; // B
        pixels[dstIdx + 3] = 255;                       // A
      }
    }
  }

  return { width, height, pixels };
}

// Function to encode uncompressed PNG
function encodePNG(width, height, rgbaBuffer) {
  // Create scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let scanOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[scanOffset++] = 0; // Filter None
    const row = rgbaBuffer.slice(y * width * 4, (y + 1) * width * 4);
    row.copy(scanlines, scanOffset);
    scanOffset += width * 4;
  }

  const compressed = zlib.deflateSync(scanlines);

  // Build PNG chunks
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

  // Simple CRC32 implementation
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
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

try {
  const decoded = decodePNG(buf);
  console.log('Decoded source image:', decoded.width, 'x', decoded.height);

  // Create a 1024x1024 canvas with white background
  const TARGET_SIZE = 1024;
  const canvas = Buffer.alloc(TARGET_SIZE * TARGET_SIZE * 4, 255); // all white RGBA (255,255,255,255)

  // Scale factor to fit inside 62% safe zone for Android adaptive icon
  const safeTargetHeight = Math.round(TARGET_SIZE * 0.64);
  const scale = safeTargetHeight / decoded.height;
  const scaledWidth = Math.round(decoded.width * scale);
  const scaledHeight = safeTargetHeight;

  const startX = Math.round((TARGET_SIZE - scaledWidth) / 2);
  const startY = Math.round((TARGET_SIZE - scaledHeight) / 2);

  // Nearest-neighbor / bilinear resample onto white canvas
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const srcX = Math.min(Math.floor(x / scale), decoded.width - 1);
      const srcY = Math.min(Math.floor(y / scale), decoded.height - 1);

      const srcIdx = (srcY * decoded.width + srcX) * 4;
      const r = decoded.pixels[srcIdx];
      const g = decoded.pixels[srcIdx + 1];
      const b = decoded.pixels[srcIdx + 2];
      const a = decoded.pixels[srcIdx + 3];

      const dstX = startX + x;
      const dstY = startY + y;
      if (dstX >= 0 && dstX < TARGET_SIZE && dstY >= 0 && dstY < TARGET_SIZE) {
        const dstIdx = (dstY * TARGET_SIZE + dstX) * 4;
        // Blend over white
        const alpha = a / 255;
        canvas[dstIdx] = Math.round(r * alpha + 255 * (1 - alpha));
        canvas[dstIdx + 1] = Math.round(g * alpha + 255 * (1 - alpha));
        canvas[dstIdx + 2] = Math.round(b * alpha + 255 * (1 - alpha));
        canvas[dstIdx + 3] = 255;
      }
    }
  }

  const finalPng = encodePNG(TARGET_SIZE, TARGET_SIZE, canvas);
  console.log('Encoded 1024x1024 padded PNG size:', finalPng.length);

  const assetsDir = path.join(__dirname, '..', 'assets');
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), finalPng);
  fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), finalPng);
  fs.writeFileSync(path.join(assetsDir, 'android-icon-foreground.png'), finalPng);
  fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), finalPng);
  fs.writeFileSync(path.join(assetsDir, 'favicon.png'), finalPng);

  console.log('All icons generated and written successfully!');
} catch (e) {
  console.error('Error generating padded icons:', e);
}
