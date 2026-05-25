import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  progress: z.number().int().min(0),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: challengeId } = await params;
  const uc = await prisma.userChallenge.findUnique({
    where: { userId_challengeId: { userId: session.userId, challengeId } },
    include: { challenge: true },
  });
  if (!uc) return NextResponse.json({ error: "Not joined" }, { status: 404 });

  // Only allow manual progress for GENRE_BINGO and THEME_BASED types
  if (uc.challenge.type === "BOOK_COUNT" || uc.challenge.type === "PAGE_COUNT") {
    return NextResponse.json(
      { error: "Progress auto-tracked for this challenge type" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.userChallenge.update({
    where: { userId_challengeId: { userId: session.userId, challengeId } },
    data: {
      progress: parsed.data.progress,
      completedAt:
        parsed.data.progress >= uc.challenge.targetValue && !uc.completedAt
          ? new Date()
          : uc.completedAt,
    },
  });

  return NextResponse.json({ userChallenge: updated });
}
