export type Plan = "free" | "starter" | "pro" | "enterprise";

export interface User {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  createdAt: string;
}

export interface CreditWallet {
  userId: string;
  balance: number;
  bonusBalance: number;
  trialBalance: number;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: "credit" | "debit";
  amount: number;
  source: "trial" | "plan" | "purchase" | "usage";
  description: string;
  sessionId?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: "active" | "canceled" | "past_due" | "trialing";
  renewalDate: string;
  stripeSubscriptionId?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  priceId?: string;
  credits: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}
