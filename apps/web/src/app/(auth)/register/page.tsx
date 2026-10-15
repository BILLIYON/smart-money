"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OTPModal } from "@/components/auth/OTPModal";

// ── Google icon ────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP state
  const [isOtpOpen, setIsOtpOpen] = useState(false);

  function handleGoogle() {
    setError(null);
    setOauthLoading(true);
    const next = searchParams.get("next") ?? "/";
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  }

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

    try {
      // Send 6-digit Registration OTP via AWS SES
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "registration",
          targetEmail: email,
          fullName,
        }),
      });

      const resData = await res.json();

      if (!res.ok || resData.error) {
        setError(resData.error || "Failed to send verification code.");
        setLoading(false);
        return;
      }

      // Open OTP Verification Modal
      setIsOtpOpen(true);
    } catch (err: any) {
      setError(err?.message || "Unable to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  }

  const handleVerifyOtp = async (code: string) => {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "registration",
        targetEmail: email,
        fullName,
        password,
        code,
      }),
    });

    const resData = await res.json();
    if (!res.ok || resData.error) {
      throw new Error(resData.error || "Verification failed. Invalid code.");
    }

    // Success -> redirect
    const next = searchParams.get("next") ?? "/";
    router.push(next);
    router.refresh();
  };

  const handleResendOtp = async () => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "registration",
        targetEmail: email,
        fullName,
      }),
    });
    const resData = await res.json();
    if (!res.ok || resData.error) {
      throw new Error(resData.error || "Failed to resend code.");
    }
  };

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
              {loading ? "Sending OTP Code..." : "Create Account →"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,.08)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,.25)" }}>
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,.08)" }} />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 py-[11px] rounded-[10px] text-[14px] font-medium transition-all duration-150"
            style={{
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              color: "rgba(255,255,255,.8)",
              cursor: oauthLoading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!oauthLoading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.1)";
            }}
            onMouseLeave={(e) => {
              if (!oauthLoading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.05)";
            }}
          >
            <GoogleIcon />
            {oauthLoading ? "Redirecting…" : "Continue with Google"}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[13px]" style={{ color: "rgba(255,255,255,.35)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--green)", fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>

      {/* 6-Digit Registration OTP Verification Modal */}
      <OTPModal
        isOpen={isOtpOpen}
        title="Verify Your Registration"
        subtitle="Enter the 6-digit OTP code sent via email to"
        targetDestination={email}
        onClose={() => setIsOtpOpen(false)}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
      />
    </div>
  );
}
