export interface PartnerFirm {
  id: string;
  name: string;
  type: string;
  icon: string;
  banner: string;
  iconBg: string;
  desc: string;
  tags: string[];
  rating: string;
  clients: string;
  minPortfolio: string;
}

export interface PartnerReview {
  name: string;
  stars: string;
  text: string;
}

export interface PartnerFirmDetails {
  firm: PartnerFirm;
  fullDescription: string;
  includes: string[];
  reviews: PartnerReview[];
}

export interface MyPartnerAccessScope {
  key: string;
  label: string;
  desc: string;
  on: boolean;
}

export interface ConnectedPartner {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
}

export interface ClientConsentState {
  hasPartner: boolean;
  partner: ConnectedPartner | null;
  scopes: MyPartnerAccessScope[];
}

export interface ApprovalItem {
  id: string;
  client: string;
  initials: string;
  color: string;
  requestedBy: string;
  action: string;
  amount: string;
  sourceAccount?: string;
  from?: string;
  destination: string;
  reason?: string;
  reasoning?: string;
  timestamp: string;
  status: "pending_partner_approval" | "executed" | "declined_by_partner" | string;
}

export interface ClientRow {
  id?: string;
  userId?: string;
  email?: string;
  initials: string;
  color: string;
  name: string;
  joined: string;
  healthScore: number;
  healthColor: string;
  netWorth: string;
  lastActivity: string;
  dataShared: string;
  buddy: string;
  status: string;
  advisorNotes?: string;
}


