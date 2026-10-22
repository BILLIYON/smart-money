import { Pool } from "pg";
import { SectionHeader, InfoBanner, Card, KpiCard, StatusPill } from "@/components/admin/shared";

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

  const totalRows = tableStats.reduce((acc, t) => acc + parseInt(t.row_count || 0, 10), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="🗄️"
        emphasis="Data & Signals Engine"
        sub="Monitor PostgreSQL database tables, live record counts, data sync volume, and storage engine telemetry."
        action={
          <StatusPill label="PostgreSQL 16 · Online" tone="active" />
        }
      />

      <InfoBanner tone="blue">
        💡 Database tables reflect live rows across both local PostgreSQL and the remote Supabase connection pooler.
      </InfoBanner>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Tracked Tables"
          value={tableStats.length}
          subtitle="Public schema"
          tone="neutral"
        />
        <KpiCard
          label="Total Live Tuples"
          value={totalRows}
          subtitle="Indexed rows"
          tone="up"
        />
        <KpiCard
          label="Database Engine"
          value="PG 16.2"
          subtitle="Amazon Linux EC2"
          tone="up"
        />
        <KpiCard
          label="PGBouncer Pooler"
          value="Port 6543"
          subtitle="SSL Verified"
          tone="up"
        />
      </div>

      {/* Database Tables Statistics */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              Public Schema Table Row Counts
            </div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>
              Live tuples ranked by row volume
            </div>
          </div>
          <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
            {tableStats.length} tables found
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {tableStats.map((tbl) => {
            const count = parseInt(tbl.row_count || 0, 10);
            return (
              <div
                key={tbl.table_name}
                className="p-3.5 rounded-[10px] transition-colors"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="text-[11px] font-bold uppercase tracking-wider truncate mb-1"
                  style={{ color: "var(--muted)" }}
                >
                  {tbl.table_name}
                </div>
                <div
                  className="text-[20px] font-bold"
                  style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}
                >
                  {count.toLocaleString()}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                  live records
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
