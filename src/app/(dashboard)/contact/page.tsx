"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareHeart,
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  HelpCircle,
  Bug,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Mail,
  ArrowRight,
} from "lucide-react";
import { popup } from "@/store/popupStore";

type FeedbackType = "feature" | "review" | "bug" | "support";

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: any; desc: string }[] = [
  { id: "feature", label: "Feature Suggestion", icon: Lightbulb, desc: "Tell us what new tools or buddies to build" },
  { id: "review", label: "App Review", icon: Star, desc: "Rate your experience & share testimonials" },
  { id: "bug", label: "Report an Issue", icon: Bug, desc: "Let us know if something isn't working right" },
  { id: "support", label: "General Support", icon: HelpCircle, desc: "Get assistance with your account or syncs" },
];

const CATEGORIES = [
  "General Experience",
  "AI Buddies & Chat",
  "DataBank & Gmail Sync",
  "Financial Goals",
  "AI Studio & Creator",
  "UI Design & Aesthetics",
  "Performance & Speed",
];

const COMMUNITY_FEEDBACK = [
  {
    id: "fb-1",
    user: "Tunde A.",
    type: "Feature Request",
    title: "Zero-Quota Regex Bank Alert Parser",
    status: "Implemented 🎉",
    likes: 42,
    date: "2 days ago",
  },
  {
    id: "fb-2",
    user: "Chioma K.",
    type: "App Review",
    title: "Customized Smart Money Popups & Dark Glass Theme",
    status: "Implemented 🎉",
    likes: 38,
    date: "3 days ago",
  },
  {
    id: "fb-3",
    user: "Emeka O.",
    type: "Feature Request",
    title: "Multi-Bank Account Balances Card in DataBank",
    status: "Implemented 🎉",
    likes: 29,
    date: "Yesterday",
  },
  {
    id: "fb-4",
    user: "Aisha M.",
    type: "Feature Request",
    title: "Automated Monthly Net Worth Forecast",
    status: "In Progress 🚀",
    likes: 19,
    date: "Today",
  },
];

