const fs = require('fs');

/**
 * Pure JS PDF text extraction fallback.
 * Decodes text streams (BT ... ET) and text operators (Tj, TJ, '),
 * handles FlateDecode streams if zlib is present.
 */
function extractTextFromPdfBuffer(buffer) {
  const zlib = require('zlib');
  let fullText = "";

  const content = buffer.toString('binary');
  
  // Find all stream objects: stream ... endstream
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(content)) !== null) {
    let rawStream = match[1];
    let decodedText = "";

    // Attempt zlib inflate if binary compressed
    try {
      const streamBuf = Buffer.from(rawStream, 'binary');
      const decompressed = zlib.inflateSync(streamBuf);
      decodedText = decompressed.toString('utf-8');
    } catch {
      // If uncompressed or raw ascii
      decodedText = rawStream;
    }

    // Extract text inside (text) Tj or [(text)] TJ or BT ... ET blocks
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(decodedText)) !== null) {
      fullText += tjMatch[1] + " ";
    }

    // Extract text in TJ arrays [(str1) 20 (str2)] TJ
    const arrayTjRegex = /\[\s*((?:\((?:[^)]+)\)|[\d\s-]+)+)\s*\]\s*TJ/gi;
    let arrayMatch;
    while ((arrayMatch = arrayTjRegex.exec(decodedText)) !== null) {
      const inner = arrayMatch[1];
      const strMatches = [...inner.matchAll(/\(([^)]+)\)/g)];
      const lineStr = strMatches.map(m => m[1]).join("");
      fullText += lineStr + "\n";
    }
  }

  // Fallback: if no streams matched, search for raw text strings in parentheses
  if (!fullText.trim()) {
    const rawMatches = [...content.matchAll(/\(([^)]+)\)/g)];
    fullText = rawMatches.map(m => m[1]).join(" ");
  }

  return fullText;
}

const samplePdf = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [] /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj
4 0 obj <</Length 44>> stream
BT /F1 24 Tf 100 100 Td (12/05/2024 GTBank Transfer ₦150,000.00 CR) Tj ET
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000338 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
412
%%EOF`;

console.log("Extracted PDF text:", extractTextFromPdfBuffer(Buffer.from(samplePdf)));
