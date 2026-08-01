async function check() {
  const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/login`, { method: "HEAD" });
      console.log(`Port ${port}: success, status = ${res.status}`);
    } catch (e) {
      console.log(`Port ${port}: failed - ${e.message}`);
    }
  }
}
check();
