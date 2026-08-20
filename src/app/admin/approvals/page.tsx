import { Pool } from "pg";
import { revalidatePath } from "next/cache";

export const metadata = { title: "Buddy Approvals · Admin · Smart Money" };
export const dynamic = "force-dynamic";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

async function handleStatusChange(formData: FormData) {
  "use server";
  const buddyId = formData.get("buddyId") as string;
  const newStatus = formData.get("status") as string;
  const revisionNote = formData.get("revisionNote") as string;

  if (buddyId && newStatus) {
    await localPool.query(
      `UPDATE buddies SET status = $1, rejection_reason = $2 WHERE id = $3;`,
      [newStatus, revisionNote || null, buddyId]
    );
    revalidatePath("/admin/approvals");
  }
}

export default async function AdminApprovalsPage() {
  const { rows: buddies } = await localPool.query(`
    SELECT id, name, tag, description, philosophy, price_monthly, ai_model, status, rejection_reason, created_at
    FROM buddies
    ORDER BY created_at DESC;
  `);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
            Buddy Submissions Moderation
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>
            Review, publish, or request revisions for AI Finance Buddy submissions.
          </p>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", background: "#1E293B", border: "1px solid #334155", padding: "6px 12px", borderRadius: 6 }}>
          {buddies.length} Total Buddies
        </div>
      </div>

      {/* Buddies Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {buddies.map((buddy) => (
          <div
            key={buddy.id}
            style={{
              background: "#1E293B",
              border: buddy.status === "pending" ? "1px solid #F59E0B" : "1px solid #334155",
              borderRadius: 8,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: buddy.status === "live" ? "rgba(16,185,129,0.1)" : buddy.status === "pending" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)", color: buddy.status === "live" ? "#10B981" : buddy.status === "pending" ? "#F59E0B" : "#EF4444", textTransform: "uppercase" }}>
                  Status: {buddy.status}
                </span>
                <span style={{ fontSize: 11, color: "#64748B" }}>
                  Model: {buddy.ai_model}
                </span>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F8FAFC", margin: "0 0 4px" }}>
                {buddy.name}
              </h3>
              <div style={{ fontSize: 12, color: "#10B981", fontWeight: 500, marginBottom: 8 }}>
                {buddy.tag}
              </div>

              <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5, margin: "0 0 10px" }}>
                {buddy.description}
              </p>

              <div style={{ fontSize: 11, color: "#64748B", background: "#0F172A", border: "1px solid #334155", padding: 8, borderRadius: 6, fontStyle: "italic" }}>
                "{buddy.philosophy}"
              </div>
            </div>

            {/* Form */}
            <form action={handleStatusChange} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid #334155" }}>
              <input type="hidden" name="buddyId" value={buddy.id} />
              
              <input
                type="text"
                name="revisionNote"
                placeholder="Optional revision note..."
                defaultValue={buddy.rejection_reason || ""}
                style={{
                  background: "#0F172A",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: "#F8FAFC",
                  fontSize: 12,
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="submit"
                  name="status"
                  value="live"
                  style={{
                    flex: 1,
                    padding: "6px",
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid #10B981",
                    borderRadius: 6,
                    color: "#10B981",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Approve Live
                </button>

                <button
                  type="submit"
                  name="status"
                  value="review"
                  style={{
                    padding: "6px 10px",
                    background: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#F59E0B",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Request Edits
                </button>

                <button
                  type="submit"
                  name="status"
                  value="draft"
                  style={{
                    padding: "6px 10px",
                    background: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#EF4444",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
