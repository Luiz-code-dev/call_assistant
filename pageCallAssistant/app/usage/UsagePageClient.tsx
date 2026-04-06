"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mic2, LogOut, ArrowLeft, Zap, TrendingDown, TrendingUp,
  Loader2, CreditCard, RefreshCw, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

interface WalletBalance {
  balance: number;
  bonusBalance: number;
  trialBalance: number;
  monthlyAllocation: number;
  usedThisCycle: number;
  plan: string;
}

interface CreditTransaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  source: string;
  description: string;
  createdAt: string;
}

interface TransactionsResponse {
  content: CreditTransaction[];
  totalElements: number;
}

interface Props {
  stripePriceCredits5: string | null;
  stripePriceCredits10: string | null;
  stripePriceCredits25: string | null;
  stripePriceCredits50: string | null;
}

const PLAN_INFO: Record<string, { label: string; price: string; allocation: number; color: string }> = {
  free:    { label: "Free",    price: "$0/mo",   allocation: 50,   color: "text-zinc-400"   },
  basic:   { label: "Basic",   price: "$15/mo",  allocation: 500,  color: "text-violet-400" },
  premium: { label: "Premium", price: "$30/mo",  allocation: 1000, color: "text-indigo-400" },
};

export default function UsagePageClient({
  stripePriceCredits5,
  stripePriceCredits10,
  stripePriceCredits25,
  stripePriceCredits50,
}: Props) {
  const TOP_UPS = [
    { label: "$5",  credits: 50,  priceId: stripePriceCredits5  ?? "credits_5"  },
    { label: "$10", credits: 150, priceId: stripePriceCredits10 ?? "credits_10" },
    { label: "$25", credits: 400, priceId: stripePriceCredits25 ?? "credits_25" },
    { label: "$50", credits: 900, priceId: stripePriceCredits50 ?? "credits_50" },
  ];

  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [walletRes, txRes, meRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions?size=30"),
        fetch("/api/auth/me"),
      ]);
      const [walletData, txData, meData] = await Promise.all([
        walletRes.json(),
        txRes.json(),
        meRes.json(),
      ]);
      setWallet(walletData);
      setTransactions(txData.content ?? []);
      if (meData?.plan) setPlan(meData.plan);
    } catch {
      setWallet({ balance: 30, bonusBalance: 0, trialBalance: 30, monthlyAllocation: 50, usedThisCycle: 20, plan: "free" });
      setTransactions([
        { id: "1", type: "credit", amount: 50,  source: "trial",     description: "Trial credits on sign-up", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: "2", type: "debit",  amount: -12, source: "usage",     description: "Session — technical interview",  createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: "3", type: "debit",  amount: -8,  source: "usage",     description: "Session — sales call",           createdAt: new Date(Date.now() - 86400000).toISOString()     },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    const creditsOk = searchParams.get("credits");
    const amount = searchParams.get("amount");
    if (creditsOk === "success") {
      toast.success(`${amount ? `+${amount} credits` : "Credits"} added to your account!`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTopUp(pack: typeof TOP_UPS[0]) {
    setBuying(pack.priceId);
    try {
      const res = await fetch("/api/billing/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: pack.priceId, credits: pack.credits }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { window.location.href = "/login?redirect=/usage"; return; }
        throw new Error(data.message);
      }
      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment error");
    } finally {
      setBuying(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.free;
  const balance = wallet?.balance ?? 0;
  const allocation = wallet?.monthlyAllocation ?? planInfo.allocation;
  const used = wallet?.usedThisCycle ?? (allocation - balance);
  const topUpBalance = wallet?.bonusBalance ?? 0;
  const usedPct = allocation > 0 ? Math.min(100, (used / allocation) * 100) : 0;
  const remainingPct = 100 - usedPct;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                <Mic2 className="h-4 w-4 text-white" />
              </div>
            </Link>
            <span className="font-semibold">SpeakFlow</span>
            <span className="text-border">/</span>
            <span className="text-muted-foreground">Usage</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/api/auth/logout"><LogOut className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usage & Credits</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor your credit consumption and top up anytime.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Current plan</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{planInfo.label}</CardTitle>
                <Badge variant="outline" className={planInfo.color}>{planInfo.price}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="gradient" size="sm" className="w-full" asChild>
                <Link href="/pricing">
                  Upgrade plan
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Total balance</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {balance.toLocaleString()}
                <span className="ml-1.5 text-base font-normal text-muted-foreground">credits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Monthly allocation</span>
                <span className="font-medium text-foreground">{allocation}</span>
              </div>
              {topUpBalance > 0 && (
                <div className="flex justify-between">
                  <span>Top-up credits</span>
                  <span className="font-medium text-emerald-400">+{topUpBalance}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Used this cycle</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {used.toLocaleString()}
                <span className="ml-1.5 text-base font-normal text-muted-foreground">/ {allocation}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-1.5">
                {remainingPct.toFixed(0)}% remaining ({(allocation - used)} credits)
              </p>
              <Progress value={usedPct} className="h-2" />
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Credit breakdown — current cycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="bg-violet-500 transition-all"
                style={{ width: `${usedPct}%` }}
                title={`${used} used`}
              />
              {topUpBalance > 0 && (
                <div
                  className="bg-emerald-500/70 transition-all"
                  style={{ width: `${Math.min(20, (topUpBalance / (allocation + topUpBalance)) * 100)}%` }}
                  title={`${topUpBalance} top-up`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-500" />
                Used — {used} credits
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-secondary border border-border" />
                Remaining — {Math.max(0, allocation - used)} credits
              </div>
              {topUpBalance > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/70" />
                  Top-up — {topUpBalance} credits
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-400" />
                  Add credits
                </CardTitle>
                <CardDescription className="mt-1">
                  One-time top-up. Credits never expire. Available starting at $5.
                </CardDescription>
              </div>
              <CreditCard className="h-5 w-5 text-violet-400/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TOP_UPS.map((pack) => (
                <button
                  key={pack.priceId}
                  onClick={() => handleTopUp(pack)}
                  disabled={!!buying}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-violet-500/20 bg-background/50 p-4 text-center transition hover:border-violet-500/50 hover:bg-violet-500/10 disabled:opacity-50"
                >
                  {buying === pack.priceId ? (
                    <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                  ) : (
                    <span className="text-xl font-bold">{pack.label}</span>
                  )}
                  <span className="text-xs text-muted-foreground group-hover:text-violet-300 transition">
                    {pack.credits} credits
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Credit history</CardTitle>
            <CardDescription>All credit events on your account</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        tx.type === "credit" ? "bg-emerald-500/10" : "bg-red-500/10"
                      }`}>
                        {tx.type === "credit"
                          ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{tx.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${
                      tx.type === "credit" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {tx.type === "credit" ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
