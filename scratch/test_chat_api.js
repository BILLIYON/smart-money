const http = require('http');

const postData = JSON.stringify({
  buddyId: "contrarian",
  messages: [
    { role: "user", content: "Hello! What is your investing philosophy?" }
  ],
  databankContext: {
    monthlySummary: {
      totalIncome: 1000000,
      totalExpenses: 400000,
      savingsRate: 0.6
    }
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log("Sending test request to /api/chat...");
const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  
  res.on('end', () => {
    console.log('\n--- Stream finished ---');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
