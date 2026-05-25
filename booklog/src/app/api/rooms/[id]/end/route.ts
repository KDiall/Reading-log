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
  const room = await prisma.readingRoom.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (room.hostId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.readingRoom.update({
    where: { id },
    data: { status: "ENDED", endedAt: new Date() },
  });

  await prisma.roomParticipant.updateMany({
    where: { roomId: id, leftAt: null },
    data: { leftAt: new Date() },
  });

  await pusherServer.trigger(`private-room-${id}`, "room:state-changed", {
    status: "ENDED",
    endedAt: updated.endedAt,
  });

  return NextResponse.json({ room: updated });
}
