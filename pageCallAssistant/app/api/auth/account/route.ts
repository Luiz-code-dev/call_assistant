import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const userId = payload.sub as string;

  await (db as any).$transaction([
    (db as any).message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
    (db as any).friendship.deleteMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
    (db as any).postLike.deleteMany({ where: { userId } }),
    (db as any).postComment.deleteMany({ where: { userId } }),
    (db as any).post.deleteMany({ where: { userId } }),
    (db as any).pushSubscription.deleteMany({ where: { userId } }),
    (db as any).userBadge.deleteMany({ where: { userId } }),
    (db as any).submission.deleteMany({ where: { userId } }),
    (db as any).proficiencyAssessment.deleteMany({ where: { userId } }),
    (db as any).dailyStreak.deleteMany({ where: { userId } }),
    (db as any).spinHistory.deleteMany({ where: { userId } }),
    (db as any).toolUsage.deleteMany({ where: { userId } }),
    (db as any).callSession.deleteMany({ where: { userId } }),
    (db as any).creditTransaction.deleteMany({ where: { userId } }),
    (db as any).circleMember.deleteMany({ where: { userId } }),
    (db as any).buddySession.deleteMany({ where: { userId } }),
    (db as any).feedback.deleteMany({ where: { userId } }),
    (db as any).orgMember.deleteMany({ where: { userId } }),
    (db as any).corpChallengeSubmission.deleteMany({ where: { userId } }),
    (db as any).corporateCertification.deleteMany({ where: { userId } }),
    (db as any).orgLiveSession.deleteMany({ where: { userId } }),
    (db as any).user.delete({ where: { id: userId } }),
  ]);

  const response = NextResponse.json({ success: true });
  response.cookies.delete("token");
  return response;
}
