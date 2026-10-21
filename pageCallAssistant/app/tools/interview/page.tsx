import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Suspense } from "react";
import InterviewClient from "./InterviewClient";

export default async function InterviewPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/tools/interview");

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { plan: true, credits: true },
  });
  if (!user) redirect("/login");

  return (
    <Suspense>
      <InterviewClient userPlan={user.plan} credits={user.credits} />
    </Suspense>
  );
}
