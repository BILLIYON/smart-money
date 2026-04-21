import Link from "next/link";
import type { Buddy } from "@/lib/buddies";

function ModelDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

export function BuddyCard({ buddy }: { buddy: Buddy }) {
  const {
    id, name, tag, desc, badge, badgeType, bannerColor, avatarBg,
    avatarContent, avatarIsSerif, model, modelColor, rating, reviewCount,
    isFanSim,
  } = buddy;

  return (
    <Link
      href={`/marketplace/${id}`}
      className="block rounded-[16px] border overflow-hidden cursor-pointer transition-all duration-[250ms] group"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 12px 40px var(--shadow)";
        el.style.borderColor = "var(--green)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.borderColor = "var(--border)";
      }}
      onFocus={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 12px 40px var(--shadow)";
        el.style.borderColor = "var(--green)";
      }}
      onBlur={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.borderColor = "var(--border)";
      }}
    >
      {/* Banner */}
      <div
        className="h-20 relative overflow-hidden flex items-center justify-center"
        style={{ background: bannerColor }}
      >
        {/* Badge */}
        <span
          className="absolute top-[10px] right-[10px] px-[10px] py-[3px] rounded-full text-[10px] font-semibold uppercase tracking-[.5px]"
          style={
            badgeType === "free"
              ? { background: "rgba(0,196,140,.15)", color: "#00A677" }
              : { background: "rgba(245,166,35,.15)", color: "#C47F00" }
          }
        >
          {badge}
        </span>

        {/* Avatar */}
        <div
          className="absolute bottom-[-20px] left-5 w-[60px] h-[60px] rounded-full border-[3px] flex items-center justify-center text-[22px]"
          style={{
            background: avatarBg,
            borderColor: "var(--card)",
            ...(avatarIsSerif
              ? { fontFamily: "var(--font-dm-serif)", fontSize: "22px", color: "rgba(255,255,255,.9)" }
              : {}),
          }}
        >
          {avatarContent}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-7 pb-4">
        {/* Name + fan badge */}
        <div className="text-[15px] font-semibold mb-[2px] flex items-center flex-wrap gap-1" style={{ color: "var(--text)" }}>
          {name}
          {isFanSim && (
            <span
              className="inline-flex items-center px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px] border"
              style={{
                background: "rgba(245,166,35,.1)",
                borderColor: "rgba(245,166,35,.25)",
                color: "#C47F00",
              }}
            >
              Fan Sim
            </span>
          )}
        </div>

        <div className="text-[11px] mb-[10px]" style={{ color: "var(--muted)" }}>{tag}</div>
        <div className="text-[12px] leading-relaxed mb-[14px]" style={{ color: "var(--muted)" }}>{desc}</div>

        {/* Fan disclaimer */}
        {isFanSim && (
          <div
            className="text-[10px] leading-snug mt-[-6px] mb-[10px] px-[10px] py-[7px] rounded-[8px] border"
            style={{
              color: "var(--muted)",
              background: "var(--bg)",
              borderColor: "var(--border)",
            }}
          >
            🔒 Fan-created simulation. Not affiliated with or endorsed by {name}.
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mb-[10px]">
          <div className="flex items-center gap-[5px] text-[11px]" style={{ color: "var(--muted)" }}>
            <ModelDot color={modelColor} />
            {model}
          </div>
          <div className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "var(--text)" }}>
            <span style={{ color: "var(--gold)" }}>★</span>
            {rating} · {reviewCount}
          </div>
        </div>

        {/* CTA */}
        <button
          className="w-full py-[9px] rounded-[10px] text-[12px] font-medium text-white border-none cursor-pointer transition-colors duration-200"
          style={{ background: "var(--navy)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)"; }}
          tabIndex={-1}
        >
          View Profile
        </button>
      </div>
    </Link>
  );
}

/** Special "Create Your Own" card */
export function CreateYourOwnCard() {
  return (
    <Link
      href="/studio"
      className="block rounded-[16px] border overflow-hidden cursor-pointer transition-all duration-[250ms]"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 12px 40px var(--shadow)";
        el.style.borderColor = "var(--green)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.borderColor = "var(--border)";
      }}
      onFocus={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 12px 40px var(--shadow)";
        el.style.borderColor = "var(--green)";
      }}
      onBlur={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.borderColor = "var(--border)";
      }}
    >
      {/* Banner */}
      <div
        className="h-20 flex items-center justify-center border-b-2 border-dashed"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <span className="text-[32px]" style={{ color: "var(--muted)" }}>✦</span>
      </div>

      {/* Body */}
      <div className="px-4 pt-7 pb-4">
        <div className="text-[15px] font-semibold mb-[2px]" style={{ color: "var(--muted)" }}>
          Create Your Own
        </div>
        <div className="text-[11px] mb-[10px]" style={{ color: "var(--muted)" }}>AI Studio</div>
        <div className="text-[12px] leading-relaxed mb-[14px]" style={{ color: "var(--muted)" }}>
          Build a Finance Buddy from your knowledge. Publish it and earn when others subscribe.
        </div>
        <button
          className="w-full py-[9px] rounded-[10px] text-[12px] font-medium cursor-pointer transition-all duration-200 border"
          style={{
            background: "var(--bg)",
            color: "var(--muted)",
            borderColor: "var(--border)",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = "var(--green)";
            btn.style.color = "var(--green)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = "var(--border)";
            btn.style.color = "var(--muted)";
          }}
          tabIndex={-1}
        >
          Open AI Studio →
        </button>
      </div>
    </Link>
  );
}
