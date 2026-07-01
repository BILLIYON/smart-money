const http = require("http");

console.log("Sending GET request to http://localhost:3000/marketplace ...");
const start = Date.now();

const req = http.get("http://localhost:3000/marketplace", (res) => {
  console.log(`Response received in ${Date.now() - start}ms`);
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);

  let body = "";
  res.on("data", (chunk) => {
    body += chunk;
  });

  res.on("end", () => {
    console.log("BODY length:", body.length);
    console.log("BODY start:", body.substring(0, 800));
  });
});

req.on("error", (e) => {
  console.error("Request failed:", e.message);
});

req.setTimeout(5000, () => {
  console.error("Request timed out after 5000ms!");
  req.destroy();
});
