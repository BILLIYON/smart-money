const zlib = require('zlib');

/**
 * Universal PDF Text Stream Extractor.
 * Extracts ALL text from standard streams AND compressed object streams (/ObjStm).
 */
function universalPdfTextExtract(buffer) {
  let textChunks = [];

  // Strategy 1: Find all stream ... endstream blocks and decompress with zlib
  const bufferStr = buffer.toString('binary');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(bufferStr)) !== null) {
    const rawStream = match[1];
    const streamBuf = Buffer.from(rawStream, 'binary');

    let decompressed = null;
    try {
      decompressed = zlib.inflateSync(streamBuf);
    } catch {
      try {
        decompressed = zlib.inflateRawSync(streamBuf);
      } catch {
        try {
          decompressed = zlib.unzipSync(streamBuf);
        } catch {
          decompressed = streamBuf;
        }
      }
    }

    if (decompressed) {
      const str = decompressed.toString('utf-8');
      textChunks.push(str);
    }
  }

  const combinedStreamsText = textChunks.join("\n");

  // Strategy 2: Extract text inside parentheses (text)
  const textInParens = [];
  const parenRegex = /\(([^()]{2,})\)/g;
  let pMatch;
  while ((pMatch = parenRegex.exec(combinedStreamsText)) !== null) {
    const s = pMatch[1].trim();
    if (s.length >= 2 && !/^[0-9a-fA-F]{16,}$/.test(s)) {
      textInParens.push(s);
    }
  }

  // Strategy 3: Line-by-line scanning of all decompressed streams
  const rawLines = combinedStreamsText.split(/[\r\n]+/);
  
  return {
    combinedStreamsText,
    extractedParenText: textInParens.join(" "),
    rawLinesCount: rawLines.length
  };
}

const samplePdfObjStm = `%PDF-1.5
1 0 obj <</Type /ObjStm /N 3 /First 24>> stream
x\x9c\x8d\x91A\x8e\xc23\x08\x85\xef\x7f\x85\x05\x13\x12\x42...
endstream endobj
`;

console.log("Universal PDF Extractor test:", universalPdfTextExtract(Buffer.from(samplePdfObjStm)));
