const fs = require("fs");
const path = require("path");

try {
  const { PDFParse } = require("pdf-parse");
  const pdfBuffer = fs.readFileSync(path.join(__dirname, "../PRD.pdf"));
  console.log("Read PRD.pdf. Buffer size:", pdfBuffer.length);

  const parser = new PDFParse({ data: pdfBuffer });
  
  (async () => {
    console.log("Extracting text...");
    const text = await parser.getText();
    console.log("Extracted text successfully!");
    console.log("Text length:", text.text.length);
    console.log("Snippet:", text.text.substring(0, 200));
  })();
} catch (err) {
  console.error("Error:", err);
}
