import Link from "next/link";

const DATA_SOURCES = [
  { label: "GTBank alerts", sub: "Gmail",        active: true },
  { label: "Mar statement", sub: "Uploaded",     active: true },
  { label: "Nairametrics",  sub: "News",         active: true },
  { label: "Bloomberg",     sub: "Not connected", active: false },
];

export function FinancialSnapshot() {
  return (
    /* Context mini */
    <div
      className="mx-[10px] mb-[6px] rounded-[10px] border px-[14px] py-[10px] flex-shrink-0"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-[.5px] mb-[6px]"
        style={{ color: "var(--muted)" }}
      >
        Active Context
      </div>

      {DATA_SOURCES.map((src) => (
        <div key={src.label} className="flex items-center gap-[7px] py-[3px]">
          <span
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ background: src.active ? "var(--green)" : "var(--border)" }}
          />
          <span
            className="text-[11px]"
            style={{ color: "var(--muted)", opacity: src.active ? 1 : 0.5 }}
          >
            <strong style={{ color: src.active ? "var(--text)" : "var(--muted)", fontWeight: 500 }}>
              {src.label}
            </strong>
            {" · "}{src.sub}
          </span>
        </div>
      ))}

      <Link
        href="/databank"
        className="block w-full mt-[8px] py-[7px] rounded-[8px] text-center text-[11px] border transition-colors duration-200"
        style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.borderColor = "var(--green)";
          el.style.color = "var(--green)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.borderColor = "var(--border)";
          el.style.color = "var(--muted)";
        }}
      >
        Manage DataBank →
      </Link>
    </div>
  );
}

