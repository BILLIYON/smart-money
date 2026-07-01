const http = require("http");

http.get("http://localhost:3000/buddies/contrarian", (res) => {
  let body = "";
  res.on("data", (chunk) => { body += chunk; });
  res.on("end", () => {
    // Strip HTML tags to find the text error message
    const cleanText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    console.log("STATUS:", res.statusCode);
    console.log("CLEAN BODY TEXT:");
    console.log(cleanText.substring(0, 2000));
  });
});
