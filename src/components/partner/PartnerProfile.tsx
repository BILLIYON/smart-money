"use client";

import { useState } from "react";
import Link from "next/link";
import { comingSoon } from "./shared";
import type { PartnerFirm, PartnerReview } from "./mockData";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
  marginBottom: 12,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: ".4px",
  marginBottom: 5,
  display: "block",
};

function ApplicationForm({ firmName }: { firmName: string }) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div
        className="rounded-[12px] p-5 flex items-start gap-3"
        style={{ background: "rgba(0,196,140,.08)", border: "1px solid rgba(0,196,140,.2)" }}
      >
        <span className="text-[22px]">✅</span>
        <div>
          <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text)" }}>Application submitted</div>
          <div className="text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
            {firmName} will review your profile and get back to you within 2 business days. Your Smart Money
            DataBank summary has been shared with them to speed up the process.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        comingSoon("Actually routing this application to the firm");
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <div><label style={labelStyle}>Full Legal Name</label><input required style={inputStyle} placeholder="As on your ID" /></div>
        <div><label style={labelStyle}>Phone Number</label><input required style={inputStyle} placeholder="+234..." /></div>
      </div>
      <label style={labelStyle}>Annual Income Range</label>
      <select required defaultValue="" style={{ ...inputStyle, appearance: "auto" }}>
        <option value="" disabled>Select a range</option>
        <option>Below ₦5M</option>
        <option>₦5M – ₦20M</option>
        <option>₦20M – ₦50M</option>
        <option>Above ₦50M</option>
      </select>
      <label style={labelStyle}>What are you hoping to get out of this partnership?</label>
      <textarea required rows={3} style={{ ...inputStyle, resize: "none" }} placeholder="e.g. Portfolio diversification, tax planning, retirement strategy..." />
      <button
        type="submit"
        className="w-full py-[11px] rounded-[10px] text-[13px] font-semibold text-white border-none"
        style={{ background: "var(--green)" }}
      >
        Submit Application →
      </button>
      <div className="text-[10px] text-center mt-3" style={{ color: "var(--muted)" }}>
        Your DataBank summary is shared with {firmName} only after you submit.
      </div>
    </form>
  );
}

function ReviewItem({ review }: { review: PartnerReview }) {
  return (
    <div className="py-[14px]" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex justify-between mb-[5px]">
        <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{review.name}</span>
        <span className="text-[12px]" style={{ color: "var(--gold)" }}>{review.stars}</span>
      </div>
      <div className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>{review.text}</div>
    </div>
  );
}

export function PartnerProfile({
  firm,
  fullDescription,
  includes,
  reviews,
}: {
  firm: PartnerFirm;
  fullDescription: string;
  includes: string[];
  reviews: PartnerReview[];
}) {
  return (
    <div className="px-3 py-6 sm:px-6 lg:px-8 w-full">
      <div className="mb-4">
        <Link
          href="/partners"
          className="text-[12px] font-medium px-3 py-[6px] rounded-[8px] border inline-block"
          style={{ color: "var(--muted)", borderColor: "var(--border)" }}
        >
          ← Back to Partners
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div>
          <div
            className="rounded-[16px] overflow-hidden mb-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div style={{ height: 110, background: firm.banner, position: "relative" }} />
            <div style={{ marginTop: -28, marginLeft: 28, position: "relative" }}>
              <div
                className="rounded-[16px] flex items-center justify-center text-[30px]"
                style={{ width: 64, height: 64, background: firm.iconBg, border: "3px solid var(--card)" }}
              >
                {firm.icon}
              </div>
            </div>
            <div className="px-7 pb-6 pt-9">
              <div className="text-[24px] mb-[6px]" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--text)" }}>
                {firm.name}
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                {firm.tags.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full text-[11px] font-medium border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>{t}</span>
                ))}
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2 mt-5" style={{ color: "var(--muted)" }}>About</div>
              <div className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>{fullDescription}</div>

              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2 mt-5" style={{ color: "var(--muted)" }}>What&apos;s Included</div>
              <div className="flex flex-col gap-[7px]">
                {includes.map((i) => (
                  <div key={i} className="text-[12px] flex items-center gap-2" style={{ color: "var(--text)" }}>
                    <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 11 }}>✓</span>
                    {i}
                  </div>
                ))}
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2 mt-5" style={{ color: "var(--muted)" }}>Client Reviews</div>
              <div>
                {reviews.map((r) => <ReviewItem key={r.name} review={r} />)}
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-[16px] p-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)", position: "sticky", top: 0 }}
        >
          <div className="flex gap-4 pb-4 mb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div><div className="text-[16px] font-bold" style={{ color: "var(--green2)" }}>{firm.rating}</div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Rating</div></div>
            <div><div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>{firm.clients}</div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Clients</div></div>
            <div><div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>{firm.minPortfolio}</div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Min. Portfolio</div></div>
          </div>
          <div className="text-[13px] font-semibold mb-3" style={{ color: "var(--text)" }}>Apply to Join</div>
          <ApplicationForm firmName={firm.name} />
        </div>
      </div>
    </div>
  );
}
