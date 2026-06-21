const { Client } = require("pg");
const dns = require("dns");

const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "sa-east-1",
  "ca-central-1",
  "me-central-1"
];

async function checkRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  return new Promise((resolve) => {
    dns.resolve4(host, async (err, addresses) => {
      if (err) {
        resolve({ region, resolved: false });
        return;
      }
      console.log(`Region ${region} resolved to:`, addresses);
      
      // Try to connect to this pooler
      const client = new Client({
        user: "postgres.gmbwrhdoyoinkmtrtbnr",
        password: "D$C#3RbT_%XG7a?",
        host: host,
        port: 6543, // Transaction mode port
        database: "postgres",
        ssl: { rejectUnauthorized: false }
      });
      try {
        await client.connect();
        console.log(`SUCCESS! Connected successfully to region: ${region}`);
        await client.end();
        resolve({ region, resolved: true, success: true });
      } catch (connErr) {
        console.log(`Failed to connect to region ${region}:`, connErr.message);
        resolve({ region, resolved: true, success: false });
      }
    });
  });
}

async function main() {
  console.log("Checking regions...");
  for (const region of regions) {
    const res = await checkRegion(region);
    if (res.success) {
      console.log(`Found working region: ${region}`);
      break;
    }
  }
}

main().catch(console.error);
