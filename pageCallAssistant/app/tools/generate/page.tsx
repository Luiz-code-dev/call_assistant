import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Suspense } from "react";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/tools/generate");

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { plan: true, credits: true },
  });
  if (!user) redirect("/login");

  return (
    <Suspense>
      <GenerateClient userPlan={user.plan} credits={user.credits} />
    </Suspense>
  );
}
