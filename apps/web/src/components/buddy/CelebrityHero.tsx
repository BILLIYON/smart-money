"use client";

import { useRouter } from "next/navigation";
import type { Buddy } from "@/lib/buddies";
import { isImageAvatar } from "@/lib/utils";

export function CelebrityHero({ celebs }: { celebs?: Buddy[] }) {
  const router = useRouter();

  const celebList = (celebs && celebs.length > 0) ? celebs : [
    { id: "buffett",  avatarContent: "WB", avatarBg: "#2D5A2D", name: "Warren Buffett",  tag: "Value · Long-term Compounding",   price: "₦3,000/mo · 6.2k users" },
    { id: "kiyosaki", avatarContent: "RK", avatarBg: "#701010", name: "Robert Kiyosaki", tag: "Assets vs Liabilities · Rich Dad", price: "₦2,000/mo · 11.4k users" },
    { id: "cardone",  avatarContent: "GC", avatarBg: "#3A1060", name: "Grant Cardone",   tag: "10X Rule · Sales & Income",        price: "₦2,500/mo · 9.1k users" },
    { id: "ramsey",   avatarContent: "DR", avatarBg: "#004070", name: "Dave Ramsey",     tag: "Debt Freedom · Baby Steps",        price: "₦1,500/mo · 5.3k users" },
    { id: "lynch",    avatarContent: "PL", avatarBg: "#1A3A5E", name: "Peter Lynch",     tag: "Stock Picking · Ten-Baggers",      price: "₦2,000/mo · 3.8k users" },
    { id: "trump",    avatarContent: "DT", avatarBg: "#5A3800", name: "Donald Trump",    tag: "Deal-Making · Branding",           price: "₦2,500/mo · 7.8k users" },
  ];

  return (
    <div
      className="relative rounded-[16px] px-7 pt-6 pb-5 mb-7 overflow-hidden"
      style={{ background: "linear-gradient(135deg,var(--navy) 0%,#1A0A2E 100%)" }}
    >
      {/* Decorative background glow */}
      <span
        className="pointer-events-none absolute -right-[60px] -top-[60px] w-[260px] h-[260px] rounded-full"
        style={{ background: "rgba(245,166,35,.06)" }}
      />
      <span
        className="pointer-events-none absolute -left-[40px] -bottom-[40px] w-[160px] h-[160px] rounded-full"
        style={{ background: "rgba(0,196,140,.05)" }}
      />

      {/* Label */}
      <div
        className="relative z-[1] text-[10px] uppercase tracking-[2px] mb-2"
        style={{ color: "rgba(255,255,255,.4)" }}
      >
        ⭐ Most Popular · Fan-Created Simulations
      </div>

      {/* Title */}
      <h2
        className="relative z-[1] text-[22px] leading-snug text-white mb-[6px]"
        style={{ fontFamily: "var(--font-dm-serif)" }}
      >
        Chat with the world&apos;s greatest financial minds
      </h2>

      {/* Subtitle */}
      <p
        className="relative z-[1] text-[12px] leading-relaxed mb-[18px] max-w-[500px]"
        style={{ color: "rgba(255,255,255,.5)" }}
      >
        AI simulations of legendary investors and money thinkers — trained on their books, interviews, and speeches. Applied to your actual finances.
      </p>

      {/* Scrollable chip row */}
      <div
        className="relative z-[1] flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {celebList.map((chip, i) => (
          <button
            key={chip.id}
            onClick={() => router.push(`/marketplace/${chip.id}`)}
            className="flex items-center gap-[10px] px-4 py-[10px] rounded-[12px] flex-shrink-0 border transition-all duration-200 text-left"
            style={
              i === 0
                ? { borderColor: "rgba(245,166,35,.4)", background: "rgba(245,166,35,.1)" }
                : { borderColor: "rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)" }
            }
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.borderColor = "rgba(245,166,35,.4)";
              btn.style.background = "rgba(245,166,35,.08)";
              btn.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.borderColor = i === 0 ? "rgba(245,166,35,.4)" : "rgba(255,255,255,.1)";
              btn.style.background = i === 0 ? "rgba(245,166,35,.1)" : "rgba(255,255,255,.05)";
              btn.style.transform = "";
            }}
          >
            {/* Avatar */}
            <div
              className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[15px] overflow-hidden"
              style={{
                background: chip.avatarBg || (chip as any).avBg || "#1A3A6E",
                fontFamily: "var(--font-dm-serif)",
                color: "rgba(255,255,255,.9)",
              }}
            >
              {isImageAvatar(chip.avatarContent) ? (
                <img src={chip.avatarContent!} alt={chip.name} className="w-full h-full object-cover" />
              ) : (
                chip.avatarContent || (chip as any).initials || "WB"
              )}
            </div>

            <div>
              <div className="text-[13px] font-semibold text-white whitespace-nowrap">{chip.name}</div>
              <div className="text-[10px] whitespace-nowrap" style={{ color: "rgba(255,255,255,.45)" }}>{chip.tag}</div>
              <div className="text-[10px] font-semibold mt-[2px] whitespace-nowrap" style={{ color: "var(--gold)" }}>
                {(chip as any).priceNote || chip.price || "₦2,500/mo"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Fan note */}
      <p
        className="relative z-[1] text-[10px] leading-relaxed mt-[14px]"
        style={{ color: "rgba(255,255,255,.3)" }}
      >
        ⚠️ Fan-created AI simulations based on publicly available books &amp; interviews. Not affiliated with or endorsed by the named individuals.
      </p>
    </div>
  );
}
