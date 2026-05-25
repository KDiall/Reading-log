import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: challengeId } = await params;
  const uc = await prisma.userChallenge.findUnique({
    where: { userId_challengeId: { userId: session.userId, challengeId } },
  });
  if (!uc) return NextResponse.json({ error: "Not joined" }, { status: 404 });

  await prisma.userChallenge.delete({
    where: { userId_challengeId: { userId: session.userId, challengeId } },
  });

  return NextResponse.json({ ok: true });
}
