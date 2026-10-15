"use client";

export function ComingSoonPanel({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center py-20 px-6">
      <div className="text-[40px] mb-4">{icon}</div>
      <div className="text-[16px] font-semibold mb-2" style={{ color: "var(--text)" }}>
        {title}
      </div>
      <div className="text-[13px] max-w-[440px] leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
        {description}
      </div>
      <span
        className="inline-flex px-3 py-1 rounded-full text-[11px] font-semibold"
        style={{ background: "rgba(245,166,35,.12)", color: "#C47F00", border: "1px solid rgba(245,166,35,.3)" }}
      >
        🚧 Under construction
      </span>
    </div>
  );
}
