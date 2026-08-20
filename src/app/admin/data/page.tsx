import { Pool } from "pg";

export const metadata = { title: "Data Engine · Admin · Smart Money" };
export const dynamic = "force-dynamic";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export default async function AdminDataPage() {
  const { rows: tableStats } = await localPool.query(`
    SELECT relname as table_name, n_live_tup as row_count
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC;
  `);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Banner */}
      <div style={{ borderBottom: "1px solid #334155", paddingBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
          Data &amp; Signals Engine
        </h1>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>
          Monitor PostgreSQL table statistics, row counts, and storage metrics.
        </p>
      </div>

      {/* Database Tables Statistics */}
      <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#F8FAFC", margin: "0 0 16px" }}>
          PostgreSQL Database Table Row Counts
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {tableStats.map((tbl) => (
            <div
              key={tbl.table_name}
              style={{
                background: "#0F172A",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>
                {tbl.table_name}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", marginTop: 4 }}>
                {parseInt(tbl.row_count || 0, 10).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>live rows</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
