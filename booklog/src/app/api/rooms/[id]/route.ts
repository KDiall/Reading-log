import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  const room = await prisma.readingRoom.findUnique({
    where: { id },
    include: {
      book: { select: { id: true, title: true, authors: true, coverUrl: true, pageCount: true } },
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      participants: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { participants: true } },
    },
  });

  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant = session
    ? room.participants.some((p) => p.userId === session.userId)
    : false;

  return NextResponse.json({ room, isParticipant });
}
