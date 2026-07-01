"use client";

import { useEffect, useState, useRef } from "react";
import { X, ShieldCheck, AlertCircle } from "lucide-react";
import type { Buddy } from "@/lib/buddies";
import { createClient } from "@/lib/supabase/client";

// Helper for dynamic script loading
function loadExternalScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type PaymentModalProps = {
  buddy: Buddy;
  onSuccess: (sessionId: string) => void;
  onClose: () => void;
};

export function PaymentModal({ buddy, onSuccess, onClose }: PaymentModalProps) {
  const [gateway, setGateway] = useState<"paystack" | "paypal">("paystack");
  const [pricing, setPricing] = useState<{ priceKobo: number; priceNaira: number; priceUsd: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState(false);

  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch pricing and check user authentication
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    fetch(`/api/subscriptions/price?buddyId=${buddy.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPricing(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load pricing details:", err);
        // Fallback pricing estimates
        setPricing({
          priceKobo: 300000,
          priceNaira: 3000,
          priceUsd: 7.00,
        });
        setLoading(false);
      });
  }, [buddy.id]);

  // 2. Load Paystack Inline JS SDK
  useEffect(() => {
    loadExternalScript("https://js.paystack.co/v1/inline.js").then((success) => {
      setPaystackLoaded(success);
    });
  }, []);

  // 3. Load PayPal JS SDK and render buttons when tab changes to paypal
  useEffect(() => {
    if (gateway !== "paypal" || !pricing) return;

    let active = true;
    setPaypalError(false);

    loadExternalScript("https://www.paypal.com/sdk/js?client-id=sb&currency=USD").then((success) => {
      if (!active) return;
      if (!success) {
        setPaypalError(true);
        return;
      }
      setPaypalLoaded(true);

      // Render the PayPal buttons with a slight delay to ensure div is mounted
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = setTimeout(() => {
        if (!active || !paypalContainerRef.current || !(window as any).paypal) return;

        // Clear container first to avoid duplicate rendering
        paypalContainerRef.current.innerHTML = "";

        try {
          (window as any).paypal.Buttons({
            createOrder: function (data: any, actions: any) {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: pricing.priceUsd.toFixed(2),
                    },
                    description: `Smart Money - AI Buddy Subscription: ${buddy.name}`,
                  },
                ],
              });
            },
            onApprove: async function (data: any, actions: any) {
              setProcessing(true);
              try {
                const details = await actions.order.capture();
                // Send capture ID to backend
                const res = await fetch("/api/subscriptions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    buddyId: buddy.id,
                    gateway: "paypal",
                    reference: details.id || data.orderID,
                  }),
                });
                const subData = await res.json();
                if (res.ok && subData.sessionId) {
                  onSuccess(subData.sessionId);
                } else {
                  alert("Subscription activation failed on the server. Please contact support.");
                  setProcessing(false);
                }
              } catch (e) {
                console.error("PayPal Capture Error:", e);
                alert("PayPal transaction capture failed.");
                setProcessing(false);
              }
            },
            onError: function (err: any) {
              console.error("PayPal checkout error:", err);
              setPaypalError(true);
            },
            style: {
              layout: "vertical",
              color: "blue",
              shape: "rect",
              label: "paypal",
            },
          }).render(paypalContainerRef.current);
        } catch (e) {
          console.error("Error initializing PayPal buttons:", e);
          setPaypalError(true);
        }
      }, 100);
    });

    return () => {
      active = false;
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [gateway, pricing, buddy.name, buddy.id, onSuccess]);

  // Paystack checkout triggers
  const handlePaystackPay = () => {
    if (!pricing || !user) return;
    setProcessing(true);

    if (!paystackLoaded || !(window as any).PaystackPop) {
      console.warn("Paystack SDK not loaded. Simulating mock payment.");
      triggerMockSubscription("paystack");
      return;
    }

    try {
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_d3f33cc2d42bfbe8a7732a39a2fb6ef3e6ffb5a3",
        email: user.email,
        amount: pricing.priceKobo,
        currency: "NGN",
        ref: "sub_" + Math.random().toString(36).substring(2) + Date.now(),
        callback: async function (response: any) {
          try {
            const res = await fetch("/api/subscriptions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                buddyId: buddy.id,
                gateway: "paystack",
                reference: response.reference,
              }),
            });
            const subData = await res.json();
            if (res.ok && subData.sessionId) {
              onSuccess(subData.sessionId);
            } else {
              alert("Subscription activation failed on the server. Please contact support.");
              setProcessing(false);
            }
          } catch (e) {
            console.error("Paystack registration error:", e);
            alert("Paystack registration failed.");
            setProcessing(false);
          }
        },
        onClose: function () {
          setProcessing(false);
        },
      });
      handler.openIframe();
    } catch (e) {
      console.error("Paystack initialization failed:", e);
      triggerMockSubscription("paystack");
    }
  };

  // Mock subscription fallback for dev testing
  const triggerMockSubscription = async (mockGateway: "paystack" | "paypal") => {
    console.log(`[PaymentModal] Triggering mock checkout registration for ${mockGateway}...`);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buddyId: buddy.id,
          gateway: mockGateway,
          reference: `mock_${mockGateway}_ref_${Math.random().toString(36).substring(2)}_${Date.now()}`,
        }),
      });
      const subData = await res.json();
      if (res.ok && subData.sessionId) {
        onSuccess(subData.sessionId);
      } else {
        alert("Mock subscription registration failed.");
        setProcessing(false);
      }
    } catch (e) {
      console.error("Mock subscription failed:", e);
      alert("Verification failed.");
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ animation: "fadeIn .25s ease-out" }}
    >
      <div
        className="w-full max-w-[420px] rounded-[20px] border overflow-hidden relative shadow-2xl"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          animation: "scaleIn .2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
            Unlock {buddy.name}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: "var(--muted)", border: "none", background: "transparent", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        {processing && (
          <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 text-white font-medium">
            <div className="w-9 h-9 border-3 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
            <div>Confirming subscription payment...</div>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-[12px]" style={{ color: "var(--muted)" }}>
              Loading payment information...
            </div>
          </div>
        ) : (
          <div className="p-5">
            {/* Buddy summary card */}
            <div
              className="flex items-center gap-3 p-3 rounded-[12px] mb-5 border"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            >
              <div
                className="w-11 h-11 rounded-[10px] flex items-center justify-center text-base"
                style={{
                  background: buddy.avatarBg,
                  fontFamily: buddy.avatarIsSerif ? "var(--font-dm-serif)" : "inherit",
                  color: buddy.avatarIsSerif ? "rgba(255,255,255,.9)" : undefined,
                  fontWeight: buddy.avatarIsSerif ? 600 : undefined,
                }}
              >
                {buddy.avatarContent}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>
                  {buddy.name}
                </div>
                <div className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
                  {buddy.tag}
                </div>
              </div>
            </div>

            {/* Gateway Selector Tabs */}
            <div
              className="flex p-[3px] rounded-[10px] gap-1 mb-5"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setGateway("paystack")}
                className="flex-1 py-2 text-[12px] font-bold rounded-[8px] border-none transition-all duration-200"
                style={{
                  background: gateway === "paystack" ? "var(--card)" : "transparent",
                  color: gateway === "paystack" ? "var(--green2)" : "var(--muted)",
                  boxShadow: gateway === "paystack" ? "0 2px 8px rgba(0,0,0,.08)" : "none",
                  cursor: "pointer",
                }}
              >
                Paystack (₦ / NGN)
              </button>
              <button
                onClick={() => setGateway("paypal")}
                className="flex-1 py-2 text-[12px] font-bold rounded-[8px] border-none transition-all duration-200"
                style={{
                  background: gateway === "paypal" ? "var(--card)" : "transparent",
                  color: gateway === "paypal" ? "var(--green2)" : "var(--muted)",
                  boxShadow: gateway === "paypal" ? "0 2px 8px rgba(0,0,0,.08)" : "none",
                  cursor: "pointer",
                }}
              >
                PayPal ($ / USD)
              </button>
            </div>

            {/* Paystack Panel */}
            {gateway === "paystack" && (
              <div style={{ animation: "fadeIn .2s ease-out" }}>
                <div className="rounded-[12px] p-4 mb-5 border text-center" style={{ borderColor: "var(--border)", background: "rgba(0,196,140,.04)" }}>
                  <div className="text-[11px] uppercase tracking-[1px] mb-1" style={{ color: "var(--muted)" }}>
                    Amount Due
                  </div>
                  <div className="text-[28px] font-extrabold" style={{ color: "var(--green2)", fontFamily: "var(--font-sora)" }}>
                    ₦{pricing?.priceNaira.toLocaleString()}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                    Renews monthly at ₦{pricing?.priceNaira.toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={handlePaystackPay}
                  className="w-full py-3 rounded-[12px] text-[13px] font-bold text-white transition-all border-none cursor-pointer"
                  style={{ background: "var(--green)" }}
                >
                  Pay with Paystack
                </button>
              </div>
            )}

            {/* PayPal Panel */}
            {gateway === "paypal" && (
              <div style={{ animation: "fadeIn .2s ease-out" }}>
                <div className="rounded-[12px] p-4 mb-5 border text-center" style={{ borderColor: "var(--border)", background: "rgba(66,133,244,.04)" }}>
                  <div className="text-[11px] uppercase tracking-[1px] mb-1" style={{ color: "var(--muted)" }}>
                    Amount Due
                  </div>
                  <div className="text-[28px] font-extrabold" style={{ color: "#0070ba", fontFamily: "var(--font-sora)" }}>
                    ${pricing?.priceUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                    Renews monthly at ${pricing?.priceUsd.toFixed(2)}
                  </div>
                </div>

                {paypalError ? (
                  <div className="text-center p-3">
                    <div className="text-[11px] mb-3 flex items-center justify-center gap-1.5" style={{ color: "var(--muted)" }}>
                      <AlertCircle size={14} />
                      PayPal checkout popup failed to load.
                    </div>
                    <button
                      onClick={() => triggerMockSubscription("paypal")}
                      className="w-full py-3 rounded-[12px] text-[13px] font-bold text-white transition-all border-none cursor-pointer"
                      style={{ background: "#0070ba" }}
                    >
                      Bypass &amp; Subscribe (Mock PayPal)
                    </button>
                  </div>
                ) : !paypalLoaded ? (
                  <div className="p-4 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#0070ba] border-t-transparent rounded-full animate-spin" />
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                      Loading PayPal buttons...
                    </div>
                  </div>
                ) : (
                  <div ref={paypalContainerRef} className="w-full min-h-[45px]" />
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-center" style={{ color: "var(--muted)" }}>
              <ShieldCheck size={13} style={{ color: "var(--green2)" }} />
              Secured Checkout. Cancellations supported anytime.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
