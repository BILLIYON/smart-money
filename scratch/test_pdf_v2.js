const fs = require('fs');

async function testPdfV2() {
  try {
    const pdfParseModule = require('pdf-parse');
    console.log("pdfParseModule:", pdfParseModule);
    
    // In pdf-parse v2, PDFParse is exported or pdfParse(buffer) or pdfParse.pdf(buffer)
    const { PDFParse } = pdfParseModule;
    console.log("PDFParse type:", typeof PDFParse);

    if (typeof PDFParse === 'function') {
      try {
        // Test PDFParse constructor or static method
        console.log("PDFParse prototype:", Object.getOwnPropertyNames(PDFParse.prototype));
        console.log("PDFParse properties:", Object.keys(PDFParse));
      } catch (err) {
        console.error("PDFParse inspect error:", err);
      }
    }
  } catch (err) {
    console.error("Error requiring pdf-parse:", err);
  }
}

testPdfV2();
