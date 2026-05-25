import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      _count: { select: { participants: true } },
      participants: {
        orderBy: { progress: "desc" },
        take: 20,
        include: {
          user: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession();
  let userChallenge = null;
  if (session) {
    userChallenge = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: session.userId, challengeId: id } },
    });
  }

  return NextResponse.json({ challenge, userChallenge });
}
