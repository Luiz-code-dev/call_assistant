import { Suspense } from "react";
import UsagePageClient from "./UsagePageClient";

export default function UsagePage() {
  return (
    <Suspense>
      <UsagePageClient
        stripePriceCredits5={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5 ?? null}
        stripePriceCredits10={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10 ?? null}
        stripePriceCredits25={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25 ?? null}
        stripePriceCredits50={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_50 ?? null}
      />
    </Suspense>
  );
}
