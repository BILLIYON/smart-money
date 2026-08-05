import { getPendingBuddies } from "@/lib/db";
import { BuddyApprovalActions } from "@/components/admin/BuddyApprovalActions";
import { isImageAvatar } from "@/lib/utils";

export const metadata = { title: "Buddy Approvals · Admin · Smart Money" };

function Avatar({
  bg,
  content,
  name,
}: {
  bg: string | null;
  content: string | null;
  name: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: bg ?? "#132952",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: isImageAvatar(content) ? 14 : 22,
        fontWeight: 700,
        color: "#ffffff",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {isImageAvatar(content) ? (
        <img src={content!} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        content ?? initials
      )}
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function BuddyApprovalsPage() {
  const buddies = await getPendingBuddies();

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
        Buddy Approvals & Review Queue
      </h1>
      <p style={{ fontSize: 14, color: "#6B7A99", marginBottom: 24 }}>
        {buddies.length > 0
          ? `${buddies.length} submission${buddies.length !== 1 ? "s" : ""} in review queue.`
          : "All caught up."}
      </p>

      {buddies.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 1px 4px rgba(11,30,61,.06)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
            No pending submissions
          </div>
          <div style={{ fontSize: 13, color: "#6B7A99" }}>
            New buddy submissions and revision requests will appear here.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {buddies.map((buddy) => (
            <div
              key={buddy.id}
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: 20,
                boxShadow: "0 1px 4px rgba(11,30,61,.06)",
                display: "flex",
                flexDirection: "column",
                border: "1px solid #E2E7F0",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Avatar bg={buddy.avatar_bg} content={buddy.avatar_content} name={buddy.name} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1E3D" }}>
                    {buddy.name}
                  </div>
                  {buddy.tag && (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "rgba(0,196,140,.1)",
                        color: "#00A677",
                        marginTop: 4,
                      }}
                    >
                      {buddy.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Description & Philosophy */}
              {buddy.description && (
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, lineHeight: 1.4 }}>
                  {buddy.description}
                </div>
              )}

              {buddy.philosophy && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#0B1E3D",
                    background: "#F8FAFC",
                    padding: "8px 10px",
                    borderRadius: 8,
                    marginBottom: 12,
                    borderLeft: "3px solid #00C48C",
                  }}
                >
                  <strong style={{ color: "#64748B" }}>Philosophy: </strong>
                  &quot;{buddy.philosophy}&quot;
                </div>
              )}

              {/* Meta information */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginTop: "auto",
                  paddingTop: 10,
                  borderTop: "1px solid #E2E7F0",
                  fontSize: 11,
                  color: "#64748B",
                }}
              >
                <div>
                  <strong style={{ color: "#0B1E3D" }}>AI Model: </strong>
                  {(buddy.ai_model || "claude").toUpperCase()} ·{" "}
                  <strong style={{ color: "#0B1E3D" }}>Price: </strong>
                  {buddy.price_monthly ? `₦${(buddy.price_monthly / 100).toLocaleString()}/mo` : "Free"}
                </div>
                <div>
                  <strong style={{ color: "#0B1E3D" }}>Creator: </strong>
                  {buddy.creator_email ?? "Community Creator"}
                </div>
                <div>
                  <strong style={{ color: "#0B1E3D" }}>Submitted: </strong>
                  {fmt(buddy.created_at)}
                </div>
              </div>

              {/* Approval Actions component */}
              <BuddyApprovalActions buddy={buddy} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
