const fs = require('fs');

async function testPdfUsage() {
  try {
    const { PDFParse } = require('pdf-parse');
    
    // Create a dummy PDF buffer or minimal valid PDF buffer
    // A minimal valid PDF 1.4:
    const minimalPdf = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [] /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj
4 0 obj <</Length 44>> stream
BT /F1 24 Tf 100 100 Td (GTBank Alert ₦50,000) Tj ET
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

    const buffer = Buffer.from(minimalPdf);

    console.log("Testing new PDFParse({ data: buffer })...");
    try {
      const instance = new PDFParse({ data: buffer });
      console.log("Instance created:", instance);
      const res = await instance.getText();
      console.log("res text:", res);
    } catch (err) {
      console.error("Instance error:", err);
    }

    console.log("\nTesting PDFParse constructor with ArrayBuffer / Uint8Array...");
    try {
      const uint8 = new Uint8Array(buffer);
      const instance = new PDFParse(uint8);
      console.log("Instance uint8 created:", instance);
      const textResult = await instance.getText();
      console.log("Text result:", textResult);
    } catch (err) {
      console.error("Uint8Array instance error:", err);
    }

  } catch (err) {
    console.error("General error:", err);
  }
}

testPdfUsage();
