"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataBankIQIntro } from "./DataBankIQIntro";
import { DataBankIQProgressHeader } from "./DataBankIQProgressHeader";
import { DataBankIQCard } from "./DataBankIQCard";
import { DataBankIQMilestoneModal } from "./DataBankIQMilestoneModal";
import { DataBankIQSummary } from "./DataBankIQSummary";
import { IQLevelInfo, getIQLevel } from "@/lib/databank-iq";
import { IQQuestion, DataBankIQSessionData } from "@/lib/databank-iq-generator";
import { popup } from "@/store/popupStore";

interface DataBankIQScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function DataBankIQScreen({ isOpen, onClose, onComplete }: DataBankIQScreenProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<DataBankIQSessionData | null>(null);
  const [step, setStep] = useState<"intro" | "quiz" | "summary">("intro");

  // Quiz progression state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(50);
  const [level, setLevel] = useState<IQLevelInfo>(getIQLevel(50));
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolvedTotal, setResolvedTotal] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // Milestone modal state
  const [activeMilestone, setActiveMilestone] = useState<{
    title: string;
    body: string;
    avatar: string;
  } | null>(null);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/databank/iq/session");
      const data = await res.json();
      if (data.success && data.session) {
        setSession(data.session);
        setScore(data.session.currentScore);
        setLevel(data.session.currentLevel);
      } else {
        popup.error("Failed to load DataBank IQ session", data.error || "Please try again.");
      }
    } catch (err: any) {
      console.error("[DataBankIQScreen] Load error:", err);
      popup.error("Connection Error", "Could not reach DataBank IQ service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setCurrentIndex(0);
      setResolvedTotal(0);
      setCompletedCount(0);
      setScoreDelta(null);
      fetchSession();
    }
  }, [isOpen, fetchSession]);

  const questions: IQQuestion[] = session?.questions || [];
  const currentQuestion: IQQuestion | undefined = questions[currentIndex];

  // Handle user answering a question
  const handleAnswer = async (payload: {
    category?: string;
    intent?: string;
    isSplit?: boolean;
    splitAllocations?: any[];
  }) => {
    if (!currentQuestion || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/databank/iq/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          tier: currentQuestion.tier,
          merchantName: currentQuestion.merchantName,
          matchingEntryIds: currentQuestion.matchingEntryIds,
          category: payload.category || currentQuestion.suggestedCategory,
          intent: payload.intent || currentQuestion.suggestedIntent,
          isSplit: payload.isSplit,
          splitAllocations: payload.splitAllocations,
          completedCount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const delta = data.iq.score - score;
        if (delta > 0) {
          setScoreDelta(delta);
        }
        setScore(data.iq.score);
        setLevel(data.iq.level);
        setResolvedTotal((prev) => prev + (data.resolvedCount || currentQuestion.matchingEntryIds.length));
        const newCompleted = completedCount + 1;
        setCompletedCount(newCompleted);

        // Check if milestone was triggered
        if (data.milestoneInsight) {
          setActiveMilestone(data.milestoneInsight);
        } else {
          advanceNextQuestion();
        }
      } else {
        popup.error("Error saving answer", data.error || "Please try again.");
      }
    } catch (err: any) {
      console.error("[DataBankIQScreen] Answer error:", err);
      popup.error("Connection Error", "Could not save your answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep("summary");
      onComplete?.();
    }
  };

  const handleMilestoneContinue = () => {
    setActiveMilestone(null);
    advanceNextQuestion();
  };

  const handleExit = () => {
    onComplete?.();
    onClose();
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen || step !== "quiz" || submitting || activeMilestone || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleExit();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const optionIdx = parseInt(e.key, 10) - 1;
        const opt = currentQuestion.options[optionIdx];
        if (opt && !opt.isCustom && !opt.isSplit) {
          handleAnswer({
            category: opt.category,
            intent: opt.intent,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, submitting, activeMilestone, currentQuestion]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl my-auto rounded-[28px] p-6 sm:p-8 relative overflow-hidden border border-white/10"
        style={{
          background: "linear-gradient(180deg, #111827 0%, #0B0E17 100%)",
          boxShadow: "0 30px 90px -20px rgba(0, 0, 0, 0.9), 0 0 50px -15px rgba(0, 196, 140, 0.15)",
        }}
      >
        {/* Close Button top-right */}
        <button
          onClick={handleExit}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer border border-white/10 text-[14px] z-10"
        >
          ✕
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#00C48C] animate-spin" />
            <div className="text-[14px] font-bold text-gray-300">
              Analyzing DataBank transactions with AI...
            </div>
            <div className="text-[12px] text-gray-500">
              Extracting top merchants, ambiguous debits, and intent signals
            </div>
          </div>
        ) : step === "intro" && session ? (
          <DataBankIQIntro
            session={session}
            onStart={() => {
              if (questions.length === 0) {
                setStep("summary");
              } else {
                setStep("quiz");
              }
            }}
            onDismiss={handleExit}
          />
        ) : step === "quiz" && currentQuestion ? (
          <div className="flex flex-col w-full">
            <DataBankIQProgressHeader
              score={score}
              level={level}
              scoreDelta={scoreDelta}
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              resolvedCount={resolvedTotal}
              remainingCount={questions.length - currentIndex}
              onExit={handleExit}
            />

            <AnimatePresence mode="wait">
              <DataBankIQCard
                key={currentQuestion.id}
                question={currentQuestion}
                onAnswer={handleAnswer}
                loading={submitting}
              />
            </AnimatePresence>
          </div>
        ) : (
          <DataBankIQSummary
            score={score}
            level={level}
            resolvedCount={resolvedTotal}
            totalAnswered={completedCount}
            onViewTransactions={handleExit}
          />
        )}

        {/* Milestone Insight Modal */}
        <DataBankIQMilestoneModal
          insight={activeMilestone}
          onContinue={handleMilestoneContinue}
        />
      </motion.div>
    </div>
  );
}
