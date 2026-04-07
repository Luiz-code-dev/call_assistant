import { getSession } from "@/lib/auth";
import PricingPageClient from "./PricingPageClient";

export default async function PricingPage() {
  const session = await getSession();
  const sessionUser = session
    ? { id: session.sub, name: session.name, email: session.email, plan: session.plan }
    : null;
  return (
    <PricingPageClient
      sessionUser={sessionUser}
      userPlan={session?.plan ?? null}
      stripePriceBasic={process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC ?? null}
      stripePricePremium={process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM ?? null}
      stripePriceCredits5={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5 ?? null}
      stripePriceCredits10={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10 ?? null}
      stripePriceCredits25={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25 ?? null}
      stripePriceCredits50={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_50 ?? null}
    />
  );
}
