import Link from "next/link";
import { getCategoryStyle, type Buddy } from "@/lib/buddies";
import { isImageAvatar } from "@/lib/utils";

function ModelDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

/** Standard Archetype / Community buddy card */
export function BuddyCard({ buddy }: { buddy: Buddy }) {
  const {
    id, name, tag, desc, badge, badgeType, bannerColor, avatarBg,
    avatarContent, avatarIsSerif, model, modelColor, rating, reviewCount,
    categories,
  } = buddy;

  return (
    <Link
      href={`/marketplace/${id}`}
      className="flex flex-col h-full rounded-[16px] overflow-hidden cursor-pointer transition-all duration-[250ms] group"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 20px rgba(0,0,0,.03)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 12px 30px rgba(0,0,0,.08)";
        el.style.borderColor = "var(--green)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "none";
        el.style.boxShadow = "0 4px 20px rgba(0,0,0,.03)";
        el.style.borderColor = "var(--border)";
      }}
    >
      {/* Banner */}
      <div
        className="h-24 relative overflow-hidden flex items-center justify-center flex-shrink-0"
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
          className="absolute bottom-[-24px] left-5 w-[68px] h-[68px] rounded-full border-[3px] flex items-center justify-center text-[22px] overflow-hidden"
          style={{
            background: avatarBg,
            borderColor: "var(--card)",
            ...(avatarIsSerif
              ? { fontFamily: "var(--font-dm-serif)", fontSize: "22px", color: "rgba(255,255,255,.9)" }
              : {}),
          }}
        >
          {isImageAvatar(avatarContent) ? (
            <img src={avatarContent} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            avatarContent
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow px-4 pt-8 pb-4">
        <div className="text-[15px] font-semibold mb-[2px]" style={{ color: "var(--text)" }}>
          {name}
        </div>

        <div className="text-[11px] mb-[10px]" style={{ color: "var(--muted)" }}>{tag}</div>
        <div className="text-[12px] leading-relaxed mb-[12px]" style={{ color: "var(--muted)" }}>{desc}</div>

        <div className="flex flex-wrap gap-[6px] mb-[14px]">
          {categories?.slice(0, 3).map((cat) => {
            const style = getCategoryStyle(cat);
            return (
              <span
                key={cat}
                className="px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px] border"
                style={{ background: style.background, color: style.color, borderColor: style.borderColor }}
              >
                {cat}
              </span>
            );
          })}
          {categories && categories.length > 3 && (
            <span
              className="px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px] border"
              style={{ background: "var(--bg)", color: "var(--muted)", borderColor: "var(--border)" }}
            >
              +{categories.length - 3}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
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
      </div>
    </Link>
  );
}

/** Premium Celebrity AI Simulation card — gold accent, larger serif avatar, no inline disclaimer */
export function CelebrityCard({ buddy }: { buddy: Buddy }) {
  const {
    id, name, tag, desc, badge, badgeType, bannerColor, avatarBg,
    avatarContent, model, modelColor, rating, reviewCount, categories,
  } = buddy;

  return (
    <Link
      href={`/marketplace/${id}`}
      className="flex flex-col h-full rounded-[16px] overflow-hidden cursor-pointer transition-all duration-[250ms] group"
      style={{
        background: "var(--card)",
        border: "1px solid rgba(245,166,35,.35)",
        boxShadow: "0 0 0 0 rgba(245,166,35,0)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 12px 40px rgba(245,166,35,.18)";
        el.style.borderColor = "rgba(245,166,35,.7)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "";
        el.style.boxShadow = "0 0 0 0 rgba(245,166,35,0)";
        el.style.borderColor = "rgba(245,166,35,.35)";
      }}
      onFocus={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 12px 40px rgba(245,166,35,.18)";
        el.style.borderColor = "rgba(245,166,35,.7)";
      }}
      onBlur={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.transform = "";
        el.style.boxShadow = "0 0 0 0 rgba(245,166,35,0)";
        el.style.borderColor = "rgba(245,166,35,.35)";
      }}
    >
      {/* Taller banner for celebrity presence */}
      <div
        className="h-24 relative overflow-hidden flex-shrink-0"
        style={{ background: bannerColor }}
      >
        {/* Gold "Fan Sim" pill top-left */}
        <span
          className="absolute top-[10px] left-[10px] px-[8px] py-[3px] rounded-full text-[9px] font-bold uppercase tracking-[.8px]"
          style={{ background: "rgba(245,166,35,.2)", color: "#F5A623" }}
        >
          ⭐ Fan Sim
        </span>

        {/* Price badge top-right */}
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

        {/* Larger serif avatar — overlaps banner bottom */}
        <div
          className="absolute bottom-[-24px] left-5 w-[68px] h-[68px] rounded-full border-[3px] flex items-center justify-center overflow-hidden"
          style={{
            background: avatarBg,
            borderColor: "var(--card)",
            fontFamily: "var(--font-dm-serif)",
            fontSize: "22px",
            color: "rgba(255,255,255,.92)",
            letterSpacing: "-0.5px",
          }}
        >
          {isImageAvatar(avatarContent) ? (
            <img src={avatarContent} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            avatarContent
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow px-4 pt-8 pb-4">
        <div
          className="text-[15px] font-semibold mb-[2px]"
          style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}
        >
          {name}
        </div>

        <div className="text-[11px] mb-[10px]" style={{ color: "var(--muted)" }}>{tag}</div>
        <div className="text-[12px] leading-relaxed mb-[12px]" style={{ color: "var(--muted)" }}>{desc}</div>

        <div className="flex flex-wrap gap-[6px] mb-[14px]">
          {categories?.slice(0, 3).map((cat) => {
            const style = getCategoryStyle(cat);
            return (
              <span
                key={cat}
                className="px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px] border"
                style={{ background: style.background, color: style.color, borderColor: style.borderColor }}
              >
                {cat}
              </span>
            );
          })}
          {categories && categories.length > 3 && (
            <span
              className="px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px] border"
              style={{ background: "var(--bg)", color: "var(--muted)", borderColor: "var(--border)" }}
            >
              +{categories.length - 3}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
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

          {/* Gold CTA */}
          <button
            className="w-full py-[9px] rounded-[10px] text-[12px] font-semibold border-none cursor-pointer transition-all duration-200"
            style={{ background: "rgba(245,166,35,.12)", color: "#C47F00", border: "1px solid rgba(245,166,35,.3)" }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "rgba(245,166,35,.22)";
              btn.style.borderColor = "rgba(245,166,35,.6)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "rgba(245,166,35,.12)";
              btn.style.borderColor = "rgba(245,166,35,.3)";
            }}
            tabIndex={-1}
          >
            View Profile
          </button>
        </div>
      </div>
    </Link>
  );
}

/** Special "Create Your Own" card */
export function CreateYourOwnCard() {
  return (
    <Link
      href="/studio"
      className="flex flex-col h-full rounded-[16px] border overflow-hidden cursor-pointer transition-all duration-[250ms]"
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
        className="h-24 flex items-center justify-center border-b-2 border-dashed flex-shrink-0"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <span className="text-[32px]" style={{ color: "var(--muted)" }}>✦</span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow px-4 pt-8 pb-4">
        <div className="text-[15px] font-semibold mb-[2px]" style={{ color: "var(--muted)" }}>
          Create Your Own
        </div>
        <div className="text-[11px] mb-[10px]" style={{ color: "var(--muted)" }}>AI Studio</div>
        <div className="text-[12px] leading-relaxed mb-[14px]" style={{ color: "var(--muted)" }}>
          Build a Finance Buddy from your knowledge. Publish it and earn when others subscribe.
        </div>
        <div className="mt-auto pt-4">
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
      </div>
    </Link>
  );
}
