"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Supabase may require email confirmation — check if session was created
    if (data.session) {
      // Auto-confirmed (e.g. email auth disabled in Supabase settings)
      router.push("/");
      router.refresh();
    } else {
      // Email confirmation required — show success state
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ background: "var(--navy)" }}
      >
        <div
          className="w-full max-w-[400px] rounded-[20px] p-8 text-center"
          style={{ background: "var(--navy2)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <div className="text-[40px] mb-4">✉️</div>
          <div
            className="text-[20px] font-semibold mb-2"
            style={{ color: "#fff", fontFamily: "var(--font-sora)" }}
          >
            Check your email
          </div>
          <div className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,.45)" }}>
            We sent a confirmation link to <strong style={{ color: "#fff" }}>{email}</strong>.
            Click it to activate your account and get started.
          </div>
          <Link
            href="/login"
            className="inline-block px-6 py-[11px] rounded-[10px] text-[14px] font-semibold"
            style={{ background: "var(--green)", color: "#fff" }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--navy)" }}
    >
      {/* Background orbs */}
      <div
        className="pointer-events-none fixed"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(0,196,140,.06)",
          top: -100,
          left: -100,
        }}
      />
      <div
        className="pointer-events-none fixed"
        style={{
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(245,166,35,.04)",
          bottom: -60,
          right: -60,
        }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center mb-4"
            style={{ width: 52, height: 52, borderRadius: 14, background: "var(--green)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-7 h-7">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div
            className="text-[24px] font-bold"
            style={{ color: "#fff", fontFamily: "var(--font-sora)" }}
          >
            Smart <span style={{ color: "var(--green)" }}>Money</span>
          </div>
          <div className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,.45)" }}>
            Your AI-powered finance team
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-[20px] p-8"
          style={{ background: "var(--navy2)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <div
            className="text-[20px] font-semibold mb-1"
            style={{ color: "#fff", fontFamily: "var(--font-sora)" }}
          >
            Create your account
          </div>
          <div className="text-[13px] mb-7" style={{ color: "rgba(255,255,255,.4)" }}>
            Start building real wealth with AI finance buddies
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-[10px] rounded-[10px] mb-5 text-[12px]"
              style={{
                background: "rgba(226,75,74,.1)",
                border: "1px solid rgba(226,75,74,.3)",
                color: "#F87171",
              }}
            >
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full name */}
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-[.5px] mb-2"
                style={{ color: "rgba(255,255,255,.4)" }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Tunde Johnson"
                autoComplete="name"
                className="w-full rounded-[10px] px-3 py-[11px] text-[14px] outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.1)",
                  color: "#fff",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.1)")}
              />
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-[.5px] mb-2"
                style={{ color: "rgba(255,255,255,.4)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-[10px] px-3 py-[11px] text-[14px] outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.1)",
                  color: "#fff",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.1)")}
              />
            </div>

            {/* Password grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-[11px] font-semibold uppercase tracking-[.5px] mb-2"
                  style={{ color: "rgba(255,255,255,.4)" }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="8+ chars"
                  autoComplete="new-password"
                  className="w-full rounded-[10px] px-3 py-[11px] text-[14px] outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.1)",
                    color: "#fff",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.1)")}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] font-semibold uppercase tracking-[.5px] mb-2"
                  style={{ color: "rgba(255,255,255,.4)" }}
                >
                  Confirm
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat"
                  autoComplete="new-password"
                  className="w-full rounded-[10px] px-3 py-[11px] text-[14px] outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: confirm && confirm !== password
                      ? "1px solid rgba(226,75,74,.5)"
                      : "1px solid rgba(255,255,255,.1)",
                    color: "#fff",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      confirm && confirm !== password
                        ? "rgba(226,75,74,.5)"
                        : "rgba(255,255,255,.1)";
                  }}
                />
              </div>
            </div>

            {/* Terms */}
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,.3)" }}>
              By creating an account you agree to Smart Money&apos;s{" "}
              <span style={{ color: "var(--green)", cursor: "pointer" }}>Terms of Service</span>
              {" "}and{" "}
              <span style={{ color: "var(--green)", cursor: "pointer" }}>Privacy Policy</span>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[13px] rounded-[10px] text-[14px] font-semibold transition-all duration-150 mt-1"
              style={{
                background: loading ? "rgba(0,196,140,.5)" : "var(--green)",
                color: "#fff",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)";
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--green)";
              }}
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[13px]" style={{ color: "rgba(255,255,255,.35)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--green)", fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
