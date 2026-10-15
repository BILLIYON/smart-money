import { Pool } from "pg";
import { revalidatePath } from "next/cache";

export const metadata = { title: "Buddy Approvals · Admin · Smart Money" };
export const dynamic = "force-dynamic";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

import { dbCache } from "@/lib/cache";

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
    dbCache.clear();
    revalidatePath("/admin/approvals");
    revalidatePath("/admin/buddies");
    revalidatePath("/marketplace");
  }
}

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const viewMode = params?.view === "all" ? "all" : "pending";

  const sql = viewMode === "pending"
    ? `SELECT id, name, tag, description, philosophy, price_monthly, ai_model, status, rejection_reason, created_at
       FROM buddies
       WHERE status IN ('pending', 'in_review', 'review')
       ORDER BY created_at DESC;`
    : `SELECT id, name, tag, description, philosophy, price_monthly, ai_model, status, rejection_reason, created_at
       FROM buddies
       ORDER BY created_at DESC;`;

  const { rows: buddies } = await localPool.query(sql);

  const pendingCountRes = await localPool.query(
    `SELECT COUNT(*) FROM buddies WHERE status IN ('pending', 'in_review', 'review');`
  );
  const pendingCount = parseInt(pendingCountRes.rows[0]?.count || "0", 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            Buddy Submissions Moderation
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
            Review, approve live, or request revisions for pending AI Finance Buddy submissions.
          </p>
        </div>

        {/* View mode toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href="/admin/approvals?view=pending"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 6,
              textDecoration: "none",
              background: viewMode === "pending" ? "#00C48C" : "var(--bg)",
              color: viewMode === "pending" ? "#fff" : "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            Pending Approvals ({pendingCount})
          </a>
          <a
            href="/admin/approvals?view=all"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 6,
              textDecoration: "none",
              background: viewMode === "all" ? "#38BDF8" : "var(--bg)",
              color: viewMode === "all" ? "#000" : "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            All Submissions
          </a>
        </div>
      </div>

      {/* Grid or Empty State */}
      {buddies.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
            {viewMode === "pending" ? "No Pending Submissions" : "No Buddies Found"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            {viewMode === "pending"
              ? "All buddy submissions have been moderated! Any new creator submissions will appear here automatically."
              : "No buddy records were found in the database."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {buddies.map((buddy) => {
            const isPending = buddy.status === "pending" || buddy.status === "in_review" || buddy.status === "review";
            const isApproved = buddy.status === "live" || buddy.status === "approved";

            return (
              <div
                key={buddy.id}
                style={{
                  background: "var(--card)",
                  border: isPending ? "2px solid #F59E0B" : "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  boxShadow: "0 2px 8px var(--shadow)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: isApproved ? "rgba(16,185,129,0.15)" : isPending ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      color: isApproved ? "#10B981" : isPending ? "#F59E0B" : "#EF4444",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Status: {isPending ? "Pending Review" : buddy.status}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      Model: {buddy.ai_model}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
                    {buddy.name}
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--green2)", fontWeight: 500, marginBottom: 8 }}>
                    {buddy.tag}
                  </div>

                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 10px" }}>
                    {buddy.description}
                  </p>

                  {buddy.philosophy && (
                    <div style={{ fontSize: 11, color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)", padding: 10, borderRadius: 6, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                      {buddy.philosophy}
                    </div>
                  )}
                </div>

                {/* Form or Status Badge */}
                {isPending ? (
                  <form action={handleStatusChange} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <input type="hidden" name="buddyId" value={buddy.id} />
                    
                    <input
                      type="text"
                      name="revisionNote"
                      placeholder="Optional revision note..."
                      defaultValue={buddy.rejection_reason || ""}
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "8px 10px",
                        color: "var(--text)",
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
                          padding: "8px",
                          background: "#00C48C",
                          border: "none",
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✓ Approve Live
                      </button>

                      <button
                        type="submit"
                        name="status"
                        value="review"
                        style={{
                          padding: "8px 12px",
                          background: "var(--bg)",
                          border: "1px solid #F59E0B",
                          borderRadius: 6,
                          color: "#F59E0B",
                          fontSize: 12,
                          fontWeight: 600,
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
                          padding: "8px 12px",
                          background: "var(--bg)",
                          border: "1px solid #EF4444",
                          borderRadius: 6,
                          color: "#EF4444",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green2)", display: "flex", alignItems: "center", gap: 6 }}>
                      ✓ Approved & Live in Marketplace
                    </div>
                    <form action={handleStatusChange}>
                      <input type="hidden" name="buddyId" value={buddy.id} />
                      <button
                        type="submit"
                        name="status"
                        value="review"
                        style={{
                          padding: "4px 8px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          color: "var(--muted)",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Move to Review
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
