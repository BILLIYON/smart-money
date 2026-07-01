const http = require("http");

console.log("Sending GET request to http://localhost:3000/databank/print ...");
const req = http.get("http://localhost:3000/databank/print", (res) => {
  console.log("STATUS CODE:", res.statusCode);
  console.log("HEADERS:", JSON.stringify(res.headers, null, 2));
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log("BODY LENGTH:", data.length);
    console.log("BODY (first 1000 chars):", data.substring(0, 1000));
  });
});

req.on("error", (err) => {
  console.error("ERROR EVENT TRIGGERED:");
  console.error(err);
});
