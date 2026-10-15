"use client";

import toast from "react-hot-toast";

/** Anything that would need real backend work shows this instead of doing something fake. */
export function comingSoon(what: string) {
  toast(`${what} — coming soon`, { icon: "🚧" });
}

export function SectionHeader({
  title,
  emphasis,
  sub,
  action,
}: {
  title: string;
  emphasis?: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
      <div>
        <div
          className="text-[22px] font-semibold"
          style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}
        >
          {title} {emphasis && <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>{emphasis}</em>}
        </div>
        {sub && (
          <div className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>
            {sub}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={"rounded-[16px] p-6 " + (className ?? "")}
      style={{ background: "var(--card)", border: "1px solid var(--border)", ...style }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
        {title}
      </div>
      {action}
    </div>
  );
}

export function InfoBanner({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "gold" | "green" }) {
  const colors = {
    blue: { bg: "rgba(74,144,217,.05)", border: "rgba(74,144,217,.2)" },
    gold: { bg: "rgba(245,166,35,.06)", border: "rgba(245,166,35,.2)" },
    green: { bg: "rgba(0,196,140,.05)", border: "rgba(0,196,140,.2)" },
  }[tone];
  return (
    <div
      className="rounded-[10px] px-4 py-3 mb-5 text-[12px] leading-relaxed"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: "var(--muted)" }}
    >
      {children}
    </div>
  );
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <div
      onClick={() => comingSoon("Editing this setting")}
      className="w-[38px] h-[22px] rounded-[11px] relative cursor-pointer flex-shrink-0 transition-colors duration-200"
      style={{ background: on ? "var(--green)" : "var(--border)" }}
    >
      <span
        className="absolute w-4 h-4 rounded-full bg-white top-[3px] transition-all duration-200"
        style={{ left: on ? 16 : 3, boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}
      />
    </div>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: "active" | "pending" | "inactive" }) {
  const colors = {
    active: { bg: "rgba(0,196,140,.1)", color: "var(--green2)" },
    pending: { bg: "rgba(245,166,35,.1)", color: "#C47F00" },
    inactive: { bg: "rgba(107,122,153,.1)", color: "var(--muted)" },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold"
      style={{ background: colors.bg, color: colors.color }}
    >
      <span className="w-[6px] h-[6px] rounded-full" style={{ background: "currentColor" }} />
      {label}
    </span>
  );
}

export function Avatar({ initials, color, size = 34 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

export function KpiCard({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: "up" | "warn" | "down" }) {
  const color = tone === "up" ? "var(--green2)" : tone === "down" ? "#E24B4A" : "var(--gold)";
  return (
    <div className="rounded-[14px] px-5 py-[18px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-[6px]" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-[26px] mb-1" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--text)" }}>
        {value}
      </div>
      <div className="text-[11px] font-semibold" style={{ color }}>
        {delta}
      </div>
    </div>
  );
}
