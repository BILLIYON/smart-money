export type OpportunityStatus = "active" | "acted" | "dismissed" | "missed";
export type OpportunitySource = "ai" | "partner";

export interface Opportunity {
  id: string;
  title: string;
  category: string;
  source: OpportunitySource;
  sourceName: string;
  sourceAvatar: string;
  sourceColor: string;
  reasoning: string;
  valueEstimate: string;
  status: OpportunityStatus;
  windowLabel: string;
}

export function calculateOpportunityStats(list: Opportunity[]) {
  const active = list.filter((o) => o.status === "active").length;
  const acted = list.filter((o) => o.status === "acted").length;
  const missed = list.filter((o) => o.status === "missed").length;
  return { active, acted, missed, total: list.length };
}
