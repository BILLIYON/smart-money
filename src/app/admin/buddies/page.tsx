import { ALL_BUDDIES } from "@/lib/buddies";
import { getHiddenBuddyIds } from "@/lib/db";
import { BuddyHideAction } from "@/components/admin/BuddyHideAction";

export const metadata = { title: "Buddies · Admin · Smart Money" };

export default async function AdminBuddiesPage() {
  const hiddenIds = new Set(await getHiddenBuddyIds());

  const archetypes = ALL_BUDDIES.filter((b) => !b.isFanSim);
  const celebs = ALL_BUDDIES.filter((b) => b.isFanSim);

  function BuddyCard({ buddy }: { buddy: (typeof ALL_BUDDIES)[0] }) {
    const hidden = hiddenIds.has(buddy.id);
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(11,30,61,.06)",
          opacity: hidden ? 0.55 : 1,
          transition: "opacity .2s",
        }}
      >
        {/* Banner */}
        <div style={{ height: 52, background: buddy.bannerColor, position: "relative" }}>
          {hidden && (
            <span
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(226,75,74,.85)",
                color: "#fff",
                letterSpacing: ".4px",
                textTransform: "uppercase",
              }}
            >
              Hidden
            </span>
          )}
          <div
            style={{
              position: "absolute",
              bottom: -16,
              left: 14,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: buddy.avatarBg,
              border: "2px solid #ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            {buddy.avatarContent}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 16px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1E3D", marginBottom: 2 }}>
            {buddy.name}
          </div>
          <div style={{ fontSize: 11, color: "#6B7A99", marginBottom: 8 }}>{buddy.tag}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
            {buddy.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "#F4F6FB",
                  color: "#6B7A99",
                  border: "1px solid #E2E7F0",
                }}
              >
                {cat}
              </span>
            ))}
            {buddy.isFanSim && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(245,166,35,.1)",
                  color: "#C47F00",
                  border: "1px solid rgba(245,166,35,.25)",
                }}
              >
                Fan Sim
              </span>
            )}
          </div>
          <BuddyHideAction buddyId={buddy.id} hidden={hidden} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
        Marketplace Buddies
      </h1>
      <p style={{ fontSize: 14, color: "#6B7A99", marginBottom: 28 }}>
        {ALL_BUDDIES.length} built-in buddies · {hiddenIds.size} hidden from marketplace
      </p>

      {/* Archetypes */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 14 }}>
        Archetype Buddies ({archetypes.length})
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {archetypes.map((b) => <BuddyCard key={b.id} buddy={b} />)}
      </div>

      {/* Celebrity Sims */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 14 }}>
        Celebrity AI Simulations ({celebs.length})
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {celebs.map((b) => <BuddyCard key={b.id} buddy={b} />)}
      </div>
    </div>
  );
}
