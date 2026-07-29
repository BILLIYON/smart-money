const fs = require('fs');

try {
  const pdfParse = require('pdf-parse');
  console.log("pdf-parse exports:", pdfParse);
  
  // Test PDFParse constructor:
  try {
    const { PDFParse } = require('pdf-parse');
    console.log("PDFParse class:", PDFParse);
    const parser = new PDFParse({ data: Buffer.from("test") });
  } catch (err) {
    console.error("PDFParse constructor failed:", err.message);
  }

  // Test standard function call:
  try {
    const pdf = require('pdf-parse');
    pdf(Buffer.from("%PDF-1.4 test")).then(data => {
      console.log("pdf-parse function success, text:", data.text);
    }).catch(err => {
      console.log("pdf-parse function call error (expected for dummy buffer):", err.message);
    });
  } catch (err) {
    console.error("pdf-parse function call failed:", err.message);
  }

} catch (err) {
  console.error("Failed to require pdf-parse:", err);
}
