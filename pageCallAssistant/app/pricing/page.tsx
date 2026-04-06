import PricingPageClient from "./PricingPageClient";

export default function PricingPage() {
  return (
    <PricingPageClient
      stripePriceBasic={process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC ?? null}
      stripePricePremium={process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM ?? null}
      stripePriceCredits5={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5 ?? null}
      stripePriceCredits10={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10 ?? null}
      stripePriceCredits25={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25 ?? null}
      stripePriceCredits50={process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_50 ?? null}
    />
  );
}
