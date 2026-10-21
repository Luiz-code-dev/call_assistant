import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Suspense } from "react";
import ImproveClient from "./ImproveClient";

export default async function ImprovePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/tools/improve");

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { plan: true, credits: true },
  });
  if (!user) redirect("/login");

  return (
    <Suspense>
      <ImproveClient userPlan={user.plan} credits={user.credits} />
    </Suspense>
  );
}
