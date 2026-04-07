import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import UsagePageClient from "./UsagePageClient";

export default async function UsagePage() {
  const session = await getSession();
  return (
    <Suspense>
      <UsagePageClient
        userPlan={session?.plan ?? null}
        stripePriceCredits5={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5 ?? null}
        stripePriceCredits10={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10 ?? null}
        stripePriceCredits25={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25 ?? null}
        stripePriceCredits50={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_50 ?? null}
      />
    </Suspense>
  );
}
