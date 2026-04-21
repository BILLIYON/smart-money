import { getPendingBuddies } from "@/lib/db";
import { BuddyApprovalActions } from "@/components/admin/BuddyApprovalActions";

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
        width: 56,
        height: 56,
        borderRadius: 14,
        background: bg ?? "#132952",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: content ? 24 : 18,
        fontWeight: 700,
        color: "#ffffff",
        flexShrink: 0,
        marginBottom: 14,
      }}
    >
      {content ?? initials}
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
        Buddy Approvals
      </h1>
      <p style={{ fontSize: 14, color: "#6B7A99", marginBottom: 28 }}>
        {buddies.length > 0
          ? `${buddies.length} submission${buddies.length !== 1 ? "s" : ""} awaiting review.`
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
            No pending approvals
          </div>
          <div style={{ fontSize: 13, color: "#6B7A99" }}>
            New buddy submissions will appear here.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {buddies.map((buddy) => (
            <div
              key={buddy.id}
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 1px 4px rgba(11,30,61,.06)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Avatar bg={buddy.avatar_bg} content={buddy.avatar_content} name={buddy.name} />

              <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1E3D", marginBottom: 4 }}>
                {buddy.name}
              </div>

              {buddy.tag && (
                <span
                  style={{
                    display: "inline-block",
                    alignSelf: "flex-start",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "rgba(0,196,140,.1)",
                    color: "#00A677",
                    marginBottom: 12,
                  }}
                >
                  {buddy.tag}
                </span>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginTop: "auto",
                  paddingTop: 12,
                  borderTop: "1px solid #E2E7F0",
                }}
              >
                <div style={{ fontSize: 12, color: "#6B7A99" }}>
                  <span style={{ color: "#0B1E3D", fontWeight: 500 }}>Creator: </span>
                  {buddy.creator_email ?? "Unknown"}
                </div>
                <div style={{ fontSize: 12, color: "#6B7A99" }}>
                  <span style={{ color: "#0B1E3D", fontWeight: 500 }}>Submitted: </span>
                  {fmt(buddy.created_at)}
                </div>
              </div>

              <BuddyApprovalActions buddyId={buddy.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
