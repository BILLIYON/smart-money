export type IQLevelName = "Blurry" | "Developing" | "Clear" | "Sharp" | "Elite";

export interface IQLevelInfo {
  name: IQLevelName;
  min: number;
  max: number;
  badge: string;
  tagline: string;
  description: string;
  color: string;
  bgRgba: string;
}

export interface IQCalculationResult {
  score: number;
  level: IQLevelInfo;
  totalTransactions: number;
  categorisedTransactions: number;
  uncategorisedTransactions: number;
  intentCapturedTransactions: number;
  totalValueMajor: number;
  categorisedValueMajor: number;
  intentValueMajor: number;
  categorisedPercent: number;
  intentPercent: number;
}

export type QuestionTier = "tier1_merchant" | "tier2_ambiguous" | "tier3_intent";

export interface IQQuestionOption {
  id: string;
  label: string;
  category?: string;
  intent?: string;
  isCustom?: boolean;
  isSplit?: boolean;
}

export interface IQQuestion {
  id: string;
  tier: QuestionTier;
  badge: string;
  title: string;
  subtitle: string;
  merchantName?: string;
  matchingEntryIds: string[];
  totalAmount: number; // in Naira (major units)
  transactionCount: number;
  suggestedCategory: string;
  suggestedIntent?: string;
  options: IQQuestionOption[];
  dateStr?: string;
}

export interface DataBankIQSessionData {
  openingNarrative: string;
  estimatedMinutes: number;
  currentScore: number;
  currentLevel: IQLevelInfo;
  totalTransactions: number;
  unresolvedCount: number;
  questions: IQQuestion[];
}
