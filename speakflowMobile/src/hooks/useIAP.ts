import { useEffect, useState, useCallback } from "react";
import { useIAP as useIAPLib, ErrorCode } from "react-native-iap";
import { Platform } from "react-native";
import { ApiClient } from "@infrastructure/http/ApiClient";
import { useAuthStore } from "@presentation/stores/authStore";

// ── Subscription SKUs (auto-renewable, monthly) ─────────────────────────────
export const PLAN_SKUS = [
  "br.com.speakflow.plan.basic",
  "br.com.speakflow.plan.premium",
] as const;

// ── Consumable credit pack SKUs (one-time, no expiry) ────────────────────────
export const PACK_SKUS = [
  "br.com.speakflow.credits_50",
  "br.com.speakflow.credits_150",
  "br.com.speakflow.credits_400",
] as const;

const ALL_SKUS = [...PLAN_SKUS, ...PACK_SKUS] as const;
export type PlanSKU = (typeof PLAN_SKUS)[number];
export type PackSKU = (typeof PACK_SKUS)[number];
export type IAPSKU = (typeof ALL_SKUS)[number];

export type IAPProduct = {
  sku: IAPSKU;
  title: string;
  subtitle: string;
  localizedPrice: string;
  type: "plan" | "pack";
  credits: number;
  plan?: "basic" | "premium";
};

const PLAN_META: Record<string, { plan: "basic" | "premium"; credits: number; subtitle: string; fallbackPrice: string }> = {
  "br.com.speakflow.plan.basic":   { plan: "basic",   credits: 500,  subtitle: "500 créditos/mês",   fallbackPrice: "R$ 74,90/mês"  },
  "br.com.speakflow.plan.premium": { plan: "premium", credits: 1000, subtitle: "1.000 créditos/mês", fallbackPrice: "R$ 149,90/mês" },
};

const PACK_META: Record<string, { credits: number; fallbackPrice: string }> = {
  "br.com.speakflow.credits_50":  { credits: 50,  fallbackPrice: "R$ 24,90"  },
  "br.com.speakflow.credits_150": { credits: 150, fallbackPrice: "R$ 49,90"  },
  "br.com.speakflow.credits_400": { credits: 400, fallbackPrice: "R$ 119,90" },
};

function buildFallback(): IAPProduct[] {
  return [
    ...PLAN_SKUS.map((sku) => {
      const m = PLAN_META[sku]!;
      return { sku, title: m.plan === "basic" ? "Plano Básico" : "Plano Premium", subtitle: m.subtitle, localizedPrice: m.fallbackPrice, type: "plan" as const, credits: m.credits, plan: m.plan };
    }),
    ...PACK_SKUS.map((sku) => {
      const m = PACK_META[sku]!;
      return { sku, title: `${m.credits} Créditos`, subtitle: "Compra única, não expira", localizedPrice: m.fallbackPrice, type: "pack" as const, credits: m.credits };
    }),
  ];
}

export function useIAP() {
  const [purchasing, setPurchasing] = useState<IAPSKU | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [products, setProducts] = useState<IAPProduct[]>(buildFallback());
  const { refreshUser } = useAuthStore();

  const { connected, products: rawProducts, fetchProducts, requestPurchase, finishTransaction } = useIAPLib({
    onPurchaseSuccess: async (purchase) => {
      const txId = (purchase as any).transactionId ?? (purchase as any).id ?? "";
      const productId = (purchase as any).productId ?? (purchase as any).sku ?? "";
      const isPack = PACK_SKUS.includes(productId as PackSKU);
      try {
        await ApiClient.post("/api/iap/apple", {
          transactionId: txId,
          productId,
          type: isPack ? "pack" : "plan",
        });
        await finishTransaction({ purchase, isConsumable: isPack });
        await refreshUser();
      } catch (e) {
        console.warn("IAP grant error:", e);
      }
      setPurchasing(null);
    },
    onPurchaseError: (error) => {
      if ((error as any).code !== ErrorCode.UserCancelled) {
        setPurchaseError((error as any).message ?? "Erro na compra");
      }
      setPurchasing(null);
    },
  });

  useEffect(() => {
    if (!connected || Platform.OS !== "ios") return;
    Promise.all([
      fetchProducts({ skus: [...PLAN_SKUS], type: "subs" }),
      fetchProducts({ skus: [...PACK_SKUS], type: "in-app" }),
    ]).catch(console.warn);
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (!rawProducts || rawProducts.length === 0) return;
    setProducts(
      buildFallback().map((fallback) => {
        const live = rawProducts.find((p: any) => (p.id ?? p.productId) === fallback.sku);
        if (!live) return fallback;
        return {
          ...fallback,
          title: (live as any).title ?? fallback.title,
          localizedPrice: (live as any).localizedPrice ?? fallback.localizedPrice,
        };
      })
    );
  }, [rawProducts]);

  const buy = useCallback(async (sku: IAPSKU) => {
    setPurchaseError(null);
    setPurchasing(sku);
    const isPack = PACK_SKUS.includes(sku as PackSKU);
    try {
      await requestPurchase({
        request: { apple: { sku }, google: { skus: [sku] } },
        type: isPack ? "in-app" : "subs",
      });
    } catch (e: any) {
      setPurchaseError(e?.message ?? "Compra cancelada");
      setPurchasing(null);
    }
  }, [requestPurchase]);

  const planProducts = products.filter((p) => p.type === "plan");
  const packProducts = products.filter((p) => p.type === "pack");

  return { connected, planProducts, packProducts, purchasing, purchaseError, buy };
}
