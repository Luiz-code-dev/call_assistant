import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Formato inválido. Envie multipart/form-data." }, { status: 400 }); }

  const audio = formData.get("audio") as File | null;
  const challengeId = formData.get("challengeId") as string | null;
  const circleId = formData.get("circleId") as string | null;

  if (!audio || !challengeId || !circleId)
    return NextResponse.json({ error: "audio, challengeId e circleId são obrigatórios." }, { status: 400 });

  if (audio.size > 25 * 1024 * 1024)
    return NextResponse.json({ error: "Áudio muito grande (máx. 25 MB)." }, { status: 413 });

  const [member, challenge, existing] = await Promise.all([
    db.circleMember.findUnique({ where: { circleId_userId: { circleId, userId: session.sub } } }),
    db.challenge.findUnique({ where: { id: challengeId } }),
    db.submission.findUnique({ where: { userId_challengeId: { userId: session.sub, challengeId } } }),
  ]);

  if (!member || member.status !== "active")
    return NextResponse.json({ error: "Você não é membro deste Circle." }, { status: 403 });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  if (new Date() > challenge.endsAt)
    return NextResponse.json({ error: "O período de submissão encerrou." }, { status: 410 });
  if (existing) return NextResponse.json({ error: "Você já enviou uma resposta para este desafio." }, { status: 409 });

  try {
    const openai = getOpenAI();

    const transcription = await openai.audio.transcriptions.create({
      file: new File([await audio.arrayBuffer()], audio.name || "recording.webm", { type: audio.type || "audio/webm" }),
      model: "whisper-1",
      language: "en",
      prompt: challenge.prompt.slice(0, 200),
    });

    const content = transcription.text?.trim();
    if (!content)
      return NextResponse.json({ error: "Não foi possível transcrever o áudio. Tente novamente." }, { status: 422 });

    const submission = await db.submission.create({
      data: {
        userId: session.sub,
        challengeId,
        circleId,
        content,
        isPublic: true,
      },
    });

    return NextResponse.json({ ...submission, transcription: content }, { status: 201 });
  } catch (err) {
    console.error("[submissions/audio]", err);
    return NextResponse.json({ error: "Erro na transcrição. Verifique sua chave OpenAI." }, { status: 500 });
  }
}
