"use client";

import { useState, useRef, useEffect } from "react";
import { X, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";

type OTPModalProps = {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  targetDestination: string;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
};

export function OTPModal({
  isOpen,
  title = "Enter Verification Code",
  subtitle = "We sent a 6-digit verification code to",
  targetDestination,
  onClose,
  onVerify,
  onResend,
}: OTPModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(Array(6).fill(""));
      setError(null);
      setResendCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const handleChange = (index: number, val: string) => {
    // Only numbers
    const cleanVal = val.replace(/\D/g, "");
    if (!cleanVal && val !== "") return;

    const newDigits = [...digits];
    if (cleanVal.length > 1) {
      // Pasted multi-digit string
      const pasted = cleanVal.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();

      if (pasted.length === 6) {
        handleAutoSubmit(pasted.join(""));
      }
      return;
    }

    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-advance
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join("");
    if (fullCode.length === 6) {
      handleAutoSubmit(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleAutoSubmit = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      await onVerify(code);
    } catch (err: any) {
      setError(err?.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    await handleAutoSubmit(code);
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await onResend();
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || "Failed to resend verification code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-[440px] rounded-[24px] p-7 transition-all duration-200 overflow-hidden"
        style={{
          background: "#13233d",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white transition-colors"
          style={{ background: "rgba(255, 255, 255, 0.05)" }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5 mx-auto bg-[rgba(0,196,140,0.12)] border border-[rgba(0,196,140,0.3)]">
          <ShieldCheck size={28} className="text-[#00c48c]" />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {subtitle}{" "}
            <span className="font-semibold text-white break-all">{targetDestination}</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* OTP Inputs */}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-2 mb-6">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 rounded-xl text-center text-xl font-bold font-mono text-white transition-all outline-none"
                style={{
                  background: digit ? "rgba(0, 196, 140, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: digit ? "2px solid #00c48c" : "1px solid rgba(255, 255, 255, 0.12)",
                }}
              />
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || digits.join("").length < 6}
            className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            style={{
              background: "#00c48c",
              boxShadow: "0 4px 20px rgba(0, 196, 140, 0.3)",
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="animate-spin" size={16} /> Verifying Code...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Verify &amp; Proceed <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        {/* Resend Cooldown */}
        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="text-xs text-slate-400">
              Didn&apos;t receive code? Resend available in{" "}
              <span className="font-semibold text-[#00c48c] font-mono">{resendCooldown}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendClick}
              disabled={isResending}
              className="text-xs font-semibold text-[#00c48c] hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              {isResending ? (
                <>
                  <RefreshCw className="animate-spin" size={12} /> Resending...
                </>
              ) : (
                "Resend Verification Code"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
