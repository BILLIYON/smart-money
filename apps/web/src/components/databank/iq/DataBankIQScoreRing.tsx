"use client";

import React from "react";
import { motion } from "framer-motion";
import { IQLevelInfo, getIQLevel } from "@/lib/databank-iq";

interface DataBankIQScoreRingProps {
  score: number;
  level?: IQLevelInfo;
  size?: number;
  strokeWidth?: number;
  showDetails?: boolean;
}

export function DataBankIQScoreRing({
  score,
  level: providedLevel,
  size = 180,
  strokeWidth = 14,
  showDetails = true,
}: DataBankIQScoreRingProps) {
  const currentScore = Math.max(0, Math.min(100, Math.round(score)));
  const level = providedLevel || getIQLevel(currentScore);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Outer Glow Halo */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30 transition-all duration-700"
          style={{ background: level.color }}
        />

        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Value Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={level.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: `drop-shadow(0 0 8px ${level.color}88)`,
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.div
            key={currentScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-baseline"
          >
            <span className="text-[44px] font-black tracking-tight text-white leading-none">
              {currentScore}
            </span>
            <span className="text-[16px] font-bold text-gray-400 ml-0.5">/100</span>
          </motion.div>
          <span
            className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5"
            style={{
              background: level.bgRgba,
              color: level.color,
              border: `1px solid ${level.color}40`,
            }}
          >
            {level.name}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 text-center">
          <div className="text-[13px] font-semibold text-gray-300">{level.tagline}</div>
        </div>
      )}
    </div>
  );
}
