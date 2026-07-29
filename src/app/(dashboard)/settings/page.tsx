"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useUserStore } from "@/store/userStore";
import { useBuddyStore } from "@/store/buddyStore";
import { popup } from "@/store/popupStore";

// ── Types ──────────────────────────────────────────────────
type Tab = "profile" | "notifs" | "subs" | "privacy" | "appear";

// ── Toggle component ───────────────────────────────────────
function Toggle({ on, onChange, "aria-label": ariaLabel }: { on: boolean; onChange: (v: boolean) => void; "aria-label"?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: on ? "var(--green)" : "var(--border)",
        position: "relative",
        cursor: "pointer",
        transition: "background .2s",
        flexShrink: 0,
        border: "none",
        padding: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
        }}
      />
    </button>
  );
}

// ── Settings row ───────────────────────────────────────────
function SettingsRow({
  label,
  sub,
  right,
  last = false,
}: {
  label: string;
  sub: string;
  right: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: last ? "none" : "1px solid var(--border)",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>
      </div>
      {right}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────
function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{ fontFamily: "var(--font-dm-serif)", fontSize: 18, color: "var(--text)", marginBottom: 4 }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>{sub}</div>
      {children}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────
function Sel({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        padding: "7px 12px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontFamily: "inherit",
        fontSize: 13,
        color: "var(--text)",
        background: "var(--card)",
        outline: "none",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

// ── Danger button ──────────────────────────────────────────
function DangerBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        background: "rgba(226,75,74,.08)",
        color: "#E24B4A",
        border: "1px solid #E24B4A",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function GhostBtn({ label, onClick, danger }: { label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        background: "transparent",
        color: danger ? "#E24B4A" : "var(--text)",
        border: `1px solid ${danger ? "#E24B4A" : "var(--border)"}`,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ── Profile Tab ────────────────────────────────────────────
function ProfileTab() {
  const { profile, loadProfile, updateProfile } = useUserStore();
  const [saved, setSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [incomeRange, setIncomeRange] = useState("₦300k–₦500k");
  const [primaryGoal, setPrimaryGoal] = useState("Build emergency fund");
  const [riskTolerance, setRiskTolerance] = useState("Moderate (balanced growth)");

  const [aiEngine, setAiEngine] = useState("groq-70b");

  useEffect(() => {
    loadProfile().then(() => setLoading(false));
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setEmail(profile.email ?? "");
      setCurrency(profile.currency ?? "NGN");
      setIncomeRange(profile.income_range ?? "₦300k–₦500k");
      setPrimaryGoal(profile.primary_goal ?? "Build emergency fund");
      setRiskTolerance(profile.risk_tolerance ?? "Moderate (balanced growth)");
    }
  }, [profile]);

  async function handleSave() {
    setSaved(true);
    await updateProfile({
      full_name: fullName,
      email: email,
      currency: currency,
    });
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleProfileSave() {
    setProfileSaved(true);
    await updateProfile({
      income_range: incomeRange,
      primary_goal: primaryGoal,
      risk_tolerance: riskTolerance,
    });
    setTimeout(() => setProfileSaved(false), 2000);
  }

  if (loading) {
    return (
      <>
        {/* Profile card skeleton */}
        <div
          className="animate-pulse rounded-[16px] p-6 mb-6"
          style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
        >
          <div className="w-14 h-14 rounded-[14px] mb-3" style={{ background: "rgba(255,255,255,.12)" }} />
          <div className="h-5 w-36 rounded mb-2" style={{ background: "rgba(255,255,255,.12)" }} />
          <div className="h-3 w-48 rounded mb-3" style={{ background: "rgba(255,255,255,.1)" }} />
          <div className="h-5 w-28 rounded-full" style={{ background: "rgba(255,255,255,.1)" }} />
        </div>
        {/* Personal info skeleton */}
        <div className="mb-7">
          <div className="h-5 w-28 rounded mb-2 animate-pulse" style={{ background: "var(--border)" }} />
          <div className="h-3 w-56 rounded mb-5 animate-pulse" style={{ background: "var(--border)" }} />
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 w-16 rounded mb-2" style={{ background: "var(--border)" }} />
                <div className="h-10 w-full rounded-[8px]" style={{ background: "var(--border)" }} />
              </div>
            ))}
          </div>
          <div className="h-9 w-28 rounded-[8px] animate-pulse" style={{ background: "var(--border)" }} />
        </div>
        {/* Financial profile skeleton */}
        <div>
          <div className="h-5 w-36 rounded mb-2 animate-pulse" style={{ background: "var(--border)" }} />
          <div className="h-3 w-64 rounded mb-5 animate-pulse" style={{ background: "var(--border)" }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-[14px] animate-pulse" style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <div>
                <div className="h-3 w-40 rounded mb-2" style={{ background: "var(--border)" }} />
                <div className="h-3 w-56 rounded" style={{ background: "var(--border)" }} />
              </div>
              <div className="h-9 w-36 rounded-[8px]" style={{ background: "var(--border)" }} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Profile card */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy), var(--navy2))",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative orb */}
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(0,196,140,.1)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          {fullName ? fullName.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) : "U"}
        </div>
        <div
          style={{ fontFamily: "var(--font-dm-serif)", fontSize: 20, color: "#fff", marginBottom: 4 }}
        >
          {profile?.full_name || "User"}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12 }}>
          {profile?.email || ""}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              padding: "3px 10px",
              background: "rgba(0,196,140,.2)",
              border: "1px solid rgba(0,196,140,.3)",
              borderRadius: 20,
              fontSize: 11,
              color: "var(--green)",
              fontWeight: 500,
            }}
          >
            {profile?.plan === "pro" ? "Pro Plan · ₦3,500/mo" : "Free Plan"}
          </span>
          <button
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(226,75,74,.2)",
              color: "#FF6B6B",
              border: "1px solid rgba(226,75,74,.3)",
              cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,75,74,.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,75,74,.2)";
            }}
          >
            🚪 Log Out
          </button>
        </div>
      </div>

      {/* Personal Info */}
      <Section title="Personal Info" sub="Update your name, email, and currency preferences">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 6,
              }}
            >
              Full Name
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--text)",
                background: "var(--card)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 6,
              }}
            >
              Email
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--text)",
                background: "var(--card)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 6,
              }}
            >
              Currency
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--text)",
                background: "var(--card)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="NGN">Nigerian Naira (₦)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="GHS">Ghanaian Cedi (₵)</option>
              <option value="KES">Kenyan Shilling (KSh)</option>
              <option value="ZAR">South African Rand (R)</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--green2)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 6,
              }}
            >
              ⚡ AI Intelligence & DataBank Engine
            </div>
            <select
              value={aiEngine}
              onChange={(e) => {
                setAiEngine(e.target.value);
                popup.success("AI Engine Selected", `Switched primary AI provider to ${e.target.selectedOptions[0].text}`);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid rgba(0,196,140,0.35)",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--text)",
                background: "var(--card)",
                outline: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <option value="groq-70b">⚡ Groq Llama 3.3 70B Versatile (Fast Agentic Reasoning)</option>
              <option value="groq-8b">🚀 Groq Llama 3.1 8B Instant (Sub-100ms Speed)</option>
              <option value="claude">🧠 Anthropic Claude 3.5 Sonnet (Deep Document Analysis)</option>
              <option value="gemini">🔮 Google Gemini 1.5 Flash (Multimodal Processing)</option>
              <option value="gpt4o">🤖 OpenAI GPT-4o Mini (Standard GPT Model)</option>
            </select>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              Select which AI Provider powers your DataBank PDF statement parsing, agentic actions, and finance council.
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 6,
              }}
            >
              Time Zone
            </div>
            <select
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--text)",
                background: "var(--card)",
                outline: "none",
              }}
            >
              <option>Africa/Lagos (WAT)</option>
              <option>UTC</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSave}
          style={{
            padding: "9px 18px",
            background: saved ? "var(--green2)" : "var(--green)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background .15s",
          }}
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </Section>

      {/* Financial Profile */}
      <Section title="Financial Profile" sub="This helps your buddies give you advice that fits your actual situation.">
        {[
          {
            label: "Monthly Income Range",
            value: incomeRange,
            set: setIncomeRange,
            options: ["Under ₦100k", "₦100k–₦300k", "₦300k–₦500k", "₦500k–₦1M", "Above ₦1M"],
          },
          {
            label: "Primary Financial Goal",
            value: primaryGoal,
            set: setPrimaryGoal,
            options: ["Build emergency fund", "Pay off debt", "Start investing", "Grow wealth", "Buy property", "Start a business", "Retire early"],
          },
          {
            label: "Risk Tolerance",
            value: riskTolerance,
            set: setRiskTolerance,
            options: ["Conservative (capital preservation)", "Moderate (balanced growth)", "Aggressive (maximum growth)"],
          },
        ].map(({ label, value, set, options }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
              {label}
            </div>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--text)",
                background: "var(--card)",
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              {options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button
          onClick={handleProfileSave}
          style={{
            marginTop: 4,
            padding: "9px 18px",
            background: profileSaved ? "var(--green2)" : "var(--green)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background .15s",
          }}
        >
          {profileSaved ? "✓ Saved" : "Save Profile"}
        </button>
      </Section>
    </>
  );
}

// ── Notifications Tab ──────────────────────────────────────
function NotifsTab() {
  const [toggles, setToggles] = useState({
    salary: true,
    spending: true,
    goals: true,
    news: true,
    checkin: true,
    digest: false,
  });

  function set(key: keyof typeof toggles, val: boolean) {
    setToggles((t) => ({ ...t, [key]: val }));
  }

  return (
    <Section title="Notification Preferences" sub="Control when and how your buddies reach out">
      <SettingsRow
        label="Salary / Large credit alerts"
        sub="Buddy reaches out when a large credit is detected"
        right={<Toggle on={toggles.salary} onChange={(v) => set("salary", v)} aria-label="Salary / Large credit alerts" />}
      />
      <SettingsRow
        label="Spending threshold warnings"
        sub="Alert when you exceed weekly category budgets"
        right={<Toggle on={toggles.spending} onChange={(v) => set("spending", v)} aria-label="Spending threshold warnings" />}
      />
      <SettingsRow
        label="Goal deadline reminders"
        sub="Reminder when a goal deadline is 2 weeks away"
        right={<Toggle on={toggles.goals} onChange={(v) => set("goals", v)} aria-label="Goal deadline reminders" />}
      />
      <SettingsRow
        label="News & market events"
        sub="Buddy alerts you to relevant market developments"
        right={<Toggle on={toggles.news} onChange={(v) => set("news", v)} aria-label="News &amp; market events" />}
      />
      <SettingsRow
        label="72-hour follow-through check-ins"
        sub="Buddy asks if you acted on advice"
        right={<Toggle on={toggles.checkin} onChange={(v) => set("checkin", v)} aria-label="72-hour follow-through check-ins" />}
      />
      <SettingsRow
        label="Weekly digest"
        sub="Summary of your financial week every Sunday"
        right={<Toggle on={toggles.digest} onChange={(v) => set("digest", v)} aria-label="Weekly digest" />}
      />
      <SettingsRow
        label="Max notifications per day"
        sub="Hard cap across all buddies"
        right={<Sel options={["3 per day", "5 per day", "Unlimited"]} />}
      />
      <SettingsRow
        label="Quiet hours"
        sub="No notifications during these hours"
        right={<Sel options={["10pm – 7am", "11pm – 8am", "None"]} />}
        last
      />
    </Section>
  );
}

// ── Subscriptions Tab ──────────────────────────────────────
function SubsTab() {
  const subscribedBuddies = useBuddyStore((s) => s.subscribedBuddies);
  const loadSubscribedBuddies = useBuddyStore((s) => s.loadSubscribedBuddies);

  useEffect(() => {
    loadSubscribedBuddies();
  }, [loadSubscribedBuddies]);

  // Filter out free subscriptions to display only paid ones
  const paidSubs = subscribedBuddies.filter((b) => b.badgeType !== "free");

  // Parse price strings to compute total monthly NGN amount
  const getPriceNaira = (priceStr: string) => {
    if (priceStr.startsWith("₦")) {
      const parsed = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    }
    if (priceStr.startsWith("$")) {
      const parsed = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? 0 : parsed * 1500; // ₦1,500 exchange rate conversion
    }
    return 0;
  };

  const totalNaira = paidSubs.reduce((acc, curr) => acc + getPriceNaira(curr.price), 0);

  return (
    <Section title="My Subscriptions" sub="Finance Buddies you currently subscribe to">
      {paidSubs.length === 0 ? (
        <div
          style={{
            padding: "32px 0",
            textAlign: "center",
            fontSize: 13,
            color: "var(--muted)",
            border: "1.5px dashed var(--border)",
            borderRadius: 12,
            background: "var(--bg)",
          }}
        >
          You have no active paid subscriptions.
        </div>
      ) : (
        <>
          {paidSubs.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderBottom: i < paidSubs.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: s.avatarBg,
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: s.avatarIsSerif ? 11 : 14,
                    fontFamily: s.avatarIsSerif ? "var(--font-dm-serif)" : "inherit",
                    color: s.avatarIsSerif ? "rgba(255,255,255,.9)" : undefined,
                    fontWeight: s.avatarIsSerif ? 600 : undefined,
                    flexShrink: 0,
                  }}
                >
                  {s.avatarContent}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {s.price} · Active
                  </div>
                </div>
              </div>
              <GhostBtn label="Manage" />
            </div>
          ))}

          {/* Payment summary */}
          <div
            style={{
              marginTop: 16,
              padding: 14,
              background: "var(--bg)",
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              <span style={{ color: "var(--muted)" }}>Monthly total</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>
                ₦{totalNaira.toLocaleString()}/mo
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>Payment method</span>
              <span style={{ color: "var(--green2)", fontWeight: 500 }}>Paystack / PayPal</span>
            </div>
          </div>
        </>
      )}

      <button
        style={{
          marginTop: 14,
          padding: "9px 16px",
          border: "1px dashed var(--border)",
          borderRadius: 10,
          background: "transparent",
          color: "var(--muted)",
          fontSize: 13,
          cursor: "pointer",
          width: "100%",
        }}
      >
        + Add Payment Method
      </button>
    </Section>
  );
}

