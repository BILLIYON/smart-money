import { getAdminStats, getRecentSignups } from "@/lib/db";

export const metadata = { title: "Overview · Admin · Smart Money" };

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmt(iso);
}

const KPI_ICONS: Record<string, string> = {
  "Total Users": "👥",
  "Active Buddies": "🤖",
  "Pending Approvals": "⏳",
  "Messages Today": "💬",
};

export default async function AdminOverviewPage() {
  const [stats, signups] = await Promise.all([
    getAdminStats(),
    getRecentSignups(),
  ]);

  const kpis = [
    { label: "Total Users", value: stats.totalUsers },
    { label: "Active Buddies", value: stats.activeBuddies },
    { label: "Pending Approvals", value: stats.pendingApprovals },
    { label: "Messages Today", value: stats.messagesToday },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
        Overview
      </h1>
      <p style={{ fontSize: 14, color: "#6B7A99", marginBottom: 28 }}>
        Platform snapshot as of {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
      </p>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginBottom: 32,
        }}
      >
        {kpis.map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: "24px 24px 20px",
              boxShadow: "0 1px 4px rgba(11,30,61,.06)",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 12 }}>{KPI_ICONS[label]}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#0B1E3D", lineHeight: 1, marginBottom: 8 }}>
              {value.toLocaleString()}
            </div>
            <div style={{ fontSize: 14, color: "#6B7A99" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Signups */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 1px 4px rgba(11,30,61,.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E7F0" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1E3D" }}>Recent Sign-ups</div>
          <div style={{ fontSize: 13, color: "#6B7A99", marginTop: 2 }}>Last 20 new accounts</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F4F6FB" }}>
              {["Email", "Plan", "Joined", "Last Active"].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "10px 24px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7A99",
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signups.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{ padding: "32px 24px", textAlign: "center", fontSize: 14, color: "#6B7A99" }}
                >
                  No users yet.
                </td>
              </tr>
            )}
            {signups.map((user, i) => (
              <tr
                key={user.id}
                style={{
                  borderTop: i > 0 ? "1px solid #E2E7F0" : undefined,
                }}
              >
                <td style={{ padding: "14px 24px", fontSize: 13, color: "#0B1E3D" }}>
                  {user.email ?? "—"}
                </td>
                <td style={{ padding: "14px 24px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: user.plan === "pro" ? "rgba(0,196,140,.12)" : "rgba(107,122,153,.1)",
                      color: user.plan === "pro" ? "#00A677" : "#6B7A99",
                      textTransform: "capitalize",
                    }}
                  >
                    {user.plan}
                  </span>
                </td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: "#6B7A99" }}>
                  {fmt(user.created_at)}
                </td>
                <td style={{ padding: "14px 24px", fontSize: 13, color: "#6B7A99" }}>
                  {fmtRelative(user.last_active)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