export default function ContactPage() {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("review");
  const [category, setCategory] = useState("General Experience");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [refining, setRefining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ticketId: string; aiReply: string } | null>(null);

  const handleRefineWithAI = () => {
    if (!message.trim()) {
      popup.alert("Empty Message", "Please type a draft review or message first for AI to refine!");
      return;
    }

    setRefining(true);
    setTimeout(() => {
      let polished = message.trim();
      if (!polished.endsWith(".")) polished += ".";

      const ratingText = rating >= 4 ? "Overall, the app is great!" : "I see area for improvement.";
      const refinedMessage = `${polished} ${ratingText} Please prioritize this for the upcoming Smart Money releases so we can get an even better finance experience.`;
      
      setMessage(refinedMessage);
      setRefining(false);
      popup.success("Refined with AI", "Your feedback has been structured and enhanced by AI!");
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      popup.alert("Missing Message", "Please enter your review or feedback message before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          type: feedbackType,
          subject: subject.trim() || `${feedbackType.toUpperCase()} Feedback`,
          message,
          category,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({
          ticketId: data.ticketId,
          aiReply: data.aiReply,
        });
        popup.success("Review Submitted", "Thank you! Your feedback has been recorded.");
      } else {
        popup.error("Submission Error", data.error || "Failed to send feedback.");
      }
    } catch {
      popup.error("Error", "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full max-w-[1280px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.5px] mb-1" style={{ color: "var(--green)" }}>
            <MessageSquareHeart size={16} /> Contact &amp; Community Feedback
          </div>
          <div className="text-[24px] sm:text-[28px] font-bold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            Help Us Make <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>Smart Money</em> Better
          </div>
          <div className="text-[13px] mt-1 max-w-[640px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Have ideas for new features, feedback on existing tools, or an issue to report? Submit your review below and our AI team will process it instantly!
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 380px)" }}>
          
          {/* Left Column: Form & AI Response */}
          <div className="flex flex-col gap-5">
            
            {/* Form Card */}
            <div className="rounded-[18px] p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                
                {/* 1. Feedback Type Selection */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-2" style={{ color: "var(--muted)" }}>
                    1. Select Feedback Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FEEDBACK_TYPES.map((t) => {
                      const Icon = t.icon;
                      const active = feedbackType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFeedbackType(t.id)}
                          className="p-3 rounded-[12px] flex flex-col items-start transition-all duration-150 text-left border cursor-pointer"
                          style={{
                            background: active ? "rgba(0,196,140,0.12)" : "var(--bg)",
                            borderColor: active ? "var(--green)" : "var(--border)",
                          }}
                        >
                          <Icon size={18} className="mb-2" style={{ color: active ? "var(--green2)" : "var(--muted)" }} />
                          <div className="text-[12px] font-semibold" style={{ color: active ? "var(--text)" : "var(--muted)" }}>
                            {t.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Star Rating (if Review/Feedback) */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-2" style={{ color: "var(--muted)" }}>
                    2. Rate Your Smart Money Experience
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Star
                            size={26}
                            fill={(hoverRating || rating) >= star ? "#F5A623" : "none"}
                            stroke={(hoverRating || rating) >= star ? "#F5A623" : "var(--border)"}
                            strokeWidth={2}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-[12px] font-semibold ml-2" style={{ color: "#F5A623" }}>
                      {rating === 5 ? "🔥 Mindblowing" : rating === 4 ? "❤️ Excellent" : rating === 3 ? "👍 Good" : rating === 2 ? "😐 Needs Improvement" : "👎 Poor"}
                    </span>
                  </div>
                </div>

                {/* 3. Category & Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1.5" style={{ color: "var(--muted)" }}>
                      Area of App
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none border cursor-pointer"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1.5" style={{ color: "var(--muted)" }}>
                      Subject / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Add dark mode charts option"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none border"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                    />
                  </div>
                </div>

                {/* 4. Message & AI Refine */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: "var(--muted)" }}>
                      Your Review / Message
                    </label>
                    <button
                      type="button"
                      onClick={handleRefineWithAI}
                      disabled={refining}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold border transition-all cursor-pointer hover:bg-emerald-500/10"
                      style={{ borderColor: "rgba(0,196,140,0.3)", color: "var(--green2)", background: "transparent" }}
                    >
                      <Sparkles size={12} className={refining ? "animate-spin" : ""} />
                      {refining ? "Polishing..." : "✨ Refine with AI"}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Tell us what you love, what can be improved, or features you'd like us to add..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none resize-none border leading-relaxed"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-[12px] text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer text-white"
                  style={{ background: "var(--green)" }}
                >
                  <Send size={15} />
                  {submitting ? "Submitting Review..." : "Submit Review & Send Feedback"}
                </button>
              </form>
            </div>

            {/* AI Instant Response Card (If submitted) */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="rounded-[18px] p-6 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, var(--navy2), var(--navy))", border: "1px solid rgba(0,196,140,0.3)", color: "#fff" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[8px] bg-emerald-500/20 flex items-center justify-center text-[16px]">
                        🎯
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">AI Assistant Response</div>
                        <div className="text-[10px] text-gray-400">Ticket ID: {result.ticketId}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Logged to Roadmap
                    </span>
                  </div>

                  <p className="text-[13px] leading-relaxed text-gray-200 mb-4 bg-white/5 p-3.5 rounded-[12px] border border-white/10 italic">
                    &ldquo;{result.aiReply}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-white/10 pt-3">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Received by Engineering Squad
                    </span>
                    <button
                      onClick={() => {
                        setResult(null);
                        setMessage("");
                        setSubject("");
                      }}
                      className="text-emerald-400 font-semibold hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Submit Another Feedback
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Right Column: Support & Community Roadmap */}
          <div className="flex flex-col gap-5">
            
            {/* Direct Support Card */}
            <div className="rounded-[18px] p-5 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[14px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
                <ShieldCheck size={16} className="text-emerald-400" /> Direct Support Channels
              </div>
              <div className="text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Need immediate help with your account, DataBank integration, or billing?
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <a
                  href="mailto:support@smartmoney.app"
                  className="flex items-center justify-between p-3 rounded-[12px] border transition-colors hover:border-emerald-500/40"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <div className="flex items-center gap-2.5 text-[12px]">
                    <Mail size={16} className="text-emerald-400" />
                    <div>
                      <div className="font-semibold">Email Us</div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>support@smartmoney.app</div>
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: "var(--muted)" }} />
                </a>

                <button
                  onClick={() => router.push("/chat")}
                  className="flex items-center justify-between p-3 rounded-[12px] border transition-colors text-left cursor-pointer hover:border-emerald-500/40"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <div className="flex items-center gap-2.5 text-[12px]">
                    <MessageSquare size={16} className="text-emerald-400" />
                    <div>
                      <div className="font-semibold">Ask Finance Buddy</div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>Instant AI answers 24/7</div>
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: "var(--muted)" }} />
                </button>
              </div>
            </div>

            {/* Community Feedback & Roadmap */}
            <div className="rounded-[18px] p-5 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <div className="text-[14px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
                  🗺️ Community Feedback Roadmap
                </div>
              </div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                See what users have suggested and what we&apos;re building next:
              </div>

              <div className="flex flex-col gap-2.5 mt-1">
                {COMMUNITY_FEEDBACK.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-3 rounded-[12px] border flex flex-col gap-1.5"
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-400">{fb.type}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {fb.status}
                      </span>
                    </div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--text)" }}>
                      {fb.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--muted)" }}>
                      <span>By {fb.user} · {fb.date}</span>
                      <span>👍 {fb.likes} votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