// ── Privacy Tab ────────────────────────────────────────────
function PrivacyTab() {
  const [agentEnabled, setAgentEnabled] = useState(true);

  async function handleExport() {
    await fetch("/api/settings/export");
    popup.success("Export Started", "Export started — you'll receive a download link via email.");
  }

  function handleRevokeGmail() {
    popup.danger(
      "Revoke Gmail Access",
      "Revoke Gmail access? This will disconnect all Gmail-synced data.",
      async () => {
        await fetch("/api/auth/gmail/revoke", { method: "POST" });
        popup.success("Gmail Revoked", "Gmail access revoked.");
      },
      "Revoke"
    );
  }

  function handleWipe() {
    popup.danger(
      "Delete All DataBank Data",
      "Delete ALL DataBank data? This permanently removes all statements, transactions, and synced emails. This cannot be undone.",
      async () => {
        await fetch("/api/databank/wipe", { method: "DELETE" });
        popup.success("Data Cleared", "All DataBank data deleted.");
      },
      "Delete All Data"
    );
  }

  function handleDeleteAccount() {
    popup.danger(
      "Delete Account",
      "Delete your account? This permanently removes your profile, all data, and all subscriptions. This cannot be undone.",
      async () => {
        await fetch("/api/user/delete", { method: "DELETE" });
        popup.success("Account Deletion", "Account deletion initiated.");
      },
      "Delete Account"
    );
  }

  return (
    <Section title="Privacy & Data" sub="Everything we hold about you, fully under your control">

      {/* ── Agentic Actions Access ── */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${agentEnabled ? "rgba(226,75,74,.15)" : "rgba(226,75,74,.4)"}`,
          padding: "18px 20px",
          marginBottom: 20,
          background: agentEnabled ? "transparent" : "rgba(226,75,74,.03)",
          transition: "border-color .2s, background .2s",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
          ⚡ Agentic Actions Access
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>
          {agentEnabled
            ? "When enabled, your Finance Buddies can suggest and execute financial actions with your approval. Disable instantly to block all execution."
            : "No buddy can execute financial actions until you re-enable this."}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: agentEnabled ? "var(--green2)" : "#C47F00", marginBottom: 3 }}>
              {agentEnabled ? "Allow Agentic Actions" : "Agentic Actions Paused"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Last action: Mar 19 via The Contrarian Investor
            </div>
          </div>
          <button
            role="switch"
            aria-checked={agentEnabled}
            aria-label="Allow Agentic Actions"
            onClick={() => setAgentEnabled((v) => !v)}
            style={{
              width: 48, height: 26, borderRadius: 13,
              background: agentEnabled ? "var(--green)" : "#E24B4A",
              border: "none", padding: 0, cursor: "pointer",
              position: "relative", transition: "background .2s", flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute", top: 3,
                left: agentEnabled ? 25 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#fff", transition: "left .2s",
                boxShadow: "0 1px 4px rgba(0,0,0,.3)",
              }}
            />
          </button>
        </div>
      </div>

      <SettingsRow
        label="Gmail integration"
        sub="Read-only · 47 alerts, 23 receipts synced"
        right={<GhostBtn label="Revoke Access" danger onClick={handleRevokeGmail} />}
      />
      <SettingsRow
        label="Bank statements"
        sub="2 files parsed · Raw files deleted after parsing"
        right={<GhostBtn label="View Data" />}
      />
      <SettingsRow
        label="Export all my data"
        sub="Download a full copy of everything we hold"
        right={<GhostBtn label="Export" onClick={handleExport} />}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 0",
          borderBottom: "none",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#E24B4A", marginBottom: 2 }}>
            Delete all data
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Permanently removes all stored data. Cannot be undone.
          </div>
        </div>
        <DangerBtn label="Delete All" onClick={handleWipe} />
      </div>

      <div
        style={{
          marginTop: 8,
          padding: "14px 0",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#E24B4A", marginBottom: 2 }}>
            Delete account
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Permanently removes your account and all associated data.
          </div>
        </div>
        <DangerBtn label="Delete Account" onClick={handleDeleteAccount} />
      </div>
    </Section>
  );
}

// ── Appearance Tab ─────────────────────────────────────────
const CURRENCY_OPTIONS: { label: string; code: string }[] = [
  { label: "₦ Nigerian Naira", code: "NGN" },
  { label: "$ US Dollar",      code: "USD" },
  { label: "₵ Ghanaian Cedi",  code: "GHS" },
  { label: "KSh Kenyan Shilling", code: "KES" },
  { label: "R South African Rand", code: "ZAR" },
];

function AppearTab() {
  const { resolvedTheme, setTheme } = useTheme();
  const [compact, setCompact] = useState(false);
  const { userCurrency, setUserCurrency, loadProfile } = useUserStore();

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const currencyLabel =
    CURRENCY_OPTIONS.find((o) => o.code === userCurrency)?.label ?? "₦ Nigerian Naira";

  return (
    <Section title="Appearance" sub="Customise how Smart Money looks">
      <SettingsRow
        label="Theme"
        sub="Light or dark mode"
        right={
          <Sel
            options={["Light", "Dark"]}
            value={resolvedTheme === "dark" ? "Dark" : "Light"}
            onChange={(v) => setTheme(v.toLowerCase())}
          />
        }
      />
      <SettingsRow
        label="Currency display"
        sub="Primary currency shown throughout the app"
        right={
          <Sel
            options={CURRENCY_OPTIONS.map((o) => o.label)}
            value={currencyLabel}
            onChange={(label) => {
              const match = CURRENCY_OPTIONS.find((o) => o.label === label);
              if (match) setUserCurrency(match.code);
            }}
          />
        }
      />
      <SettingsRow
        label="Compact chat bubbles"
        sub="Show more messages without scrolling"
        right={<Toggle on={compact} onChange={setCompact} aria-label="Compact chat bubbles" />}
      />
      <SettingsRow
        label="Chat bubble style"
        sub="Visual style for message bubbles"
        right={<Sel options={["Rounded", "Square", "Minimal"]} />}
      />
      <SettingsRow
        label="Font size"
        sub="Adjust text size throughout the app"
        right={<Sel options={["Small", "Default", "Large"]} />}
        last
      />
    </Section>
  );
}

// ── Nav items ──────────────────────────────────────────────
const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "notifs", icon: "🔔", label: "Notifications" },
  { id: "subs", icon: "💳", label: "Subscriptions" },
  { id: "privacy", icon: "🔒", label: "Privacy & Data" },
  { id: "appear", icon: "🎨", label: "Appearance" },
];

// ── Main page ──────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  function renderContent() {
    switch (tab) {
      case "profile":
        return <ProfileTab />;
      case "notifs":
        return <NotifsTab />;
      case "subs":
        return <SubsTab />;
      case "privacy":
        return <PrivacyTab />;
      case "appear":
        return <AppearTab />;
    }
  }

  return (
    <div
      className="flex-1 overflow-hidden"
      style={{ background: "var(--bg)", display: "grid", gridTemplateColumns: "220px 1fr", gap: 0 }}
    >
      {/* Left nav */}
      <div
        style={{
          borderRight: "1px solid var(--border)",
          padding: "16px 0",
          overflowY: "auto",
          background: "var(--card)",
        }}
      >
        {NAV_ITEMS.map(({ id, icon, label }) => {
          const active = tab === id;
          return (
            <div
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                fontSize: 13,
                color: active ? "var(--green)" : "var(--muted)",
                fontWeight: active ? 600 : 400,
                borderRight: active ? "2px solid var(--green)" : "2px solid transparent",
                cursor: "pointer",
                transition: "all .15s",
                background: active ? "rgba(0,196,140,.04)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.color = "var(--text)";
                  (e.currentTarget as HTMLDivElement).style.background = "var(--bg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{icon}</span>
              {label}
            </div>
          );
        })}

        {/* Log Out Button */}
        <div
          onClick={async () => {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            fontSize: 13,
            color: "#E24B4A",
            cursor: "pointer",
            transition: "all .15s",
            marginTop: 20,
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(226,75,74,.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>🚪</span>
          Log Out
        </div>
      </div>

      {/* Right content */}
      <div style={{ overflowY: "auto", padding: 28, background: "var(--bg)" }}>
        {renderContent()}
      </div>
    </div>
  );
}
