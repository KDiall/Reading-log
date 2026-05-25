import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: challengeId } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.userChallenge.findUnique({
    where: { userId_challengeId: { userId: session.userId, challengeId } },
  });
  if (existing) return NextResponse.json({ error: "Already joined" }, { status: 409 });

  const uc = await prisma.userChallenge.create({
    data: { userId: session.userId, challengeId },
  });

  return NextResponse.json({ userChallenge: uc }, { status: 201 });
}
