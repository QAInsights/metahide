const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const dir = path.join(__dirname, 'icons');
const source = path.join(dir, 'MetaHide.png');

// --- PNG helpers ---

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function readChunks(buf) {
  const chunks = [];
  let offset = 8; // skip PNG signature
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    chunks.push({ type, data });
    offset += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  const chunks = readChunks(buf);

  const ihdr = chunks.find(c => c.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];

  // Concatenate all IDAT chunks and decompress
  const idatData = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data));
  const raw = zlib.inflateSync(idatData);

  // Determine bytes per pixel
  let bpp;
  if (colorType === 2) bpp = 3;       // RGB
  else if (colorType === 6) bpp = 4;   // RGBA
  else if (colorType === 0) bpp = 1;   // Grayscale
  else if (colorType === 4) bpp = 2;   // Grayscale+Alpha
  else throw new Error('Unsupported color type: ' + colorType);

  if (bitDepth !== 8) throw new Error('Only 8-bit PNGs supported');

  // Unfilter rows (supports filter types 0-4)
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const outStart = y * stride;

    for (let x = 0; x < stride; x++) {
      const curByte = raw[rowStart + x];
      const a = x >= bpp ? pixels[outStart + x - bpp] : 0;
      const b = y > 0 ? pixels[outStart - stride + x] : 0;
      const c = (x >= bpp && y > 0) ? pixels[outStart - stride + x - bpp] : 0;

      let val;
      switch (filterType) {
        case 0: val = curByte; break;
        case 1: val = (curByte + a) & 0xFF; break;
        case 2: val = (curByte + b) & 0xFF; break;
        case 3: val = (curByte + Math.floor((a + b) / 2)) & 0xFF; break;
        case 4: val = (curByte + paethPredictor(a, b, c)) & 0xFF; break;
        default: val = curByte;
      }
      pixels[outStart + x] = val;
    }
  }

  return { width, height, bpp, colorType, pixels };
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Bilinear resize
function resize(src, targetSize) {
  const { width: sw, height: sh, bpp, pixels: srcPx } = src;
  const tw = targetSize, th = targetSize;
  const out = Buffer.alloc(tw * th * bpp);

  for (let y = 0; y < th; y++) {
    const srcY = (y + 0.5) * sh / th - 0.5;
    const y0 = Math.max(0, Math.floor(srcY));
    const y1 = Math.min(sh - 1, y0 + 1);
    const fy = srcY - y0;

    for (let x = 0; x < tw; x++) {
      const srcX = (x + 0.5) * sw / tw - 0.5;
      const x0 = Math.max(0, Math.floor(srcX));
      const x1 = Math.min(sw - 1, x0 + 1);
      const fx = srcX - x0;

      for (let ch = 0; ch < bpp; ch++) {
        const v00 = srcPx[(y0 * sw + x0) * bpp + ch];
        const v10 = srcPx[(y0 * sw + x1) * bpp + ch];
        const v01 = srcPx[(y1 * sw + x0) * bpp + ch];
        const v11 = srcPx[(y1 * sw + x1) * bpp + ch];
        const top = v00 + (v10 - v00) * fx;
        const bot = v01 + (v11 - v01) * fx;
        out[(y * tw + x) * bpp + ch] = Math.round(top + (bot - top) * fy);
      }
    }
  }

  return { width: tw, height: th, bpp, colorType: src.colorType, pixels: out };
}

function encodePng(img) {
  const { width, height, bpp, colorType, pixels } = img;
  const stride = width * bpp;

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;

  // Raw image data with filter byte 0 per row
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // no filter
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// --- Main ---

console.log('Reading ' + source + '...');
const srcImg = decodePng(source);
console.log('Source: ' + srcImg.width + 'x' + srcImg.height + ', bpp=' + srcImg.bpp);

[16, 48, 128].forEach(size => {
  const resized = resize(srcImg, size);
  const png = encodePng(resized);
  const outPath = path.join(dir, 'icon' + size + '.png');
  fs.writeFileSync(outPath, png);
  console.log('Created icon' + size + '.png (' + png.length + ' bytes)');
});

console.log('Done.');
