import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { EduRole } from "@prisma/client";
import { db } from "@/lib/db";

export interface EduContext {
  userId: string;
  networkId: string;
  schoolId: string | null;
  role: EduRole;
  membershipId: string;
}

export interface StudentContext {
  studentId: string;
  networkId: string;
  enrollmentId: string;
  classId: string;
}

const studentSecret = new TextEncoder().encode(
  process.env.EDU_STUDENT_JWT_SECRET || "edu-student-dev-secret"
);

export async function getEduContext(): Promise<EduContext | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get("sf_edu_ctx")?.value;
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, studentSecret);
    const membershipId = payload["mid"] as string | undefined;
    if (!membershipId) return null;

    const membership = await db.eduMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, userId: true, networkId: true, schoolId: true, role: true, isActive: true },
    });
    if (!membership || !membership.isActive) return null;

    return {
      userId: membership.userId,
      networkId: membership.networkId,
      schoolId: membership.schoolId,
      role: membership.role,
      membershipId: membership.id,
    };
  } catch {
    return null;
  }
}

export async function getStudentContext(): Promise<StudentContext | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get("sf_edu_student")?.value;
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, studentSecret);
    const studentId = payload["sub"] as string | undefined;
    const networkId = payload["nid"] as string | undefined;
    const enrollmentId = payload["eid"] as string | undefined;
    const classId = payload["cid"] as string | undefined;

    if (!studentId || !networkId || !enrollmentId || !classId) return null;

    return { studentId, networkId, enrollmentId, classId };
  } catch {
    return null;
  }
}
