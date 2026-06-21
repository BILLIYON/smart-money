async function test() {
  const url = "http://localhost:3000/api/chat";
  console.log(`Testing AI chat endpoint via ${url}...`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buddyId: "buffett",
        messages: [{ role: "user", content: "Hello Warren, what is your basic advice for retail investors?" }],
        databankContext: {
          currency: "NGN",
          monthlySummary: { totalIncome: 50000000, totalExpenses: 30000000, savingsRate: 0.4 }
        }
      })
    });

    console.log("Response status:", res.status);
    if (!res.ok) {
      const err = await res.text();
      console.error("Error response:", err);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    console.log("Streaming response:");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      process.stdout.write(decoder.decode(value));
    }
    console.log("\nStream complete!");
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
