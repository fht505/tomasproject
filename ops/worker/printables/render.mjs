// Rasterize SVG pages at 300dpi and assemble them into a PDF.
// PDFs are what buyers expect from a printable listing; PNG previews are what
// sells it in the listing photos. Both come from the same SVG source.
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// pt sizes for the PDF page boxes
const PT = { letter: [612, 792], a4: [595.28, 841.89] };

export async function svgToPng(svg) {
  return sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();
}

export async function pagesToPdf(svgPages, size, outPath) {
  const doc = await PDFDocument.create();
  for (const svg of svgPages) {
    const png = await svgToPng(svg);
    const img = await doc.embedPng(png);
    const [w, h] = PT[size];
    const page = doc.addPage([w, h]);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  const bytes = await doc.save();
  writeFileSync(outPath, bytes);
  return outPath;
}

export function outDir(product) {
  const d = join(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '../../digital', product);
  mkdirSync(d, { recursive: true });
  return d;
}
