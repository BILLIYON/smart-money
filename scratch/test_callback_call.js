async function test() {
  const url = "http://localhost:3000/api/auth/google/callback?state=%2Fdatabank&iss=https%3A%2F%2Faccounts.google.com&code=testcode";
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, { redirect: "manual" });
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log("Body length:", body.length);
    console.log("Body preview:", body.substring(0, 500));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
