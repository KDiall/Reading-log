import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const room = await prisma.readingRoom.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } },
  });

  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (room.status === "ENDED" || room.status === "CANCELLED") {
    return NextResponse.json({ error: "Room is no longer active" }, { status: 400 });
  }
  if (room._count.participants >= room.maxParticipants) {
    return NextResponse.json({ error: "Room is full" }, { status: 400 });
  }

  const existing = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId: id, userId: session.userId } },
  });
  if (existing) return NextResponse.json({ error: "Already joined" }, { status: 409 });

  const participant = await prisma.roomParticipant.create({
    data: { roomId: id, userId: session.userId },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  await pusherServer.trigger(`presence-room-${id}`, "room:participant-joined", {
    participant,
  });

  return NextResponse.json({ participant }, { status: 201 });
}
