import { Pool } from "pg";
import { revalidatePath } from "next/cache";
import { SectionHeader, InfoBanner, Card, StatusPill } from "@/components/admin/shared";
import { dbCache } from "@/lib/cache";

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

  const sql =
    viewMode === "pending"
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
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="⚡"
        emphasis="Buddy Submissions Moderation"
        sub="Review creator submissions, approve AI Finance Buddies to go live in the Marketplace, or request edits."
        action={
          <div className="flex items-center gap-2">
            <a
              href="/admin/approvals?view=pending"
              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition"
              style={{
                background: viewMode === "pending" ? "rgba(0,196,140,0.15)" : "var(--card)",
                borderColor: viewMode === "pending" ? "var(--green)" : "var(--border)",
                color: viewMode === "pending" ? "var(--green2)" : "var(--muted)",
              }}
            >
              Pending Review ({pendingCount})
            </a>
            <a
              href="/admin/approvals?view=all"
              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition"
              style={{
                background: viewMode === "all" ? "rgba(74,144,217,0.15)" : "var(--card)",
                borderColor: viewMode === "all" ? "rgba(74,144,217,0.4)" : "var(--border)",
                color: viewMode === "all" ? "#38BDF8" : "var(--muted)",
              }}
            >
              All Submissions
            </a>
          </div>
        }
      />

      <InfoBanner tone="gold">
        🛡️ Approved buddies immediately become discoverable and subscribable across the consumer Marketplace and partner directory.
      </InfoBanner>

      {/* Grid or Empty State */}
      {buddies.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-[36px] mb-2">🎉</div>
          <h3 className="text-[17px] font-bold" style={{ color: "var(--text)" }}>
            {viewMode === "pending" ? "No Pending Submissions" : "No Buddies Found"}
          </h3>
          <p className="text-[13px] max-w-md mx-auto mt-1" style={{ color: "var(--muted)" }}>
            {viewMode === "pending"
              ? "All creator submissions have been moderated! Any new submissions will appear here automatically."
              : "No buddy records found in the database."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {buddies.map((buddy) => {
            const isPending =
              buddy.status === "pending" || buddy.status === "in_review" || buddy.status === "review";
            const isApproved = buddy.status === "live" || buddy.status === "approved";

            return (
              <Card
                key={buddy.id}
                className="flex flex-col justify-between"
                style={{
                  borderColor: isPending ? "rgba(245,166,35,0.4)" : "var(--border)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <StatusPill
                      label={isPending ? "Pending Review" : buddy.status.toUpperCase()}
                      tone={isApproved ? "active" : isPending ? "pending" : "danger"}
                    />
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: "var(--bg)", color: "var(--muted)" }}
                    >
                      {buddy.ai_model}
                    </span>
                  </div>

                  <h3 className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
                    {buddy.name}
                  </h3>
                  <div className="text-[12px] font-medium mb-2" style={{ color: "var(--green2)" }}>
                    {buddy.tag}
                  </div>

                  <p className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
                    {buddy.description}
                  </p>

                  {buddy.philosophy && (
                    <div
                      className="p-3 rounded-[8px] text-[11px] font-mono leading-relaxed max-h-[110px] overflow-y-auto mb-3"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                      {buddy.philosophy}
                    </div>
                  )}
                </div>

                {isPending ? (
                  <form
                    action={handleStatusChange}
                    className="pt-3 flex flex-col gap-2"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <input type="hidden" name="buddyId" value={buddy.id} />
                    <input
                      type="text"
                      name="revisionNote"
                      placeholder="Optional creator revision note..."
                      defaultValue={buddy.rejection_reason || ""}
                      className="px-3 py-1.5 rounded-[6px] text-[12px] outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        name="status"
                        value="live"
                        className="flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold text-white transition hover:opacity-95"
                        style={{ background: "var(--green)" }}
                      >
                        ✓ Approve Live
                      </button>

                      <button
                        type="submit"
                        name="status"
                        value="review"
                        className="px-3 py-1.5 rounded-[6px] text-[12px] font-semibold border transition"
                        style={{
                          background: "var(--bg)",
                          borderColor: "var(--gold)",
                          color: "var(--gold)",
                        }}
                      >
                        Request Edits
                      </button>

                      <button
                        type="submit"
                        name="status"
                        value="draft"
                        className="px-3 py-1.5 rounded-[6px] text-[12px] font-semibold border transition text-red-500 hover:bg-red-500/10"
                        style={{ borderColor: "rgba(239,68,68,0.3)" }}
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    className="pt-3 flex items-center justify-between"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <span className="text-[12px] font-semibold" style={{ color: "var(--green2)" }}>
                      ✓ Live in Marketplace
                    </span>
                    <form action={handleStatusChange}>
                      <input type="hidden" name="buddyId" value={buddy.id} />
                      <button
                        type="submit"
                        name="status"
                        value="review"
                        className="px-2 py-1 rounded-[6px] text-[11px] border"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }}
                      >
                        Move to Review
                      </button>
                    </form>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
